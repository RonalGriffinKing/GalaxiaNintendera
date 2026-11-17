import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth } = vi.hoisted(() => ({ auth: { currentUser: null } }))
vi.mock('@/firebase', () => ({ auth }))
import { backendFunctionUrl, backendRequest } from './backendClient'

describe('backendClient', () => {
  beforeEach(() => { vi.stubEnv('VITE_BACKEND_ORIGIN', ''); vi.stubEnv('DEV', true); auth.currentUser = null; vi.unstubAllGlobals() })
  it('uses the current web origin and local function path by default', () => {
    vi.stubGlobal('location', { origin: 'http://localhost:5173' })
    expect(backendFunctionUrl('igdb')).toBe('http://localhost:5173/.netlify/functions/igdb')
  })
  it('uses the configured HTTPS server origin and query', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', 'https://api.example.test')
    expect(backendFunctionUrl('xbox-profile', { uid: 'u 1' })).toBe('https://api.example.test/.netlify/functions/xbox-profile?uid=u+1')
  })
  it('rejects non-HTTPS production origins and arbitrary function names', () => {
    vi.stubEnv('DEV', false); vi.stubEnv('VITE_BACKEND_ORIGIN', 'http://api.example.test')
    expect(() => backendFunctionUrl('igdb')).toThrow('backend-origin-insecure')
    vi.stubEnv('VITE_BACKEND_ORIGIN', '')
    expect(() => backendFunctionUrl('../igdb')).toThrow('backend-function-invalid')
  })
  it('uses current Firebase session token without storing it and maps auth errors', async () => {
    auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('ephemeral-token') }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetch)
    await backendRequest('role-management', { method: 'POST', authenticated: true, body: { action: 'grant-publisher', targetUid: 'other' } })
    expect(fetch.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer ephemeral-token' })
    fetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: 'forbidden' }) })
    await expect(backendRequest('role-management')).rejects.toThrow('forbidden')
  })
  it('rejects protected calls without session and handles network/CORS failures', async () => {
    await expect(backendRequest('profile-progress', { authenticated: true })).rejects.toThrow('authentication-required')
    vi.stubGlobal('location', { origin: 'http://localhost:5173' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(backendRequest('igdb')).rejects.toThrow('backend-network-error')
  })
  it('forwards AbortSignal to the request and preserves cancellation errors', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('Aborted', 'AbortError')
    const fetch = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('location', { origin: 'http://localhost:5173' })
    vi.stubGlobal('fetch', fetch)
    await expect(backendRequest('igdb', { method: 'POST', body: { query: 'Kirby' }, signal: controller.signal })).rejects.toBe(abortError)
    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal)
  })
  it('preserves cache-busting parameters for public social-export image requests', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', 'https://backend.example.test')
    const source = 'https://cdn.example.test/social.png?width=1200'
    const url = new URL(backendFunctionUrl('image-proxy', { url: source, cb: 42 }))
    expect(url.origin).toBe('https://backend.example.test')
    expect(url.pathname).toBe('/.netlify/functions/image-proxy')
    expect(url.searchParams.get('url')).toBe(source)
    expect(url.searchParams.get('cb')).toBe('42')
  })
})
