import { auth } from '@/firebase'

const FUNCTION_PREFIX = '/.netlify/functions/'

function configuredOrigin() {
  const value = String(import.meta.env.VITE_BACKEND_ORIGIN || '').trim()
  if (!value) return ''
  let url
  try { url = new URL(value) } catch { throw new Error('backend-origin-invalid') }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('backend-origin-invalid')
  if (url.protocol !== 'https:' && !(import.meta.env.DEV && local && url.protocol === 'http:')) throw new Error('backend-origin-insecure')
  return url.origin
}

export function backendFunctionUrl(name, query) {
  if (!/^[a-z0-9-]+$/i.test(name)) throw new Error('backend-function-invalid')
  const url = new URL(`${FUNCTION_PREFIX}${name}`, configuredOrigin() || globalThis.location?.origin || 'http://localhost')
  if (query) for (const [key, value] of Object.entries(query)) if (value != null) url.searchParams.set(key, String(value))
  return url.toString()
}

export async function backendRequest(name, { method = 'GET', query, body, authenticated = false, signal, headers = {} } = {}) {
  const requestHeaders = { ...headers }
  const hasHeader = name => Object.keys(requestHeaders).some(key => key.toLowerCase() === name.toLowerCase())
  const setHeader = (name, value) => { const old = Object.keys(requestHeaders).find(key => key.toLowerCase() === name.toLowerCase()); requestHeaders[old || name] = value }
  if (body !== undefined && !hasHeader('Content-Type')) setHeader('Content-Type', 'application/json')
  if (authenticated) {
    const user = auth.currentUser
    if (!user) throw new Error('authentication-required')
    let token
    try { token = await user.getIdToken() } catch { throw new Error('session-expired') }
    setHeader('Authorization', `Bearer ${token}`)
  }
  let response
  try {
    response = await fetch(backendFunctionUrl(name, query), {
      method, headers: requestHeaders,
      ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {})
    })
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw error
    throw new Error('backend-network-error', { cause: error })
  }
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new Error(data.error || 'session-expired')
  if (response.status === 403) throw new Error(data.error || 'forbidden')
  if (!response.ok) throw new Error(data.error || `backend-error-${response.status}`)
  return data
}
