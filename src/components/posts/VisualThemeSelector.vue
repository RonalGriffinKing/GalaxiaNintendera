<script setup>
import { useVisualThemes } from '@/composables/useVisualThemes'
import VisualThemePreview from './VisualThemePreview.vue'
import { ref } from 'vue'
import { computed } from 'vue'
import { resolveVisualTheme } from '@/services/visualThemes'
const props=defineProps({modelValue:{type:String,default:''}})
const emit=defineEmits(['update:modelValue'])
const {themes}=useVisualThemes()
const showPreview=ref(false)
const selected=computed(()=>resolveVisualTheme(props.modelValue||'galaxia-general',themes.value))
</script>
<template>
 <div class="visual-theme-selector">
  <label>Tema visual<select :value="modelValue||'galaxia-general'" @change="emit('update:modelValue',$event.target.value)"><option v-for="theme in themes.filter(t=>!t.archived)" :key="theme.id" :value="theme.id">{{theme.name}} · v{{theme.version}}</option><option v-if="modelValue&&!themes.some(t=>t.id===modelValue&&!t.archived)" :value="modelValue">Tema no disponible · se usará Galaxia General</option></select></label>
  <div class="visual-theme-swatches"><span v-for="(color,i) in Object.values(selected.config.general).slice(0,4)" :key="i" :style="{background:color}"></span><button type="button" @click="showPreview=!showPreview">{{showPreview?'Ocultar muestra':'Ver muestra'}}</button></div>
  <VisualThemePreview v-if="showPreview" :theme="selected" />
  <small>El tema define la apariencia; las categorías organizan la noticia.</small>
 </div>
</template>
<style scoped>
.visual-theme-selector{display:grid;gap:10px;min-width:0;margin-top:12px}.visual-theme-selector label{display:grid;gap:8px;font-size:12px;font-weight:800}.visual-theme-selector select{width:100%;min-width:0;padding:10px;background:var(--admin-bg,#101426);color:inherit;border:1px solid var(--border,#ffffff33);border-radius:10px}.visual-theme-swatches{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.visual-theme-swatches span{height:18px;width:18px;border:1px solid #ffffff44;border-radius:50%}.visual-theme-swatches button{margin-left:6px;background:transparent;color:inherit;border:1px solid #ffffff33;border-radius:8px;padding:6px 9px;cursor:pointer}.visual-theme-selector small{font-size:11px;color:var(--text-muted,#aaa)}
</style>
