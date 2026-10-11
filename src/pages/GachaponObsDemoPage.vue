<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { verifyObsDemoConnection } from '@/components/profile/gachapon/obsDemoConnection'
import StarsRewardStage from '@/components/profile/gachapon/StarsRewardStage.vue'
import artwork from '@/iconos/iconosZelda/01.png'
const authorized=ref(false),busy=ref(false),reward=ref(null),message=ref('Introduce tu clave temporal.'),password=ref(''),checking=ref(false)
const demo={id:'obs-demo',name:'Demostración',saga:'Zelda',rarity:'normal',src:artwork}
let alive=true
function preview(){reward.value=null;busy.value=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) reveal()}
function reveal(){if(!busy.value)return;busy.value=false;reward.value=demo}
async function connect(){
 checking.value=true
 try{const token=new URLSearchParams(window.location.hash.slice(1)).get('connection')||'';await verifyObsDemoConnection(token,password.value);if(alive){authorized.value=true;password.value=''}}catch(error){if(alive)message.value=error.message}finally{if(alive)checking.value=false}
}
onMounted(()=>{document.documentElement.classList.add('gachapon-obs-mode')})
onUnmounted(()=>{alive=false;document.documentElement.classList.remove('gachapon-obs-mode')})
</script>
<template><main class="obs-demo"><template v-if="authorized"><div class="obs-scene"><StarsRewardStage :busy="busy" :reward="reward" @complete="reveal" @hidden="busy=false" /></div><button type="button" :disabled="busy" @click="preview">Probar animación</button><p>Demostración OBS · Sin canjes ni premios reales</p></template><form v-else @submit.prevent="connect"><label>Clave temporal OBS<input v-model="password" type="password" autocomplete="off" minlength="4" maxlength="128" required /></label><button type="submit" :disabled="checking">{{ checking ? 'Comprobando...' : 'Conectar' }}</button><p role="status">{{ message }}</p></form></main></template>
<style>.obs-demo form{padding:24px;background:#17112c;border-radius:16px}.obs-demo label{display:grid;gap:12px;margin-bottom:12px}.obs-demo input{padding:12px;border-radius:8px;background:#291f3e;color:white;border:1px solid #a879ff}.gachapon-obs-mode,.gachapon-obs-mode body,.gachapon-obs-mode #app{background:transparent!important;min-height:0!important;}.gachapon-obs-mode #app{min-height:100dvh!important;display:grid;place-items:center;padding:16px;box-sizing:border-box}.obs-demo{color:white;width:min(100%,580px);margin:0;font-family:system-ui;text-align:center}.obs-scene{height:clamp(350px,65dvh,430px);border-radius:18px;overflow:hidden}.obs-demo button{padding:12px 20px;border:0;border-radius:12px;background:#7734bc;color:white;cursor:pointer}.obs-demo p{font-size:12px;background:#17112c;padding:8px}</style>
