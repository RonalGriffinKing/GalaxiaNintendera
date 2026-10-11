<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
const props = defineProps({ busy: Boolean, reward: { type: Object, default: null }, mode: { type: String, default: 'normal' } })
import { rewardAppearance } from './demoCatalog'
const appearance = computed(() => rewardAppearance(props.reward || { rarity: props.mode }))
const emit = defineEmits(['complete', 'hidden'])
const stage = ref(null)
const imageFailed = ref(false)
const effectsVisible = ref(false)
const pageVisible = ref(true)
function updateVisibility() { pageVisible.value = !document.hidden }
let observer
watch(() => props.reward, () => { imageFailed.value = false })
onMounted(() => { updateVisibility(); document.addEventListener('visibilitychange', updateVisibility); observer = new IntersectionObserver(entries => { effectsVisible.value = Boolean(entries[0]?.isIntersecting); if (!effectsVisible.value) emit('hidden') }); observer.observe(stage.value) })
onUnmounted(() => { observer?.disconnect(); document.removeEventListener('visibilitychange', updateVisibility) })
function finish(event) { if (event.target === event.currentTarget && event.animationName.startsWith('stellar-orbit')) emit('complete') }
</script>

<template>
  <div ref="stage" class="stars-stage" :class="{ idle: !busy && !reward, 'effects-paused': !effectsVisible || !pageVisible, charging: busy, discovered: reward, epic: appearance.rarity === 'epic', legendary: appearance.rarity === 'legendary', 'special-reward': reward && appearance.special }" :style="{ '--reward-effect': appearance.color }">
    <div class="ambient-particles" :class="{ paused: !effectsVisible || !pageVisible }" aria-hidden="true">
      <i v-for="n in 18" :key="n" :style="{ left: (5 + n * 37 % 90) + '%', top: (5 + n * 23 % 82) + '%', '--drift-delay': -(n % 6) + 's', '--drift-duration': (5 + n % 4) + 's' }"></i>
    </div>
    <div class="stellar-halo" aria-hidden="true"></div>
    <div class="stellar-orbit" aria-hidden="true" @animationend="finish">
      <span v-for="n in 6" :key="n" class="stellar-satellite" :style="{ '--angle': ((n - 1) * 60) + 'deg', '--idle-delay': (n * -0.3) + 's' }"><span>&#10022;</span></span>
    </div>
    <div class="gift-anchor" aria-hidden="true">
      <div class="gift-box"><span class="gift-ribbon"></span></div>
      <div class="gift-lid"><svg class="gift-bow" viewBox="0 0 100 45" fill="none"><path d="M50 40C5 40 11 0 30 9c12 5 20 31 20 31Zm0 0c45 0 39-40 20-31-12 5-20 31-20 31Z" stroke="currentColor" stroke-width="5" stroke-linecap="round" /></svg></div>
    </div>
    <span v-for="n in 14" :key="'particle-' + n" class="stellar-particle" aria-hidden="true" :style="{ '--angle': (n * 360 / 14) + 'deg', '--distance': (100 + n % 4 * 14) + 'px', '--delay': (n % 3 * 60) + 'ms' }">{{ n % 3 ? '·' : '✧' }}</span>
    <div v-if="reward" class="reward-portrait">
      <div class="reward-art">
      <span class="reward-ring" aria-hidden="true"></span>
      <img v-if="!imageFailed" :src="reward.src" :alt="reward.name" width="116" height="116" @error="imageFailed = true" />
      <span v-else class="reward-fallback" aria-hidden="true">&#9733;</span>
      </div>
    </div>
    <div class="stellar-caption" aria-live="polite" aria-atomic="true">
      <template v-if="reward"><span class="reward-label">Icono de demostración · {{ appearance.label }}</span><h3 :title="reward.name">{{ reward.name }}</h3><p>{{ reward.saga || 'Galaxia Nintendera' }}</p></template>
      <p v-else>{{ busy ? 'La magia está despertando…' : 'Una sorpresa espera dentro' }}</p>
    </div>
  </div>
</template>

