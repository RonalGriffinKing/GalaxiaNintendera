<script setup>
import { computed } from 'vue'
import { CAMERA_FRAME_THEMES, CAMERA_FRAME_FORMATS, cameraFrameSettings } from '@/services/cameraFrame'
const props = defineProps({ widget: Object })
const data = computed(() => props.widget.data)
const settings = computed(() => cameraFrameSettings(data.value))
const setFormat = ratio => {
  const width = Math.round(Math.max(160, 120 * ratio, Math.min(settings.value.width, 1600, 1600 * ratio)))
  data.value.width = width
  data.value.height = Math.round(width / ratio)
}
const sliders = [
  { key: 'borderWidth', label: 'Grosor del marco', min: 1, max: 16 },
  { key: 'radius', label: 'Redondeo de esquinas', min: 0, max: 80 },
  { key: 'glow', label: 'Brillo del borde', min: 0, max: 30 }
]
</script>
<template>
  <div class="camera-frame-editor">
    <label>Presentación<select :value="settings.mode" class="app-input" @change="data.mode=$event.target.value"><option value="frame">Solo marco · centro transparente</option><option value="background">Solo fondo animado</option><option value="both">Fondo y marco</option></select></label>
    <label v-if="settings.mode!=='frame'" class="check"><input type="checkbox" :checked="settings.mode==='both'" @change="data.mode=$event.target.checked?'both':'background'"/> Mostrar borde sobre el fondo</label>
    <label v-if="settings.mode!=='background'">Tipo de borde<select :value="settings.borderStyle" class="app-input" @change="data.borderStyle=$event.target.value"><option value="single">Sencillo</option><option value="double">Doble línea</option><option value="corners">Solo esquinas</option></select></label>
    <p v-if="settings.mode==='frame'">Coloca la fuente de cámara debajo de este overlay en OBS. El centro del marco es transparente.</p>
    <p v-else>Coloca este fondo debajo de la fuente de cámara en OBS. Para que se vea detrás de ti, usa croma o eliminación de fondo en la cámara. Si también quieres un marco por delante, añade otro widget en modo «Solo marco».</p>
    <label>Estilo<select :value="settings.theme.id" class="app-input" @change="data.theme=$event.target.value"><option v-for="theme in CAMERA_FRAME_THEMES" :key="theme.id" :value="theme.id">{{ theme.label }}</option></select></label>
    <fieldset><legend>Formato de cámara</legend><div class="formats"><button v-for="format in CAMERA_FRAME_FORMATS" :key="format.id" type="button" :aria-pressed="Math.abs(settings.width/settings.height-format.ratio)<.01" @click="setFormat(format.ratio)">{{ format.label }}</button></div></fieldset>
    <label>Ancho (px)<input :value="settings.width" type="number" min="160" max="1600" class="app-input" @input="data.width=Number($event.target.value)" /></label>
    <label>Alto (px)<input :value="settings.height" type="number" min="120" max="1600" class="app-input" @input="data.height=Number($event.target.value)" /></label>
    <label v-for="slider in sliders.filter(item=>settings.mode!=='background'||item.key==='radius')" :key="slider.key">{{ slider.label }}<div class="range"><input :value="settings[slider.key]" type="range" :min="slider.min" :max="slider.max" @input="data[slider.key]=Number($event.target.value)"/><output>{{ settings[slider.key] }} px</output></div></label>
    <label v-if="settings.mode!=='frame'">Luminosidad del fondo<div class="range"><input :value="settings.backgroundBrightness" type="range" min="30" max="150" @input="data.backgroundBrightness=Number($event.target.value)"/><output>{{ settings.backgroundBrightness }}%</output></div></label>
    <label class="check"><input type="checkbox" :checked="settings.decorations" @change="data.decorations=$event.target.checked"/> Detalles decorativos</label>
    <label v-if="settings.decorations && settings.mode!=='background'" class="check"><input type="checkbox" :checked="settings.showIcon" @change="data.showIcon=$event.target.checked"/> Mostrar icono superior</label>
    <label v-if="settings.decorations && (settings.showIcon || settings.mode!=='frame')">Tamaño del símbolo<div class="range"><input :value="settings.iconSize" type="range" min="24" max="96" @input="data.iconSize=Number($event.target.value)"/><output>{{ settings.iconSize }} px</output></div></label>
    <label class="check"><input type="checkbox" :checked="settings.animated" @change="data.animated=$event.target.checked"/> Activar movimiento y efectos</label>
    <template v-if="settings.animated">
      <label class="check"><input type="checkbox" :checked="settings.energy" @change="data.energy=$event.target.checked"/> {{ settings.mode==='frame'?'Energía recorriendo el borde':'Bandas de energía y luz' }}</label>
      <label class="check"><input type="checkbox" :checked="settings.waves" @change="data.waves=$event.target.checked"/> {{ settings.mode==='frame'?'Ondas de luz alrededor del marco':'Ondas y anillos de luz' }}</label>
      <label>{{ settings.mode==='frame'?'Partículas del contorno':'Partículas ambientales' }}<div class="range"><input :value="settings.particleCount" type="range" min="0" max="24" @input="data.particleCount=Number($event.target.value)"/><output>{{ settings.particleCount }}</output></div></label>
      <label>Duración de cada vuelta<div class="range"><input :value="settings.speed" type="range" min="2" max="16" @input="data.speed=Number($event.target.value)"/><output>{{ settings.speed }} s</output></div></label>
      <p>Menos segundos significa más velocidad.</p>
    </template>
    <label class="check"><input type="checkbox" :checked="settings.showLabel" @change="data.showLabel=$event.target.checked"/> Mostrar etiqueta inferior</label>
    <label v-if="settings.showLabel">Texto de la etiqueta<input v-model="data.label" maxlength="60" class="app-input" placeholder="Tu canal o nombre" /></label>
    <p>Puedes mover el marco y escalarlo desde las esquinas del lienzo. Guarda el overlay para aplicar los cambios en OBS.</p>
  </div>
</template>
<style scoped>
.camera-frame-editor{display:grid;gap:16px}.camera-frame-editor label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#334155}.camera-frame-editor p{font-size:11px;line-height:1.6;color:#64748b;margin:0}.camera-frame-editor fieldset{border:1px solid #e2e8f0;border-radius:10px;padding:12px}.camera-frame-editor legend{font-size:12px;padding:0 4px}.formats{display:grid;grid-template-columns:1fr 1fr;gap:7px}.formats button{border:1px solid #dbe1ea;border-radius:8px;padding:10px 6px;font-size:11px;background:#fff;color:#64748b}.formats button[aria-pressed=true]{border-color:#9333ea;color:#7e22ce;background:#faf5ff}.range{display:flex;gap:8px;align-items:center}.range input{width:100%;accent-color:#9333ea}.range output{min-width:35px;white-space:nowrap;font-size:11px}.camera-frame-editor .check{display:flex;align-items:center;gap:8px}
</style>
