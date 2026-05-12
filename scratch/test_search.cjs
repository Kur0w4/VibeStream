
const { search } = require("youtube-search-without-api-key");

async function test() {
  const globalQueries = ['pop hits 2024', 'hip hop trending', 'electronic music hits', 'indie pop best'];
  for (const q of globalQueries) {
    console.log(`Searching for: ${q}`);
    try {
      const results = await search(q);
      console.log(`Results for ${q}: ${results.length}`);
      if (results.length > 0) {
        console.log(`First result: ${results[0].title}`);
      }
    } catch (e) {
      console.error(`Error for ${q}:`, e);
    }
  }
}

test();
