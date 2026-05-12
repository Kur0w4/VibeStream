import YouTube from 'youtube-sr';

console.log("YouTube keys:", Object.keys(YouTube));
console.log("YouTube type:", typeof YouTube);
if (YouTube.default) {
  console.log("YouTube.default keys:", Object.keys(YouTube.default));
}
