<script setup>
import { publicReadingControlsHidden, publicNavigationOverlayOpen } from '@/composables/usePublicChromeLoading'
import { useRouter } from 'vue-router'

const props = defineProps({
  fallback: {
    type: String,
    default: '/'
  }
})

const router = useRouter()
const goBack = () => {
  if (window.history.state?.back) router.back()
  else router.push(props.fallback)
}

</script>

<template>
  <div class="floating-back-control" :class="{ suppressed: publicReadingControlsHidden || publicNavigationOverlayOpen }" :inert="publicReadingControlsHidden || publicNavigationOverlayOpen || undefined">
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
  --back-orb-bottom: var(--public-floating-bottom, 34px);
  --back-orb-left: 28px;
  --back-orb-size: 58px;
  bottom: var(--back-orb-bottom);
  height: var(--back-orb-size);
  pointer-events: none;
  position: fixed;
  left: var(--back-orb-left);
  width: var(--back-orb-size);
  z-index: 510;
}

.floating-back-button {
  box-sizing: border-box;
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

.floating-back-control { transition: opacity .22s ease, visibility .22s; }
.floating-back-control.suppressed { opacity: 0; visibility: hidden; pointer-events: none; }

@media (max-width: 859px) {
  .floating-back-control {
    --back-orb-bottom: var(--public-floating-bottom, calc(84px + env(safe-area-inset-bottom, 0px)));
    --back-orb-left: max(14px, env(safe-area-inset-left, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-back-button,
  .floating-back-control { transition-duration: 0.01ms; }
}
</style>
