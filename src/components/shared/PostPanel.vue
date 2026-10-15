<template>
  <div class="post-manager">
    <SitePagesPanel
      v-if="showSitePages"
      :user-role="userRole"
      embedded
    />

    <template v-else>
    <div v-if="!embedded" class="panel-header">
      <div>
        <span class="admin-list-kicker">Galaxia Nintendera</span>
        <h1 class="panel-title admin-list-title admin-list-title--page">Gestion de posts</h1>
        <p class="panel-subtitle admin-list-subtitle">Crea, edita y revisa publicaciones.</p>
      </div>

      <button v-if="canPublish" class="post-create-btn admin-action admin-action--primary" type="button" @click="openCreate">
        <i class="fas fa-plus"></i>
        Crear nuevo post
      </button>
    </div>

    <div class="post-toolbar">
      <AdminNavGroup class="post-tabs" role="group" aria-label="Filtrar publicaciones">
        <button
          v-for="opt in filterOptions"
          :key="opt"
          :aria-pressed="filter === opt"
          class="admin-action admin-action--ghost admin-action--sm"
          :class="{ active: filter === opt, 'is-selected': filter === opt }"
          type="button"
          @click="filter = opt"
        >
          {{ tabLabel(opt) }}
        </button>
      </AdminNavGroup>

      <ListControls
        v-model:search="searchQuery"
        v-model:sort="sortMode"
        v-model:page-size="postPageSize"
        search-placeholder="Buscar publicaciones..."
        :sort-options="postSortOptions"
      >
        <template #filters>
          <select v-model="categoryFilter" aria-label="Filtrar por categoría">
            <option value="all">Todas las categorias</option>
            <option v-for="category in managedCategories" :key="category" :value="category">{{ category }}</option>
          </select>
        </template>
      </ListControls>

      <div v-if="canPublish && showEmbeddedTools" class="post-filters">
        <AdminDisclosure v-model="showToolsMenu" label="Mas herramientas" align="end">
          <template #icon><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i></template>
            <button class="admin-action admin-action--ghost admin-action--menu" type="button" @click="runToolAction('pages')">
              <i class="fas fa-file-lines"></i>
              Gestionar paginas
            </button>
            <button class="admin-action admin-action--ghost admin-action--menu" type="button" @click="runToolAction('json')">
              <i class="fas fa-paste"></i>
              Pegar JSON
            </button>
            <button class="admin-action admin-action--ghost admin-action--menu" type="button" @click="runToolAction('hero')">
              <i class="fas fa-bullhorn"></i>
              Crear principal
            </button>
            <button class="admin-action admin-action--ghost admin-action--menu" v-if="isAdmin" type="button" @click="runToolAction('categories')">
              <i class="fas fa-tags"></i>
              Categorias
            </button>
        </AdminDisclosure>
      </div>
    </div>

    <div v-if="isLoadingPosts" class="post-empty-results admin-list-state">
      <i class="fas fa-circle-notch fa-spin"></i>
      <strong>Cargando publicaciones</strong>
      <span>Conectando con la base de datos...</span>
    </div>

    <div v-else-if="loadError" class="post-empty-results admin-list-state">
      <i class="fas fa-triangle-exclamation"></i>
      <strong>No se pudieron cargar las publicaciones</strong>
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="filteredPosts.length" class="post-table-wrap admin-surface admin-surface--card">
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
          <tr v-for="post in paginatedPosts" :key="post.id">
            <td>
              <div class="post-title-cell">
                <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
                <span v-else><i class="far fa-image"></i></span>
                <strong class="admin-card-title">{{ post.title || 'Sin titulo' }}</strong>
              </div>
            </td>
            <td>
              <div class="category-list">
                <AdminBadge v-for="category in postCategories(post)" :key="category" variant="brand">{{ category }}</AdminBadge>
              </div>
            </td>
            <td><AdminBadge :variant="postBadgeVariant(post.status)">{{ statusLabel(post.status) }}</AdminBadge></td>
            <td>{{ post.authorName || 'Redactor' }}</td>
            <td>{{ formatUpdated(post.updatedAt || post.createdAt) }}</td>
            <td>
              <div class="post-actions">
                <button v-if="isAdmin && (post.status === 'pending' || (true && ['draft','withdrawn','approved'].includes(post.status)))" class="admin-action admin-action--sm admin-action--icon admin-action--success" type="button" title="Aprobar" @click="triggerApprove(post)">
                  <i class="fas fa-check"></i>
                </button>
                <button v-if="true && isAdmin && post.status === 'approved'" class="admin-action admin-action--sm" type="button" @click="triggerWithdraw(post)">Retirar</button>
                <button v-if="canEditPost(post)" class="admin-action admin-action--sm admin-action--icon admin-action--edit" type="button" title="Editar" @click="editPost(post)">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="post-share-btn admin-action admin-action--sm" type="button" title="Generar imagen social" @click="openSocialShare(post.id)">
                  <i class="fas fa-wand-magic-sparkles"></i>
                  <span>Generar imagen social</span>
                </button>
                <button v-if="canDeletePost(post)" class="admin-action admin-action--sm admin-action--icon admin-action--danger" type="button" title="Eliminar" @click="triggerDelete(post.id)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoadingPosts && !loadError && !filteredPosts.length" class="post-empty-results admin-list-state">
      <i class="fas fa-magnifying-glass"></i>
      <strong>No hay publicaciones con esos criterios</strong>
      <span>Prueba con otra búsqueda, filtro u ordenación.</span>
    </div>

    <div v-if="!isLoadingPosts && !loadError && filteredPosts.length" class="post-mobile-list">
      <AdminSurface as="article" v-for="post in paginatedPosts" :key="post.id" class="post-mobile-card">
        <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
        <span v-else><i class="far fa-image"></i></span>
        <div>
          <strong class="admin-card-title">{{ post.title || 'Sin titulo' }}</strong>
          <p><AdminBadge :variant="postBadgeVariant(post.status)">{{ statusLabel(post.status) }}</AdminBadge> {{ formatUpdated(post.updatedAt || post.createdAt) }}</p>
        </div>
        <div class="post-mobile-actions">
          <button v-if="isAdmin && (post.status === 'pending' || (true && ['draft','withdrawn','approved'].includes(post.status)))" class="admin-action admin-action--sm admin-action--icon admin-action--success" type="button" title="Aprobar" @click="triggerApprove(post)">
            <i class="fas fa-check"></i>
          </button>
          <button v-if="true && isAdmin && post.status === 'approved'" class="admin-action admin-action--sm" type="button" @click="triggerWithdraw(post)">Retirar</button>
                <button v-if="canEditPost(post)" class="admin-action admin-action--sm admin-action--icon admin-action--edit" type="button" title="Editar" @click="editPost(post)">
            <i class="fas fa-pen"></i>
          </button>
          <button class="admin-action admin-action--sm admin-action--icon" type="button" title="Generar imagen social" @click="openSocialShare(post.id)">
            <i class="fas fa-wand-magic-sparkles"></i>
          </button>
          <button v-if="canDeletePost(post)" class="admin-action admin-action--sm admin-action--icon admin-action--danger" type="button" title="Eliminar" @click="triggerDelete(post.id)">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </AdminSurface>
    </div>

    <PaginationNav
      v-if="!isLoadingPosts && !loadError && filteredPosts.length"
      :current-page="postPagination.currentPage"
      :total-pages="postPagination.totalPages"
      :total-items="postPagination.totalItems"
      :start-item="postPagination.startItem"
      :end-item="postPagination.endItem"
      :page-tokens="postPagination.pageTokens"
      item-label="publicaciones"
      @page="postPager.setPage"
    />

    <AdminConfirmDialog :open="confirmDialog.show" :title="confirmDialog.title || ''" :description="confirmDialog.message || ''" :variant="['delete','withdraw'].includes(confirmDialog.type) ? 'danger' : 'success'" :confirm-label="confirmDialog.type === 'withdraw' ? 'Retirar noticia' : confirmDialog.type === 'delete' ? 'Eliminar post' : 'Publicar post'" :confirm-action="confirmDialog.action" @close="confirmDialog.show = false" @error="showToast('No se pudo completar la accion', 'error')" />

    <AdminDialog :open="showCategoryManager" :busy="savingCategories" title="Categorias" description="El orden aqui sera el orden de filtros en noticias y al crear posts." size="wide" @close="closeCategoryManager">
      <form class="category-add-row" @submit.prevent="addCategory">
        <AdminField label="Nueva categoria" v-slot="{ id }"><input :id="id" class="admin-control" data-dialog-autofocus v-model="categoryDraft" placeholder="Nueva categoria" :disabled="savingCategories" /></AdminField>
        <button class="admin-action admin-action--primary" type="submit" :disabled="!categoryDraft.trim() || savingCategories" :aria-busy="savingCategories"><i class="fas fa-plus"></i> Agregar</button>
      </form>
      <div class="category-manage-list">
        <article v-for="(category, index) in managedCategories" :key="category" class="category-manage-item admin-surface admin-surface--nested">
          <AdminBadge variant="brand" :aria-label="`Posición ${index + 1}`">{{ index + 1 }}</AdminBadge><strong>{{ category }}</strong>
          <div>
            <button class="admin-action admin-action--sm admin-action--icon" type="button" :disabled="index === 0 || savingCategories" title="Subir" @click="moveCategory(index, -1)"><i class="fas fa-arrow-up"></i></button>
            <button class="admin-action admin-action--sm admin-action--icon" type="button" :disabled="index === managedCategories.length - 1 || savingCategories" title="Bajar" @click="moveCategory(index, 1)"><i class="fas fa-arrow-down"></i></button>
            <button class="admin-action admin-action--sm admin-action--icon admin-action--danger" type="button" :disabled="savingCategories" title="Borrar" @click="deleteCategory(category)"><i class="fas fa-trash"></i></button>
          </div>
        </article>
      </div>
      <template #footer><button class="admin-action" type="button" :disabled="savingCategories" @click="closeCategoryManager">Cerrar</button></template>
    </AdminDialog>

    <Teleport to="body">
      <AppNotice :visible="toast.show" :message="toast.message" :type="toast.type" />
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
    </template>
  </div>
