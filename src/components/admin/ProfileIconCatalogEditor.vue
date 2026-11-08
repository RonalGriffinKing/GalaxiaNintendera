<script setup>
import { nextTick, ref, watch } from 'vue'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
const draft = defineModel('draft', { type: Object, required: true })
const props = defineProps({ open: Boolean, creating: Boolean, busy: Boolean, uploading: Boolean, error: String })
const emit = defineEmits(['close', 'save', 'upload'])
const dialog = ref(null)
watch(() => props.open, async open => {
  await nextTick()
  if (open && dialog.value && !dialog.value.open) dialog.value.showModal()
  else if (!open && dialog.value?.open) dialog.value.close()
}, { immediate: true })
function close(event) {
  event?.preventDefault()
  if (!props.busy && !props.uploading) emit('close')
}
</script>
<template>
  <dialog ref="dialog" class="catalog-dialog" aria-labelledby="catalog-editor-title" @cancel="close">
    <form @submit.prevent="emit('save')">
      <header><h3 id="catalog-editor-title">{{ creating ? 'Crear icono' : 'Editar icono' }}</h3><button type="button" :disabled="busy || uploading" aria-label="Cerrar editor de iconos" @click="close">×</button></header>
      <ProfileAvatar class="catalog-preview" :src="draft.src" :alt="draft.name || 'Vista previa'" :effect="draft" />
      <label>Nombre<input v-model.trim="draft.name" required maxlength="120" /></label>
      <label>Imagen (URL o archivo)<input v-model.trim="draft.src" required placeholder="https://…" /></label>
      <label>Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" :disabled="busy || uploading" @change="emit('upload', $event.target.files?.[0]); $event.target.value = ''" /><small>PNG, JPG, WEBP o GIF. Máximo 512 KB. {{ uploading ? 'Subiendo…' : '' }}</small></label>
      <div class="form-pair"><label>Estrellas necesarias<input v-model.number="draft.requiredStars" type="number" min="0" step="1" required list="catalog-star-levels" /><small>0: disponible desde el registro.</small></label><label>Orden<input v-model.number="draft.order" type="number" min="0" step="1" required /></label></div>
      <datalist id="catalog-star-levels"><option v-for="level in [0,10,25,50,100]" :key="level" :value="level" /></datalist>
      <label>Categoría<input v-model.trim="draft.saga" maxlength="80" /></label>
      <label class="checkbox"><input v-model="draft.visible" type="checkbox" /> Mostrar en el catálogo</label>
      <label class="checkbox"><input v-model="draft.active" type="checkbox" /> Activo para nuevos desbloqueos</label>
      <label class="checkbox"><input v-model="draft.special" type="checkbox" /> Efecto especial</label>
      <div class="form-pair"><label>Rareza visual<select v-model="draft.rarity"><option value="normal">Normal</option><option value="rare">Raro</option><option value="epic">Épico</option><option value="legendary">Legendario</option></select></label><label v-if="draft.special">Color del efecto<input v-model="draft.effectColor" type="color" /></label></div>
      <p>Ocultar, desactivar o subir requisitos conserva los derechos adquiridos.</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <footer><button type="button" :disabled="busy || uploading" @click="close">Cancelar</button><button class="primary" type="submit" :disabled="busy || uploading">{{ busy ? 'Guardando…' : creating ? 'Crear icono' : 'Guardar cambios' }}</button></footer>
    </form>
  </dialog>
</template>
<style scoped>
.catalog-dialog{width:min(600px,calc(100vw - 24px));max-height:calc(100dvh - 32px);box-sizing:border-box;padding:24px;border:1px solid var(--border);border-radius:20px;background:var(--admin-surface);color:var(--text-primary)}.catalog-dialog::backdrop{background:#040612bc;backdrop-filter:blur(6px)}form,label{display:grid;gap:12px}form{gap:16px}header,footer{display:flex;justify-content:space-between;gap:12px;align-items:center}h3{font-size:21px;font-weight:850}.catalog-preview{--avatar-size:80px;justify-self:center}.form-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}input,select,button{font:inherit;min-height:44px;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--admin-bg);color:var(--text-primary);box-sizing:border-box;min-width:0}button{cursor:pointer}button:disabled{opacity:.5}.primary{background:var(--accent,#9333ea);color:white}small,p{color:var(--text-muted);font-size:12px;line-height:1.6}.checkbox{display:flex;align-items:center;gap:10px}.checkbox input{min-height:20px;width:20px}:focus-visible{outline:2px solid var(--accent,#a855f7);outline-offset:3px}@media(max-width:500px){.form-pair{grid-template-columns:1fr}.catalog-dialog{padding:18px}}
</style>
