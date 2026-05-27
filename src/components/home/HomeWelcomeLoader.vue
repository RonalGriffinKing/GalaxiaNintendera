<script setup>
import { defaultLogoUrl } from '@/constants/assets'

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
      <div class="star-field" aria-hidden="true">
        <span v-for="index in 28" :key="index"></span>
      </div>

      <div class="welcome-core">
        <span class="logo-orbit">
          <img :src="defaultLogoUrl" alt="" />
        </span>
        <strong>Bienvenido a Galaxia Nintendera</strong>
        <p>Estamos cargando noticias, eventos y tus comunidades favoritas...</p>
        <div class="loading-ring" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.home-welcome-loader {
  align-items: center;
  background:
    radial-gradient(circle at 20% 18%, rgba(168, 85, 247, 0.24), transparent 28%),
    radial-gradient(circle at 82% 14%, rgba(236, 72, 153, 0.18), transparent 26%),
    radial-gradient(circle at 50% 86%, rgba(34, 211, 238, 0.13), transparent 28%),
    #050816;
  color: #ffffff;
  display: grid;
  inset: 0;
  justify-items: center;
  overflow: hidden;
  padding: 24px;
  position: fixed;
  text-align: center;
  z-index: 9000;
}

.star-field {
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.star-field span {
  animation: starDrift 3.8s ease-in-out infinite;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 999px;
  box-shadow: 0 0 18px rgba(192, 132, 252, 0.42);
  height: 3px;
  left: var(--x, 50%);
  opacity: 0.4;
  position: absolute;
  top: var(--y, 50%);
  width: 3px;
}

.star-field span:nth-child(3n) {
  animation-duration: 4.6s;
  background: #c084fc;
  height: 4px;
  width: 4px;
}

.star-field span:nth-child(4n) {
  animation-delay: -1.2s;
  background: #f0abfc;
}

.star-field span:nth-child(1) { --x: 8%; --y: 14%; }
.star-field span:nth-child(2) { --x: 18%; --y: 74%; }
.star-field span:nth-child(3) { --x: 28%; --y: 26%; }
.star-field span:nth-child(4) { --x: 36%; --y: 88%; }
.star-field span:nth-child(5) { --x: 46%; --y: 11%; }
.star-field span:nth-child(6) { --x: 58%; --y: 68%; }
.star-field span:nth-child(7) { --x: 72%; --y: 22%; }
.star-field span:nth-child(8) { --x: 86%; --y: 76%; }
.star-field span:nth-child(9) { --x: 93%; --y: 38%; }
.star-field span:nth-child(10) { --x: 13%; --y: 42%; }
.star-field span:nth-child(11) { --x: 22%; --y: 9%; }
.star-field span:nth-child(12) { --x: 33%; --y: 58%; }
.star-field span:nth-child(13) { --x: 41%; --y: 34%; }
.star-field span:nth-child(14) { --x: 53%; --y: 91%; }
.star-field span:nth-child(15) { --x: 64%; --y: 7%; }
.star-field span:nth-child(16) { --x: 78%; --y: 52%; }
.star-field span:nth-child(17) { --x: 89%; --y: 17%; }
.star-field span:nth-child(18) { --x: 5%; --y: 86%; }
.star-field span:nth-child(19) { --x: 17%; --y: 24%; }
.star-field span:nth-child(20) { --x: 27%; --y: 67%; }
.star-field span:nth-child(21) { --x: 39%; --y: 4%; }
.star-field span:nth-child(22) { --x: 49%; --y: 48%; }
.star-field span:nth-child(23) { --x: 61%; --y: 31%; }
.star-field span:nth-child(24) { --x: 70%; --y: 83%; }
.star-field span:nth-child(25) { --x: 82%; --y: 6%; }
.star-field span:nth-child(26) { --x: 96%; --y: 63%; }
.star-field span:nth-child(27) { --x: 11%; --y: 57%; }
.star-field span:nth-child(28) { --x: 67%; --y: 44%; }

.welcome-core {
  align-items: center;
  display: grid;
  gap: 14px;
  justify-items: center;
  max-width: 520px;
  position: relative;
  z-index: 1;
}

.logo-orbit {
  align-items: center;
  animation: floatLogo 2.8s ease-in-out infinite;
  background:
    linear-gradient(#070a18, #070a18) padding-box,
    linear-gradient(135deg, #7c3aed, #ec4899, #facc15) border-box;
  border: 2px solid transparent;
  border-radius: 999px;
  box-shadow: 0 0 34px rgba(168, 85, 247, 0.38);
  display: flex;
  height: 94px;
  justify-content: center;
  width: 94px;
}

.logo-orbit img {
  max-height: 68px;
  max-width: 74px;
  object-fit: contain;
}

.welcome-core strong {
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 950;
  line-height: 0.98;
}

.welcome-core p {
  color: #cbd5e1;
  font-size: 15px;
  font-weight: 850;
  line-height: 1.5;
  max-width: 420px;
}

.loading-ring {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.loading-ring i {
  animation: pulseDot 1.1s ease-in-out infinite;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  height: 9px;
  width: 9px;
}

.loading-ring i:nth-child(2) {
  animation-delay: 0.16s;
}

.loading-ring i:nth-child(3) {
  animation-delay: 0.32s;
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

@keyframes starDrift {
  0%,
  100% {
    opacity: 0.28;
    transform: translate3d(0, 0, 0) scale(0.85);
  }
  50% {
    opacity: 0.9;
    transform: translate3d(12px, -14px, 0) scale(1.15);
  }
}

@keyframes floatLogo {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes pulseDot {
  0%,
  100% {
    opacity: 0.38;
    transform: translateY(0) scale(0.82);
  }
  50% {
    opacity: 1;
    transform: translateY(-5px) scale(1);
  }
}

@media (max-width: 640px) {
  .home-welcome-loader {
    padding: 18px;
  }

  .logo-orbit {
    height: 78px;
    width: 78px;
  }

  .logo-orbit img {
    max-height: 56px;
    max-width: 60px;
  }

  .welcome-core p {
    font-size: 13px;
  }
}
</style>
