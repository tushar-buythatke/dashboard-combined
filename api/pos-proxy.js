// Vercel Serverless Function to proxy POS API requests to search-new.bitbns.com
// This bypasses CORS issues in production

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Get the path after /api/pos-proxy
        const targetPath = req.url.replace(/^\/api\/pos-proxy/, '') || '/';
        const targetUrl = `https://search-new.bitbns.com/buyhatkeAdDashboard/ads${targetPath}`;

        console.log(`[POS API Proxy] ${req.method} ${targetUrl}`);

        // Prepare headers (forward relevant headers)
        const headers = {
            'Content-Type': 'application/json',
        };

        // Forward authorization if present
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }

        // Make the request to the actual API
        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // Add body for non-GET requests
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Get response data
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            res.status(response.status).json(data);
        } else {
            data = await response.text();
            res.status(response.status).send(data);
        }

    } catch (error) {
        console.error('[POS API Proxy Error]', error);
        res.status(500).json({ 
            error: 'Proxy request failed', 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
