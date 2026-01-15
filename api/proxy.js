export default async function handler(req, res) {
    // 1. Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Handle OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Extract Target
    const { url } = req.query;
    if (!url) {
        return res.status(200).json({ upstreamOk: false, upstreamStatus: 400, error: 'Missing "url" query parameter' });
    }

    try {
        // 4. Server-Side Fetch
        // User-Agent rotation to be polite but resilient
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

        const response = await fetch(url, {
            headers: { 'User-Agent': randomUA }
        });

        // 5. Read Body safely (Text, not JSON)
        // This fixes the crash when upstream returns XML (arXiv) or HTML (error pages)
        const rawBody = await response.text();

        // 6. Return Wrapper (ALWAYS 200 OK to keep console clean)
        return res.status(200).json({
            upstreamOk: response.ok,
            upstreamStatus: response.status,
            upstreamStatusText: response.statusText,
            contentType: response.headers.get('content-type'),
            data: rawBody
        });

    } catch (error) {
        console.error('Proxy Error:', error);
        // Return 200 with error details so client can handle it gracefully
        return res.status(200).json({
            upstreamOk: false,
            upstreamStatus: 500,
            error: 'Internal Proxy Error',
            details: error.message
        });
    }
}
