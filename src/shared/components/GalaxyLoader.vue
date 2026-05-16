<script setup>
defineProps({
  title: {
    type: String,
    default: 'Cargando galaxia'
  },
  text: {
    type: String,
    default: 'Preparando estrellas, noticias y comunidad.'
  },
  compact: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section class="galaxy-loader" :class="{ compact }" role="status" aria-live="polite">
    <div class="loader-stars"></div>
    <div class="loader-frame">
      <div class="loader-orbit">
        <span></span>
        <i></i>
      </div>
      <div class="loader-copy">
        <strong>{{ title }}</strong>
        <p>{{ text }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.galaxy-loader {
  align-items: center;
  background:
    radial-gradient(circle at 22% 18%, rgba(147, 51, 234, 0.22), transparent 30%),
    radial-gradient(circle at 76% 24%, rgba(236, 72, 153, 0.14), transparent 28%),
    linear-gradient(180deg, #050816, #07071c 58%, #09061a);
  color: #ffffff;
  display: grid;
  justify-items: center;
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

.galaxy-loader.compact {
  background:
    radial-gradient(circle at 25% 20%, rgba(147, 51, 234, 0.34), transparent 28%),
    radial-gradient(circle at 74% 36%, rgba(236, 72, 153, 0.2), transparent 26%),
    rgba(5, 8, 22, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.28);
  min-height: 260px;
  padding: 42px 22px;
}

.loader-frame {
  align-items: center;
  display: grid;
  gap: 28px;
  justify-items: center;
  max-width: 320px;
  min-height: 220px;
  position: relative;
  width: min(100%, 340px);
  z-index: 1;
}

.compact .loader-frame {
  gap: 18px;
  min-height: 120px;
}

.loader-stars {
  animation: driftStars 7s linear infinite;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 1px, transparent 2px),
    radial-gradient(circle, rgba(168, 85, 247, 0.95) 0 2px, transparent 3px),
    radial-gradient(circle, rgba(236, 72, 153, 0.75) 0 1px, transparent 2px);
  background-position: 0 0, 36px 44px, 80px 24px;
  background-size: 120px 120px, 180px 180px, 150px 150px;
  inset: -80px;
  opacity: 0.6;
  position: absolute;
}

.loader-orbit {
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(15, 23, 42, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  display: flex;
  height: 96px;
  justify-content: center;
  position: relative;
  width: 96px;
  z-index: 1;
}

.loader-orbit span {
  animation: spinOrbit 1.35s linear infinite;
  border: 3px solid rgba(255, 255, 255, 0.16);
  border-top-color: #ec4899;
  border-right-color: #8b5cf6;
  border-radius: 999px;
  height: 62px;
  width: 62px;
}

.loader-orbit i {
  background: radial-gradient(circle, #facc15, #ec4899 55%, transparent 58%);
  border-radius: 999px;
  box-shadow: 0 0 36px rgba(236, 72, 153, 0.54);
  height: 16px;
  position: absolute;
  transform: translate(29px, -23px);
  width: 16px;
}

.compact .loader-orbit {
  height: 82px;
  width: 82px;
}

.compact .loader-orbit span {
  height: 52px;
  width: 52px;
}

.compact .loader-orbit i {
  height: 14px;
  transform: translate(24px, -19px);
  width: 14px;
}

.loader-copy {
  position: relative;
  text-align: center;
  z-index: 1;
}

.loader-copy strong {
  display: block;
  font-size: 24px;
  font-weight: 950;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.loader-copy p {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 800;
  margin-top: 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.compact .loader-copy strong {
  font-size: 20px;
}

.compact .loader-copy p {
  font-size: 12px;
}

@keyframes spinOrbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes driftStars {
  to {
    background-position: 120px 120px, 216px 224px, 230px 174px;
  }
}
</style>
