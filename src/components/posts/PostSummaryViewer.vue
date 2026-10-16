<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { resolveAssetUrl, defaultBannerUrl } from '@/constants/assets'
import { socialSummarySlides } from '@/services/socialSummary'
import { titleRuns } from '@/services/socialContent'
import ReadArticleIcon from '@/components/shared/ReadArticleIcon.vue'

const props = defineProps({ post: { type: Object, required: true } })
const emit = defineEmits(['close', 'read'])
const dialog = ref(null)
const active = ref(0)
const slides = computed(() => socialSummarySlides(props.post))
const slide = computed(() => slides.value[active.value])
const readingArea = ref(null)
const thumbs = ref([])
const failed = ref({})
let touch = null
let oldOverflow = ''
let opener = null
const imageFor = item => resolveAssetUrl(item?.image, defaultBannerUrl)
function select(index) { active.value = Math.max(0, Math.min(slides.value.length - 1, index)) }
function keys(event) {
 if (event.key === 'ArrowRight') { event.preventDefault(); select(active.value + 1) }
 if (event.key === 'ArrowLeft') { event.preventDefault(); select(active.value - 1) }
}
function swipe(event) {
 if (!touch) return
 const end = event.changedTouches[0]
 const dx = end.clientX - touch.x, dy = end.clientY - touch.y
 if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) select(active.value + (dx < 0 ? 1 : -1))
 touch = null
}
watch(active, async () => { await nextTick(); readingArea.value?.scrollTo({ top: 0 }); thumbs.value[active.value]?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) })
onMounted(() => { opener = document.activeElement; oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.value.showModal() })
onUnmounted(() => { document.body.style.overflow = oldOverflow; if (opener?.isConnected) opener.focus({ preventScroll: true }) })
</script>

<template>
 <Teleport to="body">
  <dialog ref="dialog" class="summary-dialog" aria-labelledby="summary-heading" @cancel.prevent="emit('close')" @keydown="keys" @click="($event.target === dialog) && emit('close')">
   <header class="summary-header"><div><h2 id="summary-heading">Resumen visual de la noticia</h2><p>Los puntos clave, imagen a imagen.</p></div><button class="summary-read" @click="emit('read')"><ReadArticleIcon /> <span>Leer noticia completa</span></button><button class="summary-close" aria-label="Cerrar resumen" autofocus @click="emit('close')">×</button></header>
   <div class="summary-workspace" v-if="slide">
    <nav class="summary-thumbs" aria-label="Imágenes del resumen"><button v-for="(item,index) in slides" :key="index" :ref="el => thumbs[index] = el" :aria-label="`Ver imagen ${index+1}: ${item.title}`" :aria-current="index===active ? 'step' : undefined" :class="{active:index===active}" @click="select(index)"><img :src="failed[index] ? defaultBannerUrl : imageFor(item)" alt="" @error="failed[index]=true" /><span>{{ index+1 }}</span></button></nav>
    <section class="summary-stage" :data-accent="slide.accent" @touchstart.passive="touch = {x:$event.touches[0].clientX,y:$event.touches[0].clientY}" @touchend.passive="swipe">
     <img class="summary-ambient" :src="failed[active] ? defaultBannerUrl : imageFor(slide)" alt="" aria-hidden="true" />
     <img class="summary-background" :src="failed[active] ? defaultBannerUrl : imageFor(slide)" alt="" @error="failed[active]=true" />
     <div class="summary-shade"></div>
     <div class="summary-top"><strong>GALAXIA<br />NINTENDERA</strong><div class="summary-progress" aria-hidden="true"><span v-for="(_,index) in slides" :key="index" :class="{filled:index<=active}"></span></div><span aria-live="polite">{{ active+1 }}/{{ slides.length }}</span></div>
     <div ref="readingArea" class="summary-reading" tabindex="0" aria-label="Contenido de la imagen">
      <div class="summary-copy" :key="active"><span class="summary-eyebrow">{{ slide.eyebrow }}</span><h3><span v-for="(run,index) in titleRuns(slide.title,slide.titleHighlights)" :key="index" :class="{emphasis:run.highlighted}">{{ run.text }}</span></h3><p v-if="slide.content">{{ slide.content }}</p><ol v-if="slide.points.length" :class="{opinions:slide.type==='closing'}"><li v-for="(point,index) in slide.points" :key="index"><b aria-hidden="true">{{ slide.type==='closing' ? '✦' : index+1 }}</b><span>{{ point }}</span></li></ol><p v-if="slide.cta" class="summary-comment">{{ slide.cta }}</p></div>
     </div>
     <footer class="summary-controls"><button :disabled="active===0" @click="select(active-1)">← Anterior</button><span class="summary-mobile-count">{{ active+1 }} / {{ slides.length }}</span><button v-if="active<slides.length-1" class="next" @click="select(active+1)">Siguiente →</button><button v-else class="next" @click="emit('read')">Leer noticia →</button></footer>
    </section>
   </div>
  </dialog>
 </Teleport>
