<script setup>
import { onMounted,onUnmounted,ref } from 'vue'
import { doc,onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import StarsRewardStage from '@/components/profile/gachapon/StarsRewardStage.vue'
const busy=ref(false),reward=ref(null),pending=ref(null),mode=ref('normal'),visible=ref(false),error=ref('')
let unsubscribe,timer,lastId=''
function reveal(){if(!busy.value)return;busy.value=false;reward.value=pending.value;clearTimeout(timer);timer=setTimeout(()=>{visible.value=false;reward.value=null},10000)}
onMounted(()=>{
 document.documentElement.classList.add('gachapon-obs-mode')
 const params=new URLSearchParams(location.search),owner=params.get('owner'),scene=params.get('scene')
 if(!owner||!scene||owner.includes('/')||scene.includes('/')){error.value='Genera el enlace desde Configuracion OBS de tu perfil.';return}
 unsubscribe=onSnapshot(doc(db,'overlays',owner,'items',scene),snapshot=>{
 const data=snapshot.data();if(data?.kind!=='gachapon-mirror')return
 const event=data.gachaponEvent;if(!event||event.id===lastId||!event.icon?.src)return
 lastId=event.id;if(Date.now()-event.createdAt>20000)return
 clearTimeout(timer);mode.value=event.mode==='epic'?'epic':'normal';pending.value=event.icon;reward.value=null;visible.value=true;busy.value=true
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)reveal()
 },()=>{error.value='No se pudo conectar al espejo OBS.'})
})
onUnmounted(()=>{unsubscribe?.();clearTimeout(timer);document.documentElement.classList.remove('gachapon-obs-mode')})
</script>
<template><main class="obs-mirror"><div v-if="visible" :key="pending?.src + lastId" class="obs-scene"><StarsRewardStage :busy="busy" :reward="reward" :mode="mode" @complete="reveal" /></div><p v-if="error" role="status">{{ error }}</p></main></template>
<style>.gachapon-obs-mode,.gachapon-obs-mode body,.gachapon-obs-mode #app{background:transparent!important;min-height:100dvh!important;margin:0}.gachapon-obs-mode #app{display:grid;place-items:center}.obs-mirror{width:min(100%,580px);color:white;font-family:system-ui}.obs-scene{height:430px;border-radius:18px;overflow:hidden}.obs-mirror p{background:#17112c;padding:16px}</style>
