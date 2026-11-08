<script setup>
import { computed } from 'vue'
import TriforceSymbol from '../TriforceSymbol.vue'
const props = defineProps({ settings: { type: Object, required: true } })
const motes = computed(() => Array.from({ length: props.settings.particleCount }, (_, index) => ({
  id: index,
  style: { left: ((index*37+7)%100)+'%', top: ((index*23+11)%100)+'%', '--mote-size': (index%4===0?5:2)+'px', animationDelay: (-index*.83)+'s', '--drift-time': (props.settings.speed*(2+index%3))+'s' }
})))
</script>
<template>
  <div class="camera-background" :class="[settings.theme.id, { moving: settings.animated }]" :style="{filter:'brightness('+settings.backgroundBrightness+'%)'}" aria-hidden="true">
    <div class="background-aurora aurora-one"></div><div class="background-aurora aurora-two"></div>
    <div v-if="settings.energy" class="background-ribbons"></div>
    <div v-if="settings.waves" class="background-rings"><span></span><span></span><span></span></div>
    <div v-if="settings.decorations" class="background-sigil"><TriforceSymbol v-if="settings.theme.id==='zelda'"/><i v-else-if="settings.theme.id==='halloween'" class="fas fa-moon"></i><span v-else>✦</span></div>
    <div class="background-motes"><span v-for="mote in motes" :key="mote.id" :style="mote.style"></span></div>
    <div class="background-vignette"></div>
  </div>
</template>
<style scoped>
.camera-background{position:absolute;inset:0;overflow:hidden;border-radius:var(--radius);isolation:isolate;background:radial-gradient(ellipse at 20% 15%,#392360,transparent 65%),linear-gradient(145deg,#070c20,var(--surface));pointer-events:none}
.background-aurora{position:absolute;width:110%;height:100%;border-radius:50%;opacity:.6;will-change:transform;background:radial-gradient(ellipse at center,var(--primary),transparent 65%)}
.aurora-one{left:-48%;top:-40%;transform:rotate(-20deg)}.aurora-two{right:-55%;bottom:-45%;background:radial-gradient(ellipse at center,var(--secondary),transparent 65%);opacity:.35}
.background-ribbons{position:absolute;inset:-40%;opacity:.22;background:repeating-linear-gradient(120deg,transparent 0 14%,var(--primary) 18%,transparent 22% 36%);transform:rotate(-12deg);background-size:180% 100%;mix-blend-mode:screen}
.background-rings{position:absolute;width:70%;aspect-ratio:1;right:-16%;top:-30%;opacity:.3}.background-rings span{position:absolute;inset:0;border:1px solid var(--secondary);border-radius:50%;box-shadow:0 0 14px var(--primary);transform:scale(.5)}.background-rings span:nth-child(2){inset:15%;opacity:.65}.background-rings span:nth-child(3){inset:30%;opacity:.4}
.background-sigil{position:absolute;right:8%;top:17%;font-size:clamp(60px,calc(var(--icon-size) * 2.2),220px);color:var(--secondary);opacity:.16;filter:drop-shadow(0 0 15px var(--primary));transform:rotate(-8deg)}
.background-motes{position:absolute;inset:0}.background-motes span{position:absolute;width:var(--mote-size);height:var(--mote-size);background:var(--secondary);border-radius:50%;box-shadow:0 0 7px var(--primary);opacity:.65}
.background-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 20%,#0007 100%)}
.zelda{background:radial-gradient(ellipse at 25% 65%,#245632,transparent 65%),linear-gradient(135deg,#03190f,#122b1e 55%,#423115)}.zelda .aurora-one{opacity:.28}.zelda .aurora-two{opacity:.2}.zelda .background-ribbons{opacity:.1}.zelda .background-sigil{opacity:.3;transform:none}.zelda .background-motes span:nth-child(3n){clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:0}
.nebula{background:radial-gradient(ellipse at 30% 70%,#073951,transparent 70%),linear-gradient(130deg,#031329,#092449)}
.solar{background:radial-gradient(ellipse at 70% 30%,#763129,transparent 70%),linear-gradient(135deg,#281020,#491a26)}.solar .background-motes span{height:calc(var(--mote-size) * 2);background:#ffcf83}
.halloween{background:radial-gradient(ellipse at 75% 5%,#4a2066,transparent 65%),linear-gradient(145deg,#0d071c,#311022)}.halloween .background-sigil{opacity:.5}.halloween .aurora-one{opacity:.25}
.minimal{background:linear-gradient(145deg,#090e19,#253043)}.minimal .background-aurora{opacity:.06}.minimal .background-ribbons,.minimal .background-rings{opacity:.07}.minimal .background-sigil{opacity:.08}.minimal .background-motes{opacity:.25}
.moving .aurora-one{animation:background-aurora calc(var(--speed) * 3) ease-in-out infinite alternate}.moving .aurora-two{animation:background-aurora calc(var(--speed) * 4) ease-in-out -5s infinite alternate-reverse}
.moving .background-ribbons{animation:background-ribbon calc(var(--speed) * 3) linear infinite}.moving .background-rings{animation:background-turn calc(var(--speed) * 10) linear infinite}.moving .background-rings span{animation:background-breathe calc(var(--speed) * 2) ease-in-out infinite alternate}
.moving .background-motes span{animation:background-drift var(--drift-time) ease-in-out infinite alternate}.moving .background-sigil{animation:background-sigil calc(var(--speed) * 2) ease-in-out infinite alternate}
@keyframes background-aurora{to{transform:translate(20%,16%) rotate(25deg) scale(1.15)}}
@keyframes background-ribbon{to{background-position:180% 0}}
@keyframes background-turn{to{transform:rotate(360deg)}}
@keyframes background-breathe{to{transform:scale(1.15);opacity:.3}}
@keyframes background-drift{0%{transform:translate3d(-8px,22px,0);opacity:.2}50%{opacity:.9}100%{transform:translate3d(18px,-36px,0);opacity:.4}}
@keyframes background-sigil{to{translate:0 -10px;filter:drop-shadow(0 0 24px var(--primary))}}
@media(prefers-reduced-motion:reduce){.moving *{animation:none!important}.background-aurora{will-change:auto}}
</style>
