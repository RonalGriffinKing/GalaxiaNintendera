const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'widget-dreams'
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCIjX5wXqFS5nWj6u13bnVDq2PSFNjhZhA'

export const handler = async (event) => {
  const siteUrl = resolveSiteUrl(event)
  const type = String(event.queryStringParameters?.type || '').toLowerCase()

  if (type === 'robots') {
    return textResponse([
      'User-agent: *',
      'Allow: /',
      'Disallow: /workspace',
      'Disallow: /perfil',
      'Disallow: /login',
      `Sitemap: ${siteUrl}/sitemap.xml`,
      ''
    ].join('\n'), 'text/plain; charset=utf-8')
  }

  const posts = await loadPublicPosts().catch(() => [])
  const staticPages = [
    { path: '/', priority: '1.0', frequency: 'daily' },
    { path: '/noticias', priority: '0.9', frequency: 'daily' },
    { path: '/eventos', priority: '0.7', frequency: 'weekly' },
    { path: '/comunidad', priority: '0.7', frequency: 'daily' },
    { path: '/guias', priority: '0.7', frequency: 'weekly' },
    { path: '/rumores', priority: '0.6', frequency: 'weekly' }
  ]

  const urls = [
    ...staticPages.map(page => sitemapEntry(`${siteUrl}${page.path}`, '', page.frequency, page.priority)),
    ...posts.map(post => sitemapEntry(
      `${siteUrl}/post/${encodeURIComponent(post.slug || post.id)}`,
      toIsoDate(post.updatedAt || post.createdAt),
      'weekly',
      '0.8'
    ))
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  return textResponse(xml, 'application/xml; charset=utf-8')
}

function resolveSiteUrl(event) {
  const configured = String(process.env.VITE_SITE_URL || 'https://galaxianintendera.com').trim()
  if (configured) return configured.replace(/\/$/, '')
  const host = event.headers?.['x-forwarded-host'] || event.headers?.host || 'localhost:8888'
  const protocol = event.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

async function loadPublicPosts() {
  const posts = []
  let pageToken = ''

  do {
    const endpoint = new URL(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/posts`)
    endpoint.searchParams.set('pageSize', '300')
    endpoint.searchParams.set('key', FIREBASE_API_KEY)
    if (pageToken) endpoint.searchParams.set('pageToken', pageToken)

    const response = await fetch(endpoint, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`Firestore sitemap request failed: ${response.status}`)
    const payload = await response.json()

    for (const document of payload.documents || []) {
      const post = Object.fromEntries(
        Object.entries(document.fields || {}).map(([key, value]) => [key, decodeValue(value)])
      )
      post.id = document.name?.split('/').pop() || ''
      if (isPublicPost(post)) posts.push(post)
    }

    pageToken = payload.nextPageToken || ''
  } while (pageToken)

  return posts.sort((a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt))
}

function isPublicPost(post) {
  const releaseTime = toTime(post.releaseAt || post.scheduledAt)
  return post.status === 'approved'
    && post.visibility !== 'private'
    && post.visibility !== 'unlisted'
    && post.indexGoogle !== false
    && post.placement !== 'hero'
    && !post.isMainEntry
    && (!releaseTime || releaseTime <= Date.now())
}

function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('timestampValue' in value) return value.timestampValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('nullValue' in value) return null
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue)
  if (value.mapValue) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeValue(item)]))
  }
  return ''
}

function toTime(value) {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function toIsoDate(value) {
  const time = toTime(value)
  return time ? new Date(time).toISOString() : ''
}

function sitemapEntry(location, lastModified, frequency, priority) {
  return [
    '  <url>',
    `    <loc>${escapeXml(location)}</loc>`,
    lastModified ? `    <lastmod>${escapeXml(lastModified)}</lastmod>` : '',
    `    <changefreq>${frequency}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].filter(Boolean).join('\n')
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function textResponse(body, contentType) {
  return {
    statusCode: 200,
    headers: {
      'cache-control': 'public, max-age=300, s-maxage=1800',
      'content-type': contentType
    },
    body
  }
}
