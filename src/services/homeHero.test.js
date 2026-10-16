import { describe, expect, it } from 'vitest'
import { homeHeroGallery, normalizeHomeHero } from './homeHero'

describe('home hero JSON', () => {
 it('preserves logo, images, captions and framing through import and save', () => {
  const hero = { image: 'https://example.org/hero.jpg', logoUrl: 'https://example.org/logo.png', position: 'right top', images: [{ url: 'https://example.org/detail.jpg', alt: 'Un bosque', position: 'center center' }] }
  expect(normalizeHomeHero(normalizeHomeHero(hero))).toEqual(hero)
 })
 it('keeps the cover first and removes duplicate gallery URLs', () => {
  const result = homeHeroGallery({ title: 'Noticia', hero: { image: '/cover.jpg', images: ['/detail.jpg', '/cover.jpg', '/detail.jpg'] } })
  expect(result.images.map(item => item.url)).toEqual(['/cover.jpg', '/detail.jpg'])
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
})
