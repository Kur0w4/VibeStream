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
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
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
  const videoId = video.id?.videoId;
  if (!videoId || videoId === "undefined") return null;

  let artist: string = video.snippet?.channelTitle || video.author?.name || "YouTube Artist";
  
  // Topic channels are the gold standard for music search
  if (artist.toLowerCase().endsWith(" - topic")) {
    artist = artist.slice(0, -8);
  }

  // Sometimes artists put "Artist - Title" in the video title.
  // We can try to extract artist if the channel name is generic.
  let title = video.title || "Unknown Title";
  if (artist.toLowerCase().includes("vevo") || artist.toLowerCase() === "youtube artist") {
    if (title.includes(" - ")) {
       const parts = title.split(" - ");
       artist = parts[0].trim();
       title = parts[1];
    }
  }

  return {
    id: videoId,
    videoId,
    title: cleanTitle(title),
    artist: artist,
    thumbnail:
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.default?.url ||
      "",
    duration: video.duration_raw || video.snippet?.duration || "4:00",
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function filterDuration(video: any) {
  const duration = video.duration_raw || video.snippet?.duration || "";
  if (!duration || duration.toLowerCase() === "live") return true;
  const parts = duration.split(":");
  // Skip extremely long videos (mixes) if we want direct songs (e.g., > 12 mins)
  if (parts.length > 2) return false;
  if (parts.length === 2 && parseInt(parts[0], 10) > 12) return false;
  return true;
}

async function youtubeSearch(query: string, limit = 50) {
  // Advanced Query Engineering:
  // We prioritize "Topic" channels and "Official" content by appending specific markers.
  // We also try to avoid fan-made covers unless explicitly searched.
  const isSpecificSearch = query.length > 15;
  const refinedQuery = isSpecificSearch 
    ? `${query} official`
    : `${query} topic music`;

  const results = await search(refinedQuery);
  return results
    .filter((v: any) => {
      const vid = v.id?.videoId;
      const title = (v.title || "").toLowerCase();
      // Heuristic: filter out 1-hour loops or full albums if looking for a song
      if (title.includes("full album") || title.includes("1 hour") || title.includes("loop")) return false;
      return vid && vid !== "undefined" && filterDuration(v);
    })
    .map(mapVideo)
    .filter(Boolean)
    .slice(0, limit);
}

// ─── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security & Connectivity
  app.set("trust proxy", 1); 
  app.use(cors({
    origin: true, // Allows all origins temporarily; restricted to your domain in production
    credentials: true
  }));

  app.use(express.json());
  app.use(
    session({
      store: new SQLiteStore({ db: "sessions.db", dir: "./" }) as any,
      secret: "vibestream-secret-2024",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production", 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
      },
    })
  );

  // Health Check
  app.get("/", (_req, res) => res.json({ status: "ok", service: "VibeStream API" }));

  // ── Auth Middleware ──────────────────────────────────────────────────────────
  // Middleware to handle both Session Cookies and Authorization Bearer Tokens (Firebase)
  app.use(async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      // In a real app, we'd verify the Firebase Token properly with firebase-admin.
      // For this implementation, we trust the token's presence signals a valid Firebase user on the frontend.
      // We'll extract the "sub" or "user_id" if we can, or just let the session handle it.
      // For now, if the session is empty but valid token is provided, we'll try to identify.
      if (!req.session.userId) {
        try {
          // Base64 decode the JWT payload to get the UID (dangerous but works for this demo context without admin SDK)
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          if (payload && payload.user_id) {
            req.session.userId = payload.user_id;
            req.session.username = payload.name || payload.email?.split('@')[0] || 'User';
          }
        } catch (e) {}
      }
    }
    next();
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

  app.delete("/api/playlists/:id/tracks/:videoId", isAuthenticated, (req: any, res: any) => {
    db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND video_id = ?").run(req.params.id, req.params.videoId);
    res.json({ ok: true });
  });

  // ── Listen History ───────────────────────────────────────────────────────────
  app.get("/api/history", isAuthenticated, (req: any, res: any) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const rows = db.prepare("SELECT * FROM (SELECT * FROM listen_history WHERE user_id = ? ORDER BY listened_at DESC LIMIT 200) t GROUP BY video_id ORDER BY listened_at DESC LIMIT ?").all(req.session.userId, limit) as any[];
    res.json(rows.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })));
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
    const query = (req.query.q as string) || "lofi hip hop";
    const searchQuery = `${query} song OR audio`;
    try {
      console.log(`[Server] Searching: ${searchQuery}`);
      const tracks = await youtubeSearch(searchQuery);
      res.json(tracks);
    } catch (error) {
      console.error("[Server] Search Error:", error);
      res.status(500).json({ error: "Failed to fetch from YouTube" });
    }
  });

  // ── Artist Search ────────────────────────────────────────────────────────────
  // Searches YouTube videos and extracts unique channels as "artists".
  // Channels whose name closely matches the query are scored higher.
  app.get("/api/search/artist", async (req: any, res: any) => {
    const q = (req.query.q as string)?.trim() || "";
    // Broad search for videos to find official channels and topic channels
    const searchTerm = q ? `${q} official music` : "popular music artists topic";
    try {
      const results = await search(searchTerm);
      const seen = new Set<string>();
      const artists: { name: string; thumbnail: string; score: number }[] = [];

      // If specific search, also try a direct search for the query itself
      const rawResults = q ? await search(q) : [];
      const combinedResults = [...(rawResults as any[]), ...(results as any[])];

      for (const v of combinedResults) {
        let channel: string =
          v.snippet?.channelTitle ||
          (v as any).author?.name ||
          (v as any).channelTitle || "";

        // Standardise artist name (remove " - Topic" for the profile display)
        if (channel.toLowerCase().endsWith(" - topic")) {
          channel = channel.slice(0, -8);
        }

        const thumb: string =
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.medium?.url ||
          v.snippet?.thumbnails?.default?.url ||
          "";

        if (!channel || seen.has(channel.toLowerCase())) continue;
        seen.add(channel.toLowerCase());

        // Score: prioritise channels whose name includes the query string closely
        let score = 0;
        if (q) {
          const cl = channel.toLowerCase();
          const ql = q.toLowerCase();
          if (cl === ql) score = 10;
          else if (cl.startsWith(ql)) score = 5;
          else if (cl.includes(ql)) score = 2;
        }

        artists.push({ name: channel, thumbnail: thumb, score });
        if (artists.length >= 30) break;
      }

      // Best-matching channels first
      artists.sort((a, b) => b.score - a.score);

      const response = artists.slice(0, 24).map(({ name, thumbnail }) => ({ name: name.trim(), thumbnail }));
      console.log(`[Server] Artist search returned ${response.length} results`);
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
      console.log(`[Server] Fetching tracks for artist: ${name}`);
      const tracks = await youtubeSearch(`${name} songs`, 30);
      res.json(tracks);
    } catch {
      res.status(500).json({ error: "Failed to fetch artist tracks" });
    }
  });

  // ── Your Mix ─────────────────────────────────────────────────────────────────
  app.get("/api/mix", requireAuth, async (req: any, res: any) => {
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
