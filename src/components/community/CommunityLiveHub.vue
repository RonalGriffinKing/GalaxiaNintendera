<script setup>
import { ref } from 'vue'
import ContentLoading from '@/components/shared/ContentLoading.vue'
const props=defineProps({youtubeVideosLoading:Boolean,youtubeStageEmbedUrl:String,featuredVideoIsLive:Boolean,featuredYoutubeVideo:Object,youtubeStageTitle:String,youtubeStageDescription:String,youtubeChannelUrl:String,officialVideoFilters:{type:Array,default:()=>[]},officialVideoFilter:String,pagedOfficialVideos:{type:Array,default:()=>[]},officialVideoPage:Number,officialVideoPageCount:Number,youtubeVideosError:String,formatVideoDate:Function})
const emit=defineEmits(['refresh-live','update-video-filter','update-video-page','play-video'])
const root=ref(null)
defineExpose({getBoundingClientRect:()=>root.value?.getBoundingClientRect()})
</script>
<template>
 <section ref="root" class="community-videos" aria-label="Vídeos de la comunidad">
  <header><h2>{{ featuredVideoIsLive ? 'En directo ahora' : 'Vídeos de la comunidad' }}</h2><button type="button" :disabled="youtubeVideosLoading" @click="emit('refresh-live')">Actualizar vídeos</button></header>
  <ContentLoading v-if="youtubeVideosLoading && !youtubeStageEmbedUrl" variant="inline" />
  <template v-else>
   <iframe v-if="youtubeStageEmbedUrl" :key="youtubeStageEmbedUrl" :src="youtubeStageEmbedUrl" :title="youtubeStageTitle || 'Vídeo de la comunidad'" allow="accelerometer; autoplay; encrypted-media; gyroscope; web-share" allowfullscreen></iframe>
   <div class="video-description"><h3>{{ youtubeStageTitle }}</h3><p>{{ youtubeStageDescription }}</p><p>Disfruta del vídeo aquí. Para chatear durante el directo, entra en la plataforma original.</p><a :href="featuredYoutubeVideo?.url || youtubeChannelUrl" target="_blank" rel="noopener noreferrer">{{ featuredVideoIsLive ? 'Abrir directo y chat en YouTube' : 'Ver en YouTube' }} <span aria-hidden="true">↗</span></a></div>
  </template>
  <p v-if="youtubeVideosError" role="status">{{ youtubeVideosError }}</p>
  <nav v-if="officialVideoFilters.length" class="video-filters" aria-label="Filtrar vídeos"><button v-for="filter in officialVideoFilters" :key="filter.key || filter.id" type="button" :aria-pressed="officialVideoFilter===(filter.key || filter.id)" @click="emit('update-video-filter',filter.key || filter.id)">{{ filter.label }}</button></nav>
  <div class="video-library"><button v-for="video in pagedOfficialVideos" :key="video.id" type="button" @click="emit('play-video',video)"><img v-if="video.thumbnail" :src="video.thumbnail" alt="" loading="lazy" /><span><strong>{{ video.title }}</strong><small>{{ formatVideoDate?.(video.publishedAt) }}</small></span></button></div>
  <nav v-if="officialVideoPageCount>1" class="video-pagination" aria-label="Páginas de vídeos"><button type="button" :disabled="officialVideoPage<=0" @click="emit('update-video-page',officialVideoPage-1)">Anterior</button><span>{{ officialVideoPage+1 }} / {{ officialVideoPageCount }}</span><button type="button" :disabled="officialVideoPage>=officialVideoPageCount-1" @click="emit('update-video-page',officialVideoPage+1)">Siguiente</button></nav>
 </section>
</template>
<style scoped>
.community-videos{min-width:0;padding:18px;border:1px solid #a78bfa40;border-radius:22px;background:#111024;color:#f4f0ff}.community-videos header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.community-videos h2,.community-videos h3{font-weight:750;margin:0}.community-videos h2{font-size:17px}.community-videos iframe{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#080b16}.video-description{padding:18px 0}.video-description h3{font-size:21px;line-height:1.35}.video-description p{color:#b9b6ce;font-size:13px;line-height:1.6;margin:10px 0}.video-description a,.community-videos button{border:1px solid #a78bfa40;border-radius:12px;background:#261840;color:#e9d9ff;padding:10px 14px;font-size:12px;font-weight:700;cursor:pointer}.video-description a{display:inline-flex;gap:10px;text-decoration:none}.community-videos button:disabled{opacity:.4;cursor:default}.video-filters,.video-pagination{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}.video-filters button[aria-pressed=true]{background:#7926ba;color:white}.video-library{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}.video-library button{display:flex;align-items:center;gap:12px;text-align:left;min-width:0;background:#17132b}.video-library img{width:100px;aspect-ratio:16/9;object-fit:cover;border-radius:8px}.video-library span{min-width:0}.video-library strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.video-library small{display:block;color:#aaa3bd;margin-top:6px}.video-pagination{justify-content:center}.community-videos :is(button,a):focus-visible{outline:2px solid #d8b4fe;outline-offset:3px}@media(max-width:600px){.community-videos{padding:12px}.video-description h3{font-size:18px}}
</style>
