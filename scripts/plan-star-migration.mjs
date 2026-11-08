// Offline only. Input: { users: [{ id, data, reads: [{ id, ...storedRead }] }] }.
// Never connects to Firebase and never applies a plan.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
export function planMigration(snapshot) {
  if (!Array.isArray(snapshot.users)) throw new Error('Expected complete users export')
  const seen = new Set()
  return snapshot.users.map(({ id, data, reads }) => {
    if (!id || seen.has(id) || !data) throw new Error('Invalid or duplicate user')
    seen.add(id)
    const issues = []
    const valid = n => Number.isSafeInteger(n) && n >= 0
    if (!Array.isArray(reads)) issues.push('missing-read-history')
    reads = reads || []
    if (new Set(reads.map(read => read.id)).size !== reads.length) issues.push('duplicate-read-records')
    if (!valid(data.readPostsCount) || reads.length !== data.readPostsCount) issues.push('incomplete-read-history')
    if (reads.some(read => !read.id || !valid(read.stars))) issues.push('invalid-reward-record')
    const oldReads = reads.filter(read => read.progressVersion !== 2)
    const earned = oldReads.reduce((total, read) => total + (valid(read.stars) ? read.stars : 0), 0)
    const future = data.participationStars ?? 0
    const legacy = data.stars ?? 0
    if (!valid(future) || !valid(legacy) || !valid(earned + future)) issues.push('invalid-star-total')
    if (earned < legacy) issues.push('legacy-balance-exceeds-recorded-earnings')
    if (reads.filter(read => read.progressVersion === 2).reduce((sum, read) => sum + read.stars, 0) > future) issues.push('inconsistent-new-progress')
    if (data.progressMigrationVersion === 2) issues.push('already-migrated')
    return { id, status: issues.length ? 'manual-review' : 'candidate-needs-approval', issues,
      legacyBalance: legacy, recordedHistoricalEarnings: earned,
      proposedParticipationStars: issues.length ? null : earned + future,
      preserveUnlockedIcons: data.unlockedIcons || [],
      precondition: { participationStars: data.participationStars ?? null, stars: data.stars ?? null, readPostsCount: data.readPostsCount, progressMigrationVersion: data.progressMigrationVersion ?? null },
      alternatives: issues.length ? ['Recover a complete trusted backup/history.', 'Keep confirmed future points and legacy balance separate until an explicit policy is approved.'] : [] }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , input, output] = process.argv
  if (!input || !output || input === output) throw new Error('Usage: node scripts/plan-star-migration.mjs export.json new-plan.json')
  const original = await readFile(input)
  const snapshot = JSON.parse(original)
  const plan = planMigration(snapshot)
  // Exclusive creation prevents overwriting a previous recovery snapshot or plan.
  await writeFile(`${output}.backup.json`, original, { flag: 'wx' })
  await writeFile(output, JSON.stringify({ sourceSha256: createHash('sha256').update(original).digest('hex'), generatedAt: new Date().toISOString(), applied: false, users: plan }, null, 2), { flag: 'wx' })
}
