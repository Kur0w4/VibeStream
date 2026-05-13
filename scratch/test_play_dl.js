import play from 'play-dl';

async function testPlayDl() {
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Stream URL:', stream.url);
    console.log('Content Type:', stream.type);
  } catch (error) {
    console.error('Play-dl error:', error);
  }
}

testPlayDl();
