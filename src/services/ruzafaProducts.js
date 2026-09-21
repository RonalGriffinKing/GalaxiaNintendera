import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import { defaultRuzafaProducts } from '@/data/ruzafaProducts'

const collectionRef = collection(db, 'ruzafaPrinterProducts')

export const getRuzafaProducts = async () => {
  const snapshot = await getDocs(collectionRef)
  if (snapshot.empty) return defaultRuzafaProducts
  const saved = new Map(snapshot.docs.map(item => [item.id, item.data()]))
  const merged = defaultRuzafaProducts.map(product => ({
    ...product,
    ...(saved.get(product.id) || {}),
  }))
  const defaultIds = new Set(defaultRuzafaProducts.map(product => product.id))
  const custom = snapshot.docs
    .filter(item => !defaultIds.has(item.id))
    .map(item => ({ id: item.id, ...item.data() }))
  return [...merged, ...custom]
}

export const saveRuzafaProduct = async (product) => {
  const { id, ...data } = product
  await setDoc(doc(collectionRef, id), data, { merge: true })
}

export const saveRuzafaProducts = async (products) => {
  const batch = writeBatch(db)
  products.forEach(({ id, ...data }) => {
    batch.set(doc(collectionRef, id), data, { merge: true })
  })
  await batch.commit()
}

export const seedRuzafaProducts = async () => {
  const batch = writeBatch(db)
  defaultRuzafaProducts.forEach(({ id, ...data }) => {
    batch.set(doc(collectionRef, id), data)
  })
  await batch.commit()
}
