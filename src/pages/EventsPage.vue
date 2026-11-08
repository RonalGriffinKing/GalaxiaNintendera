<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GalaxyAtmosphere from '@/components/shared/GalaxyAtmosphere.vue'
import FloatingBackButton from '@/components/shared/FloatingBackButton.vue'
import ContentLoading from '@/components/shared/ContentLoading.vue'
import EventPremiumCard from '@/components/events/EventPremiumCard.vue'
import EventDetailModal from '@/components/events/EventDetailModal.vue'
import EventsTabs from '@/components/events/EventsTabs.vue'
import { useEventFeed } from '@/composables/useEventFeed'
import { useEventClock } from '@/composables/useEventClock'
import { filterEvents } from '@/services/eventPresentation'
import { eventTime } from '@/services/eventInvitation'

const route=useRoute(),router=useRouter(),now=useEventClock()
const {events,ready,error,notice,start,isNotified,toggleNotify,eventCommunities,pendingReminders}=useEventFeed()
const activeTab=ref('upcoming'),detailEvent=ref(null),sort=ref('recent')
const heading=computed(()=>({upcoming:'Próximos eventos',all:'Eventos',featured:'Eventos destacados',communities:'Eventos de comunidades',past:'Eventos anteriores'})[activeTab.value])
const publicEvents=computed(()=>events.value.filter(e=>e.published!==false&&e.status!=='draft'))
const visibleEvents=computed(()=>{
  const result=filterEvents(publicEvents.value,{filter:activeTab.value,sort:activeTab.value==='all'?sort.value:activeTab.value==='past'?'recent':'date'},now.value)
  return ['all','past'].includes(activeTab.value)?result:result.sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))||eventTime(a.startsAt)-eventTime(b.startsAt))
})
function openDetails(event){detailEvent.value=event;router.replace({path:route.path,query:{...route.query,id:event.id}})}
function closeDetails(){detailEvent.value=null;router.replace({path:route.path,query:{...route.query,id:undefined}})}
async function notify(event){if(!await toggleNotify(event))router.push('/login?mode=login')}
function openCalendar(event){
  const start=eventTime(event.startsAt);if(!Number.isFinite(start))return
  const date=value=>new Date(value).toISOString().replace(/[-:]|\.\d{3}/g,'')
  const query=new URLSearchParams({action:'TEMPLATE',text:event.title||'Evento',dates:date(start)+'/'+date(start+Number(event.durationMinutes||60)*60000),details:(event.description||'')+'\n'+(event.url||'')})
  window.open('https://calendar.google.com/calendar/render?'+query,'_blank','noreferrer')
}
async function share(event){
  const url=window.location.origin+'/eventos?id='+encodeURIComponent(event.id)
  if(navigator.share){await navigator.share({title:event.title,url}).catch(()=>{});return}
  try{await navigator.clipboard.writeText(url);notice.value='Enlace copiado.'}catch{notice.value='No se pudo copiar el enlace.'}
}
watch([()=>route.query.id,publicEvents],([id])=>{detailEvent.value=publicEvents.value.find(e=>e.id===id)||null},{immediate:true})
</script>

<template>
  <main class="events-page-premium">
    <GalaxyAtmosphere />
    <div class="events-page-inner">
      <FloatingBackButton />
      <header class="events-heading"><span>COMUNIDAD Y DIRECTOS</span><h1>{{ heading }}</h1><p>Encuentra tu próxima cita. Toca un evento para ver los detalles y activar tu recordatorio.</p></header>
      <div class="events-navigation"><EventsTabs v-model="activeTab" /><details v-if="activeTab==='all'" class="events-sort"><summary aria-label="Ordenar eventos">{{ sort==='recent'?'Más recientes':'Más antiguos' }} <i class="fas fa-chevron-down" aria-hidden="true"></i></summary><div><button type="button" :aria-pressed="sort==='recent'" @click="sort='recent';$event.currentTarget.closest('details').open=false">Más recientes primero</button><button type="button" :aria-pressed="sort==='date'" @click="sort='date';$event.currentTarget.closest('details').open=false">Más antiguos primero</button></div></details></div>
      <p v-if="notice" class="events-notice" role="status">{{ notice }}</p>
      <ContentLoading v-if="!ready && !events.length" variant="cards" />
      <div v-else-if="error" class="events-empty" role="alert"><p>{{ error }}</p><button type="button" @click="start">Reintentar</button></div>
      <section v-else-if="visibleEvents.length" class="events-grid" aria-label="Eventos">
        <EventPremiumCard v-for="event in visibleEvents" :key="event.id" :event="event" :now="now" :emphasize="!['all','past'].includes(activeTab)" :communities="eventCommunities(event)" :notified="isNotified(event)" :notify-pending="pendingReminders.has(event.id)" @details="openDetails(event)" @notify="notify(event)" @share="share(event)" />
      </section>
      <div v-else class="events-empty" role="status"><i class="far fa-calendar-check" aria-hidden="true"></i><h2>{{ activeTab==='past'?'No hay eventos anteriores':'No hay eventos en esta sección' }}</h2><p>Vuelve pronto para descubrir nuevas citas con la comunidad.</p></div>
    </div>
    <EventDetailModal v-if="detailEvent" :event="detailEvent" :communities="eventCommunities(detailEvent)" :notified="isNotified(detailEvent)" @close="closeDetails" @notify="notify(detailEvent)" @calendar="openCalendar(detailEvent)" />
  </main>
