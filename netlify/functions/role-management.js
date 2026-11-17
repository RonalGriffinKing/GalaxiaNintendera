import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createRoleManagementService } from './lib/role-management.js'

const respond = (statusCode, data) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) })
export function createRoleManagementHandler({ enabled, primaryAdminUid, verify, service }) {
  return async event => {
    if (!enabled()) return respond(503, { error: 'roles-not-configured' })
    if (event.httpMethod !== 'POST') return respond(405, { error: 'method-not-allowed' })
    if ((event.body || '').length > 4096) return respond(413, { error: 'request-too-large' })
    const token = (event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer (\S+)$/)?.[1]
    if (!token) return respond(401, { error: 'authentication-required' })
    let identity
    try { identity = await verify(token) } catch { return respond(401, { error: 'invalid-token' }) }
    let body
    try { body = JSON.parse(event.body || '{}') } catch { return respond(400, { error: 'invalid-json' }) }
    if (!identity?.uid) return respond(401, { error: 'invalid-token' })
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['action','targetUid'].includes(key))) return respond(400, { error: 'invalid-request' })
    try { return respond(200, await service(identity.uid, body)) }
    catch (error) {
      const known = ['forbidden','invalid-request','invalid-target','invalid-transition']
      return respond(error.message === 'forbidden' ? 403 : known.includes(error.message) ? 400 : 503, { error: known.includes(error.message) ? error.message : 'roles-unavailable' })
    }
  }
}
function adminApp() {
  const existing = getApps().find(app => app.name === 'role-management')
  if (existing) return existing
  return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)) : applicationDefault() }, 'role-management')
}
const primaryAdminUid = () => process.env.PRIMARY_ADMIN_UID || ''
export const handler = createRoleManagementHandler({
  enabled: () => Boolean(primaryAdminUid() && process.env.ROLE_MANAGEMENT_ENABLED === 'true'),
  primaryAdminUid: primaryAdminUid(),
  verify: token => getAuth(adminApp()).verifyIdToken(token, true),
  service: (uid, body) => createRoleManagementService(getFirestore(adminApp()), primaryAdminUid())(uid, body)
})
