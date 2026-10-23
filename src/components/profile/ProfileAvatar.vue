<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  fallback: { type: String, default: '' },
  effect: { type: Object, default: () => ({}) },
  roleBadge: { type: String, default: '' },
  label: { type: String, default: '' },
  decorative: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const imageFailed = ref(false)
const imageSrc = computed(() => imageFailed.value ? '' : (props.src || props.fallback || ''))
const initial = () => String(props.label || props.alt || '?').trim().slice(0, 1).toUpperCase() || '?'

watch(() => [props.src, props.fallback], () => {
  imageFailed.value = false
})
</script>

<template>
  <span
    class="profile-avatar-ui"
    :class="{ special: effect?.special && !loading, loading }"
    :style="{ '--avatar-effect': effect?.effectColor || '#a855f7' }"
    :aria-busy="loading ? 'true' : undefined"
  >
    <span class="profile-avatar-ui-frame">
      <span class="profile-avatar-ui-clip">
        <span v-if="loading" class="profile-avatar-ui-loader" aria-hidden="true">
          <span></span>
        </span>
        <img
          v-else-if="imageSrc"
          :src="imageSrc"
          :alt="decorative ? '' : alt"
          :aria-hidden="decorative ? 'true' : undefined"
          @error="imageFailed = true"
        />
        <b v-else>{{ initial() }}</b>
      </span>
    </span>
    <em v-if="roleBadge" class="profile-avatar-ui-role">{{ roleBadge }}</em>
  </span>
</template>

<style scoped>
.profile-avatar-ui {
  --avatar-size: 44px;
  --avatar-border: 2px;
  --avatar-role-offset: -6px;
  --avatar-effect-soft: color-mix(in srgb, var(--avatar-effect), transparent 72%);
  display: inline-flex;
  flex: 0 0 auto;
  height: var(--avatar-size);
  position: relative;
  width: var(--avatar-size);
}

.profile-avatar-ui.special::before,
.profile-avatar-ui-frame {
  align-items: center;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #7c3aed, #ec4899) border-box;
  border: var(--avatar-border) solid transparent;
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(124, 58, 237, 0.22);
  color: #ffffff;
  display: flex;
  font-size: calc(var(--avatar-size) * 0.32);
  font-weight: 950;
  height: 100%;
  justify-content: center;
  overflow: visible;
  position: relative;
  width: 100%;
  z-index: 1;
}

.profile-avatar-ui.special .profile-avatar-ui-frame {
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    conic-gradient(from 0deg, var(--avatar-effect), #ffffff, var(--avatar-effect), #ec4899, var(--avatar-effect)) border-box;
  box-shadow:
    0 0 0 calc(var(--avatar-border) * 1.45) color-mix(in srgb, var(--avatar-effect), transparent 64%),
    0 0 calc(var(--avatar-size) * 0.42) color-mix(in srgb, var(--avatar-effect), transparent 12%);
}

.profile-avatar-ui-clip {
  align-items: center;
  background:
    radial-gradient(circle at 35% 28%, rgba(236, 72, 153, 0.36), transparent 42%),
    linear-gradient(135deg, #1f1148, #050816 72%);
  border-radius: inherit;
  display: flex;
  height: 100%;
  justify-content: center;
  overflow: hidden;
  position: absolute;
  inset: 0;
  width: 100%;
  z-index: 1;
}

.profile-avatar-ui img {
  border-radius: inherit;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  position: relative;
  width: 100%;
  z-index: 1;
}

.profile-avatar-ui b {
  color: #ffffff;
  position: relative;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.32);
  z-index: 1;
}

.profile-avatar-ui-loader{position:absolute;inset:0;overflow:hidden;border-radius:inherit;background:#251449}.profile-avatar-ui-loader span{position:absolute;inset:-30%;background:radial-gradient(ellipse at 25% 65%,#c084fc,transparent 58%),radial-gradient(ellipse at 75% 30%,#22d3ee,transparent 60%),radial-gradient(ellipse at 65% 80%,#ec4899,transparent 60%);background-size:140% 140%;animation:profileAvatarAurora 1.8s ease-in-out infinite alternate}.profile-avatar-ui img{animation:profileAvatarReveal .25s ease-out}
.profile-avatar-ui-role {
  background: rgba(7, 11, 28, 0.96);
  border: 2px solid #ffffff;
  border-radius: 999px;
  bottom: var(--avatar-role-offset);
  color: #ffffff;
  font-size: max(8px, calc(var(--avatar-size) * 0.085));
  font-style: normal;
  font-weight: 950;
  left: 50%;
  line-height: 1;
  max-width: calc(var(--avatar-size) * 0.78);
  overflow: hidden;
  padding: 4px 7px;
  position: absolute;
  text-overflow: ellipsis;
  text-transform: uppercase;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 3;
}

@keyframes profileAvatarHalo {
  0%,
  100% {
    opacity: 0.56;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.94;
    transform: scale(1.06);
  }
}

@keyframes profileAvatarAurora { from { transform:translate(-5%,3%);opacity:.65 } to { transform:translate(5%,-3%);opacity:1 } }
@keyframes profileAvatarReveal { from { opacity:0 } to { opacity:1 } }

@media (prefers-reduced-motion: reduce) {
  .profile-avatar-ui-loader span,.profile-avatar-ui img,.profile-avatar-ui.special::before {
    animation: none;
  }
}
</style>
