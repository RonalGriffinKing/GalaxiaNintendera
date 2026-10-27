<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
const props=defineProps({initialQuery:{type:String,default:''}})
const emit=defineEmits(['close','select'])
const query=ref(props.initialQuery),images=ref([]),games=ref([]),busy=ref(false),error=ref(''),searched=ref(false)
const gameFilter=ref('all'),typeFilter=ref('all'),selected=ref(null)
const searchInput=ref(null)
const previousFocus=typeof document!=='undefined'?document.activeElement:null
onMounted(()=>searchInput.value?.focus())
const types=[{id:'all',name:'Todas'},{id:'cover',name:'Carátulas'},{id:'screenshot',name:'Capturas'},{id:'artwork',name:'Arte'}]
const filtered=computed(()=>images.value.filter(image=>(gameFilter.value==='all'||String(image.gameId)===String(gameFilter.value))&&(typeFilter.value==='all'||image.type===typeFilter.value)))
let timer,controller,sequence=0
async function search(){
 clearTimeout(timer);controller?.abort()
 const id=++sequence,name=query.value.trim()
 if(name.length<2){busy.value=false;return}
 controller=new AbortController();busy.value=true;error.value='';searched.value=true
 try {
  const response=await fetch('/.netlify/functions/igdb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:name}),signal:controller.signal})
  const data=await response.json()
  if(!response.ok)throw Error(data.error||'No se pudieron buscar imágenes.')
  if(id!==sequence)return
  images.value=Array.isArray(data.images)?data.images:[];games.value=Array.isArray(data.games)?data.games:[]
  selected.value=images.value[0]||null
 }catch(e){if(id===sequence&&e.name!=='AbortError')error.value=e.message||'No se pudo conectar con el buscador.'}
 finally{if(id===sequence)busy.value=false}
}
watch(query,()=>{clearTimeout(timer);controller?.abort();sequence++;images.value=[];games.value=[];selected.value=null;gameFilter.value='all';typeFilter.value='all';error.value='';searched.value=false;busy.value=false;if(query.value.trim().length>=2)timer=setTimeout(search,550)},{immediate:true})
watch([gameFilter,typeFilter],()=>{selected.value=filtered.value[0]||null})
onUnmounted(()=>{clearTimeout(timer);controller?.abort();sequence++;if(previousFocus?.isConnected)previousFocus.focus()})
</script>
<template>
 <Teleport to="body"><div class="game-image-picker" @keydown.esc.stop="emit('close')">
  <button class="picker-shade" aria-label="Cerrar buscador de imágenes" @click="emit('close')"></button>
  <section class="picker-dialog" role="dialog" aria-modal="true" aria-labelledby="game-image-heading">
   <header><div><small>BIBLIOTECA DE JUEGOS · IGDB</small><h2 id="game-image-heading">Elegir imagen del evento</h2><p>Busca un juego y elige una carátula, captura o ilustración.</p></div><button type="button" aria-label="Cerrar buscador" @click="emit('close')">×</button></header>
   <form class="picker-search" @submit.prevent="search"><input ref="searchInput" v-model="query" aria-label="Buscar juego para la imagen del evento" placeholder="Nombre del juego en inglés o español"><button type="submit" :disabled="busy||query.trim().length<2">{{busy?'Buscando…':'Buscar'}}</button></form>
   <div v-if="games.length" class="picker-filters"><button type="button" :aria-pressed="gameFilter==='all'" @click="gameFilter='all'">Todos los juegos</button><button v-for="game in games" :key="game.id" type="button" :aria-pressed="String(gameFilter)===String(game.id)" @click="gameFilter=game.id">{{game.name}}</button></div>
   <div class="picker-filters"><button v-for="type in types" :key="type.id" type="button" :aria-pressed="typeFilter===type.id" @click="typeFilter=type.id">{{type.name}}</button></div>
   <p v-if="error" role="alert">{{error}}</p><p v-else-if="busy" role="status">Buscando imágenes…</p><p v-else-if="!filtered.length" role="status">{{searched?'No hay imágenes para esta búsqueda. Prueba otro nombre o filtro.':'Escribe al menos dos letras para buscar.'}}</p>
   <div v-if="filtered.length&&!busy" class="picker-workspace"><div class="picker-gallery"><button v-for="image in filtered" :key="image.id" type="button" :aria-pressed="selected?.id===image.id" @click="selected=image"><img :src="image.url" :alt="image.gameName||'Imagen del juego'" loading="lazy"><span>{{image.typeLabel}}</span></button></div><aside v-if="selected"><img :src="selected.url" alt="Vista previa"><strong>{{selected.gameName}}</strong><small>{{selected.typeLabel}}</small><button type="button" class="picker-use" @click="emit('select',selected)">Usar como fondo del evento</button></aside></div>
  </section>
 </div></Teleport>
</template>
<style scoped>
.game-image-picker{position:fixed;inset:0;z-index:6000;display:grid;place-items:center;padding:20px;color:#f8fafc}.picker-shade{position:absolute;inset:0;background:#020617c9;backdrop-filter:blur(10px)}.picker-dialog{position:relative;max-height:90dvh;overflow:auto;width:min(1080px,100%);padding:24px;border:1px solid #a78bfa40;border-radius:22px;background:#12172b;box-sizing:border-box}.picker-dialog header{display:flex;justify-content:space-between;gap:16px}.picker-dialog h2{font-size:23px;font-weight:750;margin:5px 0}.picker-dialog p{font-size:12px;color:#b9c4db;line-height:1.6}.picker-dialog small{font-size:10px;color:#c4b5fd}.picker-dialog button{padding:10px 13px;background:#ffffff09;border:1px solid #ffffff24;border-radius:10px;color:inherit;font-size:12px;cursor:pointer}.picker-dialog button:focus-visible,.picker-dialog input:focus-visible{outline:2px solid #c084fc;outline-offset:2px}.picker-dialog button:disabled{opacity:.5;cursor:wait}.picker-dialog button[aria-pressed=true]{border-color:#a855f7;background:#a855f722}.picker-search{display:flex;gap:10px;margin:18px 0}.picker-search input{min-width:0;flex:1;border:1px solid #ffffff26;border-radius:10px;padding:12px;background:#090e20;color:white;font-size:13px}.picker-search button,.picker-dialog .picker-use{background:linear-gradient(120deg,#7c3aed,#c02ba4);font-weight:650}.picker-filters{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.picker-filters button{padding:7px 10px}.picker-workspace{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:18px;margin-top:18px}.picker-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:52dvh;overflow:auto;align-content:start}.picker-gallery button{padding:5px;min-width:0}.picker-gallery img{width:100%;height:120px;object-fit:contain;background:#080c19;border-radius:6px}.picker-gallery span{display:block;font-size:10px;margin:5px}.picker-workspace aside{display:flex;flex-direction:column;gap:12px;align-self:start;padding:15px;background:#080c19;border-radius:12px;font-size:13px}.picker-workspace aside img{width:100%;height:200px;object-fit:contain}.picker-workspace strong{overflow-wrap:anywhere}@media(max-width:650px){.game-image-picker{padding:10px}.picker-dialog{padding:16px}.picker-workspace{grid-template-columns:1fr}.picker-gallery{grid-template-columns:repeat(2,minmax(0,1fr));max-height:38dvh}.picker-workspace aside img{height:130px}}
</style>
