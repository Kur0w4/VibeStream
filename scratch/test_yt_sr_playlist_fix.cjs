
const YouTube = require("youtube-sr").default;

async function test() {
  const url = "https://www.youtube.com/playlist?list=PL4fGSI1pDJn6jWnpk84IDWYISVKqRxl9P";
  console.log(`Testing playlist: ${url}`);
  try {
    // Try passing the full URL directly
    const playlist = await YouTube.getPlaylist(url);
    if (playlist) {
      console.log(`Found playlist: ${playlist.title}`);
      return;
    }
    console.log("Not found with URL, trying to extract ID...");
    const id = url.split("list=")[1]?.split("&")[0];
    if (id) {
       const pl2 = await YouTube.getPlaylist(id);
       if (pl2) {
         console.log(`Found playlist with ID: ${pl2.title}`);
         return;
       }
    }
    console.log("Still not found.");
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
