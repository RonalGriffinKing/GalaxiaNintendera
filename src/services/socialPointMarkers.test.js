import { expect, it } from 'vitest'
import { socialPointMarker } from './socialPointMarkers'
import { mergeSocialSettings, updateSocialSetting } from './socialTemplateState'

it('preserves existing list markers and supports explicit alternatives on any slide', () => {
  expect(socialPointMarker(undefined, 2, 'content')).toBe(3)
  expect(socialPointMarker(undefined, 2, 'closing')).toBe('✦')
  expect(socialPointMarker('invalid', 0, 'content')).toBe(1)
  for (const type of ['content', 'closing']) {
    for (const [style, marker] of [['numbers', 2], ['lines', '—'], ['dots', '•'], ['stars', '✦']]) {
      expect(socialPointMarker(style, 1, type)).toBe(marker)
    }
  }
})

it('saves markers in templates and preserves per-slide choices when editing the carousel', () => {
  const single = updateSocialSetting({ points: { size: 36 } }, {}, 1, 'single', 'points.marker', 'dots')
  const all = updateSocialSetting(single.global, single.overrides, 0, 'all', 'points.marker', 'lines')
  const saved = JSON.parse(JSON.stringify(all))
  expect(mergeSocialSettings(saved.global, saved.overrides[1]).points).toEqual({ size: 36, marker: 'dots' })
  expect(mergeSocialSettings(saved.global, saved.overrides[0]).points.marker).toBe('lines')
})