</template>

<script setup>
import AdminNavGroup from './AdminNavGroup.vue'
import AdminDisclosure from './AdminDisclosure.vue'
import AppNotice from '@/components/shared/AppNotice.vue'
import { postBadgeVariant } from '@/components/shared/adminBadgeVariants'
import AdminBadge from '@/components/shared/AdminBadge.vue'
import AdminSurface from '@/components/shared/AdminSurface.vue'
import AdminField from '@/components/shared/AdminField.vue'
import AdminDialog from '@/components/shared/AdminDialog.vue'
import AdminConfirmDialog from '@/components/shared/AdminConfirmDialog.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { auth } from '@/firebase'
import {manageEditorial,editorialOperation,isEditorialOwner} from "@/services/editorial";
import { resolveAssetUrl } from '@/constants/assets'
import PostEditor from '@/components/posts/PostEditor.vue'
import ListControls from '@/components/shared/ListControls.vue'
import PaginationNav from '@/components/shared/PaginationNav.vue'
import SitePagesPanel from '@/components/sitePages/SitePagesPanel.vue'

import { useListNavigation } from '@/composables/useListNavigation'
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
  },
  showEmbeddedTools: {
    type: Boolean,
    default: true
  }
})
const emit = defineEmits(['loading', 'ready'])

