<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { listOverlayEvents } from '@/services/overlayEventClient'
import { eventGameNames } from '@/services/eventGame'
import { NOW_PLAYING_DEFAULTS } from '@/services/nowPlaying'
const fontControls = [{ key: 'labelSize', label: 'Hoy jugamos', min: 10, max: 24 }, { key: 'titleSize', label: 'Nombre del juego', min: 14, max: 32 }, { key: 'platformSize', label: 'Plataforma', min: 9, max: 20 }, { key: 'statsSize', label: 'Horas y logros', min: 10, max: 24 }]
const props = defineProps({ widget: Object, persist: Function })
const data = computed(() => props.widget.data)
const saving = ref(false), notice = ref('')
const events=ref([]),eventsLoading=ref(false),eventsError=ref('')
let eventsSequence=0
async function loadEvents(){
 const id=++eventsSequence;eventsLoading.value=true;eventsError.value=''
 try{const values=await listOverlayEvents();if(id===eventsSequence)events.value=values}
 catch{if(id===eventsSequence)eventsError.value='No se pudieron cargar los eventos. Vuelve a intentarlo.'}
 finally{if(id===eventsSequence)eventsLoading.value=false}
}
watch(()=>data.value.source,value=>{if(value==='event')loadEvents()},{immediate:true})
onUnmounted(()=>eventsSequence++)
const eventName=event=>{const game=eventGameNames(event);return (game.nameEs||game.nameEn||'Sin juego asignado')+' · '+(event.title||'Evento')}
async function persistControl(changes) {
 if(saving.value)return
 const target=data.value, previous=Object.fromEntries(Object.keys(changes).map(key=>[key,target[key]]))
 saving.value=true;notice.value='';Object.assign(target,changes)
 try { await props.persist?.();notice.value=target.enabled===false?'Apagado en OBS. No se consultan las APIs.':'Guardado y enviado a OBS.' }
 catch { for(const [key,value] of Object.entries(previous)){if(value===undefined)delete target[key];else target[key]=value};notice.value='No se pudo guardar. Vuelve a intentarlo.' }
 finally { saving.value=false }
}
</script>
<template>
  <div class="now-playing-editor">
    <div class="live-controls"><button type="button" :class="{off:data.enabled===false}" :disabled="saving" :aria-pressed="data.enabled!==false" @click="persistControl({enabled:data.enabled===false})">{{ data.enabled===false?'Encender widget':'Apagar widget' }}</button><button type="button" :disabled="saving||data.enabled===false" @click="persistControl({refreshNonce:Date.now()})">Actualizar juego</button></div>
    <p>Estos botones guardan el overlay y se aplican al enlace de OBS. Apagado no consulta las APIs de juegos.</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <label>Origen del juego<select :value="data.source||'auto'" class="app-input" @change="data.source=$event.target.value"><option value="auto">Automático · juego activo</option><option value="last">Último juego disponible</option><option value="event">Juego del evento</option></select></label>
    <template v-if="data.source==='event'">
      <label>Evento<select v-model="data.eventId" class="app-input" :disabled="eventsLoading"><option value="">Selecciona un evento</option><option v-for="event in events" :key="event.id" :value="event.id">{{eventName(event)}}</option><option v-if="data.eventId&&!events.some(event=>event.id===data.eventId)" :value="data.eventId">Evento guardado · {{data.eventId}}</option></select></label>
      <button type="button" class="test-animation" :disabled="eventsLoading" @click="loadEvents">{{eventsLoading?'Cargando eventos…':'Actualizar lista de eventos'}}</button>
      <p v-if="eventsError" role="status">{{eventsError}}</p>
      <label><input type="checkbox" :checked="data.eventShowDescription!==false" @change="data.eventShowDescription=$event.target.checked" /> Mostrar descripción del evento</label>
      <label><input type="checkbox" :checked="data.eventShowStart!==false" @change="data.eventShowStart=$event.target.checked" /> Mostrar fecha y hora de inicio</label>
      <label v-if="data.eventShowStart!==false">Zona horaria<select :value="data.eventTimeZone||'Europe/Madrid'" class="app-input" @change="data.eventTimeZone=$event.target.value"><option value="Europe/Madrid">España peninsular</option><option value="Atlantic/Canary">Canarias</option><option value="UTC">UTC</option></select></label>
      <p>Muestra el juego y el fondo elegidos, con una descripción de hasta dos líneas y la hora del directo. Los datos vacíos se omiten. No consulta tus consolas ni utiliza el título del evento como nombre del juego.</p>
    </template>
    <label>Consulta de datos<select :value="data.refreshMode || 'manual'" class="app-input" @change="data.refreshMode=$event.target.value"><option value="manual">Solo al encender o actualizar</option><option value="auto">Actualizar automáticamente</option></select></label>
    <p>Sin consultas repetidas por defecto. Si cambias de juego, pulsa Actualizar juego. Recargar la fuente de OBS realiza una nueva lectura.</p>
    <template v-if="data.source!=='event'">
    <label>Sistema<select v-model="data.platform" class="app-input"><option value="auto">Automático: juego activo</option><option value="nintendo">Nintendo Switch</option><option value="xbox">Xbox</option><option value="steam" disabled>Steam · próximamente</option></select></label>
    <label v-if="data.platform !== 'xbox'">Consola Nintendo<select :value="data.nintendoPlatform || 'auto'" class="app-input" @change="data.nintendoPlatform = $event.target.value"><option value="auto">Automático (nxapi)</option><option>Nintendo Switch</option><option>Nintendo Switch 2</option></select><small>Puedes fijar la consola o usar la que detecte nxapi.</small></label>
    <label v-if="data.platform !== 'nintendo'">Consola Xbox<select :value="data.xboxPlatform || 'Xbox'" class="app-input" @change="data.xboxPlatform = $event.target.value"><option>Xbox</option><option>Xbox Series</option><option>Xbox One</option><option>PC</option></select><small>Etiqueta elegida por ti; la API no siempre identifica el modelo.</small></label>
    <p>Usa las cuentas públicas de tu perfil. Conéctalas desde Editar perfil → Conectar sistemas.</p>
    <label v-if="!data.source||data.source==='auto'"><input v-model="data.showLastGame" type="checkbox" /> Mostrar el último juego si no se detecta una partida</label>
    <p>La etiqueta del overlay es «Hoy jugamos». En «Último juego» se usa la última actividad disponible, aunque no haya una partida activa.</p>
    </template>
    <label>Estilo<select v-model="data.theme" class="app-input"><option value="galaxy">Galaxia</option><option value="minimal">Minimalista</option><option value="halloween">Halloween</option></select></label>
    <label>Tamaño de la portada<div class="font-adjust"><input :value="data.coverWidth ?? 88" type="range" min="60" max="120" aria-label="Ancho de la portada" @input="data.coverWidth = Number($event.target.value)"/><output>{{ data.coverWidth ?? 88 }} px</output></div></label>
    <label><input type="checkbox" :checked="data.particles !== false" @change="data.particles = $event.target.checked"/> Partículas suaves de fondo</label>
    <p>En tarjetas estrechas la portada se ajusta para dejar espacio al texto.</p>
    <label>Entrada y salida<select v-model="data.direction" class="app-input"><option value="left">Deslizar desde la izquierda</option><option value="right">Deslizar desde la derecha</option></select></label>
    <label>Visible durante (segundos)<input v-model.number="data.visibleSeconds" type="number" min="5" max="60" class="app-input" /></label>
    <label>Repetir cada (segundos)<input v-model.number="data.repeatSeconds" type="number" :min="Number(data.visibleSeconds || 12) + 5" max="1800" class="app-input" /></label>
    <fieldset class="font-controls"><legend>Tamaño de las letras</legend><label v-for="control in fontControls" :key="control.key">{{ control.label }}<div class="font-adjust"><button type="button" :aria-label="'Reducir ' + control.label" @click="data[control.key] = Math.max(control.min, (Number(data[control.key]) || NOW_PLAYING_DEFAULTS[control.key]) - 1)">A−</button><input :value="data[control.key] ?? NOW_PLAYING_DEFAULTS[control.key]" type="range" :min="control.min" :max="control.max" :aria-label="'Tamaño de ' + control.label" @input="data[control.key] = Number($event.target.value)"/><button type="button" :aria-label="'Agrandar ' + control.label" @click="data[control.key] = Math.min(control.max, (Number(data[control.key]) || NOW_PLAYING_DEFAULTS[control.key]) + 1)">A+</button><output>{{ data[control.key] ?? NOW_PLAYING_DEFAULTS[control.key] }} px</output></div></label></fieldset>
    <p>La altura se adapta al texto para evitar recortes.</p>
    <label>Ancho (px)<input v-model.number="data.width" type="number" min="320" max="900" class="app-input" /></label>
    <label>Alto (px)<input v-model.number="data.height" type="number" min="172" max="360" class="app-input" /></label>
    <button type="button" class="test-animation" @click="data.replayNonce = Date.now()">Probar animación</button>
    <p>Solo muestra datos disponibles. En modo automático consulta cada cinco minutos (Nintendo seleccionado: cada minuto). La animación no consulta la API. Las cachés del proveedor pueden retrasar una actualización.</p>
    <p>Guarda y usa «Copiar» para añadir el enlace como fuente de navegador en OBS, con el tamaño del lienzo. El fondo de OBS es transparente y, sin actividad, el widget queda oculto.</p>
  </div>
