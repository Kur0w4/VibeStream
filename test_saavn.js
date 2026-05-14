async function test() {
  try {
    const q = 'bad bunny';
    const res = await fetch(`https://saavn.me/search/songs?query=${encodeURIComponent(q)}&page=1&limit=5`);
    const data = await res.json();
    console.log("Search results:", JSON.stringify(data.data.results.map(r => ({
        id: r.id,
        name: r.name,
        artist: r.primaryArtists,
        url: r.downloadUrl[r.downloadUrl.length - 1].link
    })), null, 2));
  } catch (e) {
    console.error("Failed saavn.me", e);
  }
}

test();
