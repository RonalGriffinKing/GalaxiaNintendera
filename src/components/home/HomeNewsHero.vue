<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { resolveAssetUrl, defaultBannerUrl } from '@/constants/assets'
import { titleRuns } from '@/services/socialContent'
import { homeHeroGallery } from '@/services/homeHero'
import { socialSummarySlides } from '@/services/socialSummary'
import ReadArticleIcon from '@/components/shared/ReadArticleIcon.vue'

const props = defineProps({ slide: Object })
const emit = defineEmits(['read','summary','pause','resume','next','previous'])
let swipeStart = null
function startSwipe(event) {
 swipeStart = event.touches.length === 1 && !event.target.closest('button,a,nav,.hero-post-controls')
   ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null
}
function endSwipe(event) {
 if (!swipeStart) return
 const end = event.changedTouches[0], dx = end.clientX-swipeStart.x, dy = end.clientY-swipeStart.y
 swipeStart = null
 if (Math.abs(dx)>65 && Math.abs(dx)>Math.abs(dy)*1.5) emit(dx<0 ? 'next' : 'previous')
}
const active = ref(0)
const failedLogo = ref(false)
const failedImages = ref({})
const galleryTrack = ref(null)
const focused = ref(false)
const gallery = computed(() => props.slide.post ? homeHeroGallery(props.slide.post) : { images: [], logoUrl: '' })
const images = computed(() => gallery.value.images.filter(item => !failedImages.value[item.url]))
const image = computed(() => images.value[active.value] || images.value[0])
const selectedImageUrl = computed(() => resolveAssetUrl(image.value?.url,defaultBannerUrl))
watch(() => images.value.length, length => { active.value = Math.min(active.value, Math.max(0,length-1)) })
function imageFailed() { if (image.value) failedImages.value[image.value.url] = true }
watch(() => props.slide.id, () => { active.value=0; failedLogo.value=false; failedImages.value={}; if(galleryTrack.value)galleryTrack.value.scrollLeft=0 })
watch(focused, value => emit(value ? 'pause' : 'resume'))
async function select(index) {
 active.value=Math.max(0,Math.min(images.value.length-1,index))
 await nextTick()
 const track=galleryTrack.value, selected=track?.querySelector('[aria-pressed="true"]')
 if(track && selected)track.scrollTo({left:selected.offsetLeft-track.clientWidth/2+selected.clientWidth/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
}
</script>

<template>
 <article class="home-news-hero" :class="{ 'has-logo':gallery.logoUrl && !failedLogo, 'has-gallery':images.length>1 }" @touchstart.passive="startSwipe" @touchend.passive="endSwipe" @touchcancel.passive="swipeStart=null" @pointerdown="focused=false" @focusin="focused=$event.target.matches(':focus-visible')" @focusout="focused=Boolean($event.currentTarget.contains($event.relatedTarget) && $event.relatedTarget?.matches(':focus-visible'))">
  <div class="hero-visual">
   <img class="hero-ambient" :src="selectedImageUrl" alt="" aria-hidden="true" decoding="async" />
   <img class="hero-background" :src="selectedImageUrl" alt="" @error="imageFailed" />
   <div class="hero-visual-blend"></div>
   <div v-if="images.length>1" class="hero-image-label"><span>Imágenes de esta noticia</span><b aria-live="polite">{{ active+1 }} / {{ images.length }}</b></div>
   <img v-if="gallery.logoUrl && !failedLogo" class="hero-game-logo" :src="resolveAssetUrl(gallery.logoUrl)" :alt="`Logo ${slide.post?.game?.nameEs || slide.post?.game?.nameEn || ''}`" @error="failedLogo=true" />

  </div>
  <div class="hero-scrim"></div>
  <div class="hero-copy">
   <span class="hero-badge">{{ slide.eyebrow }}</span>
   <h1><template v-for="(run,index) in titleRuns(slide.title,slide.highlights)" :key="index"><mark v-if="run.highlighted">{{ run.text }}</mark><template v-else>{{ run.text }}</template></template></h1>
   <p>{{ slide.text }}</p>
   <div class="hero-actions"><button class="hero-read" @click="emit('read')"><ReadArticleIcon />{{ slide.primaryLabel || 'Leer noticia' }}<span aria-hidden="true">→</span></button><button v-if="slide.post && socialSummarySlides(slide.post).length" class="hero-summary" @click="emit('summary',slide.post)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m4 16 5-5 4 4 3-3 4 4" /><circle cx="15.5" cy="8.5" r="1" /></svg>Ver resumen</button></div>
   <div class="hero-meta"><span>◷ {{ slide.meta }}</span><span>{{ slide.label }}</span><span v-if="slide.post?.authorName">{{ slide.post.authorName }}</span></div>
  </div>
   <nav v-if="images.length>1" class="hero-gallery" aria-label="Imágenes de esta noticia">
    <button class="gallery-arrow" :disabled="active===0" aria-label="Imagen anterior de esta noticia" @click="select(active-1)">‹</button>
    <div ref="galleryTrack" class="hero-thumbnails"><button v-for="(item,index) in images" :key="item.url" :class="{active:index===active}" :aria-label="`Ver imagen ${index+1}${item.alt ? ': '+item.alt : ''}`" :aria-pressed="index===active" @click="select(index)"><img :src="failedImages[item.url] ? defaultBannerUrl : resolveAssetUrl(item.url,defaultBannerUrl)" :alt="item.alt" @error="failedImages[item.url]=true" /></button></div>
    <button class="gallery-arrow" :disabled="active===images.length-1" aria-label="Imagen siguiente de esta noticia" @click="select(active+1)">›</button>
   </nav>
  <div class="hero-post-controls"><slot /></div>
 </article>
</template>

<style scoped>
.home-news-hero{position:relative;isolation:isolate;overflow:hidden;height:520px;min-height:520px;min-width:0;border:1px solid #55c9ff9c;border-radius:16px;background:#060a1b;color:#fff;box-shadow:0 0 28px #7c3aed25;box-sizing:border-box}
.hero-visual{position:absolute;inset:0 0 0 44%;overflow:hidden;isolation:isolate;background:#0c1323;z-index:1}
.hero-ambient{position:absolute;inset:-22px;width:calc(100% + 44px);height:calc(100% + 44px);object-fit:cover;filter:blur(25px) brightness(.48);pointer-events:none;z-index:0}
.hero-background{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;filter:none;z-index:1;pointer-events:none}
.hero-visual-blend{position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,#060a1b 0%,#060a1b7a 12%,transparent 30%),linear-gradient(0deg,#060a1be8 0%,transparent 28%,transparent 88%,#060a1b26 100%);pointer-events:none}
.hero-scrim{position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(90deg,#060a1b 0%,#060a1bf5 29%,#060a1bb3 43%,transparent 64%)}
.hero-copy{position:absolute;left:36px;top:36px;bottom:86px;width:47%;max-width:690px;min-width:0;z-index:3;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;display:flex;flex-direction:column;justify-content:safe center;align-items:start;gap:12px;box-sizing:border-box;padding:3px 6px 3px 0}
.hero-copy>*{flex-shrink:0}.hero-badge{display:inline-block;padding:7px 12px;border-radius:999px;background:#7024dc;font-size:11px;font-weight:800;text-transform:uppercase}.hero-copy h1{font-size:clamp(28px,2.5vw,40px);font-weight:950;line-height:1.12;margin:0;overflow-wrap:anywhere}.hero-copy mark{background:none;color:#facc15;font:inherit}.hero-copy p{font-size:14px;line-height:1.5;color:#e2e8f0;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:520px}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}.hero-actions button{font:inherit;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:9px;border-radius:999px;min-height:44px;padding:0 18px;color:#fff;cursor:pointer}.hero-read{background:linear-gradient(110deg,#6d28d9,#c026d3);border:1px solid #c084fc55}.hero-summary{background:#080d22ba;border:1px solid #a78bfa70}.hero-summary svg{width:18px;height:18px;flex-shrink:0}.hero-meta{display:flex;gap:10px 16px;flex-wrap:wrap;font-size:11px;color:#d9daeb;line-height:1.5;margin-top:3px}
.hero-game-logo{position:absolute;top:68px;right:24px;width:clamp(95px,12vw,175px);height:100px;object-fit:contain;object-position:right top;z-index:3;filter:drop-shadow(0 4px 10px #0008)}
.hero-image-label{position:absolute;top:16px;right:16px;z-index:4;display:flex;align-items:center;gap:14px;padding:9px 13px;border:1px solid #ffffff25;border-radius:999px;background:#060a1bc9;box-shadow:0 4px 14px #0003;font-size:11px;color:#e6e7f2}.hero-image-label b{white-space:nowrap;font-size:12px}
.hero-gallery{position:absolute;bottom:64px;left:20px;right:20px;z-index:4;display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;gap:8px;padding:6px;border-radius:14px;background:#050816b8;border:1px solid #ffffff20;box-sizing:border-box}
.hero-thumbnails{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:4px;position:relative;min-width:0;overscroll-behavior-x:contain}.hero-thumbnails::-webkit-scrollbar{display:none}.hero-thumbnails button{flex:0 0 82px;width:82px;height:56px;border:2px solid #ffffff26;box-shadow:none;background:#090d20;border-radius:9px;padding:0;overflow:hidden;cursor:pointer}.hero-thumbnails button.active{border-color:#d946ef;box-shadow:0 0 10px #d946ef99}.hero-thumbnails img{width:100%;height:100%;object-fit:contain}
.gallery-arrow{width:32px;height:36px;border:1px solid #ffffff30;border-radius:999px;background:#0b1026aa;color:white;font-size:26px;line-height:1;cursor:pointer}.gallery-arrow:disabled{opacity:.25;cursor:default}
.hero-post-controls{position:absolute;left:36px;right:36px;bottom:18px;z-index:4}.home-news-hero button:focus-visible{outline:2px solid #e9d5ff;outline-offset:2px}
@media(min-width:761px) and (max-width:1100px){.home-news-hero{height:520px;min-height:520px}.hero-copy{left:26px;top:26px;bottom:90px;width:50%;gap:10px}.hero-copy h1{font-size:29px}.hero-copy p{font-size:13px}.hero-actions button{font-size:11px;padding:0 12px}.hero-gallery{left:12px;right:12px;gap:4px}.hero-thumbnails button{flex-basis:64px;width:64px;height:46px}.hero-game-logo{width:110px;height:80px;right:16px}.hero-post-controls{left:26px;right:26px}}
@media(max-width:760px){.home-news-hero{height:680px;min-height:680px}.hero-visual{inset:0 0 auto 0;height:236px}.hero-ambient{filter:blur(25px) brightness(.42)}.hero-background{object-fit:contain}.hero-visual-blend{background:linear-gradient(0deg,#060a1b 0%,#060a1b30 26%,transparent 65%)}.hero-scrim{background:none}.hero-copy{top:248px;bottom:67px;left:20px;right:20px;width:auto;max-width:none;gap:11px;justify-content:start;padding:2px 0}.hero-copy h1{font-size:clamp(24px,6.2vw,31px)}.hero-copy p{font-size:13px;line-height:1.45;-webkit-line-clamp:2}.hero-badge{font-size:10px;padding:6px 10px}.hero-actions{display:flex;width:100%;gap:8px;margin:3px 0}.hero-actions button{flex:1;min-width:0;font-size:11px;padding:0 8px;gap:6px;min-height:42px}.hero-meta{font-size:10px;gap:7px 10px}.hero-game-logo{top:48px;right:14px;width:90px;height:65px}.hero-image-label{top:10px;right:10px;gap:10px;padding:6px 10px;font-size:10px}.hero-image-label b{font-size:10px}.hero-gallery{left:10px;right:10px;bottom:8px;grid-template-columns:26px minmax(0,1fr) 26px;gap:4px;padding:4px;border-radius:10px}.hero-thumbnails{gap:6px;padding:3px}.hero-thumbnails button{flex-basis:56px;width:56px;height:38px;border-radius:6px}.gallery-arrow{width:26px;height:30px;font-size:22px}.hero-post-controls{left:20px;right:20px;bottom:14px}}
@media(prefers-reduced-motion:reduce){.hero-thumbnails{scroll-behavior:auto}}
.hero-background{object-fit:cover;object-position:center}
.hero-visual-blend{background:linear-gradient(90deg,#060a1b 0%,#060a1ba6 9%,#060a1b33 22%,transparent 40%),linear-gradient(0deg,#060a1be8,transparent 30%)}
@media(max-width:760px){
 .hero-visual,.hero-copy{touch-action:pan-y}
 .home-news-hero{height:550px;min-height:550px}
 .hero-visual{inset:0;height:100%}
 .hero-visual-blend{background:linear-gradient(180deg,#060a1b0d 0%,#060a1b40 15%,#060a1bce 42%,#060a1bf5 76%,#060a1b 100%)}
 .hero-copy{top:175px;bottom:55px;left:18px;right:18px;max-height:none;gap:9px;justify-content:safe flex-end}
 .hero-copy h1{font-size:clamp(23px,6vw,29px);line-height:1.12}
 .hero-post-controls{left:18px;right:18px;bottom:12px}
 .hero-image-label span{display:none}
 .hero-background{object-fit:cover;object-position:center}
 .hero-gallery{bottom:auto;top:100px}
 .hero-thumbnails img{object-fit:cover}
}
.hero-thumbnails img{object-fit:cover}
.hero-gallery{left:calc(44% + 20px)}
@media(min-width:761px) and (max-width:1100px){.hero-gallery{left:calc(44% + 12px)}}
@media(max-width:760px){
 .hero-copy{top:120px;text-shadow:0 2px 10px #0009}
 .has-gallery .hero-copy{top:95px;bottom:125px}
 .hero-gallery{left:10px;right:10px;top:auto;bottom:54px}
}
</style>
