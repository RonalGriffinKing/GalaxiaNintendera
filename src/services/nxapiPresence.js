export const NXAPI_BASE = 'https://nxapi-presence.fancy.org.uk/api/presence/'
export const NXAPI_CACHE_MS = 60_000
export function nxapiPresenceId(value) {
  if (typeof value !== 'string') throw new Error('Introduce una URL pública de presencia de nxapi válida.')
  const match = value.trim().match(/^https:\/\/nxapi-presence\.fancy\.org\.uk\/api\/presence\/([a-f0-9]{16})$/)
  if (!match) throw new Error('La URL debe ser https://nxapi-presence.fancy.org.uk/api/presence/ seguida de 16 caracteres hexadecimales, sin parámetros.')
  return match[1]
}
const text = (value, max = 200) => typeof value === 'string' ? value.slice(0, max).trim() : ''
function imageUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : '' } catch { return '' }
}
function timestamp(value) {
  if (!Number.isFinite(value) || value <= 0) return null
  const date = new Date(value * 1000)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}
function nintendoGameId(value) {
  if (typeof value !== 'string') return ''
  if (/^[a-f0-9]{16}$/.test(value)) return value
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'ec.nintendo.com' || url.username || url.password || url.port) return ''
    return url.pathname.match(/^\/apps\/([a-f0-9]{16})(?:\/|$)/)?.[1] || ''
  } catch { return '' }
}
/** Normalize only capabilities actually returned by the public presence endpoint. */
export function normalizeNxapiPresence(data) {
  const friend = data?.friend
  const raw = friend?.presence
  if (!text(friend?.name) || !raw || typeof raw.state !== 'string') throw new Error('Respuesta de presencia no válida.')
  const state = ['ONLINE', 'PLAYING'].includes(raw.state) ? 'online' : ['OFFLINE', 'INACTIVE'].includes(raw.state) ? 'offline' : 'unknown'
  const name = text(raw.game?.name)
  const id = nintendoGameId(raw.game?.shopUri) || (text(data.title?.name) === name ? nintendoGameId(data.title?.id) : '') || text(raw.game?.shopUri, 2048) || name
  const game = name ? { id, title: name, imageUrl: imageUrl(raw.game.imageUri) } : null
  const platformLabel = raw.platform === 2 ? 'Nintendo Switch 2' : raw.platform === 1 ? 'Nintendo Switch' : null
  const minutes = raw.game?.totalPlayTime
  return {
    platform: 'nintendo', connectionState: 'connected', visibility: 'public',
    displayName: text(friend.name), avatarUrl: imageUrl(friend.imageUri),
    presence: { state, currentGame: state === 'online' ? game : null, lastGame: state !== 'online' ? game : null, updatedAt: timestamp(raw.updatedAt), logoutAt: timestamp(raw.logoutAt), ...(platformLabel ? { platformLabel } : {}) },
    history: null, library: null, playtime: game && Number.isFinite(minutes) && minutes >= 0 ? [{ gameId: id, minutes, source: 'nxapi-presence' }] : null, achievements: null
  }
}
export const NXAPI_PROFILE_BASE = 'https://nxapi-auth.fancy.org.uk/profile/'
export function nxapiProfileId(value) {
  const match = typeof value === 'string' && value.trim().match(/^https:\/\/nxapi-auth\.fancy\.org\.uk\/profile\/([A-Za-z0-9_-]{22})$/)
  if (!match) throw new Error('La URL del perfil debe pertenecer a https://nxapi-auth.fancy.org.uk/profile/ y contener su identificador público de 22 caracteres, sin parámetros.')
  return match[1]
}
function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}
export function normalizeNxapiPublicProfile(profile) {
  if (!text(profile?.name)) throw new Error('Perfil público no válido.')
  const recent = Array.isArray(profile.recent_titles) ? profile.recent_titles.slice(0, 100) : []
  const top = Array.isArray(profile.most_played_titles) ? profile.most_played_titles.slice(0, 100) : []
  const validGame = game => game && /^[a-f0-9]{16}$/.test(game.id) && text(game.name)
  const gameData = game => ({ id: game.id, title: text(game.name), imageUrl: imageUrl(game.image_url), firstPlayedAt: isoDate(game.first_played_at) })
  const featured = [...new Map([...top, ...recent].filter(validGame).map(game => [game.id, game])).values()]
  const history = recent.filter(validGame).flatMap(game => { const at = isoDate(game.last_played_at); return at ? [{ game: gameData(game), at }] : [] }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return { platform: 'nintendo', connectionState: 'connected', visibility: 'public', displayName: text(profile.name), avatarUrl: imageUrl(profile.picture_url),
    presence: { state: 'unknown', currentGame: null, lastGame: history[0]?.game || null, updatedAt: history[0]?.at || null, logoutAt: null },
    history, featuredGames: featured.map(gameData), library: null,
    playtime: featured.filter(game => Number.isFinite(game.total_play_time) && game.total_play_time >= 0).map(game => ({ gameId: game.id, minutes: game.total_play_time, source: 'nxapi-public-profile' })), achievements: null }
}
export function parseNxapiPublicProfile(html, id) {
  const state = html.match(/<script\b(?=[^>]*\bid=["']state["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/i)
  if (!state) throw new Error('El perfil público no contiene datos estructurados compatibles.')
  const profile = JSON.parse(state[1])?.['profile_id_' + id]?.profile
  if (profile?.id !== id) throw new Error('Perfil público no disponible.')
  return normalizeNxapiPublicProfile(profile)
}
/** Presence and public game history remain separate capabilities, with no invented library. */
export function combineNintendoSources(presence, publicProfile) {
  if (!presence && !publicProfile) return null
  const canonicalGame = game => game ? { ...game, id: nintendoGameId(game.id) || game.id } : null
  const playtime = publicProfile?.playtime || presence?.playtime ? [...new Map([...(publicProfile?.playtime || []), ...(presence?.playtime || [])].map(entry => [nintendoGameId(entry.gameId) || entry.gameId, { ...entry, gameId: nintendoGameId(entry.gameId) || entry.gameId }])).values()] : null
  return { ...(publicProfile || {}), ...(presence || {}),
    presence: presence?.presence ? { ...presence.presence, currentGame: canonicalGame(presence.presence.currentGame), lastGame: canonicalGame(presence.presence.lastGame || publicProfile?.presence?.lastGame) } : publicProfile?.presence || null,
    history: publicProfile?.history || null, featuredGames: publicProfile?.featuredGames || null,
    library: null, playtime, achievements: null }
}