const posts = ref([])
const isLoadingPosts = ref(false)
const loadError = ref('')
const filter = ref('all')
const categoryFilter = ref('all')
const sortMode = ref('recent')
const searchQuery = ref('')
const showEditor = ref(false)
const showCategoryManager = ref(false)
const showToolsMenu = ref(false)
const editingPost = ref(null)
const editorMode = ref('post')
const pasteJsonOnOpen = ref(false)
const managedCategories = ref(DEFAULT_POST_CATEGORIES)
const categoryDraft = ref('')
const savingCategories = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
const confirmDialog = ref({ show: false, id: null, type: '', title: '', message: '', action: null })
const isAdmin = computed(() => isEditorialOwner(auth.currentUser))
const canPublish = computed(() => isEditorialOwner(auth.currentUser) || props.userRole === 'publisher')
const showSitePages = computed(() => route.query.section === 'pages' || route.query.create === 'page')
const filterOptions = computed(() => isAdmin.value ? ['all', 'pending', 'approved', 'mine'] : ['mine', 'pending', 'approved'])
const postSortOptions = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'az', label: 'A-Z' }
]

const loadPosts = async () => {
  isLoadingPosts.value = true
  loadError.value = ''
  try {
    {posts.value=(await manageEditorial(auth.currentUser,{action:'list'})).items}
  } catch (error) {
    console.error(error)
    loadError.value = 'Revisa permisos o conexión de Firestore.'
    posts.value = []
  } finally {
    isLoadingPosts.value = false
  }
}

