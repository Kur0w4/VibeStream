
const YouTube = require("youtube-sr").default;

async function test() {
  console.log(`Searching for playlist: Sabrina Carpenter`);
  try {
    const results = await YouTube.search("Sabrina Carpenter", { type: 'playlist', limit: 5 });
    if (results && results.length > 0) {
      results.forEach(r => console.log(`Found: ${r.title} (${r.id})`));
    } else {
      console.log("No playlist found.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
