<template>
  <div class="space-y-5">
    <div>
      <label class="app-label">Tipo</label>
      <div class="option-grid">
        <button :class="{ active: data.mode === 'countdown' }" @click="setMode('countdown')">Temporizador</button>
        <button :class="{ active: data.mode === 'clock' }" @click="setMode('clock')">Hora actual</button>
      </div>
    </div>

    <div><label class="app-label">Texto superior</label><input v-model="data.title" class="app-input" /></div>

    <template v-if="data.mode === 'countdown'">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="app-label">Minutos</label><input v-model.number="minutes" min="0" max="999" type="number" class="app-input" @change="applyDuration" /></div>
        <div><label class="app-label">Segundos</label><input v-model.number="seconds" min="0" max="59" type="number" class="app-input" @change="applyDuration" /></div>
      </div>
      <div class="timer-actions">
        <button v-if="!data.running" class="start" @click="start"><i class="fas fa-play"></i> Iniciar</button>
        <button v-else class="pause" @click="pause"><i class="fas fa-pause"></i> Pausar</button>
        <button @click="reset"><i class="fas fa-rotate-left"></i> Reiniciar</button>
      </div>
      <p class="editor-hint">Guarda el overlay despues de iniciar para sincronizarlo en OBS.</p>
    </template>

    <label v-else class="check-row"><input v-model="data.showSeconds" type="checkbox" /> Mostrar segundos</label>
    <label v-if="data.mode === 'clock'" class="check-row"><input v-model="data.showDate" type="checkbox" /> Mostrar fecha</label>

    <div>
      <label class="app-label">Estilo</label>
      <div class="theme-grid">
        <button v-for="theme in themes" :key="theme.id" :class="['theme-option', theme.id, { active: data.theme === theme.id }]" @click="data.theme = theme.id"><span></span>{{ theme.label }}</button>
      </div>
    </div>

    <div><label class="app-label">Animacion de numeros</label><div class="animation-grid"><button v-for="animation in animations" :key="animation.id" :class="{active:data.numberAnimation===animation.id}" @click="data.numberAnimation=animation.id"><i :class="animation.icon"></i>{{ animation.label }}</button></div></div>
    <label class="check-row"><input v-model="data.showBackground" type="checkbox" /> Mostrar fondo y borde</label>
    <label class="check-row"><input v-model="data.showOrbit" type="checkbox" /> Mostrar orbitas decorativas</label>
    <div class="color-grid"><label><span>Titulo</span><input v-model="data.titleColor" type="color" /></label><label><span>Numeros</span><input v-model="data.numberColor" type="color" /></label></div>
    <label class="check-row"><input v-model="data.numberGradient" type="checkbox" /> Numeros con degradado</label>
    <div v-if="data.numberGradient" class="color-grid"><label><span>Inicio degradado</span><input v-model="data.numberGradientStart" type="color" /></label><label><span>Final degradado</span><input v-model="data.numberGradientEnd" type="color" /></label></div>
    <div><label class="app-label">Cantidad de estrellas</label><input v-model.number="data.starCount" type="range" min="0" max="12" class="slider" /><p class="section-caption">{{ data.starCount }} estrellas</p></div>
    <div><label class="app-label">Tamano del titulo</label><input v-model.number="data.titleSize" type="range" min="10" max="34" class="slider" /><p class="section-caption">{{ data.titleSize }} px</p></div>
    <div><label class="app-label">Tamano de los numeros</label><input v-model.number="data.numberSize" type="range" min="30" max="110" class="slider" /><p class="section-caption">{{ data.numberSize }} px</p></div>
    <div><label class="app-label">Separacion titulo y numeros</label><input v-model.number="data.titleGap" type="range" min="0" max="44" class="slider" /><p class="section-caption">{{ data.titleGap }} px</p></div>

    <div><label class="app-label">Ancho</label><input v-model.number="data.width" type="range" min="280" max="760" class="slider" /><p class="section-caption">{{ data.width }} px</p></div>
    <div><label class="app-label">Alto</label><input v-model.number="data.height" type="range" min="140" max="320" class="slider" /><p class="section-caption">{{ data.height }} px</p></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
const props = defineProps({ widget: Object })
const data = props.widget.data
const minutes = ref(25)
const seconds = ref(0)
const themes = [{ id: 'galaxy', label: 'Galaxia' }, { id: 'nebula', label: 'Nebulosa' }, { id: 'solar', label: 'Solar' }]
const animations = [{ id: 'flip', label: 'Giro', icon: 'fas fa-arrows-rotate' }, { id: 'pulse', label: 'Pulso', icon: 'fas fa-wave-square' }, { id: 'slide', label: 'Deslizar', icon: 'fas fa-arrow-down' }, { id: 'none', label: 'Ninguna', icon: 'fas fa-ban' }]

