import { search } from "youtube-search-without-api-key";

async function test() {
  const q = "Ado official";
  const results = await search(q);
  console.log("Full Object:", JSON.stringify(results[0], null, 2));
}

test();
