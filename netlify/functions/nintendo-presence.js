import { NXAPI_BASE, NXAPI_PROFILE_BASE, NXAPI_CACHE_MS, normalizeNxapiPresence, parseNxapiPublicProfile } from '../../src/services/nxapiPresence.js'
const cache = new Map()
const pending = new Map()
const json = (statusCode, body, cached = false) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cached ? 'public, max-age=60, s-maxage=60' : 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify(body) })
export async function handler(event) {
  if (event.httpMethod !== 'GET') return { ...json(405, { error: 'Método no permitido.' }), headers: { ...json(405, {}).headers, Allow: 'GET' } }
  const params = event.queryStringParameters || {}
  const profile = params.source === 'profile'
  const validSource = params.source === undefined || params.source === 'presence' || profile
  if (typeof params.id !== 'string' || params.id.length !== (profile ? 22 : 16) || Object.keys(params).some(key => !['id', 'source'].includes(key)) || !validSource || !(profile ? /^[A-Za-z0-9_-]{22}$/ : /^[a-f0-9]{16}$/).test(params.id || '')) return json(400, { error: 'Identificador o fuente de nxapi no válido.' })
  const id = params.id
  const key = (profile ? 'profile:' : 'presence:') + id
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return json(200, hit.value, true)
  try {
    if (!pending.has(key)) {
      const request = (async () => {
        const response = await fetch((profile ? NXAPI_PROFILE_BASE : NXAPI_BASE) + id, { headers: { accept: profile ? 'text/html' : 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000) })
        if (!response.ok) throw new Error('upstream')
        if (!response.headers.get('content-type')?.includes(profile ? 'text/html' : 'application/json')) throw new Error('format')
        // Bound decompressed responses as well as the fetch duration.
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let body = '', size = 0
        try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > (profile ? 524288 : 65536)) { await reader.cancel(); throw new Error('size') }; body += decoder.decode(value, { stream: true }) } body += decoder.decode() } finally { reader.releaseLock() }
        const value = profile ? parseNxapiPublicProfile(body, id) : normalizeNxapiPresence(JSON.parse(body))
        if (cache.size >= 200) cache.delete(cache.keys().next().value)
        cache.set(key, { value, until: Date.now() + NXAPI_CACHE_MS })
        return value
      })()
      pending.set(key, request)
    }
    return json(200, await pending.get(key), true)
  } catch {
    return json(502, { error: profile ? 'No se pudo leer el perfil público de nxapi. Puede no estar disponible o haber cambiado su formato.' : 'No se pudo consultar la presencia de nxapi. Comprueba que el enlace sea público y vuelve a intentarlo.' })
  } finally { pending.delete(key) }
}
