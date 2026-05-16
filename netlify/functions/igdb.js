const IGDB_AUTH_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_API_URL = 'https://api.igdb.com/v4/games'

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})

const normalizeImageUrl = (url = '') => {
  if (!url) return ''
  const withProtocol = url.startsWith('//') ? `https:${url}` : url
  return withProtocol.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p')
}

const uniqueImages = (images) => {
  const seen = new Set()
  return images.filter((image) => {
    if (!image.url || seen.has(image.url)) return false
    seen.add(image.url)
    return true
  })
}

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const imageCount = (game) => Number(Boolean(game?.cover?.url))
  + Number(game?.screenshots?.length || 0)
  + Number(game?.artworks?.length || 0)

const pickBestGame = (games, search) => {
  const normalizedSearch = normalize(search)
  return [...games].sort((a, b) => {
    const aName = normalize(a.name)
    const bName = normalize(b.name)
    const aExact = aName === normalizedSearch ? 1 : 0
    const bExact = bName === normalizedSearch ? 1 : 0
    const aStarts = aName.startsWith(normalizedSearch) ? 1 : 0
    const bStarts = bName.startsWith(normalizedSearch) ? 1 : 0
    return (bExact - aExact)
      || (bStarts - aStarts)
      || (imageCount(b) - imageCount(a))
      || (aName.length - bName.length)
  })[0]
}

const getAccessToken = async () => {
  const clientId = process.env.IGDB_CLIENT_ID
  const clientSecret = process.env.IGDB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Faltan IGDB_CLIENT_ID o IGDB_CLIENT_SECRET en el entorno.')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  })

  const response = await fetch(`${IGDB_AUTH_URL}?${params.toString()}`, { method: 'POST' })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.access_token) {
    throw new Error(data.message || 'IGDB no devolvio token de acceso.')
  }

  return data.access_token
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {})
  if (event.httpMethod !== 'POST') return json(405, { error: 'Metodo no permitido.' })

  try {
    const { query } = JSON.parse(event.body || '{}')
    const search = String(query || '').trim()
    if (!search) return json(400, { error: 'Falta el nombre del juego.' })

    const token = await getAccessToken()
    const clientId = process.env.IGDB_CLIENT_ID
    const escaped = search.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const body = [
      'fields name,cover.url,screenshots.url,artworks.url;',
      `search "${escaped}";`,
      'limit 5;'
    ].join(' ')

    const response = await fetch(IGDB_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain'
      },
      body
    })

    const games = await response.json().catch(() => [])
    if (!response.ok) {
      return json(response.status, { error: games?.message || 'No se pudo consultar IGDB.' })
    }

    const game = Array.isArray(games) ? pickBestGame(games, search) : null
    if (!game) return json(200, { game: null, images: [] })

    const images = uniqueImages([
      game.cover?.url && {
        id: `cover-${game.id}`,
        type: 'cover',
        typeLabel: 'Caratula',
        url: normalizeImageUrl(game.cover.url)
      },
      ...(game.screenshots || []).map((item, index) => ({
        id: `screenshot-${item.id || index}`,
        type: 'screenshot',
        typeLabel: 'Gameplay',
        url: normalizeImageUrl(item.url)
      })),
      ...(game.artworks || []).map((item, index) => ({
        id: `artwork-${item.id || index}`,
        type: 'artwork',
        typeLabel: 'Arte',
        url: normalizeImageUrl(item.url)
      }))
    ].filter(Boolean))

    return json(200, {
      game: {
        id: game.id,
        name: game.name
      },
      images
    })
  } catch (error) {
    console.error(error)
    return json(500, { error: error.message || 'Error interno buscando imagenes.' })
  }
}
