<script setup>
import { computed } from 'vue'
import { criterionRating } from '@/services/articlePresentation'
const props = defineProps({ modelValue: [Number, String], label: String })
const emit = defineEmits(['update:modelValue'])
const score = computed(() => criterionRating(props.modelValue))
const fill = star => Math.max(0, Math.min(1, score.value - star + 1)) * 100
function select(value) { emit('update:modelValue', value) }
function onKey(event) {
 let next
 if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(10, Math.floor(score.value) + 1)
 if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, Math.ceil(score.value) - 1)
 if (event.key === 'Home') next = 0
 if (event.key === 'End') next = 10
 if (next === undefined) return
 event.preventDefault()
 select(next)
}
</script>
<template>
 <div class="criterion-picker">
  <div class="criterion-picker-heading"><span>{{ label }}</span><output>{{ score }}/10</output></div>
  <div class="criterion-stars" role="slider" tabindex="0" :aria-label="label" aria-valuemin="0" aria-valuemax="10" :aria-valuenow="score" :aria-valuetext="`${score} de 10 estrellas`" @keydown="onKey">
   <button v-for="star in 10" :key="star" type="button" tabindex="-1" :aria-label="`${star} de 10 estrellas en ${label}`" @click="select(star)">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01Z" /></svg>
    <span :style="{'--fill':fill(star)+'%'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01Z" /></svg></span>
   </button>
  </div>
  <button v-if="score>0" class="clear-rating" type="button" @click="select(0)">Restablecer a 0</button>
 </div>
</template>
<style scoped>
.criterion-picker{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;padding:10px 12px;border-radius:10px;background:var(--admin-surface,#151d31);min-width:0}
.criterion-picker-heading{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:650;color:var(--text-primary,#f1f5f9)}
output{color:#ffe17d;font-variant-numeric:tabular-nums;white-space:nowrap}
.criterion-stars{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));width:240px;max-width:100%;gap:0;border-radius:6px;min-width:0;touch-action:manipulation}
.criterion-stars button{position:relative;display:block;width:100%;height:30px;background:transparent;border:0;padding:0;cursor:pointer;color:#facc15;min-width:0}
.criterion-stars svg{display:block;width:100%;height:100%;fill:#363642;stroke:#86869b;stroke-width:.7}
.criterion-stars button>span{display:block;position:absolute;inset:0 auto 0 0;overflow:hidden;pointer-events:none}
.criterion-stars button>span svg{fill:#facc15;stroke:#ffe17d}
.criterion-stars button>span{width:100%;clip-path:inset(0 calc(100% - var(--fill,100%)) 0 0)}
.criterion-stars:focus-visible,.clear-rating:focus-visible{outline:2px solid #c084fc;outline-offset:3px}
.criterion-stars button:hover{background:#facc1510;border-radius:6px}
.clear-rating{justify-self:end;align-self:center;background:transparent;border:0;color:var(--text-secondary,#aeb8cb);font:inherit;font-size:10px;padding:4px 0;cursor:pointer;min-height:28px}
@media(max-width:400px){.criterion-picker{grid-template-columns:minmax(0,1fr)}.criterion-picker-heading{grid-column:1}.clear-rating{grid-column:1;justify-self:start;padding:0;min-height:24px}.criterion-stars{width:220px}}
</style>
