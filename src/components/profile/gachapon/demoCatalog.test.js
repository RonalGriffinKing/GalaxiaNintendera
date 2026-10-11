import { describe, expect, it } from 'vitest'
import { DEMO_MODES, demoCandidates, rewardAppearance } from './demoCatalog'

const icon = (id, rarity, extra = {}) => ({ id, rarity, src: '/local.png', local: true, visible: true, ...extra })
describe('gachapon presentation boundaries', () => {
  it('keeps informative prices separate from the existing redemption price', () => {
    expect(DEMO_MODES.map(({ rarity, price }) => [rarity, price])).toEqual([['normal', 20], ['epic', 50]])
  })
  it('never mixes rarities, including special rare and legendary icons', () => {
    const icons = [icon('n', 'normal'), icon('e', 'epic'), icon('r', 'rare', { special: true }), icon('l', 'legendary', { special: true })]
    expect(demoCandidates(icons, [], 'normal').map(i => i.id)).toEqual(['n'])
    expect(demoCandidates(icons, [], 'epic').map(i => i.id)).toEqual(['e'])
    expect(demoCandidates(icons, [], 'legendary')).toEqual([])
  })
  it('excludes owned, hidden, archived, inactive, nonlocal and missing artwork without mutation', () => {
    const icons = [icon('owned', 'normal'), icon('hidden', 'normal', { visible: false }), icon('archived', 'normal', { archived: true }), icon('inactive', 'normal', { active: false }), icon('remote', 'normal', { local: false }), icon('empty', 'normal', { src: '' }), icon('ok', 'normal')]
    const before = JSON.stringify(icons), owned = Object.freeze(['owned'])
    expect(demoCandidates(icons, owned, 'normal').map(i => i.id)).toEqual(['ok'])
    expect(JSON.stringify(icons)).toBe(before)
  })
  it('deduplicates candidate IDs and preserves legacy special rarity fallback', () => {
    expect(demoCandidates([icon('e', undefined, { special: true }), icon('e', 'epic')], [], 'epic').map(i => i.id)).toEqual(['e'])
  })
})

it('reveal preserves custom borders and actual legendary rarity independently of demo modes', () => {
 expect(rewardAppearance({rarity:'legendary',special:true,effectColor:'#12abcd'})).toEqual({rarity:'legendary',label:'Legendario',color:'#12abcd',special:true})
 expect(rewardAppearance({rarity:'epic',effectColor:'invalid'}).color).toBe('#c026d3')
 expect(rewardAppearance({special:true}).rarity).toBe('epic')
 expect(rewardAppearance({rarity:'normal'}).special).toBe(false)
})
