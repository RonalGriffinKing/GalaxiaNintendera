import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
export async function fetchOverlayEvent(id) {
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(id||''))return null
  const snapshot=await getDoc(doc(db,'galaxyEvents',id))
  return snapshot.exists()?{...snapshot.data(),id:snapshot.id}:null
}
export async function listOverlayEvents() {
  const snapshot=await getDocs(query(collection(db,'galaxyEvents'),orderBy('startsAt','desc'),limit(100)))
  return snapshot.docs.map(item=>({...item.data(),id:item.id}))
}
