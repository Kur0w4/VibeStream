async function test() {
  const res = await fetch("https://api.cobalt.tools/api/json", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Origin": "https://cobalt.tools",
      "Referer": "https://cobalt.tools/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({
      url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
      aFormat: "mp3",
      isAudioOnly: true
    })
  });
  const data = await res.json();
  console.log(data);
}
test();
