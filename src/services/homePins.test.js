import { describe, expect, it } from 'vitest'
import { homePinnedPosts, homePinOverflow } from './homePins'
const post = (id, extra = {}) => ({ id: String(id), status: 'approved', createdAt: id, ...extra })
describe('home pins', () => {
  it('automatically selects the newest publication, ignoring edit time', () => {
    expect(homePinnedPosts([post(1, { updatedAt: 999 }), post(2)]).map(p => p.id)).toEqual(['2'])
  })
  it('respects removal of the automatic pin without substituting older news', () => {
    expect(homePinnedPosts([post(1), post(2, { homePinned: false })])).toEqual([])
  })
  it('keeps manual pins and bounds concurrent or prepublication pin requests to six', () => {
    const posts = Array.from({ length: 10 }, (_, i) => post(i + 1, { homePinned: true, homePinnedAt: i }))
    expect(homePinnedPosts(posts).map(p => p.id)).toEqual(['10','9','8','7','6','5'])
  })
  it('excludes generic heroes, drafts, private, scheduled and expired posts', () => {
    const hidden = [{ placement: 'hero' }, { isMainEntry: true }, { status: 'pending' }, { visibility: 'private' }, { visibility: 'unlisted' }, { releaseAt: 1001 }, { expiresAt: 999 }]
    expect(homePinnedPosts([post(1), ...hidden.map((extra, i) => post(i + 2, { homePinned: true, ...extra }))], 1000).map(p => p.id)).toEqual(['1'])
  })
  it('publishes scheduled pins only at release time and accepts Firestore timestamps', () => {
    expect(homePinnedPosts([post(1), post(2, { publishedAt: { toMillis: () => 20 }, releaseAt: 50, homePinned: true })], 49).map(p => p.id)).toEqual(['1'])
    expect(homePinnedPosts([post(1), post(2, { releaseAt: 50, homePinned: true })], 50)[0].id).toBe('2')
  })
  it('identifies the displaced pins so publication can remove them atomically', () => {
    const posts = Array.from({ length: 7 }, (_, i) => post(i + 1, { homePinned: true, homePinnedAt: i }))
    expect(homePinOverflow(posts).map(p => p.id)).toEqual(['1'])
    const displaced = new Set(homePinOverflow(posts).map(p => p.id))
    const saved = posts.map(p => ({ ...p, homePinned: p.id === '7' || displaced.has(p.id) ? false : p.homePinned }))
    expect(homePinnedPosts(saved).map(p => p.id)).toEqual(['6','5','4','3','2'])
  })
})
