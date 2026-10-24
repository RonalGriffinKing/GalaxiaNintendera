<script setup>
defineProps({ module: { type: String, default: 'posts' }, variant: { type: String, default: 'inline' } })
</script>
<template>
 <div class="content-loading" :class="'loading-'+variant" role="status" aria-label="Cargando contenido" aria-busy="true">
  <div v-for="index in (variant==='cards'?3:1)" :key="index" class="loading-placeholder" aria-hidden="true"><span class="loading-art"></span><span class="loading-lines"><i></i><i></i><i></i></span></div>
 </div>
</template>
<style scoped>
.content-loading{min-width:0;width:100%;display:grid;gap:14px;padding:14px 0;animation:loading-appear .3s ease both}
.loading-placeholder{display:flex;gap:14px;align-items:center;min-width:0;padding:16px;border:1px solid #a78bfa16;border-radius:16px;background:#a78bfa04}
.loading-art,.loading-lines i{display:block;background:linear-gradient(100deg,#a78bfa0a 15%,#c4b5fd1c 45%,#a78bfa0a 75%);background-size:220% 100%;animation:loading-shimmer 1.8s ease-in-out infinite}
.loading-art{width:54px;height:54px;flex:none;border-radius:12px}.loading-lines{display:grid;gap:10px;min-width:0;width:100%}.loading-lines i{height:9px;border-radius:999px}.loading-lines i:nth-child(1){width:65%}.loading-lines i:nth-child(2){width:90%}.loading-lines i:nth-child(3){width:45%}
.loading-hero .loading-placeholder,.loading-profile .loading-placeholder{min-height:clamp(220px,35vw,380px);padding:24px;align-items:end;position:relative;overflow:hidden}
.loading-hero .loading-art,.loading-profile .loading-art{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;opacity:.45}
.loading-hero .loading-lines,.loading-profile .loading-lines{position:relative;gap:16px}.loading-hero .loading-lines i:first-child,.loading-profile .loading-lines i:first-child{height:20px;max-width:380px}
.loading-cards{grid-template-columns:repeat(3,minmax(0,1fr))}.loading-cards .loading-placeholder{flex-direction:column;align-items:stretch;padding:12px}.loading-cards .loading-art{width:100%;height:130px}.loading-cards .loading-lines{padding:6px 0}
@keyframes loading-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
@keyframes loading-appear{from{opacity:0}to{opacity:1}}
@media(max-width:600px){.loading-cards{grid-template-columns:1fr}.loading-cards .loading-placeholder{flex-direction:row}.loading-cards .loading-art{width:76px;height:76px}.loading-cards .loading-lines{align-self:center}}
@media(prefers-reduced-motion:reduce){.content-loading,.loading-art,.loading-lines i{animation:none}}
</style>
