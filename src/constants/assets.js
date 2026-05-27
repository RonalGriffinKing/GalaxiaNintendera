import defaultBannerUrl from '@/iconos/Banner.png'
import defaultLogoUrl from '@/iconos/logo.png'

const LEGACY_ASSET_URLS = {
  '/src/iconos/Banner.png': defaultBannerUrl,
  '/src/iconos/logo.png': defaultLogoUrl
}

export { defaultBannerUrl, defaultLogoUrl }

export const resolveAssetUrl = (url, fallback = '') => {
  const value = String(url || '').trim()
  if (!value) return fallback
  return LEGACY_ASSET_URLS[value] || value
}
