
const { search } = require("youtube-search-without-api-key");

async function test() {
  const results = await search("espresso");
  if (results.length > 0) {
    console.log(JSON.stringify(results[0], null, 2));
  }
}

test();
