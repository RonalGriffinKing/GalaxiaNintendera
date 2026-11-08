import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getStorage, getDownloadURL } from 'firebase-admin/storage'
import { createIconImageUploader } from './lib/icon-image.js'
import { getFirestore } from 'firebase-admin/firestore'
import { createProgressService } from './lib/progress-service.js'
const respond = (statusCode, data) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) })
export function createProgressHandler({ enabled, verify, service }) {
  return async event => {
    if (!enabled()) return respond(503, { error: 'progress-not-configured' })
    if (event.httpMethod !== 'POST') return respond(405, { error: 'method-not-allowed' })
    if ((event.body || '').length > 720000) return respond(413, { error: 'request-too-large' })
    const token = (event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer (\S+)$/)?.[1]
    if (!token) return respond(401, { error: 'authentication-required' })
    let identity
    try { identity = await verify(token) } catch { return respond(401, { error: 'invalid-token' }) }
    let body
    try { body = JSON.parse(event.body || '{}') } catch { return respond(400, { error: 'invalid-json' }) }
    if (!body || !['sync','equip','begin-read','award-read','update-icon','create-icon','delete-icon','upload-icon-image','save-achievements'].includes(body.action)) return respond(400, { error: 'invalid-action' })
    try { return respond(200, await service(identity.uid, body)) }
    catch (error) {
      const known = ['forbidden','invalid-id','invalid-stars','invalid-icon','locked-icon','missing-icon','unavailable-post','reading-too-soon','catalog-change-requires-batched-maintenance','invalid-image','storage-not-configured','invalid-achievements','icon-already-exists','built-in-icon','icon-in-use']
      return respond(error.message === 'forbidden' ? 403 : known.includes(error.message) ? 409 : 503, { error: known.includes(error.message) ? error.message : 'progress-unavailable' })
    }
  }
}
function adminApp() {
  const existing = getApps().find(app => app.name === 'participation')
  if (existing) return existing
  return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, storageBucket: process.env.FIREBASE_STORAGE_BUCKET, credential: process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)) : applicationDefault() }, 'participation')
}
export const handler = createProgressHandler({ enabled: () => process.env.PROGRESS_ENABLED === 'true', verify: token => getAuth(adminApp()).verifyIdToken(token, true), service: (uid, body) => createProgressService(getFirestore(adminApp()), Date.now, process.env.FIREBASE_STORAGE_BUCKET ? createIconImageUploader(getStorage(adminApp()).bucket(), getDownloadURL) : undefined)(uid, body) })
