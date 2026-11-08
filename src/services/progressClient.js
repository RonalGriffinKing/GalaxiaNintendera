import { auth } from '@/firebase'
export async function progressRequest(action, data = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('authentication-required')
  const response = await fetch('/.netlify/functions/profile-progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ ...data, action })
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'progress-unavailable')
  return result
}
