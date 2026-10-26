<template>
<div class="haunt" aria-hidden="true">
<svg class="moon" viewBox="0 0 40 40"><path d="M30 5A17 17 0 1 0 35 30 16 16 0 0 1 30 5Z" fill="currentColor"/></svg>
<svg v-for="n in 2" :key="n" :class="['bat','bat-'+n]" viewBox="0 0 64 32"><path d="M2 4 18 12 25 10 28 3 32 9 36 3 39 10 46 12 62 4 57 24 47 20 41 28 32 23 23 28 17 20 7 24Z" fill="currentColor"/></svg>
<svg class="ghost" viewBox="0 0 32 40"><path d="M4 36V16a12 12 0 0 1 24 0v20l-6-4-6 4-6-4Z" fill="currentColor"/><g fill="#291438"><ellipse cx="12" cy="16" rx="2" ry="3"/><ellipse cx="21" cy="16" rx="2" ry="3"/><ellipse cx="17" cy="24" rx="2" ry="3"/></g></svg>
<svg class="pumpkin" viewBox="0 0 44 40"><path d="m22 10 2-8 6 1-5 8" stroke="#b8cc69" stroke-width="3" fill="none"/><path d="M22 10C0 2-5 38 18 37h8C49 38 44 2 22 10Z" fill="currentColor"/><path d="M18 12c-7 7-7 17-2 24m10-24c7 7 7 17 2 24" fill="none" stroke="#b84d21"/><path d="m10 22 6-7 3 8Zm15 1 3-8 6 7ZM12 27l7 3 3-3 3 3 7-3-5 7H17Z" fill="#291438"/></svg>
</div></template>
<style scoped>
.haunt{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit;z-index:0}.haunt svg{position:absolute;display:block}.moon{width:34px;right:7%;top:6%;color:#ffe5a3;filter:drop-shadow(0 0 9px #ffc76c88)}.bat{width:28px;color:#b69ad9;animation:haunt-float 5s ease-in-out infinite}.bat-1{left:4%;top:8%;rotate:-14deg}.bat-2{right:20%;top:7%;width:21px;animation-delay:-2s}.ghost{width:18px;right:2%;bottom:9%;color:#f3eaff;opacity:.7;animation:haunt-float 4s ease-in-out infinite}.pumpkin{width:24px;left:3%;bottom:3%;color:#ff973e}
@keyframes haunt-float{50%{translate:0 -4px;rotate:7deg}}@media(prefers-reduced-motion:reduce){.bat,.ghost{animation:none}}
</style>