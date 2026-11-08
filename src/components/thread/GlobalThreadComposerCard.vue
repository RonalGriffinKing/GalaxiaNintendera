<script setup>
import { communityPath } from '@/services/communityRoutes'
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { OFFICIAL_COMMUNITY_ID } from '@/constants/community'
import { resolveAssetUrl, defaultLogoUrl } from '@/constants/assets'
import ContentLoading from '@/components/shared/ContentLoading.vue'
defineProps({userRole:{type:String,default:'user'},initialCommunityId:{type:String,default:''}})
const emit=defineEmits(['close','published'])
const router=useRouter(),communities=ref([]),search=ref(''),loading=ref(true),error=ref('')
const filtered=computed(()=>communities.value.filter(c=>String(c.name||'').toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))
async function load(){
 loading.value=true;error.value=''
 try{
  const user=auth.currentUser
  if(!user){error.value='Inicia sesión para crear un hilo.';return}
  const [all,joined,profile]=await Promise.all([getDocs(collection(db,'communities')),getDocs(collection(db,'users',user.uid,'communities')),getDoc(doc(db,'users',user.uid))])
  const data=profile.exists()?profile.data():{},ids=new Set(joined.docs.map(d=>d.id)),canManage=['admin','publisher'].includes(data.role)
  if(data.isBlocked){error.value='Tu cuenta no puede publicar hilos.';return}
  communities.value=all.docs.map(d=>({...d.data(),id:d.id})).filter(c=>c.id===OFFICIAL_COMMUNITY_ID||c.isOfficial?canManage:ids.has(c.id))
 }catch{error.value='No se pudieron cargar tus comunidades. Vuelve a intentarlo.'}finally{loading.value=false}
}
async function choose(community){await router.push({path:communityPath(community,communities.value),query:{create:'thread'}});emit('close')}
onMounted(load)
</script>
<template>
 <article class="thread-destination" role="dialog" aria-modal="true" aria-labelledby="thread-destination-title">
  <header><h2 id="thread-destination-title">¿Dónde quieres crear el hilo?</h2><button type="button" aria-label="Cerrar" @click="emit('close')">✕</button></header>
  <p>Elige una de tus comunidades. Escribirás el hilo dentro de ella.</p>
  <ContentLoading v-if="loading" variant="inline" />
  <div v-else-if="error" role="alert"><p>{{ error }}</p><button type="button" @click="load">Reintentar</button></div>
  <template v-else><input v-model="search" type="search" placeholder="Buscar entre mis comunidades" aria-label="Buscar comunidad" autofocus /><div class="destination-list"><button v-for="community in filtered" :key="community.id" type="button" @click="choose(community)"><img :src="resolveAssetUrl(community.iconUrl,defaultLogoUrl)" alt="" /><span><strong>{{ community.name }}</strong><small>{{ community.isOfficial ? 'Comunidad oficial' : 'Miembro' }}</small></span><span aria-hidden="true">→</span></button></div><p v-if="!filtered.length">{{ communities.length ? 'No hay coincidencias.' : 'Únete a una comunidad para crear hilos.' }}</p><button type="button" @click="router.push('/comunidades');emit('close')">Explorar comunidades</button></template>
 </article>
</template>
<style scoped>
.thread-destination{width:min(600px,100%);max-height:calc(var(--global-thread-vvh,100dvh) - 32px);overflow-y:auto;padding:24px;box-sizing:border-box;border:1px solid #a78bfa55;border-radius:24px;background:#101025;color:#f6f1ff}.thread-destination header{display:flex;align-items:center;justify-content:space-between;gap:16px}.thread-destination h2{font-size:22px;font-weight:750;margin:0}.thread-destination p{font-size:14px;line-height:1.5;color:#b8b3cb;margin:16px 0}.thread-destination button{cursor:pointer;background:#2d2045;color:#eee4ff;border:1px solid #a78bfa40;border-radius:12px;padding:10px 14px;font-weight:650}.thread-destination input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #a78bfa50;border-radius:12px;background:#080c1b;color:#fff;margin-bottom:14px}.destination-list{display:grid;gap:10px;margin-bottom:16px}.destination-list button{display:flex;align-items:center;gap:12px;text-align:left;width:100%;background:#18142e;padding:14px}.destination-list img{width:42px;height:42px;border-radius:50%;object-fit:cover}.destination-list button>span:first-of-type{flex:1;min-width:0}.destination-list strong,.destination-list small{display:block}.destination-list small{color:#b9a9d0;font-size:12px;margin-top:5px}.thread-destination :is(button,input):focus-visible{outline:2px solid #d8b4fe;outline-offset:3px}@media(max-width:600px){.thread-destination{padding:18px;max-height:calc(var(--global-thread-vvh,100dvh) - 24px)}.thread-destination h2{font-size:19px}}
</style>
