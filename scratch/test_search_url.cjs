
const { search } = require("youtube-search-without-api-key");

async function test() {
  const url = "https://www.youtube.com/playlist?list=PL4fGSI1pDJn6jWnpk84IDWYISVKqRxl9P";
  console.log(`Searching for URL: ${url}`);
  const results = await search(url);
  console.log(`Results: ${results.length}`);
  if (results.length > 0) {
    console.log(`First result title: ${results[0].title}`);
    console.log(`First result snippet:`, JSON.stringify(results[0].snippet, null, 2));
  }
}

test();
