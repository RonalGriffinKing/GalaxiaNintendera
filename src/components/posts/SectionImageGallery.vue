<script setup>
import { computed, ref, watch } from 'vue'
import { mediaFromUrl } from '@/services/mediaLinks'
import { sectionGalleryItems } from '@/services/sectionGallery'

const props = defineProps({ section: { type: Object, required: true } })
const items = computed(() => sectionGalleryItems(props.section))
const active = ref(0)
watch(() => props.section, () => { active.value = 0 })
const selected = computed(() => items.value[Math.min(active.value, items.value.length - 1)])
const media = computed(() => mediaFromUrl(selected.value?.url || ''))
const thumbnail = item => {
  const source = mediaFromUrl(item.url)
  return source.type === 'video' ? '' : source.thumbUrl || source.url
}
</script>

<template>
  <div v-if="selected" class="section-gallery" :class="{ multiple: items.length > 1 }">
    <div class="section-gallery-main">
      <iframe v-if="media.type === 'youtube'" :src="media.embedUrl" :title="section.title || 'Vídeo de la sección'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      <video v-else-if="media.type === 'video'" :src="media.url" controls playsinline></video>
      <img v-else :src="media.url" :alt="selected.alt || section.title || 'Imagen de la sección'" loading="lazy" decoding="async" />
      <span v-if="items.length > 1" class="section-gallery-count">{{ active + 1 }} / {{ items.length }}</span>
    </div>
    <div v-if="items.length > 1" class="section-gallery-rail" aria-label="Imágenes de esta sección">
      <button v-for="(item, index) in items" :key="item.mediaSlotId || item.url" type="button" :class="{ active: active === index }" :aria-label="`Mostrar imagen ${index + 1}${item.gameName ? ` de ${item.gameName}` : ''}`" :aria-pressed="active === index" @click="active = index">
        <img v-if="thumbnail(item)" :src="thumbnail(item)" :alt="item.alt || ''" loading="lazy" />
        <span v-else class="section-gallery-video-thumb">▶ Vídeo</span>
        <span v-if="item.gameName">{{ item.gameName }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.section-gallery{width:100%;margin:8px 0 4px;max-width:100%;display:grid;gap:10px}
.section-gallery-main{position:relative;width:100%;aspect-ratio:21/9;max-height:430px;overflow:hidden;border-radius:14px;background:linear-gradient(135deg,#172039,#050816)}
.section-gallery-main img,.section-gallery-main video,.section-gallery-main iframe{width:100%;height:100%;display:block;border:0;object-fit:cover}
.section-gallery-count{position:absolute;right:12px;top:12px;background:#0b1025dc;color:#fff;border:1px solid #ffffff55;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800}
.section-gallery-rail{position:relative;z-index:1;display:flex;gap:10px;overflow-x:auto;margin-top:-26px;padding:2px 16px 8px}
.section-gallery-rail button{position:relative;flex:0 0 clamp(108px,24%,180px);aspect-ratio:16/9;padding:0;border:2px solid #ffffff33;border-radius:10px;overflow:hidden;background:#0b1025;cursor:pointer;opacity:.74;transform:translateY(0);transition:opacity .2s,border-color .2s,transform .2s}
.section-gallery-rail button.active{border-color:#c084fc;opacity:1;transform:translateY(-2px)}
.section-gallery-rail img{width:100%;height:100%;object-fit:cover}
.section-gallery-rail .section-gallery-video-thumb{top:0;display:grid;place-items:center;background:#1b2140;color:#fff}
.section-gallery-rail span{position:absolute;left:0;right:0;bottom:0;padding:8px 6px 5px;background:linear-gradient(transparent,#050816e8);color:#fff;font-size:11px;font-weight:700;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:640px){.section-gallery-main{aspect-ratio:16/10}.section-gallery-rail button{flex-basis:42%}}
</style>
