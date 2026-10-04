import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ documents: {}, writes: [] }))
vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...path) => path.join('/'),
  collection: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
  runTransaction: async (_db, action) => action({
    get: async (path) => ({ exists: () => path in store.documents, data: () => store.documents[path] }),
    update: (path, value) => { store.writes.push({ path, value }); Object.assign(store.documents[path], value) }
  })
}))
import { redeemIcon, unlockedAchievements, normalizeProfileIcon } from './profileProgress'
import { earnedAchievements } from './achievementProgress'

beforeEach(() => {
  store.documents = {
    'users/u': { stars: 70, unlockedIcons: ['kirby-01'], selectedIcon: 'kirby-01' },
    'profileIcons/reward': { cost: 25, visible: true }
  }
  store.writes = []
})

it('preserves configured rarity and provides compatible defaults for existing icons', () => {
  expect(normalizeProfileIcon('a', { rarity: 'legendary' }).rarity).toBe('legendary')
  expect(normalizeProfileIcon('a', { special: true }).rarity).toBe('epic')
  expect(normalizeProfileIcon('a', { rarity: 'unknown' }).rarity).toBe('normal')
})

describe('icon redemption', () => {
  it('uses persisted balance and price, preserves the equipped icon', async () => {
    const result = await redeemIcon({ userId: 'u', iconId: 'reward', stars: 9999, cost: 0 })
    expect(result.stars).toBe(45)
    expect(result.unlockedIcons).toEqual(['kirby-01', 'reward'])
    expect(store.documents['users/u'].selectedIcon).toBe('kirby-01')
  })
  it('does not charge again when a purchase is repeated', async () => {
    await redeemIcon({ userId: 'u', iconId: 'reward' })
    const result = await redeemIcon({ userId: 'u', iconId: 'reward' })
    expect(result.stars).toBe(45)
    expect(store.writes).toHaveLength(1)
  })
  it('rejects a stale client balance without writing', async () => {
    store.documents['users/u'].stars = 10
    await expect(redeemIcon({ userId: 'u', iconId: 'reward', stars: 70 })).rejects.toThrow('not-enough-stars')
    expect(store.writes).toHaveLength(0)
  })
  it.each([{ visible: false }, { archived: true }, { cost: -1 }])('rejects unavailable or invalid rewards: %j', async (changes) => {
    Object.assign(store.documents['profileIcons/reward'], changes)
    await expect(redeemIcon({ userId: 'u', iconId: 'reward' })).rejects.toThrow()
    expect(store.writes).toHaveLength(0)
  })
  it('rejects unknown icons', async () => {
    await expect(redeemIcon({ userId: 'u', iconId: 'unknown' })).rejects.toThrow('unavailable-icon')
  })
  it('rejects a price change after confirmation', async () => {
    await expect(redeemIcon({ userId: 'u', iconId: 'reward', expectedCost: 10 })).rejects.toThrow('price-changed')
    expect(store.writes).toHaveLength(0)
  })
})

describe('achievement rules', () => {
  const items = [{ id: 'legacy', reads: 1 }, { id: 'custom', type: 'reads', target: 25, reads: 100 }, { id: 'social', type: 'followers', target: 2 }]
  it('uses configured targets and legacy thresholds consistently', () => {
    expect(unlockedAchievements(28, items).map(item => item.id)).toEqual(['legacy', 'custom'])
    expect(earnedAchievements(items, { reads: 28, followers: 2 }).map(item => item.id)).toEqual(['legacy', 'custom', 'social'])
  })
})
