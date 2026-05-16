<template>
  <div class="post-manager">
    <div v-if="!embedded" class="panel-header">
      <div>
        <span class="post-kicker">Galaxia Nintendera</span>
        <h1 class="panel-title">Gestion de posts</h1>
        <p class="panel-subtitle">Crea, edita y revisa publicaciones.</p>
      </div>

      <button v-if="canPublish" class="post-create-btn" type="button" @click="openCreate">
        <i class="fas fa-plus"></i>
        Crear nuevo post
      </button>
    </div>

    <div class="post-toolbar">
      <div class="post-tabs">
        <button
          v-for="opt in filterOptions"
          :key="opt"
          :class="{ active: filter === opt }"
          type="button"
          @click="filter = opt"
        >
          {{ tabLabel(opt) }}
        </button>
      </div>

      <div class="post-filters">
        <button v-if="isAdmin" class="category-manage-btn" type="button" @click="showCategoryManager = true">
          <i class="fas fa-tags"></i>
          Categorias
        </button>
        <select v-model="categoryFilter">
          <option value="all">Todas las categorias</option>
          <option v-for="category in managedCategories" :key="category" :value="category">{{ category }}</option>
        </select>
        <select v-model="sortMode">
          <option value="recent">Mas recientes</option>
          <option value="oldest">Mas antiguos</option>
        </select>
      </div>
    </div>

    <div class="post-table-wrap">
      <table class="post-table">
        <thead>
          <tr>
            <th>Titulo</th>
            <th>Categoria</th>
            <th>Estado</th>
            <th>Autor</th>
            <th>Actualizado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in filteredPosts" :key="post.id">
            <td>
              <div class="post-title-cell">
                <img v-if="post.image" :src="post.image" alt="" />
                <span v-else><i class="far fa-image"></i></span>
                <strong>{{ post.title || 'Sin titulo' }}</strong>
              </div>
            </td>
            <td>
              <div class="category-list">
                <span v-for="category in postCategories(post)" :key="category" class="category-pill">{{ category }}</span>
              </div>
            </td>
            <td><span :class="['state-pill', post.status]">{{ statusLabel(post.status) }}</span></td>
            <td>{{ post.authorName || 'Redactor' }}</td>
            <td>{{ formatUpdated(post.updatedAt || post.createdAt) }}</td>
            <td>
              <div class="post-actions">
                <button v-if="isAdmin && post.status === 'pending'" class="mini-btn-xs btn-success" title="Aprobar" @click="triggerApprove(post)">
                  <i class="fas fa-check"></i>
                </button>
                <button v-if="canEditPost(post)" class="mini-btn-xs btn-edit" title="Editar" @click="editPost(post)">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="post-share-btn" type="button" title="Generar imagen social" @click="openSocialShare(post.id)">
                  <i class="fas fa-wand-magic-sparkles"></i>
                  <span>Generar imagen social</span>
                </button>
                <button v-if="canDeletePost(post)" class="mini-btn-xs btn-danger" title="Eliminar" @click="triggerDelete(post.id)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="post-mobile-list">
      <article v-for="post in filteredPosts" :key="post.id" class="post-mobile-card">
        <img v-if="post.image" :src="post.image" alt="" />
        <span v-else><i class="far fa-image"></i></span>
        <div>
          <strong>{{ post.title || 'Sin titulo' }}</strong>
          <p><span :class="['state-pill', post.status]">{{ statusLabel(post.status) }}</span> {{ formatUpdated(post.updatedAt || post.createdAt) }}</p>
        </div>
        <div class="post-mobile-actions">
          <button v-if="isAdmin && post.status === 'pending'" class="approve-mobile" type="button" title="Aprobar" @click="triggerApprove(post)">
            <i class="fas fa-check"></i>
          </button>
          <button v-if="canEditPost(post)" type="button" title="Editar" @click="editPost(post)">
            <i class="fas fa-pen"></i>
          </button>
          <button type="button" title="Generar imagen social" @click="openSocialShare(post.id)">
            <i class="fas fa-wand-magic-sparkles"></i>
          </button>
          <button v-if="canDeletePost(post)" class="delete-mobile" type="button" title="Eliminar" @click="triggerDelete(post.id)">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </article>
    </div>

    <Transition name="fade">
      <div v-if="confirmDialog.show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="confirmDialog.show = false"></div>
        <div class="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl text-center">
          <div :class="['w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg', confirmDialog.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600']">
            <i :class="confirmDialog.type === 'delete' ? 'fas fa-trash-alt' : 'fas fa-rocket'"></i>
          </div>
          <h2 class="text-lg font-black text-gray-800 mb-1">{{ confirmDialog.title }}</h2>
          <p class="text-gray-500 mb-6 text-xs">{{ confirmDialog.message }}</p>
          <div class="flex gap-2">
            <button class="flex-1 py-2 text-xs rounded-xl font-bold bg-gray-100 text-gray-500" @click="confirmDialog.show = false">Cancelar</button>
            <button :class="['flex-1 py-2 text-xs rounded-xl font-bold text-white shadow-lg transition-all', confirmDialog.type === 'delete' ? 'bg-red-500 shadow-red-100' : 'bg-green-500 shadow-green-100']" @click="confirmDialog.action">Confirmar</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showCategoryManager" class="category-modal">
        <button class="category-backdrop" type="button" @click="closeCategoryManager"></button>
        <section class="category-panel">
          <div class="category-panel-head">
            <div>
              <h2>Categorias</h2>
              <p>El orden aqui sera el orden de filtros en noticias y al crear posts.</p>
            </div>
            <button class="panel-close-btn" type="button" @click="closeCategoryManager">
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <form class="category-add-row" @submit.prevent="addCategory">
            <input v-model="categoryDraft" placeholder="Nueva categoria" />
            <button type="submit" :disabled="!categoryDraft.trim() || savingCategories">
              <i class="fas fa-plus"></i>
              Agregar
            </button>
          </form>

          <div class="category-manage-list">
            <article v-for="(category, index) in managedCategories" :key="category" class="category-manage-item">
              <span>{{ index + 1 }}</span>
              <strong>{{ category }}</strong>
              <div>
                <button type="button" :disabled="index === 0 || savingCategories" title="Subir" @click="moveCategory(index, -1)">
                  <i class="fas fa-arrow-up"></i>
                </button>
                <button type="button" :disabled="index === managedCategories.length - 1 || savingCategories" title="Bajar" @click="moveCategory(index, 1)">
                  <i class="fas fa-arrow-down"></i>
                </button>
                <button type="button" :disabled="savingCategories" class="danger" title="Borrar" @click="deleteCategory(category)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show" class="app-toast">
          <div :class="['app-toast-icon', toast.type]">
            <i :class="toast.type === 'delete' ? 'fas fa-trash-alt' : 'fas fa-check'"></i>
          </div>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

    <PostEditor
      v-if="showEditor"
      :edit-data="editingPost"
      :mode="editorMode"
      :paste-json-on-open="pasteJsonOnOpen"
      :category-options="managedCategories"
      @close="closeEditor"
      @created="loadPosts"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, deleteDoc, deleteField, doc, getDocs, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import PostEditor from '@/features/admin/components/PostEditor.vue'
