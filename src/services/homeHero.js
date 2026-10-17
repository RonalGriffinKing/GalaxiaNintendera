import { socialSource } from './socialPostPresentation'
import { normalizeSocialContent } from './socialContent'

const text = value => String(value ?? '').trim()
const positions = ['center top', 'center center', 'center bottom', 'left top', 'right top']
const position = value => positions.includes(value) ? value : 'center top'
const imageUrl = value => /^(https?:\/\/|\/(?!\/))/i.test(text(value)) ? text(value) : ''

export function normalizeHomeHero(value = {}) {
 const hero = value && typeof value === 'object' ? value : {}
 const seen = new Set()
 return {
  image: imageUrl(hero.image),
  logoUrl: imageUrl(hero.logoUrl),
  position: position(hero.position),
  images: (Array.isArray(hero.images) ? hero.images : []).map(item => typeof item === 'string' ? { url: item } : item || {}).map(item => ({ url: imageUrl(item.url), alt: text(item.alt), position: position(item.position) })).filter(item => {
   if (!item.url || seen.has(item.url)) return false
   seen.add(item.url); return true
  })
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
 const images = candidates.filter(item => {
  if (!realImage(item.url) || seen.has(item.url)) return false
  seen.add(item.url); return true
 })
 if (cover) images.unshift({ url: cover, alt: hero.images.find(item => item.url === cover)?.alt || post.title || '', position: hero.position })
 return { ...hero, images }
}
