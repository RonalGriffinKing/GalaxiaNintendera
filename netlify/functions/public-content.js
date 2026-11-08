import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { adminApp } from './lib/firebase-admin.js'
import { createPublicContentHandler } from './lib/public-content.js'
export const handler = async event => {
  try { return await createPublicContentHandler(getFirestore(adminApp()),token=>getAuth(adminApp()).verifyIdToken(token))(event) }
  catch {return {statusCode:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({error:'public-content-not-configured'})}}
}
