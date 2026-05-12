import YouTube from 'youtube-sr';

async function test() {
  console.log("Testing YouTube-sr...");
  try {
    const results = await YouTube.search("lofi", { limit: 1 });
    console.log("Search OK:", results.length > 0);
    
    // Test playlist (using a known public one)
    const playlistId = "PLMC9KNkIncKtPojQas7fJXfYTK8WnY_JI"; // Top 50 Global
    const playlist = await YouTube.getPlaylist(playlistId);
    console.log("Playlist OK:", playlist.title);
  } catch (err) {
    console.error("Test FAILED:", err);
  }
}

test();
