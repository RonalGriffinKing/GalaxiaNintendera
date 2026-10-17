<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { resolvePostVisualTheme, postWebThemeCss } from '@/services/visualThemes'
import { normalizeHomeHero } from '@/services/homeHero'
import { defaultBannerUrl, resolveAssetUrl } from '@/constants/assets'
import { titleRuns } from '@/services/socialContent'
import FeaturedSheen from '@/components/shared/FeaturedSheen.vue'

const props=defineProps({slides:{type:Array,default:()=>[]},activeIndex:{type:Number,default:0},authorIcon:Function})
const emit=defineEmits(['select','read','pause','resume'])
const {themes,enabled}=useVisualThemes()
const root=ref(null)
let motion, startTouch, lastSwipe=0
const isAnalysis=slide=>[slide.post?.category,...(slide.post?.categories||[])].some(v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('analisis'))
const cards=computed(()=>{
 const count=props.slides.length
 const slots=count>2?['previous','main','next']:count===2?['main','next']:count===1?['main']:[]
 return slots.map(position=>{
  const index=(props.activeIndex+(position==='previous'?-1:position==='next'?1:0)+count)%count
  const slide=props.slides[index]
  return {slide,index,position,theme:enabled.value.web?postWebThemeCss(slide.post,resolvePostVisualTheme(slide.post,themes.value)):{},hero:normalizeHomeHero(slide.post?.hero)}
 })
})
function select(index){emit('select',index)}
function step(delta){if(props.slides.length>1)select((props.activeIndex+delta+props.slides.length)%props.slides.length)}
function activate(card,event){
 if(Date.now()-lastSwipe<600 || event.target.closest('button,a') || window.getSelection()?.toString())return
 if(card.position==='main')emit('read')
 else select(card.index)
}
function touchStart(event){const t=event.touches[0];startTouch={x:t.clientX,y:t.clientY};emit('pause')}
function touchEnd(event){
 if(!startTouch)return
 const t=event.changedTouches[0],x=t.clientX-startTouch.x,y=t.clientY-startTouch.y
 if(Math.abs(x)>50 && Math.abs(x)>Math.abs(y)*1.3){lastSwipe=Date.now();step(x<0?1:-1)}
 startTouch=null;resume()
}
function resume(){if(!document.hidden && !motion?.matches)emit('resume')}
function visibility(){if(document.hidden || motion?.matches)emit('pause');else resume()}
onMounted(()=>{motion=window.matchMedia('(prefers-reduced-motion:reduce)');motion.addEventListener('change',visibility);document.addEventListener('visibilitychange',visibility);visibility()})
onUnmounted(()=>{motion?.removeEventListener('change',visibility);document.removeEventListener('visibilitychange',visibility)})
</script>
<template>
 <section ref="root" class="hero-deck" :class="{'is-single':slides.length===1,'is-pair':slides.length===2}" role="region" aria-label="Noticias destacadas" aria-roledescription="carrusel" @mouseenter="emit('pause')" @mouseleave="resume" @focusin="emit('pause')" @focusout="!root.contains($event.relatedTarget) && resume()" @keydown.left.prevent="step(-1)" @keydown.right.prevent="step(1)">
  <div class="hero-deck-scene" @touchstart.passive="touchStart" @touchend.passive="touchEnd" @touchcancel.passive="startTouch=null;resume()">
   <div v-for="card in cards" :key="card.position" class="deck-slot" :class="'slot-'+card.position"><Transition name="deck-fade" type="transition"><article :key="card.slide.id" class="hero-deck-card" :class="['deck-'+card.position,{'is-analysis':isAnalysis(card.slide)}]" :style="card.theme" :inert="card.position==='hidden'" :aria-hidden="card.position==='hidden'" :aria-label="card.position==='main'?card.slide.title:undefined" @click="activate(card,$event)">
    <img class="deck-cover" :src="resolveAssetUrl(card.hero.image || card.slide.image,defaultBannerUrl)" :style="{objectPosition:card.hero.position}" alt="" :loading="card.position==='main'?'eager':'lazy'" :fetchpriority="card.position==='main'?'high':'auto'" decoding="async" />
    <div class="deck-shade"></div>
    <FeaturedSheen v-if="card.position==='main'" :gold="isAnalysis(card.slide)" />
    <span class="deck-category">{{ card.slide.eyebrow }}</span>
    <div class="deck-copy">
     <h1 v-if="card.position==='main'"><template v-for="(run,index) in titleRuns(card.slide.title,card.slide.highlights)" :key="index"><mark v-if="run.highlighted">{{ run.text }}</mark><template v-else>{{ run.text }}</template></template></h1>
     <h2 v-else>{{ card.slide.title }}</h2>
     <p>{{ card.slide.text }}</p>
     <div class="deck-meta"><img v-if="authorIcon?.(card.slide.post)" :src="authorIcon(card.slide.post)" alt="" /><span>{{ card.slide.post?.authorName || 'Redacción' }}<small>{{ card.slide.meta }}</small></span></div>
     <button v-if="card.position==='main'" class="deck-read" type="button" @click.stop="emit('read')"><span>Leer noticia</span><span aria-hidden="true">→</span></button>
     <button v-else class="deck-select" type="button" :aria-label="`Destacar: ${card.slide.title}`" @click.stop="select(card.index)">Ver destacado</button>
    </div>
   </article></Transition></div>
  </div>
  <nav v-if="slides.length>1" class="deck-controls" aria-label="Elegir noticia destacada"><button v-for="(slide,index) in slides" :key="slide.id" type="button" :aria-label="`Ver destacado: ${slide.title}`" :aria-current="index===activeIndex?'true':undefined" @click="select(index)"><span></span></button></nav>
 </section>
