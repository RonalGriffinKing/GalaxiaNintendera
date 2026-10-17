<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
const props = defineProps({ items: { type:Array, default:()=>[] }, pageSize: { type:Number, default:1 }, label:String })
const viewport = ref(null)
const dotTrack = ref(null)
const active = ref(0)
const mobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width:760px)').matches)
const size = computed(() => mobile.value ? 1 : Math.max(1,props.pageSize))
const pages = computed(() => Array.from({length:Math.ceil(props.items.length/size.value)},(_,index)=>props.items.slice(index*size.value,(index+1)*size.value)))
let observer
let observedWidth = -1
let media
const updateMobile = () => { mobile.value = media.matches }
const pageLeft = index => viewport.value?.children[index]?.offsetLeft || 0
function select(index, behavior='smooth') {
 active.value=Math.max(0,Math.min(pages.value.length-1,index))
 viewport.value?.scrollTo({left:pageLeft(active.value),behavior})
}
function scrolled() {
 if (!viewport.value) return
 const left = viewport.value.scrollLeft
 active.value = pages.value.reduce((nearest,_,index) => Math.abs(pageLeft(index)-left)<Math.abs(pageLeft(nearest)-left) ? index : nearest,0)
}
watch(pages,async()=>{await nextTick();select(active.value,'instant')})
watch([active,pages],async()=>{
 await nextTick()
 const track=dotTrack.value, dot=track?.querySelector('[aria-current="page"]')
 if(track && dot) track.scrollTo({left:dot.offsetLeft-track.clientWidth/2+dot.clientWidth/2,behavior:'instant'})
})
onMounted(()=>{media=window.matchMedia('(max-width:760px)');updateMobile();media.addEventListener('change',updateMobile);observer=new ResizeObserver(([entry])=>{
 const width=entry.contentRect.width
 // Browser chrome can resize the visible height without changing card widths.
 // Only real width changes require repositioning the horizontal carousel.
 if(Math.abs(width-observedWidth)<.5) return
 observedWidth=width
 select(active.value,'instant')
});if(viewport.value)observer.observe(viewport.value)})
onUnmounted(()=>{observer?.disconnect();media?.removeEventListener('change',updateMobile)})
</script>

<template>
 <div class="content-carousel" :class="{'is-grid':pageSize>1,'can-slide':pages.length>1}" role="region" :aria-label="label" aria-roledescription="carrusel">
  <div ref="viewport" class="carousel-viewport" tabindex="0" @scroll.passive="scrolled" @keydown.right.prevent="select(active+1)" @keydown.left.prevent="select(active-1)">
   <div v-for="(page,pageIndex) in pages" :key="pageIndex" class="carousel-page" role="group" :aria-label="`Página ${pageIndex+1} de ${pages.length}`" :inert="pageIndex!==active"><slot v-for="(item,index) in page" :key="item.id" :item="item" :index="pageIndex*size+index" /></div>
  </div>
  <p v-if="!items.length" class="carousel-empty">Todavía no hay publicaciones.</p>
  <p v-if="pages.length>1" class="carousel-swipe-hint" aria-hidden="true">Desliza para ver más <span>↔</span></p>
  <nav v-if="pages.length" class="carousel-controls" :aria-label="`Navegar ${label}`"><div ref="dotTrack" class="carousel-dots"><button v-for="(_,index) in pages" :key="index" :aria-label="`Ver página ${index+1}`" :aria-current="index===active ? 'page' : undefined" :class="{active:index===active}" @click="select(index)"></button></div><span aria-live="polite">{{ active+1 }} / {{ pages.length }}</span></nav>
 </div>
</template>

<style scoped>
.content-carousel{min-width:0;display:flex;flex-direction:column;gap:14px;--editorial-card-height:338px}.content-carousel.is-grid{--editorial-card-height:162px}.carousel-viewport{display:flex;min-width:0;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;border-radius:14px}.carousel-viewport::-webkit-scrollbar{display:none}.carousel-page{display:grid;grid-template-columns:minmax(0,1fr);flex:0 0 100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always;box-sizing:border-box;align-content:start}.is-grid .carousel-page{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,162px);gap:14px;min-height:338px}.carousel-controls{display:flex;align-items:center;justify-content:center;gap:12px;min-height:36px;margin-top:auto}.carousel-controls>span{font-size:11px;color:#b9b4d0;white-space:nowrap}.carousel-dots{display:flex;gap:6px;max-width:180px;overflow:auto;padding:4px}.carousel-dots button{border:0;width:7px;height:7px;flex:0 0 7px;border-radius:999px;background:#ffffff40;padding:0;cursor:pointer}.carousel-dots button.active{background:linear-gradient(90deg,#9333ea,#ec4899);width:23px;flex-basis:23px}.carousel-empty{color:#aeb6c9;font-size:13px}.content-carousel button:focus-visible,.carousel-viewport:focus-visible{outline:2px solid #d8b4fe;outline-offset:-2px}
@media(max-width:640px){.is-grid .carousel-page{grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(4,150px);min-height:642px;gap:14px}.content-carousel.is-grid{--editorial-card-height:150px}.content-carousel:not(.is-grid){--editorial-card-height:300px}}
</style>

<style scoped>
.carousel-viewport{position:relative}
.carousel-dots{position:relative;scrollbar-width:none}
.carousel-dots::-webkit-scrollbar{display:none}
.carousel-swipe-hint{display:none}
@media(max-width:760px){
 .content-carousel.is-grid{--editorial-card-height:170px}
 .content-carousel:not(.is-grid){--editorial-card-height:300px}
 .is-grid .carousel-page{grid-template-columns:minmax(0,1fr);grid-template-rows:170px;min-height:170px}
 .can-slide .carousel-viewport{gap:12px}
 .can-slide .carousel-page{flex-basis:88%}
 .can-slide .carousel-viewport::after{content:'';flex:0 0 calc(12% - 12px)}
 .carousel-swipe-hint{display:flex;align-items:center;justify-content:space-between;margin:0;font-size:11px;color:#c4b5fd}
 .carousel-swipe-hint span{font-size:18px}
 .carousel-controls{gap:8px}
 .carousel-dots button{position:relative;width:20px;height:28px;flex-basis:20px;background:transparent}
 .carousel-dots button.active{width:26px;flex-basis:26px;background:transparent}
 .carousel-dots button::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:7px;height:7px;border-radius:999px;background:#ffffff40}
 .carousel-dots button.active::after{width:22px;background:linear-gradient(90deg,#9333ea,#ec4899)}
}
</style>
