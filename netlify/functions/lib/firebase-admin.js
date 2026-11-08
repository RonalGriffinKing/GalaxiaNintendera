import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app'
export function adminApp() {
  const existing = getApps().find(app => app.name === 'participation')
  if (existing) return existing
  if (!process.env.FIREBASE_PROJECT_ID || (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS)) throw new Error('server-credentials-not-configured')
  return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, storageBucket: process.env.FIREBASE_STORAGE_BUCKET, credential: process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)) : applicationDefault() }, 'participation')
}
