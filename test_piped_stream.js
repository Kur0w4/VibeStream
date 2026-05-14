async function test() {
    try {
        const instances = [
            'https://pipedapi.kavin.rocks',
            'https://pipedapi.moomoo.me',
            'https://api.piped.projectsegfau.lt',
            'https://piped.video',
            'https://piped.privacydev.net'
        ];
        for (const inst of instances) {
            console.log("Testing", inst);
            try {
                const res = await fetch(`${inst}/streams/kJQP7kiw5Fk`, { signal: AbortSignal.timeout(5000) });
                const data = await res.json();
                if (data.audioStreams) {
                    console.log("SUCCESS on", inst);
                    console.log("Audio URL:", data.audioStreams[0].url.substring(0, 50));
                    return;
                }
            } catch (e) {
                console.log("FAILED", inst, e.message);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
test();
