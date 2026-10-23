<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { collection, doc, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { parseEventsJson,eventCreatePayload } from '@/services/eventJson'
const props=defineProps({communities:{type:Array,default:()=>[]}})
const emit=defineEmits(['close','saved','carousel'])
const text=ref(''),rows=ref([]),included=ref([]),error=ref(''),busy=ref(false),savedIds=ref([])
const dialog=ref(null)
let oldOverflow,previousFocus
function keys(e){if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const items=[...dialog.value.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(e=>e.offsetParent!==null);const first=items[0],last=items.at(-1);if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
onMounted(()=>{oldOverflow=document.body.style.overflow;previousFocus=document.activeElement;document.body.style.overflow='hidden';dialog.value.querySelector('button')?.focus();document.addEventListener('keydown',keys)})
onUnmounted(()=>{document.body.style.overflow=oldOverflow;previousFocus?.focus?.();document.removeEventListener('keydown',keys)})
const selected=computed(()=>rows.value.filter((_,i)=>included.value.includes(i)))
const example=JSON.stringify({"events":[{"title":"Los Pitufos: Dreams | Una joya oculta","type":"Directo","fecha":"2026-11-01","hora":"18:30","durationMinutes":90,"game":{"nameEs":"Los Pitufos: Dreams","nameEn":"The Smurfs: Dreams"}},{"title":"Los Pitufos: Dreams | Seguimos jugando","type":"Directo","fecha":"2026-11-03","hora":"18:30","durationMinutes":90,"game":{"nameEs":"Los Pitufos: Dreams","nameEn":"The Smurfs: Dreams"}}]},null,2)
async function paste(){try{text.value=await navigator.clipboard.readText();error.value=''}catch{error.value='Pega manualmente en el cuadro de JSON.'}}
async function fileInput(e){const file=e.target.files?.[0];if(!file)return;try{if(file.size>1024*1024)throw Error('El archivo supera 1 MB.');text.value=await file.text();error.value=''}catch(err){error.value=err.message}e.target.value=''}
function review(){error.value='';try{const parsed=parseEventsJson(text.value,props.communities);rows.value=parsed;included.value=parsed.map((_,i)=>i)}catch(e){error.value=e.message}}
async function save(){if(busy.value||savedIds.value.length||!selected.value.length)return;error.value='';busy.value=true;try{
 const uid=auth.currentUser?.uid;if(!uid)throw Error('Inicia sesion para crear eventos.')
 // One atomic commit: validation or a failed write cannot leave a partial import.
 const batch=writeBatch(db),now=Date.now(),ids=[]
 for(const event of selected.value){const target=doc(collection(db,'galaxyEvents'));ids.push(target.id);batch.set(target,eventCreatePayload(event,props.communities,uid,now))}
 await batch.commit();savedIds.value=ids;emit('saved',ids)
}catch(e){error.value=e.message||'No se pudieron crear los eventos. No se ha importado el lote.'}finally{busy.value=false}}
function close(){if(!busy.value)emit('close')}
</script>
<template>
 <Teleport to="body"><div class="events-bulk-backdrop" @keydown.esc="close"><section ref="dialog" class="events-bulk" role="dialog" aria-modal="true" aria-labelledby="events-bulk-title">
  <header><h2 id="events-bulk-title">Pegar varios eventos</h2><button type="button" :disabled="busy" aria-label="Cerrar" @click="close">×</button></header>
  <template v-if="!savedIds.length">
   <template v-if="!rows.length"><p>Pega una lista o un objeto con events/eventos. Hasta 50 eventos por lote. La hora sin zona usa la de tu dispositivo.</p>
    <label>JSON de eventos<textarea v-model="text" rows="9" spellcheck="false" :placeholder="example"/></label>
    <div class="bulk-actions"><button type="button" @click="paste">Pegar del portapapeles</button><button type="button" @click="text=example">Ver ejemplo</button><label class="bulk-file">Adjuntar JSON<input type="file" accept=".json,application/json" @change="fileInput"/></label></div>
    <button type="button" :disabled="!text.trim()" @click="review">Revisar eventos</button>
   </template>
   <template v-else><p>Revisa las fechas y elige los eventos que quieres crear. Aun no se ha publicado ninguno.</p><ul class="bulk-review"><li v-for="(event,index) in rows" :key="index"><label><input v-model="included" type="checkbox" :value="index" :disabled="busy"/><span><strong>{{ event.title }}</strong><small>{{ event.type }} · {{ event.startsAt.replace('T',' ') }} · {{ event.durationMinutes }} min</small><small v-if="event.game?.nameEs||event.game?.nameEn">Juego: {{ event.game.nameEs||event.game.nameEn }}</small><small>{{ event.description }}</small></span></label></li></ul>
    <div class="bulk-actions"><button type="button" :disabled="busy" @click="rows=[]">Corregir JSON</button><button type="button" :disabled="busy||!selected.length" @click="save">{{ busy?'Creando...':'Crear '+selected.length+' eventos' }}</button></div>
   </template>
  </template>
  <div v-else class="bulk-success" role="status"><p>{{ savedIds.length }} eventos creados.</p><button type="button" @click="emit('carousel',savedIds)">Crear carrusel con estos eventos</button><button type="button" @click="close">Cerrar</button></div>
  <p v-if="error" role="alert" class="bulk-error">{{ error }}</p>
 </section></div></Teleport>
</template>
<style scoped>
.events-bulk-backdrop{position:fixed;inset:0;z-index:4400;background:#020617d9;backdrop-filter:blur(10px);display:grid;place-items:center;padding:16px}.events-bulk{box-sizing:border-box;background:#0d1024;color:#f1f5f9;border:1px solid #a78bfa55;border-radius:20px;padding:22px;width:min(760px,100%);max-height:90dvh;overflow:auto;display:grid;gap:14px}.events-bulk header{display:flex;align-items:center;justify-content:space-between;gap:12px}.events-bulk h2{font-size:24px}.events-bulk p{font-size:14px;color:#cbd5e1;line-height:1.5}.events-bulk textarea{display:block;box-sizing:border-box;width:100%;min-width:0;background:#070b1b;color:#e2e8f0;padding:12px;border:1px solid #a78bfa55;border-radius:10px;font:13px/1.5 monospace;resize:vertical;margin-top:8px}.events-bulk button,.bulk-file{background:#7c3aed40;border:1px solid #a78bfa55;color:#ede9fe;border-radius:10px;padding:10px 14px;min-height:42px;font-weight:700;font-size:13px;cursor:pointer}.events-bulk button:disabled{opacity:.45;cursor:default}.bulk-actions{display:flex;gap:8px;flex-wrap:wrap}.bulk-file input{display:block;width:100%;max-width:200px;font-size:11px}.bulk-review{display:grid;gap:8px;max-height:48dvh;overflow:auto;list-style:none;padding:0}.bulk-review label{display:flex;gap:12px;align-items:start;padding:12px;background:#ffffff08;border-radius:10px}.bulk-review span{min-width:0;overflow-wrap:anywhere}.bulk-review small{display:block;color:#b8c5dd;margin-top:4px}.bulk-error{color:#fda4af!important}.bulk-success{display:grid;gap:12px}@media(max-width:480px){.events-bulk{padding:16px}.events-bulk h2{font-size:21px}}
</style>
