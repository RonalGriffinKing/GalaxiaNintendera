import defaults from '../../../src/services/profileIconDefaults.json' with { type: 'json' }
import { canUseIcon, progressStars, retainUnlocked, starCount, READ_REWARD_DELAY_MS } from '../../../src/services/starProgress.js'
const id = value => { if (typeof value !== 'string' || !value || value.length > 200 || value.includes('/')) throw new Error('invalid-id'); return value }
export const publicPost = (post, now) => post && post.status === 'approved' && !['private', 'draft'].includes(post.visibility || 'public') && ['public', 'unlisted'].includes(post.visibility || 'public') && Number(post.releaseAt ?? post.scheduledAt ?? 0) <= now && post.placement !== 'hero' && !post.isMainEntry
export function mergeCatalog(snapshot) {
  const saved = new Map(snapshot.docs.map(d => [d.id, { id: d.id, ...d.data() }]))
  return [...defaults.map(icon => ({ ...icon, ...saved.get(icon.id) })), ...[...saved.values()].filter(icon => !defaults.some(local => local.id === icon.id))]
}
export function createProgressService(db, now = Date.now) {
  return async (uid, body) => {
    const userRef = db.doc(`users/${uid}`)
    if (body.action === 'update-icon') return db.runTransaction(async tx => {
      const actor = await tx.get(userRef)
      if (!actor.exists || actor.data().role !== 'admin' || actor.data().isBlocked) throw new Error('forbidden')
      const iconId = id(body.iconId)
      const catalogSnap = await tx.get(db.collection('profileIcons'))
      const catalog = mergeCatalog(catalogSnap)
      const oldIcon = catalog.find(icon => icon.id === iconId)
      if (!oldIcon) throw new Error('missing-icon')
      const requiredStars = starCount(body.requiredStars)
      const order = starCount(body.order)
      const name = String(body.name || '').trim()
      const imageUrl = String(body.src || '')
      if (!name || name.length > 120 || imageUrl.length > 3000 || (imageUrl && !imageUrl.startsWith('/') && !/^https:\/\//.test(imageUrl))) throw new Error('invalid-icon')
      // Freeze entitlements BEFORE changing requirements/availability. Atomic and fail closed.
      const reducingAccess = requiredStars > (oldIcon.requiredStars ?? 25) || body.active === false || body.visible === false
      const users = reducingAccess ? await tx.get(db.collection('users').limit(451)) : null
      if (users && users.docs.length > 450) throw new Error('catalog-change-requires-batched-maintenance')
      if (users) for (const user of users.docs) {
        if (canUseIcon(user.data(), oldIcon)) tx.update(user.ref, { unlockedIcons: [...new Set([...(user.data().unlockedIcons || ['kirby-01']), iconId])] })
      }
      const updates = { name, imageUrl, saga: String(body.saga || 'Especiales').slice(0, 80), requiredStars, order, visible: body.visible !== false, active: body.active !== false, special: Boolean(body.special), effectColor: /^#[\da-f]{6}$/i.test(body.effectColor) ? body.effectColor : '#a855f7', rarity: ['normal','rare','epic','legendary'].includes(body.rarity) ? body.rarity : 'normal', archived: false, updatedAt: now() }
      tx.set(db.doc(`profileIcons/${iconId}`), updates, { merge: true })
      return updates
    })
    return db.runTransaction(async tx => {
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists || userSnap.data().isBlocked) throw new Error('forbidden')
      const user = userSnap.data()
      const catalog = mergeCatalog(await tx.get(db.collection('profileIcons')))
      const stars = progressStars(user)
      const timestamp = now()
      const base = { participationStars: stars, progressVersion: 2, unlockedIcons: retainUnlocked(user, catalog) }
      if (body.action === 'sync') { tx.update(userRef, base); return base }
      if (body.action === 'equip') {
        const iconId = id(body.iconId)
        const icon = catalog.find(item => item.id === iconId)
        if (!icon || !canUseIcon(user, icon)) throw new Error('locked-icon')
        const selected = { ...base, selectedIcon: iconId, selectedIconUrl: icon.imageUrl || icon.src || '', selectedIconEffect: { special: Boolean(icon.special), effectColor: icon.effectColor || '#a855f7', saga: icon.saga || 'Especiales' }, updatedAt: timestamp }
        tx.update(userRef, selected)
        return selected
      }
      const postId = id(body.postId)
      const postSnap = await tx.get(db.doc(`posts/${postId}`))
      if (!postSnap.exists || !publicPost(postSnap.data(), timestamp)) throw new Error('unavailable-post')
      const readRef = db.doc(`users/${uid}/readPosts/${postId}`)
      const sessionRef = db.doc(`users/${uid}/readingSessions/${postId}`)
      const readSnap = await tx.get(readRef)
      const sessionSnap = await tx.get(sessionRef)
      if (readSnap.exists) return { awarded: false }
      if (body.action === 'begin-read') {
        if (!sessionSnap.exists) tx.set(sessionRef, { startedAt: timestamp })
        return { started: true }
      }
      if (body.action !== 'award-read') throw new Error('invalid-action')
      if (!sessionSnap.exists || timestamp - sessionSnap.data().startedAt < READ_REWARD_DELAY_MS) throw new Error('reading-too-soon')
      const nextStars = starCount(stars + 1)
      const next = { ...base, participationStars: nextStars, unlockedIcons: retainUnlocked({ ...user, participationStars: nextStars }, catalog), readPostsCount: starCount((user.readPostsCount ?? 0) + 1), updatedAt: timestamp }
      // Legacy balance remains untouched until a separately approved historical migration.
      tx.set(readRef, { postId, title: postSnap.data().title || '', category: postSnap.data().category || 'General', stars: 1, progressVersion: 2, participationStars: nextStars, readAt: timestamp })
      tx.update(userRef, next)
      tx.delete(sessionRef)
      return { ...next, awarded: true, awardedStars: 1 }
    })
  }
}
