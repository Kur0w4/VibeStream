
const YouTube = require("youtube-sr");

async function test() {
  const id = "PL4fGSI1pDJn6jWnpk84IDWYISVKqRxl9P";
  console.log(`Testing playlist ID: ${id}`);
  try {
    const playlist = await YouTube.getPlaylist(id);
    if (!playlist) {
      console.log("Playlist not found");
      return;
    }
    console.log(`Found playlist: ${playlist.title}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
