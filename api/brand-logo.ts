const UPSTREAM_BASE = 'https://search-new.bitbns.com/buyhatke/wrapper/brandLogo'

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
    const brandRaw = (req.query?.brand ?? req.query?.b ?? '').toString()
    const brand = brandRaw.trim()

    if (!brand) {
      return res.status(400).json({ message: 'Missing brand query param' })
    }

    const upstreamUrl = new URL(UPSTREAM_BASE)
    upstreamUrl.searchParams.set('brand', brand)

    const upstream = await fetch(upstreamUrl.toString(), {
      headers: {
        referer: 'https://search-new.bitbns.com/',
        origin: 'https://search-new.bitbns.com',
        'user-agent':
          req.headers['user-agent'] ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: 'Upstream error', statusText: upstream.statusText })
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    const buf = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')

    return res.status(200).send(buf)
  } catch (err: any) {
    return res.status(500).json({ message: 'Fetch failed', error: err?.message || 'unknown' })
  }
}
