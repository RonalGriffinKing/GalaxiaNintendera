<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

const router = useRouter()
const isRouteLoading = ref(false)
const MIN_LOADER_TIME_MS = 420
let loadingStartedAt = Date.now()
let hideTimer = null
let removeBeforeGuard = null
let removeAfterGuard = null
let removeErrorGuard = null

const clearHideTimer = () => {
  if (!hideTimer) return
  clearTimeout(hideTimer)
  hideTimer = null
}

const showLoader = () => {
  clearHideTimer()
  loadingStartedAt = Date.now()
  isRouteLoading.value = true
}

const hideLoader = () => {
  clearHideTimer()
  const elapsed = Date.now() - loadingStartedAt
  const wait = Math.max(0, MIN_LOADER_TIME_MS - elapsed)
  hideTimer = setTimeout(() => {
    isRouteLoading.value = false
  }, wait)
}

onMounted(() => {
  removeBeforeGuard = router.beforeEach((to, from, next) => {
    if (to.fullPath !== from.fullPath) showLoader()
    next()
  })

  removeAfterGuard = router.afterEach(() => {
    hideLoader()
  })

  removeErrorGuard = router.onError(() => {
    hideLoader()
  })

  router.isReady().then(() => {
    hideLoader()
  })
})

onUnmounted(() => {
  clearHideTimer()
  removeBeforeGuard?.()
  removeAfterGuard?.()
  removeErrorGuard?.()
})
</script>

<template>
  <router-view />

  <Transition name="global-loader">
    <section v-if="isRouteLoading" class="global-loader-screen">
      <GalaxyLoader
        title="Cargando"
        text="Preparando la experiencia..."
      />
    </section>
  </Transition>
</template>

<style scoped>
.global-loader-screen {
  inset: 0;
  position: fixed;
  z-index: 9999;
}

.global-loader-screen :deep(.galaxy-loader) {
  border: 0;
  border-radius: 0;
  min-height: 100dvh;
}

.global-loader-enter-active,
.global-loader-leave-active {
  transition:
    opacity 0.58s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.58s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.58s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, filter, transform;
}

.global-loader-enter-from,
.global-loader-leave-to {
  filter: blur(18px) saturate(1.08);
  opacity: 0;
  transform: scale(1.03);
}
</style>
