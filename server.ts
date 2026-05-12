import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { search } from "youtube-search-without-api-key";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import session from "express-session";
import cors from "cors";
import SQLiteStoreFactory from "connect-sqlite3";
import YouTube from "youtube-sr";

const SQLiteStore = SQLiteStoreFactory(session);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Database Setup ────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "vibestream.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    firebase_uid TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

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

// ─── Manual Migrations (Ensure existing DBs have the new columns) ───────────────
try {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT UNIQUE;");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE;");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
} catch (e) {}
try {
  // Relaxing the NOT NULL for password_hash if it already existed but might be empty for Google users
  // Note: SQLite doesn't support ALTER TABLE DROP NOT NULL cleanly, so we'll just handle it in app logic or re-create if needed.
} catch (e) {}

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
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security & Connectivity
  app.set("trust proxy", 1); 
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(
    session({
      store: new SQLiteStore({ db: "sessions.db", dir: "./" }) as any,
      secret: "vibestream-secret-2024",
      resave: false,
      saveUninitialized: false,
      proxy: true, // Required for secure cookies on Render/behind proxy
      cookie: { 
        secure: true, // Always true for cross-domain SameSite=None
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "none" // Required for cross-domain cookies (web.app -> onrender.com)
      },
    })
  );

  // Health Check
  app.get("/", (_req, res) => res.json({ status: "ok", service: "VibeStream API" }));

  // Debug Session
  app.get("/api/debug/session", (req: any, res: any) => {
    let userCount = 0;
    try {
      const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      userCount = row.count;
    } catch {}

    res.json({
      sessionID: req.sessionID,
      userId: req.session.userId,
      username: req.session.username,
      email: req.session.email,
      lastAuthError: req.session.lastAuthError || null,
      dbUserCount: userCount,
      headers: {
        cookie: !!req.headers.cookie,
        authorization: !!req.headers.authorization
      }
    });
  });

  // ── Auth Helper ─────────────────────────────────────────────────────────────
  async function normalizeFirebaseUser(req: any, token: string) {
    if (!token || !token.includes('.')) return false;
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
          
          // Optimization: If session already exists and matches this user, skip re-saving
          if (req.session.userId && (req.session.firebaseUid === fUid || req.session.email === email)) {
            return true;
          }

          let user = db.prepare("SELECT * FROM users WHERE firebase_uid = ? OR (email = ? AND email != '')").get(fUid, email) as any;
          if (!user) {
            const info = db.prepare("INSERT INTO users (username, email, firebase_uid) VALUES (?, ?, ?)").run(name, email, fUid);
            user = { id: info.lastInsertRowid, username: name, email };
          } else if (!user.firebase_uid) {
            db.prepare("UPDATE users SET firebase_uid = ? WHERE id = ?").run(fUid, user.id);
          }

          req.session.userId = user.id;
          req.session.username = user.username;
          req.session.email = user.email;
          req.session.firebaseUid = fUid; // Store for optimization check
          req.session.lastAuthError = null;
          await new Promise((resolve) => req.session.save(resolve));
          return true;
        } else {
          req.session.lastAuthError = "Invalid payload: missing sub/user_id";
        }
      }
    } catch (e: any) {
      req.session.lastAuthError = `Decoding error: ${e.message}`;
    }
    return false;
  }

  // ── Auth Middleware ──────────────────────────────────────────────────────────
  app.use(async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      await normalizeFirebaseUser(req, token);
    }
    next();
  });

  // ── Auth Routes ──────────────────────────────────────────────────────────────
  app.post("/api/auth/token", async (req: any, res: any) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });
    const success = await normalizeFirebaseUser(req, token);
    if (success) {
      res.json({ id: req.session.userId, username: req.session.username });
    } else {
      res.status(401).json({ error: req.session.lastAuthError || "Auth failed" });
    }
  });

  // Protected Routes Middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
    next();
  }

  // ── Auth Endpoints ───────────────────────────────────────────────────────────
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
      const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
      const result = stmt.run(username.trim(), hash);
      req.session.userId = result.lastInsertRowid;
      req.session.username = username.trim();
      res.json({ id: result.lastInsertRowid, username: username.trim() });
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "Username already taken" });
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: any, res: any) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ id: user.id, username: user.username });
  });

  app.post("/api/auth/logout", (req: any, res: any) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", (req: any, res: any) => {
    if (!req.session?.userId) return res.json(null);
    res.json({ id: req.session.userId, username: req.session.username });
  });

  app.patch("/api/auth/me", isAuthenticated, async (req: any, res: any) => {
    const { username } = req.body;
    if (!username?.trim() || username.length < 3) return res.status(400).json({ error: "Invalid username" });
    try {
      db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username.trim(), req.session.userId);
      req.session.username = username.trim();
      res.json({ id: req.session.userId, username: username.trim() });
    } catch (e: any) {
      if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "Username already taken" });
      res.status(500).json({ error: "Server error" });
    }
  });

  // ── Liked Songs ──────────────────────────────────────────────────────────────
  app.get("/api/liked", isAuthenticated, (req: any, res: any) => {
    const rows = db
      .prepare("SELECT * FROM liked_songs WHERE user_id = ? ORDER BY created_at DESC")
      .all(req.session.userId);
    res.set('Cache-Control', 'no-store');
    res.json(rows.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })));
  });

  app.post("/api/liked", isAuthenticated, (req: any, res: any) => {
    const t = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO liked_songs (user_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)").run(req.session.userId, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/liked/:videoId", isAuthenticated, (req: any, res: any) => {
    db.prepare("DELETE FROM liked_songs WHERE user_id = ? AND video_id = ?").run(req.session.userId, req.params.videoId);
    res.json({ ok: true });
  });

  // ── Playlists ────────────────────────────────────────────────────────────────
  app.get("/api/playlists", isAuthenticated, (req: any, res: any) => {
    const pls = db.prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId) as any[];
    const result = pls.map((pl: any) => {
      const tracks = db.prepare("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY added_at ASC").all(pl.id) as any[];
      return { id: pl.id, name: pl.name, tracks: tracks.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })) };
    });
    res.json(result);
  });

  app.post("/api/playlists", isAuthenticated, (req: any, res: any) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const id = Math.random().toString(36).substr(2, 9);
    db.prepare("INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)").run(id, req.session.userId, name.trim());
    res.json({ id, name: name.trim(), tracks: [] });
  });

  app.delete("/api/playlists/:id", isAuthenticated, (req: any, res: any) => {
    db.prepare("DELETE FROM playlists WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
    res.json({ ok: true });
  });

  app.post("/api/playlists/:id/tracks", isAuthenticated, (req: any, res: any) => {
    const t = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO playlist_tracks (playlist_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)").run(req.params.id, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.post("/api/playlists/import", isAuthenticated, async (req: any, res: any) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Playlist URL required" });

    try {
      console.log(`[Server] Importing playlist: ${url}`);
      
      // Attempt to normalize URL or extract ID
      let playlistId = url;
      if (url.includes("list=")) {
        playlistId = url.split("list=")[1].split("&")[0];
      }

      const yt = (YouTube as any).default?.getPlaylist ? (YouTube as any).default : YouTube;
      const playlist = await yt.getPlaylist(playlistId).catch(() => null);
      
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found. Make sure it is PUBLIC and not a 'Mix' playlist." });
      }

      await playlist.fetch(100).catch(() => {}); // loads up to 100 videos
      
      if (!playlist.videos || playlist.videos.length === 0) {
        return res.status(400).json({ error: "Playlist is empty or could not be read." });
      }

      const internalId = Math.random().toString(36).substr(2, 9);
      const playlistName = playlist.title || "Imported Playlist";

      // Create playlist in DB
      db.prepare("INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)").run(internalId, req.session.userId, playlistName);

      const tracks = playlist.videos.map(v => {
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
      }).filter((t: any): t is any => t !== null);

      const insertStmt = db.prepare("INSERT OR IGNORE INTO playlist_tracks (playlist_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)");
      const insertMany = db.transaction((tracksToInsert: any[]) => {
        for (const t of tracksToInsert) {
          insertStmt.run(t.playlist_id, t.video_id, t.title, t.artist, t.thumbnail, t.duration, t.url);
        }
      });

      insertMany(tracks);

      res.json({
        id: internalId,
        name: playlistName,
        tracksCount: tracks.length,
        tracks: tracks.map(t => ({ id: t.video_id, videoId: t.video_id, title: t.title, artist: t.artist, thumbnail: t.thumbnail, duration: t.duration, url: t.url }))
      });
    } catch (error: any) {
      console.error("[Server] Import Error:", error);
      res.status(500).json({ error: "Failed to import playlist. Please try again with a different public playlist." });
    }
  });

  app.delete("/api/playlists/:id/tracks/:videoId", isAuthenticated, (req: any, res: any) => {
    db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND video_id = ?").run(req.params.id, req.params.videoId);
    res.json({ ok: true });
  });

  // ── Listen History ───────────────────────────────────────────────────────────
  app.get("/api/history", isAuthenticated, (req: any, res: any) => {
    const limit = parseInt(req.query.limit as string) || 100;
    try {
      const rows = db.prepare(`
        SELECT h.* FROM listen_history h
        INNER JOIN (
          SELECT MAX(id) as max_id 
          FROM listen_history 
          WHERE user_id = ? 
          GROUP BY video_id
        ) m ON h.id = m.max_id
        ORDER BY h.listened_at DESC 
        LIMIT ?
      `).all(req.session.userId, limit) as any[];
      res.json(rows.map((r: any) => ({ 
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

  app.post("/api/history", isAuthenticated, (req: any, res: any) => {
    const t = req.body;
    try {
      db.prepare("INSERT INTO listen_history (user_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)").run(req.session.userId, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/history", isAuthenticated, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM listen_history WHERE user_id = ?").run(req.session.userId);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  // ── Followed Artists ─────────────────────────────────────────────────────────
  app.get("/api/artists/followed", isAuthenticated, (req: any, res: any) => {
    const rows = db.prepare("SELECT * FROM followed_artists WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId);
    res.json(rows);
  });

  app.post("/api/artists/follow", isAuthenticated, (req: any, res: any) => {
    const { name, thumbnail } = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO followed_artists (user_id, name, thumbnail) VALUES (?,?,?)").run(req.session.userId, name, thumbnail || "");
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/artists/follow/:name", isAuthenticated, (req: any, res: any) => {
    db.prepare("DELETE FROM followed_artists WHERE user_id = ? AND name = ?").run(req.session.userId, decodeURIComponent(req.params.name));
    res.json({ ok: true });
  });

  // ── Music Search ─────────────────────────────────────────────────────────────
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

      if (req.session?.userId) {
        const topArtists = db.prepare(
          "SELECT artist, COUNT(*) as plays FROM listen_history WHERE user_id = ? GROUP BY artist ORDER BY plays DESC LIMIT 5"
        ).all(req.session.userId) as any[];

        if (topArtists.length > 0) {
          const yt = (YouTube as any).default?.search ? (YouTube as any).default : YouTube;
          const artistQueries = topArtists.slice(0, 3).map((a: any) => `${a.artist} popular official`);
          const results = await Promise.allSettled(artistQueries.map(q => yt.search(q, { limit: 10, type: 'video' })));
          results.forEach(r => { 
            if (r.status === 'fulfilled') {
              const mapped = r.value.map(mapVideo).filter(Boolean);
              personalized.push(...mapped);
            }
          });
        }
      }

      // Fetch global trending in parallel
      const globalResults = await Promise.allSettled(globalQueries.map(q => youtubeSearch(q, 15)));
      const global: any[] = [];
      globalResults.forEach(r => { if (r.status === 'fulfilled') global.push(...r.value); });

      // Deduplicate and merge
      const seen = new Set<string>();
      const merged: any[] = [];
      
      // Shuffle slightly to avoid same order every time
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
  // ?mood=relax&artists=Artist1,Artist2
  app.get("/api/search/mood", async (req: any, res: any) => {
    const mood = ((req.query.mood as string) || '').toLowerCase().trim();
    const artistsParam = (req.query.artists as string) || '';
    const userArtists = artistsParam ? artistsParam.split(',').map((a: string) => a.trim()).filter(Boolean).slice(0, 3) : [];
    const seeds = MOOD_SEEDS[mood] || [`${mood} music official`];

    try {
      const queries: string[] = [];
      // If we have user artists, mix them with seeds for better personalization
      if (userArtists.length > 0) {
        userArtists.forEach(artist => {
          const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
          queries.push(`${artist} ${randomSeed}`);
        });
      }
      
      // Add general seeds to ensure diversity
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

      // Shuffle tracks for a fresh mix every time
      tracks.sort(() => Math.random() - 0.5);

      res.set('Cache-Control', 'public, max-age=300');
      res.json(tracks.slice(0, 40));
    } catch (error) {
      console.error("[Server] Mood search error:", error);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ── Artist Search (precise: exact name first, then topic channels) ────────────────
  app.get("/api/search/artist", async (req: any, res: any) => {
    const q = (req.query.q as string)?.trim() || "";
    try {
      const yt = (YouTube as any).default?.search ? (YouTube as any).default : YouTube;
      // Use YouTube.search to find videos, then extract unique channels
      // This is more reliable than channel search which currently crashes
      const [topicResults, officialResults] = await Promise.all([
        yt.search(q ? `${q} - Topic` : "popular music artists", { limit: 15, type: 'video' }),
        yt.search(q ? `${q} official music` : "trending singers", { limit: 15, type: 'video' }),
      ]);
      const combinedResults = [...topicResults, ...officialResults];
      if (combinedResults.length === 0) {
        console.log(`[Artist Search] YouTube-sr returned 0 results. Trying fallback...`);
        const [fb1, fb2] = await Promise.all([
          search(q ? `${q} - Topic` : "popular music artists").catch(() => []),
          search(q ? `${q} official music` : "trending singers").catch(() => []),
        ]);
        combinedResults.push(...(fb1 as any[]), ...(fb2 as any[]));
      }

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
          score = Math.random(); // random order for generic "trending"
        }
        
        artists.push({ name: channelName.trim(), thumbnail: channelThumb, score });
        if (artists.length >= 30) break;
      }

      artists.sort((a, b) => b.score - a.score);
      const response = artists.map(({ name, thumbnail }) => ({ name, thumbnail }));
      res.set('Cache-Control', 'public, max-age=300');
      res.json(response);
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
      // Get top artists from history
      const history = db.prepare("SELECT artist, COUNT(*) as plays FROM listen_history WHERE user_id = ? GROUP BY artist ORDER BY plays DESC LIMIT 5").all(req.session.userId) as any[];

      let query = "chill music mix";
      if (history.length > 0) {
        const topArtists = history.slice(0, 3).map((h: any) => h.artist).join(" ");
        query = `${topArtists} similar chill mix`;
      }
      const tracks = await youtubeSearch(query, 25);
      res.json(tracks);
    } catch {
      res.status(500).json({ error: "Failed to generate mix" });
    }
  });

  // ── Vite / Dev Server ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
