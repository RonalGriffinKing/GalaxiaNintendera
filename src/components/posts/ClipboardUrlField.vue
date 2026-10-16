<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { clipboardUrls } from '@/services/clipboardUrls'
const props = defineProps({ modelValue:{type:String,default:''}, label:{type:String,default:'Enlace'}, multiple:Boolean })
const emit = defineEmits(['update:modelValue'])
const busy = ref(false), error = ref(''), fallback = ref(false), draft = ref(''), pasteArea = ref(null)
watch(() => props.modelValue, () => { error.value='';fallback.value=false;draft.value='' })
const description = computed(() => {
 const urls = props.modelValue.split('\n').filter(Boolean)
 if (props.multiple) return `${urls.length} enlaces añadidos`
 try { const url = new URL(props.modelValue,window.location.origin); return url.hostname+url.pathname }
 catch { return props.modelValue }
})
function apply(value) {
 try { const result=clipboardUrls(value,props.multiple);emit('update:modelValue',result);error.value='';fallback.value=false;draft.value='' }
 catch (cause) { error.value=cause.message }
}
async function paste() {
 if (busy.value) return
 busy.value=true;error.value=''
 try {
  if (!navigator.clipboard?.readText) throw new Error()
  apply(await navigator.clipboard.readText())
 } catch {
  fallback.value=true;error.value='El navegador no permitió leer el portapapeles. Pega aquí el enlace.'
  await nextTick();pasteArea.value?.focus()
 } finally { busy.value=false }
}
function clear() {emit('update:modelValue','');error.value='';fallback.value=false;draft.value=''}
function pasted(event) {event.preventDefault();draft.value=event.clipboardData.getData('text/plain');apply(draft.value)}
</script>

<template>
 <div class="clipboard-url" role="group" :aria-label="label" @click.stop>
  <div class="clipboard-actions">
   <button class="clipboard-paste" type="button" :disabled="busy" :aria-label="`Pegar ${label}`" :title="modelValue ? 'Sustituir con el enlace del portapapeles' : 'Pegar desde el portapapeles'" @click="paste"><i class="far fa-clipboard" aria-hidden="true"></i>{{ busy ? 'Pegando…' : multiple ? 'Pegar enlaces' : 'Pegar' }}</button>
   <button v-if="modelValue" class="clipboard-clear" type="button" :disabled="busy" :aria-label="`Quitar ${label}`" title="Quitar enlace" @click="clear"><i class="far fa-trash-can" aria-hidden="true"></i></button>
  </div>
  <small v-if="modelValue" class="clipboard-value" :title="modelValue"><i class="fas fa-link" aria-hidden="true"></i>{{ description }}</small>
  <p v-if="error" class="clipboard-error" role="alert">{{ error }}</p>
  <div v-if="fallback" class="clipboard-fallback">
   <textarea ref="pasteArea" v-model="draft" :aria-label="`Pegar manualmente ${label}`" placeholder="Pega aquí el enlace" rows="2" @paste="pasted"></textarea>
   <button type="button" @click="apply(draft)">Usar enlace</button><button type="button" @click="fallback=false;error=''">Cancelar</button>
  </div>
 </div>
</template>

<style scoped>
.clipboard-url{min-width:0;width:100%;display:grid;gap:6px;color:var(--text-primary,#fff)}
.clipboard-actions{display:flex;gap:8px;min-width:0;flex-wrap:wrap}
.clipboard-url button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:8px 12px;border:1px solid #a855f755;border-radius:10px;background:var(--admin-surface-raised,#20213b);color:inherit;font:inherit;font-size:12px;font-weight:700;cursor:pointer;max-width:100%;height:auto;width:auto}
.clipboard-url button:disabled{opacity:.55;cursor:wait}.clipboard-url button:focus-visible{outline:2px solid #c084fc;outline-offset:2px}
.clipboard-url .clipboard-clear{flex:0 0 40px;padding:8px;color:#f87171}
.clipboard-value{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--text-secondary,#bdc2d9)}.clipboard-value i{margin-right:5px}
.clipboard-error{margin:0;color:#fda4af;font-size:11px;line-height:1.4}
.clipboard-fallback{display:flex;flex-wrap:wrap;gap:6px}.clipboard-fallback textarea{flex-basis:100%;width:100%;min-width:0;min-height:56px!important;font:inherit;font-size:16px;padding:10px;border:1px solid #a855f755;border-radius:8px;background:var(--admin-surface,#11172b);color:inherit;box-sizing:border-box}
</style>
