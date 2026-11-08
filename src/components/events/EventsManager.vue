<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useEventFeed } from '@/composables/useEventFeed'
import { useEventClock } from '@/composables/useEventClock'
import { useListNavigation } from '@/composables/useListNavigation'
import { filterEvents, eventState, eventStateLabel } from '@/services/eventPresentation'
import { invitationDate } from '@/services/eventInvitation'
import { eventGameNames } from '@/services/eventGame'
import { EVENT_TYPES } from '@/services/eventJson'
import { resolveAssetUrl, defaultBannerUrl } from '@/constants/assets'
import ContentLoading from '@/components/shared/ContentLoading.vue'
import ListControls from '@/components/shared/ListControls.vue'
import PaginationNav from '@/components/shared/PaginationNav.vue'
const EventEditorModal=defineAsyncComponent(()=>import('@/components/modals/EventEditorModal.vue'))
const EventsBulkImport=defineAsyncComponent(()=>import('@/components/events/EventsBulkImport.vue'))
const EventDetailModal=defineAsyncComponent(()=>import('@/components/events/EventDetailModal.vue'))
const props=defineProps({userRole:{type:String,default:'user'},embedded:Boolean})
const emit=defineEmits(['loading','ready'])
const route=useRoute(),router=useRouter(),now=useEventClock()
const isAdmin=computed(()=>props.userRole==='admin')
const {events,communities,ready,error,start}=useEventFeed(()=>emit('ready','events'))
const search=ref(''),filter=ref('all'),type=ref('all'),sort=ref('recent')
const matches=computed(()=>filterEvents(events.value,{filter:filter.value,search:search.value,type:type.value,sort:sort.value},now.value))
const pager=useListNavigation(matches,{initialPageSize:10})
const rows=computed(()=>pager.pageItems.value)
const pagination=computed(()=>Object.fromEntries(['currentPage','totalPages','totalItems','startItem','endItem','pageTokens'].map(key=>[key,pager[key].value])))
watch([search,filter,type,sort],pager.resetPage)
const editing=ref(null),editorOpen=ref(false),reactivating=ref(false),bulkOpen=ref(false),detail=ref(null),deleting=ref(null),busy=ref(false),message=ref('')
const filters=[{id:'all',label:'Todos'},{id:'upcoming',label:'Próximos'},{id:'featured',label:'Destacados'},{id:'past',label:'Anteriores'}]
const sorts=[{value:'date',label:'Por fecha'},{value:'recent',label:'Más recientes'},{value:'az',label:'A-Z'}]
function edit(event=null,reactivate=false){if(!isAdmin.value)return;editing.value=event;reactivating.value=reactivate;editorOpen.value=true}
function createEvent(){edit()}
function importEvents(){if(isAdmin.value)bulkOpen.value=true}
function social(event){if(isAdmin.value)router.push('/admin/event-share/'+event.id)}
function carousel(ids=[]){if(!isAdmin.value)return;bulkOpen.value=false;router.push({path:'/admin/event-share/agenda',query:ids.length?{ids:ids.join(',')}:{}})}
function closeEditor(){editorOpen.value=false;editing.value=null;if(route.query.create)router.replace({path:route.path,query:{...route.query,create:undefined}})}
function showHistory(){closeEditor();filter.value='past'}
async function feature(event){if(!isAdmin.value||busy.value)return;busy.value=true;message.value='';try{await updateDoc(doc(db,'galaxyEvents',event.id),{featured:!event.featured,updatedAt:Date.now()})}catch{message.value='No se pudo actualizar el destacado.'}finally{busy.value=false}}
async function confirmDelete(){if(!isAdmin.value||!deleting.value||busy.value)return;busy.value=true;message.value='';try{const id=deleting.value.id;await deleteDoc(doc(db,'galaxyEvents',id));events.value=events.value.filter(e=>e.id!==id);deleting.value=null}catch{message.value='No se pudo eliminar el evento. Vuelve a intentarlo.'}finally{busy.value=false}}
watch(()=>route.query.create,create=>{if(create==='event')createEvent();if(create==='event-json')importEvents()},{immediate:true})
watch(isAdmin,()=>{if(route.query.create==='event')createEvent();if(route.query.create==='event-json')importEvents()})
</script>
<template>
  <div class="event-manager">
    <div v-if="!embedded && isAdmin" class="manager-create-actions"><button type="button" @click="createEvent">Crear evento</button><button type="button" @click="importEvents">Importar JSON</button><button type="button" @click="carousel()">Generador mágico</button></div>
    <div class="manager-toolbar">
      <nav class="manager-tabs" aria-label="Filtrar eventos"><button v-for="option in filters" :key="option.id" type="button" :class="{active:filter===option.id}" :aria-pressed="filter===option.id" @click="filter=option.id">{{ option.label }}</button></nav>
      <ListControls v-model:search="search" v-model:sort="sort" :page-size="10" :show-page-size="false" :page-size-options="[10]" search-placeholder="Buscar eventos o juegos..." :sort-options="sorts"><template #filters><select v-model="type" aria-label="Tipo de evento"><option value="all">Todos los tipos</option><option v-for="eventType in EVENT_TYPES" :key="eventType" :value="eventType">{{ eventType }}</option></select></template></ListControls>
    </div>
    <p v-if="message&&!deleting" role="alert" class="manager-notice">{{ message }}</p>
    <ContentLoading v-if="!ready" variant="cards" />
    <div v-else-if="error" class="manager-empty" role="alert"><p>{{ error }}</p><button type="button" @click="start">Reintentar</button></div>
    <div v-else-if="rows.length" class="event-table-wrap">
      <table class="event-table"><thead><tr><th>Evento</th><th>Fecha y hora</th><th>Tipo / estado</th><th>Acciones</th></tr></thead><tbody>
        <tr v-for="event in rows" :key="event.id">
          <td data-label="Evento"><button type="button" class="event-title" @click="detail=event"><img :src="resolveAssetUrl(event.backgroundUrl||event.imageUrl,defaultBannerUrl)" alt="" loading="lazy"/><span><strong>{{ event.title||'Sin título' }}</strong><small v-if="eventGameNames(event).nameEs||eventGameNames(event).nameEn">{{ eventGameNames(event).nameEs||eventGameNames(event).nameEn }}</small></span></button></td>
          <td data-label="Fecha y hora"><span>{{ invitationDate(event).date }}</span><small>{{ invitationDate(event).time }} · {{ invitationDate(event).duration }}</small></td>
          <td data-label="Tipo / estado"><div class="event-badges"><span>{{ event.type||'Evento' }}</span><span :class="eventState(event,now)">{{ eventStateLabel(event,now) }}</span><span v-if="event.featured" class="featured">Destacado</span></div></td>
          <td data-label="Acciones"><div v-if="isAdmin" class="event-row-actions"><button type="button" class="edit-action" :aria-label="'Editar '+event.title" @click="edit(event)"><i class="fas fa-pen" aria-hidden="true"></i></button><button type="button" class="social-action" @click="social(event)"><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i><span>Imagen social</span></button><details class="row-menu" name="event-row-actions" @keydown.esc="$event.currentTarget.open=false"><summary :aria-label="'M?s acciones para '+event.title"><i class="fas fa-ellipsis" aria-hidden="true"></i></summary><div><button v-if="eventState(event,now)==='past'" type="button" @click="edit(event,true);$event.currentTarget.closest('details').open=false"><i class="fas fa-clock-rotate-left" aria-hidden="true"></i> Reactivar evento</button><button type="button" :disabled="busy" @click="feature(event);$event.currentTarget.closest('details').open=false"><i :class="event.featured?'fas fa-star':'far fa-star'" aria-hidden="true"></i>{{ event.featured?'Quitar destacado':'Destacar' }}</button><button type="button" class="delete-action" @click="deleting=event;$event.currentTarget.closest('details').open=false"><i class="fas fa-trash" aria-hidden="true"></i> Eliminar evento</button></div></details></div></td>
        </tr>
      </tbody></table>
    </div>
    <div v-else class="manager-empty" role="status"><i class="far fa-calendar" aria-hidden="true"></i><h3>No hay eventos con estos filtros</h3><p>Cambia la búsqueda o crea un evento.</p></div>
    <PaginationNav v-if="ready&&!error" v-bind="pagination" item-label="eventos" @page="pager.setPage" />
    <EventEditorModal v-if="editorOpen&&isAdmin" :event="editing" :reactivating="reactivating" :communities="communities" @close="closeEditor" @saved="closeEditor" @history="showHistory" />
    <EventsBulkImport v-if="bulkOpen&&isAdmin" :communities="communities" @close="bulkOpen=false" @carousel="carousel" />
    <EventDetailModal v-if="detail" :event="detail" @close="detail=null"><template #actions><button type="button" @click="detail=null">Cerrar</button><button v-if="isAdmin" type="button" @click="edit(detail);detail=null">Editar evento</button></template></EventDetailModal>
    <Teleport to="body"><div v-if="deleting&&isAdmin" class="event-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-event-title" @keydown.esc="!busy&&(deleting=null)"><section><h2 id="delete-event-title">Eliminar evento</h2><p>«{{ deleting.title }}» se eliminará del servidor. Esta acción no se puede deshacer.</p><p v-if="message" role="alert">{{ message }}</p><div><button type="button" :disabled="busy" @click="deleting=null">Cancelar</button><button type="button" class="delete-action" :disabled="busy" @click="confirmDelete">{{ busy?'Eliminando…':'Eliminar evento' }}</button></div></section></div></Teleport>
  </div>
