import { expect, it } from 'vitest'
import { normalizeSectionGallery, sectionGalleryItems } from './sectionGallery'

it('keeps a legacy single image and normalizes two additional images with stable IDs', () => {
  expect(normalizeSectionGallery({ image: '/main.jpg' })).toEqual({ image: '/main.jpg' })
  const section = normalizeSectionGallery({ image: '/main.jpg', images: [
    { url: '/second.jpg', gameName: 'Game B' },
    { url: '/second.jpg' },
    { url: '/third.jpg', gameName: 'Game C' },
    { url: '/fourth.jpg' }
  ] })
  expect(sectionGalleryItems(section).map(item => item.url)).toEqual(['/main.jpg', '/second.jpg', '/third.jpg'])
  expect(section.images.map(item => item.mediaSlotId).every(Boolean)).toBe(true)
  expect(normalizeSectionGallery(section)).toEqual(section)
})
