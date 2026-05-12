
import YouTube from "youtube-sr";

async function test() {
  console.log("YouTube type:", typeof YouTube);
  // If YouTube is the module object, it might have a default property
  const yt = YouTube.default || YouTube;
  console.log("Using search from:", typeof yt.search);
  
  try {
    const results = await yt.search("espresso", { limit: 1 });
    console.log("Results found:", results.length);
  } catch (e) {
    console.error("Error calling search:", e);
  }
}

test();
