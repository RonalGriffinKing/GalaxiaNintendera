import { describe, expect, it } from 'vitest'
import { imageSearchQuery, imageSearchQueries, normalizePostSections, sectionGameNames } from './postSectionGames'

it('keeps multiple section games and gallery images through normalization', () => {
  const post = { sections: [{ title: 'Dos juegos', image: '/a.jpg', games: [
    { nameEn: 'Game A' }, { nameEn: 'Game B' }
  ], images: [{ url: '/b.jpg', gameName: 'Game B' }] }] }
  const section = normalizePostSections(post.sections)[0]
  expect(imageSearchQueries({ sections: [section] }, 'section-0-extra-0')).toEqual(['Game A', 'Game B'])
  expect(section.images[0].url).toBe('/b.jpg')
  expect(normalizePostSections([section])[0]).toEqual(section)
})

it('preserves unique section IDs, repairs duplicates once and leaves legacy records untouched', () => {
  const source = [{ mediaSlotId: 'section_slot_001', title: 'A' }, { mediaSlotId: 'section_slot_001', title: 'B' }, { title: 'Legacy' }]
  const saved = normalizePostSections(source)
  expect(saved.map(item => item.mediaSlotId).every(Boolean)).toBe(false)
  expect(saved[0].mediaSlotId).toBe(source[0].mediaSlotId)
  expect(saved[1].mediaSlotId).toBeTruthy()
  expect(new Set(saved.slice(0, 2).map(item => item.mediaSlotId)).size).toBe(2)
  expect(normalizePostSections(saved)).toEqual(saved)
})

it('preserves optional highlight quotes through import and save', () => {
  const normalized = normalizePostSections([{ content: 'Texto', highlightQuote: '  Una idea clave.  ' }])
  expect(normalizePostSections(JSON.parse(JSON.stringify(normalized)), { dropEmpty: true })[0].highlightQuote).toBe('Una idea clave.')
  expect(normalizePostSections([{ highlightQuote: 'Solo una frase' }], { dropEmpty: true })[0].highlightQuote).toBe('Solo una frase')
  expect(normalizePostSections([{ highlightQuote: { text: 'invalid' } }])[0]).not.toHaveProperty('highlightQuote')
  expect(normalizePostSections([{ highlightQuote: 'x'.repeat(400) }])[0].highlightQuote).toHaveLength(280)
})

describe('optional section games', () => {
  const post = { title: 'Especial Halloween', game: { nameEn: 'Main game' }, sections: [
    { title: '1. Alien — 10,99 €', game: { nameEs: 'Alien en español', nameEn: 'Alien: Isolation' } },
    { title: '2. Outlast', game: { nameEs: 'Outlast' } },
    { title: 'Conclusión' }
  ] }
  it('searches each section independently and keeps the cover global', () => {
    expect(imageSearchQuery(post, 'section-0')).toBe('Alien: Isolation')
    expect(imageSearchQuery(post, 'section-1')).toBe('Outlast')
    expect(imageSearchQuery(post, 'section-2')).toBe('Main game')
    expect(imageSearchQuery(post, 'cover')).toBe('Main game')
    expect(post.game.nameEn).toBe('Main game')
  })
  it('keeps legacy single-game posts and manual search fallbacks working', () => {
    expect(imageSearchQuery({ game: { nameEs: 'Los Pitufos' }, sections: [{}] }, 'section-0')).toBe('Los Pitufos')
    expect(imageSearchQuery({ mediaGameName: 'Old search' }, 'section-20')).toBe('Old search')
    expect(imageSearchQuery({ title: 'Noticia' }, 'section-0')).toBe('Noticia')
    expect(imageSearchQuery()).toBe('')
  })
  it('ignores missing, empty and malformed optional metadata without throwing', () => {
    for (const game of [undefined, null, '', 'Alien', [], 12, {}, { nameEn: {}, nameEs: 5 }]) {
      expect(sectionGameNames(game)).toBeNull()
      expect(imageSearchQuery({ game: { nameEn: 'Fallback' }, sections: [{ game }] }, 'section-0')).toBe('Fallback')
    }
  })
  it('preserves names through import, save, reorder and reloading', () => {
    const sections = normalizePostSections(post.sections)
    const saved = JSON.parse(JSON.stringify(sections))
    saved.reverse()
    const loaded = normalizePostSections(saved, { dropEmpty: true })
    expect(loaded[2].game).toEqual(post.sections[0].game)
    expect(loaded[1].game).toEqual({ nameEs: 'Outlast', nameEn: '' })
    expect(loaded[0]).not.toHaveProperty('game')
    expect(loaded[2].title).toBe('1. Alien — 10,99 €')
  })
  it('does not add new fields to old sections and tolerates absent arrays', () => {
    const old = { title: 'Sección', label: 'Intro', navLabel: '', image: '', content: 'Texto', hidden: false }
    expect(normalizePostSections([old])).toEqual([old])
    for (const sections of [undefined, null, {}, []]) expect(normalizePostSections(sections)).toHaveLength(1)
  })
})
