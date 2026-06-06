import defaultBannerUrl from '@/iconos/Banner.png'
import defaultLogoUrl from '@/iconos/logo.png'

const LEGACY_ASSET_URLS = {
  '/src/iconos/Banner.png': defaultBannerUrl,
  '/src/iconos/logo.png': defaultLogoUrl
}

export { defaultBannerUrl, defaultLogoUrl }

const IMAGE_PROXY_PATH = '/.netlify/functions/image-proxy'

const encodeProxySource = (value = '') => {
  const raw = String(value || '')

  try {
    const bytes = new TextEncoder().encode(raw)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  } catch (error) {
    return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }
}

export const shouldProxyImageUrl = (url = '') => {
  const value = String(url || '').trim()
  if (!value || LEGACY_ASSET_URLS[value]) return false
  if (/^(data:|blob:|\/|#)/i.test(value)) return false
  if (value.includes(IMAGE_PROXY_PATH)) return false

  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return false
    return true
  } catch (error) {
    return false
  }
}

export const proxiedImageUrl = (url, fallback = '') => {
  const resolved = resolveAssetUrl(url, fallback, { proxy: false })
  if (!shouldProxyImageUrl(resolved)) return resolved
  return `${IMAGE_PROXY_PATH}?src=${encodeProxySource(resolved)}`
}

export const resolveAssetUrl = (url, fallback = '', options = {}) => {
  const value = String(url || '').trim()
  if (!value) return fallback
  const resolved = LEGACY_ASSET_URLS[value] || value
  if (options.proxy === false) return resolved
  return shouldProxyImageUrl(resolved) ? proxiedImageUrl(resolved) : resolved
}
