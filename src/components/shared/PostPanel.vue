<template>
  <div v-soft-reveal="'.post-table tbody > tr,.post-mobile-card'" class="post-manager">
    <SitePagesPanel
      v-if="showSitePages"
      :user-role="userRole"
      embedded
    />

    <template v-else>
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

      <ListControls
        v-model:search="searchQuery"
        v-model:sort="sortMode"
        :page-size="POST_PAGE_SIZE"
        :page-size-options="[POST_PAGE_SIZE]"
        search-placeholder="Buscar publicaciones..."
        :sort-options="postSortOptions"
      >
        <template #filters>
          <select v-model="categoryFilter">
            <option value="all">Todas las categorias</option>
            <option v-for="category in managedCategories" :key="category" :value="category">{{ category }}</option>
          </select>
        </template>
      </ListControls>

      <div v-if="canPublish && showEmbeddedTools" class="post-filters">
        <div class="post-tools-menu">
          <button class="post-tools-btn" type="button" @click="showToolsMenu = !showToolsMenu">
            <i class="fas fa-wand-magic-sparkles"></i>
            Mas herramientas
            <i class="fas fa-chevron-down"></i>
          </button>
          <div v-if="showToolsMenu" class="post-tools-dropdown">
            <button type="button" @click="runToolAction('pages')">
              <i class="fas fa-file-lines"></i>
              Gestionar paginas
            </button>
            <button type="button" @click="runToolAction('json')">
              <i class="fas fa-paste"></i>
              Pegar JSON
            </button>
            <button v-if="isAdmin" type="button" @click="filter = 'pinned'; showToolsMenu = false">
              <i class="fas fa-thumbtack"></i>
              Gestionar pineados
            </button>
            <button v-if="isAdmin" type="button" @click="runToolAction('categories')">
              <i class="fas fa-tags"></i>
              Categorias
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="isAdmin" class="pin-help">Pineados en Inicio: {{ pinnedPosts.length }} / 6. La última publicación entra automáticamente; puedes quitarle el pin. Una nueva publicación sustituye al pin más antiguo si se llena el carrusel.</p>
    <div v-if="isLoadingPosts" class="post-empty-results">
      <i class="fas fa-circle-notch fa-spin"></i>
      <strong>Cargando publicaciones</strong>
      <span>Conectando con la base de datos...</span>
    </div>

    <div v-else-if="loadError" class="post-empty-results">
      <i class="fas fa-triangle-exclamation"></i>
      <strong>No se pudieron cargar las publicaciones</strong>
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="filteredPosts.length" class="post-table-wrap">
      <table class="post-table">
        <colgroup><col class="title-col" /><col class="category-col" /><col class="status-col" /><col class="author-col" /><col class="updated-col" /><col class="actions-col" /></colgroup>
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
                <strong :title="post.title || 'Sin titulo'">{{ post.title || 'Sin titulo' }}</strong>
              </div>
            </td>
            <td>
              <div class="category-list" :title="postCategories(post).join(', ')">
                <span v-for="category in postCategories(post)" :key="category" class="category-pill">{{ category }}</span>
              </div>
            </td>
            <td><span :class="['state-pill', post.status]">{{ statusLabel(post.status) }}</span></td>
            <td><span class="post-author" :title="post.authorName || 'Redactor'">{{ post.authorName || 'Redactor' }}</span></td>
            <td>{{ formatUpdated(post.updatedAt || post.createdAt) }}</td>
            <td>
              <div class="post-actions" :class="{ 'admin-actions':isAdmin }">
                <button v-if="isAdmin && post.status === 'approved'" class="post-share-btn post-pin-btn" type="button" :aria-pressed="isPinned(post)" :disabled="pinSaving" @click="togglePin(post)"><i class="fas fa-thumbtack"></i>{{ isPinned(post) ? 'Quitar pin' : 'Pinear' }}</button>
                <button v-if="isAdmin && post.status === 'pending'" class="mini-btn-xs btn-success post-approve-btn" title="Aprobar" @click="triggerApprove(post)">
                  <i class="fas fa-check"></i>
                  <span>Aprobar</span>
                </button>
                <button v-if="canEditPost(post)" class="mini-btn-xs btn-edit post-edit-btn" title="Editar" @click="editPost(post)">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="post-share-btn post-social-btn" type="button" title="Generar imagen social" @click="openSocialShare(post.id)">
                  <i class="fas fa-wand-magic-sparkles"></i>
                  <span>Imagen social</span>
                </button>
                <button v-if="canDeletePost(post)" class="mini-btn-xs btn-danger post-delete-btn" title="Eliminar" @click="triggerDelete(post.id)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!isLoadingPosts && !loadError && !filteredPosts.length" class="post-empty-results">
      <i class="fas fa-magnifying-glass"></i>
      <strong>No hay publicaciones con esos criterios</strong>
      <span>Prueba con otra búsqueda, filtro u ordenación.</span>
    </div>

    <div v-if="!isLoadingPosts && !loadError && filteredPosts.length" class="post-mobile-list">
      <article v-for="post in paginatedPosts" :key="post.id" class="post-mobile-card">
        <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
        <span v-else><i class="far fa-image"></i></span>
        <div>
          <strong :title="post.title || 'Sin titulo'">{{ post.title || 'Sin titulo' }}</strong>
          <p><span :class="['state-pill', post.status]">{{ statusLabel(post.status) }}</span> {{ formatUpdated(post.updatedAt || post.createdAt) }}</p>
        </div>
        <div class="post-mobile-actions">
          <button v-if="isAdmin && post.status === 'approved'" type="button" :aria-label="isPinned(post) ? 'Quitar pin' : 'Pinear en Inicio'" :aria-pressed="isPinned(post)" :disabled="pinSaving" @click="togglePin(post)"><i class="fas fa-thumbtack"></i></button>
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
              <form v-if="editingCategory === category" class="category-rename-form" @submit.prevent="renameCategory(category)"><input v-model="categoryRenameDraft" maxlength="60" aria-label="Nuevo nombre de la categoría" :disabled="savingCategories" autofocus /><button type="submit" :disabled="savingCategories || !categoryRenameDraft.trim()">Guardar</button><button type="button" :disabled="savingCategories" @click="editingCategory=''">Cancelar</button></form>
              <strong v-else>{{ category }}</strong>
              <div>
                <button type="button" :disabled="savingCategories" :aria-label="`Renombrar ${category}`" title="Cambiar nombre" @click="editingCategory=category;categoryRenameDraft=category"><i class="fas fa-pen"></i></button>
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
      <AppNotice :visible="toast.show" :message="toast.message" :type="toast.type" />
    </Teleport>


    </template>
  </div>
