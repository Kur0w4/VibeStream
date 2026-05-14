import play from 'play-dl';

async function test() {
  console.log("Searching...");
  try {
    const results = await play.search('Bad Bunny', { limit: 5 });
    console.log("Search results:", results.length > 0 ? "Success" : "Empty");
    if (results.length > 0) {
        console.log(results[0].title);
    }
  } catch (e) {
    console.error("Search failed:", e);
  }

  console.log("Extracting...");
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=kJQP7kiw5Fk');
    console.log("Stream extracted:", stream.url.substring(0, 50) + "...");
  } catch (e) {
    console.error("Extraction failed:", e);
  }
}

test();
