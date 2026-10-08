import { describe, it, expect } from 'vitest'
import { mergeSocialSettings, updateSocialSetting } from './socialTemplateState'

describe('social design scope', () => {
  const original = { title: { size: 82, color: '#fff' }, visual_title: { x: 0, y: 0 } }
  it('changes one image while retaining inheritance of unrelated settings', () => {
    const single = updateSocialSetting(original, {}, 1, 'single', 'title.size', 60)
    const all = updateSocialSetting(single.global, single.overrides, 0, 'all', 'title.color', '#000')
    expect(mergeSocialSettings(all.global, all.overrides[1]).title).toEqual({ size: 60, color: '#000' })
    expect(all.global.title.size).toBe(82)
    expect(original.title.color).toBe('#fff')
  })
  it('preserves a deliberate per-image exception after a general change', () => {
    const single = updateSocialSetting(original, {}, 1, 'single', 'title.size', 60)
    const all = updateSocialSetting(single.global, single.overrides, 0, 'all', 'title.size', 90)
    expect(mergeSocialSettings(all.global, all.overrides[1]).title.size).toBe(60)
    expect(mergeSocialSettings(all.global, all.overrides[2]).title.size).toBe(90)
  })
  it('keeps drag coordinates independent between slides', () => {
    const single = updateSocialSetting(original, {}, 1, 'single', 'visual_title.x', 15)
    expect(mergeSocialSettings(single.global, single.overrides[1]).visual_title).toEqual({ x: 15, y: 0 })
    expect(single.global.visual_title.x).toBe(0)
  })
  it('keeps nested template values when applying a partial layout', () => {
    expect(mergeSocialSettings(original, { title: { family: 'Georgia' } }).title).toEqual({ size: 82, color: '#fff', family: 'Georgia' })
  })
})