import { notifyNewPost } from '@/services/notifications'
import { DEFAULT_POST_CATEGORIES, loadPostCategories, postCategoryLabels, postMatchesCategory, savePostCategories } from '@/services/postCategories'

const route = useRoute()
const router = useRouter()
const props = defineProps({
  userRole: {
    type: String,
    default: 'user'
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

const posts = ref([])
const filter = ref('all')
const categoryFilter = ref('all')
const sortMode = ref('recent')
const showEditor = ref(false)
const showCategoryManager = ref(false)
const editingPost = ref(null)
const editorMode = ref('post')
const pasteJsonOnOpen = ref(false)
const managedCategories = ref(DEFAULT_POST_CATEGORIES)
const categoryDraft = ref('')
const savingCategories = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
const confirmDialog = ref({ show: false, id: null, type: '', title: '', message: '', action: null })
const isAdmin = computed(() => props.userRole === 'admin')
const canPublish = computed(() => ['admin', 'publisher'].includes(props.userRole))
const filterOptions = computed(() => isAdmin.value ? ['all', 'pending', 'approved', 'mine'] : ['mine', 'pending', 'approved'])

const loadPosts = async () => {
  const snap = await getDocs(collection(db, 'posts'))
  posts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

const loadCategories = async () => {
  const saved = await loadPostCategories()
  managedCategories.value = saved
}

onMounted(async () => {
  await loadPosts()
  await loadCategories()
  if (route.query.create === 'post') openCreate()
  if (route.query.create === 'post-json') openJsonCreate()
  if (route.query.create === 'hero') openHeroCreate()
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

const filteredPosts = computed(() => {
  const user = auth.currentUser
  let visiblePosts = isAdmin.value ? posts.value : posts.value.filter(p => p.authorId === user?.uid)

  if (filter.value === 'mine') visiblePosts = visiblePosts.filter(p => p.authorId === user?.uid)
  if (['pending', 'approved'].includes(filter.value)) visiblePosts = visiblePosts.filter(p => p.status === filter.value)
  if (categoryFilter.value !== 'all') visiblePosts = visiblePosts.filter(p => postMatchesCategory(p, categoryFilter.value))

  return [...visiblePosts].sort((a, b) => {
    const left = Number(a.updatedAt || a.createdAt || 0)
    const right = Number(b.updatedAt || b.createdAt || 0)
    return sortMode.value === 'recent' ? right - left : left - right
  })
})

const tabLabel = (value) => ({
  all: 'Todos',
  pending: 'Pendientes',
  approved: 'Aprobados',
  mine: 'Mios'
}[value] || value)

const statusLabel = (value = 'pending') => ({
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado'
}[value] || value)

const formatUpdated = (value) => {
  if (!value) return 'Sin fecha'
  const time = typeof value === 'number' ? value : value?.toDate?.().getTime?.() || new Date(value).getTime()
  const days = Math.floor((Date.now() - time) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} dias`
}

watch(isAdmin, (admin) => {
  if (admin && !filterOptions.value.includes(filter.value)) filter.value = 'all'
  if (!admin && filter.value === 'all') filter.value = 'mine'
}, { immediate: true })

watch(() => route.query.create, (createTarget) => {
  if (createTarget === 'post') openCreate()
  if (createTarget === 'post-json') openJsonCreate()
  if (createTarget === 'hero') openHeroCreate()
})

watch([showEditor, () => confirmDialog.value.show, showCategoryManager], ([isEditorOpen, isConfirmOpen, isCategoryOpen]) => {
  document.body.style.overflow = isEditorOpen || isConfirmOpen || isCategoryOpen ? 'hidden' : ''
})

const openCreate = () => {
  if (!canPublish.value) return
  editingPost.value = null
  editorMode.value = 'post'
  pasteJsonOnOpen.value = false
  showEditor.value = true
  if (route.query.create === 'post') {
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
}

const openJsonCreate = () => {
  if (!canPublish.value) return
  editingPost.value = null
  editorMode.value = 'post'
  pasteJsonOnOpen.value = true
  showEditor.value = true
  if (route.query.create === 'post-json') {
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
}

const openHeroCreate = () => {
  if (!canPublish.value) return
  editingPost.value = null
  editorMode.value = 'hero'
  pasteJsonOnOpen.value = false
  showEditor.value = true
  if (route.query.create === 'hero') {
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
}

const editPost = (post) => {
  if (!canEditPost(post)) return
  editingPost.value = post
  editorMode.value = post.placement === 'hero' ? 'hero' : 'post'
  pasteJsonOnOpen.value = false
  showEditor.value = true
}

const openSocialShare = (id) => {
  router.push(`/admin/post-share/${id}`)
}

const closeEditor = () => {
  showEditor.value = false
  editingPost.value = null
  editorMode.value = 'post'
  pasteJsonOnOpen.value = false
}

const canEditPost = (post) => {
  const user = auth.currentUser
  return isAdmin.value || post.authorId === user?.uid
}

const canDeletePost = (post) => {
  const user = auth.currentUser
  return isAdmin.value || post.authorId === user?.uid
}

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => { toast.value.show = false }, 2500)
}

const postCategories = (post) => postCategoryLabels(post).length ? postCategoryLabels(post) : ['General']

const persistCategories = async (items) => {
  savingCategories.value = true
  try {
    managedCategories.value = await savePostCategories(items)
    showToast('Categorias guardadas')
  } catch (error) {
    console.error(error)
    showToast('No se pudieron guardar categorias', 'delete')
  } finally {
    savingCategories.value = false
  }
}

const addCategory = async () => {
  const name = categoryDraft.value.trim()
  if (!name) return
  categoryDraft.value = ''
  await persistCategories([...managedCategories.value, name])
}

const moveCategory = async (index, direction) => {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= managedCategories.value.length) return
  const next = [...managedCategories.value]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  await persistCategories(next)
}

const deleteCategory = async (category) => {
  await persistCategories(managedCategories.value.filter(item => item !== category))
  if (categoryFilter.value === category) categoryFilter.value = 'all'
}

const closeCategoryManager = () => {
  if (savingCategories.value) return
  showCategoryManager.value = false
}

const triggerApprove = (post) => {
  if (!isAdmin.value) return
  confirmDialog.value = {
    show: true,
    type: 'approve',
    title: 'Publicar post?',
    message: 'Se mostrara en la Galaxia inmediatamente.',
    action: () => executeApprove(post)
  }
}

const executeApprove = async (post) => {
  if (!isAdmin.value) return
  await updateDoc(doc(db, 'posts', post.id), { status: 'approved', stickers: deleteField(), updatedAt: Date.now() })
  post.status = 'approved'
  confirmDialog.value.show = false
  await notifyNewPost(post)
  showToast('Post publicado')
}

const triggerDelete = (id) => {
  const post = posts.value.find(p => p.id === id)
  if (!post || !canDeletePost(post)) return
  confirmDialog.value = {
    show: true,
    type: 'delete',
    title: 'Eliminar post?',
    message: 'Esta accion no se puede deshacer.',
    action: () => executeDelete(id)
  }
}

const executeDelete = async (id) => {
  await deleteDoc(doc(db, 'posts', id))
  posts.value = posts.value.filter(p => p.id !== id)
  confirmDialog.value.show = false
  showToast('Post eliminado', 'delete')
}
</script>

<style scoped>
.post-manager {
  min-height: 100%;
}

.post-kicker {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.post-create-btn {
  align-items: center;
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 18px;
}

.category-manage-btn {
  align-items: center;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
}

.post-toolbar {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 18px;
}

.post-tabs {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: flex;
  gap: 4px;
  padding: 4px;
}

.post-tabs button {
  border-radius: 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
  min-height: 34px;
  padding: 0 14px;
}

.post-tabs button.active {
  background: linear-gradient(to right, #9333ea, #ec4899);
  color: #ffffff;
}

.post-filters {
  display: flex;
  gap: 10px;
}

.post-filters select {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  height: 42px;
  padding: 0 12px;
}

.post-table-wrap {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

.post-table {
  border-collapse: collapse;
  width: 100%;
}

.post-table th,
.post-table td {
  border-bottom: 1px solid #eef2f7;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  padding: 12px 14px;
  text-align: left;
}

.post-table th {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.post-title-cell {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 74px minmax(0, 1fr);
}

.post-title-cell img,
.post-title-cell > span,
.post-mobile-card img,
.post-mobile-card > span {
  aspect-ratio: 16 / 10;
  background: #ede9fe;
  border-radius: 10px;
  object-fit: cover;
  width: 100%;
}

.post-title-cell > span,
.post-mobile-card > span {
  align-items: center;
  color: #a855f7;
  display: flex;
  justify-content: center;
}

.post-title-cell strong,
.post-mobile-card strong {
  color: #111827;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.3;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.category-pill,
.state-pill {
  border-radius: 999px;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  padding: 5px 8px;
}

.category-pill {
  background: #ede9fe;
  color: #7c3aed;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-width: 220px;
}

.category-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2100;
}

.category-backdrop {
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(14px);
  inset: 0;
  position: absolute;
}

.category-panel {
  background: #ffffff;
  border: 1px solid #eef2f7;
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.26);
  display: grid;
  gap: 16px;
  max-height: calc(100dvh - 36px);
  max-width: 680px;
  overflow: hidden;
  padding: 22px;
  position: relative;
  width: min(100%, 680px);
}

.category-panel-head {
  align-items: start;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding-bottom: 16px;
}

.category-panel-head h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
}

.category-panel-head p {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  margin-top: 4px;
}

.category-add-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.category-add-row input {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  min-height: 42px;
  outline: none;
  padding: 0 12px;
}

.category-add-row input:focus {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px #f3e8ff;
}

.category-add-row button {
  align-items: center;
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
}

.category-add-row button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.category-manage-list {
  display: grid;
  gap: 10px;
  max-height: min(480px, calc(100dvh - 230px));
  overflow-y: auto;
  padding-right: 4px;
}

.category-manage-item {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 12px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  min-height: 54px;
  padding: 8px 10px;
}

.category-manage-item > span {
  align-items: center;
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.category-manage-item strong {
  color: #111827;
  font-size: 13px;
  font-weight: 950;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-manage-item div {
  display: flex;
  gap: 6px;
}

.category-manage-item button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #64748b;
  display: flex;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.category-manage-item button.danger {
  background: #fef2f2;
  border-color: #fee2e2;
  color: #ef4444;
}

.category-manage-item button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.state-pill.pending {
  background: #fef3c7;
  color: #b45309;
}

.state-pill.approved {
  background: #dcfce7;
  color: #15803d;
}

.state-pill.rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.post-actions {
  display: flex;
  gap: 6px;
}

.post-share-btn {
  align-items: center;
  background: #f5f3ff;
  border-radius: 8px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  gap: 6px;
  min-height: 26px;
  padding: 0 9px;
  white-space: nowrap;
}

.post-mobile-list {
  display: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@media (max-width: 760px) {
  .panel-header,
  .post-toolbar {
    align-items: stretch;
    display: grid;
  }

  .post-create-btn {
    justify-content: center;
    width: 100%;
  }

  .post-tabs,
  .post-filters {
    overflow-x: auto;
  }

  .category-add-row,
  .category-manage-item {
    grid-template-columns: 1fr;
  }

  .category-manage-item div {
    justify-content: stretch;
  }

  .category-manage-item button {
    flex: 1;
  }

  .post-table-wrap {
    display: none;
  }

  .post-mobile-list {
    display: grid;
    gap: 10px;
  }

  .post-mobile-card {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    display: grid;
    gap: 10px;
    grid-template-columns: 74px minmax(0, 1fr) auto;
    padding: 10px;
  }

  .post-mobile-card p {
    align-items: center;
    color: #94a3b8;
    display: flex;
    font-size: 11px;
    font-weight: 800;
    gap: 8px;
    margin-top: 6px;
  }

  .post-mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    max-width: 74px;
  }

  .post-mobile-card button {
    align-items: center;
    background: #f1f5f9;
    border-radius: 10px;
    color: #7c3aed;
    display: flex;
    height: 34px;
    justify-content: center;
    width: 34px;
  }

  .post-mobile-card button.approve-mobile {
    background: #dcfce7;
    color: #16a34a;
  }

  .post-mobile-card button.delete-mobile {
    background: #fee2e2;
    color: #ef4444;
  }
}

</style>
