import { describe, expect, it, vi } from 'vitest'
vi.mock('@/firebase', () => ({db:{},auth:{currentUser:null}}))
import { kirbyIcons, normalizeProfileIcon, resolveProfileIcon, resolveProfileIconMeta } from './profileProgress'
import defaults from './profileIconDefaults.json'
import { earnedAchievements } from './achievementProgress'
describe('profile images across deployments', () => {
  const icon = kirbyIcons[0]
  it.each(['/src/iconos/iconosKirby/01.png', '/assets/01-oldhash.png', 'https://example.com/assets/01-oldhash.png'])('replaces stale bundled URL %s', url => {
    expect(normalizeProfileIcon(icon.id, { imageUrl: url }).src).toBe(icon.src)
    const profile = { selectedIcon: icon.id, selectedIconUrl: url }
    expect(resolveProfileIcon(profile)).toBe(icon.src)
    expect(resolveProfileIconMeta(profile).src).toBe(icon.src)
  })
  it('preserves uploaded replacements and custom icons', () => {
    const url = 'https://example.com/uploads/custom.png'
    expect(normalizeProfileIcon(icon.id, { imageUrl: url }).src).toBe(url)
    expect(resolveProfileIcon({ selectedIcon: icon.id, selectedIconUrl: url })).toBe(url)
    expect(normalizeProfileIcon('custom', { imageUrl: url }).src).toBe(url)
  })
})
it('keeps every built-in icon ID aligned with the server catalog',()=>{expect(kirbyIcons.map(i=>i.id)).toEqual(defaults.map(i=>i.id));expect(new Set(defaults.map(i=>i.id)).size).toBe(defaults.length)})
it('ignores old economic prices and preserves configured unlock requirements',()=>{expect(normalizeProfileIcon('custom',{cost:999,requiredStars:150,active:false,order:3})).toMatchObject({requiredStars:150,active:false,order:3});expect(normalizeProfileIcon('custom',{cost:0}).requiredStars).toBe(25)})
describe('achievement rules', () => {
  const items = [{ id: 'legacy', reads: 1 }, { id: 'custom', type: 'reads', target: 25, reads: 100 }, { id: 'social', type: 'followers', target: 2 }]
  it('uses configured targets and legacy thresholds consistently', () => {
    expect(earnedAchievements(items, { reads: 28, followers: 2 }).map(item => item.id)).toEqual(['legacy', 'custom', 'social'])
  })
})
