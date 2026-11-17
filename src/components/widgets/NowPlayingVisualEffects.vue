<script setup>
import { computed, useId } from 'vue'
const props = defineProps({ settings: Object, appearance: Object })
const id = 'np-border-' + useId().replace(/:/g, '')
const w = computed(() => props.settings.width - 20)
const h = computed(() => props.settings.height - 28)
const inset = computed(() => props.settings.borderWidth / 2 + 1)
const radius = computed(() => Math.max(0, props.settings.cornerRadius - inset.value))
</script>

<template>
  <div class="np-visual-effects" aria-hidden="true">
    <svg v-if="settings.effectsEnabled && ['emerald','crystal'].includes(settings.appearance)" class="np-hyrule-glyph" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="88" stroke="currentColor" stroke-width="1" />
      <circle cx="100" cy="100" r="80" stroke="currentColor" stroke-width="3" stroke-dasharray="2 7 6 7" />
      <path d="m100 48 24 42H76ZM76 90l24 42H52Zm48 0 24 42h-48Z" fill="currentColor" />
      <path d="m43 107 24 10-9 10-24-9m132-11-24 10 9 10 24-9M72 143l28 16 28-16M100 159v12" stroke="currentColor" stroke-width="4" />
    </svg>
    <svg v-if="settings.effectsEnabled && ['emerald','crystal'].includes(settings.appearance)" class="np-corner-ornaments" viewBox="0 0 520 172" preserveAspectRatio="none" fill="none">
      <g stroke="currentColor" stroke-width="1" opacity=".65"><path d="M18 45V18h32M470 18h32v27M18 127v27h32M470 154h32v-27"/><path d="m25 32 7-7 7 7-7 7Zm456 0 7-7 7 7-7 7ZM25 140l7-7 7 7-7 7Zm456 0 7-7 7 7-7 7Z"/></g>
    </svg>
    <span v-if="settings.effectsEnabled && settings.reflections" class="np-panel-reflection"></span>
    <svg v-if="appearance.border!=='original' && appearance.border!=='none'" class="np-border-svg" :class="'np-border-'+appearance.border" :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none">
      <defs><linearGradient :id="id" x1="0" y1="1" x2="1" y2="0"><stop offset="0" :stop-color="appearance.accent"/><stop offset=".38" :stop-color="appearance.primary"/><stop offset=".7" :stop-color="settings.appearance==='holographic'?'#ed9cda':appearance.accent"/><stop offset="1" :stop-color="appearance.ink"/></linearGradient></defs>
      <rect class="np-border-base" :x="inset" :y="inset" :width="w-inset*2" :height="h-inset*2" :rx="radius" :stroke="appearance.border==='solid'?appearance.accent:`url(#${id})`" :stroke-width="settings.borderWidth" pathLength="100" />
      <rect v-if="settings.effectsEnabled && ['travel','holographic'].includes(appearance.border)" class="np-border-runner" :x="inset" :y="inset" :width="w-inset*2" :height="h-inset*2" :rx="radius" :stroke="appearance.ink" :stroke-width="settings.borderWidth+1" pathLength="100" stroke-dasharray="9 91" />
    </svg>
  </div>
</template>

<style scoped>
.np-visual-effects{position:absolute;inset:0;pointer-events:none;border-radius:inherit;overflow:hidden;z-index:0}
.np-hyrule-glyph{position:absolute;width:clamp(90px,28%,160px);height:100%;right:10px;top:0;color:var(--np-accent);opacity:.12}
.np-corner-ornaments,.np-border-svg{position:absolute;inset:0;width:100%;height:100%;color:var(--np-accent)}
.np-border-svg{fill:none;overflow:visible}.np-border-base{opacity:.9}.np-border-runner{stroke-linecap:round;opacity:var(--np-effect-alpha);filter:drop-shadow(0 0 calc(3px * var(--np-glow-alpha)) var(--np-accent));animation:np-border-orbit var(--np-speed) linear infinite}
.np-border-glow .np-border-base{filter:drop-shadow(0 0 calc(5px * var(--np-glow-alpha)) var(--np-accent))}
.np-border-holographic .np-border-runner{stroke-dasharray:20 80;opacity:calc(var(--np-effect-alpha) * .65)}
.np-panel-reflection{position:absolute;inset:0;background:linear-gradient(125deg,transparent 28%,#ffffff08 45%,#ffffff0e 48%,transparent 62%);opacity:var(--np-effect-alpha)}
@keyframes np-border-orbit{to{stroke-dashoffset:-100}}
:global(.np-motion-off) .np-border-runner{animation:none;stroke-dashoffset:-12;filter:none}
:global(.np-static-effects) .np-border-runner{animation:none;stroke-dashoffset:-12;filter:none}
:global(.np-entry-triforce) .np-border-base{stroke-dasharray:100;animation:np-border-draw var(--np-in) ease both}
:global(.np-entry-crystal) .np-panel-reflection{animation:np-crystal-sheen var(--np-in) ease both}
@keyframes np-border-draw{0%,50%{stroke-dashoffset:100}90%,100%{stroke-dashoffset:0}}
@keyframes np-crystal-sheen{0%{transform:translateX(-100%);opacity:0}30%{opacity:.6}100%{transform:translateX(100%);opacity:0}}
@media(prefers-reduced-motion:reduce){.np-border-runner{animation:none;filter:none}}
</style>
