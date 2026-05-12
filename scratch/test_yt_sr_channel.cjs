
const YouTube = require("youtube-sr").default;

async function test() {
  const q = "Sabrina Carpenter";
  console.log(`Searching for channel: ${q}`);
  try {
    const results = await YouTube.search(q, { type: 'channel', limit: 5 });
    if (results && results.length > 0) {
      results.forEach(r => console.log(`Channel: ${r.name} (${r.id}) - Icon: ${r.icon?.url}`));
    } else {
      console.log("No channel found.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