const loadCategories = async () => {
  try {
    const saved = await loadPostCategories()
    managedCategories.value = saved
  } catch (error) {
    console.error(error)
    managedCategories.value = DEFAULT_POST_CATEGORIES
  }
}

onMounted(async () => {
  emit('loading', 'posts')
  try {
    await Promise.all([
      loadPosts(),
      loadCategories()
    ])
  } finally {
    emit('ready', 'posts')
  }
  if (route.query.create === 'post') openCreate()
  if (route.query.create === 'post-json') openJsonCreate()
  if (route.query.create === 'hero') openHeroCreate()
  if (route.query.create === 'categories' && isAdmin.value) {
    showCategoryManager.value = true
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

const filteredPosts = computed(() => {
  const user = auth.currentUser
  let visiblePosts = isAdmin.value ? posts.value : posts.value.filter(p => p.authorId === user?.uid)
  const query = normalizeSearch(searchQuery.value)

  if (filter.value === 'mine') visiblePosts = visiblePosts.filter(p => p.authorId === user?.uid)
  if (['pending', 'approved'].includes(filter.value)) visiblePosts = visiblePosts.filter(p => p.status === filter.value)
  if (categoryFilter.value !== 'all') visiblePosts = visiblePosts.filter(p => postMatchesCategory(p, categoryFilter.value))
  if (query) {
    visiblePosts = visiblePosts.filter((post) => normalizeSearch([
      post.id,
      post.title,
      post.name,
      post.body,
      post.excerpt,
      post.content,
      post.authorName,
      postCategories(post).join(' ')
    ].filter(Boolean).join(' ')).includes(query))
  }

  return [...visiblePosts].sort((a, b) => {
    if (sortMode.value === 'az') return String(a.title || '').localeCompare(String(b.title || ''), 'es', { sensitivity: 'base' })
    const left = Number(a.updatedAt || a.createdAt || 0)
    const right = Number(b.updatedAt || b.createdAt || 0)
    return sortMode.value === 'recent' ? right - left : left - right
  })
})

const postPager = useListNavigation(filteredPosts, { initialPageSize: 20 })
const paginatedPosts = computed(() => postPager.pageItems.value)
const postPageSize = computed({
  get: () => postPager.pageSize.value,
  set: (value) => {
    postPager.pageSize.value = Number(value) || 20
  }
})
const postPagination = computed(() => ({
  currentPage: postPager.currentPage.value,
  totalPages: postPager.totalPages.value,
  totalItems: postPager.totalItems.value,
  startItem: postPager.startItem.value,
  endItem: postPager.endItem.value,
  pageTokens: postPager.pageTokens.value
}))

function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const tabLabel = (value) => ({
  all: 'Todos',
  pending: 'Pendientes',
  approved: 'Aprobados',
  mine: 'Mios'
}[value] || value)

const statusLabel = (value = 'pending') => ({
  draft: 'Borrador',
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

watch([searchQuery, filter, categoryFilter, sortMode], postPager.resetPage)

watch(() => route.query.create, (createTarget) => {
  if (createTarget === 'post') openCreate()
  if (createTarget === 'post-json') openJsonCreate()
  if (createTarget === 'hero') openHeroCreate()
  if (createTarget === 'categories' && isAdmin.value) {
    showCategoryManager.value = true
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
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

const runToolAction = (target) => {
  showToolsMenu.value = false
  if (target === 'pages') {
    router.replace({ path: route.path, query: { ...route.query, section: 'pages', create: undefined } })
    return
  }
  if (target === 'json') {
    openJsonCreate()
    return
  }
  if (target === 'hero') {
    openHeroCreate()
    return
  }
  if (target === 'categories' && isAdmin.value) {
    showCategoryManager.value = true
  }
}

const closeEditor = () => {
  showEditor.value = false
  editingPost.value = null
  editorMode.value = 'post'
  pasteJsonOnOpen.value = false
}

const canEditPost = (post) => {
  const user = auth.currentUser
  return isAdmin.value || (props.userRole === 'publisher' && post.authorId === user?.uid && ['draft','pending'].includes(post.status))
}

const canDeletePost = (post) => {
  return isAdmin.value
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
  {const result=await manageEditorial(auth.currentUser,editorialOperation('approve',post));confirmDialog.value.show=false;await loadPosts();showToast(result.state==='published'?'Post publicado':result.state==='scheduled'?'Aprobado y programado; requiere publicar al llegar la fecha':'Aprobado sin publicacion publica');return}
  
}

const triggerWithdraw = post => {
  confirmDialog.value={show:true,type:'withdraw',title:'Retirar noticia?',message:'Dejara de estar disponible publicamente y se conservara el original.',action:async()=>{await manageEditorial(auth.currentUser,editorialOperation('withdraw',post));confirmDialog.value.show=false;await loadPosts()}}
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
  {await manageEditorial(auth.currentUser,editorialOperation('delete',posts.value.find(p=>p.id===id)))}
  posts.value = posts.value.filter(p => p.id !== id)
  confirmDialog.value.show = false
  showToast('Post eliminado', 'delete')
}
</script>

<style scoped>
.post-manager {
  min-height: 100%;
}

.post-toolbar {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-bottom: var(--section-gap);
}

.post-filters {
  align-items: center;
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.post-table-wrap {
  overflow-x: auto;
}

.post-table {
  border-collapse: collapse;
  width: 100%;
}

.post-table th,
.post-table td {
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  font-size: var(--font-caption);
  font-weight: var(--weight-body);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  line-height: var(--line-body);
}

.post-table th {
  color: var(--text-muted);
  font-size: var(--font-label);
  font-weight: var(--weight-label);
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
  background: var(--admin-surface-raised);
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
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-width: 220px;
}

.category-add-row {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
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
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 34px minmax(0, 1fr) auto;
  min-height: 54px;
}

.category-manage-item strong {
  color: var(--text-primary);
  font-size: var(--font-body);
  font-weight: var(--weight-label);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-manage-item div {
  display: flex;
  gap: 6px;
}

.post-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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

@media (max-width: 1100px) {
  .panel-header,
  .post-toolbar {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }

  .post-toolbar {
    gap: 20px;
  }

  .post-filters {
    flex-wrap: wrap;
    overflow: visible;
  }

  .category-add-row,
  .category-manage-item {
    grid-template-columns: 1fr;
  }

  .category-manage-item div {
    justify-content: stretch;
  }

  .post-table-wrap {
    display: none;
  }

  .post-mobile-list {
    display: grid;
    gap: var(--space-3);
  }

  .post-mobile-card {
    align-items: center;
    display: grid;
    gap: var(--space-3);
    grid-template-columns: 74px minmax(0, 1fr) auto;
  }

  .post-mobile-card p {
    align-items: center;
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }

  .post-mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    max-width: 104px;
  }
}


.post-table-wrap { padding: 0; }
.post-mobile-card p { color: var(--text-muted); font-size: var(--font-caption); font-weight: var(--weight-body); line-height: var(--line-body); flex-wrap: wrap; }
.post-mobile-card > div { min-width: 0; }
@media(max-width:520px) { .post-mobile-card { grid-template-columns: 74px minmax(0,1fr); align-items: start; } .post-mobile-actions { grid-column: 1 / -1; max-width: none; justify-content: flex-start; } }
</style>
