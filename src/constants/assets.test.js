import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/firebase', () => ({ auth: { currentUser: null } }))
import { proxiedImageUrl } from './assets'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('shared image proxy URL', () => {
  it('keeps encoded src contract and uses configured backend origin', () => {
    vi.stubEnv('VITE_BACKEND_ORIGIN', 'https://backend.example.test')
    vi.stubGlobal('window', { location: { origin: 'https://public.example.test' } })
    const source = 'https://images.example.test/cover.png?size=large&theme=2'
    const proxy = new URL(proxiedImageUrl(source))
    expect(proxy.origin).toBe('https://backend.example.test')
    expect(proxy.pathname).toBe('/.netlify/functions/image-proxy')
    const encoded = proxy.searchParams.get('src').replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(encoded + '='.repeat((4 - encoded.length % 4) % 4))
    expect(decoded).toBe(source)
  })

  it('does not proxy same-origin or inline sources', () => {
    vi.stubGlobal('window', { location: { origin: 'https://public.example.test' } })
    expect(proxiedImageUrl('https://public.example.test/local.png')).toBe('https://public.example.test/local.png')
    expect(proxiedImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
  })
})