</template>
<style scoped>
.hero-deck{min-width:0;width:100%;overflow:hidden;padding:8px 0 0;color:#fff}
.hero-deck-scene{position:relative;height:520px;isolation:isolate;touch-action:pan-y;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.1fr) minmax(0,1fr);gap:16px;align-items:center}
.deck-slot{position:relative;min-width:0;height:440px}.slot-main{height:520px;grid-column:2;grid-row:1}.slot-previous{grid-column:1;grid-row:1}.slot-next{grid-column:3;grid-row:1}
.hero-deck-card{position:absolute;inset:0;width:100%;border:2px solid var(--visual-border,#a78bfa99);border-radius:20px;background:var(--visual-background,#080c1b);overflow:hidden;box-sizing:border-box;cursor:pointer}
.deck-main{z-index:2;border-width:3px;border-color:var(--visual-accent,#b185ff);box-shadow:0 12px 30px #0004;animation:deck-edge 8s ease-in-out infinite}
@keyframes deck-edge{0%,100%{border-color:var(--visual-accent,#b185ff)}50%{border-color:color-mix(in srgb,var(--visual-accent,#b185ff) 60%,#fff)}}
.deck-fade-enter-active,.deck-fade-leave-active{transition:opacity .24s ease}.deck-fade-enter-from,.deck-fade-leave-to{opacity:0}.deck-fade-leave-active{pointer-events:none}
.deck-cover,.deck-shade{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.deck-cover{object-fit:cover}.deck-shade{background:linear-gradient(180deg,#05081600 12%,#05081655 35%,color-mix(in srgb,var(--visual-background,#080c1b) 94%,transparent) 78%,var(--visual-background,#080c1b));z-index:1}
.deck-category{position:absolute;z-index:3;top:20px;left:22px;max-width:calc(100% - 44px);background:var(--visual-label-background,#7024dc);color:var(--visual-label-text,#fff);padding:7px 12px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.deck-copy{position:absolute;z-index:3;left:26px;right:26px;bottom:24px;display:grid;gap:13px;min-width:0}
.deck-copy h1,.deck-copy h2{margin:0;color:#fff;font-weight:700;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow-wrap:anywhere;font-size:clamp(25px,2.3vw,35px)}
.deck-copy h2{font-size:22px}.deck-copy mark{background:none;color:var(--visual-highlight,#c4a7ff);font:inherit}
.deck-copy p{margin:0;color:#e0e4ee;font-size:14px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.deck-meta{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;line-height:1.5}.deck-meta img{width:28px;height:28px;object-fit:cover;border-radius:50%}.deck-meta small{display:block;font-size:10px;color:#bac4d5;font-weight:400}
.deck-read{display:flex;align-items:center;justify-content:center;gap:12px;min-height:44px;border:1px solid var(--visual-border,#b185ff66);border-radius:999px;background:var(--visual-button-background,#7024dc);color:var(--visual-button-text,#fff);font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.is-analysis .deck-read{background:linear-gradient(110deg,#e8b923,#ffdf64);color:#211804;border-color:#ffda64}
.deck-read{position:relative;isolation:isolate;overflow:hidden}
.deck-read>span{position:relative;z-index:1}
.deck-read::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(100deg,#a91b47,#995000,#707000,#087349,#086b96,#354db0,#8033ad);transform:scaleX(0);transform-origin:left center;transition:transform .65s cubic-bezier(.22,.65,.3,1);pointer-events:none}
@media(hover:hover) and (pointer:fine){.deck-read:hover::before{transform:scaleX(1)}.deck-read:hover{color:#fff;text-shadow:0 1px 3px #0008}}
.deck-read:focus-visible::before{transform:scaleX(1)}
.deck-read:focus-visible{color:#fff;text-shadow:0 1px 3px #0008}
@media(prefers-reduced-motion:reduce){.deck-read::before{transition:none}}
.deck-select{background:transparent;border:0;color:#d9c7ff;font:inherit;font-size:11px;text-align:left;padding:0;min-height:28px;cursor:pointer}
.deck-previous .deck-copy,.deck-next .deck-copy{left:18px;right:18px}.deck-copy h1{min-height:3.45em}.deck-copy p{height:3.1em}
.deck-controls{display:flex;align-items:center;justify-content:center;gap:4px;padding:10px 16px}.deck-controls button{width:36px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;cursor:pointer}.deck-controls button span{width:26px;height:6px;border-radius:999px;background:#ffffff35}.deck-controls button[aria-current=true] span{background:linear-gradient(90deg,#7c3aed,#c084fc)}
.hero-deck button:focus-visible{outline:2px solid #d8b4fe;outline-offset:2px}.is-single .hero-deck-scene{grid-template-columns:1fr}.is-single .slot-main{grid-column:1}.is-pair .hero-deck-scene{grid-template-columns:minmax(0,2.1fr) minmax(0,1fr)}.is-pair .slot-main{grid-column:1}.is-pair .slot-next{grid-column:2}
@media(min-width:761px) and (max-width:1100px){.hero-deck-scene,.slot-main{height:500px}.deck-copy h1{font-size:26px}.deck-copy h2{font-size:19px}.deck-copy{left:20px;right:20px}.deck-copy p{font-size:13px}.deck-meta{font-size:10px}}
@media(max-width:760px){.hero-deck-scene,.is-pair .hero-deck-scene{height:460px;display:block}.deck-slot,.slot-main{height:460px;width:100%}.slot-previous,.slot-next{display:none}.hero-deck-card{border-radius:16px}.deck-copy{left:20px;right:20px;bottom:20px;gap:12px}.deck-copy h1{font-size:27px}.deck-copy p{font-size:13px}.deck-category{top:18px;left:20px}}
@media(max-width:360px){.hero-deck-scene,.deck-slot,.slot-main{height:480px}.deck-copy h1{font-size:24px}}
@media(max-width:760px),(hover:none) and (pointer:coarse){.deck-main{animation:none}}
@media(prefers-reduced-motion:reduce){.hero-deck-card{transition:none;animation:none}.deck-fade-enter-active,.deck-fade-leave-active{transition:none}}
</style>
