<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import StarsRewardStage from '@/components/profile/gachapon/StarsRewardStage.vue'
import artwork from '@/iconos/iconosZelda/01.png'
const authorized=ref(false),busy=ref(false),reward=ref(null),message=ref('Validando conexión…')
const demo={id:'obs-demo',name:'Demostración',saga:'Zelda',rarity:'normal',src:artwork}
let alive=true
function preview(){reward.value=null;busy.value=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) reveal()}
function reveal(){if(!busy.value)return;busy.value=false;reward.value=demo}
onMounted(async()=>{
 document.documentElement.classList.add('gachapon-obs-mode')
 const key=new URLSearchParams(window.location.hash.slice(1)).get('key')||''
 history.replaceState(null,'',window.location.pathname)
 try {const result=await fetch('/.netlify/functions/gachapon-obs-auth',{method:'POST',headers:{Authorization:'Bearer '+key}});if(!result.ok)throw Error(result.status===503?'Conexión pendiente de configurar en Netlify.':'Clave de conexión no válida.');if(alive)authorized.value=true}catch(error){if(alive)message.value=error.message}
})
onUnmounted(()=>{alive=false;document.documentElement.classList.remove('gachapon-obs-mode')})
</script>
<template><main class="obs-demo"><template v-if="authorized"><div class="obs-scene"><StarsRewardStage :busy="busy" :reward="reward" @complete="reveal" @hidden="busy=false" /></div><button type="button" :disabled="busy" @click="preview">Probar animación</button><p>Demostración OBS · Sin canjes ni premios reales</p></template><p v-else role="status">{{ message }}</p></main></template>
<style>.gachapon-obs-mode,.gachapon-obs-mode body,.gachapon-obs-mode #app{background:transparent!important;min-height:0!important;}.obs-demo{color:white;width:min(100%,580px);margin:auto;font-family:system-ui;text-align:center}.obs-scene{height:430px;border-radius:18px;overflow:hidden}.obs-demo button{padding:12px 20px;border:0;border-radius:12px;background:#7734bc;color:white;cursor:pointer}.obs-demo p{font-size:12px;background:#17112c;padding:8px}</style>
