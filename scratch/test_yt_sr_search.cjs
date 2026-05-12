
const YouTube = require("youtube-sr").default;

async function test() {
  const results = await YouTube.search("espresso", { limit: 1 });
  if (results && results.length > 0) {
    const r = results[0];
    console.log(`Title: ${r.title}`);
    console.log(`Channel: ${r.channel ? r.channel.name : "N/A"}`);
    console.log(`Duration: ${r.durationFormatted}`);
  }
}

test();
