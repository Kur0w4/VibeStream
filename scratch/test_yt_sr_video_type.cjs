
const YouTube = require("youtube-sr").default;

async function test() {
  try {
    const results = await YouTube.search("espresso official audio", { limit: 10, type: 'video' });
    console.log("Results found with type video:", results.length);
  } catch (e) {
    console.error("Error with type video:", e);
  }
}

test();
