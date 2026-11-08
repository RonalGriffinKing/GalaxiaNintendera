<script setup>
import { computed, onMounted, ref } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { achievements, loadUploadedProfileIcons } from '@/services/profileProgress'
import { ACHIEVEMENT_TYPES } from '@/constants/profile'
import { saveCatalogIcon, deleteCatalogIcon, uploadCatalogImage, saveProfileAchievements } from '@/services/profileIconAdmin'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import ProfileIconCatalogEditor from './ProfileIconCatalogEditor.vue'
const props = defineProps({ userRole: String })
const emit = defineEmits(['loading','ready'])
const tab = ref('icons'), icons = ref([]), items = ref([]), search = ref(''), page = ref(1)
const loading = ref(true), busy = ref(false), uploading = ref(false), error = ref(''), status = ref('')
const editorOpen = ref(false), creating = ref(false), draft = ref({}), editorError = ref('')
const deleteTarget = ref(null), achievementDraft = ref(null)
const filtered = computed(() => icons.value.filter(icon => `${icon.name} ${icon.saga}`.toLocaleLowerCase('es').includes(search.value.toLocaleLowerCase('es'))))
const pages = computed(() => Math.max(1,Math.ceil(filtered.value.length/12)))
const visible = computed(() => filtered.value.slice((Math.min(page.value,pages.value)-1)*12,Math.min(page.value,pages.value)*12))
const errors = {
  'catalog-change-requires-batched-maintenance': 'No se ha aplicado el cambio: con más de 450 usuarios se necesita conservar los derechos por lotes.',
  'icon-in-use': 'Este icono tiene usuarios con derecho a utilizarlo. Puedes ocultarlo o desactivarlo, pero no eliminarlo.',
  'built-in-icon': 'Los iconos integrados se conservan. Puedes ocultarlos o desactivarlos.',
  'progress-not-configured': 'El servicio está desactivado. Su activación requiere configurar y autorizar la publicación.',
  'storage-not-configured': 'Falta configurar el bucket privado del servidor para subir imágenes.',
  'forbidden': 'No tienes permiso de administrador para esta operación.'
}
const messageFor = e => errors[e.message] || 'No se pudo completar la operación. Comprueba los datos y la conexión.'
async function load() {
  if (props.userRole !== 'admin') { loading.value=false;emit('ready','rewards');return }
  emit('loading','rewards')
  try {
    const [catalog, config] = await Promise.all([loadUploadedProfileIcons({includeHidden:true}),getDoc(doc(db,'siteConfig','profileAchievements'))])
    icons.value=catalog
    items.value=config.exists() && Array.isArray(config.data().items) ? config.data().items.map(item=>({...item,type:item.type||'reads',target:Number(item.target??item.reads??1),iconUrl:item.iconUrl||''})) : achievements.map(item=>({...item,iconUrl:''}))
  } catch(e) {error.value=messageFor(e)}
  finally {loading.value=false;emit('ready','rewards')}
}
function editIcon(icon) {
  creating.value=!icon
  draft.value=icon ? {...icon,visible:icon.visible && !icon.archived,active:icon.active && !icon.archived} : {iconId:`custom-${crypto.randomUUID()}`,name:'',src:'',saga:'Especiales',requiredStars:0,order:icons.value.reduce((n,i)=>Math.max(n,i.order),0)+1,active:true,visible:true,special:false,rarity:'normal',effectColor:'#a855f7'}
  editorError.value='';editorOpen.value=true
}
async function upload(file) {
  if (!file || uploading.value || busy.value) return
  uploading.value=true;editorError.value=''
  try {draft.value.src=(await uploadCatalogImage(file)).imageUrl}
  catch(e){editorError.value=e.message.startsWith('Usa ') ? e.message : messageFor(e)}
  finally{uploading.value=false}
}
async function saveIcon() {
  if (busy.value || uploading.value) return
  busy.value=true;editorError.value=''
  try {
    await saveCatalogIcon({...draft.value,iconId:draft.value.iconId||draft.value.id},creating.value)
    editorOpen.value=false;status.value='Icono guardado.';await load()
  } catch(e){editorError.value=messageFor(e)} finally{busy.value=false}
}
async function removeIcon() {
  if (busy.value || !deleteTarget.value) return
  busy.value=true;error.value=''
  try {await deleteCatalogIcon(deleteTarget.value.id);status.value='Icono eliminado del catálogo. No se han borrado imágenes ni datos históricos.';await load()}
  catch(e){error.value=messageFor(e)} finally{busy.value=false;deleteTarget.value=null}
}
function editAchievement(item) {
  achievementDraft.value=item?{...item}:{id:`custom-${crypto.randomUUID()}`,label:'',description:'',type:'reads',target:10,iconUrl:''}
}
async function persistAchievements(next) {
  if (busy.value) return
  busy.value=true;error.value=''
  try {items.value=(await saveProfileAchievements(next)).items;achievementDraft.value=null;status.value='Logros guardados.'}
  catch(e){error.value=messageFor(e)} finally{busy.value=false}
}
function saveAchievement() {
  const item={...achievementDraft.value,reads:achievementDraft.value.target}
  return persistAchievements(items.value.some(i=>i.id===item.id)?items.value.map(i=>i.id===item.id?item:i):[...items.value,item])
}
onMounted(load)
</script>
<template>
  <section v-if="userRole === 'admin'" class="rewards-manager">
    <nav aria-label="Administración de recompensas"><button type="button" :class="{active:tab==='icons'}" @click="tab='icons'">Iconos y requisitos</button><button type="button" :class="{active:tab==='achievements'}" @click="tab='achievements'">Logros</button></nav>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="error='';load()">Reintentar carga</button></p><p v-if="status" role="status">{{ status }}</p>
    <p v-if="loading">Cargando recompensas…</p>
    <template v-else-if="tab==='icons'">
      <header><label><span class="sr-only">Buscar iconos</span><input v-model="search" type="search" placeholder="Buscar iconos" @input="page=1" /></label><button class="primary" type="button" @click="editIcon()">Crear icono</button></header>
      <div class="catalog-grid"><article v-for="icon in visible" :key="icon.id"><ProfileAvatar :src="icon.src" :alt="icon.name" :effect="icon" /><h3>{{ icon.name }}</h3><p>{{ icon.requiredStars }} estrellas · Orden {{ icon.order }}</p><small>{{ icon.local ? 'Integrado' : 'Personalizado' }} · {{ icon.visible && !icon.archived ? 'Visible' : 'Oculto' }} · {{ icon.active && !icon.archived ? 'Activo' : 'Desactivado' }}</small><footer><button type="button" @click="editIcon(icon)">Editar</button><button v-if="!icon.local" type="button" :disabled="busy" @click="deleteTarget=icon">Eliminar</button></footer></article></div>
      <p v-if="!filtered.length">No hay iconos con este filtro.</p>
      <nav v-if="pages>1" aria-label="Páginas del catálogo"><button type="button" :disabled="page<=1" @click="page--">Anterior</button><span>{{ Math.min(page,pages) }} / {{ pages }}</span><button type="button" :disabled="page>=pages" @click="page++">Siguiente</button></nav>
    </template>
    <template v-else>
      <header><h3>Administrar logros</h3><button class="primary" type="button" @click="editAchievement()">Crear logro</button></header>
      <form v-if="achievementDraft" class="achievement-form" @submit.prevent="saveAchievement"><label>Nombre<input v-model.trim="achievementDraft.label" required maxlength="120" /></label><label>Descripción<input v-model.trim="achievementDraft.description" required maxlength="500" /></label><label>Tipo<select v-model="achievementDraft.type"><option v-for="type in ACHIEVEMENT_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option></select></label><label>Objetivo<input v-model.number="achievementDraft.target" type="number" min="1" step="1" required /></label><label>Icono (URL)<input v-model.trim="achievementDraft.iconUrl" /></label><footer><button type="button" :disabled="busy" @click="achievementDraft=null">Cancelar</button><button class="primary" type="submit" :disabled="busy">Guardar logro</button></footer></form>
      <article v-for="item in items" :key="item.id" class="achievement-row"><div><h3>{{ item.label }}</h3><p>{{ item.description }} · Objetivo: {{ item.target ?? item.reads }}</p></div><footer><button type="button" :disabled="busy" @click="editAchievement(item)">Editar</button><button type="button" :disabled="busy || items.length<=1" @click="persistAchievements(items.filter(i=>i.id!==item.id))">Eliminar</button></footer></article>
    </template>
    <ProfileIconCatalogEditor v-model:draft="draft" :open="editorOpen" :creating="creating" :busy="busy" :uploading="uploading" :error="editorError" @close="editorOpen=false" @save="saveIcon" @upload="upload" />
    <section v-if="deleteTarget" role="alertdialog" aria-modal="false" aria-labelledby="delete-icon-title" class="delete-confirm"><h3 id="delete-icon-title">¿Eliminar {{ deleteTarget.name }}?</h3><p>Solo se eliminará si nadie conserva derechos sobre él. Las imágenes y el historial no se borrarán.</p><footer><button type="button" :disabled="busy" @click="deleteTarget=null">Cancelar</button><button type="button" :disabled="busy" @click="removeIcon">Eliminar del catálogo</button></footer></section>
  </section>
  <p v-else role="alert">Solo los administradores pueden gestionar recompensas.</p>
