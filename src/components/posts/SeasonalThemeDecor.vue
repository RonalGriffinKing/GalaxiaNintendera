<script setup>
defineProps({ season: { type: String, default: 'none' }, reading: Boolean })
</script>
<template>
  <div v-if="season === 'halloween' || season === 'christmas'" :class="['seasonal-decor', season, { reading }]" aria-hidden="true">
    <template v-if="season === 'halloween'">
      <svg class="season-moon" viewBox="0 0 48 48"><path d="M34 5A20 20 0 1 0 43 34 20 20 0 0 1 34 5Z" fill="#ffe3a1"/></svg>
      <svg v-for="n in 2" :key="n" :class="['season-bat', 'bat-'+n]" viewBox="0 0 64 32"><path d="M2 4 18 12 25 10 28 3 32 9 36 3 39 10 46 12 62 4 57 24 47 20 41 28 32 23 23 28 17 20 7 24Z" fill="#c2a0df"/></svg>
      <svg class="season-pumpkin" viewBox="0 0 44 40"><path d="m22 10 2-8 6 1-5 8" stroke="#b8cc69" stroke-width="3" fill="none"/><path d="M22 10C0 2-5 38 18 37h8C49 38 44 2 22 10Z" fill="#ff973e"/><path d="M18 12c-7 7-7 17-2 24m10-24c7 7 7 17 2 24" fill="none" stroke="#b84d21"/><path d="m10 22 6-7 3 8Zm15 1 3-8 6 7ZM12 27l7 3 3-3 3 3 7-3-5 7H17Z" fill="#291438"/></svg>
      <svg class="season-ghost" viewBox="0 0 32 40"><path d="M4 36V16a12 12 0 0 1 24 0v20l-6-4-6 4-6-4Z" fill="#eee7ff"/><g fill="#291438"><ellipse cx="12" cy="16" rx="2" ry="3"/><ellipse cx="21" cy="16" rx="2" ry="3"/><ellipse cx="17" cy="24" rx="2" ry="3"/></g></svg>
    </template>
    <template v-else>
      <svg v-for="n in 8" :key="n" class="season-snow" :style="{left:((n*29)%94)+'%',top:((n*37)%92)+'%',width:(n%2?3:2)+'%'}" viewBox="0 0 40 40"><path d="M20 2v36M4 11l32 18M4 29l32-18M14 5l6 6 6-6M14 35l6-6 6 6M4 18l8-2-2-8M36 22l-8 2 2 8M10 32l2-8-8-2M30 8l-2 8 8 2" fill="none" stroke="#e3fff8" stroke-width="2" stroke-linecap="round"/></svg>
      <svg v-for="n in 2" :key="'ornament-'+n" :class="['season-ornament','ornament-'+n]" viewBox="0 0 60 120"><path d="M30 0v45" stroke="#ffe09a" stroke-width="2"/><path d="M23 45h14v9H23Z" fill="#ffe09a"/><circle cx="30" cy="80" r="26" :fill="n===1?'#c73f55':'#28836b'"/><path d="m8 74 44 12M12 65l36 30" stroke="#ffe09a" stroke-width="3"/><circle cx="22" cy="69" r="5" fill="#ffffff55"/></svg>
    </template>
  </div>
</template>
<style scoped>
.seasonal-decor{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2;border-radius:inherit;background:radial-gradient(ellipse at 100% 0,#a251dd18,transparent 40%),radial-gradient(ellipse at 0 100%,#ff97251c,transparent 35%)}.seasonal-decor svg{position:absolute;display:block;opacity:.7}.season-moon{width:9%;right:3%;top:10%;opacity:.85!important}.season-bat{width:8%;left:3%;top:18%;rotate:-15deg}.season-bat.bat-2{width:6%;left:auto;right:5%;top:34%;rotate:15deg}.season-pumpkin{width:8%;left:3%;bottom:3%}.season-ghost{width:5%;right:3%;bottom:10%;opacity:.5!important}.christmas{background:radial-gradient(ellipse at top right,#eab95b20,transparent 45%),radial-gradient(ellipse at bottom left,#2fbd9718,transparent 35%)}.season-ornament{width:7%;top:0}.ornament-1{left:3%}.ornament-2{right:4%}.season-snow{opacity:.45!important}.seasonal-decor.reading{height:700px;border-radius:0;z-index:0;opacity:.45}.reading .season-moon{width:70px;top:50px}.reading .season-bat{width:60px}.reading .season-pumpkin{width:65px}.reading .season-ghost{width:40px}.reading .season-ornament{width:50px}.reading .season-snow{max-width:24px}
</style>