</template>
<style scoped>
.now-playing-editor{display:grid;gap:14px}.now-playing-editor label{display:grid;gap:7px;font-size:12px;font-weight:600;color:#334155}.now-playing-editor label:has(input[type=checkbox]){display:flex;align-items:start}.now-playing-editor p{font-size:11px;line-height:1.6;color:#64748b;margin:0}.test-animation{padding:10px;border-radius:9px;background:#7c3aed;color:white;font-size:12px;font-weight:600}.now-playing-editor input[type=checkbox]{margin-top:3px}
.font-controls{border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:grid;gap:12px}.font-controls legend{font-size:12px;font-weight:600;padding:0 5px}.font-adjust{display:flex;align-items:center;gap:7px;min-width:0}.font-adjust button{padding:5px;border-radius:6px;background:#ede9fe;color:#6d28d9;font-size:12px;flex:none}.font-adjust input{width:100%;min-width:20px;accent-color:#7c3aed}.font-adjust output{font-size:10px;min-width:30px;white-space:nowrap}
.live-controls{display:flex;gap:8px;flex-wrap:wrap}.live-controls button{padding:10px;border-radius:9px;background:#7c3aed;color:white;font-size:12px;font-weight:600}.live-controls button.off{background:#15803d}.live-controls button:disabled{opacity:.5;cursor:wait}
</style>
