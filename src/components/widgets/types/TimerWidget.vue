<template>
  <div class="timer-card" :class="[`theme-${data.theme}`,{'no-background':data.showBackground===false,'timer-finished':isFinished}]" :style="cardStyle">
    <span v-for="star in visibleStars" :key="star.id" class="timer-star" :style="star.style"><i class="fas fa-star"></i></span>
    <div v-if="data.showOrbit!==false" class="timer-orbit" aria-hidden="true"></div>
    <div v-if="isFinished" class="finish-stars" aria-hidden="true"><i v-for="star in finishStars" :key="star.id" class="fas fa-star" :style="star.style"></i></div>

    <div class="timer-content">
      <p class="timer-label" :style="labelStyle">{{ data.title }}</p>
      <p ref="timerValue" class="timer-value" :class="{'gradient-numbers':data.numberGradient!==false}" :style="numberStyle" :data-text="display">{{ display }}</p>
      <p v-if="data.mode === 'clock' && data.showDate" class="timer-date">{{ dateLabel }}</p>
      <div v-else class="timer-dots" aria-hidden="true"><i></i><i></i><i></i></div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({ widget: { type: Object, required: true } })
const now = ref(Date.now())
const timerValue = ref(null)
let interval
let lastLocalTick = 0

const data = computed(() => props.widget.data)
const actualRemaining = computed(() => {
  if (data.value.mode === 'clock') return 0
  if (!data.value.running || !data.value.endAt) return Math.max(0, Number(data.value.remainingSeconds) || 0)
  return Math.max(0, Math.ceil((Number(data.value.endAt) - now.value) / 1000))
})
const shownRemaining = ref(0)
const isFinished = computed(() => data.value.mode === 'countdown' && shownRemaining.value <= 0)

const two = value => String(value).padStart(2, '0')
const display = computed(() => {
  const current = new Date(now.value)
  if (data.value.mode === 'clock') return `${two(current.getHours())}:${two(current.getMinutes())}${data.value.showSeconds ? `:${two(current.getSeconds())}` : ''}`
  const total = shownRemaining.value
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours > 0 ? `${two(hours)}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`
})

const dateLabel = computed(() => new Intl.DateTimeFormat('es-ES', {
  weekday: 'short', day: '2-digit', month: 'short'
}).format(new Date(now.value)).replace('.', '').toUpperCase())

