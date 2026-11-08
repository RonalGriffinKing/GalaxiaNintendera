<script setup>
import { computed, useId } from 'vue'
import { cameraFrameSettings } from '@/services/cameraFrame'
import TriforceSymbol from '../TriforceSymbol.vue'
import CameraBackground from './CameraBackground.vue'

const props = defineProps({ widget: { type: Object, required: true } })
const settings = computed(() => cameraFrameSettings(props.widget.data))
const gradientId = 'camera-frame-' + useId().replace(/[^a-z0-9_-]/gi, '')
const inset = computed(() => settings.value.borderWidth / 2 + 2)
const orbitPath = computed(() => {
  const s = settings.value, i = inset.value, r = Math.min(s.radius, (s.width-i*2)/2, (s.height-i*2)/2)
  const right = s.width-i, bottom = s.height-i
  return `path("M ${i+r} ${i} H ${right-r} Q ${right} ${i} ${right} ${i+r} V ${bottom-r} Q ${right} ${bottom} ${right-r} ${bottom} H ${i+r} Q ${i} ${bottom} ${i} ${bottom-r} V ${i+r} Q ${i} ${i} ${i+r} ${i} Z")`
})
const particles = computed(() => Array.from({ length: settings.value.particleCount }, (_, index) => ({
  id: index, style: { '--delay': `${-index*settings.value.speed/settings.value.particleCount}s`, '--dot-size': `${index%3===0?5:3}px` }
})))
const frameStyle = computed(() => ({
  width: settings.value.width + 'px', height: settings.value.height + 'px',
  '--primary': settings.value.theme.primary, '--secondary': settings.value.theme.secondary,
  '--ink': settings.value.theme.ink, '--surface': settings.value.theme.surface,
  '--glow': settings.value.glow + 'px', '--radius': settings.value.radius + 'px',
  '--icon-size': settings.value.iconSize + 'px', '--speed': settings.value.speed + 's', '--orbit-path': orbitPath.value,
  '--frame-inset': inset.value + 'px'
}))
</script>

<template>
  <div class="camera-frame" :class="[settings.theme.id, 'border-'+settings.borderStyle, { animated: settings.animated, decorated: settings.decorations }]" :style="frameStyle" :aria-label="settings.mode==='background'?'Fondo de cámara':'Marco de cámara'">
    <CameraBackground v-if="settings.mode!=='frame'" :settings="settings" />
    <template v-if="settings.mode!=='background'">
    <svg class="frame-outline" :viewBox="`0 0 ${settings.width} ${settings.height}`" fill="none" aria-hidden="true">
      <defs><linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--primary)"/><stop offset=".5" stop-color="var(--secondary)"/><stop offset="1" stop-color="var(--primary)"/></linearGradient></defs>
      <rect class="base-border" :x="inset" :y="inset" :width="settings.width-inset*2" :height="settings.height-inset*2" :rx="settings.radius" :stroke="`url(#${gradientId})`" :stroke-width="settings.borderWidth" />
      <rect v-if="settings.borderStyle==='double'" class="inner-border" :x="inset+settings.borderWidth+4" :y="inset+settings.borderWidth+4" :width="settings.width-(inset+settings.borderWidth+4)*2" :height="settings.height-(inset+settings.borderWidth+4)*2" :rx="Math.max(0,settings.radius-settings.borderWidth-4)" stroke="var(--secondary)" stroke-width="1.5" />
      <template v-if="settings.animated">
        <rect v-if="settings.energy" class="frame-energy" :x="inset" :y="inset" :width="settings.width-inset*2" :height="settings.height-inset*2" :rx="settings.radius" pathLength="1000" stroke="var(--secondary)" :stroke-width="settings.borderWidth+1" stroke-linecap="round" />
        <template v-if="settings.waves"><rect v-for="wave in 2" :key="wave" class="frame-wave" :style="{animationDelay:wave===2?'calc(var(--speed) / -2)':'0s'}" :x="inset" :y="inset" :width="settings.width-inset*2" :height="settings.height-inset*2" :rx="settings.radius" stroke="var(--primary)" stroke-width="1.5" /></template>
      </template>
    </svg>
    <div v-if="settings.animated && settings.particleCount" class="frame-particles" aria-hidden="true"><span v-for="particle in particles" :key="particle.id" class="frame-particle" :style="particle.style"></span></div>
    <span v-if="settings.borderStyle==='corners'" v-for="corner in ['tl','tr','bl','br']" :key="'border-'+corner" class="frame-corner border-only-corner" :class="corner" aria-hidden="true"></span>
    <template v-if="settings.decorations">
      <span v-for="corner in ['tl','tr','bl','br']" :key="corner" class="frame-corner" :class="corner" aria-hidden="true"></span>
      <span v-if="settings.showIcon" class="frame-emblem" aria-hidden="true"><TriforceSymbol v-if="settings.theme.id==='zelda'"/><svg v-else-if="settings.theme.id==='halloween'" class="emblem-glyph" viewBox="0 0 32 32" fill="currentColor"><path d="M23 3A14 14 0 1 0 29 23 12 12 0 0 1 23 3Z"/></svg><svg v-else class="emblem-glyph" viewBox="0 0 32 32" fill="currentColor"><path d="M16 1 20 12 31 16 20 20 16 31 12 20 1 16 12 12Z"/></svg></span>
      <span v-if="settings.theme.id!=='minimal'" class="frame-spark" aria-hidden="true">✦</span>
    </template>
    </template>
    <span v-if="settings.showLabel && settings.label" class="frame-label">{{ settings.label }}</span>
  </div>
