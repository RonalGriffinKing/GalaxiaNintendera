import { describe, expect, it } from 'vitest'
import { addHomeHeroImage, duplicateHomeHeroImage, homeHeroGallery, moveHomeHeroImage, normalizeHomeHero, removeHomeHeroImage, replaceHomeHeroImage } from './homeHero'

describe('home hero JSON', () => {
 it('preserves logo, images, captions and framing through import and save', () => {
  const hero = { image: 'https://example.org/hero.jpg', logoUrl: 'https://example.org/logo.png', position: 'right top', images: [{ url: 'https://example.org/detail.jpg', alt: 'Un bosque', position: 'center center' }] }
  expect(normalizeHomeHero(normalizeHomeHero(hero))).toEqual(hero)
 })
 it('keeps the cover first and preserves duplicate gallery URLs as separate slots', () => {
  const result = homeHeroGallery({ title: 'Noticia', hero: { image: '/cover.jpg', images: ['/detail.jpg', '/cover.jpg', '/detail.jpg'] } })
  expect(result.images.map(item => item.url)).toEqual(['/cover.jpg', '/detail.jpg', '/cover.jpg', '/detail.jpg'])
 })
 it('supports existing posts without hero metadata', () => {
  expect(homeHeroGallery({ image: '/old-cover.jpg' }).images[0].url).toBe('/old-cover.jpg')
  expect(homeHeroGallery({}).images).toEqual([])
 })
 it('builds missing hero thumbnails from social and visible section images', () => {
  const result=homeHeroGallery({image:'/cover.jpg',social:{title:'Portada',slides:[{title:'Detalle',image:'/detail.jpg'}]},sections:[{title:'Otra imagen',image:'/other.jpg'},{image:'/private.jpg',hidden:true}]})
  expect(result.images.map(item=>item.url)).toEqual(['/cover.jpg','/detail.jpg','/other.jpg'])
 })
 it('rejects unsafe URLs and arbitrary CSS positions', () => {
  expect(normalizeHomeHero({ logoUrl: 'javascript:alert(1)', position: 'url(evil)', images: ['//evil.org/image', 'data:text/html,unsafe', '/safe.jpg'] })).toMatchObject({ logoUrl: '', position: 'center top', images: [{ url: '/safe.jpg', alt: '', position: 'center top' }] })
 })
 it('does not turn empty slide images or generic banners into extra photographs', () => {
  const result = homeHeroGallery({ image:'/news.jpg', social:{ title:'Noticia', slides:[{title:'Sin foto'},{image:'/src/iconos/Banner.png'},{image:'/assets/Banner-test123.png'}] }, sections:[{image:''},{image:'/src/iconos/Banner.png'}] })
  expect(result.images.map(item=>item.url)).toEqual(['/news.jpg'])
 })
 it('keeps real external banners and only uses explicitly configured hero images when present', () => {
  expect(homeHeroGallery({image:'/cover.jpg',hero:{images:['https://example.org/Banner.png']},sections:[{image:'/other.jpg'}]}).images.map(item=>item.url)).toEqual(['/cover.jpg','https://example.org/Banner.png'])
 })
 it('assigns local stable IDs when an explicit edit converts a historical gallery', () => {
  const result = addHomeHeroImage([{ url: '/old-a.jpg' }, { url: '/old-b.jpg' }])
  expect(result).toHaveLength(3)
  expect(result.every(item => item.mediaSlotId)).toBe(true)
  expect(new Set(result.map(item => item.mediaSlotId)).size).toBe(3)
  expect(result.slice(0, 2).map(item => item.url)).toEqual(['/old-a.jpg', '/old-b.jpg'])
 })
 it('preserves an image ID on replacement and gives a duplicate a distinct ID', () => {
  const original = [{ mediaSlotId: 'slot_original_01', url: '/old.jpg', alt: 'Old' }]
  const replaced = replaceHomeHeroImage(original, 0, { url: '/new.jpg' })
  expect(replaced[0]).toMatchObject({ mediaSlotId: 'slot_original_01', url: '/new.jpg', alt: 'Old' })
  const duplicated = duplicateHomeHeroImage(replaced, 0)
  expect(duplicated).toHaveLength(2)
  expect(duplicated[0].mediaSlotId).toBe('slot_original_01')
  expect(duplicated[1].mediaSlotId).not.toBe(duplicated[0].mediaSlotId)
 })
 it('preserves IDs when moving and removes only the selected gallery item', () => {
  const gallery = [{ mediaSlotId: 'slot_image_0001', url: '/a.jpg' }, { mediaSlotId: 'slot_image_0002', url: '/b.jpg' }]
  const moved = moveHomeHeroImage(gallery, 1, -1)
  expect(moved.map(item => item.mediaSlotId)).toEqual(['slot_image_0002', 'slot_image_0001'])
  expect(removeHomeHeroImage(moved, 0)).toEqual([gallery[0]])
 })
 it('round-trips IDs and duplicate URLs without duplicate IDs', () => {
  const duplicated = duplicateHomeHeroImage([{ mediaSlotId: 'slot_image_001', url: '/same.jpg' }], 0)
  const saved = normalizeHomeHero({ images: duplicated })
  const reopened = normalizeHomeHero(saved)
  expect(reopened.images).toEqual(saved.images)
  expect(reopened.images).toHaveLength(2)
  expect(new Set(reopened.images.map(item => item.mediaSlotId)).size).toBe(2)
 })
 it('repairs duplicate persisted IDs without dropping either valid image', () => {
  const result = normalizeHomeHero({ images: [
   { mediaSlotId: 'slot_duplicate_001', url: '/a.jpg' },
   { mediaSlotId: 'slot_duplicate_001', url: '/b.jpg' }
  ] })
  expect(result.images).toHaveLength(2)
  expect(new Set(result.images.map(item => item.mediaSlotId)).size).toBe(2)
 })
})