const ensureDefaults = () => {
  data.mode ??= 'countdown'; data.title ??= 'EN DIRECTO EN'; data.durationSeconds ??= 1500
  data.remainingSeconds ??= data.durationSeconds; data.running ??= false; data.endAt ??= 0
  data.theme ??= 'galaxy'; data.width ??= 420; data.height ??= 190; data.showSeconds ??= true; data.showDate ??= true
  data.showBackground = data.showBackground !== false; data.showOrbit = data.showOrbit !== false
  data.starCount = Number.isFinite(Number(data.starCount)) ? Number(data.starCount) : 7
  data.titleSize = Number(data.titleSize) || 15; data.numberSize = Number(data.numberSize) || 54; data.titleGap = Number.isFinite(Number(data.titleGap)) ? Number(data.titleGap) : 5
  data.titleColor ||= '#ffffff'; data.numberColor ||= '#ffffff'; data.numberAnimation ||= 'flip'
  data.numberGradient = data.numberGradient !== false; data.numberGradientStart ||= '#ffffff'; data.numberGradientEnd ||= '#f0abfc'
  const base = data.running && data.endAt ? Math.max(0, Math.ceil((data.endAt - Date.now()) / 1000)) : data.remainingSeconds
  minutes.value = Math.floor(base / 60); seconds.value = base % 60
}
const applyDuration = () => { const total = Math.max(0, Number(minutes.value || 0) * 60 + Number(seconds.value || 0)); data.durationSeconds = total; data.remainingSeconds = total; data.running = false; data.endAt = 0 }
const start = () => { const left = Math.max(0, Number(data.remainingSeconds) || Number(data.durationSeconds) || 0); data.endAt = Date.now() + left * 1000; data.running = true }
const pause = () => { data.remainingSeconds = Math.max(0, Math.ceil((data.endAt - Date.now()) / 1000)); data.running = false; data.endAt = 0; ensureDefaults() }
const reset = () => { data.running = false; data.endAt = 0; data.remainingSeconds = data.durationSeconds; ensureDefaults() }
const setMode = mode => { data.mode = mode; data.title = mode === 'clock' ? 'HORA GALACTICA' : 'EN DIRECTO EN' }
onMounted(ensureDefaults)
</script>

<style scoped>
.option-grid, .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 7px; }
.option-grid button, .theme-option { border: 1px solid #dbe1ea; border-radius: 8px; padding: 9px; font-size: 11px; font-weight: 800; color: #64748b; background: white; }
.option-grid button.active, .theme-option.active { border-color: #9333ea; color: #7e22ce; box-shadow: 0 0 0 2px rgba(147,51,234,.12); }
.theme-grid { grid-template-columns: 1fr; }
.theme-option { display: flex; align-items: center; gap: 9px; text-align: left; }
.theme-option span { width: 28px; height: 18px; border-radius: 5px; }
.theme-option.galaxy span { background: linear-gradient(135deg,#281252,#c026d3); }.theme-option.nebula span { background: linear-gradient(135deg,#071a3d,#22d3ee); }.theme-option.solar span { background: linear-gradient(135deg,#fb7185,#f97316); }
.timer-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.timer-actions button { border: 1px solid #dbe1ea; border-radius: 8px; padding: 9px; font-size: 11px; font-weight: 900; }.timer-actions .start { background: #7e22ce; color: white; border-color: #7e22ce; }.timer-actions .pause { background: #f59e0b; color: white; border-color: #f59e0b; }
.editor-hint { font-size: 10px; line-height: 1.45; color: #94a3b8; }.check-row { display: flex; gap: 9px; align-items: center; font-size: 12px; font-weight: 700; }.slider { width: 100%; margin-top: 6px; }
.animation-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.animation-grid button{display:flex;align-items:center;justify-content:center;gap:6px;height:38px;border:1px solid #dbe1ea;border-radius:8px;background:white;color:#64748b;font-size:10px;font-weight:800}.animation-grid button.active{border-color:#9333ea;color:#7e22ce;box-shadow:0 0 0 2px rgba(147,51,234,.12)}.color-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.color-grid label{display:flex;flex-direction:column;gap:5px;font-size:9px;font-weight:900;color:#64748b}.color-grid input{width:100%;height:34px;border:0}
</style>
