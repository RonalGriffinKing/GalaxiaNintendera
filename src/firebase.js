import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export const firebaseConfig = {
  apiKey: 'AIzaSyCIjX5wXqFS5nWj6u13bnVDq2PSFNjhZhA',
  authDomain: 'widget-dreams.firebaseapp.com',
  projectId: 'widget-dreams',
  storageBucket: 'widget-dreams.firebasestorage.app',
  messagingSenderId: '416372701871',
  appId: '1:416372701871:web:0dfbc6749b3e10d57ab25a'
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
