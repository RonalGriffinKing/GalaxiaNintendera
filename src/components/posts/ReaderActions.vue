<script setup>
defineProps({ preview: Boolean, readStatus: { type: Object, default: () => ({}) }, readBadgeText: String, isFavorite: Boolean, savingFavorite: Boolean })
const emit = defineEmits(['favorite', 'copy'])
</script>
<template>
 <div class="reader-actions" aria-label="Acciones de la noticia">
  <span v-if="readBadgeText" class="read-state" :class="{earned:readStatus.awarded}"><i class="fas fa-star" aria-hidden="true"></i>{{ readBadgeText }}</span>
  <button type="button" :aria-pressed="isFavorite" :disabled="savingFavorite || preview" @click="emit('favorite')"><i :class="isFavorite?'fas fa-bookmark':'far fa-bookmark'" aria-hidden="true"></i>{{ isFavorite?'Guardado':'Guardar' }}</button>
  <button type="button" :disabled="preview" aria-label="Copiar enlace de la noticia" @click="emit('copy')"><i class="fas fa-link" aria-hidden="true"></i>Copiar enlace</button>
 </div>
</template>
<style scoped>
.reader-actions{display:flex;align-items:center;flex-wrap:nowrap;gap:8px;width:100%;min-width:0;min-height:56px}
.reader-actions button,.read-state{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:800;box-sizing:border-box}
.reader-actions button{cursor:pointer;background:var(--visual-button-background,#6940ab);color:var(--visual-button-text,#fff);border:1px solid var(--visual-border,#8b5cf655)}
.reader-actions button:disabled{opacity:.6;cursor:wait}.reader-actions button:focus-visible{outline:2px solid var(--visual-accent,#a855f7);outline-offset:3px}
.read-state{color:var(--visual-text,#f1f5f9);background:var(--visual-surface,#090d1cdd);border:1px solid var(--visual-border,#ffffff25)}.read-state i{color:var(--visual-accent,#a855f7)}.read-state.earned{background:var(--visual-button-background,#6940ab);color:var(--visual-button-text,#fff)}.read-state.earned i{color:inherit}
.reader-actions>*{white-space:nowrap;flex:1 1 auto;min-width:0}
@media(max-width:360px){.reader-actions{gap:6px}.reader-actions button,.read-state{padding:0 7px;font-size:11px;gap:5px}}
</style>
