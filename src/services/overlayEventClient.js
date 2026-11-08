import { publicEvent, publicEvents } from '@/services/publicContentClient'
export async function fetchOverlayEvent(id) {
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(id||''))return null
  const snapshot=await publicEvent(id)
  return snapshot.exists()?{...snapshot.data(),id:snapshot.id}:null
}
export async function listOverlayEvents() {
  const snapshot=await publicEvents()
  return [...snapshot.docs].sort((a,b)=>Number(b.data().startsAt||0)-Number(a.data().startsAt||0)).slice(0,100).map(item=>({...item.data(),id:item.id}))
}
