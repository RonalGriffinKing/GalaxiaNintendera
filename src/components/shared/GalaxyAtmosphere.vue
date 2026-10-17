<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
const hidden = ref(false)
const sync = () => { hidden.value = document.hidden }
onMounted(() => { sync(); document.addEventListener('visibilitychange',sync) })
onUnmounted(() => document.removeEventListener('visibilitychange',sync))
const particles = Array.from({length:72},(_,i)=>({left:`${(i*37.37+9)%100}%`,top:`${(i*23.41+7)%100}%`,'--delay':`${-i*1.7}s`,'--duration':`${18+i%6*3}s`,'--size':`${i%9===0?3:i%3===0?2:1.5}px`}))
</script>
<template>
 <div class="galaxy-atmosphere" :class="{'is-paused':hidden}" aria-hidden="true">
  <span v-for="(style,index) in particles" :key="index" class="galaxy-particle" :style="style"></span>
 </div>
</template>
<style scoped>
.galaxy-atmosphere{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;contain:strict}.galaxy-particle{position:absolute;width:var(--size);height:var(--size);border-radius:50%;background:#b9cfff;box-shadow:0 0 7px #b18aff88;opacity:.25;animation:galaxy-particle-drift var(--duration) ease-in-out var(--delay) infinite alternate}.is-paused *{animation-play-state:paused!important}
@keyframes galaxy-particle-drift{0%{transform:translate3d(0,16px,0);opacity:.22}55%{opacity:.75}100%{transform:translate3d(24px,-60px,0);opacity:.35}}
@media(max-width:600px){.galaxy-particle:nth-of-type(n+41){display:none}}
@media(prefers-reduced-motion:reduce){.galaxy-atmosphere *{animation:none!important}}
</style>
