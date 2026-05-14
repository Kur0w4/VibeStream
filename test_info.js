import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create({ cache: new UniversalCache(false) });
  const info = await yt.getBasicInfo('kJQP7kiw5Fk');
  const format = info.chooseFormat({ type: 'audio', quality: 'best' });
  const url = format.decipher(yt.session.player);
  console.log("Deciphered URL:", url.substring(0, 50) + "...");
}

test();
