import { describe, expect, it } from 'vitest'
import { socialHeadline, socialSummarySlides } from './socialSummary'
import example from '../../examples/post-completo-social-v2.example.json'

describe('public social summary', () => {
 it('uses the social cover and all slides without duplicating the cover', () => {
  const slides = socialSummarySlides(example)
  expect(slides).toHaveLength(example.social.slides.length + 1)
  expect(slides[0].title).toBe(example.social.title)
  expect(slides[0].titleHighlights).toEqual(example.social.titleHighlights)
  expect(slides.at(-1)).toMatchObject({ type: 'closing', cta: example.social.slides.at(-1).cta })
  expect(socialHeadline(example)).toEqual({ title: example.social.title, highlights: example.social.titleHighlights })
 })
 it('does not invent a summary for old posts', () => {
  expect(socialSummarySlides({ title: 'Noticia', sections: [{ title: 'Detalle' }] })).toEqual([])
  expect(socialHeadline({ title: 'Noticia' })).toEqual({ title: 'Noticia', highlights: [] })
 })
 it('inherits images from referenced public sections, then the cover', () => {
  const post = { image: '/cover.png', sections: [{ image: '/hidden.png', hidden: true }, { image: '/detail.png' }], social: { title: 'Portada', slides: [{ title: 'Detalle', sectionIndexes: [0, 1], points: ['Uno', 'Dos'] }, { title: 'Otro', sectionIndexes: [0, 90] }] } }
  expect(socialSummarySlides(post)[1]).toMatchObject({ image: '/detail.png', points: ['Uno', 'Dos'] })
  expect(socialSummarySlides(post)[2].image).toBe('/cover.png')
 })
})