</template>

<style scoped>
.camera-frame{position:relative;box-sizing:border-box;background:transparent;pointer-events:none;color:var(--ink);font-family:var(--font-family-base,system-ui,sans-serif)}
.border-corners .base-border,.border-corners .frame-energy,.border-corners .frame-wave{display:none}
.camera-frame .border-only-corner{width:22%;height:22%;border-width:3px}
.inner-border{opacity:.75}
.frame-outline{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 var(--glow) var(--primary))}
.frame-corner{position:absolute;width:26px;height:26px;border:2px solid var(--secondary);filter:drop-shadow(0 0 4px var(--primary))}
.tl{top:2px;left:2px;border-right:0;border-bottom:0;border-top-left-radius:var(--radius)}.tr{top:2px;right:2px;border-left:0;border-bottom:0;border-top-right-radius:var(--radius)}
.bl{bottom:2px;left:2px;border-right:0;border-top:0;border-bottom-left-radius:var(--radius)}.br{bottom:2px;right:2px;border-left:0;border-top:0;border-bottom-right-radius:var(--radius)}
.frame-emblem{position:absolute;top:var(--frame-inset);left:50%;transform:translate(-50%,-50%);box-sizing:border-box;display:grid;place-items:center;width:calc(var(--icon-size) * 1.5);height:calc(var(--icon-size) * 1.25);border:2px solid var(--primary);border-radius:12px;background:var(--surface);color:var(--secondary);font-size:var(--icon-size);line-height:1;filter:drop-shadow(0 0 5px var(--primary));z-index:2}
.emblem-glyph{display:block;width:1em;height:1em}
.frame-emblem .triforce-symbol{font-size:var(--icon-size);transform:translateY(-2px)}
.frame-spark{position:absolute;right:34px;bottom:-6px;font-size:19px;line-height:1;color:var(--secondary);text-shadow:0 0 8px var(--primary)}
.frame-label{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);max-width:calc(100% - 76px);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:var(--surface);border:1px solid var(--primary);border-radius:8px;padding:4px 14px;color:var(--ink);font-size:12px;line-height:1.4;font-weight:700;letter-spacing:1px}
.minimal .frame-outline{filter:none}.minimal .frame-corner{filter:none}.minimal .frame-emblem{display:none}
.zelda .frame-label{border-radius:3px;letter-spacing:1.5px}.zelda .frame-corner{width:32px;height:32px}
.animated .frame-spark{animation:camera-sparkle 3s ease-in-out infinite}.animated:not(.minimal) .frame-emblem{animation:camera-relic 4s ease-in-out infinite}
@keyframes camera-sparkle{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes camera-relic{0%,100%{filter:drop-shadow(0 0 3px var(--primary))}50%{filter:drop-shadow(0 0 9px var(--primary))}}
.frame-energy{stroke-dasharray:90 160 20 230;animation:camera-energy var(--speed) linear infinite;filter:drop-shadow(0 0 4px var(--secondary))}
.frame-wave{transform-origin:center;animation:camera-wave var(--speed) ease-out infinite;opacity:0}
.frame-particles{position:absolute;inset:0;pointer-events:none}
.frame-particle{position:absolute;top:0;left:0;width:var(--dot-size);height:var(--dot-size);border-radius:50%;background:var(--secondary);box-shadow:0 0 5px var(--secondary),0 0 10px var(--primary);offset-path:var(--orbit-path);offset-rotate:0deg;animation:camera-orbit var(--speed) var(--delay) linear infinite}
.zelda .frame-particle:nth-child(3n){clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:0}
.solar .frame-particle{box-shadow:0 0 6px #ffcd66,0 0 14px var(--primary)}
@keyframes camera-energy{to{stroke-dashoffset:-1000}}
@keyframes camera-wave{0%{transform:scale(1);opacity:0}15%{opacity:.65}100%{transform:scale(1.055,1.08);opacity:0}}
@keyframes camera-orbit{to{offset-distance:100%}}
@media(prefers-reduced-motion:reduce){.animated .frame-spark,.animated .frame-emblem,.frame-energy,.frame-wave,.frame-particle{animation:none}.frame-wave,.frame-particles{display:none}.frame-energy{opacity:.5}}
</style>