</template>

<script setup>
import { vSoftReveal } from '@/directives/softReveal'
import AppNotice from '@/components/shared/AppNotice.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, deleteDoc, deleteField, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { resolveAssetUrl } from '@/constants/assets'
import ListControls from '@/components/shared/ListControls.vue'
import PaginationNav from '@/components/shared/PaginationNav.vue'
import SitePagesPanel from '@/components/sitePages/SitePagesPanel.vue'
import { notifyNewPost } from '@/services/notifications'
import { useListNavigation } from '@/composables/useListNavigation'
import { DEFAULT_POST_CATEGORIES, loadPostCategories, postCategoryLabels, postMatchesCategory, savePostCategories } from '@/services/postCategories'
import { homePinnedPosts, homePinOverflow, MAX_HOME_PINS } from '@/services/homePins'
import { clearPublicPageCache } from '@/services/publicPageCache'
import { renamedCategoryFields } from '@/services/categoryRename'
import { normalizeCategory } from '@/services/postCategories'

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
const pinSaving = ref(false)
const pinnedPosts = computed(() => homePinnedPosts(posts.value))
const isPinned = post => pinnedPosts.value.some(item => item.id === post.id)
async function togglePin(post) {
  if (!isAdmin.value || pinSaving.value) return
  const next = !isPinned(post)
  if (next && pinnedPosts.value.length >= MAX_HOME_PINS) return showToast('Quita un pin antes de añadir otro. Máximo seis.', 'delete')
  pinSaving.value = true
  try {
    const patch = { homePinned: next, homePinnedAt: next ? Date.now() : 0 }
    await updateDoc(doc(db, 'posts', post.id), patch)
    clearPublicPageCache()
    Object.assign(post, patch)
    showToast(next ? 'Publicación pineada en Inicio' : 'Pin retirado de Inicio')
  } catch (error) { console.error(error); showToast('No se pudo guardar el pin', 'delete') }
  finally { pinSaving.value = false }
}
const isLoadingPosts = ref(false)
const loadError = ref('')
const filter = ref('all')
const categoryFilter = ref('all')
const sortMode = ref('recent')
const searchQuery = ref('')
const showCategoryManager = ref(false)
const showToolsMenu = ref(false)
const managedCategories = ref(DEFAULT_POST_CATEGORIES)
const categoryDraft = ref('')
const editingCategory = ref('')
const categoryRenameDraft = ref('')
async function renameCategory(oldName) {
 if (!isAdmin.value || savingCategories.value) return
 const newName=categoryRenameDraft.value.trim()
 if (!newName) return
 if (newName===oldName) {editingCategory.value='';return}
 if (managedCategories.value.some(value=>value!==oldName && normalizeCategory(value)===normalizeCategory(newName))) return showToast('Ya existe una categoría con ese nombre','delete')
 savingCategories.value=true
 try {
  const snapshot=await getDocs(collection(db,'posts'))
  const changes=snapshot.docs.map(item=>({ref:doc(db,'posts',item.id),patch:renamedCategoryFields(item.data(),oldName,newName)})).filter(item=>Object.keys(item.patch).length)
  const categories=managedCategories.value.map(value=>value===oldName?newName:value)
  // Keep the settings change in the last batch; retries can finish a large rename.
  for(let offset=0;offset<changes.length;offset+=400){
   const batch=writeBatch(db)
   changes.slice(offset,offset+400).forEach(item=>batch.update(item.ref,item.patch))
   if(offset+400>=changes.length) batch.set(doc(db,'siteSettings','postCategories'),{items:categories,updatedAt:Date.now()},{merge:true})
   await batch.commit()
  }
  if(!changes.length) await savePostCategories(categories)
  posts.value=posts.value.map(post=>({...post,...renamedCategoryFields(post,oldName,newName)}))
  managedCategories.value=categories
  if(categoryFilter.value===oldName) categoryFilter.value=newName
  editingCategory.value=''
  clearPublicPageCache()
  showToast('Categoría y publicaciones actualizadas')
 } catch(error){console.error(error);showToast('No se completó el cambio. Puedes volver a intentarlo.','delete')}
 finally{savingCategories.value=false}
}
const savingCategories = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
const confirmDialog = ref({ show: false, id: null, type: '', title: '', message: '', action: null })
const isAdmin = computed(() => props.userRole === 'admin')
const canPublish = computed(() => ['admin', 'publisher'].includes(props.userRole))
const showSitePages = computed(() => route.query.section === 'pages' || route.query.create === 'page')
const filterOptions = computed(() => isAdmin.value ? ['all', 'pinned', 'pending', 'approved', 'mine'] : ['mine', 'pending', 'approved'])
const postSortOptions = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'az', label: 'A-Z' }
]

