import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { search } from "youtube-search-without-api-key";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Real Search API
  app.get("/api/search", async (req, res) => {
    const query = req.query.q as string || "lofi hip hop";
    const searchQuery = `${query} song OR audio`;
    try {
      console.log(`[Server] Searching for: ${searchQuery}`);
      const ytResults = await search(searchQuery);
      
      const tracks = ytResults
        .filter((video: any) => {
          const duration = video.duration_raw || video.snippet?.duration || "";
          if (!duration || duration.toLowerCase() === "live") return true;
          
          const parts = duration.split(":");
          if (parts.length > 2) return false; // Contains hours (album or mix)
          if (parts.length === 2) {
             const mins = parseInt(parts[0], 10);
             if (mins > 15) return false; // Longer than 15 mins (EP or Mix)
          }
          return true;
        })
        .map((video: any) => ({
          id: video.id?.videoId || Math.random().toString(36).substr(2, 9),
          videoId: video.id?.videoId || "",
          title: video.title || "Unknown Title",
          artist: video.snippet?.channelTitle || "YouTube Artist",
          thumbnail: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url || "",
          duration: video.duration_raw || video.snippet?.duration || "4:00",
          url: `https://www.youtube.com/watch?v=${video.id?.videoId}`
        }))
        .slice(0, 50); // Limit to 50 results

      res.json(tracks);
    } catch (error) {
      console.error("[Server] Search Error:", error);
      res.status(500).json({ error: "Failed to fetch from YouTube" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
