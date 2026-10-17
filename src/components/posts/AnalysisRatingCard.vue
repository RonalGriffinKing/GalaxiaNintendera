<script setup>
import { analysisRating, criterionRating, criterionStarFill } from '@/services/articlePresentation'
defineProps({ analysis: { type: Object, default: () => ({}) }, tier: { type: Object, default: () => ({}) } })
</script>

<template>
 <section class="editorial-rating" aria-label="Valoración del análisis">
  <span class="rating-eyebrow">★ Puntuación final</span>
  <strong class="rating-score">{{ analysisRating(analysis) }}<small>/100</small></strong>
  <span class="rating-tier">{{ tier.label }}</span>
  <p v-if="analysis.hypeTitle">{{ analysis.hypeTitle }}</p>
  <div v-if="analysis.criteria?.length" class="rating-criteria">
   <div v-for="(item,index) in analysis.criteria" :key="item.key || index" class="rating-criterion">
    <span>{{ item.label }}</span>
    <span class="rating-stars" role="img" :aria-label="`${item.label}: ${criterionRating(item.score)} sobre 10`">
     <span v-for="star in 5" :key="star" class="rating-star" :data-fill="criterionStarFill(item.score,star)" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01Z" /></svg>
      <span class="rating-star-fill" :style="{width:criterionStarFill(item.score,star)+'%'}"><svg viewBox="0 0 24 24"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01Z" /></svg></span>
     </span>
    </span>
    <b>{{ criterionRating(item.score) }}<small>/10</small></b>
   </div>
  </div>
 </section>
</template>

<style scoped>
.editorial-rating{padding:24px 18px;border:1px solid #c6a12799;border-radius:20px;background:radial-gradient(ellipse at 50% 0,#96711566,transparent 75%),linear-gradient(135deg,#2a210d,#101014 80%);color:#f8fafc;display:grid;justify-items:center;gap:14px;box-sizing:border-box;min-width:0;box-shadow:0 0 32px #d7a61712}
.rating-eyebrow{color:#ffe592;text-transform:uppercase;font-size:11px;letter-spacing:.08em;font-weight:800}.rating-score{font-size:80px;line-height:1;color:#facc15;font-weight:950;text-shadow:0 0 28px #facc152e}.rating-score small{font-size:14px;color:#d4c6a4;margin-left:4px}.rating-tier{border-radius:999px;padding:6px 20px;background:linear-gradient(110deg,#dba919,#ffdf66);color:#241800;font-size:12px;font-weight:900}.editorial-rating p{font-size:14px;line-height:1.6;text-align:center;margin:4px 0;color:#f4e6b7}.rating-criteria{display:grid;gap:10px;width:100%;border-top:1px solid #d3ad332e;padding-top:18px;margin-top:6px}.rating-criterion{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:9px;align-items:center;font-size:12px;background:#0b0c12b8;border:1px solid #e2c0581f;border-radius:12px;padding:12px 10px;min-width:0}.rating-criterion>span:first-child{overflow-wrap:anywhere}.rating-criterion b{color:#ffe17d;white-space:nowrap;font-size:13px}.rating-criterion small{font-size:9px;color:#d6cda9}
.rating-stars{display:flex;gap:2px;flex-shrink:0}.rating-star{position:relative;display:block;width:19px;height:19px;flex:0 0 19px}.rating-star svg{display:block;width:19px;height:19px;fill:#353329;stroke:#c49d3444;stroke-width:.6}.rating-star-fill{position:absolute;top:0;left:0;height:100%;overflow:hidden}.rating-star-fill svg{fill:#facc15;stroke:#ffdf66}.rating-star-fill{filter:drop-shadow(0 0 3px #facc1520)}
@media(max-width:360px){.editorial-rating{padding:22px 12px}.rating-criterion{padding:12px 8px;gap:7px}.rating-star,.rating-star svg{width:17px;height:17px}.rating-star{flex-basis:17px}.rating-stars{gap:1px}}
</style>
