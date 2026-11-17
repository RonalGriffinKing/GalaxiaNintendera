<script setup>
import { computed } from 'vue'
import { nowPlayingVisualSettings, NOW_PLAYING_APPEARANCES, NOW_PLAYING_BORDERS, NOW_PLAYING_ENTRIES, NOW_PLAYING_EXITS } from '@/services/nowPlayingAppearance'
const props = defineProps({ data: { type: Object, required: true } })
const emit = defineEmits(['change'])
const value = computed(() => nowPlayingVisualSettings(props.data))
function set(key, next) { emit('change', { [key]: next }) }
function number(key, event) { const next = Number(event.target.value); if (Number.isFinite(next)) set(key, next) }
function entrance(next) { emit('change', { entryAnimation: next, animationDuration: next === 'triforce' ? 1.8 : next === 'crystal' ? 1.2 : .65 }) }
function exit(next) { emit('change', { exitAnimation: next, exitDuration: next === 'triforce' ? 1.1 : next === 'collapse' ? .65 : .5 }) }
function hyrule() {
  emit('change', { appearance:'emerald', borderMode:'travel', entryAnimation:'triforce', exitAnimation:'triforce', animationDuration:1.8, exitDuration:1.1, elementDelay:.07, effectsEnabled:true, animationsEnabled:true, replayNonce:Date.now() })
}
</script>

