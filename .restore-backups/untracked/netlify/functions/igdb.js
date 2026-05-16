const API_BASE = 'https://api.igdb.com/v4'
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload'

let cachedToken = null
let cachedTokenExpiresAt = 0

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Metodo no permitido' })
  }

  const clientId = process.env.IGDB_CLIENT_ID
  const clientSecret = process.env.IGDB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return jsonResponse(500, { error: 'Faltan IGDB_CLIENT_ID o IGDB_CLIENT_SECRET en el entorno.' })
  }

  const action = event.queryStringParameters?.action || ''

  try {
    if (action === 'search') {
      const query = String(event.queryStringParameters?.query || '').trim()
      if (!query) return jsonResponse(400, { error: 'Escribe un juego para buscar.' })

      const games = await igdbFetch(
        '/games',
        [
          'fields name,first_release_date,cover.image_id;',
          `search "${escapeIgdbString(query)}";`,
          'where themes != (42);',
          'limit 8;'
        ].join(' '),
        { clientId, clientSecret }
      )

      return jsonResponse(200, {
        games: Array.isArray(games)
          ? games.map(game => ({
              id: game.id,
              name: game.name,
              releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : '',
              cover: game.cover?.image_id ? buildImageUrl(game.cover.image_id, 'cover_small_2x') : ''
            }))
          : []
      })
    }

    if (action === 'images') {
      const gameId = Number(event.queryStringParameters?.gameId || 0)
      if (!gameId) return jsonResponse(400, { error: 'Falta el juego seleccionado.' })

      const games = await igdbFetch(
        '/games',
        [
          'fields name,cover.image_id,cover.width,cover.height,',
          'artworks.image_id,artworks.width,artworks.height,',
          'screenshots.image_id,screenshots.width,screenshots.height,',
          'websites.url,websites.type;',
          `where id = ${gameId};`,
          'limit 1;'
        ].join(' '),
        { clientId, clientSecret }
      )
      const game = Array.isArray(games) ? games[0] : null

      return jsonResponse(200, {
        images: game ? normalizeGameImages(game).slice(0, 48) : [],
        pressKitUrls: game ? normalizePressKitUrls(game.websites) : []
      })
    }

    return jsonResponse(400, { error: 'Accion no soportada.' })
  } catch (error) {
    console.error(error)
    return jsonResponse(502, { error: 'IGDB no respondio correctamente.' })
  }
}

async function igdbFetch(path, body, credentials) {
  const accessToken = await getAccessToken(credentials)
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'client-id': credentials.clientId,
      'content-type': 'text/plain',
      'user-agent': 'GalaxiaNintendera/1.0 IGDB proxy'
    },
    body
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || data?.cause || `IGDB ${response.status}`)
  }

  return data
}

async function getAccessToken({ clientId, clientSecret }) {
  const now = Date.now()
  if (cachedToken && cachedTokenExpiresAt > now + 60_000) {
    return cachedToken
  }

  const tokenUrl = new URL(TOKEN_URL)
  tokenUrl.searchParams.set('client_id', clientId)
  tokenUrl.searchParams.set('client_secret', clientSecret)
  tokenUrl.searchParams.set('grant_type', 'client_credentials')

  const response = await fetch(tokenUrl, { method: 'POST' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.message || `Twitch OAuth ${response.status}`)
  }

  cachedToken = data.access_token
  cachedTokenExpiresAt = now + Math.max(0, Number(data.expires_in || 0) - 120) * 1000
  return cachedToken
}

function normalizeGameImages(game) {
  return [
    ...normalizeImages(game.artworks, 'hero', '1080p', 'screenshot_med_2x'),
    ...normalizeImages(game.screenshots, 'banner', '1080p', 'screenshot_med_2x'),
    ...normalizeImages(game.cover ? [game.cover] : [], 'icon', 'cover_big_2x', 'cover_small_2x')
  ]
}

function normalizeImages(items = [], type, size, thumbSize) {
  return Array.isArray(items)
    ? items
        .filter(item => item?.image_id)
        .map(item => ({
          id: `${type}-${item.image_id}`,
          type,
          url: buildImageUrl(item.image_id, size),
          thumb: buildImageUrl(item.image_id, thumbSize),
          width: item.width || null,
          height: item.height || null,
          style: 'igdb'
        }))
    : []
}

function normalizePressKitUrls(websites = []) {
  return Array.isArray(websites)
    ? websites
        .map(website => website?.url || '')
        .filter(url => /press|media|kit/i.test(url))
        .slice(0, 6)
    : []
}

function buildImageUrl(imageId, size) {
  return `${IMAGE_BASE}/t_${size}/${imageId}.jpg`
}

function escapeIgdbString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}
