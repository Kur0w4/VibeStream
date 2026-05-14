async function test() {
    console.log("Fetching soundcloud.com...");
    const res = await fetch('https://soundcloud.com');
    const text = await res.text();
    
    // Find the script tags
    const scriptRegex = /<script crossorigin src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+)"/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(text)) !== null) {
        scripts.push(match[1]);
    }
    console.log(`Found ${scripts.length} scripts`);
    
    for (const script of scripts.reverse()) {
        const scriptRes = await fetch(script);
        const scriptText = await scriptRes.text();
        const clientIdMatch = scriptText.match(/client_id:"([a-zA-Z0-9]{32})"/);
        if (clientIdMatch) {
            console.log("FOUND CLIENT ID:", clientIdMatch[1]);
            return clientIdMatch[1];
        }
    }
    console.log("NOT FOUND");
}
test();
