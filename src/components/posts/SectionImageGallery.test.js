import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import SectionImageGallery from './SectionImageGallery.vue'

it('renders one image alone and additional games as selectable thumbnails', async () => {
  const one = await renderToString(createSSRApp(SectionImageGallery, { section: { title: 'Una imagen', image: '/one.jpg' } }))
  expect(one).toContain('/one.jpg')
  expect(one).not.toContain('section-gallery-rail')
  const many = await renderToString(createSSRApp(SectionImageGallery, { section: {
    title: 'Dos juegos', image: '/one.jpg', images: [{ url: '/two.jpg', alt: 'Segundo juego', gameName: 'Game B' }]
  } }))
  expect(many).toContain('section-gallery-rail')
  expect(many).toContain('/two.jpg')
  expect(many).toContain('Game B')
})
