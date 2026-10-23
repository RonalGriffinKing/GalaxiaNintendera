import { apiUrl } from './appEnvironment'
import { nxapiPresenceId, nxapiProfileId, NXAPI_CACHE_MS } from './nxapiPresence'
const cache = new Map()
export function clearNintendoSourceCache(url, source = 'presence') {
  const id = source === 'profile' ? nxapiProfileId(url) : nxapiPresenceId(url)
  cache.delete(source + ':' + id)
}
export function fetchNintendoSource(url, source = 'presence') {
  if (!['presence','profile'].includes(source)) throw new Error('Fuente de nxapi no válida.')
  const id = source === 'profile' ? nxapiProfileId(url) : nxapiPresenceId(url)
  const key = source + ':' + id
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.request
  const request = fetch(apiUrl('/.netlify/functions/nintendo-presence?source=' + source + '&id=' + id), { signal: AbortSignal.timeout(12000) }).then(async response => {
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo consultar Nintendo.')
    if (data.platform !== 'nintendo' || !data.presence || !data.displayName) throw new Error('Respuesta de nxapi no válida.')
    return data
  }).catch(error => { cache.delete(key); throw error })
  if (cache.size >= 100) cache.delete(cache.keys().next().value)
  cache.set(key, { request, until: Date.now() + NXAPI_CACHE_MS })
  return request
}
export const fetchNintendoPresence = url => fetchNintendoSource(url)
