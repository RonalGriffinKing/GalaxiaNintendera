import { initializeApp } from 'firebase/app'
import { getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { Capacitor } from '@capacitor/core'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.apiKey || !projectId) {
  throw new Error('Missing Firebase configuration: set FIREBASE_API_KEY and FIREBASE_PROJECT_ID, or their VITE_ equivalents.')
}

const app = initializeApp(firebaseConfig)

export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
