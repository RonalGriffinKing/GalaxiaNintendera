<script setup>
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <Transition name="home-welcome">
    <section v-if="visible" class="home-welcome-loader" aria-live="polite" aria-busy="true">
      <GalaxyLoader
        show-logo
        title="Bienvenido a Galaxia Nintendera"
        text="Estamos cargando noticias, eventos y tus comunidades favoritas..."
      />
    </section>
  </Transition>
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