<template>
  <div class="np-appearance-editor">
    <details open class="np-control-section">
      <summary>Apariencia</summary>
      <div class="np-section-body">
        <label>Tema visual<select :value="value.appearance" @change="set('appearance',$event.target.value)"><option v-for="option in NOW_PLAYING_APPEARANCES" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
        <label v-if="value.appearance==='original'">Estilo original<select :value="data.theme || 'galaxy'" @change="set('theme',$event.target.value)"><option value="galaxy">Galaxia</option><option value="minimal">Minimalista</option><option value="halloween">Halloween</option><option value="zelda">Zelda · Trifuerza</option></select></label>
        <p v-if="value.appearance==='original'">Conserva el diseño y los colores que ya tenías. Los temas nuevos son opcionales.</p>
        <button type="button" class="np-preset" @click="hyrule">Probar Esmeralda + Trifuerza mágica</button>
        <div v-if="value.appearance==='custom'" class="np-two-columns"><label>Color principal<input type="color" :value="value.primaryColor" @input="set('primaryColor',$event.target.value)" /></label><label>Color secundario<input type="color" :value="value.secondaryColor" @input="set('secondaryColor',$event.target.value)" /></label></div>
        <template v-if="value.appearance!=='original'">
          <label>Opacidad del panel · {{ Math.round(value.panelOpacity*100) }} %<input type="range" min="0.1" max="1" step="0.01" :value="value.panelOpacity" @input="number('panelOpacity',$event)" /></label>
          <label>Desenfoque del cristal · {{ value.blurIntensity }} px<input type="range" min="0" max="24" step="1" :value="value.blurIntensity" @input="number('blurIntensity',$event)" /></label>
        </template>
        <label>Borde<select :value="value.borderMode" @change="set('borderMode',$event.target.value)"><option v-for="option in NOW_PLAYING_BORDERS" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
        <div v-if="value.appearance!=='original' || value.borderMode!=='original'" class="np-two-columns"><label>Redondeo (px)<input type="number" min="0" max="48" :value="value.cornerRadius" @input="number('cornerRadius',$event)" /></label><label>Grosor (px)<input type="number" min="0.5" max="5" step="0.5" :value="value.borderWidth" @input="number('borderWidth',$event)" /></label></div>
      </div>
    </details>
    <details class="np-control-section">
      <summary>Efectos</summary>
      <div class="np-section-body">
        <label class="np-check"><input type="checkbox" :checked="value.effectsEnabled" @change="set('effectsEnabled',$event.target.checked)" /> Activar efectos decorativos</label>
        <fieldset :disabled="!value.effectsEnabled">
          <label class="np-check"><input type="checkbox" :checked="data.particles!==false" @change="set('particles',$event.target.checked)" /> Partículas suaves</label>
          <label class="np-check"><input type="checkbox" :checked="value.animatedGlow" @change="set('animatedGlow',$event.target.checked)" /> Brillo en movimiento</label>
          <label class="np-check"><input type="checkbox" :checked="value.reflections" @change="set('reflections',$event.target.checked)" /> Reflejos del panel</label>
          <label>Intensidad del brillo · {{ Math.round(value.glowIntensity*100) }} %<input type="range" min="0" max="1" step="0.01" :value="value.glowIntensity" @input="number('glowIntensity',$event)" /></label>
          <label>Intensidad de los efectos · {{ Math.round(value.effectIntensity*100) }} %<input type="range" min="0" max="1" step="0.01" :value="value.effectIntensity" @input="number('effectIntensity',$event)" /></label>
          <label>Vuelta de la luz · {{ value.effectSpeed }} s<input type="range" min="3" max="30" step="1" :value="value.effectSpeed" @input="number('effectSpeed',$event)" /><small>Más segundos: movimiento más lento.</small></label>
        </fieldset>
        <label class="np-check"><input type="checkbox" :checked="value.allowOverflow" @change="set('allowOverflow',$event.target.checked)" /> Permitir efectos fuera del área del widget</label>
        <p>Por defecto, los efectos quedan dentro del tamaño del widget.</p>
      </div>
    </details>
    <details class="np-control-section">
      <summary>Animación</summary>
      <div class="np-section-body">
        <label>Entrada<select :value="value.entryAnimation" @change="entrance($event.target.value)"><option v-for="option in NOW_PLAYING_ENTRIES" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
        <label>Salida<select :value="value.exitAnimation" @change="exit($event.target.value)"><option v-for="option in NOW_PLAYING_EXITS" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
        <label>Dirección<select :value="data.direction || 'left'" @change="set('direction',$event.target.value)"><option value="left">Desde la izquierda</option><option value="right">Desde la derecha</option></select></label>
        <div class="np-two-columns"><label>Entrada (segundos)<input type="number" min="0.3" max="3" step="0.1" :value="value.animationDuration" @input="number('animationDuration',$event)" /></label><label>Salida (segundos)<input type="number" min="0.2" max="2" step="0.1" :value="value.exitDuration" @input="number('exitDuration',$event)" /></label></div>
        <label>Retardo entre elementos · {{ Math.round(value.elementDelay*1000) }} ms<input type="range" min="0" max="0.2" step="0.01" :value="value.elementDelay" @input="number('elementDelay',$event)" /></label>
        <p>La Trifuerza revela el panel desde el centro. Los tiempos se ajustan para completar la secuencia sin solapamientos.</p>
      </div>
    </details>
  </div>
</template>

<style scoped>
.np-appearance-editor{display:grid;gap:10px}.np-control-section{border:1px solid #e2e8f0;border-radius:10px;background:#ffffff66}.np-control-section summary{padding:12px;font-size:12px;font-weight:700;color:#334155;cursor:pointer}.np-section-body{padding:0 12px 14px;display:grid;gap:14px}label{display:grid;gap:7px;color:#475569;font-size:11px;font-weight:600}select,input:not([type=checkbox]){box-sizing:border-box;width:100%;min-height:34px;border:1px solid #cbd5e1;border-radius:7px;padding:7px;background:white;color:#334155;font:inherit}input[type=range]{padding:0;border:0;accent-color:#7c3aed}input[type=color]{padding:3px}.np-two-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px}.np-check{display:flex;align-items:center;gap:8px}.np-check input{accent-color:#7c3aed}fieldset{display:grid;gap:14px;padding:0;margin:0;border:0}fieldset:disabled{opacity:.45}.np-preset{padding:10px;border:1px solid #c7b26e;border-radius:8px;background:linear-gradient(115deg,#063c2e,#154f3e);color:#fff0bb;font-size:11px;font-weight:600;cursor:pointer}p,small{font-size:10px;line-height:1.6;color:#64748b;margin:0}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #a78bfa;outline-offset:2px}
</style>
