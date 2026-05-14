import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create({ cache: new UniversalCache(false) });
  
  yt.session.on('auth-pending', (data) => {
    console.log(`Go to ${data.verification_url} in your browser and enter code ${data.user_code} to authenticate.`);
  });

  yt.session.on('auth-success', () => {
    console.log('Authentication successful!');
  });

  yt.session.on('auth-error', (err) => {
    console.error('Authentication failed:', err);
  });

  await yt.session.signIn();
}

test();