</template>
<style scoped>
.rewards-manager{display:grid;gap:18px;color:var(--text-primary);min-width:0}nav,header,footer{display:flex;gap:10px;align-items:center;flex-wrap:wrap}header{justify-content:space-between}nav{padding-bottom:12px;border-bottom:1px solid var(--border)}input,select,button{font:inherit;min-height:42px;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--admin-bg);color:var(--text-primary);max-width:100%}button{cursor:pointer;font-weight:750}.primary,nav button.active{background:var(--accent,#9333ea);color:white}button:disabled{opacity:.5;cursor:default}h3{font-weight:850;font-size:15px}p,small{color:var(--text-muted);line-height:1.6}small{font-size:11px}.catalog-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.catalog-grid article{display:grid;justify-items:center;gap:10px;padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--admin-surface);text-align:center;min-width:0}.catalog-grid h3{overflow-wrap:anywhere}.catalog-grid :deep(.profile-avatar-ui){--avatar-size:64px}.achievement-row{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:16px;border:1px solid var(--border);border-radius:14px}.achievement-form{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px;border:1px solid var(--border);border-radius:14px}label{display:grid;gap:7px}.delete-confirm{padding:18px;border:1px solid var(--border);border-radius:14px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}:focus-visible{outline:2px solid var(--accent,#a855f7);outline-offset:3px}@media(max-width:900px){.catalog-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){.catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.achievement-form{grid-template-columns:1fr}.achievement-row{align-items:start;flex-direction:column}.catalog-grid article{padding:12px}}
</style>
