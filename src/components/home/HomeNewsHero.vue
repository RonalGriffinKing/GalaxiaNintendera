<script setup>
import FeaturedSheen from '@/components/shared/FeaturedSheen.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { resolveAssetUrl, defaultBannerUrl } from '@/constants/assets'
import { titleRuns } from '@/services/socialContent'
import { homeHeroGallery } from '@/services/homeHero'
import ReadArticleIcon from '@/components/shared/ReadArticleIcon.vue'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { postWebThemeCss } from '@/services/visualThemes'

const props = defineProps({ slide: Object })
const {theme,enabled}=useVisualThemes(()=>props.slide?.post)
const themeStyle=computed(()=>enabled.value.web?postWebThemeCss(props.slide?.post,theme.value):{})
const emit = defineEmits(['read','pause','resume','next','previous'])
const isAnalysis = computed(()=>[...(props.slide?.post?.categories || []),props.slide?.post?.category || ''].some(value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('analisis')))
let lastSwipeAt=0
function openSurface(event){
 if(Date.now()-lastSwipeAt<600 || event.defaultPrevented || event.target.closest('button,a,nav,input,select,textarea,.hero-post-controls') || window.getSelection()?.toString())return
 emit('read')
}
let swipeStart = null
function startSwipe(event) {
 swipeStart = event.touches.length === 1 && !event.target.closest('button,a,nav,.hero-post-controls')
   ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null
}
function endSwipe(event) {
 if (!swipeStart) return
 const end = event.changedTouches[0], dx = end.clientX-swipeStart.x, dy = end.clientY-swipeStart.y
 swipeStart = null
 if (Math.abs(dx)>65 && Math.abs(dx)>Math.abs(dy)*1.5) { lastSwipeAt=Date.now();emit(dx<0 ? 'next' : 'previous') }
}
const active = ref(0)
const failedLogo = ref(false)
const failedImages = ref({})
const focused = ref(false)
const gallery = computed(() => props.slide.post ? homeHeroGallery(props.slide.post) : { images: [], logoUrl: '' })
const images = computed(() => gallery.value.images.filter(item => !failedImages.value[item.url]))
const image = computed(() => images.value[active.value] || images.value[0])
const selectedImageUrl = computed(() => resolveAssetUrl(image.value?.url,defaultBannerUrl))
watch(() => images.value.length, length => { active.value = Math.min(active.value, Math.max(0,length-1)) })
function imageFailed() { if (image.value) failedImages.value[image.value.url] = true }
watch(() => props.slide.id, () => { active.value=0; failedLogo.value=false; failedImages.value={}; restartImages() })
watch(focused, value => emit(value ? 'pause' : 'resume'))
const IMAGE_DURATION = 4500
const reducedMotion = ref(false)
const pageHidden = ref(false)
let imageTimer, motionQuery, imageRequest = 0
const canRotate = computed(() => images.value.length > 1 && !focused.value && !pageHidden.value && !reducedMotion.value)
function restartImages() {
 clearTimeout(imageTimer)
 const request = ++imageRequest
 if (!canRotate.value) return
 imageTimer = setTimeout(async () => {
  const next = (active.value + 1) % images.value.length
  const candidate = images.value[next]
  if (!candidate) return
  const preload = new Image()
  preload.fetchPriority = 'low'
  preload.src = resolveAssetUrl(candidate.url, defaultBannerUrl)
  try {
   await preload.decode()
   if (request !== imageRequest) return
   active.value = next
  } catch {
   if (request !== imageRequest) return
   failedImages.value[candidate.url] = true
  }
  if (request === imageRequest) restartImages()
 }, IMAGE_DURATION)
}
function visibilityChanged() { pageHidden.value = document.hidden }
function motionChanged(event) { reducedMotion.value = event.matches }
watch(canRotate, restartImages)
watch(() => images.value.map(item => item.url).join('|'), restartImages)
onMounted(() => {
 motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
 reducedMotion.value = motionQuery.matches
 pageHidden.value = document.hidden
 motionQuery.addEventListener('change', motionChanged)
 document.addEventListener('visibilitychange', visibilityChanged)
 restartImages()
})
onUnmounted(() => {
 clearTimeout(imageTimer)
 imageRequest++
 motionQuery?.removeEventListener('change', motionChanged)
 document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
 <article class="home-news-hero" @click="openSurface" :style="themeStyle" :class="{ 'visual-themed':Object.keys(themeStyle).length, 'is-analysis':isAnalysis, 'has-logo':gallery.logoUrl && !failedLogo }" @touchstart.passive="startSwipe" @touchend.passive="endSwipe" @touchcancel.passive="swipeStart=null" @pointerdown="focused=false" @focusin="focused=$event.target.matches(':focus-visible')" @focusout="focused=Boolean($event.currentTarget.contains($event.relatedTarget) && $event.relatedTarget?.matches(':focus-visible'))">
  <div class="hero-visual">
   <img class="hero-ambient" :src="selectedImageUrl" alt="" aria-hidden="true" decoding="async" />
   <Transition name="hero-image"><img :key="selectedImageUrl" class="hero-background" :src="selectedImageUrl" :style="{objectPosition:image?.position || 'center top'}" alt="" loading="eager" fetchpriority="high" decoding="async" @error="imageFailed" /></Transition>
   <div class="hero-visual-blend"></div>
   <img v-if="gallery.logoUrl && !failedLogo" class="hero-game-logo" :src="resolveAssetUrl(gallery.logoUrl)" :alt="`Logo ${slide.post?.game?.nameEs || slide.post?.game?.nameEn || ''}`" @error="failedLogo=true" />

  </div>
  <div class="hero-scrim"></div>
  <FeaturedSheen :gold="isAnalysis" />
  <div class="hero-copy">
   <span class="hero-badge">{{ slide.eyebrow }}</span>
   <h1><template v-for="(run,index) in titleRuns(slide.title,slide.highlights)" :key="index"><mark v-if="run.highlighted">{{ run.text }}</mark><template v-else>{{ run.text }}</template></template></h1>
   <p>{{ slide.text }}</p>
   <div class="hero-actions"><button class="hero-read" @click="emit('read')"><ReadArticleIcon />{{ slide.primaryLabel || 'Leer noticia' }}<span aria-hidden="true">→</span></button></div>
   <div class="hero-meta"><span>◷ {{ slide.meta }}</span><span>{{ slide.label }}</span><span v-if="slide.post?.authorName">{{ slide.post.authorName }}</span></div>
  </div>
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
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}.hero-actions button{font:inherit;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:9px;border-radius:999px;min-height:44px;padding:0 18px;color:#fff;cursor:pointer}.hero-read{background:linear-gradient(110deg,#6d28d9,#c026d3);border:1px solid #c084fc55}.hero-meta{display:flex;gap:10px 16px;flex-wrap:wrap;font-size:11px;color:#d9daeb;line-height:1.5;margin-top:3px}
.hero-game-logo{position:absolute;top:68px;right:24px;width:clamp(95px,12vw,175px);height:100px;object-fit:contain;object-position:right top;z-index:3;filter:drop-shadow(0 4px 10px #0008)}


.hero-image-enter-active,.hero-image-leave-active{transition:opacity .8s ease}.hero-image-enter-from,.hero-image-leave-to{opacity:0}.hero-image-leave-active{z-index:2}@media(prefers-reduced-motion:reduce){.hero-image-enter-active,.hero-image-leave-active{transition:none}}
.hero-post-controls{position:absolute;left:36px;right:36px;bottom:18px;z-index:4}.home-news-hero button:focus-visible{outline:2px solid #e9d5ff;outline-offset:2px}
@media(min-width:761px) and (max-width:1100px){.home-news-hero{height:520px;min-height:520px}.hero-copy{left:26px;top:26px;bottom:90px;width:50%;gap:10px}.hero-copy h1{font-size:29px}.hero-copy p{font-size:13px}.hero-actions button{font-size:11px;padding:0 12px}.hero-game-logo{width:110px;height:80px;right:16px}.hero-post-controls{left:26px;right:26px}}
@media(max-width:760px){.home-news-hero{height:680px;min-height:680px}.hero-visual{inset:0 0 auto 0;height:236px}.hero-ambient{filter:blur(25px) brightness(.42)}.hero-background{object-fit:contain}.hero-visual-blend{background:linear-gradient(0deg,#060a1b 0%,#060a1b30 26%,transparent 65%)}.hero-scrim{background:none}.hero-copy{top:248px;bottom:67px;left:20px;right:20px;width:auto;max-width:none;gap:11px;justify-content:start;padding:2px 0}.hero-copy h1{font-size:clamp(24px,6.2vw,31px)}.hero-copy p{font-size:13px;line-height:1.45;-webkit-line-clamp:2}.hero-badge{font-size:10px;padding:6px 10px}.hero-actions{display:flex;width:100%;gap:8px;margin:3px 0}.hero-actions button{flex:1;min-width:0;font-size:11px;padding:0 8px;gap:6px;min-height:42px}.hero-meta{font-size:10px;gap:7px 10px}.hero-game-logo{top:48px;right:14px;width:90px;height:65px}.hero-post-controls{left:20px;right:20px;bottom:14px}}

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

 .hero-background{object-fit:cover;object-position:center}

}

@media(max-width:760px){
 .hero-copy{top:120px;text-shadow:0 2px 10px #0009}

}
</style>

<style scoped>
.visual-themed.home-news-hero{background:var(--visual-background);border-color:var(--visual-border)}
.visual-themed .hero-copy mark{color:var(--visual-highlight)}
.visual-themed .hero-badge{background:var(--visual-label-background);color:var(--visual-label-text)}
.visual-themed .hero-read{background:var(--visual-button-background);color:var(--visual-button-text);border-color:var(--visual-border)}
.visual-themed .hero-visual{background:var(--visual-background)}
.visual-themed .hero-scrim{background:linear-gradient(90deg,var(--visual-background),color-mix(in srgb,var(--visual-background) 96%,transparent) 29%,transparent 64%)}
.visual-themed .hero-visual-blend{background:linear-gradient(90deg,var(--visual-background),color-mix(in srgb,var(--visual-background) 65%,transparent) 9%,transparent 40%),linear-gradient(0deg,var(--visual-background),transparent 30%)}

@media(max-width:760px){.visual-themed .hero-scrim{background:none}.visual-themed .hero-visual-blend{background:linear-gradient(180deg,transparent 0%,color-mix(in srgb,var(--visual-background) 25%,transparent) 15%,color-mix(in srgb,var(--visual-background) 82%,transparent) 42%,var(--visual-background) 100%)}}
</style>

<style scoped>
.visual-themed .hero-post-controls :deep(.home2-hero-progress span){background:linear-gradient(90deg,var(--visual-primary),var(--visual-accent))}
.visual-themed .hero-post-controls :deep(.home2-hero-dots button.active::before){background:linear-gradient(90deg,var(--visual-primary),var(--visual-accent));box-shadow:0 0 12px var(--visual-primary)}
@media(min-width:761px){.visual-themed .hero-post-controls :deep(.home2-hero-dots button.active){background:linear-gradient(90deg,var(--visual-primary),var(--visual-accent))}}
</style>

<style scoped>
.home-news-hero{cursor:pointer}.home-news-hero.is-analysis .hero-read{background:linear-gradient(110deg,#e8b923,#ffdf64);color:#211804;border-color:#ffda64;box-shadow:0 3px 14px #d4a51c25}
</style>
