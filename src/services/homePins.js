export const MAX_HOME_PINS = 6
const time = value => {
  const raw = value?.toMillis?.() ?? value
  if (raw == null || raw === '') return 0
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : Date.parse(raw) || 0
}
export const publicationTime = post => Math.max(time(post.publishedAt || post.createdAt), time(post.releaseAt || post.scheduledAt))

// Selection is bounded even when two editors pin concurrently. Explicit false
// also suppresses the automatic pin of the newest publication.
function eligiblePosts(posts, now) {
  return posts.filter(post => post.status === 'approved'
    && !['private', 'unlisted'].includes(post.visibility)
    && post.placement !== 'hero' && !post.isMainEntry
    && time(post.releaseAt || post.scheduledAt) <= now
    && (!time(post.expiresAt) || time(post.expiresAt) > now))
    .sort((a, b) => publicationTime(b) - publicationTime(a) || String(a.id).localeCompare(String(b.id)))
}
export function homePinnedPosts(posts = [], now = Date.now()) {
  const eligible = eligiblePosts(posts, now)
  const latest = eligible[0]
  const manual = eligible.filter(post => post.homePinned === true && post.id !== latest?.id)
    .sort((a, b) => time(b.homePinnedAt) - time(a.homePinnedAt) || publicationTime(b) - publicationTime(a) || String(a.id).localeCompare(String(b.id)))
  return [...(latest && latest.homePinned !== false ? [latest] : []), ...manual].slice(0, MAX_HOME_PINS)
}

export function homePinOverflow(posts, now = Date.now()) {
  const selected = new Set(homePinnedPosts(posts, now).map(post => post.id))
  return eligiblePosts(posts, now).filter(post => post.homePinned === true && !selected.has(post.id))
}
