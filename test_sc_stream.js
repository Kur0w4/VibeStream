async function test() {
    const clientId = "gxPRNsEq7CDD7Wvem4iymWOq3YfU7KS8";
    
    // 1. Search for a track
    const searchRes = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=bad+bunny&client_id=${clientId}&limit=1`);
    const searchData = await searchRes.json();
    const track = searchData.collection[0];
    console.log("Track:", track.title, "ID:", track.id);
    
    // 2. Get the stream URL
    const transcodings = track.media.transcodings;
    const progressive = transcodings.find(t => t.format.protocol === 'progressive');
    if (progressive) {
        const streamInfoRes = await fetch(`${progressive.url}?client_id=${clientId}`);
        const streamInfo = await streamInfoRes.json();
        console.log("Direct Stream URL:", streamInfo.url);
    } else {
        console.log("No progressive stream found");
    }
}
test();
