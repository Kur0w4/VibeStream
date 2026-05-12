console.log("[System] Process starting...");
import "dotenv/config";
import express from "express";
// Vite is imported dynamically only in dev mode to save memory and avoid production issues
import path from "path";
import { fileURLToPath } from "url";
import { search } from "youtube-search-without-api-key";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import YouTube from "youtube-sr";
import ytdl from "@distube/ytdl-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Database Setup (Turso) ──────────────────────────────────────────────────
const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  console.error("CRITICAL ERROR: TURSO_DATABASE_URL is not defined in environment variables.");
  process.exit(1);
}

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function initDB() {
  console.log("[DB] Initializing tables...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT,
        firebase_uid TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS liked_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        duration TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, video_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        duration TEXT NOT NULL,
        url TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(playlist_id, video_id),
        FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS listen_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        duration TEXT NOT NULL,
        url TEXT NOT NULL,
        listened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS followed_artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Manual Migrations
    try { await db.execute("ALTER TABLE users ADD COLUMN email TEXT UNIQUE;"); } catch {}
    try { await db.execute("ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE;"); } catch {}
    try { await db.execute("ALTER TABLE users ADD COLUMN password_hash TEXT;"); } catch {}
    
    console.log("[DB] Tables initialized successfully.");
  } catch (error) {
    console.error("[DB Error] Failed to initialize tables:", error);
    throw error;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function cleanTitle(title: string) {
  if (!title) return "Unknown Song";
  return title
    .replace(/\(Official (Video|Audio|Music Video|Lyrics)\)/gi, "")
    .replace(/\[Official (Video|Audio|Music Video|Lyrics)\]/gi, "")
    .replace(/\(Audio\)/gi, "")
    .replace(/\[Audio\]/gi, "")
    .replace(/\(Lyrics\)/gi, "")
    .replace(/\[Lyrics\]/gi, "")
    .replace(/\(Visualizer\)/gi, "")
    .replace(/\[Visualizer\]/gi, "")
    .replace(/\(Prod\..*?\)/gi, "")
    .replace(/\[Prod\..*?\?\]/gi, "")
    .replace(/\(feat\..*?\)/gi, "") // We keep feat in some cases or remove if preferred
    .replace(/FT\..*?\s/gi, "")
    .replace(/official video/gi, "")
    .replace(/lyrics video/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mapVideo(video: any) {
  const videoId = typeof video.id === 'string' ? video.id : video.id?.videoId;
  if (!videoId || videoId === "undefined") return null;

  let artist: string = video.channel?.name || video.snippet?.channelTitle || video.author?.name || "YouTube Artist";
  
  // Topic channels are the gold standard for music search
  if (artist.toLowerCase().endsWith(" - topic")) {
    artist = artist.slice(0, -8);
  }

  let title = video.title || "Unknown Title";
  
  // If artist is still "YouTube Artist" or "Vevo", try to parse from title
  if (artist.toLowerCase().includes("vevo") || artist.toLowerCase() === "youtube artist") {
    if (title.includes(" - ")) {
       const parts = title.split(" - ");
       artist = parts[0].trim();
       title = parts[1];
    } else if (title.includes("「")) {
       const parts = title.split("「");
       artist = parts[0].trim() || artist;
       title = parts[1].replace("」", "").trim();
    } else if (title.includes("【")) {
       const parts = title.split("【");
       artist = parts[0].trim() || artist;
       title = parts[1].replace("】", "").trim();
    }
  }

  return {
    id: videoId,
    videoId,
    title: cleanTitle(title),
    artist: artist,
    thumbnail:
      video.thumbnail?.url ||
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.default?.url ||
      "",
    duration: video.duration_formatted || video.duration_raw || video.snippet?.duration || "4:00",
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function filterDuration(video: any) {
  const duration = video.duration_formatted || video.duration_raw || video.snippet?.duration || "";
  if (!duration || duration.toLowerCase() === "live") return true;
  const parts = duration.split(":");
  // Skip extremely long videos (mixes) if we want direct songs (e.g., > 15 mins)
  if (parts.length > 2) return false;
  if (parts.length === 2 && parseInt(parts[0], 10) > 15) return false;
  return true;
}

// ─── Server-Side Search Cache ──────────────────────────────────────────────────
// Caches YouTube search results to avoid hitting the slow external API
// on repeated identical queries. TTL: 5 minutes.
const SERVER_CACHE_TTL = 5 * 60 * 1000;
interface ServerCacheEntry { data: any[]; expiresAt: number; }
const serverSearchCache = new Map<string, ServerCacheEntry>();

function getServerCache(key: string): any[] | null {
  const entry = serverSearchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { serverSearchCache.delete(key); return null; }
  return entry.data;
}
function setServerCache(key: string, data: any[]): void {
  if (serverSearchCache.size >= 200) {
    const firstKey = serverSearchCache.keys().next().value;
    if (firstKey !== undefined) serverSearchCache.delete(firstKey);
  }
  serverSearchCache.set(key, { data, expiresAt: Date.now() + SERVER_CACHE_TTL });
}

// Mood → genre seed mapping for personalized mood search
const MOOD_SEEDS: Record<string, string[]> = {
  relax:    ['lofi chill beats', 'acoustic relaxing songs', 'ambient peaceful music', 'chill coffee shop jazz'],
  workout:  ['gym hype hip hop', 'high energy phonk', 'hardstyle workout', 'rock gym motivation'],
  energize: ['uptempo pop hits', 'dance floor anthems', 'happy indie pop', 'summer vibes house'],
  commute:  ['easy listening indie', 'alternative road trip', 'pop radio hits', 'nostalgic soft rock'],
  focus:    ['deep focus techno', 'instrumental study beats', 'classical concentration', 'minimalist ambient'],
  party:    ['club bangers 2024', 'latin party hits', 'electronic dance music', 'pop party mix'],
  sad:      ['sad boy hours', 'emotional piano ballads', 'indie folk sadness', 'heartbreak songs'],
  romance:  ['romantic soul rnb', 'love song ballads', 'acoustic wedding songs', 'sensual jazz'],
};

async function youtubeSearch(query: string, limit = 50) {
  const refinedQuery = query.toLowerCase().includes('official') ? query : `${query} official audio`;
  
  const cached = getServerCache(refinedQuery);
  if (cached) return cached;

  try {
    // Robust access to the YouTube search method
    const yt = (YouTube as any).default?.search ? (YouTube as any).default : YouTube;
    if (typeof yt.search !== 'function') {
      console.error("[YouTube Search Error] YouTube.search is not a function. YouTube type:", typeof YouTube);
      return [];
    }

    const results = await yt.search(refinedQuery, { limit: limit + 20, type: 'video' });
    const BAD_KEYWORDS = ['full album', '1 hour', 'loop', 'compilation', 'karaoke', 'cover version', 'reaction', 'trailer', 'gameplay'];
    
    let mapped = results
      .filter((v: any) => {
        const title = (v.title || '').toLowerCase();
        if (BAD_KEYWORDS.some(kw => title.includes(kw))) return false;
        return filterDuration(v);
      })
      .map(mapVideo)
      .filter(Boolean)
      .slice(0, limit);

    // FALLBACK: If youtube-sr returns nothing, try the old search-without-api-key
    if (mapped.length === 0) {
      console.log(`[YouTube Search] YouTube-sr returned 0 results. Trying fallback...`);
      const fallbackResults = await search(refinedQuery).catch(() => []);
      mapped = fallbackResults
        .filter((v: any) => {
          const title = (v.title || '').toLowerCase();
          if (BAD_KEYWORDS.some(kw => title.includes(kw))) return false;
          return v.id?.videoId && filterDuration(v);
        })
        .map(mapVideo)
        .filter(Boolean)
        .slice(0, limit);
    }

    console.log(`[YouTube Search] Query: "${refinedQuery}" -> Results: ${mapped.length}`);
    setServerCache(refinedQuery, mapped);
    return mapped;
  } catch (err) {
    console.error("[YouTube Search Error]", err);
    // Secondary fallback in case of catastrophic failure
    try {
      const fallbackResults = await search(refinedQuery);
      return fallbackResults.map(mapVideo).filter(Boolean).slice(0, limit);
    } catch {
      return [];
    }
  }
}

// ─── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  console.log(`[System] Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  // Asegurar inicialización de DB antes de configurar el servidor
  try {
    await initDB();
  } catch (err) {
    console.error("[Fatal] Database initialization failed. Exiting.");
    process.exit(1);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security & Connectivity
  app.set("trust proxy", 1); 
  app.use(cors({ origin: true }));
  app.use(express.json());

  // ── JWT Helpers ─────────────────────────────────────────────────────────────
  const JWT_SECRET = process.env.JWT_SECRET || "vibestream-fallback-secret";
  
  function signToken(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  }

  // ── Auth Helper ─────────────────────────────────────────────────────────────
  async function normalizeFirebaseUser(token: string) {
    if (!token || !token.includes('.')) return null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        let base64Body = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64Body.length % 4) base64Body += '=';
        const payload = JSON.parse(Buffer.from(base64Body, 'base64').toString());
        
        if (payload && (payload.user_id || payload.sub)) {
          const fUid = payload.user_id || payload.sub;
          const email = payload.email || '';
          const name = payload.name || email.split('@')[0] || 'User';
          
          let userRes = await db.execute({
            sql: "SELECT * FROM users WHERE firebase_uid = ? OR (email = ? AND email != '')",
            args: [fUid, email]
          });
          
          let user: any = userRes.rows[0];
          
          if (!user) {
            const info = await db.execute({
              sql: "INSERT INTO users (username, email, firebase_uid) VALUES (?, ?, ?)",
              args: [name, email, fUid]
            });
            user = { id: Number(info.lastInsertRowid), username: name, email };
          } else if (!user.firebase_uid) {
            await db.execute({
              sql: "UPDATE users SET firebase_uid = ? WHERE id = ?",
              args: [fUid, user.id]
            });
          }

          return { id: Number(user.id), username: user.username as string };
        }
      }
    } catch (e) {
      console.error("[Auth] Firebase decoding error:", e);
    }
    return null;
  }

  // ── Auth Middleware ──────────────────────────────────────────────────────────
  app.use(async (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      
      // Try regular JWT first
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.userId = decoded.id;
        req.username = decoded.username;
        return next();
      } catch (e) {
        // If regular JWT fails, try Firebase token
        const fbUser = await normalizeFirebaseUser(token);
        if (fbUser) {
          req.userId = fbUser.id;
          req.username = fbUser.username;
        }
      }
    }
    next();
  });

  // Health Check
  app.get("/", (_req, res) => res.json({ status: "ok", service: "VibeStream API" }));

  // Debug Auth (Replacement for Session Debug)
  app.get("/api/debug/auth", async (req: any, res: any) => {
    let userCount = 0;
    try {
      const res = await db.execute("SELECT COUNT(*) as count FROM users");
      userCount = Number(res.rows[0].count);
    } catch {}

    res.json({
      userId: req.userId || null,
      username: req.username || null,
      dbUserCount: userCount,
      headers: {
        authorization: !!req.headers.authorization
      }
    });
  });

  // Protected Routes Middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
    next();
  }

  // ── Auth Endpoints ───────────────────────────────────────────────────────────
  app.post("/api/auth/token", async (req: any, res: any) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });
    const user = await normalizeFirebaseUser(token);
    if (user) {
      const jwt = signToken(user);
      res.json({ token: jwt, user });
    } else {
      res.status(401).json({ error: "Auth failed" });
    }
  });

  app.post("/api/auth/register", async (req: any, res: any) => {
    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim())
      return res.status(400).json({ error: "Username and password required" });
    if (username.length < 3)
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await db.execute({
        sql: "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        args: [username.trim(), hash]
      });
      const user = { id: Number(result.lastInsertRowid), username: username.trim() };
      const token = signToken(user);
      res.json({ token, user });
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "Username already taken" });
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: any, res: any) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username]
    });
    
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    
    const userData = { id: Number(user.id), username: user.username as string };
    const token = signToken(userData);
    res.json({ token, user: userData });
  });

  app.post("/api/auth/logout", (_req: any, res: any) => {
    res.json({ ok: true }); // Stateless JWT logout is handled in frontend
  });

  app.get("/api/auth/me", (req: any, res: any) => {
    if (!req.userId) return res.json(null);
    res.json({ id: req.userId, username: req.username });
  });

  app.patch("/api/auth/me", isAuthenticated, async (req: any, res: any) => {
    const { username } = req.body;
    if (!username?.trim() || username.length < 3) return res.status(400).json({ error: "Invalid username" });
    try {
      await db.execute({
        sql: "UPDATE users SET username = ? WHERE id = ?",
        args: [username.trim(), req.userId]
      });
      res.json({ id: req.userId, username: username.trim() });
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "Username already taken" });
      res.status(500).json({ error: "Server error" });
    }
  });

  // ── Liked Songs ──────────────────────────────────────────────────────────────
  app.get("/api/liked", isAuthenticated, async (req: any, res: any) => {
    const result = await db.execute({
      sql: "SELECT * FROM liked_songs WHERE user_id = ? ORDER BY created_at DESC",
      args: [req.userId]
    });
    res.set('Cache-Control', 'no-store');
    res.json(result.rows.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })));
  });

  app.post("/api/liked", isAuthenticated, async (req: any, res: any) => {
    const t = req.body;
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO liked_songs (user_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)",
        args: [req.userId, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url]
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/liked/:videoId", isAuthenticated, async (req: any, res: any) => {
    await db.execute({
      sql: "DELETE FROM liked_songs WHERE user_id = ? AND video_id = ?",
      args: [req.userId, req.params.videoId]
    });
    res.json({ ok: true });
  });

  // ── Playlists ────────────────────────────────────────────────────────────────
  app.get("/api/playlists", isAuthenticated, async (req: any, res: any) => {
    const plsRes = await db.execute({
      sql: "SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC",
      args: [req.userId]
    });
    
    const result = await Promise.all(plsRes.rows.map(async (pl: any) => {
      const tracksRes = await db.execute({
        sql: "SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY added_at ASC",
        args: [pl.id]
      });
      return { 
        id: pl.id, 
        name: pl.name, 
        tracks: tracksRes.rows.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })) 
      };
    }));
    res.json(result);
  });

  app.post("/api/playlists", isAuthenticated, async (req: any, res: any) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const id = Math.random().toString(36).substr(2, 9);
    await db.execute({
      sql: "INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)",
      args: [id, req.userId, name.trim()]
    });
    res.json({ id, name: name.trim(), tracks: [] });
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req: any, res: any) => {
    await db.execute({
      sql: "DELETE FROM playlists WHERE id = ? AND user_id = ?",
      args: [req.params.id, req.userId]
    });
    res.json({ ok: true });
  });

  app.post("/api/playlists/:id/tracks", isAuthenticated, async (req: any, res: any) => {
    const t = req.body;
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO playlist_tracks (playlist_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)",
        args: [req.params.id, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url]
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.post("/api/playlists/import", isAuthenticated, async (req: any, res: any) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Playlist URL required" });

    try {
      console.log(`[Server] Importing playlist: ${url}`);
      
      let playlistId = url;
      if (url.includes("list=")) {
        playlistId = url.split("list=")[1].split("&")[0];
      }

      const yt = (YouTube as any).default?.getPlaylist ? (YouTube as any).default : YouTube;
      const playlist = await yt.getPlaylist(playlistId).catch(() => null);
      
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found. Make sure it is PUBLIC." });
      }

      await playlist.fetch(100).catch(() => {});
      
      if (!playlist.videos || playlist.videos.length === 0) {
        return res.status(400).json({ error: "Playlist is empty." });
      }

      const internalId = Math.random().toString(36).substr(2, 9);
      const playlistName = playlist.title || "Imported Playlist";

      await db.execute({
        sql: "INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)",
        args: [internalId, req.userId, playlistName]
      });

      const tracks = playlist.videos.map((v: any) => {
        const videoId = v.id;
        if (!videoId) return null;
        let artist = v.channel?.name || "YouTube Artist";
        if (artist.toLowerCase().endsWith(" - topic")) artist = artist.slice(0, -8);

        return {
          playlist_id: internalId,
          video_id: videoId,
          title: cleanTitle(v.title || "Unknown Title"),
          artist: artist,
          thumbnail: v.thumbnail?.url || "",
          duration: v.durationFormatted || "4:00",
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      }).filter(Boolean);

      // Batch insert tracks
      for (const t of tracks) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO playlist_tracks (playlist_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)",
          args: [t.playlist_id, t.video_id, t.title, t.artist, t.thumbnail, t.duration, t.url]
        });
      }

      res.json({
        id: internalId,
        name: playlistName,
        tracksCount: tracks.length,
        tracks: tracks.map((t: any) => ({ id: t.video_id, videoId: t.video_id, title: t.title, artist: t.artist, thumbnail: t.thumbnail, duration: t.duration, url: t.url }))
      });
    } catch (error: any) {
      console.error("[Server] Import Error:", error);
      res.status(500).json({ error: "Failed to import playlist." });
    }
  });

  app.delete("/api/playlists/:id/tracks/:videoId", isAuthenticated, async (req: any, res: any) => {
    await db.execute({
      sql: "DELETE FROM playlist_tracks WHERE playlist_id = ? AND video_id = ?",
      args: [req.params.id, req.params.videoId]
    });
    res.json({ ok: true });
  });

  // ── Listen History ───────────────────────────────────────────────────────────
  app.get("/api/history", isAuthenticated, async (req: any, res: any) => {
    const limit = parseInt(req.query.limit as string) || 100;
    try {
      const result = await db.execute({
        sql: `
          SELECT h.* FROM listen_history h
          INNER JOIN (
            SELECT MAX(id) as max_id 
            FROM listen_history 
            WHERE user_id = ? 
            GROUP BY video_id
          ) m ON h.id = m.max_id
          ORDER BY h.listened_at DESC 
          LIMIT ?
        `,
        args: [req.userId, limit]
      });
      res.json(result.rows.map((r: any) => ({ 
        id: r.video_id, 
        videoId: r.video_id, 
        title: r.title, 
        artist: r.artist, 
        thumbnail: r.thumbnail, 
        duration: r.duration, 
        url: r.url 
      })));
    } catch (e) {
      console.error("[Server] History Fetch Error:", e);
      res.status(500).json({ error: "DB error" });
    }
  });

  app.post("/api/history", isAuthenticated, async (req: any, res: any) => {
    const t = req.body;
    try {
      await db.execute({
        sql: "INSERT INTO listen_history (user_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)",
        args: [req.userId, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url]
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/history", isAuthenticated, async (req: any, res: any) => {
    try {
      await db.execute({
        sql: "DELETE FROM listen_history WHERE user_id = ?",
        args: [req.userId]
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  // ── Followed Artists ─────────────────────────────────────────────────────────
  app.get("/api/artists/followed", isAuthenticated, async (req: any, res: any) => {
    const result = await db.execute({
      sql: "SELECT * FROM followed_artists WHERE user_id = ? ORDER BY created_at DESC",
      args: [req.userId]
    });
    res.json(result.rows);
  });

  app.post("/api/artists/follow", isAuthenticated, async (req: any, res: any) => {
    const { name, thumbnail } = req.body;
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO followed_artists (user_id, name, thumbnail) VALUES (?,?,?)",
        args: [req.userId, name, thumbnail || ""]
      });
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/artists/follow/:name", isAuthenticated, async (req: any, res: any) => {
    await db.execute({
      sql: "DELETE FROM followed_artists WHERE user_id = ? AND name = ?",
      args: [req.userId, decodeURIComponent(req.params.name)]
    });
    res.json({ ok: true });
  });

  app.get("/api/search", async (req: any, res: any) => {
    const query = (req.query.q as string) || "popular music";
    try {
      const tracks = await youtubeSearch(query);
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json(tracks);
    } catch (error) {
      console.error("[Server] Search Error:", error);
      res.status(500).json({ error: "Failed to fetch from YouTube" });
    }
  });

  app.get("/api/search/mood", async (req: any, res: any) => {
    const mood = (req.query.mood as string)?.toLowerCase();
    const userArtists = (req.query.artists as string)?.split(',') || [];
    
    if (!mood || !MOOD_SEEDS[mood]) {
      return res.status(400).json({ error: "Invalid mood" });
    }

    try {
      const seeds = MOOD_SEEDS[mood];
      const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
      // Add a bit of personalization if userArtists are provided
      const query = userArtists.length > 0 
        ? `${userArtists[0]} ${randomSeed}` 
        : randomSeed;

      const tracks = await youtubeSearch(query, 30);
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mood tracks" });
    }
  });

  app.get("/api/search/artist", async (req: any, res: any) => {
    const query = (req.query.q as string) || "popular artists";
    try {
      const yt = (YouTube as any).default?.search ? (YouTube as any).default : YouTube;
      const results = await yt.search(query, { limit: 15, type: 'channel' });
      
      const artists = results.map((c: any) => ({
        name: c.name,
        thumbnail: c.icon?.url || c.snippet?.thumbnails?.high?.url || ""
      })).filter((a: any) => a.name);

      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: "Failed to search artists" });
    }
  });

  app.get("/api/artist/:name/tracks", async (req: any, res: any) => {
    const name = req.params.name;
    try {
      const tracks = await youtubeSearch(`${name} official audio`, 25);
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist tracks" });
    }
  });

  app.get("/api/mix", async (req: any, res: any) => {
    try {
      let query = "trending music 2024";
      if (req.userId) {
        const historyRes = await db.execute({
          sql: "SELECT artist FROM listen_history WHERE user_id = ? ORDER BY listened_at DESC LIMIT 5",
          args: [req.userId]
        });
        if (historyRes.rows.length > 0) {
          const artists = Array.from(new Set(historyRes.rows.map((r: any) => r.artist)));
          query = `${artists.join(' ')} similar music`;
        }
      }
      const tracks = await youtubeSearch(query, 40);
      res.json(tracks.sort(() => Math.random() - 0.5));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mix" });
    }
  });

  // ── Personalized Trends ───────────────────────────────────────────────────────
  app.get("/api/trends", async (req: any, res: any) => {
    try {
      const globalQueries = [
        'top songs global 2024 official', 
        'billboard hot 100 official audio', 
        'trending pop music video', 
        'hip hop hits 2024 official',
        'viral songs 2024 official'
      ];
      let personalized: any[] = [];

      if (req.userId) {
        const topArtistsRes = await db.execute({
          sql: "SELECT artist, COUNT(*) as plays FROM listen_history WHERE user_id = ? GROUP BY artist ORDER BY plays DESC LIMIT 5",
          args: [req.userId]
        });

        if (topArtistsRes.rows.length > 0) {
          const yt = (YouTube as any).default?.search ? (YouTube as any).default : YouTube;
          const artistQueries = topArtistsRes.rows.slice(0, 3).map((a: any) => `${a.artist} popular official`);
          const results = await Promise.allSettled(artistQueries.map(q => yt.search(q, { limit: 10, type: 'video' })));
          results.forEach(r => { 
            if (r.status === 'fulfilled') {
              const mapped = r.value.map(mapVideo).filter(Boolean);
              personalized.push(...mapped);
            }
          });
        }
      }
      
      const globalResults = await Promise.allSettled(globalQueries.map(q => youtubeSearch(q, 15)));
      const global: any[] = [];
      globalResults.forEach(r => { if (r.status === 'fulfilled') global.push(...r.value); });

      const seen = new Set<string>();
      const merged: any[] = [];
      const combined = [...personalized, ...global].sort(() => Math.random() - 0.5);

      for (const t of combined) {
        if (t?.videoId && !seen.has(t.videoId)) { 
          seen.add(t.videoId); 
          merged.push(t); 
        }
        if (merged.length >= 60) break;
      }

      res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=60');
      res.json(merged);
    } catch (error) {
      console.error("[Server] Trends Error:", error);
      res.status(500).json({ error: "Failed to fetch trends" });
    }
  });

  // ── Mood-Based Personalized Search ───────────────────────────────────────────
  app.get("/api/search/mood", async (req: any, res: any) => {
    const mood = ((req.query.mood as string) || '').toLowerCase().trim();
    const artistsParam = (req.query.artists as string) || '';
    const userArtists = artistsParam ? artistsParam.split(',').map((a: string) => a.trim()).filter(Boolean).slice(0, 3) : [];
    const seeds = MOOD_SEEDS[mood] || [`${mood} music official`];

    try {
      const queries: string[] = [];
      if (userArtists.length > 0) {
        userArtists.forEach(artist => {
          const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
          queries.push(`${artist} ${randomSeed}`);
        });
      }
      seeds.forEach(s => queries.push(`${s} official`));

      const results = await Promise.allSettled(queries.slice(0, 6).map(q => youtubeSearch(q, 15)));
      const seen = new Set<string>();
      const tracks: any[] = [];
      results.forEach(r => {
        if (r.status === 'fulfilled') r.value.forEach((t: any) => {
          if (t?.videoId && !seen.has(t.videoId)) { 
            seen.add(t.videoId); 
            tracks.push(t); 
          }
        });
      });

      tracks.sort(() => Math.random() - 0.5);
      res.set('Cache-Control', 'public, max-age=300');
      res.json(tracks.slice(0, 40));
    } catch (error) {
      console.error("[Server] Mood search error:", error);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ── Artist Search ────────────────────────────────────────────────────────────
  app.get("/api/search/artist", async (req: any, res: any) => {
    const q = (req.query.q as string)?.trim() || "";
    try {
      const yt = (YouTube as any).default?.search ? (YouTube as any).default : YouTube;
      const [topicResults, officialResults] = await Promise.all([
        yt.search(q ? `${q} - Topic` : "popular music artists", { limit: 15, type: 'video' }),
        yt.search(q ? `${q} official music` : "trending singers", { limit: 15, type: 'video' }),
      ]);
      const combinedResults = [...topicResults, ...officialResults];
      
      const seen = new Set<string>();
      const artists: { name: string; thumbnail: string; score: number }[] = [];
      const ql = q.toLowerCase();

      for (const v of combinedResults) {
        let channelName = v.channel?.name || "";
        let channelThumb = v.channel?.icon?.url || v.thumbnail?.url || "";
        if (!channelName) continue;

        if (channelName.toLowerCase().endsWith(" - topic")) channelName = channelName.slice(0, -8);
        if (channelName.toLowerCase().endsWith("vevo")) channelName = channelName.slice(0, -4).trim();
        if (seen.has(channelName.toLowerCase())) continue;
        seen.add(channelName.toLowerCase());

        let score = 0;
        if (q) {
          const cl = channelName.toLowerCase();
          if (cl === ql) score = 100;
          else if (cl.startsWith(ql)) score = 50;
          else if (cl.includes(ql)) score = 20;
          else score = 1;
        } else {
          score = Math.random();
        }
        artists.push({ name: channelName.trim(), thumbnail: channelThumb, score });
        if (artists.length >= 30) break;
      }

      artists.sort((a, b) => b.score - a.score);
      res.set('Cache-Control', 'public, max-age=300');
      res.json(artists.map(({ name, thumbnail }) => ({ name, thumbnail })));
    } catch (e) {
      console.error("[Server] Artist search error:", e);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // ── Artist Tracks ────────────────────────────────────────────────────────────
  app.get("/api/artist/:name/tracks", async (req: any, res: any) => {
    const name = decodeURIComponent(req.params.name);
    try {
      const tracks = await youtubeSearch(`${name} songs`, 30);
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json(tracks);
    } catch {
      res.status(500).json({ error: "Failed to fetch artist tracks" });
    }
  });

  // ── Your Mix ─────────────────────────────────────────────────────────────────
  app.get("/api/mix", isAuthenticated, async (req: any, res: any) => {
    try {
      const historyRes = await db.execute({
        sql: "SELECT artist, COUNT(*) as plays FROM listen_history WHERE user_id = ? GROUP BY artist ORDER BY plays DESC LIMIT 5",
        args: [req.userId]
      });

      let query = "chill music mix";
      if (historyRes.rows.length > 0) {
        const topArtists = historyRes.rows.slice(0, 3).map((h: any) => h.artist).join(" ");
        query = `${topArtists} similar chill mix`;
      }
      const tracks = await youtubeSearch(query, 25);
      res.json(tracks);
    } catch {
      res.status(500).json({ error: "Failed to generate mix" });
    }
  });

  // ── Native Audio Stream Extraction ──────────────────────────────────────────
  const streamCache = new Map<string, { url: string, expiresAt: number }>();

  app.get("/api/stream/:videoId", async (req, res) => {
    const videoId = req.params.videoId;
    
    // Cache check
    const cached = streamCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return res.redirect(cached.url);
    }

    try {
      const info = await ytdl.getInfo(videoId);
      const format = ytdl.chooseFormat(info.formats, { 
        filter: 'audioonly', 
        quality: 'highestaudio' 
      });

      if (format && format.url) {
        // YouTube stream URLs typically expire in 6 hours
        streamCache.set(videoId, { 
          url: format.url, 
          expiresAt: Date.now() + 5 * 60 * 60 * 1000 
        });
        res.redirect(format.url);
      } else {
        res.status(404).send("No audio format found");
      }
    } catch (error) {
      console.error(`[Stream Error] ${videoId}:`, error);
      res.status(500).send("Extraction failed");
    }
  });

  // ── Vite / Dev Server ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    console.log("[System] Initializing Vite Dev Server...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[System] Serving production assets...");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  console.log(`[System] Binding to port ${PORT}...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[System] Server successfully started and listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
