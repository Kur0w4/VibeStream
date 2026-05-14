import { Innertube, UniversalCache } from 'youtubei.js';
import fs from 'fs';

async function test() {
  try {
    const yt = await Innertube.create({ cache: new UniversalCache(false) });
    console.log("Fetching stream...");
    const stream = await yt.download("kJQP7kiw5Fk", {
      type: 'audio',
      quality: 'best',
      client: 'ANDROID'
    });
    console.log("Stream fetched!");
    // Just to verify it works, we don't need to write the whole file, just check if we get data
    for await (const chunk of stream) {
        console.log("Got chunk of size", chunk.length);
        break;
    }
  } catch (e) {
    console.error("Test failed", e);
  }
}

test();
