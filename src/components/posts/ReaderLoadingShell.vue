<template>
 <main class="reader-loading-page" role="status" aria-label="Cargando publicación" aria-busy="true">
  <div class="reader-loading-cover" aria-hidden="true"><div class="loading-copy"><span class="loading-breadcrumb placeholder"></span><span class="loading-label placeholder"></span><div class="loading-title placeholder"></div><span class="loading-line placeholder"></span><span class="loading-line short placeholder"></span><div class="loading-author placeholder"></div></div></div>
  <div class="reader-loading-columns" aria-hidden="true">
   <div class="loading-article"><div class="loading-tabs"><span v-for="i in 4" :key="i" class="placeholder"></span></div><span v-for="i in 4" :key="i" class="loading-paragraph placeholder"></span><div class="loading-picture placeholder"></div></div>
   <div class="loading-metadata"><span class="placeholder"></span><span class="placeholder"></span></div>
  </div>
 </main>
</template>
<style scoped>
.reader-loading-page{padding:var(--article-nav-height,var(--public-nav-offset,72px)) 0 56px;min-height:100svh;background:#0b0d18;box-sizing:border-box;overflow:hidden}
.reader-loading-cover{height:540px;background:radial-gradient(ellipse at 75% 25%,#24314666,transparent 65%),linear-gradient(0deg,#0b0d18,#111525);width:100%}.loading-copy{max-width:1320px;width:calc(100% - 80px);height:100%;box-sizing:border-box;margin:auto;display:flex;flex-direction:column;align-items:flex-start;gap:20px;padding:30px 0}.placeholder{display:block;background:linear-gradient(100deg,#7a84991a,#b5bcd02e,#7a84991a);background-size:220% 100%;border-radius:7px;animation:reader-shimmer 2s ease-in-out infinite}.loading-breadcrumb{width:190px;height:12px}.loading-label{width:140px;height:30px}.loading-title{width:min(670px,100%);height:115px;margin-top:40px}.loading-line{width:min(580px,90%);height:18px}.loading-line.short{width:min(440px,70%)}.loading-author{width:210px;height:45px;margin-top:auto}.reader-loading-columns{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:28px;max-width:1320px;width:calc(100% - 80px);margin:28px auto 0}.loading-article{min-width:0;display:grid;gap:18px;align-content:start}.loading-tabs{display:flex;gap:10px;margin-bottom:12px;overflow:hidden}.loading-tabs span{width:105px;height:40px;flex-shrink:0}.loading-paragraph{width:100%;height:15px}.loading-paragraph:nth-child(odd){width:85%}.loading-picture{height:180px;margin-top:12px}.loading-metadata{display:grid;align-content:start;gap:18px}.loading-metadata span:first-child{height:230px}.loading-metadata span+span{height:110px}
@keyframes reader-shimmer{0%,100%{background-position:100% 0;opacity:.65}50%{background-position:0 0;opacity:1}}
@media(max-width:1199px){.reader-loading-columns{grid-template-columns:minmax(0,1fr);max-width:860px;width:calc(100% - 40px)}.loading-metadata{display:none}}
@media(max-width:760px){.reader-loading-page{padding-top:var(--article-nav-height,var(--public-nav-offset,64px))}.reader-loading-cover{height:640px}.loading-copy{width:calc(100% - 40px);padding:22px 0}.loading-label{margin-top:200px}.loading-title{height:100px;margin-top:0}.loading-line{width:95%;height:15px}.loading-line.short{width:80%}.loading-author{margin-top:18px}.reader-loading-columns{width:calc(100% - 28px)}.loading-tabs span{width:84px}}
@media(prefers-reduced-motion:reduce){.placeholder{animation:none}}
</style>
