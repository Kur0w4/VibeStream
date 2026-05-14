async function test() {
  try {
    const res = await fetch('https://pipedapi.kavin.rocks/search?q=bad+bunny&filter=channels');
    console.log("CORS Headers:", res.headers.get('access-control-allow-origin'));
    const data = await res.json();
    console.log("Items:", data.items?.length);
  } catch (e) {
    console.error(e);
  }
}
test();
