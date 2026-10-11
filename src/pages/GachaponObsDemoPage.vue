<script setup>
import { onMounted,onUnmounted,ref } from 'vue'
import { doc,onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import { createRewardSound } from '@/components/profile/gachapon/rewardSound'
import StarsRewardStage from '@/components/profile/gachapon/StarsRewardStage.vue'
const busy=ref(false),reward=ref(null),pending=ref(null),mode=ref('normal'),visible=ref(false),error=ref('')
const sound=createRewardSound(),audioReady=ref(false)
async function enableSound(){audioReady.value=await sound.prime()}
function onHidden(){if(document.hidden)sound.stop()}
let unsubscribe,timer,lastId=''
function reveal(){if(!busy.value)return;busy.value=false;reward.value=pending.value;sound.play(mode.value==='epic');clearTimeout(timer);timer=setTimeout(()=>{visible.value=false;reward.value=null},10000)}
onMounted(()=>{
 document.documentElement.classList.add('gachapon-obs-mode')
 document.addEventListener('visibilitychange',onHidden)
 void enableSound()
 const params=new URLSearchParams(location.search),owner=params.get('owner'),scene=params.get('scene')
 if(!owner||!scene||owner.includes('/')||scene.includes('/')){error.value='Genera el enlace desde Configuracion OBS de tu perfil.';return}
 unsubscribe=onSnapshot(doc(db,'overlays',owner,'items',scene),snapshot=>{
 const data=snapshot.data();if(data?.kind!=='gachapon-mirror')return
 const event=data.gachaponEvent;if(!event||event.id===lastId||!event.icon?.src)return
 lastId=event.id;if(Date.now()-event.createdAt>20000)return
 clearTimeout(timer);mode.value=event.mode==='epic'?'epic':'normal';pending.value=event.icon;reward.value=null;visible.value=true;busy.value=true
 const activeId=event.id
 void sound.prime().then(ready=>{audioReady.value=ready;if(ready&&!document.hidden&&activeId===lastId){if(busy.value)sound.spin(mode.value==='epic');else if(reward.value)sound.play(mode.value==='epic')}})
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)reveal()
 },()=>{error.value='No se pudo conectar al espejo OBS.'})
})
onUnmounted(()=>{unsubscribe?.();clearTimeout(timer);sound.dispose();document.removeEventListener('visibilitychange',onHidden);document.documentElement.classList.remove('gachapon-obs-mode')})
</script>
<template>
 <main class="obs-mirror">
  <section v-if="visible" class="obs-panel" :class="{ epic: mode === 'epic' }" aria-label="Espejo del Gachapon Estelar">
   <button v-if="!audioReady" class="obs-enable-audio" type="button" @click="enableSound">Activar sonido</button>
   <header><span>Entre las estrellas</span><h1>Gachapon Estelar</h1></header>
   <div :key="pending?.src + lastId" class="obs-scene"><StarsRewardStage :busy="busy" :reward="reward" :mode="mode" @complete="reveal" /></div>
   <div class="obs-options" role="group" aria-label="Opcion elegida desde la web">
    <button type="button" disabled :aria-pressed="mode === 'normal'" :class="{ selected:mode === 'normal' }">Normal · 20 ⭐</button>
    <button type="button" disabled class="epic-option" :aria-pressed="mode === 'epic'" :class="{ selected:mode === 'epic' }">Épico · 50 ⭐</button>
   </div>
  </section>
  <p v-if="error" class="obs-error" role="status">{{ error }}</p>
 </main>
</template>
<style>
.gachapon-obs-mode,.gachapon-obs-mode body,.gachapon-obs-mode #app{background:transparent!important;min-height:100dvh!important;margin:0}
.gachapon-obs-mode #app{display:grid;place-items:center}
</style>
<style scoped>
.obs-mirror{width:min(100%,580px);color:white;font-family:system-ui}
.obs-panel{padding:18px;box-sizing:border-box;border-radius:22px;border:1px solid #a879ff70;background:radial-gradient(ellipse at 50% 30%,#4b237855,transparent 70%),#100d20;--glow:#c084fc}
.obs-panel.epic{border-color:#f6c86e80;--glow:#f6c86e}
header{text-align:left;margin-bottom:12px}header span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#cab6e9}h1{margin:5px 0 0;font-size:23px;line-height:1.2}
.obs-scene{height:360px;border-radius:14px;overflow:hidden}
.obs-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.obs-options button{min-height:48px;padding:10px;border:1px solid #d6afff55;border-radius:12px;background:linear-gradient(120deg,#702dd5,#a9349c);color:white;font-size:13px;font-weight:700;opacity:.45}
.obs-options .epic-option{background:linear-gradient(120deg,#6d3297,#986420);border-color:#e9bb5d80;color:#fff3cf}
.obs-options button.selected{opacity:1;outline:2px solid #f0d4ff;outline-offset:2px;box-shadow:0 0 18px #a879ff40}
.obs-panel.epic .selected{outline-color:#f6d889;box-shadow:0 0 18px #f6c86e40}
.obs-enable-audio{float:right;padding:8px;border:1px solid #c084fc;border-radius:8px;background:#271c37;color:white;cursor:pointer}
.obs-error{background:#17112c;padding:16px}
@media(max-width:400px){.obs-panel{padding:12px}h1{font-size:20px}.obs-scene{height:350px}}
</style>
