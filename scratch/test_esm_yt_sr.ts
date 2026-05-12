
import YouTube from "youtube-sr";

async function test() {
  console.log("YouTube type:", typeof YouTube);
  console.log("YouTube keys:", Object.keys(YouTube || {}));
  try {
    const results = await YouTube.search("espresso", { limit: 1 });
    console.log("Results found:", results.length);
  } catch (e) {
    console.error("Error calling search:", e);
  }
}

test();
