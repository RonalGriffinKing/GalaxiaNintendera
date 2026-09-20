<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  fallback: {
    type: String,
    default: '/'
  }
})

const router = useRouter()
const showTip = ref(false)
let tipInterval = null
let tipTimeout = null
let initialTipTimeout = null

const goBack = () => {
  if (window.history.state?.back) router.back()
  else router.push(props.fallback)
}

onMounted(() => {
  const revealTip = () => {
    showTip.value = true
    window.clearTimeout(tipTimeout)
    tipTimeout = window.setTimeout(() => { showTip.value = false }, 5200)
  }

  initialTipTimeout = window.setTimeout(revealTip, 1800)
  tipInterval = window.setInterval(revealTip, 30000)
})

onUnmounted(() => {
  window.clearTimeout(initialTipTimeout)
  window.clearTimeout(tipTimeout)
  window.clearInterval(tipInterval)
})
</script>

<template>
  <div class="floating-back-control">
    <Transition name="back-tip">
      <div v-if="showTip" class="floating-back-tip" role="status">
        ¿Quieres volver? Pulsa aquí
      </div>
    </Transition>
    <button
      type="button"
      class="floating-back-button"
      aria-label="Volver a la pagina anterior"
      @click="goBack"
    >
      <i class="fas fa-arrow-left" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
.floating-back-control {
  --back-orb-bottom: 106px;
  --back-orb-right: 28px;
  --back-orb-size: 58px;
  bottom: var(--back-orb-bottom);
  height: var(--back-orb-size);
  pointer-events: none;
  position: fixed;
  right: var(--back-orb-right);
  width: var(--back-orb-size);
  z-index: 510;
}

.floating-back-button {
  align-items: center;
  backdrop-filter: blur(18px);
  background:
    linear-gradient(145deg, rgba(7, 10, 25, 0.98), rgba(21, 13, 44, 0.96)) padding-box,
    linear-gradient(135deg, #22d3ee, #a855f7, #ec4899) border-box;
  border: 2px solid transparent;
  border-radius: 50%;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), 0 0 24px rgba(168, 85, 247, 0.24);
  color: #f8fafc;
  display: flex;
  font-size: 20px;
  height: 100%;
  justify-content: center;
  pointer-events: auto;
  width: 100%;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.floating-back-button:hover {
  background:
    linear-gradient(145deg, rgba(76, 29, 149, 0.98), rgba(21, 13, 44, 0.98)) padding-box,
    linear-gradient(135deg, #67e8f9, #c084fc, #f472b6) border-box;
  box-shadow: 0 14px 34px rgba(76, 29, 149, 0.34);
  transform: translateY(-2px);
}

.floating-back-tip {
  background: rgba(8, 12, 30, 0.94);
  border: 1px solid rgba(192, 132, 252, 0.45);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.25;
  padding: 9px 12px;
  pointer-events: none;
  position: absolute;
  right: calc(100% + 10px);
  text-align: center;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
}

.back-tip-enter-active,
.back-tip-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.back-tip-enter-from,
.back-tip-leave-to {
  opacity: 0;
  transform: translate(8px, -50%);
}

@media (max-width: 859px) {
  .floating-back-control {
    --back-orb-bottom: calc(152px + env(safe-area-inset-bottom, 0px));
    --back-orb-right: max(14px, env(safe-area-inset-right, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-back-button,
  .back-tip-enter-active,
  .back-tip-leave-active { transition-duration: 0.01ms; }
}
</style>
