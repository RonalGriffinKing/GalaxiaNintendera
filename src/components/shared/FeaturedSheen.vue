<script setup>
defineProps({gold:Boolean})
const motes=Array.from({length:28},(_,i)=>({left:((i*37+13)%100)+'%',top:((i*29+11)%100)+'%','--delay':(-i*.65)+'s','--duration':(5+i%4)+'s'}))
</script>
<template><span class="featured-sheen" :class="{'is-gold':gold}" aria-hidden="true"><i class="foil-prism"></i><i class="foil-rim"></i><span class="foil-dots"><i v-for="(style,index) in motes" :key="index" class="foil-dot" :style="style"></i></span></span></template>
<style scoped>
.featured-sheen{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;border-radius:inherit;--shine-base:var(--visual-accent,#76dfff);--shine-a:color-mix(in srgb,var(--shine-base) 75%,#fff);--shine-b:color-mix(in srgb,var(--shine-base) 65%,#d6b6ff);--shine-c:color-mix(in srgb,var(--shine-base) 65%,#ffdaee)}.featured-sheen.is-gold{--shine-base:#e9b92f;--shine-a:#ffe99a;--shine-b:#ffcf66;--shine-c:#fff5d4}.featured-sheen::before{content:'';position:absolute;top:-50%;left:-70%;width:45%;height:200%;opacity:0;background:linear-gradient(90deg,transparent,var(--shine-a) 35%,var(--shine-b) 50%,var(--shine-c) 65%,transparent);transform:translate3d(0,0,0) rotate(20deg);animation:featured-hologram 10s ease-in-out infinite}.featured-sheen::after{display:none}.foil-prism{position:absolute;inset:-25%;pointer-events:none;opacity:.16;background:radial-gradient(ellipse at 20% 30%,var(--shine-a),transparent 45%),radial-gradient(ellipse at 65% 50%,var(--shine-b),transparent 50%),radial-gradient(ellipse at 80% 20%,var(--shine-c),transparent 40%);mix-blend-mode:screen;animation:foil-prism-drift 18s ease-in-out infinite alternate}.foil-dots{position:absolute;inset:0;pointer-events:none}.foil-dot{position:absolute;width:3px;height:3px;border-radius:50%;background:var(--shine-c);box-shadow:0 0 7px 1px color-mix(in srgb,var(--shine-a) 60%,transparent);opacity:.3;animation:foil-mote var(--duration) ease-in-out var(--delay) infinite alternate}
@keyframes featured-hologram{0%,8%{transform:translate3d(0,0,0) rotate(20deg);opacity:0}30%,45%{opacity:.25}85%,100%{transform:translate3d(430%,0,0) rotate(20deg);opacity:0}}@keyframes foil-prism-drift{from{transform:translate3d(-6%,-3%,0)}to{transform:translate3d(6%,3%,0)}}@keyframes foil-mote{from{transform:translate3d(0,8px,0);opacity:.12}to{transform:translate3d(4px,-12px,0);opacity:.85}}
.foil-rim{display:none}
.foil-dot:nth-child(5n){width:4px;height:4px;background:transparent;box-shadow:none}.foil-dot:nth-child(5n)::before,.foil-dot:nth-child(5n)::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:100%;background:var(--shine-a);box-shadow:0 0 7px var(--shine-base)}.foil-dot:nth-child(5n)::before{width:2px;height:10px}.foil-dot:nth-child(5n)::after{width:10px;height:2px}

@media(prefers-reduced-motion:reduce){.featured-sheen::before{animation:none;display:none}.foil-prism,.foil-dot,.foil-rim{animation:none}.foil-prism{opacity:.04}.foil-dot{opacity:.2}}
</style>

<style scoped>
/* Touch scrolling never competes with moving full-card paint layers. */
@media(max-width:760px),(hover:none) and (pointer:coarse){
 .featured-sheen::before,.foil-prism{display:none;animation:none}
 .foil-dot{animation:none;opacity:.4;box-shadow:none}
 .foil-dot:nth-child(n+13){display:none}
 .foil-dot:nth-child(5n)::before,.foil-dot:nth-child(5n)::after{box-shadow:none}
}
</style>
