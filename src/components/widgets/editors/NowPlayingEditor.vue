<script setup>
import { computed } from 'vue'
import { NOW_PLAYING_DEFAULTS } from '@/services/nowPlaying'
const fontControls = [{ key: 'labelSize', label: 'Jugando ahora', min: 10, max: 24 }, { key: 'titleSize', label: 'Nombre del juego', min: 14, max: 32 }, { key: 'platformSize', label: 'Plataforma', min: 9, max: 20 }, { key: 'statsSize', label: 'Horas y logros', min: 10, max: 24 }]
const props = defineProps({ widget: Object })
const data = computed(() => props.widget.data)
</script>
<template>
  <div class="now-playing-editor">
    <label>Sistema<select v-model="data.platform" class="app-input"><option value="auto">Automático: juego activo</option><option value="nintendo">Nintendo Switch</option><option value="xbox">Xbox</option><option value="steam" disabled>Steam · próximamente</option></select></label>
    <p>Usa las cuentas públicas de tu perfil. Conéctalas desde Editar perfil → Conectar sistemas.</p>
    <label><input v-model="data.showLastGame" type="checkbox" /> Mostrar el último juego si no se detecta una partida</label>
    <p>Se identificará como «Último juego detectado». Estar en línea no significa estar jugando.</p>
    <label>Estilo<select v-model="data.theme" class="app-input"><option value="galaxy">Galaxia</option><option value="minimal">Minimalista</option></select></label>
    <label>Entrada y salida<select v-model="data.direction" class="app-input"><option value="left">Deslizar desde la izquierda</option><option value="right">Deslizar desde la derecha</option></select></label>
    <label>Visible durante (segundos)<input v-model.number="data.visibleSeconds" type="number" min="5" max="60" class="app-input" /></label>
    <label>Repetir cada (segundos)<input v-model.number="data.repeatSeconds" type="number" :min="Number(data.visibleSeconds || 12) + 5" max="1800" class="app-input" /></label>
    <fieldset class="font-controls"><legend>Tamaño de las letras</legend><label v-for="control in fontControls" :key="control.key">{{ control.label }}<div class="font-adjust"><button type="button" :aria-label="'Reducir ' + control.label" @click="data[control.key] = Math.max(control.min, (Number(data[control.key]) || NOW_PLAYING_DEFAULTS[control.key]) - 1)">A−</button><input :value="data[control.key] ?? NOW_PLAYING_DEFAULTS[control.key]" type="range" :min="control.min" :max="control.max" :aria-label="'Tamaño de ' + control.label" @input="data[control.key] = Number($event.target.value)"/><button type="button" :aria-label="'Agrandar ' + control.label" @click="data[control.key] = Math.min(control.max, (Number(data[control.key]) || NOW_PLAYING_DEFAULTS[control.key]) + 1)">A+</button><output>{{ data[control.key] ?? NOW_PLAYING_DEFAULTS[control.key] }} px</output></div></label></fieldset>
    <p>La altura se adapta al texto para evitar recortes.</p>
    <label>Ancho (px)<input v-model.number="data.width" type="number" min="320" max="900" class="app-input" /></label>
    <label>Alto (px)<input v-model.number="data.height" type="number" min="172" max="360" class="app-input" /></label>
    <button type="button" class="test-animation" @click="data.replayNonce = Date.now()">Probar animación</button>
    <p>Solo muestra horas o logros disponibles para ese juego. Los datos se revisan cada cinco minutos (Nintendo seleccionado: cada minuto). La animación no hace consultas adicionales.</p>
    <p>Guarda y usa «Copiar» para añadir el enlace como fuente de navegador en OBS, con el tamaño del lienzo. El fondo de OBS es transparente y, sin actividad, el widget queda oculto.</p>
  </div>
</template>
<style scoped>
.now-playing-editor{display:grid;gap:14px}.now-playing-editor label{display:grid;gap:7px;font-size:12px;font-weight:600;color:#334155}.now-playing-editor label:has(input[type=checkbox]){display:flex;align-items:start}.now-playing-editor p{font-size:11px;line-height:1.6;color:#64748b;margin:0}.test-animation{padding:10px;border-radius:9px;background:#7c3aed;color:white;font-size:12px;font-weight:600}.now-playing-editor input[type=checkbox]{margin-top:3px}
.font-controls{border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:grid;gap:12px}.font-controls legend{font-size:12px;font-weight:600;padding:0 5px}.font-adjust{display:flex;align-items:center;gap:7px;min-width:0}.font-adjust button{padding:5px;border-radius:6px;background:#ede9fe;color:#6d28d9;font-size:12px;flex:none}.font-adjust input{width:100%;min-width:20px;accent-color:#7c3aed}.font-adjust output{font-size:10px;min-width:30px;white-space:nowrap}
</style>
