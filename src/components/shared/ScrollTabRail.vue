<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
const root=ref(null),previous=ref(false),next=ref(false),overflow=ref(false)
let track,resizeObserver,mutationObserver,frame
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches
function update(){
 if(!track)return
 overflow.value=track.scrollWidth>track.clientWidth+2
 previous.value=track.scrollLeft>2
 next.value=track.scrollLeft+track.clientWidth<track.scrollWidth-2
}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(update)}
function move(direction){track?.scrollBy({left:direction*Math.max(120,track.clientWidth*.65),behavior:reduced()?'instant':'smooth'})}
function reveal(event){
 const button=event.target.closest('button,[role="tab"],a')
 if(!button||!track?.contains(button))return
 const bounds=track.getBoundingClientRect(),item=button.getBoundingClientRect(),edge=overflow.value?44:8
 const shift=item.left<bounds.left+edge?item.left-bounds.left-edge:item.right>bounds.right-edge?item.right-bounds.right+edge:0
 if(shift)track.scrollBy({left:shift,behavior:reduced()?'instant':'smooth'})
}
onMounted(async()=>{
 await nextTick();track=root.value.firstElementChild
 if(!track)return
 track.classList.add('scroll-rail-track')
 track.addEventListener('scroll',schedule,{passive:true})
 track.addEventListener('focusin',reveal);track.addEventListener('click',reveal)
 resizeObserver=new ResizeObserver(schedule);resizeObserver.observe(track)
 mutationObserver=new MutationObserver(()=>{for(const child of track.children)resizeObserver.observe(child);schedule()})
 mutationObserver.observe(track,{childList:true,subtree:true,characterData:true})
 for(const child of track.children)resizeObserver.observe(child)
 update()
})
onBeforeUnmount(()=>{cancelAnimationFrame(frame);resizeObserver?.disconnect();mutationObserver?.disconnect();track?.removeEventListener('scroll',schedule);track?.removeEventListener('focusin',reveal);track?.removeEventListener('click',reveal)})
</script>
<template>
 <div ref="root" class="scroll-tab-rail" :class="{'has-previous':previous,'has-next':next,'is-scrollable':overflow}">
  <slot/>
  <button v-show="previous" class="rail-arrow rail-previous" type="button" aria-label="Ver opciones anteriores" @click="move(-1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
  <button v-show="next" class="rail-arrow rail-next" type="button" aria-label="Ver más opciones" @click="move(1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
 </div>
</template>
<style scoped>
.scroll-tab-rail{position:relative;min-width:0;max-width:100%;overflow:hidden;isolation:isolate;border:1px solid color-mix(in srgb,var(--visual-primary,#a855f7) 50%,transparent);border-radius:999px;background:linear-gradient(110deg,#1b1029ed,#0c0d1af5);box-shadow:inset 0 1px 0 #e9d5ff12,0 6px 18px #0002}
.scroll-tab-rail :deep(.scroll-rail-track){display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;overflow-y:hidden;max-width:100%;min-width:0;width:100%;margin:0!important;padding:6px 8px!important;box-sizing:border-box;border:0!important;border-radius:inherit;background:transparent!important;box-shadow:none;scrollbar-width:none!important;scrollbar-gutter:auto;overscroll-behavior-x:contain;scroll-padding-inline:44px}
.scroll-tab-rail :deep(.scroll-rail-track::-webkit-scrollbar){display:none;width:0;height:0}
.scroll-tab-rail.is-scrollable :deep(.scroll-rail-track){padding-inline:8px 40px!important}
.scroll-tab-rail.has-next :deep(.scroll-rail-track){mask-image:linear-gradient(to right,#000 calc(100% - 42px),transparent)}
.scroll-tab-rail.has-previous :deep(.scroll-rail-track){mask-image:linear-gradient(to right,transparent,#000 42px)}
.scroll-tab-rail.has-next.has-previous :deep(.scroll-rail-track){mask-image:linear-gradient(to right,transparent,#000 42px,#000 calc(100% - 42px),transparent)}
.scroll-tab-rail :deep(.scroll-rail-track>button){flex:0 0 auto;min-height:38px;max-width:220px;padding:8px 14px;border:0;border-radius:999px;background:transparent;color:#d4cee2;font-size:12px;font-weight:650;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:none;transition:background .18s ease,color .18s ease,box-shadow .18s ease}
.scroll-tab-rail :deep(.scroll-rail-track>button.active),.scroll-tab-rail :deep(.scroll-rail-track>button[aria-selected=true]){background:linear-gradient(120deg,var(--visual-primary,#8b2be2),#c018dd);color:#fff;box-shadow:inset 0 1px 0 #ffffff33,0 0 12px #c026d944}
.scroll-tab-rail :deep(.scroll-rail-track>button:focus-visible){outline:2px solid #e9b4ff;outline-offset:-3px}
.scroll-tab-rail :deep(.scroll-rail-track>button:hover){background-color:#a855f71c;color:#fff}
.rail-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:2;display:grid;place-items:center;width:36px;height:38px;padding:6px;border:0;border-radius:999px;background:#181020eb;color:#e9b4ff;cursor:pointer}
.rail-previous{left:3px}.rail-next{right:3px}.rail-arrow svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.rail-arrow:focus-visible{outline:2px solid #e9b4ff;outline-offset:-2px}
@media(prefers-reduced-motion:reduce){.scroll-tab-rail :deep(button){transition:none}}
</style>
