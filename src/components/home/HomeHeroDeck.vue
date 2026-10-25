<script setup>
import {computed,onMounted,onUnmounted,ref} from 'vue'
import {useRouter} from 'vue-router'
import {useVisualThemes} from '@/composables/useVisualThemes'
import {resolvePostVisualTheme,postWebThemeCss} from '@/services/visualThemes'
import {normalizeHomeHero} from '@/services/homeHero'
import {defaultBannerUrl,resolveAssetUrl} from '@/constants/assets'
import {titleRuns} from '@/services/socialContent'
import FeaturedSheen from '@/components/shared/FeaturedSheen.vue'
import AnalysisCrown from '@/components/shared/AnalysisCrown.vue'
const props=defineProps({slides:{type:Array,default:()=>[]},activeIndex:{type:Number,default:0},authorIcon:Function})
const emit=defineEmits(['select','read'])
const {themes,enabled}=useVisualThemes()
const opening=ref(false)
const router=useRouter()
let removeNavigationError,removeNavigationEnd
let openTimer,motion,startTouch,lastSwipe=0
const isAnalysis=slide=>[slide.post?.category,...(slide.post?.categories||[])].some(v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('analisis'))
const card=computed(()=>{
 const slide=props.slides[props.activeIndex]||props.slides[0]
 if(!slide)return null
 return {slide,theme:enabled.value.web?postWebThemeCss(slide.post,resolvePostVisualTheme(slide.post,themes.value)):{},hero:normalizeHomeHero(slide.post?.hero)}
})
function select(index){if(!opening.value)emit('select',index)}
function step(delta){if(props.slides.length>1)select((props.activeIndex+delta+props.slides.length)%props.slides.length)}
function openArticle(){
 if(opening.value||Date.now()-lastSwipe<600)return
 if(motion?.matches){emit('read');return}
 opening.value=true;openTimer=setTimeout(()=>emit('read'),680)
}
function activate(event){if(!event.target.closest('button,a')&&!window.getSelection()?.toString())openArticle()}
function touchStart(event){const t=event.touches[0];startTouch={x:t.clientX,y:t.clientY}}
function touchEnd(event){
 if(!startTouch)return
 const t=event.changedTouches[0],x=t.clientX-startTouch.x,y=t.clientY-startTouch.y
 if(Math.abs(x)>50&&Math.abs(x)>Math.abs(y)*1.3){lastSwipe=Date.now();step(x<0?1:-1)}
 startTouch=null
}
function deactivate(element){element.inert=true;element.setAttribute('aria-hidden','true')}
onMounted(()=>{motion=window.matchMedia('(prefers-reduced-motion:reduce)');removeNavigationError=router.onError(()=>{opening.value=false});removeNavigationEnd=router.afterEach((_to,_from,failure)=>{if(failure)opening.value=false})})
onUnmounted(()=>{clearTimeout(openTimer);removeNavigationError?.();removeNavigationEnd?.()})
</script>
<template>
 <section v-if="card" class="hero-deck" role="region" aria-label="Noticias destacadas" aria-roledescription="carrusel" @keydown.left.prevent="step(-1)" @keydown.right.prevent="step(1)">
  <div class="hero-deck-scene" :style="card.theme" @touchstart.passive="touchStart" @touchend.passive="touchEnd" @touchcancel.passive="startTouch=null">
   <div class="deck-slot slot-main" aria-live="polite" aria-atomic="true"><Transition name="deck-fade" @before-leave="deactivate"><article :key="card.slide.id" class="hero-deck-card deck-main" :class="{'is-analysis':isAnalysis(card.slide)}" :style="card.theme" :aria-label="card.slide.title" @click="activate">
    <img class="deck-cover" :src="resolveAssetUrl(card.hero.image||card.slide.image,defaultBannerUrl)" :style="{objectPosition:card.hero.position}" alt="" loading="eager" fetchpriority="high" decoding="async" />
    <div class="deck-shade"></div>
    <div v-if="opening" class="deck-aurora" aria-hidden="true"><i v-for="n in 8" :key="n" class="aurora-star" :style="{'--star':n}">&#10022;</i><div class="aurora-message"><span>&#10023;</span><strong>La magia comienza...</strong><small>GALAXIA NINTENDERA</small></div></div>
    <FeaturedSheen :gold="isAnalysis(card.slide)" />
    <span class="deck-category"><AnalysisCrown v-if="isAnalysis(card.slide)" />{{ isAnalysis(card.slide)?'Análisis destacado':card.slide.eyebrow }}</span>
    <div class="deck-copy">
     <h1><template v-for="(run,index) in titleRuns(card.slide.title,card.slide.highlights)" :key="index"><mark v-if="run.highlighted">{{ run.text }}</mark><template v-else>{{ run.text }}</template></template></h1>
     <p>{{ card.slide.text }}</p>
     <div class="deck-meta"><img v-if="authorIcon?.(card.slide.post)" :src="authorIcon(card.slide.post)" alt="" /><span>{{ card.slide.post?.authorName||'Redacción' }}<small>{{ card.slide.meta }}</small></span></div>
     <button class="deck-read" type="button" @click.stop="openArticle"><span>{{ isAnalysis(card.slide)?'Leer análisis':'Leer noticia' }}</span><span aria-hidden="true">&#8594;</span></button>
    </div>
   </article></Transition></div>
   <template v-if="slides.length>1"><button class="deck-arrow deck-arrow-previous" type="button" aria-label="Destacado anterior" :disabled="opening" @click="step(-1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button><button class="deck-arrow deck-arrow-next" type="button" aria-label="Siguiente destacado" :disabled="opening" @click="step(1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7"/></svg></button></template>
  </div>
  <nav v-if="slides.length>1" :style="card.theme" class="deck-controls" aria-label="Elegir noticia destacada"><button v-for="(slide,index) in slides" :key="slide.id" type="button" :aria-label="'Ver destacado: '+slide.title" :aria-current="index===activeIndex?'true':undefined" :disabled="opening" @click="select(index)"><span></span></button></nav>
 </section>
</template>
<style scoped>

.hero-deck{min-width:0;width:100%;margin-inline:auto;padding:0;color:#fff}
.hero-deck-scene{position:relative;height:clamp(420px,36vw,530px);isolation:isolate;touch-action:pan-y}
.deck-slot{position:relative;width:100%;height:100%;min-width:0}
.hero-deck-card{position:absolute;inset:0;width:100%;height:100%;border:2px solid var(--visual-border,#a78bfa99);border-radius:24px;background:var(--visual-background,#080c1b);overflow:hidden;box-sizing:border-box;cursor:pointer}
.deck-main{border-color:var(--visual-accent,#b185ff)}
.deck-fade-enter-active,.deck-fade-leave-active{transition:opacity .28s ease}.deck-fade-enter-from,.deck-fade-leave-to{opacity:0}.deck-fade-leave-active{pointer-events:none}
.deck-cover,.deck-shade{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.deck-cover{object-fit:cover}.deck-shade{z-index:1;background:linear-gradient(90deg,color-mix(in srgb,var(--visual-background,#080c1b) 75%,transparent),transparent 85%),linear-gradient(0deg,var(--visual-background,#080c1b),color-mix(in srgb,var(--visual-background,#080c1b) 75%,transparent) 18%,transparent 85%)}
.deck-category{position:absolute;z-index:3;top:30px;left:76px;max-width:calc(100% - 152px);background:var(--visual-label-background,#7024dc);color:var(--visual-label-text,#fff);padding:8px 14px;border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.deck-copy{position:absolute;z-index:3;left:76px;bottom:36px;width:min(68%,780px);display:grid;gap:14px;min-width:0}
.deck-copy h1{margin:0;color:#fff;font-weight:750;line-height:1.13;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow-wrap:anywhere;font-size:clamp(30px,3.4vw,46px);text-wrap:pretty}
.deck-copy mark{background:none;color:var(--visual-highlight,#c4a7ff);font:inherit}.deck-copy p{margin:0;color:#e0e4ee;font-size:16px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:680px}
.deck-meta{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:600;line-height:1.5}.deck-meta img{width:30px;height:30px;object-fit:cover;border-radius:50%}.deck-meta small{display:block;font-size:11px;color:#bac4d5;font-weight:400}
.deck-read{display:flex;align-items:center;justify-content:center;gap:20px;justify-self:start;min-height:52px;padding:12px 30px;border:1px solid var(--visual-border,#b185ff66);border-radius:999px;background:var(--visual-button-background,#7024dc);color:var(--visual-button-text,#fff);font:inherit;font-size:15px;font-weight:750;cursor:pointer}.is-analysis .deck-read{background:linear-gradient(115deg,#f5dda4,#d4a555);color:#211804;border-color:#ffda64}
.deck-arrow{position:absolute;z-index:4;top:50%;transform:translateY(-50%);width:44px;height:44px;padding:0;display:grid;place-items:center;background:transparent;border:0;border-radius:50%;color:color-mix(in srgb,var(--visual-accent,#c4b5fd) 38%,#fff);cursor:pointer}.deck-arrow::before{content:"";position:absolute;inset:4px;background:color-mix(in srgb,var(--visual-primary,#7c3aed) 24%,#080c1bd9);border:1px solid color-mix(in srgb,var(--visual-accent,#c4b5fd) 60%,transparent);border-radius:50%;backdrop-filter:blur(8px);transition:background .18s ease}.deck-arrow-previous{left:22px}.deck-arrow-next{right:22px}.deck-arrow svg{position:relative;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.deck-arrow:hover::before{background:color-mix(in srgb,var(--visual-primary,#7c3aed) 40%,#101326ed)}.deck-arrow:disabled{cursor:default;opacity:.5}
.deck-controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;padding:4px 16px 0}.deck-controls button{width:44px;height:40px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;cursor:pointer}.deck-controls button span{width:24px;height:6px;border-radius:999px;background:#ffffff35}.deck-controls button[aria-current=true] span{width:32px;background:linear-gradient(90deg,var(--visual-primary,#7c3aed),var(--visual-accent,#c084fc))}
.hero-deck button:focus-visible{outline:2px solid #d8b4fe;outline-offset:3px}
@media(max-width:760px){.hero-deck{padding-top:0}.hero-deck-scene{height:clamp(470px,64svh,550px)}.hero-deck-card{border-radius:20px}.deck-shade{background:linear-gradient(0deg,var(--visual-background,#080c1b),color-mix(in srgb,var(--visual-background,#080c1b) 85%,transparent) 25%,#05081622 80%)}.deck-copy{left:24px;right:24px;bottom:26px;width:auto;gap:12px}.deck-copy h1{font-size:28px;-webkit-line-clamp:4}.deck-copy p{font-size:14px}.deck-category{top:22px;left:24px;max-width:calc(100% - 48px)}.deck-arrow{top:27%;width:44px;height:44px}.deck-arrow-previous{left:18px}.deck-arrow-next{right:18px}.deck-read{font-size:13px;justify-self:center}}
@media(max-width:360px){.deck-copy{left:20px;right:20px}.deck-copy h1{font-size:25px}.deck-category{left:20px}}
@media(prefers-reduced-motion:reduce){.hero-deck-card{transition:none;animation:none}.deck-fade-enter-active,.deck-fade-leave-active{transition:none}}
.deck-aurora{position:absolute;inset:0;z-index:6;border-radius:inherit;overflow:hidden;pointer-events:none;background:radial-gradient(ellipse at 18% 80%,#3456ffcc,transparent 65%),radial-gradient(ellipse at 80% 30%,#28e2efdd,transparent 60%),linear-gradient(125deg,#152951ee,#7428dbee 40%,#ec3aaadd 65%,#128eacfa);animation:deck-aurora-reveal .68s cubic-bezier(.2,.7,.25,1) both}
.deck-aurora::before{content:'';position:absolute;inset:-60%;background:linear-gradient(125deg,transparent 35%,#89edff44 44%,#fff9 48%,#edb5ff66 51%,transparent 61%);transform:translateX(-35%) rotate(-15deg);animation:deck-aurora-flow .68s ease-out both}
.aurora-message{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;text-align:center;text-shadow:0 2px 12px #34175d66;animation:deck-aurora-message .68s ease-out both}
.aurora-message>span{font-size:36px;line-height:1}.aurora-message strong{font-size:18px;font-weight:700}.aurora-message small{font-size:10px;letter-spacing:.08em}
.aurora-star{position:absolute;left:calc(8% + var(--star)*10%);top:56%;font-style:normal;font-size:16px;color:#fff;text-shadow:0 0 10px #c6faff;animation:deck-aurora-spark .68s ease-out both}
.aurora-star:nth-child(even){top:24%;font-size:11px}.aurora-star:nth-child(3n){top:77%;font-size:20px}
@keyframes deck-aurora-reveal{0%{clip-path:circle(0% at 50% 50%);opacity:0}20%{opacity:.65}70%,100%{clip-path:circle(85% at 50% 50%);opacity:1}}
@keyframes deck-aurora-flow{to{transform:translateX(35%) rotate(-15deg)}}
@keyframes deck-aurora-message{0%,40%{opacity:0;transform:translateY(6px)}85%,100%{opacity:1;transform:translateY(0)}}
@keyframes deck-aurora-spark{0%,25%{opacity:0;transform:scale(.3)}70%{opacity:1;transform:scale(1.15)}100%{opacity:.8;transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.deck-aurora,.deck-aurora::before,.aurora-message,.aurora-star{animation:none}}

.deck-main{box-shadow:0 0 24px color-mix(in srgb,var(--visual-accent,#a855f7) 28%,transparent),0 14px 30px #0005}
.deck-main.is-analysis{border-color:#e7ce96;box-shadow:0 0 0 1px #f3dfb166,0 0 30px #c69b5033,0 12px 42px #0006;animation:analysis-aura 6s ease-in-out infinite}
.deck-main.is-analysis::after{content:"";position:absolute;inset:7px;border:1px solid #ffe8a344;border-radius:12px;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 80% 0,#ffd45722,transparent 45%)}
.deck-main.is-analysis .deck-category{display:flex;align-items:center;gap:8px;background:linear-gradient(115deg,#f8e8c4,#d6b46c);color:#271b04;border:1px solid #fff0cb;box-shadow:0 3px 16px #d4aa5733;letter-spacing:.05em}
.deck-category svg{width:22px;height:18px;flex:none}
.deck-main.is-analysis :deep(.featured-sheen.is-gold .foil-prism){opacity:.16}
@keyframes analysis-aura{0%,100%{box-shadow:0 0 0 1px #f3dfb155,0 0 24px #c69b5026,0 12px 42px #0006}50%{box-shadow:0 0 0 1px #f3dfb188,0 0 38px #e1c27b44,0 12px 42px #0006}}
@media(prefers-reduced-motion:reduce),(max-width:760px){.deck-main.is-analysis{animation:none}}

</style>
