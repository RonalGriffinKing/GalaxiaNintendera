import { describe, it, expect } from 'vitest'
import { createPostCommentsHandler, publicComment, firestoreCommentStore } from '../../netlify/functions/post-comments.js'
function setup() {
 const comments = new Map(), users = { reader: { name: 'Reader', role: 'user', email: 'private@example.test' }, admin: { name: 'Admin', role: 'admin' }, publisher: { name: 'Publisher', role: 'publisher' }, blocked: { name: 'Blocked', role: 'admin', isBlocked: true } }
 let post = { status: 'approved' }
 const store = {
  post: async () => post, profile: async uid => users[uid], comment: async (_, uid) => comments.get(uid),
  list: async (_, sort, cursor, limit) => [...comments].map(([id, data]) => ({ id, data })).sort((a,b) => (sort === 'oldest' ? 1 : -1) * (a.data.createdAt - b.data.createdAt || a.id.localeCompare(b.id))).filter(row => !cursor || (sort === 'oldest' ? row.data.createdAt > cursor.createdAt || row.data.createdAt === cursor.createdAt && row.id > cursor.id : row.data.createdAt < cursor.createdAt || row.data.createdAt === cursor.createdAt && row.id < cursor.id)).slice(0, limit),
  save: async (_, uid, data) => { if(comments.has(uid)&&comments.get(uid).authorId!==data.authorId)throw Error('forbidden'); const saved = { ...data, createdAt: comments.get(uid)?.createdAt ?? data.updatedAt }; comments.set(uid, saved); return saved },
  remove: async (_, uid) => comments.delete(uid)
 }
 const handler = createPostCommentsHandler({ store, now: () => 1000, verify: async token => { if (!(token in users)) throw Error('bad token'); return { uid: token, name: 'Token name' } } })
 const call = async (body, token = 'reader') => { const result = await handler({ httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify({ postId: 'post', commentId: 'reader-comment', ...body }) }); return { status: result.statusCode, data: JSON.parse(result.body) } }
 return { call, comments, users, setPost: value => { post = value }, handler, store }
}
describe('post comments and ratings', () => {
 it('lets visitors read public comments without private profile fields', async () => { const { call, comments } = setup(); comments.set('reader', { author: 'Reader', body: 'Hello', rating: 4, createdAt: 1, email: 'secret@example.test', token: 'secret' }); const { status, data } = await call({ action: 'list' }, null); expect(status).toBe(200); expect(data.items[0]).toMatchObject({ body: 'Hello', rating: 4 }); expect(JSON.stringify(data)).not.toMatch(/secret|email|token/); expect(data).toMatchObject({ canWrite: false, admin: false }) })
 it('uses the verified author and one stable comment per submission, even on retries', async () => { const { call, comments } = setup(); await call({ action: 'save', text: '  First  ', rating: 5, authorId: 'admin', author: 'Fake', createdAt: 9000 }); await call({ action: 'save', text: 'Updated', rating: 3 }); expect(comments.size).toBe(1); expect(comments.get('reader-comment')).toMatchObject({ author: 'Reader', body: 'Updated', rating: 3, createdAt: 1000 }); expect((await call({ action: 'list' })).data.items[0].body).toBe('Updated'); await call({action:'save',commentId:'second-comment',text:'Another comment'}); expect(comments.size).toBe(2) })
 it('does not let another user overwrite an existing comment',async()=>{const {call}=setup();await call({action:'save',text:'Original'});expect((await call({action:'save',text:'Forged'},'publisher')).status).toBe(403);expect((await call({action:'list'})).data.items[0].body).toBe('Original')})
 it('accepts a comment without a rating and can remove a previous rating', async () => { const { call } = setup(); expect((await call({ action: 'save', text: 'Hello' })).data.item.rating).toBeNull(); await call({ action: 'save', text: 'Hello', rating: 5 }); expect((await call({ action: 'save', text: 'Hello', rating: null })).data.item.rating).toBeNull() })
 it.each([0, 6, 1.5, '5', true])('rejects invalid rating %s', async rating => { expect((await setup().call({ action: 'save', text: 'Hello', rating })).status).toBe(400) })
 it.each(['', '  ', 'x'.repeat(2001), null])('rejects empty or oversized text', async text => { expect((await setup().call({ action: 'save', text })).status).toBe(400) })
 it('requires authentication and rejects revoked or invalid tokens', async () => { const { call } = setup(); expect((await call({ action: 'save', text: 'Hi' }, null)).status).toBe(401); expect((await call({ action: 'list' }, 'invalid')).status).toBe(401) })
 it('rejects blocked accounts and missing profiles', async () => { const { call, users } = setup(); expect((await call({ action: 'save', text: 'Hi' }, 'blocked')).status).toBe(403); users.reader = undefined; expect((await call({ action: 'save', text: 'Hi' })).status).toBe(403) })
 it('allows owners and administrators to remove comments, but not other users or publishers', async () => { const { call, comments } = setup(); await call({ action: 'save', text: 'Hi', rating: 3 }); expect((await call({ action: 'delete', commentId: 'reader-comment', admin: true }, 'publisher')).status).toBe(403); expect((await call({ action: 'delete', commentId: 'admin' })).status).toBe(403); expect((await call({ action: 'delete', commentId: 'reader-comment' }, 'admin')).status).toBe(200); expect(comments.size).toBe(0); await call({ action: 'save', text: 'Again' }); expect((await call({ action: 'delete', commentId: 'reader-comment' })).status).toBe(200) })
 it.each([null, { status: 'pending' }, { status: 'approved', visibility: 'private' }, { status: 'approved', releaseAt: 1001 }, { status: 'approved', placement: 'hero' }])('does not expose discussions for unavailable posts', async post => { const { call, setPost } = setup(); setPost(post); expect((await call({ action: 'list' }, null)).status).toBe(404); expect((await call({ action: 'save', text: 'Hi' })).status).toBe(404) })
 it('paginates public data without losing equal-timestamp comments', async () => { const { call, comments } = setup(); for (let i=0;i<25;i++) comments.set(`user-${String(i).padStart(2,'0')}`, { body: 'Hi', author: 'User', createdAt: 10 }); const first = (await call({ action: 'list' }, null)).data; const second = (await call({ action: 'list', cursor: first.nextCursor }, null)).data; expect(first.items).toHaveLength(20); expect(second.items).toHaveLength(5); expect(new Set([...first.items, ...second.items].map(item=>item.id)).size).toBe(25); expect(second.nextCursor).toBeNull() })
 it('rejects path traversal, malformed requests and unsupported methods', async () => { const { call, handler } = setup(); expect((await call({ action: 'list', postId: '../users' })).status).toBe(400); expect((await call({ action: 'delete', commentId: 'a/b' })).status).toBe(400); expect((await call({ action: 'list', cursor: { id: 'reader', createdAt: 'bad' } })).status).toBe(400); expect((await handler({ httpMethod: 'GET' })).statusCode).toBe(405); expect((await handler({ httpMethod: 'POST', body: '{' })).statusCode).toBe(400); expect((await handler({ httpMethod: 'POST', body: 'x'.repeat(14001) })).statusCode).toBe(413) })
 it('does not leak database or credential failures to the client', async () => { const { handler, store } = setup(); store.post = async () => { throw Error('private credential or document') }; const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ postId: 'post', action: 'list' }) }); expect(result.statusCode).toBe(503); expect(result.body).toBe('{"error":"comments-unavailable"}') })
 it('projects only the allowed public fields', () => { expect(Object.keys(publicComment('uid', { body: 'Hi', email: 'private' }))).toEqual(['id','authorId','author','authorImage','selectedIcon','body','rating','createdAt','updatedAt']) })
})

describe('Firestore comment writes',()=>{
 it('preserves creation time and rejects an overwrite by another author inside the transaction',async()=>{
  let stored
  const target={get:async()=>({data:()=>stored})}
  const db={collection:()=>({doc:()=>({collection:()=>({doc:()=>target})})}),runTransaction:async fn=>fn({get:async()=>({exists:!!stored,data:()=>stored}),set:(_,data)=>{stored=data}})}
  const store=firestoreCommentStore(db)
  await store.save('post','comment',{authorId:'reader',body:'First',updatedAt:100})
  await store.save('post','comment',{authorId:'reader',body:'Edited',updatedAt:200})
  expect(stored).toMatchObject({authorId:'reader',body:'Edited',createdAt:100,updatedAt:200})
  await expect(store.save('post','comment',{authorId:'other',body:'Forged',updatedAt:300})).rejects.toThrow('forbidden')
  expect(stored.body).toBe('Edited')
 })
})
