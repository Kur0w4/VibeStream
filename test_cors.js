async function test() {
  try {
    const res = await fetch('https://pipedapi.kavin.rocks/search?q=bad+bunny&filter=channels', {
      method: 'OPTIONS'
    });
    console.log("CORS Headers:", res.headers.get('access-control-allow-origin'));
  } catch (e) {
    console.error(e);
  }
}
test();
