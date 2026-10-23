<script setup>
import { ref } from 'vue'
import { parseEventJson } from '@/services/eventJson'
const props=defineProps({communities:{type:Array,default:()=>[]}})
const emit=defineEmits(['apply'])
const open=ref(false),text=ref(''),error=ref(''),message=ref('')
const example=JSON.stringify({"title":"Los Pitufos: Dreams | En directo","type":"Directo","fecha":"2026-11-01","hora":"18:30","durationMinutes":90,"description":"Una aventura para compartir con la comunidad.","game":{"nameEs":"Los Pitufos: Dreams","nameEn":"The Smurfs: Dreams"}},null,2)
async function paste(){error.value='';try{text.value=await navigator.clipboard.readText()}catch{error.value='Pega el JSON en el cuadro con Ctrl+V o manteniendo pulsado.'}}
function apply(){error.value='';message.value='';try{const value=parseEventJson(text.value,props.communities);emit('apply',value);message.value='Datos aplicados. Revisa el formulario antes de guardar.';open.value=false}catch(e){error.value=e.message}}
</script>
<template>
 <div class="event-json-import">
  <button type="button" :aria-expanded="open" @click="open=!open"><i class="fas fa-paste" aria-hidden="true"></i> Pegar JSON</button>
  <div v-if="open" class="event-json-fields">
   <p>Rellena el formulario sin publicar. La fecha sin zona horaria usa la hora local de tu dispositivo.</p>
   <label>JSON del evento<textarea v-model="text" rows="7" spellcheck="false" :placeholder="example"/></label>
   <div class="event-json-actions"><button type="button" @click="paste">Pegar del portapapeles</button><button type="button" @click="text=example;error=''">Ver ejemplo</button><button type="button" :disabled="!text.trim()" @click="apply">Aplicar al formulario</button></div>
   <small v-if="communities.length">IDs de comunidades: {{ communities.map(c=>c.name+' ('+c.id+')').join(', ') }}</small>
  </div>
  <p v-if="error" class="event-json-error" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
 </div>
</template>
<style scoped>
.event-json-import{margin-bottom:16px;min-width:0;font-size:13px;color:#bfc7dc}.event-json-import button{border:1px solid #a78bfa55;border-radius:10px;padding:9px 12px;background:#7c3aed26;color:#ede9fe;min-height:40px;font-weight:700}.event-json-fields{display:grid;gap:10px;margin-top:12px;padding:14px;border:1px solid #a78bfa30;border-radius:12px}.event-json-fields label{display:grid;gap:8px}.event-json-fields textarea{box-sizing:border-box;display:block;width:100%;min-width:0;background:#080d20;color:#e2e8f0;border:1px solid #a78bfa44;border-radius:10px;padding:12px;font:13px/1.5 monospace;resize:vertical}.event-json-actions{display:flex;gap:8px;flex-wrap:wrap}.event-json-import p{margin:8px 0;line-height:1.5}.event-json-import small{overflow-wrap:anywhere}.event-json-import button:disabled{opacity:.45}.event-json-error{color:#fda4af}
</style>
