
const YouTube = require("youtube-sr").default;

async function test() {
  const results = await YouTube.search("espresso", { limit: 1 });
  if (results && results.length > 0) {
    console.log(JSON.stringify(results[0], null, 2));
  }
}

test();