<style scoped>
.ambient-particles { position:absolute; inset:0; pointer-events:none; }
.ambient-particles i { position:absolute; width:3px; height:3px; border-radius:50%; background:#e9ddff; opacity:.45; box-shadow:0 0 5px #caa5ff80; }
.ambient-particles i:nth-child(3n) { background:#ffe1a0; width:2px; height:2px; }
@media(prefers-reduced-motion:no-preference) {
 .ambient-particles i { animation:ambient-drift var(--drift-duration) ease-in-out var(--drift-delay) infinite alternate; }
 .ambient-particles.paused i { animation-play-state:paused; }
 @keyframes ambient-drift { from { transform:translateY(7px); opacity:.2; } to { transform:translateY(-10px); opacity:.65; } }
}
.stars-stage { --radius:105px; --scene-center:calc((100% - 90px) / 2); --holo:linear-gradient(120deg,#9879ee,#82d8e9,#b59df6,#799fdf,#9879ee); position:relative; width:100%; height:100%; color:var(--glow,#c084fc); overflow:hidden; perspective:700px; }
.stars-stage.epic { --holo:linear-gradient(120deg,#eaa735,#ffe2a0,#d681db,#9c55d7,#ffcd67,#eaa735); }
.epic .gift-ribbon { background:linear-gradient(90deg,#a865d6,#ffe8b8,#da94d5); border-color:#ffe6a0; }
.epic .gift-bow { color:#ffe0a0; filter:drop-shadow(0 0 6px #ffc45b80); }
.epic .gift-box { border-color:#ffe2a0; box-shadow:inset -10px -8px 18px #62337140,0 0 30px #efb54b40; }
.epic .reward-portrait { background:conic-gradient(from 35deg,#ffd374,#fff0bd,#ca76dc,#9855dc,#ffd374); box-shadow:0 0 36px #efb54b60; }
.epic .stellar-satellite > span { color:#ffe7a1; text-shadow:0 0 12px #ffbd6680; }
.stars-stage { background:radial-gradient(ellipse at 15% 15%,#62d7e329,transparent 60%),radial-gradient(ellipse at 85% 70%,#d983ea2b,transparent 65%),linear-gradient(135deg,#262253,#372455 50%,#173746); }
.stars-stage.epic { background:radial-gradient(ellipse at 20% 15%,#ffc96e33,transparent 60%),radial-gradient(ellipse at 85% 70%,#d67df535,transparent 65%),linear-gradient(135deg,#34234d,#4a2951 50%,#3c3247); }
.stellar-halo { position:absolute; top:var(--scene-center); left:50%; transform:translate(-50%,-50%); width:290px; height:290px; border-radius:50%; background:radial-gradient(circle,#bba1ff30,transparent 65%); }.epic .stellar-halo { background:radial-gradient(circle,#f6c86e40,#d884fa12,transparent 68%); }
.stellar-orbit { position:absolute; width:0; height:0; top:var(--scene-center); left:50%; }.stellar-satellite { position:absolute; left:-14px; top:-14px; width:28px; height:28px; transform:rotate(var(--angle)) translateX(var(--radius)); }.stellar-satellite > span { display:grid; place-items:center; width:100%; height:100%; line-height:1; transform:rotate(calc(-1 * var(--angle))); font-size:27px; color:#b3efff; text-shadow:0 0 10px #b3efff55; }.stellar-satellite:nth-child(even) > span { color:#f4b2e5; font-size:19px; }.epic .stellar-satellite:nth-child(even) > span { color:#f9d589; }
.gift-anchor { position:absolute; top:var(--scene-center); left:50%; width:126px; height:126px; transform:translate(-50%,-50%) rotate(-5deg); transform-style:preserve-3d; }.gift-box { position:absolute; bottom:0; width:100%; height:91px; border-radius:6px 6px 17px 17px; background:var(--holo); background-size:300% 300%; border:1px solid #f2e7ffb0; box-shadow:inset -10px -8px 18px #40235b40,0 10px 26px #ac79ff25; overflow:hidden; }.gift-ribbon { position:absolute; inset:0 43%; background:linear-gradient(90deg,#ffffff60,#fffaeacc,#c3a5ff85); border-inline:1px solid #fff8; }.gift-lid { position:absolute; top:24px; left:-6px; width:138px; height:27px; background:var(--holo); background-size:300% 300%; border:1px solid #fff9; border-radius:7px; box-shadow:0 4px 8px #39235a45; z-index:2; }
.gift-bow { position:absolute; width:88px; height:42px; left:25px; top:-37px; color:#e4cfff; filter:drop-shadow(0 0 5px #92e7ef80); }
.stellar-particle { position:absolute; top:var(--scene-center); left:50%; opacity:0; color:#acf3ff; font-size:26px; transform:rotate(var(--angle)) translateX(42px); pointer-events:none; }.stellar-particle:nth-of-type(even) { color:#f7c1e8; }.epic .stellar-particle { color:#f9d589; }
.reward-portrait { position:absolute; z-index:3; top:var(--scene-center); left:50%; transform:translate(-50%,-50%); display:grid; place-items:center; width:132px; height:132px; border-radius:50%; background:conic-gradient(from 35deg,#a5efff,#d0a5ff,#f7b1d8,#f8dd90,#a5efff); padding:4px; box-sizing:border-box; box-shadow:0 0 30px #b59bff45; }.reward-portrait img { width:100%; height:100%; object-fit:contain; border-radius:50%; background:#17112c; }.reward-portrait > span { font-size:64px; color:#ffe3a0; }
.stellar-caption { position:absolute; bottom:14px; left:20px; right:20px; height:82px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; color:#d9c6ee; }.stellar-caption p { margin:6px 0 0; font-size:12px; }.stellar-caption h3 { margin:7px 0 0; font-size:20px; line-height:1.2; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }.reward-label { font-size:11px; color:var(--glow); }
@media(prefers-reduced-motion:no-preference) {
 .idle .gift-anchor { animation:gift-idle 3.8s ease-in-out infinite; }
 .idle .gift-box,.idle .gift-lid { animation:holo-flow 6s ease-in-out infinite alternate; }
 .idle .stellar-satellite > span { animation:star-idle 3.8s ease-in-out infinite; animation-delay:var(--idle-delay); }
 .effects-paused .gift-anchor,.effects-paused .gift-box,.effects-paused .gift-lid,.effects-paused .stellar-satellite > span { animation-play-state:paused; }
 @keyframes gift-idle {
  0%,100% { transform:translate(-50%,-50%) rotate(-5deg); }
  40% { transform:translate(-50%,calc(-50% - 8px)) rotate(2deg); }
  65%,85% { transform:translate(-50%,-50%) rotate(-5deg); }
  75% { transform:translate(-50%,calc(-50% - 13px)) rotate(-2deg) scale(1.03); }
 }
 @keyframes star-idle { 50% { opacity:.65; scale:.85; } }
 .charging .stellar-halo { animation:charge-aura 3.8s ease-in both; }
 .discovered .stellar-halo { animation:reveal-aura 1.2s ease-out both; }
 @keyframes charge-aura { 75% { opacity:1; scale:1.1; } 95% { opacity:.9; scale:1.3; } }
 @keyframes reveal-aura { from { opacity:1; scale:1.3; } to { opacity:.6; scale:1; } }
 .charging .stellar-orbit { animation:stellar-orbit 3.8s cubic-bezier(.2,.65,.3,1) both; }
 .charging .gift-anchor { animation:gift-charge 3.8s ease both; }
 .charging .gift-box,.charging .gift-lid { animation:holo-flow 1.9s linear 2; }
 .charging .stellar-particle { animation:particle-charge 1.9s ease-out 2; animation-delay:var(--delay); }
 .discovered .gift-lid { animation:gift-open .75s ease-out both; }
 .discovered .gift-box { animation:gift-fade .75s ease-out both; }
 .discovered .reward-portrait { animation:icon-emerge .85s cubic-bezier(.2,.8,.2,1) .14s both; }
 .discovered .stellar-particle { animation:particle-burst .9s ease-out both; animation-delay:var(--delay); }
 .discovered .stellar-caption { animation:caption-reveal .45s ease-out .55s both; }
 @keyframes stellar-orbit { to { transform:rotate(1800deg); } }
 @keyframes gift-charge { 30%,70% { transform:translate(-50%,-50%) rotate(5deg) scale(1.05); } 50%,90% { transform:translate(-50%,-50%) rotate(-7deg) scale(1.1); } }
 @keyframes holo-flow { to { background-position:100% 100%; } }
 @keyframes gift-open { to { transform:translate(-35px,-100px) rotate(-30deg); opacity:0; } }
 @keyframes gift-fade { 35% { opacity:1; } to { transform:translateY(35px) scale(.8); opacity:0; } }
 @keyframes icon-emerge { from { transform:translate(-50%,0) scale(.25); opacity:0; filter:blur(7px); } to { transform:translate(-50%,-50%) scale(1); opacity:1; filter:blur(0); } }
 @keyframes particle-charge { 15% { opacity:.8; } to { transform:rotate(var(--angle)) translateX(var(--distance)); opacity:0; } }
 @keyframes particle-burst { 15% { opacity:1; } to { transform:rotate(var(--angle)) translateX(var(--distance)) scale(.4); opacity:0; } }
 @keyframes caption-reveal { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
}
@media(prefers-reduced-motion:reduce) { .discovered .gift-anchor { display:none; } }
@media(max-width:480px) { .stars-stage { --radius:90px; --scene-center:calc((100% - 90px) / 2); }.reward-portrait { width:118px; height:118px; }.stellar-caption h3 { font-size:18px; } }

/* Keep the artwork still inside its independently animated custom color ring. */
.discovered .reward-portrait { background:conic-gradient(from 35deg,var(--reward-effect),#fff,var(--reward-effect),#ec4899,var(--reward-effect)); box-shadow:0 0 26px color-mix(in srgb,var(--reward-effect),transparent 65%); }
.discovered.special-reward .reward-portrait { padding:5px; box-shadow:0 0 0 3px color-mix(in srgb,var(--reward-effect),transparent 70%),0 0 38px color-mix(in srgb,var(--reward-effect),transparent 35%); }
.discovered .reward-label { color:color-mix(in srgb,var(--reward-effect),white 45%); }
.stars-stage.legendary { --holo:linear-gradient(120deg,#b67b20,#ffe6a1,#e5a53b,#fff2bd,#bb8528); background:radial-gradient(ellipse at 50% 35%,#ffd36e45,transparent 65%),linear-gradient(135deg,#342342,#59402b,#35243f); }
.legendary .stellar-halo { background:radial-gradient(circle,#ffd87855,transparent 68%); }
.legendary .stellar-satellite > span,.legendary .stellar-particle { color:#ffe6a1; text-shadow:0 0 12px #ffc45b80; }
.discovered .reward-portrait { padding:0; background:transparent; }
.discovered.special-reward .reward-portrait { padding:0; }
.reward-art { position:relative; width:100%; height:100%; display:grid; place-items:center; padding:4px; box-sizing:border-box; border-radius:50%; }
.special-reward .reward-art { padding:5px; }
.reward-ring { position:absolute; inset:0; border-radius:50%; background:conic-gradient(from 35deg,var(--reward-effect),#fff,var(--reward-effect),#ec4899,var(--reward-effect)); }
.reward-art img { position:relative; z-index:1; min-width:0; min-height:0; width:100%; height:100%; object-fit:contain; }
.reward-fallback { position:relative; z-index:1; display:grid; place-items:center; width:100%; height:100%; border-radius:50%; background:#17112c; font-size:64px; color:#ffe3a0; }
.discovered .stellar-satellite:nth-child(3n) > span { color:#b3efff; }
.discovered .stellar-satellite:nth-child(3n + 1) > span { color:#f4b2e5; }
@media(prefers-reduced-motion:no-preference) {
 .discovered .reward-art { animation:reward-float 3.6s ease-in-out 1s infinite; }
 .discovered .stellar-satellite > span { animation:star-idle 2.8s ease-in-out infinite; animation-delay:var(--idle-delay); }
 .discovered.special-reward .reward-ring { animation:reward-colors 5s linear infinite; }
 .effects-paused .reward-art,.effects-paused .reward-ring,.effects-paused .stellar-satellite > span { animation-play-state:paused; }
 @keyframes reward-float { 50% { transform:translateY(-7px); } }
 @keyframes reward-colors { to { transform:rotate(360deg); } }
}

@media(min-width:641px) and (max-width:1440px),(min-width:641px) and (max-height:850px) {
 .stars-stage { --radius:65px; --scene-center:calc((100% - 76px)/2); }
 .gift-anchor { width:100px; height:100px; }.gift-box { height:72px; }.gift-lid { width:112px; top:20px; height:23px; }.gift-bow { width:70px; left:20px; top:-30px; }
 .reward-portrait { width:100px; height:100px; }
 .stellar-halo { width:210px; height:210px; }
 .stellar-caption { height:60px; bottom:8px; }.stellar-caption h3 { font-size:17px; margin-top:4px; }.stellar-caption p { margin-top:4px; font-size:11px; }
 .stellar-satellite > span { font-size:22px; }.stellar-satellite:nth-child(even) > span { font-size:16px; }
}

</style>