</template>
<style scoped>
.manager-toolbar>:deep(.list-controls){flex:1;min-width:0}@media(max-width:720px){.event-manager :deep(.list-controls){display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.event-manager :deep(.list-search){grid-column:1/-1}.event-manager :deep(.list-controls select){font-size:11px;min-width:0;padding-right:22px}}

button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}.event-title{padding:0}.event-manager :deep(.list-controls select){background-color:var(--control-surface);color:var(--control-text);border:1px solid var(--control-border);border-radius:12px;min-height:42px;padding:0 30px 0 12px}
.event-manager{--control-surface:#11192b;--control-border:#a4b1d026;--control-text:#d4ddef}.row-menu{position:relative}.row-menu summary{list-style:none;display:flex;align-items:center;justify-content:center;width:36px;min-height:36px;border:1px solid #a78bfa30;border-radius:9px;color:#c8b6ff;cursor:pointer}.row-menu summary::-webkit-details-marker{display:none}.row-menu>div{position:absolute;right:0;top:calc(100% + 7px);z-index:25;min-width:195px;padding:6px;border:1px solid #a78bfa44;border-radius:12px;background:#171e32;box-shadow:0 12px 30px #0007}.event-row-actions .row-menu button{display:flex;justify-content:flex-start;width:100%;background:transparent;text-align:left}.event-row-actions .row-menu button:hover{background:#a78bfa20}.event-row-actions .row-menu .delete-action{color:#ff9aaa;background:transparent}.row-menu summary:focus-visible{outline:2px solid #c4b5fd;outline-offset:3px}

.event-manager{color:#e8edf8;min-width:0}.manager-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px}.manager-tabs{display:flex;flex-wrap:wrap;padding:5px;border:1px solid #a4b1d021;border-radius:13px;background:#0a1022;max-width:100%;overflow:visible}.manager-tabs button{padding:10px 15px;border-radius:9px;color:#9eacc4;font-size:12px;font-weight:750;white-space:nowrap}.manager-tabs button.active{background:linear-gradient(130deg,#9636df,#e541a6);color:white}.event-table-wrap{border:1px solid #a4b1d025;border-radius:17px;overflow:visible}.event-table{width:100%;border-collapse:collapse;text-align:left;table-layout:fixed}.event-table th:first-child{width:37%}.event-table th:nth-child(2){width:19%}.event-table th:nth-child(3){width:17%}.event-table th{color:#93a3bd;font-size:10px;font-weight:800;text-transform:uppercase;background:#0a102218;padding:14px}.event-table td{padding:17px 14px;border-top:1px solid #a4b1d021;vertical-align:middle;font-size:12px;overflow-wrap:anywhere}.event-title{display:flex;align-items:center;gap:13px;text-align:left;width:100%;min-width:0}.event-title img{width:76px;height:53px;object-fit:cover;border-radius:10px;flex-shrink:0}.event-title span{min-width:0}.event-title strong{font-size:13px;line-height:1.45;display:block}.event-table small{display:block;margin-top:5px;color:#8f9fb9;font-size:11px}.event-badges{display:flex;gap:5px;flex-wrap:wrap}.event-badges span{padding:5px 7px;border-radius:7px;background:#9582e71c;color:#c2b2fa;font-size:10px;font-weight:700}.event-badges .live{color:#ffa6bd;background:#f0446c20}.event-badges .past{color:#a6b0c2;background:#94a3b819}.event-badges .featured{color:#f9da86;background:#eccb6719}.event-row-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap}.event-row-actions button,.manager-create-actions button{min-width:35px;min-height:36px;padding:8px 10px;border-radius:9px;background:#a78bfa15;color:#c5b1ff;font-size:11px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;gap:7px}.event-row-actions .edit-action{background:#edf7ff;color:#0b83ba}.event-row-actions .delete-action,.delete-action{background:#fff1f2;color:#e33451}.manager-create-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}.manager-create-actions button:first-child{background:#7c3aed;color:white}.manager-empty{padding:44px 20px;text-align:center;border:1px dashed #a4b1d030;border-radius:15px;color:#a6b3ca}.manager-empty h3{font-weight:750;margin:12px 0}.manager-empty button{padding:10px 16px;background:#7c3aed;border-radius:10px;color:white;margin-top:12px}.manager-notice{color:#f0b3c2;font-size:13px;margin-bottom:12px}button:disabled{opacity:.5}button:focus-visible,select:focus-visible{outline:2px solid #c4b5fd;outline-offset:3px}.event-delete-dialog{position:fixed;inset:0;z-index:4600;background:#020617c9;display:grid;place-items:center;padding:20px}.event-delete-dialog section{background:#131a2c;border:1px solid #a78bfa66;padding:25px;border-radius:18px;max-width:470px;color:#edf1f8}.event-delete-dialog h2{font-size:22px;font-weight:800}.event-delete-dialog p{margin:15px 0;line-height:1.65;color:#bac4d8}.event-delete-dialog section>div{display:flex;justify-content:flex-end;gap:10px}.event-delete-dialog button{padding:11px 16px;border-radius:10px;background:#9b87d826}.event-delete-dialog button.delete-action{background:#d42f51;color:white}@media(max-width:1000px){.event-table th:first-child{width:32%}.event-table th:nth-child(2){width:20%}.event-table th:nth-child(3){width:18%}.social-action span{display:none}}@media(max-width:720px){.manager-toolbar{align-items:stretch;flex-direction:column}.event-table thead{display:none}.event-table,.event-table tbody{display:block}.event-table tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);padding:15px;border-top:1px solid #a4b1d026;gap:16px}.event-table tr:first-child{border:0}.event-table td{display:block;border:0;padding:0}.event-table td:first-child,.event-table td:last-child{grid-column:1/-1}.event-table td:nth-child(2):before,.event-table td:nth-child(3):before{content:attr(data-label);display:block;font-size:10px;text-transform:uppercase;color:#899bb8;margin-bottom:7px}.event-title img{width:70px;height:50px}.event-row-actions{justify-content:flex-start}.social-action span{display:inline}}
</style>
