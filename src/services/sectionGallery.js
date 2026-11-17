const text = value => typeof value === 'string' ? value.trim() : ''
const validId = value => /^[A-Za-z0-9_-]{8,80}$/.test(text(value))
const newId = () => globalThis.crypto?.randomUUID?.().replace(/-/g, '') || `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`

export function sectionGalleryItems(section = {}) {
  const primary = text(section.image)
  const extras = Array.isArray(section.images) ? section.images : []
  const found = new Set()
  return [
    ...(primary ? [{ url: primary, alt: text(section.title), gameName: '' }] : []),
    ...extras.filter(item => item && typeof item === 'object').map(item => ({
      url: text(item.url), alt: text(item.alt), gameName: text(item.gameName), mediaSlotId: item.mediaSlotId
    }))
  ].filter(item => item.url && !found.has(item.url) && found.add(item.url)).slice(0, 3)
}

export function normalizeSectionGallery(section = {}) {
  const primary = text(section.image || section.imagen)
  const incoming = Array.isArray(section.images) ? section.images : []
  const seenUrls = new Set(primary ? [primary] : [])
  const seenIds = new Set()
  const extras = incoming.filter(item => item && typeof item === 'object').map(item => {
    const url = text(item.url)
    if (!url || seenUrls.has(url)) return null
    seenUrls.add(url)
    let mediaSlotId = validId(item.mediaSlotId) ? item.mediaSlotId : newId()
    if (seenIds.has(mediaSlotId)) mediaSlotId = newId()
    seenIds.add(mediaSlotId)
    return { mediaSlotId, url, alt: text(item.alt).slice(0, 180), gameName: text(item.gameName).slice(0, 120) }
  }).filter(Boolean).slice(0, primary ? 2 : 3)
  if (!primary && extras.length) {
    const [first, ...rest] = extras
    return { image: first.url, images: rest }
  }
  return { image: primary, ...(extras.length ? { images: extras } : {}) }
}
