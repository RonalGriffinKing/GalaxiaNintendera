<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import PostEditor from '@/components/posts/PostEditor.vue'
import { DEFAULT_POST_CATEGORIES, loadPostCategories } from '@/services/postCategories'
import { homePinnedPosts } from '@/services/homePins'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const post = ref(null)
const categories = ref(DEFAULT_POST_CATEGORIES)
const leaving = ref(false)
let requestId = 0
const editorKey = computed(() => String(route.params.id || 'new') + ':' + String(route.query.mode || 'post'))
const mode = computed(() => post.value?.placement === 'hero' || post.value?.isMainEntry || (!route.params.id && route.query.mode === 'hero') ? 'hero' : 'post')

async function loadEditor() {
 const request = ++requestId
 loading.value=true;error.value='';post.value=null;leaving.value=false
 try {
  const user=auth.currentUser
  if (!user) throw new Error('Inicia sesión para editar publicaciones.')
  const profile=await getDoc(doc(db,'users',user.uid))
  const role=profile.data()?.role
  if (!['admin','publisher'].includes(role)) throw new Error('No tienes permiso para crear publicaciones.')
  const savedCategories=await loadPostCategories().catch(()=>DEFAULT_POST_CATEGORIES)
  let data=null
  if (route.params.id) {
   const snapshot=await getDoc(doc(db,'posts',String(route.params.id)))
   if (!snapshot.exists()) throw new Error('Esta publicación ya no existe.')
   data={...snapshot.data(),id:snapshot.id}
   if (role!=='admin' && data.authorId!==user.uid) throw new Error('No tienes permiso para editar esta publicación.')
   if (data.status==='approved' && typeof data.homePinned!=='boolean') {
    // Preserve the effective automatic pin for older publications, as in the manager.
    const all=await getDocs(collection(db,'posts')).catch(()=>null)
    if (all) data.homePinned=homePinnedPosts(all.docs.map(item=>({...item.data(),id:item.id}))).some(item=>item.id===data.id)
   }
  }
  if (request!==requestId) return
  categories.value=savedCategories;post.value=data
 } catch (cause) {
  if (request===requestId) error.value=cause.message || 'No se pudo abrir el editor. Revisa la conexión e inténtalo de nuevo.'
 } finally {if(request===requestId) loading.value=false}
}
function backToPosts() {
 if (leaving.value) return
 leaving.value=true
 router.push('/admin/posts')
}
watch(()=>[route.params.id,route.query.mode,route.query.json],loadEditor,{immediate:true})
onMounted(()=>document.body.classList.add('post-editor-route-open'))
onUnmounted(()=>{requestId++;document.body.classList.remove('post-editor-route-open')})
</script>

<template>
 <main class="post-editor-route-shell workspace-page">
  <section v-if="loading" class="editor-route-state" role="status"><span class="editor-route-spinner" aria-hidden="true"></span><h1>Abriendo editor…</h1><p>Preparando tu publicación.</p></section>
  <section v-else-if="error" class="editor-route-state" role="alert"><h1>No se pudo abrir el editor</h1><p>{{ error }}</p><div><button type="button" @click="loadEditor">Reintentar</button><button type="button" @click="backToPosts">Volver a publicaciones</button></div></section>
  <PostEditor v-else :key="editorKey" :edit-data="post" :mode="mode" :category-options="categories" :paste-json-on-open="route.query.json==='1'" @close="backToPosts" @created="backToPosts" />
 </main>
</template>

<style scoped>
:global(body.post-editor-route-open){padding-bottom:0}
.post-editor-route-shell{width:100%;min-height:100svh;background:var(--admin-bg,#090c1b);color:var(--text-primary,#fff)}
.editor-route-state{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px;box-sizing:border-box}
.editor-route-state h1{font-size:24px;margin:0}.editor-route-state p{margin:0;max-width:520px;color:var(--text-secondary,#bdc2d9);line-height:1.5}
.editor-route-state>div{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}.editor-route-state button{padding:12px 18px;min-height:44px;border:1px solid #a855f755;border-radius:12px;background:#7024dc;color:#fff;font:inherit;cursor:pointer}
.editor-route-spinner{width:28px;height:28px;border:3px solid #a855f733;border-top-color:#c084fc;border-radius:50%;animation:editor-load .8s linear infinite}
@keyframes editor-load{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.editor-route-spinner{animation:none}}
</style>
