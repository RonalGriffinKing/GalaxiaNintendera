import { onMounted, onUnmounted, ref } from 'vue'
import { collection, doc, onSnapshot, orderBy, query, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { eventTime } from '@/services/eventInvitation'
import { eventCommunityIds } from '@/services/eventPresentation'
import { peekPublicPage, storePublicPage } from '@/services/publicPageCache'

export function useEventFeed(onReady=()=>{}) {
  const events=ref(peekPublicPage('events-live-list')||[]),communities=ref(peekPublicPage('events-live-communities')||[])
  const currentUser=ref(auth.currentUser),ready=ref(false),error=ref(''),notice=ref('')
  let stopEvents,stopCommunities,stopAuth
  function start(){
    stopEvents?.();stopCommunities?.();error.value='';ready.value=false
    stopEvents=onSnapshot(query(collection(db,'galaxyEvents'),orderBy('startsAt','asc')),snap=>{
      events.value=snap.docs.map(item=>({...item.data(),id:item.id,startsAt:eventTime(item.data().startsAt)}))
      ready.value=true;onReady()
      storePublicPage('events-live-list',events.value.map(({notifyBy,...event})=>({...event,notifyBy:[]})))
    },()=>{error.value='No se pudieron cargar los eventos. Vuelve a intentarlo.';ready.value=true;onReady()})
    stopCommunities=onSnapshot(query(collection(db,'communities'),orderBy('createdAt','asc')),snap=>{
      communities.value=snap.docs.map(item=>({...item.data(),id:item.id}))
      storePublicPage('events-live-communities',communities.value)
    },()=>{})
  }
  const isNotified=event=>Boolean(currentUser.value&&event.notifyBy?.includes(currentUser.value.uid))
  const pendingReminders=ref(new Set())
  async function toggleNotify(event){
    if(!currentUser.value)return false
    if(!ready.value||pendingReminders.value.has(event.id))return true
    pendingReminders.value=new Set([...pendingReminders.value,event.id]);notice.value=''
    try{await updateDoc(doc(db,'galaxyEvents',event.id),{notifyBy:isNotified(event)?arrayRemove(currentUser.value.uid):arrayUnion(currentUser.value.uid)})}
    catch{notice.value='No se pudo guardar el recordatorio. Inténtalo de nuevo.'}
    finally{const next=new Set(pendingReminders.value);next.delete(event.id);pendingReminders.value=next}
    return true
  }
  const eventCommunities=event=>{
    const ids=eventCommunityIds(event),matched=communities.value.filter(c=>ids.includes(c.id))
    return matched.length?matched:(event.communityNames||[]).map((name,i)=>({id:`${event.id}-${i}`,name}))
  }
  onMounted(()=>{start();stopAuth=onAuthStateChanged(auth,user=>{currentUser.value=user})})
  onUnmounted(()=>{stopEvents?.();stopCommunities?.();stopAuth?.()})
  return {events,communities,currentUser,ready,error,notice,start,isNotified,toggleNotify,eventCommunities,pendingReminders}
}
