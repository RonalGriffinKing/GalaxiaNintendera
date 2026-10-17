<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { gameEditorialFields, safeOfficialUrl } from '@/services/articlePresentation'
import { resolveAssetUrl } from '@/constants/assets'
const props = defineProps({ game: { type: Object, default: () => ({}) } })
const fields = computed(() => gameEditorialFields(props.game))
const failedCover = ref(false)
const expanded = ref(false)
let media
const updateExpanded = event => { expanded.value = event.matches }
onMounted(() => {
 media = window.matchMedia('(min-width:1024px)')
 expanded.value = media.matches
 media.addEventListener('change', updateExpanded)
})
onUnmounted(() => media?.removeEventListener('change', updateExpanded))
watch(() => fields.value.cover, () => failedCover.value = false)
const officialUrl = computed(() => safeOfficialUrl(props.game.officialUrl))
const rows = computed(() => [
 ['Título', props.game.nameEs || props.game.nameEn],
 ['Plataformas', (Array.isArray(props.game.platforms) ? props.game.platforms : []).map(item => typeof item === 'string' ? item : `${item.name || ''}${item.confirmed === false ? ' (pendiente)' : ''}`).filter(Boolean).join(', ')],
 ['Desarrolladora', fields.value.developer],
 ['Géneros', fields.value.genres.join(', ')],
 ['Lanzamiento', props.game.releaseDate],
 ['Nota', props.game.releaseNote]
].filter(([,value]) => value))
const hasData = computed(() => rows.value.length || fields.value.cover || officialUrl.value)
</script>

<template>
 <details v-if="hasData" class="editorial-game" :open="expanded">
  <summary><span class="game-heading">Información del juego</span><span class="game-toggle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" /></svg></span></summary>
  <div class="game-details">
   <img v-if="fields.cover && !failedCover" :src="resolveAssetUrl(fields.cover)" alt="Carátula del juego" loading="lazy" decoding="async" @error="failedCover=true" />
   <dl><div v-for="[label,value] in rows" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl>
   <a v-if="officialUrl" :href="officialUrl" target="_blank" rel="noopener noreferrer">Web oficial <span aria-hidden="true">↗</span></a>
  </div>
 </details>
</template>

<style scoped>
.editorial-game{border:1px solid #ffffff20;border-radius:16px;background:#11121ded;color:#f8fafc;min-width:0;overflow:hidden}.editorial-game summary{padding:18px 20px;cursor:pointer;font-weight:800;font-size:15px;list-style:none;display:flex;justify-content:space-between;gap:12px}.editorial-game summary::-webkit-details-marker{display:none}.game-details{padding:0 20px 20px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start}.game-details img{width:80px;max-height:130px;object-fit:contain;border-radius:8px}.game-details dl{margin:0;grid-column:1/-1;min-width:0}.game-details img+dl{grid-column:2}.game-details dl div{border-bottom:1px solid #ffffff12;padding:9px 0;font-size:12px;display:grid;gap:5px}.game-details dt{color:#aeb8cb}.game-details dd{margin:0;line-height:1.5;overflow-wrap:anywhere}.game-details a{grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#262031;border:1px solid #d6b95855;border-radius:10px;color:#ffe49a;font-size:13px;text-decoration:none;font-weight:700}
</style>

<style scoped>
.editorial-game summary{align-items:center;min-height:64px;box-sizing:border-box;padding:14px 18px;line-height:1.35;transition:background .18s ease}
.game-heading{min-width:0;overflow-wrap:anywhere}
.game-toggle{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border-radius:50%;border:1px solid var(--visual-border,#ffffff25);background:color-mix(in srgb,var(--visual-accent,#a855f7) 12%,transparent);color:var(--visual-text,#f8fafc)}
.game-toggle svg{width:18px;height:18px;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}
.editorial-game[open] .game-toggle svg{transform:rotate(180deg)}
.editorial-game summary:hover{background:#ffffff06}
.editorial-game summary:focus-visible{outline:2px solid var(--visual-accent,#a855f7);outline-offset:-3px;border-radius:14px}
@media(prefers-reduced-motion:reduce){.editorial-game summary,.game-toggle svg{transition:none}}
</style>
