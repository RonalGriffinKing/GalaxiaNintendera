<script setup>
import { computed } from 'vue'
import {
  addHomeHeroImage,
  duplicateHomeHeroImage,
  moveHomeHeroImage,
  removeHomeHeroImage,
  replaceHomeHeroImage
} from '@/services/homeHero'

const props = defineProps({ images: { type: Array, default: () => [] } })
const emit = defineEmits(['update:images', 'media-change'])
const rows = computed(() => props.images)

function replace(index, patch) {
  const updated = replaceHomeHeroImage(props.images, index, patch)
  emit('update:images', updated)
  if (typeof patch.url === 'string' && patch.url !== props.images[index]?.url) {
    emit('media-change', { action: 'replace', mediaSlotId: updated[index]?.mediaSlotId })
  }
}
function add() { emit('update:images', addHomeHeroImage(props.images)) }
function remove(index) {
  const mediaSlotId = props.images[index]?.mediaSlotId
  emit('update:images', removeHomeHeroImage(props.images, index))
  if (mediaSlotId) emit('media-change', { action: 'remove', mediaSlotId })
}
function duplicate(index) {
  const updated = duplicateHomeHeroImage(props.images, index)
  emit('update:images', updated)
  if (props.images[index]?.url) emit('media-change', { action: 'duplicate', mediaSlotId: updated[index + 1]?.mediaSlotId })
}
function move(index, offset) { emit('update:images', moveHomeHeroImage(props.images, index, offset)) }
</script>

<template>
  <div class="gallery-editor">
    <strong>Galería de Inicio</strong>
    <p class="gallery-help">Añade y organiza las imágenes que acompañan a la portada.</p>
    <div v-for="(image, index) in rows" :key="image.mediaSlotId || `legacy-${index}`" class="gallery-row">
      <label>URL de imagen
        <input :value="image.url" type="url" placeholder="https://..." @change="replace(index, { url: $event.target.value })">
      </label>
      <label>Texto alternativo
        <input :value="image.alt" type="text" placeholder="Descripción breve" @change="replace(index, { alt: $event.target.value })">
      </label>
      <div class="gallery-actions">
        <button type="button" :disabled="index === 0" :aria-label="`Subir imagen ${index + 1}`" @click="move(index, -1)">Subir</button>
        <button type="button" :disabled="index === rows.length - 1" :aria-label="`Bajar imagen ${index + 1}`" @click="move(index, 1)">Bajar</button>
        <button type="button" :aria-label="`Duplicar imagen ${index + 1}`" @click="duplicate(index)">Duplicar</button>
        <button type="button" :aria-label="`Eliminar imagen ${index + 1}`" @click="remove(index)">Eliminar</button>
      </div>
    </div>
    <button type="button" class="add-image" @click="add">Añadir imagen</button>
  </div>
</template>

<style scoped>
.gallery-editor{display:grid;gap:10px}.gallery-help{margin:0;opacity:.75;font-size:.9em}.gallery-row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:8px;align-items:end;padding:10px;border:1px solid #ffffff22;border-radius:10px}.gallery-row label{display:grid;gap:5px;font-size:12px}.gallery-row input{box-sizing:border-box;width:100%;min-width:0;min-height:40px;padding:8px;border:1px solid #ffffff33;border-radius:8px;background:#0b1020;color:inherit}.gallery-actions{display:flex;flex-wrap:wrap;gap:6px;grid-column:1/-1}.gallery-editor button{min-height:40px;padding:7px 10px;border:1px solid #ffffff26;border-radius:8px;background:#ffffff0d;color:inherit;cursor:pointer}.gallery-editor button:disabled{opacity:.4;cursor:default}.add-image{justify-self:start}@media(max-width:700px){.gallery-row{grid-template-columns:minmax(0,1fr)}.gallery-actions{grid-column:1}}
</style>
