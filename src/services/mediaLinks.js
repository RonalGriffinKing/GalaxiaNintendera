import { proxiedImageUrl } from '@/constants/assets'

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i

export const youtubeIdFromUrl = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] || ''
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.searchParams.get('v')) return url.searchParams.get('v') || ''

      const parts = url.pathname.split('/').filter(Boolean)
      if (['embed', 'shorts', 'live'].includes(parts[0])) {
        return parts[1] || ''
      }
    }
  } catch (error) {
    const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{6,})/)
    return match?.[1] || ''
  }

  return ''
}

export const mediaFromUrl = (value = '') => {
  const url = String(value || '').trim()
  if (!url) return { type: 'empty', url: '' }

  const youtubeId = youtubeIdFromUrl(url)
  if (youtubeId) {
    return {
      type: 'youtube',
      url,
      id: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?rel=0`,
      thumbUrl: proxiedImageUrl(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`)
    }
  }

  if (VIDEO_EXTENSIONS.test(url)) {
    return { type: 'video', url }
  }

  return { type: 'image', url: proxiedImageUrl(url) }
}

export const isVideoMedia = (media) => media?.type === 'youtube' || media?.type === 'video'

export const mediaPreviewImage = (value = '') => {
  const media = mediaFromUrl(value)
  if (media.type === 'youtube') return media.thumbUrl
  if (media.type === 'image') return media.url
  return ''
}
