import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mock Search API
  app.get("/api/search", (req, res) => {
    const query = req.query.q as string;
    
    // Simulated YouTube API v3 response
    const mockResults = [
      {
        id: "1",
        videoId: "jfKfPfyJRdk",
        title: "Lofi Hip Hop Radio - Beats to Relax/Study to",
        artist: "Lofi Girl",
        thumbnail: "https://picsum.photos/seed/lofi/300/200",
        duration: "Live",
        url: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
      },
      {
        id: "2",
        videoId: "5qap5aO4i9A",
        title: "lofi hip hop radio - beats to sleep/chill to",
        artist: "Lofi Girl",
        thumbnail: "https://picsum.photos/seed/chill/300/200",
        duration: "Live",
        url: "https://www.youtube.com/watch?v=5qap5aO4i9A"
      },
      {
        id: "3",
        videoId: "hHW1oY26kxQ",
        title: "Rainy Night in Tokyo - Lofi Hip Hop Mix",
        artist: "The Jazz Hop Café",
        thumbnail: "https://picsum.photos/seed/tokyo/300/200",
        duration: "1:02:34",
        url: "https://www.youtube.com/watch?v=hHW1oY26kxQ"
      },
      {
        id: "4",
        videoId: "n61ULEU7FZ0",
        title: "Coffee Shop Radio - 24/7 Lofi Hip Hop Beats",
        artist: "STEEZYASFUCK",
        thumbnail: "https://picsum.photos/seed/coffee/300/200",
        duration: "Live",
        url: "https://www.youtube.com/watch?v=n61ULEU7FZ0"
      },
      {
        id: "5",
        videoId: "DWcUY5XDX50",
        title: "Late Night Jazz - Relaxing Saxophone Music",
        artist: "Relaxing Jazz Piano",
        thumbnail: "https://picsum.photos/seed/jazz/300/200",
        duration: "3:45:12",
        url: "https://www.youtube.com/watch?v=DWcUY5XDX50"
      }
    ];

    const filteredResults = query 
      ? mockResults.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) || 
          item.artist.toLowerCase().includes(query.toLowerCase())
        )
      : mockResults;

    res.json(filteredResults);
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
