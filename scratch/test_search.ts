import { search } from "youtube-search-without-api-key";

async function test() {
  const q = "Ado";
  console.log(`Searching for ${q}...`);
  const results = await search(q);
  console.log("Results count:", results.length);
  if (results.length > 0) {
    console.log("First result sample:", JSON.stringify(results[0], null, 2));
  }
}

test();
