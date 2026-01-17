export default async function handler(req, res) {
    // 1. Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key, anthropic-version'
    );

    // 2. Handle OPTIONS (Preflight)
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
        const fetchOptions = {
            method: req.method,
            headers: {}
        };

        // Forward specific security headers if present
        const forwardableHeaders = [
            'authorization',
            'x-api-key',
            'anthropic-version',
            'anthropic-dangerous-direct-browser-access',
            'content-type',
            'http-referer',
            'referer',
            'origin',
            'x-title',
            'openai-organization',
            'openai-project'
        ];
        forwardableHeaders.forEach(h => {
            if (req.headers[h]) {
                fetchOptions.headers[h] = req.headers[h];
            }
        });

        // Add a standard browser User-Agent if none provided
        fetchOptions.headers['user-agent'] = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        // Handle POST body
        if (req.method === 'POST' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(url, fetchOptions);

        // 5. Read Body safely
        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // 6. Return Wrapper
        return res.status(200).json({
            upstreamOk: response.ok,
            upstreamStatus: response.status,
            upstreamStatusText: response.statusText,
            contentType: contentType,
            data: data
        });

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(200).json({
            upstreamOk: false,
            upstreamStatus: 500,
            error: 'Internal Proxy Error',
            details: error.message
        });
    }
}
