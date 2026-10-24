<script setup>
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'
import { watch, onUnmounted } from 'vue'
import { homeWelcomeLoading } from '@/composables/usePublicChromeLoading'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})
watch(() => props.visible, value => { homeWelcomeLoading.value = value }, { immediate: true, flush: 'sync' })
onUnmounted(() => { homeWelcomeLoading.value = false })
</script>

<template>
  <Teleport to="body"><Transition name="home-welcome">
    <section v-if="visible" class="home-welcome-loader" aria-live="polite" aria-busy="true">
      <GalaxyLoader
        quiet
        show-logo

      />
    </section>
  </Transition></Teleport>
</template>

<style scoped>
.home-welcome-loader {
  inset: 0;
  position: fixed;
  z-index: 9000;
}

.home-welcome-enter-active,
.home-welcome-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.home-welcome-enter-from,
.home-welcome-leave-to {
  opacity: 0;
  transform: scale(1.015);
}

</style>
