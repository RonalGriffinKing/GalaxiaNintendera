import { Capacitor } from '@capacitor/core'

const DEFAULT_PUBLIC_ORIGIN = 'https://galaxianintendera.com'

export const isNativeApp = () => Capacitor.isNativePlatform()

export const publicOrigin = String(
  import.meta.env.VITE_SITE_URL || DEFAULT_PUBLIC_ORIGIN
).replace(/\/$/, '')

/**
 * Las funciones serverless viven en el dominio publico, no dentro del WebView.
 * En navegador mantenemos rutas relativas para que Vite y Netlify funcionen igual.
 */
export const apiUrl = (path) => {
  if (!isNativeApp() || !String(path).startsWith('/')) return path
  return `${publicOrigin}${path}`
}
