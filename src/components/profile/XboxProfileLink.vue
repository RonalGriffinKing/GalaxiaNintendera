<script setup>
import {ref,watch,onUnmounted} from 'vue'
import {fetchXboxProfile} from '@/services/xboxProfileClient'
const props=defineProps({own:Boolean,link:Object,identity:Object,loading:Boolean,error:String,saveLink:Function,refresh:Function})
const emit=defineEmits(['busy'])
const editing=ref(false),draft=ref(''),preview=ref(null),busy=ref(false),notice=ref('')
let requestId=0
watch(busy,value=>emit('busy',value),{flush:'sync'})
watch(draft,()=>{requestId++;preview.value=null;notice.value=''})
watch(()=>props.link,()=>{requestId++;editing.value=false;preview.value=null})
onUnmounted(()=>{requestId++;emit('busy',false)})
function edit(){draft.value=props.link?.gamertag||'';preview.value=null;notice.value='';editing.value=true}
async function inspect(){const id=++requestId;busy.value=true;notice.value='';preview.value=null;try{const value=await fetchXboxProfile({gamertag:draft.value});if(id===requestId)preview.value=value}catch(error){if(id===requestId)notice.value=error.message}finally{busy.value=false}}
async function save(value){busy.value=true;notice.value='';try{await props.saveLink(value);editing.value=false;preview.value=null;notice.value=value?'Xbox vinculado.':'Vinculación eliminada.'}catch{notice.value='No se pudo guardar Xbox. Vuelve a intentarlo.'}finally{busy.value=false}}
const state=identity=>({online:'En línea',offline:'Sin conexión',unknown:'Estado no disponible'}[identity?.presence?.state]||'Estado no disponible')
</script>
<template>
 <section class="xbox-link" :aria-busy="busy||loading">
  <header><strong><i class="fab fa-xbox" aria-hidden="true"></i> Xbox</strong><span>{{link?'Perfil público vinculado':'Sin vincular'}}</span></header>
  <p class="xbox-explanation">Comparte los datos públicos de tu gamertag. La vinculación no verifica la propiedad de la cuenta.</p>
  <p v-if="loading" role="status">Consultando Xbox…</p><p v-if="error" role="status">{{error}}</p>
  <div v-if="identity&&!editing" class="xbox-account"><img v-if="identity.avatarUrl" :src="identity.avatarUrl" alt=""/><div><strong>{{identity.displayName}}</strong><small>{{state(identity)}}<template v-if="identity.gamerscore!==null"> · {{identity.gamerscore}} G</template></small></div></div>
  <p v-if="identity?.unavailable?.length" class="xbox-explanation">Parte de la actividad no está disponible por privacidad o por una limitación temporal del servicio.</p>
  <div class="xbox-actions"><button v-if="link&&!editing" type="button" :disabled="busy||loading" @click="refresh?.()">Actualizar datos</button><button v-if="own&&!editing" type="button" class="xbox-connect" :disabled="busy" @click="edit">{{link?'Cambiar gamertag':'Conectar Xbox'}}</button><button v-if="own&&link&&!editing" type="button" class="xbox-remove" :disabled="busy" @click="save(null)">Eliminar vinculación</button></div>
  <form v-if="own&&editing" @submit.prevent="inspect"><label for="xbox-gamertag">Gamertag</label><input id="xbox-gamertag" v-model="draft" :disabled="busy" required maxlength="32" autocomplete="off" placeholder="Tu gamertag, incluido #sufijo" aria-describedby="xbox-consent"/><p id="xbox-consent">Al confirmar, este perfil y la actividad que Xbox permita consultar serán visibles en Galaxia Nintendera. No necesitas introducir contraseñas ni claves API.</p><div class="xbox-actions"><button class="xbox-connect" type="submit" :disabled="busy">{{busy?'Consultando…':'Ver vista previa'}}</button><button type="button" :disabled="busy" @click="editing=false;preview=null">Cancelar</button></div>
   <div v-if="preview" class="xbox-confirm"><div class="xbox-account"><img v-if="preview.avatarUrl" :src="preview.avatarUrl" alt=""/><div><strong>{{preview.displayName}}</strong><small>{{state(preview)}}</small></div></div><p>Comprueba que es el gamertag que quieres compartir.</p><button type="button" class="xbox-connect" :disabled="busy" @click="save({xuid:preview.xuid,gamertag:preview.displayName})">Confirmar vinculación pública</button></div>
  </form><p v-if="notice" role="status">{{notice}}</p><p class="xbox-explanation">Los datos pueden tardar unos minutos en actualizarse. Solo se muestran los que permite compartir Xbox.</p>
 </section>
</template>
<style scoped>
.xbox-link{border:1px solid var(--border,#a855f733);border-radius:14px;padding:20px;margin-bottom:14px;font-family:var(--font-family-base,'Roboto',system-ui,sans-serif);font-size:13px;font-weight:400;line-height:1.6;background:linear-gradient(130deg,#107c1008,transparent);min-width:0}.xbox-link header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.xbox-link strong{font-size:15px;font-weight:600}.xbox-link header i{color:#36b358;margin-right:5px}.xbox-link header>span{font-size:11px;color:var(--text-secondary,#cbd5e1)}.xbox-explanation,.xbox-link form p{font-size:12px;color:var(--text-secondary,#cbd5e1)}.xbox-account{display:flex;align-items:center;gap:12px;margin:16px 0}.xbox-account img{width:48px;height:48px;border-radius:50%;object-fit:cover}.xbox-account small{display:block;font-size:12px;color:var(--text-secondary,#cbd5e1)}.xbox-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.xbox-link button,.xbox-link input{font:inherit;border:1px solid var(--border,#a855f744);border-radius:9px;color:inherit;background:var(--surface,#7c3aed10);padding:9px 12px}.xbox-link button{font-size:12px;font-weight:500;cursor:pointer}.xbox-link .xbox-connect{background:var(--accent,#7c3aed);color:#fff;border-color:transparent}.xbox-link .xbox-remove{background:transparent;color:#e891a5;border-color:transparent;margin-left:auto}.xbox-link button:disabled{opacity:.5;cursor:wait}.xbox-link label{display:block;font-size:13px;margin:16px 0 8px}.xbox-link input{width:100%;box-sizing:border-box;min-width:0}.xbox-confirm{border-top:1px solid var(--border,#a855f733);padding-top:8px;margin-top:16px}.xbox-link :focus-visible{outline:2px solid var(--accent,#c084fc);outline-offset:3px}@media(max-width:520px){.xbox-link{padding:16px}.xbox-link .xbox-remove{margin-left:0;width:100%;text-align:left}}
</style>
