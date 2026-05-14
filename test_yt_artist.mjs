import { Innertube, UniversalCache } from 'youtubei.js';
import path from 'path';

async function test() {
    const yt = await Innertube.create({
        cache: new UniversalCache(true, path.join(process.cwd(), '.ytcache')),
        generate_session_locally: true
    });
    
    console.log("Searching for Ado...");
    const search = await yt.search('Ado', { type: 'channel' });
    console.log("Channels found:", search.channels?.length);
    if (search.channels && search.channels.length > 0) {
        const c = search.channels[0];
        console.log("First channel properties:", Object.keys(c));
        console.log("First channel thumbnails:", JSON.stringify(c.author?.thumbnails || c.thumbnails || "N/A"));
        console.log("First channel title/name:", c.author?.name || c.title || "N/A");
    } else {
        console.log("No channels found in search.channels. Checking search.results...");
        console.log("Results types:", search.results?.map(r => r.constructor.name));
    }
}

test();
