import { getFirestore } from 'firebase-admin/firestore'
import { adminApp } from './lib/firebase-admin.js'
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
  const snapshot=await getFirestore(adminApp()).collection('posts').where('status','==','approved').get()
  return snapshot.docs.map(document=>({...document.data(),id:document.id})).filter(isPublicPost).sort((a,b)=>toTime(b.updatedAt||b.createdAt)-toTime(a.updatedAt||a.createdAt))
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

function toTime(value) {
  if (value?.toMillis) return value.toMillis()
  if (typeof value === 'number') return value
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
