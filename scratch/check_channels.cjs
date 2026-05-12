
const { search } = require("youtube-search-without-api-key");

async function test() {
  const results = await search("espresso");
  if (results && results.length > 0) {
    results.slice(0, 3).forEach((r, i) => {
      console.log(`Result ${i}: ${r.title}`);
      console.log("Snippet keys:", Object.keys(r.snippet || {}));
      if (r.snippet && r.snippet.channelTitle) console.log("Channel:", r.snippet.channelTitle);
    });
  }
}

test();
