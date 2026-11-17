<script setup>
import { computed } from 'vue'

const props = defineProps({ theme: Object, index: { type: Number, default: 0 } })
const zelda = computed(() => /zelda|hyrule/i.test(props.theme?.id || ''))
const palette = computed(() => {
  const colors = props.theme?.config?.general || {}
  return {
    '--scene-base': colors.background || '#080c20',
    '--scene-primary': colors.primary || '#7c3aed',
    '--scene-secondary': colors.secondary || '#4c1d95',
    '--scene-light': colors.accent || '#67e8f9'
  }
})
// Fixed positions keep the editor, PNG and video captures identical.
const motes = computed(() => Array.from({ length: 32 }, (_, n) => ({
  x: 3 + ((n * 37 + props.index * 19) % 94),
  y: 3 + ((n * 53 + props.index * 13) % 94),
  size: n % 5 === 0 ? 6 : 3,
  opacity: n % 3 === 0 ? .55 : .22
})))
</script>

<template>
  <div class="social-theme-background" :class="{ 'forest-scene': zelda }" :style="palette" aria-hidden="true">
    <div class="scene-light scene-light-top"></div>
    <div class="scene-light scene-light-bottom"></div>
    <div class="scene-frame"></div>
    <svg class="scene-motes" viewBox="0 0 100 100" preserveAspectRatio="none">
      <circle v-for="(mote,n) in motes" :key="n" :cx="mote.x" :cy="mote.y" :r="mote.size / 14" :opacity="mote.opacity" fill="var(--scene-light)" />
    </svg>
    <template v-if="zelda">
      <svg class="scene-crest" viewBox="0 0 180 180" fill="none">
        <circle cx="90" cy="90" r="84" stroke="currentColor" stroke-width="1" stroke-dasharray="2 10" />
        <path d="m90 32 30 52H60Zm-30 52 30 52H30Zm60 0 30 52H90Z" fill="currentColor" opacity=".6" />
        <path d="M24 148h132M42 158h96" stroke="currentColor" />
      </svg>
      <svg class="scene-forest" viewBox="0 0 1080 1920" preserveAspectRatio="none" fill="none">
        <g stroke="var(--scene-primary)" stroke-width="3" opacity=".45">
          <path d="M-30 1920Q85 1480 22 990T55 0M1110 1920Q985 1440 1055 920T1030 0" stroke-width="42" />
          <path d="M30 420Q110 270 210 240M38 700Q140 570 180 420M1045 340Q930 230 850 220M1040 780Q950 600 900 540M28 1600Q120 1440 180 1390M1040 1660Q950 1460 880 1420" />
        </g>
        <g fill="var(--scene-light)" opacity=".18">
          <path d="M95 190q44-55 75-35-6 43-75 35ZM1000 360q-52-57-77-27 17 38 77 27ZM80 1450q45-65 75-38-9 43-75 38ZM995 1610q-55-70-83-34 15 43 83 34Z" />
        </g>
      </svg>
    </template>
    <template v-else>
      <svg class="scene-crest" viewBox="0 0 180 180" fill="none">
        <circle cx="90" cy="90" r="72" stroke="currentColor" opacity=".4" />
        <path d="m90 28 14 48 48 14-48 14-14 48-14-48-48-14 48-14Z" fill="currentColor" opacity=".55" />
        <circle cx="90" cy="90" r="84" stroke="currentColor" stroke-dasharray="3 12" />
      </svg>
    </template>
  </div>
</template>

<style scoped>
.social-theme-background{position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:none;background:radial-gradient(ellipse at 90% 0,color-mix(in srgb,var(--scene-primary) 60%,transparent),transparent 48%),radial-gradient(ellipse at 0 100%,color-mix(in srgb,var(--scene-secondary) 55%,transparent),transparent 55%),var(--scene-base)}
.scene-light{position:absolute;width:80%;height:48%;border-radius:50%;background:radial-gradient(ellipse,color-mix(in srgb,var(--scene-light) 12%,transparent),transparent 68%)}
.scene-light-top{top:-20%;right:-25%}.scene-light-bottom{bottom:-25%;left:-20%}
.scene-frame{position:absolute;inset:2.8%;border:1px solid color-mix(in srgb,var(--scene-light) 24%,transparent);border-radius:28px}
.scene-frame::after{content:'';position:absolute;inset:9px;border:1px solid color-mix(in srgb,var(--scene-primary) 30%,transparent);border-radius:21px}
.scene-motes,.scene-forest{position:absolute;inset:0;width:100%;height:100%}
.scene-crest{position:absolute;right:5%;top:8%;width:19%;height:auto;color:var(--scene-light);opacity:.32}
.forest-scene{background:radial-gradient(ellipse at 90% 0,#528d5838,transparent 50%),radial-gradient(ellipse at 0 100%,#b69b3424,transparent 55%),var(--scene-base)}
.forest-scene .scene-light-top{background:radial-gradient(ellipse,#f5d66b22,transparent 68%)}
</style>
