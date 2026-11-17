import { socialSource } from './socialPostPresentation'
import { normalizeSocialContent } from './socialContent'

const text = value => String(value ?? '').trim()
const positions = ['center top', 'center center', 'center bottom', 'left top', 'right top']
const position = value => positions.includes(value) ? value : 'center top'
const imageUrl = value => /^(https?:\/\/|\/(?!\/))/i.test(text(value)) ? text(value) : ''
const mediaSlotId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : undefined
export const createMediaSlotId = () => globalThis.crypto?.randomUUID?.().replace(/-/g, '') || `slot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`

export function ensureHomeHeroImageIds(images) {
 const seen = new Set()
 return (Array.isArray(images) ? images : []).map(item => {
  let id = mediaSlotId(item?.mediaSlotId)
  if (!id || seen.has(id)) id = createMediaSlotId()
  seen.add(id)
  return { ...item, mediaSlotId: id }
 })
}

export function addHomeHeroImage(images) {
 return [...ensureHomeHeroImageIds(images), { mediaSlotId: createMediaSlotId(), url: '', alt: '', position: 'center top' }]
}

export function replaceHomeHeroImage(images, indexToReplace, patch) {
 return ensureHomeHeroImageIds(images).map((item, index) => index === indexToReplace ? { ...item, ...patch, mediaSlotId: item.mediaSlotId } : item)
}

export function removeHomeHeroImage(images, indexToRemove) {
 return ensureHomeHeroImageIds(images).filter((_, index) => index !== indexToRemove)
}

export function duplicateHomeHeroImage(images, index) {
 const stable = ensureHomeHeroImageIds(images)
 if (index < 0 || index >= stable.length) return stable
 const copy = { ...stable[index], mediaSlotId: createMediaSlotId() }
 return [...stable.slice(0, index + 1), copy, ...stable.slice(index + 1)]
}

export function moveHomeHeroImage(images, index, offset) {
 const stable = ensureHomeHeroImageIds(images)
 const target = index + offset
 if (index < 0 || target < 0 || target >= stable.length) return stable
 const [item] = stable.splice(index, 1)
 stable.splice(target, 0, item)
 return stable
}

export function normalizeHomeHero(value = {}) {
 const hero = value && typeof value === 'object' ? value : {}
 const seenIds = new Set()
 return {
  image: imageUrl(hero.image),
  logoUrl: imageUrl(hero.logoUrl),
  position: position(hero.position),
  images: (Array.isArray(hero.images) ? hero.images : []).map(item => typeof item === 'string' ? { url: item } : item || {}).map(item => {
   let id = mediaSlotId(item.mediaSlotId)
   if (id && seenIds.has(id)) id = createMediaSlotId()
   if (id) seenIds.add(id)
   return { ...(id ? { mediaSlotId: id } : {}), url: imageUrl(item.url), alt: text(item.alt), position: position(item.position) }
  }).filter(item => item.url)
 }
}

export function homeHeroGallery(post = {}) {
 const hero = normalizeHomeHero(post.hero)
 const social = normalizeSocialContent(socialSource(post))
 const realImage = value => imageUrl(value) && !/(?:\/src\/iconos\/Banner\.png|\/assets\/Banner-[^/?]+\.png)(?:[?#]|$)/i.test(value)
 const cover = [hero.image, post.image].find(realImage) || ''
 const candidates = hero.images.length ? hero.images : [
  { url: social.image, alt: social.title, position: hero.position },
  ...social.slides.map(slide => ({ url: slide.image, alt: slide.eyebrow || slide.title, position: hero.position })),
  ...(Array.isArray(post.sections) ? post.sections : []).filter(section => section && !section.hidden).map(section => ({ url: section.image, alt: section.title || section.label || '', position: hero.position }))
 ]
 const seen = new Set([cover])
 const images = candidates.filter(item => realImage(item.url))
 if (cover) images.unshift({ url: cover, alt: hero.images.find(item => item.url === cover)?.alt || post.title || '', position: hero.position })
 return { ...hero, images }
}
