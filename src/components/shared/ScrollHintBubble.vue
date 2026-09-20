<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({ targetId: { type: String, default: '' } })
const visible = ref(false)
let settleTimer = null
let revealTimer = null

const canScrollFurther = () => {
  const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
  return window.scrollY + window.innerHeight < pageHeight - 24
}

const revealIfUseful = () => { visible.value = canScrollFurther() }
const handleScroll = () => {
  visible.value = false
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(revealIfUseful, 650)
}
const handleResize = () => {
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(revealIfUseful, 120)
}
const scrollForward = () => {
  visible.value = false
  const target = props.targetId ? document.getElementById(props.targetId) : null
  if (target && target.getBoundingClientRect().top > 32) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  window.scrollBy({ top: Math.max(360, Math.round(window.innerHeight * 0.72)), behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
  revealTimer = window.setTimeout(revealIfUseful, 850)
})
onUnmounted(() => {
  window.clearTimeout(settleTimer)
  window.clearTimeout(revealTimer)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <Transition name="scroll-hint">
    <button v-if="visible" type="button" class="scroll-hint-bubble" aria-label="Desliza para ver mas contenido" @click="scrollForward">
      <span>Desliza para ver más</span>
      <i class="fas fa-chevron-down" aria-hidden="true"></i>
    </button>
  </Transition>
</template>

<style scoped>
.scroll-hint-bubble {
  align-items: center;
  animation: scrollHintFloat 2.2s ease-in-out infinite;
  backdrop-filter: blur(18px);
  background: linear-gradient(135deg, rgba(22, 18, 50, 0.94), rgba(93, 42, 154, 0.92));
  border: 1px solid rgba(232, 121, 249, 0.58);
  border-radius: 999px;
  bottom: 24px;
  box-shadow: 0 14px 34px rgba(4, 6, 20, 0.42), 0 0 22px rgba(217, 70, 239, 0.2);
  color: #fff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 10px;
  left: 50%;
  min-height: 44px;
  padding: 0 17px;
  position: fixed;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 500;
}
.scroll-hint-bubble i { color: #f0abfc; font-size: 13px; }
.scroll-hint-enter-active, .scroll-hint-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.scroll-hint-enter-from, .scroll-hint-leave-to { opacity: 0; transform: translate(-50%, 10px); }
@keyframes scrollHintFloat { 0%, 100% { margin-bottom: 0; } 50% { margin-bottom: 5px; } }
@media (max-width: 859px) {
  .scroll-hint-bubble { bottom: calc(88px + env(safe-area-inset-bottom, 0px)); font-size: 11px; min-height: 40px; padding: 0 14px; }
}
@media (prefers-reduced-motion: reduce) { .scroll-hint-bubble { animation: none; } }
</style>
