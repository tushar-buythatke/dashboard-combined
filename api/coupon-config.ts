const UPSTREAM_URL = 'https://search-new.bitbns.com/extension/configs-coupons/prod/ALL_CONFIG_COUPON.json'

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const upstream = await fetch(UPSTREAM_URL, {
      // Cloudflare/Upstream friendly headers
      headers: {
        'referer': 'https://search-new.bitbns.com/',
        'origin': 'https://search-new.bitbns.com',
        'user-agent': req.headers['user-agent'] ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
        'accept': 'application/json, text/plain, */*',
      },
      // Avoid revalidation by proxies that might strip headers
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: 'Upstream error', statusText: upstream.statusText })
    }

    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    const buf = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    // Same-origin by default, but allow other origins if embedded elsewhere
    res.setHeader('Access-Control-Allow-Origin', '*')
    // Cache for a short time on the edge/CDN
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

    return res.status(200).send(buf)
  } catch (err: any) {
    return res.status(500).json({ message: 'Fetch failed', error: err?.message || 'unknown' })
  }
}
