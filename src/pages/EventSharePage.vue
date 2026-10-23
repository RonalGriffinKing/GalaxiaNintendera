<script setup>
import { computed,nextTick,onMounted,onUnmounted,ref,watch } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import { collection,deleteDoc,doc,getDoc,getDocs,updateDoc } from 'firebase/firestore'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { auth,db } from '@/firebase'
import { apiUrl } from '@/services/appEnvironment'
import { INVITATION_FORMATS,eventTime,invitationDefaults,isEventActive } from '@/services/eventInvitation'
import { useEventClock } from '@/composables/useEventClock'
import PublicationAnimationModal from '@/components/posts/PublicationAnimationModal.vue'
import EventInvitationCard from '@/components/events/EventInvitationCard.vue'
import EventInvitationInspector from '@/components/events/EventInvitationInspector.vue'
import EventImageSearchModal from '@/components/events/EventImageSearchModal.vue'
import { tiktokPreset } from '@/services/invitationLayers'
import { eventGameNames } from '@/services/eventGame'
import EventInvitationIcon from '@/components/events/EventInvitationIcon.vue'
import GalaxyAtmosphere from '@/components/shared/GalaxyAtmosphere.vue'
const imageSearchOpen=ref(false),imageSearchTarget=ref('image'),imageSearchEvent=ref('')
let returnToInspector=false
const selectedElement=ref(''),isMobile=ref(window.innerWidth<=760),viewportHeight=ref(window.innerHeight),previewTop=ref(420),mobileInspectorOpen=ref(false),mobileSheet=ref(null)
let inspectorOverflow='',inspectorFocus=null
function measurePreviewTop(){if(previewBox.value)previewTop.value=Math.round(previewBox.value.getBoundingClientRect().top)}
function resizeInspector(){viewportHeight.value=window.innerHeight;nextTick(measurePreviewTop);isMobile.value=window.innerWidth<=760;if(!isMobile.value)mobileInspectorOpen.value=false}
function selectElement(key){if(exporting.value)return;selectedElement.value=key;if(key&&isMobile.value)mobileInspectorOpen.value=true}
async function openImageSearch(target){if(!current.value||exporting.value)return;imageSearchTarget.value=target;imageSearchEvent.value=current.value.id;returnToInspector=mobileInspectorOpen.value;if(mobileInspectorOpen.value){mobileInspectorOpen.value=false;await nextTick()}imageSearchOpen.value=true}
async function closeImageSearch(){imageSearchOpen.value=false;await nextTick();if(returnToInspector&&isMobile.value&&current.value?.id===imageSearchEvent.value)mobileInspectorOpen.value=true;returnToInspector=false}
function useSearchImage(image){if(current.value?.id===imageSearchEvent.value)updateOptions({[imageSearchTarget.value]:image.url});closeImageSearch()}
function closeInspector(){mobileInspectorOpen.value=false;selectedElement.value=''}
const positionFormat=computed(()=>currentOptions.value?.tiktok&&format.value==='story'?'story-tiktok':format.value)
function toggleTikTok(){if(!currentOptions.value)return;const enable=!(currentOptions.value.tiktok&&format.value==='story');if(enable)format.value='story';updateOptions(tiktokPreset(currentOptions.value,enable))}
function alignElement(axis){const card=previewBox.value?.querySelector('.event-invitation'),node=card?.querySelector('[data-inv-edit="'+selectedElement.value+'"]');if(!node||!currentOptions.value)return;const r=card.getBoundingClientRect(),b=node.getBoundingClientRect(),scale=r.width/1080,pos=currentOptions.value.positions?.[positionFormat.value]?.[selectedElement.value]||{x:0,y:0};const delta=axis==='x'?(r.left+r.width/2-b.left-b.width/2)/scale:(r.top+r.height/2-b.top-b.height/2)/scale;updateOptions({positions:{...currentOptions.value.positions,[positionFormat.value]:{...currentOptions.value.positions?.[positionFormat.value],[selectedElement.value]:{...pos,[axis]:Math.round(pos[axis]+delta)}}}})}
function updateOptions(patch){if(!exporting.value&&current.value){if(patch.logo&&patch.showLogo===undefined)patch={...patch,showLogo:true};Object.assign(options.value[current.value.id],patch)}}
function inspectorKeys(event){if(event.key==='Escape'){event.preventDefault();closeInspector();return}if(event.key!=='Tab')return;const items=[...mobileSheet.value.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(e=>e.offsetParent!==null);const first=items[0],last=items.at(-1);if(!first)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
watch(mobileInspectorOpen,async open=>{if(open){inspectorOverflow=document.body.style.overflow;inspectorFocus=document.activeElement;document.body.style.overflow='hidden';await nextTick();mobileSheet.value?.querySelector('button')?.focus()}else{document.body.style.overflow=inspectorOverflow;inspectorFocus?.focus?.()}})
const route=useRoute(),router=useRouter(),now=useEventClock()
const catalog=ref([]),chosen=ref([]),options=ref({}),activeId=ref(''),format=ref('story'),search=ref(''),loading=ref(true),error=ref(''),notice=ref(''),canManage=ref(false)
const showExpired=ref(false),rescheduleId=ref(''),rescheduleDate=ref(''),deleteId=ref(''),rowBusy=ref('')
const exporting=ref(false),progress=ref(''),exportItems=ref([]),exportBank=ref(null),previewBox=ref(null),previewWidth=ref(360)
let observer,previewResizeFrame=0,disposed=false,loadToken=0
const activeEvents=computed(()=>catalog.value.filter(e=>isEventActive(e,now.value)))
const expiredEvents=computed(()=>catalog.value.filter(e=>!isEventActive(e,now.value)))
const filtered=computed(()=>activeEvents.value.filter(e=>e.title?.toLowerCase().includes(search.value.toLowerCase())))
const selected=computed(()=>activeEvents.value.filter(e=>chosen.value.includes(e.id)))
const current=computed(()=>selected.value.find(e=>e.id===activeId.value)||selected.value[0])
const currentOptions=computed(()=>current.value?options.value[current.value.id]:null)
watch(current,value=>{if(!value&&mobileInspectorOpen.value)closeInspector();if(imageSearchOpen.value&&value?.id!==imageSearchEvent.value)closeImageSearch()})
const size=computed(()=>INVITATION_FORMATS[format.value])
const scale=computed(()=>previewWidth.value/1080)
watch(selected,items=>{if(!items.some(e=>e.id===activeId.value))activeId.value=items[0]?.id||''})
watch(activeEvents,items=>{const ids=new Set(items.map(e=>e.id));chosen.value=chosen.value.filter(id=>ids.has(id))})
function displayDate(event){return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(eventTime(event.startsAt)))}
async function loadEvents(initial=false){
 const token=++loadToken;error.value='';loading.value=true
 try{
  const snap=await getDocs(collection(db,'galaxyEvents'));if(disposed||token!==loadToken)return
  catalog.value=snap.docs.map(d=>({...d.data(),id:d.id})).filter(e=>Number.isFinite(eventTime(e.startsAt))).sort((a,b)=>eventTime(a.startsAt)-eventTime(b.startsAt))
  for(const event of catalog.value)if(!options.value[event.id])options.value[event.id]=invitationDefaults(event)
  if(initial){
   const ids=String(route.query.ids||'').split(',').filter(Boolean)
   const requested=ids.length?ids:route.params.id&&route.params.id!=='agenda'?[route.params.id]:[]
   chosen.value=(requested.length?activeEvents.value.filter(e=>requested.includes(e.id)):activeEvents.value).slice(0,50).map(e=>e.id)
   if(requested.some(id=>!activeEvents.value.some(e=>e.id===id)))notice.value='Los eventos caducados ya no se incluyen. Puedes revisarlos en su apartado.'
  }
 }catch{error.value='No se pudieron cargar los eventos. Intenta de nuevo.'}finally{if(token===loadToken)loading.value=false}
}
function toggle(id){if(exporting.value)return;if(chosen.value.includes(id))chosen.value=chosen.value.filter(x=>x!==id);else if(chosen.value.length<50)chosen.value=[...chosen.value,id]}
function applyStyleToAll(){
 const {title,description,image,logo,typeText,dayLabel,tiktokPrevious,...style}=currentOptions.value
 for(const event of selected.value){const old=options.value[event.id],restore=style.tiktok?tiktokPreset(old,true).tiktokPrevious:old.tiktokPrevious;options.value[event.id]={...old,...style,tiktokPrevious:restore}}
 notice.value='Estado, textos de invitacion y estilo aplicados a los eventos seleccionados. Cada uno conserva su titulo e imagen.'
}
function imageUrl(source){
 if(!source)return ''
 if(/^(data:|blob:|\/)/.test(source))return source
 try{const url=new URL(source,location.origin);if(url.origin===location.origin)return source;return apiUrl('/.netlify/functions/image-proxy?url='+encodeURIComponent(source))}catch{return ''}
}
function renderedOptions(event){const value=options.value[event.id];return {...value,logo:imageUrl(value.logo)}}
async function upload(event,key){
 const file=event.target.files?.[0];if(!file)return
 const targetId=current.value?.id
 try{if(!file.type.startsWith('image/'))throw Error('Selecciona una imagen.');if(file.size>12*1024*1024)throw Error('La imagen debe pesar menos de 12 MB.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});if(options.value[targetId]){options.value[targetId][key]=data;if(key==='logo')options.value[targetId].showLogo=true}}catch(e){error.value=e.message||'No se pudo leer la imagen.'}event.target.value=''
}
function beginReschedule(event){rescheduleId.value=event.id;const date=new Date(Date.now()+86400000);rescheduleDate.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);deleteId.value=''}
async function reactivate(event){
 const startsAt=new Date(rescheduleDate.value).getTime()
 if(!canManage.value||rowBusy.value||exporting.value)return
 if(!Number.isFinite(startsAt)||startsAt<=Date.now()){error.value='Elige una fecha y hora futuras para reactivar el evento.';return}
 rowBusy.value=event.id;error.value=''
 try{await updateDoc(doc(db,'galaxyEvents',event.id),{startsAt,updatedAt:Date.now()});await loadEvents();rescheduleId.value='';notice.value='Evento reactivado. Ya esta disponible en la lista de activos.'}catch{error.value='No se pudo reactivar el evento.'}finally{rowBusy.value=''}
}
async function removeExpired(event){
 if(!canManage.value||rowBusy.value||exporting.value||deleteId.value!==event.id)return
 rowBusy.value=event.id;error.value=''
 try{await deleteDoc(doc(db,'galaxyEvents',event.id));catalog.value=catalog.value.filter(e=>e.id!==event.id);deleteId.value='';notice.value='Evento eliminado.'}catch{error.value='No se pudo eliminar el evento.'}finally{rowBusy.value=''}
}
async function readyImages(element){await Promise.all([...element.querySelectorAll('img')].map(async image=>{if(!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});if(image.decode)await image.decode().catch(()=>{})}))}
const slug=value=>String(value||'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
async function exportImages(all=false){
 if(exporting.value||!current.value)return
 const events=all?[...selected.value]:[current.value]
 if(!events.length)return
 const fullOrder=[...selected.value],formatKey=format.value,dimensions={...size.value}
 exportItems.value=events.map(event=>({event:{...event},options:{...renderedOptions(event)},image:imageUrl(options.value[event.id].image),index:fullOrder.findIndex(e=>e.id===event.id),total:fullOrder.length}))
 exporting.value=true;error.value='';progress.value='Preparando invitaciones...'
 try{
  await nextTick();await document.fonts.ready
  const cards=[...exportBank.value.querySelectorAll('.event-invitation')]
  const zip=all?new JSZip():null
  for(let i=0;i<cards.length;i++){
   if(disposed)return
   progress.value='Generando imagen '+(i+1)+' de '+cards.length
   await readyImages(cards[i]);await nextTick()
   const png=await toPng(cards[i],{width:dimensions.width,height:dimensions.height,pixelRatio:1,skipFonts:true,backgroundColor:'#04091a'})
   if(disposed)return
   const item=exportItems.value[i],name=String(i+1).padStart(2,'0')+'-'+slug(item.event.title)+'-'+formatKey+'.png'
   if(zip)zip.file(name,png.split(',')[1],{base64:true})
   else download(await(await fetch(png)).blob(),name)
  }
  if(zip){progress.value='Preparando ZIP...';download(await zip.generateAsync({type:'blob'}),'invitaciones-eventos-'+formatKey+'.zip')}
 }catch{error.value='No se pudo exportar la invitacion. Prueba a subir la imagen desde tu dispositivo.'}finally{exporting.value=false;exportItems.value=[];progress.value=''}
}
onMounted(async()=>{
 window.addEventListener('resize',resizeInspector)
 observer=new ResizeObserver(entries=>{
  const width=Math.max(1,Math.min(520,Math.round(entries[0].contentRect.width)))
  if(Math.abs(width-previewWidth.value)<1)return
  cancelAnimationFrame(previewResizeFrame)
  previewResizeFrame=requestAnimationFrame(()=>{if(!disposed)previewWidth.value=width})
 })
 if(previewBox.value)observer.observe(previewBox.value)
 if(auth.currentUser){const user=await getDoc(doc(db,'users',auth.currentUser.uid)).catch(()=>null);canManage.value=user?.data()?.role==='admin'}
 await loadEvents(true)
 await nextTick();measurePreviewTop()
})
watch(()=>[current.value?.id,format.value],()=>nextTick(measurePreviewTop))
watch(()=>[route.params.id,route.query.ids],()=>loadEvents(true))
onUnmounted(()=>{window.removeEventListener('resize',resizeInspector);if(mobileInspectorOpen.value)document.body.style.overflow=inspectorOverflow;disposed=true;loadToken++;cancelAnimationFrame(previewResizeFrame);observer?.disconnect()})
const previewExpanded=ref(false)
const animationOpen=ref(false)
const animationElement=()=>previewBox.value?.querySelector('.event-invitation')
</script>

<template>
 <main class="event-share-page">
  <GalaxyAtmosphere/>
  <header class="inv-editor-header"><div><span class="inv-editor-kicker">GENERADOR MÁGICO · EVENTOS</span><h1>Una invitación para cada momento</h1><p>Prepara tu historia o publicación y anima a tu comunidad a participar.</p></div><button type="button" class="inv-editor-secondary" :disabled="exporting" @click="router.push('/eventos')">← Volver a eventos</button></header>
  <p v-if="error" role="alert" class="inv-editor-error">{{ error }}</p><p v-if="notice" role="status" class="inv-editor-notice">{{ notice }}</p>
  <details class="inv-picker"><summary><span>Eventos del carrusel <small>{{ chosen.length }} seleccionados</small></span><span>Seleccionar eventos⌄</span></summary>
   <div class="inv-picker-head"><div><h2>Eventos activos <small>{{ chosen.length }}/50 seleccionados</small></h2><p>Solo próximos y en curso. Cada evento tendrá su propia invitación.</p></div><button v-if="canManage" class="inv-editor-secondary" :disabled="exporting" type="button" :aria-expanded="showExpired" @click="showExpired=!showExpired">{{ showExpired?'Cerrar revisión':'Revisar caducados' }} ({{ expiredEvents.length }})</button></div>
   <div v-if="loading" role="status">Cargando eventos...</div>
   <template v-else><div class="inv-picker-tools"><input v-model="search" type="search" placeholder="Buscar evento activo" aria-label="Buscar evento activo" :disabled="exporting"/><button class="inv-editor-secondary" type="button" :disabled="exporting" @click="chosen=activeEvents.slice(0,50).map(e=>e.id)">Seleccionar activos</button><button class="inv-editor-secondary" type="button" :disabled="exporting" @click="chosen=[]">Limpiar</button></div><div class="inv-picker-list"><label v-for="event in filtered" :key="event.id"><input type="checkbox" :checked="chosen.includes(event.id)" :disabled="exporting||(!chosen.includes(event.id)&&chosen.length>=50)" @change="toggle(event.id)"/><span><strong>{{ event.title }}</strong><small>{{ displayDate(event) }} · {{ event.type }}</small></span></label></div><p v-if="!activeEvents.length">No hay eventos activos. Crea uno o reactiva un evento caducado.</p></template>
  </details>
  <section v-if="showExpired&&canManage" class="inv-expired"><h2>Revisar eventos caducados</h2><p>Estos eventos están fuera del carrusel. Reprográmalos con una fecha futura para reactivarlos.</p><p v-if="!expiredEvents.length">No hay eventos caducados.</p><article v-for="event in expiredEvents" :key="event.id" :data-expired-id="event.id"><div><strong>{{ event.title }}</strong><small>{{ displayDate(event) }}</small></div><div class="inv-expired-actions"><button type="button" class="inv-editor-secondary" :disabled="!!rowBusy||exporting" @click="beginReschedule(event)">Cambiar fecha y reactivar</button><button v-if="deleteId!==event.id" type="button" class="inv-delete" :disabled="!!rowBusy||exporting" @click="deleteId=event.id">Eliminar</button><template v-else><button type="button" class="inv-delete" :disabled="!!rowBusy" @click="removeExpired(event)">Eliminar definitivamente</button><button type="button" class="inv-editor-secondary" :disabled="!!rowBusy" @click="deleteId=''">Cancelar</button></template></div><form v-if="rescheduleId===event.id" class="inv-reschedule" @submit.prevent="reactivate(event)"><label>Nueva fecha y hora (hora local del dispositivo)<input v-model="rescheduleDate" type="datetime-local" required :disabled="!!rowBusy"/></label><button class="inv-editor-primary" type="submit" :disabled="!!rowBusy||!rescheduleDate">{{ rowBusy?'Guardando...':'Reactivar evento' }}</button></form></article></section>
  <div class="inv-editor-workspace">
   <aside class="inv-editor-controls"><fieldset :disabled="exporting||!current">
    <h2>Documento</h2><label>Formato<select v-model="format" aria-label="Formato de invitación"><option v-for="(item,key) in INVITATION_FORMATS" :key="key" :value="key">{{ item.label }} · {{ item.width }} × {{ item.height }}</option></select></label>
    <label>Márgenes de publicación<select aria-label="Márgenes de publicación" :value="currentOptions?.socialMargins!==false?'safe':'full'" :disabled="!!currentOptions?.tiktok&&format==='story'" @change="updateOptions({socialMargins:$event.target.value==='safe'})"><option value="safe">Con márgenes · TikTok</option><option value="full">Sin márgenes</option></select></label>
<p class="margin-help">{{ currentOptions?.tiktok&&format==='story'?'El diseño LIVE utiliza su propia zona reservada.':currentOptions?.socialMargins!==false?'Espacio reservado para el buscador, las reacciones y la descripción.':'El contenido aprovecha toda la composición.' }}</p>
    <button class="inv-editor-primary" type="button" :aria-pressed="!!currentOptions?.tiktok&&format==='story'" @click="toggleTikTok">{{ currentOptions?.tiktok&&format==='story'?'✓ Para TikTok · activado':'♪ Para TikTok' }}</button>
    <div v-if="currentOptions?.tiktok&&format==='story'" class="inv-tiktok-settings"><p>Reserva el hueco de la tarjeta LIVE. La guía no se exporta.</p><label><input type="checkbox" :checked="currentOptions.tiktokGuide!==false" @change="updateOptions({tiktokGuide:$event.target.checked})"/> Mostrar guía de registro</label><label>Espacio reservado · {{ currentOptions.tiktokCardScale||100 }} %<input type="range" min="85" max="120" :value="currentOptions.tiktokCardScale||100" @input="updateOptions({tiktokCardScale:Number($event.target.value)})"/></label><label>Altura de la tarjeta · {{ currentOptions.tiktokCardY||68 }} %<input type="range" min="60" max="68" :value="currentOptions.tiktokCardY||68" @input="updateOptions({tiktokCardY:Number($event.target.value)})"/></label></div>
    <p v-if="isMobile" class="inv-mobile-hint">Toca un elemento del diseño para abrir sus opciones.</p>

    <button v-if="isMobile&&current" type="button" class="inv-editor-secondary" @click="selectedElement='';mobileInspectorOpen=true">Ver capas</button><button v-if="isMobile&&current" class="inv-editor-secondary" type="button" @click="selectElement(selectedElement||'image')">Abrir opciones del diseño</button>
   </fieldset></aside>
   <section class="inv-editor-canvas"><div class="inv-canvas-head"><div><h2>{{ current?.title||'Selecciona un evento' }}</h2><p>Vista previa · {{ size.width }} × {{ size.height }} · Toca un elemento para editar</p></div><button type="button" class="inv-editor-secondary" :disabled="!current||exporting" @click="animationOpen=true">✦ Animar publicación</button><button type="button" class="inv-editor-secondary inv-preview-zoom" :aria-pressed="previewExpanded" @click="previewExpanded=!previewExpanded">{{ previewExpanded?'↙ Ajustar a pantalla':'↗ Ampliar lienzo' }}</button><div class="inv-export-actions"><button type="button" class="inv-editor-secondary" :disabled="!current||exporting" @click="exportImages(false)">Descargar esta imagen</button><button type="button" class="inv-editor-primary" :disabled="!selected.length||exporting" @click="exportImages(true)">Descargar carrusel · {{ selected.length }}</button></div></div>
    <div class="inv-preview-well"><div ref="previewBox" class="inv-preview-box" :style="{height:size.height*scale+'px',maxWidth:(isMobile?360:previewExpanded?480:Math.min(340,Math.max(240,viewportHeight-previewTop-110)*1080/size.height))+'px'}"><div v-if="current" class="inv-preview-scale" :style="{transform:'scale('+scale+')'}"><EventInvitationCard @update="updateOptions" editable :selected="selectedElement" @select="selectElement" :event="current" :options="renderedOptions(current)" :format="format" :image="imageUrl(currentOptions.image)" :index="selected.findIndex(e=>e.id===current.id)" :total="selected.length"/></div><p v-else class="inv-none">Elige un evento activo para empezar.</p></div></div>
    <nav v-if="selected.length" class="inv-filmstrip" aria-label="Invitaciones del carrusel"><button v-for="(event,index) in selected" :key="event.id" type="button" :class="{active:current?.id===event.id}" :disabled="exporting" @click="activeId=event.id"><span>{{ index+1 }}</span>{{ event.title }}</button></nav>
   </section>
   <aside v-if="!isMobile&&currentOptions" class="inv-properties"><fieldset :disabled="exporting"><EventInvitationInspector @align="alignElement" :format="positionFormat"  :element="selectedElement" :options="currentOptions" :count="selected.length" @select="selectElement" @close="closeInspector" @update="updateOptions" @upload="({event,key})=>upload(event,key)" @apply-all="applyStyleToAll" @search-image="openImageSearch"/></fieldset></aside>
  </div>
  <PublicationAnimationModal v-if="animationOpen" :get-element="animationElement" @close="animationOpen=false"/>
  <EventImageSearchModal v-if="imageSearchOpen&&current" :key="imageSearchEvent+imageSearchTarget" :game="eventGameNames(current)" :target="imageSearchTarget" @close="closeImageSearch" @select="useSearchImage"/>
  <Teleport to="body"><div v-if="mobileInspectorOpen&&isMobile&&currentOptions" class="inv-mobile-inspector" @click.self="closeInspector"><section ref="mobileSheet" role="dialog" aria-modal="true" aria-label="Configurar elemento del diseño" @keydown="inspectorKeys"><EventInvitationInspector mobile :format="positionFormat" @align="alignElement" :element="selectedElement" :options="currentOptions" :count="selected.length" @select="selectElement" @close="closeInspector" @update="updateOptions" @upload="({event,key})=>upload(event,key)" @apply-all="applyStyleToAll" @search-image="openImageSearch"/></section></div></Teleport>
  <div v-if="exporting" class="inv-export-overlay" role="status" aria-live="polite"><EventInvitationIcon name="star"/><strong>{{ progress }}</strong><p>Preparando tus invitaciones para redes.</p></div>
  <div v-if="exporting" ref="exportBank" class="inv-export-bank" aria-hidden="true"><EventInvitationCard v-for="item in exportItems" :key="item.event.id" :event="item.event" :options="item.options" :format="format" :image="item.image" :index="item.index" :total="item.total"/></div>
 </main>
</template>

<style scoped>
.event-share-page{position:relative;isolation:isolate;min-height:100vh;padding:100px max(16px,calc((100vw - 1460px)/2)) 40px;background:transparent;color:#f1f5f9;font-family:inherit;box-sizing:border-box}.event-share-page *{box-sizing:border-box}.inv-editor-header{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:24px}.inv-editor-kicker{color:#c4a1ff;font-size:11px;letter-spacing:.1em;font-weight:800}.inv-editor-header h1{font-size:clamp(24px,3vw,34px);font-weight:800;line-height:1.2;margin:7px 0}.inv-editor-header p,.inv-picker p,.inv-expired>p{color:#aebad1;font-size:13px;line-height:1.5;margin:6px 0}.inv-editor-secondary,.inv-editor-primary,.inv-delete{border:1px solid #a78bfa40;border-radius:10px;background:#1b1832;color:#ede9fe;padding:10px 13px;font-size:12px;font-weight:700;min-height:40px;cursor:pointer}.inv-editor-primary{background:linear-gradient(120deg,#7c3aed,#bb339c);border-color:#c4b5fd55}.event-share-page button:disabled{opacity:.45;cursor:default}.event-share-page button:focus-visible{outline:2px solid #d8b4fe;outline-offset:3px}.inv-editor-error,.inv-editor-notice{padding:12px 16px;border-radius:10px;border:1px solid #a78bfa44;background:#1c1733;color:#ddd6fe;font-size:13px;margin-bottom:16px}.inv-editor-error{border-color:#fb718555;color:#fda4af;background:#351529}.inv-picker,.inv-expired{border:1px solid #a78bfa26;background:#0c1020e8;border-radius:18px;padding:18px;margin-bottom:20px}.inv-picker-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.inv-picker h2,.inv-expired h2{font-size:16px;font-weight:750}.inv-picker h2 small{font-size:11px;color:#b8a8d8;margin-left:10px;font-weight:500}.inv-picker-tools{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.inv-picker-tools input{flex:1;min-width:120px}.inv-picker-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));max-height:190px;overflow:auto;gap:8px;margin-top:10px}.inv-picker-list label{display:flex;gap:9px;padding:10px;border-radius:10px;background:#ffffff06;font-size:12px;align-items:start;cursor:pointer}.inv-picker-list input{margin-top:3px;accent-color:#a78bfa;flex-shrink:0}.inv-picker-list span{min-width:0;overflow-wrap:anywhere}.inv-picker-list small,.inv-expired small{display:block;color:#aab5cf;font-size:11px;margin-top:5px}.inv-editor-workspace{display:grid;grid-template-columns:310px minmax(0,1fr);gap:20px;align-items:start}.inv-editor-controls{background:#0e1223;border:1px solid #a78bfa26;border-radius:18px;padding:18px;min-width:0}.inv-editor-controls fieldset{border:0;padding:0;margin:0;min-width:0;display:grid;gap:14px}.inv-editor-controls h2{font-size:17px;font-weight:750}.inv-editor-controls label{display:grid;gap:7px;font-size:12px;color:#cbd5e1;font-weight:600}.event-share-page input:not([type=checkbox]):not([type=range]):not([type=file]),.event-share-page textarea,.event-share-page select{width:100%;min-width:0;background:#070b18;color:#e2e8f0;border:1px solid #a78bfa33;border-radius:9px;padding:10px;font:inherit;font-size:12px}.event-share-page textarea{resize:vertical;line-height:1.5}.event-share-page input[type=range]{width:100%;accent-color:#a78bfa}.inv-editor-controls label.inv-toggle{display:flex;align-items:center;gap:8px;font-weight:500}.inv-toggle input{accent-color:#a78bfa}.inv-editor-controls details{border-top:1px solid #a78bfa22;padding-top:12px}.inv-editor-controls summary{cursor:pointer;font-size:12px;font-weight:700;color:#ddd6fe;margin-bottom:12px}.inv-editor-controls details label{margin-top:12px}.inv-editor-controls details p{font-size:11px;line-height:1.5;color:#9eabc3;margin-top:10px}.inv-status-help{display:flex;gap:9px;background:#a78bfa0c;border-radius:10px;padding:10px;font-size:11px;color:#b7a6d8;line-height:1.5}.inv-status-help svg{width:22px;height:22px;flex-shrink:0}.inv-upload input{width:100%;font-size:11px}.inv-editor-canvas{min-width:0;border:1px solid #a78bfa26;border-radius:18px;background:#090d1ccc;overflow:hidden}.inv-canvas-head{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;border-bottom:1px solid #a78bfa22}.inv-canvas-head h2{font-size:14px;font-weight:700;overflow-wrap:anywhere}.inv-canvas-head p{font-size:11px;color:#aab8d2;margin-top:5px}.inv-export-actions{display:flex;gap:8px;flex-wrap:wrap}.inv-preview-well{padding:24px;display:flex;justify-content:center;background:radial-gradient(ellipse at top,#39205744,transparent 65%)}.inv-preview-box{position:relative;overflow:hidden;width:100%;max-width:460px;border-radius:12px;background:#04091a;box-shadow:0 16px 50px #0005}.inv-preview-scale{position:absolute;left:0;top:0;width:1080px;transform-origin:top left}.inv-none{padding:24px;font-size:14px;color:#aab5c9}.inv-filmstrip{padding:14px;display:flex;gap:8px;overflow:auto;border-top:1px solid #a78bfa22}.inv-filmstrip button{flex:0 0 180px;text-align:left;background:#171b2d;border:1px solid #a78bfa22;border-radius:10px;padding:10px;color:#cbd5e1;font-size:11px;line-height:1.4}.inv-filmstrip button.active{border-color:#c4b5fd;background:#7c3aed30;color:white}.inv-filmstrip span{display:block;font-size:10px;color:#bda6ef;margin-bottom:4px}.inv-expired article{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #a78bfa22;padding:14px 0;font-size:13px}.inv-expired article>div:first-child{min-width:0;overflow-wrap:anywhere;flex:1 1 220px}.inv-expired-actions{display:flex;gap:8px;flex-wrap:wrap}.inv-delete{background:#6a263326;border-color:#fb718544;color:#fda4af}.inv-reschedule{display:flex;align-items:end;flex-wrap:wrap;gap:10px;width:100%;padding:12px;background:#a78bfa0b;border-radius:10px}.inv-reschedule label{font-size:12px;display:grid;gap:8px}.inv-export-overlay{position:fixed;inset:0;z-index:5000;background:#05091bef;backdrop-filter:blur(16px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}.inv-export-overlay svg{width:48px;height:48px;color:#d8b4fe}.inv-export-overlay strong{font-size:22px}.inv-export-overlay p{color:#aaa9c5;font-size:13px}.inv-export-bank{position:fixed;left:-20000px;top:0;width:1080px;pointer-events:none;z-index:-1}.inv-export-bank:deep(.event-invitation){display:block}@media(max-width:1000px){.inv-editor-workspace{grid-template-columns:280px minmax(0,1fr)}}@media(max-width:760px){.event-share-page{padding:88px 12px 28px}.inv-editor-header{align-items:start;gap:12px;flex-wrap:wrap}.inv-editor-header h1{font-size:25px}.inv-picker{padding:14px}.inv-picker-head{align-items:start;flex-wrap:wrap}.inv-editor-workspace{display:flex;flex-direction:column}.inv-editor-canvas{order:0;width:100%}.inv-editor-controls{order:1;width:100%}.inv-preview-well{padding:14px}.inv-canvas-head{padding:14px}.inv-picker h2 small{display:block;margin:5px 0 0}.inv-picker-list{max-height:165px}.inv-editor-controls fieldset{grid-template-columns:1fr}.inv-editor-header>.inv-editor-secondary{font-size:11px}.inv-expired-actions{width:100%}.inv-reschedule label{width:100%}}
.inv-editor-controls{position:sticky;top:90px;max-height:calc(100dvh - 110px);overflow:auto}.inv-mobile-inspector{position:fixed;inset:0;z-index:4500;background:#02061799;display:flex;align-items:end;justify-content:center;backdrop-filter:blur(5px)}.inv-mobile-inspector>section{box-sizing:border-box;width:100%;max-width:600px;max-height:75dvh;overflow:auto;overscroll-behavior:contain;background:#101426;color:#f1f5f9;border:1px solid #a78bfa55;border-radius:22px 22px 0 0;padding:20px 20px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -20px 70px #02061799}.inv-mobile-hint{font-size:12px;color:#aeb8d2;line-height:1.6}@media(max-width:760px){.inv-editor-controls{position:static;max-height:none;order:0}.inv-editor-canvas{order:1}}
.inv-tiktok-settings{display:grid;gap:12px;padding:12px;border:1px solid #c084fc44;border-radius:12px;background:#7c3aed0d}.inv-tiktok-settings p{font-size:12px;line-height:1.6;color:#b9c3d8;margin:0}.inv-tiktok-settings input[type=range]{width:100%;accent-color:#c084fc}

/* Workspace: document settings, canvas and contextual properties have distinct homes. */
.event-share-page{padding-left:max(16px,calc((100vw - 1800px)/2));padding-right:max(16px,calc((100vw - 1800px)/2))}.inv-editor-header{margin-bottom:16px}.inv-editor-header h1{font-size:27px}.inv-picker{padding:0;margin-bottom:18px}.inv-picker>summary{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 18px;list-style:none;cursor:pointer;font-size:13px;font-weight:700}.inv-picker>summary::-webkit-details-marker{display:none}.inv-picker>summary small{font-size:11px;color:#aebad1;font-weight:400;margin-left:10px}.inv-picker>summary>span:last-child{color:#c4b5fd;font-size:11px}.inv-picker[open]{padding:0 16px 16px}.inv-picker[open]>summary{margin:0 -16px 10px;border-bottom:1px solid #a78bfa22}.inv-picker-head{display:flex;justify-content:flex-end;margin-bottom:10px}.inv-picker-head>div{display:none}.inv-editor-workspace{grid-template-columns:220px minmax(0,1fr) 310px;align-items:start;gap:16px}.inv-editor-controls{position:sticky;top:86px;max-height:none;overflow:visible;padding:16px}.inv-editor-controls fieldset{gap:16px}.inv-editor-controls h2{font-size:15px}.inv-editor-controls select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23c4b5fd' stroke-width='2'%3E%3Cpath d='m6 8 4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:17px;padding-right:26px;min-height:40px}.inv-editor-controls select option{background:#111629;color:#f1f5f9}.inv-tiktok-settings{padding:10px;gap:12px}.inv-tiktok-settings p{font-size:11px}.inv-tiktok-settings label:has(input[type=checkbox]){display:flex;align-items:center;gap:8px}.inv-tiktok-settings input[type=checkbox]{width:16px;margin:0;accent-color:#a78bfa}.inv-properties{position:sticky;top:86px;min-width:0;max-height:calc(100dvh - 106px);overflow:auto;overscroll-behavior:contain;border:1px solid #a78bfa22;border-radius:18px;padding:16px;background:#101324;scrollbar-width:thin}.inv-properties fieldset{border:0;padding:0;margin:0;min-width:0}.inv-editor-canvas{position:sticky;top:86px;min-width:0}.inv-canvas-head{padding:14px;gap:10px;flex-wrap:wrap}.inv-canvas-head>div:first-child{flex:1 1 100%;min-width:0}.inv-canvas-head h2{font-size:14px}.inv-canvas-head p{font-size:11px}.inv-canvas-head button{font-size:11px;padding:8px 10px;min-height:36px}.inv-export-actions{margin-left:auto}.inv-preview-well{padding:16px}.inv-filmstrip{padding:10px}.inv-filmstrip button{flex-basis:150px;padding:8px}
@media(min-width:761px) and (max-width:1250px){.inv-editor-workspace{grid-template-columns:minmax(0,1fr) 300px}.inv-editor-controls{grid-column:1/-1;position:static}.inv-editor-controls fieldset{display:flex;align-items:center;flex-wrap:wrap;gap:14px}.inv-editor-controls h2{margin:0}.inv-editor-controls fieldset>label{width:220px}.inv-tiktok-settings{flex:1 1 100%;grid-template-columns:1fr 1fr 1fr;align-items:center}.inv-tiktok-settings>p{display:none}.inv-editor-canvas{grid-column:1}.inv-properties{grid-column:2}}
@media(max-width:760px){.inv-editor-workspace{display:flex;gap:12px}.inv-editor-controls,.inv-editor-canvas{position:static}.inv-editor-controls{order:0;padding:14px}.inv-editor-controls fieldset{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.inv-editor-controls h2{width:100%;margin:0}.inv-editor-controls fieldset>label{flex:1;min-width:150px}.inv-tiktok-settings{width:100%;grid-template-columns:1fr 1fr}.inv-tiktok-settings p,.inv-tiktok-settings label:first-of-type{grid-column:1/-1}.inv-mobile-hint{display:none}.inv-editor-header h1{font-size:23px}.inv-picker>summary{padding:12px;align-items:start}.inv-picker>summary small{display:block;margin:4px 0 0}.inv-properties{display:none}.inv-export-actions{margin-left:0;flex-wrap:wrap}.inv-canvas-head{gap:8px}}
@media(min-width:761px){.inv-editor-header .inv-editor-kicker,.inv-editor-header p{display:none}.inv-editor-header h1{font-size:23px;margin:0}.event-share-page{padding-top:88px}}

@media(min-width:1251px){.event-share-page{padding-left:max(20px,calc((100vw - 1520px)/2));padding-right:max(20px,calc((100vw - 1520px)/2))}.inv-editor-workspace{grid-template-columns:260px minmax(0,1fr) 260px;gap:16px}}
.inv-canvas-head>div:first-child{text-align:center}.inv-preview-well{justify-content:center}.inv-filmstrip{justify-content:center}.inv-editor-header{scroll-margin-top:100px}
</style>

<style scoped>.margin-help{font-size:12px;color:#bdc6db;line-height:1.5;margin:0}</style>
