import crypto from 'crypto';

async function test() {
    const res = await fetch('https://www.jiosaavn.com/api.php?__call=search.getResults&q=bad+bunny&n=1&p=1&_format=json&_marker=0&ctx=web6dot0');
    const data = await res.json();
    const song = data.results[0];
    
    // Decrypt url
    const key = '38346591'; // Known JioSaavn DES key
    const decipher = crypto.createDecipheriv('des-ecb', Buffer.from(key, 'utf8'), Buffer.alloc(0));
    let decryptedUrl = decipher.update(song.encrypted_media_url, 'base64', 'utf8');
    decryptedUrl += decipher.final('utf8');
    
    console.log("Decrypted URL:", decryptedUrl);
}
test();