</template>

<style scoped>
.summary-dialog{position:fixed;inset:0;width:min(1280px,calc(100vw - 64px));height:min(900px,calc(100dvh - 56px));max-width:none;max-height:none;margin:auto;padding:20px;border:1px solid #a855f755;border-radius:24px;background:#090c1b;color:#fff;box-shadow:0 30px 100px #0009;font-family:Inter,system-ui,sans-serif;box-sizing:border-box;overflow:hidden}.summary-dialog[open]{display:flex;flex-direction:column;gap:18px}.summary-dialog::backdrop{background:#02040de8;backdrop-filter:blur(12px)}.summary-header{display:flex;align-items:center;gap:14px;flex-shrink:0}.summary-header>div{flex:1;min-width:0}.summary-header h2{font-size:20px;margin:0 0 5px}.summary-header p{font-size:13px;color:#c9c6df;margin:0}.summary-dialog button{font:inherit;cursor:pointer;color:inherit;background:#171527;border:1px solid #b88aff50;border-radius:14px;padding:11px 18px}.summary-dialog button:focus-visible,.summary-reading:focus-visible{outline:3px solid #d8b4fe;outline-offset:-3px}.summary-header .summary-close{font-size:28px;line-height:1;width:44px;height:44px;padding:0;flex-shrink:0}.summary-read{font-size:13px!important;font-weight:700!important}.summary-workspace{display:grid;grid-template-columns:110px minmax(0,1fr);gap:16px;min-height:0;flex:1}.summary-thumbs{overflow-y:auto;display:flex;flex-direction:column;gap:9px;padding:4px}.summary-thumbs button{position:relative;flex-shrink:0;padding:0;aspect-ratio:1.6;border-radius:10px;overflow:hidden;width:100%;border:2px solid transparent}.summary-thumbs button.active{border-color:#d946ef;box-shadow:0 0 15px #c026d355}.summary-thumbs img{width:100%;height:100%;object-fit:cover}.summary-thumbs span{position:absolute;top:4px;left:4px;background:#080c20d9;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:12px}.summary-stage{position:relative;min-width:0;min-height:0;overflow:hidden;isolation:isolate;border:1px solid #c4b5fd45;border-radius:18px;display:flex;flex-direction:column;background:#111426}.summary-background,.summary-shade{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.summary-shade{z-index:-1;background:linear-gradient(180deg,#05081633 0%,#05081618 20%,#050816bb 52%,#050816f5 85%)}.summary-top{padding:24px;display:flex;align-items:center;gap:24px;flex-shrink:0;text-shadow:0 2px 8px #000}.summary-top strong{font-size:16px;line-height:1}.summary-top>span{font-weight:800;white-space:nowrap}.summary-progress{display:flex;gap:5px;flex:1}.summary-progress span{height:7px;border-radius:999px;background:#b5b8cb66;flex:1}.summary-progress .filled{background:linear-gradient(90deg,#a855f7,#e349d5)}.summary-reading{overflow:auto;flex:1;min-height:0;display:flex;flex-direction:column;overscroll-behavior:contain}.summary-copy{margin-top:auto;padding:clamp(16px,3vw,36px);text-shadow:0 2px 10px #0007}.summary-eyebrow{display:inline-block;padding:7px 13px;border-radius:999px;background:linear-gradient(110deg,#a132ee,#6021c6);font-size:12px;font-weight:800;margin-bottom:14px}.summary-stage[data-accent=gold] .summary-eyebrow{background:linear-gradient(90deg,#ffe879,#ffb329);color:#18120a;text-shadow:none}.summary-copy h3{font-size:clamp(26px,3vw,44px);line-height:1.08;margin:0 0 14px;font-weight:900;white-space:pre-wrap;overflow-wrap:anywhere}.emphasis{color:#facc15}.summary-copy p{font-size:clamp(15px,1.3vw,18px);line-height:1.45;margin:0;white-space:pre-wrap}.summary-copy ol{list-style:none;padding:16px;margin:18px 0 0;display:grid;gap:10px;border-radius:16px;border:1px solid #ffffff20;background:#191625aa;max-width:780px}.summary-copy li{display:flex;align-items:start;gap:12px;font-size:clamp(14px,1.15vw,17px);line-height:1.4}.summary-copy li b{display:grid;place-items:center;flex:0 0 26px;height:26px;border-radius:7px;background:linear-gradient(120deg,#9333ea,#e349d5);font-size:14px}.summary-copy .summary-comment{color:#facc15;margin-top:18px;font-weight:700}.summary-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 24px 18px;flex-shrink:0}.summary-controls button{font-size:14px;font-weight:700;min-height:44px}.summary-controls .next{background:linear-gradient(110deg,#7c3aed,#c026d3);border-color:transparent}.summary-controls button:disabled{opacity:.4;cursor:default}.summary-mobile-count{display:none}
@media(max-width:760px){.summary-dialog{width:100%;height:100dvh;border:0;border-radius:0;padding:max(12px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));gap:12px!important}.summary-header{gap:8px}.summary-header h2{font-size:15px}.summary-header p{display:none}.summary-read{padding:9px!important;font-size:11px!important;max-width:110px}.summary-workspace{grid-template-columns:minmax(0,1fr)}.summary-thumbs{display:none}.summary-stage{border-radius:14px}.summary-top{padding:18px 14px;gap:14px}.summary-top strong{font-size:12px}.summary-top>span{font-size:13px}.summary-progress{gap:3px}.summary-progress span{height:5px}.summary-background{object-position:50% 25%}.summary-copy{padding:20px}.summary-copy h3{font-size:clamp(26px,7vw,36px)}.summary-controls{padding:0 12px 14px}.summary-controls button{font-size:12px;padding:10px 12px}.summary-mobile-count{display:inline;color:#c4b5fd;font-size:12px}}
</style>

<style scoped>
.summary-dialog{min-height:0;max-height:calc(100dvh - 56px)}
.summary-workspace{grid-template-rows:minmax(0,1fr);overflow:hidden;flex:1 1 0}
.summary-stage{height:100%;box-sizing:border-box}
.summary-reading{flex:1 1 0}
.summary-read{display:inline-flex;align-items:center;justify-content:center;gap:8px}
.summary-ambient{position:absolute;inset:-16px;width:calc(100% + 32px);height:calc(100% + 32px);max-width:none;object-fit:cover;filter:blur(20px) brightness(.48);z-index:-3;pointer-events:none}
.summary-thumbs img{object-position:center top}
@media(max-width:760px){
 .summary-dialog{height:100dvh;max-height:100dvh;min-height:0}
 .summary-workspace{height:0;min-height:0;align-items:center}
 /* A story keeps its proportions on unusually tall phones instead of
    stretching the space between the photograph and the copy. */
 .summary-stage{height:min(100%,calc((100vw - 20px) * 16 / 9));max-height:100%;container-type:size;width:100%}
 .summary-header h2{font-size:14px;line-height:1.2}
 .summary-header .summary-read{font-size:11px!important;max-width:120px;min-height:44px;padding:8px!important;gap:6px}
 .summary-top{padding:14px 12px;background:linear-gradient(180deg,#05081699,transparent)}
 .summary-background{object-fit:cover;object-position:center}
 .summary-shade{background:linear-gradient(180deg,#05081611 0%,#05081622 22%,#050816b3 45%,#050816f5 78%)}
 .summary-copy{padding:14px;margin-top:auto}
 .summary-copy h3{font-size:clamp(21px,4.3cqh,30px);line-height:1.08;margin-bottom:10px}
 .summary-copy p{font-size:clamp(12px,2cqh,15px);line-height:1.3}
 .summary-copy ol{padding:10px;margin-top:10px;gap:7px}
 .summary-copy li{font-size:clamp(11px,1.8cqh,14px);line-height:1.25;gap:8px}
 .summary-copy li b{flex-basis:22px;height:22px;font-size:12px}
 .summary-eyebrow{font-size:10px;padding:6px 10px;margin-bottom:10px}
 .summary-copy .summary-comment{margin-top:10px}
 .summary-controls{padding:4px 10px 10px;background:transparent}
}
</style>
