<script setup>
import { computed, ref, watch } from 'vue'
import { mediaFromUrl } from '@/services/mediaLinks'
import { sectionGalleryItems } from '@/services/sectionGallery'

const props = defineProps({ section: { type: Object, required: true } })
const items = computed(() => sectionGalleryItems(props.section))
const active = ref(0)
watch(() => props.section, () => { active.value = 0 })
watch(() => items.value.length, length => { if (active.value >= length) active.value = 0 })
const selected = computed(() => items.value[Math.min(active.value, items.value.length - 1)])
const media = computed(() => mediaFromUrl(selected.value?.url || ''))
const previous = () => { active.value = (active.value - 1 + items.value.length) % items.value.length }
const next = () => { active.value = (active.value + 1) % items.value.length }
let touchStart = null
const onTouchStart = event => { touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY } }
const onTouchEnd = event => {
  if (!touchStart || items.value.length < 2) return
  const dx = event.changedTouches[0].clientX - touchStart.x
  const dy = event.changedTouches[0].clientY - touchStart.y
  touchStart = null
  if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return
  if (dx < 0) next()
  else previous()
}
const thumbnail = item => {
  const source = mediaFromUrl(item.url)
  return source.type === 'video' ? '' : source.thumbUrl || source.url
}
</script>

<template>
  <div v-if="selected" class="section-gallery" :class="{ multiple: items.length > 1 }">
    <div class="section-gallery-main" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <img v-if="media.type === 'image'" class="section-gallery-backdrop" :src="media.url" alt="" aria-hidden="true" loading="lazy" />
      <iframe v-if="media.type === 'youtube'" :src="media.embedUrl" :title="section.title || 'Vídeo de la sección'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      <video v-else-if="media.type === 'video'" :src="media.url" controls playsinline></video>
      <img v-else :src="media.url" :alt="selected.alt || section.title || 'Imagen de la sección'" loading="lazy" decoding="async" />
    </div>
    <div v-if="items.length > 1" class="section-gallery-toolbar">
      <span>{{ selected.gameName || 'Imágenes de esta sección' }} <small>{{ active + 1 }} / {{ items.length }}</small></span>
      <div class="section-gallery-controls">
        <button type="button" aria-label="Imagen anterior" @click="previous">‹</button>
        <button type="button" aria-label="Imagen siguiente" @click="next">›</button>
      </div>
    </div>
    <div v-if="items.length > 1" class="section-gallery-rail" aria-label="Imágenes de esta sección" @keydown.left.prevent="previous" @keydown.right.prevent="next">
      <button v-for="(item, index) in items" :key="item.mediaSlotId || item.url" type="button" :class="{ active: active === index }" :aria-label="`Mostrar imagen ${index + 1}${item.gameName ? ` de ${item.gameName}` : ''}`" :aria-pressed="active === index" @click="active = index">
        <img v-if="thumbnail(item)" :src="thumbnail(item)" :alt="item.alt || ''" loading="lazy" />
        <span v-else class="section-gallery-video-thumb">▶ Vídeo</span>
        <span>{{ item.gameName || (index === 0 ? 'Principal' : `Imagen ${index + 1}`) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.section-gallery{width:100%;min-width:0;margin:10px 0 18px;max-width:100%;display:grid;gap:8px}
.section-gallery-main{position:relative;display:grid;place-items:center;width:100%;aspect-ratio:16/9;max-height:540px;overflow:hidden;border-radius:14px;background:#090d1d;isolation:isolate}
.section-gallery-main img:not(.section-gallery-backdrop),.section-gallery-main video,.section-gallery-main iframe{position:relative;z-index:1;width:100%;height:100%;display:block;border:0;object-fit:contain}
.section-gallery-main iframe{object-fit:cover}
.section-gallery-main .section-gallery-backdrop{position:absolute;inset:-24px;width:calc(100% + 48px);height:calc(100% + 48px);object-fit:cover;filter:blur(28px) brightness(.42);opacity:.8;z-index:-1}
.section-gallery-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:38px;color:inherit;font-size:13px;font-weight:700}
.section-gallery-toolbar>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.section-gallery-toolbar small{margin-left:8px;color:#c0c4d9;font-size:12px;font-weight:600;white-space:nowrap}
.section-gallery-controls{display:flex;flex:none;gap:6px}
.section-gallery-controls button{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid #ffffff38;border-radius:10px;background:#151a33;color:#fff;font-size:26px;line-height:1;cursor:pointer}
.section-gallery-controls button:hover{background:#302154;border-color:#c084fc}
.section-gallery-rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:min(100%,580px);min-width:0}
.section-gallery-rail button{position:relative;min-width:0;aspect-ratio:16/9;padding:0;border:2px solid #ffffff38;border-radius:10px;overflow:hidden;background:#0b1025;cursor:pointer;transition:border-color .18s,transform .18s}
.section-gallery-rail button:hover{transform:translateY(-2px);border-color:#c084fc}
.section-gallery-rail button.active{border-color:#c084fc;box-shadow:inset 0 0 0 1px #c084fc}
.section-gallery-rail img{width:100%;height:100%;display:block;object-fit:cover}
.section-gallery-rail .section-gallery-video-thumb{top:0;display:grid;place-items:center;background:#1b2140;color:#fff}
.section-gallery-rail span{position:absolute;left:0;right:0;bottom:0;padding:8px 6px 5px;background:linear-gradient(transparent,#050816e8);color:#fff;font-size:11px;font-weight:700;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.section-gallery-controls button:focus-visible,.section-gallery-rail button:focus-visible{outline:2px solid #c084fc;outline-offset:2px}
@media(max-width:640px){.section-gallery-main{border-radius:10px}.section-gallery-rail{width:100%;gap:6px}.section-gallery-rail span{padding:12px 4px 3px;font-size:10px}.section-gallery-controls button{width:34px;height:34px}}
@media(prefers-reduced-motion:reduce){.section-gallery-rail button{transition:none}}
</style>
