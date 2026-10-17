<script setup>
import { analysisRating } from '@/services/articlePresentation'
import FeaturedSheen from '@/components/shared/FeaturedSheen.vue'
import { computed } from 'vue'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { postWebThemeCss } from '@/services/visualThemes'
import { resolveAssetUrl, defaultBannerUrl } from '@/constants/assets'
import { socialHeadline } from '@/services/socialPostPresentation'
import { titleRuns } from '@/services/socialContent'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'

const props = defineProps({ post: Object, to: String, category: String, date: String, analysis: Boolean, featured: Boolean, compact: Boolean, authorIcon: String })
const {theme,enabled}=useVisualThemes(()=>props.post)
const cardTheme=computed(()=>enabled.value.web?postWebThemeCss(props.analysis?{...props.post,category:'Analisis'}:props.post,theme.value):{})
const headline = computed(() => socialHeadline(props.post))
</script>

<template>
 <RouterLink :to="to" class="home-editorial-card" :style="cardTheme" :class="{ featured, compact, 'is-analysis':analysis }">
  <img class="card-cover" :src="resolveAssetUrl(post.image,defaultBannerUrl)" alt="" loading="lazy" decoding="async" />
  <div class="card-shade"></div>
  <FeaturedSheen v-if="featured" :gold="analysis" />
  <span class="card-category">{{ analysis ? (featured ? 'Análisis premium' : 'Análisis') : category }}</span>
  <span v-if="analysis" class="card-score"><span aria-hidden="true">★</span> {{ analysisRating(post.analysis) }}</span>
  <div class="card-copy">
   <div v-if="compact" class="card-meta"><small>◷ {{ date }}</small><span><ProfileAvatar v-if="authorIcon" :src="authorIcon" decorative class="card-avatar" /><small>{{ post.authorName || 'Redactor' }}</small></span></div>
   <small v-else>{{ post.authorName || 'Redactor' }} · {{ date }}</small>
   <h3><template v-for="(run,index) in titleRuns(headline.title,headline.highlights)" :key="index"><mark v-if="run.highlighted">{{ run.text }}</mark><template v-else>{{ run.text }}</template></template></h3>
   <p v-if="post.summary || post.content">{{ post.summary || post.content }}</p>
  </div>
 </RouterLink>
</template>

<style scoped>
.home-editorial-card{display:block;position:relative;isolation:isolate;overflow:hidden;min-width:0;height:var(--editorial-card-height,280px);box-sizing:border-box;border:1px solid #a78bfa55;border-radius:14px;background:#090d1b;color:#fff;text-decoration:none;text-align:left;box-shadow:none}
.home-editorial-card.featured{border-color:#facc15;box-shadow:0 0 18px #facc1526}
.home-editorial-card.featured .card-shade{background:linear-gradient(180deg,transparent 10%,#05081626 38%,#050816bf 100%),linear-gradient(100deg,#facc1575 0%,#f59e0b66 23%,#a855f773 49%,#ec489973 73%,#22d3ee75 100%)}
.home-editorial-card.featured .card-category{background:#854d0edb;border-color:#facc1580;color:#fff7dc}
.card-cover,.card-shade{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none}
.card-cover{object-fit:cover;object-position:center top;z-index:-2}
.card-shade{background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.05) 20%,rgba(0,0,0,.6) 48%,rgba(0,0,0,.94) 100%);z-index:-1}
.card-category{position:absolute;top:16px;left:16px;max-width:calc(100% - 100px);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:6px 11px;border:1px solid #ffffff25;border-radius:999px;background:#151022b8;color:#fff;font-size:10px;font-weight:800;text-transform:uppercase}
.card-score{position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;border:1px solid #ffffff25;border-radius:10px;background:#080b19d9;color:#facc15;padding:7px 10px;font-weight:900;font-size:20px}
.card-copy{position:absolute;inset:auto 18px 18px;display:grid;gap:9px;min-width:0;text-shadow:0 2px 10px #0008}
.card-copy small{font-size:10px;line-height:1.3;color:#d4d6e3;font-weight:700}
.card-copy h3{margin:0;font-size:20px;font-weight:900;line-height:1.15;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow-wrap:anywhere}
.card-copy mark{background:none;color:#facc15;font:inherit}
.card-copy p{font-size:12px;line-height:1.45;color:#d5d7e2;font-weight:500;margin:0;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.card-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;order:1}.card-meta>span{display:inline-flex;align-items:center;gap:5px}.card-meta .card-avatar{--avatar-size:18px;--avatar-border:1px}
.home-editorial-card:focus-visible{outline:3px solid #d8b4fe;outline-offset:3px}.home-editorial-card:hover{border-color:#c084fc}
@media(max-width:640px){.card-copy h3{font-size:21px}.card-copy{inset:auto 18px 18px}}
</style>

<style scoped>
.home-editorial-card.compact{height:100%;min-height:150px;background:#090d1b}.compact .card-cover{width:40%;height:100%;border-radius:13px 0 0 13px;object-position:center top}.compact .card-shade{background:linear-gradient(90deg,transparent 30%,#090d1b88 40%,#090d1b 45%)}.compact .card-category{left:8px;top:8px;padding:5px 8px;max-width:calc(40% - 16px);font-size:9px;background:#7024dcdd}.compact .card-copy{inset:18px 14px 18px 44%;display:flex;flex-direction:column;justify-content:center;gap:12px}.compact .card-copy h3{font-size:15px;line-height:1.3;order:0;-webkit-line-clamp:4}.compact .card-copy small{order:1;font-size:10px;font-weight:500;line-height:1.5}.compact .card-copy p{display:none}
@media(max-width:640px){.compact .card-copy{inset:14px 12px 14px 44%;gap:10px}.compact .card-copy h3{font-size:14px}.compact .card-copy small{font-size:9px}}
</style>

<style scoped>
.card-copy,.card-category,.card-score{z-index:3}.home-editorial-card.featured.is-analysis .card-shade{background:linear-gradient(180deg,transparent 10%,#120f08dd 100%),linear-gradient(110deg,#ffda6430,transparent 40%,#ffda6420)}
</style>

<style scoped>
.home-editorial-card,.home-editorial-card.compact{background:var(--visual-surface,#090d1b);border-color:var(--visual-border,#a78bfa55)}
.home-editorial-card:hover{border-color:var(--visual-accent,#c084fc)}
.home-editorial-card .card-category,.home-editorial-card.compact .card-category,.home-editorial-card.featured .card-category{background:var(--visual-label-background,#7024dc);color:var(--visual-label-text,#fff);border-color:var(--visual-border,#ffffff25)}
.home-editorial-card .card-copy mark{color:var(--visual-highlight,#facc15)}
.home-editorial-card.compact .card-shade{background:linear-gradient(90deg,transparent 30%,color-mix(in srgb,var(--visual-surface,#090d1b) 55%,transparent) 40%,var(--visual-surface,#090d1b) 45%)}
.home-editorial-card.featured{border-color:var(--visual-border,#facc15);box-shadow:0 0 18px color-mix(in srgb,var(--visual-accent,#facc15) 12%,transparent)}
</style>
