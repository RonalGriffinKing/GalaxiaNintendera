<script setup>
import { defaultLogoUrl } from '@/constants/assets'

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
  },
  showLogo: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section class="galaxy-loader" :class="{ compact, 'with-logo': showLogo }" role="status" aria-live="polite" aria-busy="true">
    <div class="loader-stars" aria-hidden="true">
      <span v-for="index in 28" :key="index"></span>
    </div>
    <div class="loader-frame">
      <div v-if="showLogo" class="loader-logo">
        <img :src="defaultLogoUrl" alt="" />
      </div>
      <div v-else class="loader-orbit" aria-hidden="true">
        <span></span>
        <i></i>
      </div>
      <div class="loader-copy">
        <strong>{{ title }}</strong>
        <p>{{ text }}</p>
        <div class="loader-dots" aria-hidden="true"><i></i><i></i><i></i></div>
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
  height: auto;
  inset: auto;
  min-height: 260px;
  padding: 42px 22px;
  position: relative;
  width: min(360px, calc(100vw - 40px));
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
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.with-logo .loader-frame {
  gap: 14px;
  max-width: 520px;
}

.loader-stars span {
  animation: driftStar 3.8s ease-in-out infinite;
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

.loader-stars span:nth-child(3n) { animation-duration: 4.6s; background: #c084fc; height: 4px; width: 4px; }
.loader-stars span:nth-child(4n) { animation-delay: -1.2s; background: #f0abfc; }
.loader-stars span:nth-child(1) { --x: 8%; --y: 14%; }
.loader-stars span:nth-child(2) { --x: 18%; --y: 74%; }
.loader-stars span:nth-child(3) { --x: 28%; --y: 26%; }
.loader-stars span:nth-child(4) { --x: 36%; --y: 88%; }
.loader-stars span:nth-child(5) { --x: 46%; --y: 11%; }
.loader-stars span:nth-child(6) { --x: 58%; --y: 68%; }
.loader-stars span:nth-child(7) { --x: 72%; --y: 22%; }
.loader-stars span:nth-child(8) { --x: 86%; --y: 76%; }
.loader-stars span:nth-child(9) { --x: 93%; --y: 38%; }
.loader-stars span:nth-child(10) { --x: 13%; --y: 42%; }
.loader-stars span:nth-child(11) { --x: 22%; --y: 9%; }
.loader-stars span:nth-child(12) { --x: 33%; --y: 58%; }
.loader-stars span:nth-child(13) { --x: 41%; --y: 34%; }
.loader-stars span:nth-child(14) { --x: 53%; --y: 91%; }
.loader-stars span:nth-child(15) { --x: 64%; --y: 7%; }
.loader-stars span:nth-child(16) { --x: 78%; --y: 52%; }
.loader-stars span:nth-child(17) { --x: 89%; --y: 17%; }
.loader-stars span:nth-child(18) { --x: 5%; --y: 86%; }
.loader-stars span:nth-child(19) { --x: 17%; --y: 24%; }
.loader-stars span:nth-child(20) { --x: 27%; --y: 67%; }
.loader-stars span:nth-child(21) { --x: 39%; --y: 4%; }
.loader-stars span:nth-child(22) { --x: 49%; --y: 48%; }
.loader-stars span:nth-child(23) { --x: 61%; --y: 31%; }
.loader-stars span:nth-child(24) { --x: 70%; --y: 83%; }
.loader-stars span:nth-child(25) { --x: 82%; --y: 6%; }
.loader-stars span:nth-child(26) { --x: 96%; --y: 63%; }
.loader-stars span:nth-child(27) { --x: 11%; --y: 57%; }
.loader-stars span:nth-child(28) { --x: 67%; --y: 44%; }

.loader-logo {
  align-items: center;
  animation: floatLogo 2.8s ease-in-out infinite;
  background: linear-gradient(#070a18, #070a18) padding-box, linear-gradient(135deg, #7c3aed, #ec4899, #facc15) border-box;
  border: 2px solid transparent;
  border-radius: 999px;
  box-shadow: 0 0 34px rgba(168, 85, 247, 0.38);
  display: flex;
  height: 94px;
  justify-content: center;
  width: 94px;
}

.loader-logo img { max-height: 68px; max-width: 74px; object-fit: contain; }

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

@keyframes driftStar {
  0%, 100% { opacity: 0.28; transform: translate3d(0, 0, 0) scale(0.85); }
  50% { opacity: 0.9; transform: translate3d(12px, -14px, 0) scale(1.15); }
}

.with-logo .loader-copy strong {
  font-size: clamp(28px, 5vw, 48px);
  line-height: 0.98;
}

.with-logo .loader-copy p {
  font-size: 15px;
  line-height: 1.5;
  margin-left: auto;
  margin-right: auto;
  max-width: 420px;
}

.loader-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
}

.loader-dots i {
  animation: pulseDot 1.1s ease-in-out infinite;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  height: 9px;
  width: 9px;
}

.loader-dots i:nth-child(2) { animation-delay: 0.16s; }
.loader-dots i:nth-child(3) { animation-delay: 0.32s; }

@keyframes floatLogo {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes pulseDot {
  0%, 100% { opacity: 0.38; transform: translateY(0) scale(0.82); }
  50% { opacity: 1; transform: translateY(-5px) scale(1); }
}

@media (max-width: 640px) {
  .loader-logo { height: 78px; width: 78px; }
  .loader-logo img { max-height: 56px; max-width: 60px; }
}

@media (prefers-reduced-motion: reduce) {
  .loader-stars span,
  .loader-logo,
  .loader-orbit span,
  .loader-dots i {
    animation: none;
  }
}
</style>
