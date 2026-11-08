import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldPath } from 'firebase-admin/firestore'

const response = (statusCode, data) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) })
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/') && !['.', '..'].includes(value)
const millis = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : Date.parse(value || '') || 0)
const visiblePost = (post, now) => post?.status === 'approved' && !['private', 'draft'].includes(post.visibility) && millis(post.releaseAt || post.scheduledAt) <= now && !post.isMainEntry && post.placement !== 'hero'
// Return only public comment fields; never expose the user's private document.
export function publicComment(id, data) {
  if (!data) return null
  return { id, authorId: String(data.authorId || id).slice(0, 200), author: String(data.author || 'Usuario').slice(0, 100), authorImage: String(data.authorImage || '').slice(0, 3000), selectedIcon: String(data.selectedIcon || '').slice(0, 200), body: String(data.body || '').slice(0, 2000), rating: Number.isInteger(data.rating) && data.rating >= 1 && data.rating <= 5 ? data.rating : null, createdAt: millis(data.createdAt), updatedAt: millis(data.updatedAt) }
}
export function createPostCommentsHandler({ verify, store, now = Date.now }) {
  return async event => {
    if (event.httpMethod !== 'POST') return response(405, { error: 'method-not-allowed' })
    if ((event.body || '').length > 14000) return response(413, { error: 'request-too-large' })
    let body
    try { body = JSON.parse(event.body || '{}') } catch { return response(400, { error: 'invalid-request' }) }
    if (!body || !validId(body.postId) || !['list', 'save', 'delete'].includes(body.action)) return response(400, { error: 'invalid-request' })
    const token = (event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer (\S+)$/)?.[1]
    let identity = null
    if (token) { try { identity = await verify(token) } catch { return response(401, { error: 'authentication-required' }) } }
    if (body.action !== 'list' && !identity) return response(401, { error: 'authentication-required' })
    if (body.action === 'save' && (!validId(body.commentId) || typeof body.text !== 'string' || !body.text.trim() || body.text.trim().length > 2000 || (body.rating != null && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)))) return response(400, { error: 'invalid-comment' })
    if (body.action === 'delete' && !validId(body.commentId)) return response(400, { error: 'invalid-request' })
    if (body.action === 'list' && (body.sort && !['recent', 'oldest'].includes(body.sort) || body.cursor && (!validId(body.cursor.id) || !Number.isSafeInteger(body.cursor.createdAt) || body.cursor.createdAt < 0))) return response(400, { error: 'invalid-request' })
    try {
      if (!visiblePost(await store.post(body.postId), now())) return response(404, { error: 'post-unavailable' })
      const profile = identity ? await store.profile(identity.uid) : null
      const canWrite = Boolean(identity && profile && !profile.isBlocked)
      const admin = canWrite && profile.role === 'admin'
      if (body.action === 'list') {
        const rows = await store.list(body.postId, body.sort || 'recent', body.cursor || null, 21)
        const page = rows.slice(0, 20).map(row => publicComment(row.id, row.data))
        const last = page.at(-1)
        return response(200, { items: page, nextCursor: rows.length > 20 && last ? { id: last.id, createdAt: last.createdAt } : null, canWrite, admin })
      }
      if (!canWrite) return response(403, { error: 'forbidden' })
      if (body.action === 'delete') {
        if (!admin && (await store.comment(body.postId, body.commentId))?.authorId !== identity.uid) return response(403, { error: 'forbidden' })
        await store.remove(body.postId, body.commentId)
        return response(200, { deleted: true })
      }
      const data = { authorId: identity.uid, author: String(profile.name || identity.name || 'Usuario').slice(0, 100), authorImage: String(profile.selectedIconUrl || profile.imageUrl || '').slice(0, 3000), selectedIcon: String(profile.selectedIcon || '').slice(0, 200), body: body.text.trim(), rating: body.rating ?? null, updatedAt: now() }
      // The stable request ID makes a retried submission idempotent.
      const saved = await store.save(body.postId, body.commentId, data)
      return response(200, { item: publicComment(body.commentId, saved) })
    } catch (error) { return response(error.message === 'forbidden' ? 403 : 503, { error: error.message === 'forbidden' ? 'forbidden' : 'comments-unavailable' }) }
  }
}
function app() {
  return getApps().find(item => item.name === 'post-comments') || initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)) : applicationDefault() }, 'post-comments')
}
export function firestoreCommentStore(db) {
  const ref = (postId, uid) => db.collection('posts').doc(postId).collection('comments').doc(uid)
  return {
    post: async id => (await db.collection('posts').doc(id).get()).data(),
    profile: async uid => (await db.collection('users').doc(uid).get()).data(),
    comment: async (id, uid) => (await ref(id, uid).get()).data(),
    list: async (id, sort, cursor, count) => {
      const direction = sort === 'oldest' ? 'asc' : 'desc'
      let query = db.collection('posts').doc(id).collection('comments').orderBy('createdAt', direction).orderBy(FieldPath.documentId(), direction)
      if (cursor) query = query.startAfter(cursor.createdAt, cursor.id)
      return (await query.limit(count).get()).docs.map(doc => ({ id: doc.id, data: doc.data() }))
    },
    save: (id, uid, data) => db.runTransaction(async tx => {
      const target = ref(id, uid), previous = await tx.get(target)
      if (previous.exists && previous.data().authorId !== data.authorId) throw new Error('forbidden')
      const saved = { ...data, createdAt: previous.exists ? previous.data().createdAt : data.updatedAt }
      tx.set(target, saved)
      return saved
    }),
    remove: (id, uid) => ref(id, uid).delete()
  }
}
export const handler = createPostCommentsHandler({ verify: token => getAuth(app()).verifyIdToken(token, true), store: Object.fromEntries(['post', 'profile', 'comment', 'list', 'save', 'remove'].map(method => [method, (...args) => firestoreCommentStore(getFirestore(app()))[method](...args)])) })
