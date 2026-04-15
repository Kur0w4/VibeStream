import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { search } from "youtube-search-without-api-key";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import session from "express-session";
import fs from "fs";

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
function mapVideo(video: any) {
  const videoId = video.id?.videoId;
  if (!videoId || videoId === "undefined") return null;
  return {
    id: videoId,
    videoId,
    title: video.title || "Unknown Title",
    artist: video.snippet?.channelTitle || "YouTube Artist",
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
  if (parts.length > 2) return false;
  if (parts.length === 2 && parseInt(parts[0], 10) > 15) return false;
  return true;
}

async function youtubeSearch(query: string, limit = 50) {
  const results = await search(query);
  return results
    .filter((v: any) => {
      const vid = v.id?.videoId;
      return vid && vid !== "undefined" && filterDuration(v);
    })
    .map(mapVideo)
    .filter(Boolean)
    .slice(0, limit);
}

// ─── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(
    session({
      secret: "vibestream-secret-2024",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
    })
  );

  // ── Auth Middleware ──────────────────────────────────────────────────────────
  function requireAuth(req: any, res: any, next: any) {
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

  // ── Liked Songs ──────────────────────────────────────────────────────────────
  app.get("/api/liked", requireAuth, (req: any, res: any) => {
    const rows = db
      .prepare("SELECT * FROM liked_songs WHERE user_id = ? ORDER BY created_at DESC")
      .all(req.session.userId);
    res.json(rows.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })));
  });

  app.post("/api/liked", requireAuth, (req: any, res: any) => {
    const t = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO liked_songs (user_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)").run(req.session.userId, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/liked/:videoId", requireAuth, (req: any, res: any) => {
    db.prepare("DELETE FROM liked_songs WHERE user_id = ? AND video_id = ?").run(req.session.userId, req.params.videoId);
    res.json({ ok: true });
  });

  // ── Playlists ────────────────────────────────────────────────────────────────
  app.get("/api/playlists", requireAuth, (req: any, res: any) => {
    const pls = db.prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId) as any[];
    const result = pls.map((pl: any) => {
      const tracks = db.prepare("SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY added_at ASC").all(pl.id) as any[];
      return { id: pl.id, name: pl.name, tracks: tracks.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })) };
    });
    res.json(result);
  });

  app.post("/api/playlists", requireAuth, (req: any, res: any) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const id = Math.random().toString(36).substr(2, 9);
    db.prepare("INSERT INTO playlists (id, user_id, name) VALUES (?,?,?)").run(id, req.session.userId, name.trim());
    res.json({ id, name: name.trim(), tracks: [] });
  });

  app.delete("/api/playlists/:id", requireAuth, (req: any, res: any) => {
    db.prepare("DELETE FROM playlists WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
    res.json({ ok: true });
  });

  app.post("/api/playlists/:id/tracks", requireAuth, (req: any, res: any) => {
    const t = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO playlist_tracks (playlist_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)").run(req.params.id, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/playlists/:id/tracks/:videoId", requireAuth, (req: any, res: any) => {
    db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND video_id = ?").run(req.params.id, req.params.videoId);
    res.json({ ok: true });
  });

  // ── Listen History ───────────────────────────────────────────────────────────
  app.get("/api/history", requireAuth, (req: any, res: any) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const rows = db.prepare("SELECT * FROM (SELECT * FROM listen_history WHERE user_id = ? ORDER BY listened_at DESC LIMIT 200) t GROUP BY video_id ORDER BY listened_at DESC LIMIT ?").all(req.session.userId, limit) as any[];
    res.json(rows.map((r: any) => ({ id: r.video_id, videoId: r.video_id, title: r.title, artist: r.artist, thumbnail: r.thumbnail, duration: r.duration, url: r.url })));
  });

  app.post("/api/history", requireAuth, (req: any, res: any) => {
    const t = req.body;
    try {
      db.prepare("INSERT INTO listen_history (user_id,video_id,title,artist,thumbnail,duration,url) VALUES (?,?,?,?,?,?,?)").run(req.session.userId, t.videoId, t.title, t.artist, t.thumbnail, t.duration, t.url);
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  // ── Followed Artists ─────────────────────────────────────────────────────────
  app.get("/api/artists/followed", requireAuth, (req: any, res: any) => {
    const rows = db.prepare("SELECT * FROM followed_artists WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId);
    res.json(rows);
  });

  app.post("/api/artists/follow", requireAuth, (req: any, res: any) => {
    const { name, thumbnail } = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO followed_artists (user_id, name, thumbnail) VALUES (?,?,?)").run(req.session.userId, name, thumbnail || "");
      res.json({ ok: true });
    } catch { res.status(500).json({ error: "DB error" }); }
  });

  app.delete("/api/artists/follow/:name", requireAuth, (req: any, res: any) => {
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
    const searchTerm = q ? q : "top music songs 2024";
    try {
      console.log(`[Server] Artist search: "${searchTerm}"`);
      const results = await search(searchTerm);
      const seen = new Set<string>();
      const artists: { name: string; thumbnail: string; score: number }[] = [];

      for (const v of results as any[]) {
        let channel: string =
          v.snippet?.channelTitle ||
          (v as any).author?.name ||
          (v as any).channelTitle || "";

        // Fallback for youtube-search-without-api-key missing channel title
        if (!channel && v.title) {
          const parts = v.title.split("-");
          if (parts.length > 1) {
            channel = parts[0].trim();
          } else {
            // Just use a sanitized version of the title if no dash (e.g. drop words like 'official video')
            channel = v.title.replace(/[\(\[].*?[\)\]]/g, "").trim();
          }
        }
        
        const thumb: string =
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.medium?.url ||
          v.snippet?.thumbnails?.default?.url ||
          "";

        if (!channel || seen.has(channel)) continue;
        seen.add(channel);

        // Score: prioritise channels whose name includes the query string
        let score = 0;
        if (q) {
          const cl = channel.toLowerCase();
          const ql = q.toLowerCase();
          if (cl === ql) score = 3;
          else if (cl.startsWith(ql)) score = 2;
          else if (cl.includes(ql)) score = 1;
        }

        artists.push({ name: channel, thumbnail: thumb, score });
        if (artists.length >= 24) break;
      }

      // Best-matching channels first
      artists.sort((a, b) => b.score - a.score);

      // If absolutely no channels were matched, create a fallback artist from the query
      if (artists.length === 0 && q) {
        artists.push({ name: q, thumbnail: "", score: 10 });
      }

      console.log(`[Server] Artist search returned ${artists.length} channels`);
      res.json(artists.slice(0, 16).map(({ name, thumbnail }) => ({ name, thumbnail })));
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

  // ── Vite / Static ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: any, res: any) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
