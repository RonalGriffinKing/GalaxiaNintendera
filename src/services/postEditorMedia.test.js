import { describe, expect, it } from 'vitest'
import { pastePostMediaFromClipboard, replacePostSectionImage } from './postEditorMedia'
import { normalizePostSections } from './postSectionGames'
import { normalizeSocialContent } from './socialContent'
import { homeHeroGallery, normalizeHomeHero } from './homeHero'

describe('PostEditor media actions', () => {
  it('applies a JSON import without borrowing IDs or images by array position', async () => {
    const post = {
      image: '/old-cover.jpg',
      sections: [{ mediaSlotId: 'old_section_0001', image: '/old-section.jpg', title: 'Old' }],
      social: { image: '/old-social.jpg', slides: [{ mediaSlotId: 'old_slide_0001', image: '/old-slide.jpg' }] }
    }
    const imported = {
      image: '', sections: [
        { mediaSlotId: 'new_section_0001', image: '/new-a.jpg', title: 'A' },
        { image: '', title: 'B' }
      ],
      social: { image: '', slides: [
        { mediaSlotId: 'new_slide_0001', image: '/slide-a.jpg', title: 'A' },
        { image: '', title: 'B' }
      ] }
    }

    const text = JSON.stringify(imported)
    const parsed = await pastePostMediaFromClipboard({
      readText: async () => text,
      parseJson: value => JSON.parse(value),
      post
    })

    expect(parsed).toEqual(imported)
    expect(post.image).toBe('/old-cover.jpg')
    expect(post.sections[0]).toMatchObject({ mediaSlotId: 'new_section_0001', image: '/new-a.jpg' })
    expect(post.sections[1].mediaSlotId).toBeTruthy()
    expect(post.sections[1].image).toBe('')
    expect(post.sections[1].mediaSlotId).not.toBe('old_section_0001')
    expect(post.social.image).toBe('/old-social.jpg')
    expect(post.social.slides[0]).toMatchObject({ mediaSlotId: 'new_slide_0001', image: '/slide-a.jpg' })
    expect(post.social.slides[1].mediaSlotId).toBeTruthy()
    expect(post.social.slides[1].image).toBe('')
    expect(post.social.slides[1].mediaSlotId).not.toBe('old_slide_0001')
  })

  it('repairs duplicate imported IDs, keeps them unique through save and reopen normalization', async () => {
    const sectionId = 'import_section_01'
    const slideId = 'import_slide_0001'
    const post = {}
    const text = JSON.stringify({
      sections: [{ mediaSlotId: sectionId, title: 'A' }, { mediaSlotId: sectionId, title: 'B' }],
      social: { slides: [{ mediaSlotId: slideId, title: 'A' }, { mediaSlotId: slideId, title: 'B' }] }
    })
    await pastePostMediaFromClipboard({ readText: async () => text, parseJson: JSON.parse, post })
    const savedSections = normalizePostSections(JSON.parse(JSON.stringify(post.sections)))
    const savedSlides = normalizeSocialContent(JSON.parse(JSON.stringify(post.social))).slides
    expect(savedSections.map(item => item.mediaSlotId)).toEqual([sectionId, post.sections[1].mediaSlotId])
    expect(savedSlides.map(item => item.mediaSlotId)).toEqual([slideId, post.social.slides[1].mediaSlotId])
    expect(normalizePostSections(savedSections)).toEqual(savedSections)
    expect(normalizeSocialContent({ slides: savedSlides }).slides).toEqual(savedSlides)
  })

  it('assigns an ID only to the historical section whose image the editor replaces', () => {
    const sections = [
      { title: 'Historical image', image: '/old.jpg' },
      { title: 'Other historical section', image: '/other.jpg' }
    ]
    expect(replacePostSectionImage(sections, 0, '/replacement.jpg')).toBe(true)
    expect(sections[0]).toMatchObject({ image: '/replacement.jpg' })
    expect(sections[0].mediaSlotId).toBeTruthy()
    expect(sections[1]).not.toHaveProperty('mediaSlotId')
    const stableId = sections[0].mediaSlotId
    replacePostSectionImage(sections, 0, '/second-replacement.jpg')
    expect(sections[0].mediaSlotId).toBe(stableId)
    expect(replacePostSectionImage(sections, 4, '/unused.jpg')).toBe(false)
  })

  it('keeps repeated gallery URLs as separate slots in the public gallery consumer', () => {
    const post = {
      image: '/cover.jpg',
      hero: normalizeHomeHero({ images: [
        { mediaSlotId: 'gallery_slot_001', url: '/same.jpg' },
        { mediaSlotId: 'gallery_slot_002', url: '/same.jpg' }
      ] })
    }
    expect(homeHeroGallery(post).images.filter(item => item.url === '/same.jpg')).toHaveLength(2)
  })
})
