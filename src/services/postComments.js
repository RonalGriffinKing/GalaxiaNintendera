import { auth } from '@/firebase'
export async function postCommentsRequest(action, data, { signal } = {}) {
 const user = auth.currentUser
 const headers = { 'Content-Type': 'application/json' }
 if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`
 const response = await fetch('/.netlify/functions/post-comments', { method: 'POST', headers, body: JSON.stringify({ ...data, action }), signal })
 let result
 try { result = await response.json() } catch { throw new Error('comments-unavailable') }
 if (!response.ok) throw new Error(result.error || 'comments-unavailable')
 return result
}
