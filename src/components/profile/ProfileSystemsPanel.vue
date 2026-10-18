<script setup>
import {ref} from 'vue'
import XboxProfileLink from './XboxProfileLink.vue'
import NintendoPresenceLink from './NintendoPresenceLink.vue'
defineProps({ xboxLink:Object, xboxIdentity:Object, xboxLoading:Boolean, xboxError:String, saveXboxLink:Function, refreshXbox:Function, own: Boolean, url: String, profileUrl: String, identity: Object, loading: Boolean, error: String, saveLink: Function, refresh: Function })
const emit=defineEmits(['busy'])
const busySystems=ref({nintendo:false,xbox:false})
function updateBusy(system,value){busySystems.value[system]=value;emit('busy',Object.values(busySystems.value).some(Boolean))}
</script>
<template>
 <div class="profile-systems-panel">
  <p class="systems-intro">Conecta tus sistemas para compartir tu actividad de juego. Cada vinculación se guarda al confirmar su vista previa.</p>
  <NintendoPresenceLink :own="own" :url="url" :profile-url="profileUrl" :identity="identity" :loading="loading" :error="error" :save-link="saveLink" :refresh="refresh" @busy="updateBusy('nintendo',$event)" />
  <XboxProfileLink :own="own" :link="xboxLink" :identity="xboxIdentity" :loading="xboxLoading" :error="xboxError" :save-link="saveXboxLink" :refresh="refreshXbox" @busy="updateBusy('xbox',$event)" />
  <div class="future-systems"><div v-for="platform in ['Steam']" :key="platform"><i class="fab fa-steam" aria-hidden="true"></i><strong>{{ platform }}</strong><span>Próximamente</span><button type="button" disabled :aria-label="`Conectar ${platform}: próximamente`">No disponible</button></div></div>
 </div>
</template>
<style scoped>
.systems-intro{font-size:13px;line-height:1.65;color:var(--text-secondary,#cbd5e1);margin:0 0 16px}.future-systems{display:grid;grid-template-columns:1fr;gap:12px}.future-systems>div{display:grid;grid-template-columns:24px 1fr;align-items:center;gap:8px;padding:16px;border:1px solid var(--border,#a855f733);border-radius:12px}.future-systems i{font-size:22px;color:var(--text-secondary,#cbd5e1)}.future-systems span{grid-column:2;font-size:12px;color:var(--text-secondary,#cbd5e1)}.future-systems button{grid-column:1/-1;margin-top:5px;padding:8px;border:1px solid var(--border,#a855f733);border-radius:8px;background:var(--surface,#7c3aed15);color:var(--text-secondary,#cbd5e1);opacity:.65;cursor:not-allowed}@media(max-width:520px){.future-systems{grid-template-columns:1fr}}
</style>