</template>

<style scoped>
@media(max-width:680px){.events-navigation{display:grid;grid-template-columns:minmax(0,1fr)}.events-navigation>:first-child{width:100%}.events-sort{justify-self:end}}
.events-navigation{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.events-navigation>:first-child{flex:1;min-width:0}.events-sort select{border:1px solid #a78bfa40;background:#17132b;color:#e1d7f8;font-size:12px;font-weight:700;border-radius:999px;min-height:42px;padding:9px 30px 9px 15px;max-width:100%}.events-sort select:focus-visible{outline:2px solid #c4b5fd}.events-sort{max-width:100%}
.events-page-premium{position:relative;min-height:100vh;color:#f8fafc;padding:28px 20px 64px}.events-page-inner{position:relative;z-index:1;max-width:1120px;margin:auto}.events-heading{padding:20px 0 26px;max-width:760px}.events-heading>span{font-size:11px;font-weight:800;letter-spacing:.12em;color:#bda5ff}.events-heading h1{font-size:clamp(28px,4vw,42px);font-weight:850;letter-spacing:-.035em;margin:8px 0}.events-heading p{color:#a8b3ca;font-size:15px;line-height:1.65}.events-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:24px}.events-empty{margin-top:24px;padding:48px 24px;text-align:center;border:1px solid #b8a1f326;border-radius:20px;background:#101629}.events-empty i{font-size:30px;color:#bda5ff}.events-empty h2{font-size:21px;font-weight:750;margin:14px 0 8px}.events-empty p,.events-notice{color:#b7c1d7;line-height:1.6}.events-empty button{margin-top:12px;padding:12px 18px;border-radius:12px;background:#7c3aed;color:white}.events-notice{margin-top:16px}button:focus-visible{outline:2px solid #c4b5fd;outline-offset:4px}@media(max-width:680px){.events-page-premium{padding:12px 14px 40px}.events-heading{padding-top:12px}.events-grid{grid-template-columns:minmax(0,1fr);gap:18px}}
</style>
<style scoped>
.events-navigation{display:flex;align-items:center;gap:4px;width:100%;max-width:100%;min-width:0;padding:4px;border:1px solid #b78bfa66;border-radius:999px;background:#111024f5;box-sizing:border-box}.events-navigation>:first-child{flex:1;min-width:0;border:0;background:transparent;box-shadow:none}.events-sort{position:relative;flex:0 0 auto;max-width:45%;font-size:12px;color:#e1d7f8}.events-sort summary{list-style:none;display:flex;align-items:center;gap:12px;padding:11px 14px;border-left:1px solid #b78bfa30;cursor:pointer;white-space:nowrap;font-weight:700}.events-sort summary::-webkit-details-marker{display:none}.events-sort>div{position:absolute;right:0;top:calc(100% + 10px);z-index:35;min-width:210px;max-width:calc(100vw - 36px);padding:6px;border:1px solid #b78bfa55;border-radius:14px;background:#17132b;box-shadow:0 10px 28px #0005}.events-sort button{display:block;width:100%;padding:12px;text-align:left;border-radius:9px;background:transparent;color:#ddd3f0;border:0;font-size:12px;font-weight:650}.events-sort button:hover,.events-sort button[aria-pressed=true]{background:#a78bfa20;color:white}.events-sort summary:focus-visible,.events-sort button:focus-visible{outline:2px solid #c4b5fd;outline-offset:-2px}@media(max-width:680px){.events-navigation{display:flex}.events-sort summary{font-size:11px;padding:11px 9px;gap:7px}}
</style>
