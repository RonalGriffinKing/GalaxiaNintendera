<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ element: String, scope: String, settings: Object, title: String, description: String, fonts: Array, templates: Array, notice: String, canUndo: Boolean, canRedo: Boolean, hasExceptions: Boolean, overflow: Boolean, coverLogo: Boolean })
const emit = defineEmits(['select', 'scope', 'setting', 'title', 'description', 'undo', 'redo', 'reset', 'save', 'load', 'advanced', 'close', 'center', 'download'])
const name = ref('')
const libraryOpen = ref(false)
const elements = { title: 'Título', description: 'Resumen', image: 'Fondo', logo: 'Logo Galaxia', gameLogo: 'Logo del juego', author: 'Autor', part: 'Etiqueta', arrow: 'Flecha', button: 'Botón', number: 'Numeración' }
const textElement = computed(() => ['title', 'description'].includes(props.element))
const current = computed(() => props.coverLogo && props.element === 'gameLogo' ? { ...props.settings.gameLogo, size: props.settings.coverGameLogo.size } : props.settings[props.element] || {})
const set = (key, value) => emit('setting', { path: `${props.element}.${key}`, value })
</script>

<template>
  <aside class="visual-inspector" aria-label="Edición visual">
    <header><strong>Editar imagen</strong><button aria-label="Cerrar editor" @click="emit('close')">×</button></header>
    <div class="scope" aria-label="Aplicar diseño a">
      <button :class="{ active: scope === 'single' }" @click="emit('scope', 'single')">Solo esta</button>
      <button :class="{ active: scope === 'all' }" @click="emit('scope', 'all')">Todo el carrusel</button>
    </div>
    <small v-if="scope === 'all' && hasExceptions">Esta imagen tiene ajustes propios. Se conservarán al cambiar el diseño general.</small>
    <div class="tools"><button :disabled="!canUndo" @click="emit('undo')">↶ Deshacer</button><button :disabled="!canRedo" @click="emit('redo')">↷ Rehacer</button></div>
    <label>Elemento<select :value="element" @change="emit('select', $event.target.value)"><option v-for="(label, key) in elements" :key="key" :value="key">{{ label }}</option></select></label>
    <small>Toca un elemento en la imagen y arrástralo. Se ajusta al centro al acercarlo.</small>
    <p v-if="overflow" class="overflow-notice" role="status">El texto se está recortando. Reduce su tamaño o aumenta el ancho disponible.</p>
    <template v-if="textElement">
      <label v-if="element === 'title'">Texto de esta imagen<textarea :value="title" rows="3" @input="emit('title', $event.target.value)"></textarea></label>
      <label v-else>Resumen de esta imagen<textarea :value="description" rows="3" @input="emit('description', $event.target.value)"></textarea></label>
      <label>Fuente<select :value="current.family || settings.typography.family" @change="set('family', $event.target.value)"><option v-for="font in fonts" :key="font.value" :value="font.value">{{ font.label }}</option></select></label>
      <label>Tamaño {{ Math.round(current.size) }}<input type="range" min="24" max="150" :value="current.size" @input="set('size', Number($event.target.value))" /></label>
      <div class="tools"><button :class="{ active: (current.weight || 950) >= 800 }" @click="set('weight', (current.weight || 950) >= 800 ? 500 : 900)"><b>B</b></button><button v-for="(label, align) in { left: 'Izq.', center: 'Centro', right: 'Der.' }" :key="align" :class="{ active: (current.align || 'left') === align }" @click="set('align', align)">{{ label }}</button></div>
      <label>Color<input type="color" :value="current.color" @input="set('color', $event.target.value)" /></label>
      <template v-if="element === 'title'">
        <label>Ancho {{ Math.round(current.width) }}<input type="range" min="180" max="1000" :value="current.width" @input="set('width', Number($event.target.value))" /></label>
      </template>
      <label>Interlineado<input type="range" min="0.9" max="1.6" step="0.01" :value="current.line || 1.2" @input="set('line', Number($event.target.value))" /></label>
    </template>
    <template v-else>
      <template v-if="element === 'image'">
        <label>Zoom<input type="range" min="100" max="170" :value="current.scale" @input="set('scale', Number($event.target.value))" /></label>
        <label>Brillo<input type="range" min="40" max="160" :value="current.brightness" @input="set('brightness', Number($event.target.value))" /></label>
      </template>
      <label v-if="current.size !== undefined || element === 'button'">Tamaño<input type="range" min="20" :max="element === 'gameLogo' ? 760 : 400" :value="current.size || 100" @input="set('size', Number($event.target.value))" /></label>
      <label v-if="current.visible !== undefined"><input type="checkbox" :checked="current.visible" @change="set('visible', $event.target.checked)" /> Mostrar elemento</label>
    </template>
    <button v-if="element !== 'image'" @click="emit('center')">Centrar elemento en la imagen</button>
    <button v-if="scope === 'single' || hasExceptions" @click="emit('reset')">Restablecer esta imagen al diseño general</button>
    <button @click="emit('advanced')">Fondo, estilos y ajustes avanzados</button>
    <button @click="emit('download')">Descargar carrusel ZIP</button>
    <button @click="libraryOpen = !libraryOpen">Plantillas guardadas</button>
    <div v-if="libraryOpen" class="library">
      <label>Nombre<input v-model="name" maxlength="60" placeholder="Mi plantilla" /></label>
      <button :disabled="!name.trim()" @click="emit('save', name)">Guardar diseño general</button>
      <small>Guarda el formato y el diseño general; conserva los textos propios de cada post.</small>
      <button v-for="item in templates" :key="item.id" class="template-item" @click="emit('load', item.id)"><span class="template-mini" :style="{ background: item.settings.overlay?.color || '#050816', color: item.settings.title?.color || '#fff', fontFamily: item.settings.title?.family || item.settings.typography?.family }">Aa</span><span>{{ item.name }} · {{ item.format }}</span></button>
    </div>
    <p v-if="notice" role="status">{{ notice }}</p>
  </aside>
</template>

<style scoped>
.visual-inspector { position: fixed; right: 0; top: 0; bottom: 0; width: 310px; padding: 16px; box-sizing: border-box; background: #0b1020; color: #fff; border-left: 1px solid #ffffff20; z-index: 5000; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
header, .tools, .scope { display: flex; align-items: center; gap: 6px; }
header { justify-content: space-between; }
header button { width: 44px; font-size: 24px; }
button, select, textarea, input:not([type=range]):not([type=checkbox]) { background: #ffffff0c; border: 1px solid #ffffff20; color: #fff; border-radius: 8px; padding: 8px; min-height: 40px; box-sizing: border-box; }
button { cursor: pointer; }
button.active { background: #7c3aed; }
button:disabled { opacity: .4; cursor: default; }
.tools button, .scope button { flex: 1; }
label, .library { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
input[type=range] { width: 100%; accent-color: #a855f7; }
textarea { resize: vertical; }
small, p { font-size: 12px; line-height: 1.4; color: #cbd5e1; margin: 0; }
select option { background: #0b1020; }
.template-item { display: flex; align-items: center; gap: 10px; text-align: left; }
.template-mini { flex: 0 0 36px; height: 48px; display: grid; place-content: center; border: 1px solid #ffffff30; font-weight: 900; }
.overflow-notice { color: #fcd34d; padding: 8px; border: 1px solid #fcd34d40; border-radius: 8px; }
@media (max-width: 800px) { .visual-inspector { top: auto; left: 0; width: 100%; height: min(350px, 45dvh); border-left: 0; border-top: 1px solid #ffffff20; padding-bottom: max(16px, env(safe-area-inset-bottom)); } }
</style>
