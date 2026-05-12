
const { search } = require("youtube-search-without-api-key");

function filterDuration(video) {
  const duration = video.duration_raw || video.snippet?.duration || "";
  if (!duration || duration.toLowerCase() === "live") return true;
  const parts = duration.split(":");
  if (parts.length > 2) return false;
  if (parts.length === 2 && parseInt(parts[0], 10) > 12) return false;
  return true;
}

async function test() {
  const queries = ['pop hits 2024 official', 'hip hop trending official', 'electronic music hits official', 'indie pop best official'];
  const BAD_KEYWORDS = ['full album', '1 hour', 'loop', 'compilation', 'karaoke', 'cover version', 'reaction', 'trailer', 'gameplay'];
  
  for (const q of queries) {
    console.log(`Searching for: ${q}`);
    try {
      const results = await search(q);
      const filtered = results.filter((v) => {
        const vid = v.id?.videoId;
        const title = (v.title || '').toLowerCase();
        if (BAD_KEYWORDS.some(kw => title.includes(kw))) return false;
        return vid && vid !== 'undefined' && filterDuration(v);
      });
      console.log(`Results for ${q}: ${results.length} (Filtered: ${filtered.length})`);
      if (filtered.length > 0) {
        console.log(`First filtered result: ${filtered[0].title} (${filtered[0].duration_raw})`);
      }
    } catch (e) {
      console.error(`Error for ${q}:`, e);
    }
  }
}

test();
