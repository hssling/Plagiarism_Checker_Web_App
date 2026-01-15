export default async function handler(req, res) {
    // 1. Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Handle OPTIONS (Preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Extract Target URL
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    try {
        // 4. Server-Side Fetch (Bypasses CORS)
        const response = await fetch(url, {
            headers: {
                // Mimic a browser to avoid some basic bot blocking
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // 5. Handle Errors
        if (!response.ok) {
            return res.status(response.status).json({
                error: `External API Error: ${response.statusText}`,
                details: await response.text()
            });
        }

        // 6. Return Data
        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
