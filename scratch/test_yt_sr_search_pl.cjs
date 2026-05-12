
const YouTube = require("youtube-sr").default;

async function test() {
  const url = "https://www.youtube.com/playlist?list=PL4fGSI1pDJn6jWnpk84IDWYISVKqRxl9P";
  console.log(`Searching for playlist: ${url}`);
  try {
    const results = await YouTube.search(url, { type: 'playlist', limit: 1 });
    if (results && results.length > 0) {
      console.log(`Found playlist in search: ${results[0].title}`);
      console.log(`Playlist ID: ${results[0].id}`);
    } else {
      console.log("No playlist found in search.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
