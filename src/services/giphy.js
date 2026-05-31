const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || ''
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs'

const mapGiphyItem = (item = {}) => {
  const fixed = item.images?.fixed_height || item.images?.downsized_medium || item.images?.original || {}
  const preview = item.images?.fixed_width_small || item.images?.fixed_height_small || fixed

  return {
    id: item.id || fixed.url || '',
    type: 'gif',
    provider: 'giphy',
    title: item.title || 'GIF',
    url: fixed.url || '',
    previewUrl: preview.url || fixed.url || '',
    width: Number(fixed.width || 0),
    height: Number(fixed.height || 0)
  }
}

export const hasGiphyKey = () => Boolean(GIPHY_API_KEY)

export const fetchGiphyItems = async ({ query = '', limit = 18, rating = 'pg-13', lang = 'es' } = {}) => {
  if (!GIPHY_API_KEY) return []

  const endpoint = query.trim() ? 'search' : 'trending'
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    rating,
    lang
  })

  if (query.trim()) params.set('q', query.trim())

  const response = await fetch(`${GIPHY_BASE_URL}/${endpoint}?${params.toString()}`)
  if (!response.ok) throw new Error('No se pudo cargar GIPHY')
  const payload = await response.json()
  return (payload.data || []).map(mapGiphyItem).filter(item => item.url)
}