const cardStyle = computed(() => ({
  width: `${data.value.width || 420}px`,
  height: `${data.value.height || 190}px`
}))
const labelStyle = computed(() => ({ fontSize: `${data.value.titleSize || 15}px`, color: data.value.titleColor || '#ffffff', marginBottom: `${data.value.titleGap ?? 5}px` }))
const numberStyle = computed(() => ({ fontSize: `${data.value.numberSize || 54}px`, color: data.value.numberColor || '#ffffff', '--number-gradient-start': data.value.numberGradientStart || '#ffffff', '--number-gradient-end': data.value.numberGradientEnd || '#f0abfc' }))
const animateNumber = () => {
  const element = timerValue.value
  const mode = data.value.numberAnimation || 'flip'
  if (!element || mode === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const frames = mode === 'pulse'
    ? [{ transform: 'scale(.92)', opacity: .55 }, { transform: 'scale(1.08)', opacity: 1, offset: .55 }, { transform: 'scale(1)', opacity: 1 }]
    : mode === 'slide'
      ? [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]
      : [{ transform: 'perspective(180px) rotateX(-65deg)', opacity: .2 }, { transform: 'perspective(180px) rotateX(0)', opacity: 1 }]
  element.getAnimations().filter(animation => animation.id === 'timer-number-change').forEach(animation => animation.cancel())
  const animation = element.animate(frames, { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' })
  animation.id = 'timer-number-change'
}

const stars = [
  { id: 1, style: { left: '8%', top: '24%', animationDelay: '0s' } },
  { id: 2, style: { left: '20%', top: '76%', animationDelay: '.7s' } },
  { id: 3, style: { left: '78%', top: '18%', animationDelay: '1.2s' } },
  { id: 4, style: { left: '90%', top: '68%', animationDelay: '.3s' } },
  { id: 5, style: { left: '68%', top: '84%', animationDelay: '1.7s' } },
  { id: 6, style: { left: '34%', top: '14%', animationDelay: '.9s' } },
  { id: 7, style: { left: '52%', top: '88%', animationDelay: '1.4s' } },
  { id: 8, style: { left: '95%', top: '34%', animationDelay: '.55s' } },
  { id: 9, style: { left: '4%', top: '56%', animationDelay: '1.9s' } },
  { id: 10, style: { left: '60%', top: '12%', animationDelay: '.2s' } },
  { id: 11, style: { left: '84%', top: '88%', animationDelay: '1.05s' } },
  { id: 12, style: { left: '43%', top: '72%', animationDelay: '2s' } }
]
const visibleStars = computed(() => stars.slice(0, Math.max(0, Math.min(12, Number(data.value.starCount ?? 7)))))
const finishStars = [
  {id:1,style:{'--x':'-150px','--y':'-64px','--delay':'0s'}},{id:2,style:{'--x':'-105px','--y':'-112px','--delay':'.08s'}},
  {id:3,style:{'--x':'-42px','--y':'-92px','--delay':'.18s'}},{id:4,style:{'--x':'35px','--y':'-118px','--delay':'.04s'}},
  {id:5,style:{'--x':'112px','--y':'-82px','--delay':'.22s'}},{id:6,style:{'--x':'158px','--y':'-25px','--delay':'.12s'}},
  {id:7,style:{'--x':'138px','--y':'68px','--delay':'.28s'}},{id:8,style:{'--x':'68px','--y':'105px','--delay':'.16s'}},
  {id:9,style:{'--x':'-35px','--y':'112px','--delay':'.25s'}},{id:10,style:{'--x':'-126px','--y':'74px','--delay':'.1s'}}
]

const syncShownRemaining = () => {
  shownRemaining.value = actualRemaining.value
  lastLocalTick = window.performance.now()
}
watch(
  [() => data.value.mode, () => data.value.running, () => data.value.endAt, () => data.value.remainingSeconds],
  ([mode, running, endAt, stored], [oldMode, oldRunning, oldEndAt, oldStored]) => {
    const newRun = mode !== oldMode || running !== oldRunning || Number(endAt) !== Number(oldEndAt)
    const editedWhileStopped = !running && Number(stored) !== Number(oldStored)
    if (newRun || editedWhileStopped) syncShownRemaining()
  }
)
watch(display, async (value, oldValue) => {
  if (value === oldValue) return
  await nextTick()
  animateNumber()
})

onMounted(() => {
  syncShownRemaining()
  interval = window.setInterval(() => {
    now.value = Date.now()
    if (data.value.mode !== 'countdown') return
    if (!data.value.running || shownRemaining.value <= 0) return
    const localNow = window.performance.now()
    if (localNow - lastLocalTick < 1000) return
    shownRemaining.value = Math.max(0, shownRemaining.value - 1)
    lastLocalTick = localNow
  }, 100)
})
onUnmounted(() => window.clearInterval(interval))
</script>

<style scoped>
.timer-card { position: relative; overflow: hidden; border-radius: 28px; color: white; box-shadow: 0 18px 48px rgba(42, 18, 93, .34); font-family: inherit; }
.theme-galaxy { background: radial-gradient(circle at 78% 18%, rgba(245, 91, 211, .54), transparent 32%), linear-gradient(145deg, #281252, #6d28d9 56%, #c026d3); border: 2px solid rgba(255,255,255,.34); }
.theme-nebula { background: radial-gradient(circle at 16% 78%, rgba(34,211,238,.52), transparent 34%), linear-gradient(145deg, #071a3d, #283593 58%, #7c3aed); border: 2px solid rgba(125,211,252,.5); }
.theme-solar { background: radial-gradient(circle at 78% 18%, rgba(255,255,255,.7), transparent 28%), linear-gradient(145deg, #ffedd5, #fb7185 54%, #f97316); border: 2px solid rgba(255,255,255,.62); }
.timer-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 28px; text-align: center; }
.timer-label { margin: 0; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0; opacity: .9; }
.timer-value { position:relative;margin: 0; font-size: 54px; line-height: 1; font-weight: 950; font-variant-numeric: tabular-nums; letter-spacing: 0; text-shadow: 0 5px 18px rgba(0,0,0,.28); }
.timer-value.gradient-numbers{color:transparent!important;background:linear-gradient(105deg,var(--number-gradient-start),var(--number-gradient-end) 38%,#fff 50%,var(--number-gradient-end) 62%,var(--number-gradient-start));background-size:240% 100%;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 10px rgba(12,4,32,.34));animation:number-flow 3.8s ease-in-out infinite}
.timer-value.gradient-numbers::after{content:attr(data-text);position:absolute;inset:0;color:transparent;background:radial-gradient(circle at var(--spark-x,20%) 45%,#fff 0 2%,rgba(255,255,255,.8) 3%,transparent 10%);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:none;pointer-events:none;animation:number-spark 3.8s ease-in-out infinite}
.timer-date { margin: 10px 0 0; font-size: 13px; font-weight: 900; opacity: .84; }
.timer-dots { display: flex; gap: 6px; margin-top: 13px; }
.timer-dots i { width: 6px; height: 6px; border-radius: 50%; background: white; animation: pulse 1.3s ease-in-out infinite; }
.timer-dots i:nth-child(2) { animation-delay: .18s; opacity: .72; }
.timer-dots i:nth-child(3) { animation-delay: .36s; opacity: .5; }
.timer-star { position: absolute; z-index: 1; font-size: 9px; font-weight: 300; color: rgba(255,255,255,.9); animation: sparkle 2.2s ease-in-out infinite; text-shadow: 0 0 7px white,0 0 13px #f0abfc; }
.timer-orbit { position: absolute; width: 210px; height: 210px; right: -92px; top: -108px; border: 1px solid rgba(255,255,255,.25); border-radius: 50%; box-shadow: 0 0 0 17px rgba(255,255,255,.05), 0 0 0 42px rgba(255,255,255,.035); }
.timer-card.no-background{background:transparent!important;border-color:transparent!important;box-shadow:none}.timer-card.no-background .timer-orbit{opacity:.5}
.timer-card.timer-finished{pointer-events:none;animation:timer-finish 2.4s cubic-bezier(.4,0,.2,1) forwards}.finish-stars{position:absolute;z-index:5;inset:0;display:grid;place-items:center;pointer-events:none}.finish-stars i{position:absolute;left:50%;top:50%;color:#fff;font-size:10px;text-shadow:0 0 6px white,0 0 15px #f0abfc;opacity:0;animation:finish-star 2s var(--delay) cubic-bezier(.15,.75,.25,1) forwards}
@keyframes sparkle { 0%, 100% { opacity: .18; transform: scale(.65) rotate(0); } 50% { opacity: 1; transform: scale(1.2) rotate(45deg); } }
@keyframes pulse { 0%, 100% { transform: translateY(0); opacity: .35; } 50% { transform: translateY(-3px); opacity: 1; } }
@keyframes number-flow{0%,100%{background-position:0 50%}50%{background-position:100% 50%}}
@keyframes number-spark{0%,100%{--spark-x:8%;opacity:.15}45%{opacity:1}55%{--spark-x:92%;opacity:.7}}
@keyframes finish-star{0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(0)}18%{opacity:1}72%{opacity:.85}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) scale(1.35) rotate(190deg)}}
@keyframes timer-finish{0%,22%{opacity:1;transform:scale(1);filter:blur(0)}62%{opacity:.78;transform:scale(1.025);filter:brightness(1.22)}84%{opacity:.28;transform:scale(.96);filter:blur(1px)}100%{opacity:0;transform:scale(.86);filter:blur(7px);visibility:hidden}}
@media (prefers-reduced-motion: reduce) { .timer-star, .timer-dots i,.timer-value.gradient-numbers,.timer-value.gradient-numbers::after,.finish-stars i { animation: none; }.timer-value{transition:none!important}.timer-card.timer-finished{animation:none;opacity:0;visibility:hidden} }
</style>
