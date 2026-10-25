<script setup>
import ContentLoading from '@/components/shared/ContentLoading.vue'
import {ref,shallowRef,computed,onMounted,onBeforeUnmount,nextTick} from 'vue'
import JSZip from 'jszip'
import {captureAnimationLayers,drawAnimation,encodeAnimation,animationFrame,DEFAULT_EFFECTS} from '@/services/publicationAnimation'
const props=defineProps({getElement:{type:Function,required:true},getElements:Function,initialIndex:{type:Number,default:0},name:{type:String,default:'galaxia-publicacion'}})
const emit=defineEmits(['close'])
const elements=props.getElements?.().filter(Boolean)||[props.getElement()]
const count=elements.length,mode=ref(count>1?'sequence':'current'),seconds=ref(count>1?5:8),slideIndex=ref(Math.min(props.initialIndex,count-1))
const canvas=ref(null),dialog=ref(null),layers=shallowRef(null),effects=ref({...DEFAULT_EFFECTS,backgroundMotion:'none',backgroundIntensity:50}),format=ref('mp4'),busy=ref(false),preparing=ref(true),playing=ref(false),time=ref(0),progress=ref(0),error=ref('')
const total=computed(()=>seconds.value*(mode.value==='sequence'?count:1))
const labels={hologram:'Reflejo holográfico en fondo',title:'Entrada animada del título',pill:'Píldora con resplandor vivo',button:'Brillo deslizante del botón',particles:'Partículas ascendentes',stars:'Pequeñas estrellas ascendentes',time:'Movimiento suave de la hora',loop:'Ciclo suave (repetición)'}
let loadedIndex=-1,raf,controller=new AbortController(),disposed=false,previousFocus,overflow,previewRequest=0
const frame=()=>animationFrame(time.value,mode.value==='sequence'?count:1,seconds.value)
function render(){if(layers.value&&canvas.value)drawAnimation(canvas.value.getContext('2d'),layers.value,frame().time,effects.value)}
function pause(){cancelAnimationFrame(raf);playing.value=false}
async function ensurePreview(){
 const index=mode.value==='sequence'?frame().index:slideIndex.value
 if(index===loadedIndex&&layers.value)return
 const request=++previewRequest;preparing.value=true
 try{
  const captured=await captureAnimationLayers(elements[index],controller.signal)
  if(disposed||request!==previewRequest)return
  layers.value=captured;loadedIndex=index;canvas.value.width=captured.width;canvas.value.height=captured.height
 }finally{if(request===previewRequest)preparing.value=false}
}
async function prepare(){pause();error.value='';try{await ensurePreview();render()}catch(e){if(e.name!=='AbortError')error.value=e.message}}
function play(){
 pause();if(time.value>=total.value)time.value=0;playing.value=true;let start=performance.now()-time.value*1000
 const tick=async now=>{
  if(!playing.value||disposed)return
  const elapsed=(now-start)/1000;time.value=effects.value.loop?elapsed%total.value:Math.min(total.value,elapsed)
  try{const before=performance.now();await ensurePreview();start+=performance.now()-before;if(!playing.value||disposed)return;render();if(effects.value.loop||time.value<total.value)raf=requestAnimationFrame(tick);else playing.value=false}catch(e){pause();if(e.name!=='AbortError')error.value=e.message}
 };raf=requestAnimationFrame(tick)
}
async function scrub(){pause();await prepare()}
async function resetPreview(){time.value=0;await prepare()}
function durationChanged(){seconds.value=Math.max(1,Math.min(60,Number(seconds.value)||5));resetPreview()}
function save(blob,suffix){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=props.name.replace(/[^\p{L}\p{N}_-]+/gu,'-')+suffix;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function download(){
 pause();busy.value=true;progress.value=0;error.value=''
 try{
  const indices=mode.value==='current'?[slideIndex.value]:elements.map((_,index)=>index)
  const capture=index=>captureAnimationLayers(elements[index],controller.signal)
  if(mode.value==='separate'){
   const zip=new JSZip()
   for(let position=0;position<indices.length;position++){
    const current=await capture(indices[position])
    const blob=await encodeAnimation(canvas.value,current,{format:format.value,duration:seconds.value,effects:{...effects.value},signal:controller.signal,onProgress:v=>progress.value=Math.round((position+v)/indices.length*90)})
    zip.file('diapositiva-'+String(position+1).padStart(2,'0')+'.'+format.value,blob)
   }
   const archive=await zip.generateAsync({type:'blob'},v=>{progress.value=Math.round(90+v.percent/10)})
   if(!disposed)save(archive,'-carrusel-animado.zip')
  }else{
   const first=await capture(indices[0])
   const blob=await encodeAnimation(canvas.value,first,{format:format.value,duration:seconds.value,effects:{...effects.value},signal:controller.signal,clips:indices.map((index,position)=>position===0?()=>first:()=>capture(index)),onProgress:v=>progress.value=Math.round(v*100)})
   if(!disposed)save(blob,(mode.value==='sequence'?'-carrusel':'-diapositiva-'+(slideIndex.value+1))+'-animado.'+format.value)
  }
 }catch(e){if(e.name!=='AbortError')error.value=e.message}finally{busy.value=false;time.value=0;if(!disposed)await prepare()}
}
function close(){controller.abort();pause();emit('close')}
function keys(e){if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const items=[...dialog.value.querySelectorAll('button,input,select,[tabindex]')].filter(n=>!n.disabled&&n.offsetParent);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
onMounted(async()=>{previousFocus=document.activeElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';await nextTick();dialog.value.focus();await prepare();if(!error.value&&!matchMedia('(prefers-reduced-motion: reduce)').matches)play()})
onBeforeUnmount(()=>{disposed=true;previewRequest++;controller.abort();pause();document.body.style.overflow=overflow;previousFocus?.focus();layers.value=null})
</script>
<template>
<Teleport to="body"><div class="animation-backdrop" @click.self="close"><section ref="dialog" class="publication-animation" role="dialog" aria-modal="true" aria-labelledby="animation-title" tabindex="-1" @keydown="keys">
<header><div><small>GALAXIA · VÍDEO</small><h2 id="animation-title">Animar publicación</h2><p>Cinemática suave · {{ total }} segundos · 30 fps · Sin audio</p></div><button aria-label="Cerrar animación" @click="close">✕</button></header>
<div class="animation-layout"><div class="animation-screen"><canvas ref="canvas" aria-label="Previsualización de la publicación animada"></canvas><ContentLoading v-if="preparing" variant="inline" /></div><div class="animation-settings">
<p v-if="count>1">Anima una diapositiva o todo el carrusel. Los vídeos separados se descargan juntos en un ZIP, en el orden del carrusel.</p><p v-else>El vídeo conserva tu diseño. El ciclo suave permite repetirlo sin un corte brusco.</p>
<fieldset :disabled="busy||preparing||!layers"><legend>Vídeo y efectos</legend>
<label v-if="count>1">Qué quieres animar<select v-model="mode" aria-label="Contenido de la animación" @change="resetPreview"><option value="current">Una diapositiva</option><option value="separate">Carrusel · vídeos separados (ZIP)</option><option value="sequence">Carrusel · un solo vídeo</option></select></label>
<label v-if="count>1&&mode!=='sequence'">{{ mode==='separate'?'Diapositiva para previsualizar':'Diapositiva' }}<select v-model.number="slideIndex" @change="resetPreview"><option v-for="(_,index) in elements" :key="index" :value="index">Diapositiva {{ index+1 }} de {{ count }}</option></select></label>
<label>Segundos por diapositiva<input v-model.number="seconds" aria-label="Segundos por diapositiva" type="number" min="1" max="60" step="1" @change="durationChanged" /></label>
<label v-for="(label,key) in labels" :key="key"><input v-model="effects[key]" type="checkbox" @change="render"/>{{ label }}</label>
<template v-if="layers?.background"><label>Movimiento del fondo<select v-model="effects.backgroundMotion" @change="render"><option value="none">Sin movimiento</option><option value="zoom">Zoom suave</option><option value="pan">Desplazamiento lateral</option><option value="float">Flotación suave</option></select></label><label v-if="effects.backgroundMotion!=='none'">Intensidad · {{ effects.backgroundIntensity }} %<input v-model.number="effects.backgroundIntensity" aria-label="Intensidad del movimiento del fondo" type="range" min="0" max="100" step="5" @input="render"/></label><p>Solo se mueve la imagen de fondo; el texto conserva su posición.</p></template>
<label>Exportación<select v-model="format" aria-label="Formato del vídeo"><option value="mp4">MP4 · H.264 para TikTok</option><option value="webm">WebM · MediaRecorder</option></select></label>
<div class="animation-playback"><button @click="playing?pause():play()">{{ playing?'Pausar':'Previsualizar' }}</button><span>{{ time.toFixed(1) }} / {{ total }} s</span></div><input v-model.number="time" aria-label="Posición de la animación" type="range" min="0" :max="total" step="0.033333" @input="scrub"/>
<button class="animation-export" @click="download">{{ mode==='separate'?'Descargar ZIP de vídeos':'Exportar '+format.toUpperCase() }}</button></fieldset>
<p v-if="busy" role="status">Exportando · {{ progress }} %</p><p v-if="format==='webm'">La grabación WebM se realiza en tiempo real. Mantén esta pestaña visible.</p><p v-if="error" class="animation-error" role="alert">{{ error }}</p><button v-if="error&&!layers" @click="prepare">Reintentar</button><button v-if="busy" @click="close">Cancelar exportación</button>
</div></div></section></div></Teleport>
</template>
<style scoped>
.animation-backdrop{position:fixed;inset:0;z-index:6500;background:#020617df;backdrop-filter:blur(12px);display:grid;place-items:center;padding:18px}.publication-animation{width:min(100%,1060px);max-height:94dvh;overflow:auto;overscroll-behavior:contain;background:#101426;border:1px solid #a78bfa55;border-radius:22px;padding:22px;color:#f1f5f9;box-sizing:border-box}.publication-animation header{display:flex;justify-content:space-between;align-items:start;gap:14px}.publication-animation h2{font-size:25px;margin:5px 0}.publication-animation small{color:#c4b5fd;font-weight:800}.publication-animation p{font-size:13px;line-height:1.6;color:#b9c3d8}.publication-animation button,.publication-animation select{background:#26203e;border:1px solid #b59bea55;border-radius:10px;padding:11px 14px;color:#fff;cursor:pointer;font:inherit}.publication-animation button:focus-visible,.publication-animation input:focus-visible,.publication-animation select:focus-visible{outline:2px solid #67e8f9;outline-offset:3px}.animation-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.8fr);gap:24px;margin-top:16px}.animation-screen{min-width:0;background:#050816;border-radius:12px;overflow:hidden;display:grid;place-items:center}.animation-screen canvas{display:block;max-width:100%;max-height:65dvh;width:auto;height:auto}.animation-settings{min-width:0}.animation-settings fieldset{border:0;margin:0;padding:0;display:grid;gap:17px}.animation-settings legend{font-weight:800;margin-bottom:14px}.animation-settings label{display:flex;align-items:center;gap:10px;font-size:14px;flex-wrap:wrap}.animation-settings select{width:100%}.animation-settings input[type=range]{width:100%;accent-color:#a78bfa}.animation-settings input[type=checkbox]{accent-color:#a78bfa;width:18px;height:18px}.animation-playback{display:flex;align-items:center;justify-content:space-between;font-size:13px}.animation-export{background:linear-gradient(110deg,#7c3aed,#c12ca3)!important;font-weight:800!important}.animation-error{color:#fda4af!important}fieldset:disabled{opacity:.5}@media(max-width:650px){.animation-backdrop{padding:8px}.publication-animation{padding:16px;max-height:96dvh}.animation-layout{grid-template-columns:1fr;gap:14px}.animation-screen canvas{max-height:45dvh}.publication-animation h2{font-size:21px}}
</style>

<style scoped>
.animation-settings input[type=number]{width:90px;min-height:42px;padding:8px 10px;background:#26203e;color:#fff;border:1px solid #b59bea55;border-radius:10px;font:inherit;box-sizing:border-box}
</style>
