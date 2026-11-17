import { auth } from '@/firebase'
import { backendRequest } from './backendClient'
export async function progressRequest(action, data = {}) {
  if (!auth.currentUser) throw new Error('authentication-required')
  return backendRequest('profile-progress', { method: 'POST', authenticated: true, body: { ...data, action } })
}