const loadPosts = async () => {
  isLoadingPosts.value = true
  loadError.value = ''
  try {
    const snap = await getDocs(collection(db, 'posts'))
    posts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
  if (filter.value === 'pinned') visiblePosts = visiblePosts.filter(isPinned)
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

const POST_PAGE_SIZE = 7
const postPager = useListNavigation(filteredPosts, { initialPageSize: POST_PAGE_SIZE })
const paginatedPosts = computed(() => postPager.pageItems.value)
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
  pinned: 'Pineados',
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

watch([() => confirmDialog.value.show, showCategoryManager], ([isConfirmOpen, isCategoryOpen]) => {
  document.body.style.overflow = isConfirmOpen || isCategoryOpen ? 'hidden' : ''
})

function openPostPage(query = {}) {
  if (!canPublish.value) return
  const destination = { name:'post-create', query }
  return route.query.create ? router.replace(destination) : router.push(destination)
}
const openCreate = () => openPostPage()
const openJsonCreate = () => openPostPage({ json:'1' })
const openHeroCreate = () => openPostPage({ mode:'hero' })
const editPost = post => {
  if (!canEditPost(post)) return
  router.push({ name:'post-edit', params:{id:post.id} })
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
  try {
    const publishedAt = Date.now()
    const patch = {
      status: 'approved',
      stickers: deleteField(),
      updatedAt: publishedAt,
      publishedAt: post.publishedAt || publishedAt
    }
    const snapshot = await getDocs(collection(db, 'posts'))
    const candidates = snapshot.docs.map(item => ({ ...item.data(), id: item.id, ...(item.id === post.id ? patch : {}) }))
    const overflow = homePinOverflow(candidates)
    const batch = writeBatch(db)
    batch.update(doc(db, 'posts', post.id), patch)
    overflow.forEach(item => batch.update(doc(db, 'posts', item.id), { homePinned: false, homePinnedAt: 0 }))
    await batch.commit()
    clearPublicPageCache()
    overflow.forEach(item => { const local = posts.value.find(p => p.id === item.id); if (local) Object.assign(local, { homePinned: false, homePinnedAt: 0 }) })
    post.status = 'approved'
    post.updatedAt = publishedAt
    post.publishedAt = post.publishedAt || publishedAt
    confirmDialog.value.show = false
    await notifyNewPost(post).catch(error => console.error(error))
    showToast('Post publicado')
  } catch (error) {
    console.error(error)
    showToast('No se pudo publicar. Los cambios no se han confirmado.', 'delete')
  }
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
  clearPublicPageCache()
  posts.value = posts.value.filter(p => p.id !== id)
  confirmDialog.value.show = false
  showToast('Post eliminado', 'delete')
}
</script>

<style scoped>
.pin-help{font-size:12px;line-height:1.5;color:var(--text-secondary);margin:0 0 16px}
.post-share-btn[aria-pressed=true],.post-mobile-actions button[aria-pressed=true]{background:#7024dc;color:#fff;border-color:#c084fc}
.post-manager {
  min-height: 100%;
}

.post-kicker {
  color: var(--accent-hover);
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

.post-toolbar {
  align-items: start;
  display: grid;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-bottom: 18px;
}

.post-tabs {
  background: var(--admin-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex;
  gap: 4px;
  padding: 4px;
}

.post-tabs button {
  border-radius: 10px;
  color: var(--text-muted);
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
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.post-filters select {
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
  height: 42px;
  padding: 0 12px;
}

.post-tools-menu {
  position: relative;
}

.post-tools-btn {
  align-items: center;
  background: var(--admin-surface-raised);
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  color: var(--accent-hover);
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
  white-space: nowrap;
}

.post-tools-dropdown {
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 20px 46px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 4px;
  min-width: 210px;
  padding: 8px;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 20;
}

.post-tools-dropdown button {
  align-items: center;
  border-radius: 10px;
  color: var(--text-secondary);
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 9px;
  min-height: 38px;
  padding: 0 10px;
  text-align: left;
}

.post-tools-dropdown button:hover {
  background: var(--admin-surface-raised);
  color: var(--accent-hover);
}

.post-table-wrap {
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.post-table {
  border-collapse: collapse;
  width: 100%;
}

.post-table th,
.post-table td {
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
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
  color: var(--text-primary);
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
  background: var(--admin-surface-raised);
  color: var(--accent-hover);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
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
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding-bottom: 16px;
}

.category-panel-head h2 {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 950;
}

.category-panel-head p {
  color: var(--text-muted);
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
  background: var(--admin-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
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
  background: var(--admin-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: grid;
  gap: 12px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  min-height: 54px;
  padding: 8px 10px;
}

.category-manage-item > span {
  align-items: center;
  background: var(--admin-surface-raised);
  border-radius: 999px;
  color: var(--accent-hover);
  display: flex;
  font-size: 11px;
  font-weight: 950;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.category-manage-item strong {
  color: var(--text-primary);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-muted);
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
  background: var(--admin-surface-raised);
  color: #b45309;
}

.state-pill.draft {
  background: #e0e7ff;
  color: #4338ca;
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
  background: var(--admin-surface-raised);
  border-radius: 8px;
  color: var(--accent-hover);
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

.post-empty-results {
  align-items: center;
  background: var(--admin-surface);
  border: 1px dashed #d8b4fe;
  border-radius: 16px;
  color: var(--text-muted);
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 180px;
  padding: 24px;
  text-align: center;
}

.post-empty-results i {
  color: #a855f7;
  font-size: 24px;
}

.post-empty-results strong {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 950;
}

.post-empty-results span {
  font-size: 12px;
  font-weight: 800;
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

  .post-create-btn {
    justify-content: center;
    width: 100%;
  }

  .post-tabs {
    overflow-x: auto;
  }

  .post-filters {
    flex-wrap: wrap;
    overflow: visible;
  }

  .post-tools-menu {
    position: static;
  }

  .post-tools-dropdown {
    left: 0;
    right: auto;
    top: auto;
    width: min(280px, calc(100vw - 32px));
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
    background: var(--admin-surface);
    border: 1px solid var(--border);
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
    background: var(--admin-surface-raised);
    border-radius: 10px;
    color: var(--accent-hover);
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

<style scoped>
.post-table{table-layout:fixed}
.category-col{width:160px}.status-col{width:90px}.author-col{width:92px}.updated-col{width:100px}.actions-col{width:312px}
.post-table td,.post-table th{padding:10px 12px;vertical-align:middle}
.post-table tbody tr{height:76px}
.post-title-cell{grid-template-columns:64px minmax(0,1fr);gap:10px;min-width:0}
.post-title-cell img,.post-title-cell>span{height:42px;width:64px;aspect-ratio:auto}
.post-title-cell strong,.post-mobile-card strong{min-width:0;overflow-wrap:anywhere;-webkit-line-clamp:2}
.post-author{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.post-table .category-list{min-width:0;max-height:52px;overflow:hidden}
.post-table .category-pill{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.post-actions{display:grid;grid-template-columns:32px 112px 32px;gap:8px;align-items:center;justify-content:end}
.post-actions.admin-actions{grid-template-columns:88px 32px 112px 32px}
.post-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;min-width:0;height:34px;min-height:34px;padding:0 8px;white-space:nowrap;border-radius:9px;box-sizing:border-box}
.post-actions .post-edit-btn{grid-column:1}.post-actions .post-social-btn{grid-column:2}.post-actions .post-delete-btn{grid-column:3}
.admin-actions .post-pin-btn,.admin-actions .post-approve-btn{grid-column:1;grid-row:1}
.admin-actions .post-edit-btn{grid-column:2}.admin-actions .post-social-btn{grid-column:3}.admin-actions .post-delete-btn{grid-column:4}
.post-actions .post-edit-btn,.post-actions .post-social-btn,.post-actions .post-delete-btn{grid-row:1}
@media(max-width:1100px){
 .post-mobile-card{grid-template-columns:64px minmax(0,1fr);gap:8px 12px;min-height:116px}
 .post-mobile-card>img,.post-mobile-card>span{grid-column:1;grid-row:1 / 3;align-self:center;width:64px;height:48px;aspect-ratio:auto}
 .post-mobile-card>div:not(.post-mobile-actions){min-width:0}
 .post-mobile-card strong{min-height:2.6em}
 .post-mobile-card p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .post-mobile-actions{grid-column:2;max-width:none;justify-content:flex-start;flex-wrap:nowrap;gap:8px}
 .post-mobile-actions button{flex:0 0 34px;width:34px;height:34px}
}
</style>

<style scoped>
.category-rename-form{grid-column:2/-1;display:flex;gap:6px;flex-wrap:wrap;min-width:0}.category-rename-form input{flex:1 1 140px;min-width:0;min-height:40px;border:1px solid #a855f760;border-radius:8px;padding:8px 10px;background:var(--admin-bg,#0b1222);color:var(--text-primary,#fff);font:inherit;font-size:13px}.category-rename-form button{width:auto;padding:8px 10px;min-height:40px;font-size:11px}.category-rename-form+div{display:none}
</style>
