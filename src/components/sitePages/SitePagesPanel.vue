<script setup>
import AdminNavGroup from '../shared/AdminNavGroup.vue'
import AppNotice from '@/components/shared/AppNotice.vue'
import AdminBadge from '@/components/shared/AdminBadge.vue'
import AdminSurface from '@/components/shared/AdminSurface.vue'
import AdminConfirmDialog from '@/components/shared/AdminConfirmDialog.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteSitePage, listSitePages, pageTemplate, saveSitePage, seedMissingLegalPages, seedMissingStarterPages } from '@/services/sitePages'
import SitePageEditor from '@/components/sitePages/SitePageEditor.vue'
import ListControls from '@/components/shared/ListControls.vue'
import PaginationNav from '@/components/shared/PaginationNav.vue'
import { useListNavigation } from '@/composables/useListNavigation'

const props = defineProps({
  embedded: Boolean,
  userRole: { type: String, default: 'user' }
})
const emit = defineEmits(['loading', 'ready'])

const route = useRoute()
const router = useRouter()
const pages = ref([])
const filter = ref('all')
const searchQuery = ref('')
const sortMode = ref('recent')
const showEditor = ref(false)
const editingPage = ref(null)
const loading = ref(true)
const loadError = ref('')
const toast = ref('')
const confirmDelete = ref(null)
const seedingLegal = ref(false)
const seedingStarter = ref(false)
const canManage = computed(() => ['admin', 'publisher'].includes(props.userRole))
const pageRoute = (page) => page?.type === 'legal' ? `/${page.slug}` : `/p/${page.slug}`
const pageSortOptions = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguas' },
  { value: 'az', label: 'A-Z' }
]

const filteredPages = computed(() => {
  let list = [...pages.value]
  const query = normalizeSearch(searchQuery.value)
  if (filter.value !== 'all') list = list.filter(page => page.status === filter.value || page.type === filter.value)
  if (query) {
    list = list.filter((page) => normalizeSearch([
      page.id,
      page.title,
      page.name,
      page.slug,
      page.description,
      page.type,
      page.status
    ].filter(Boolean).join(' ')).includes(query))
  }
  if (sortMode.value === 'az') return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'es', { sensitivity: 'base' }))
  if (sortMode.value === 'oldest') return list.sort((a, b) => Number(a.updatedAt || 0) - Number(b.updatedAt || 0))
  return list.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
})

const pagePager = useListNavigation(filteredPages, { initialPageSize: 20 })
const paginatedPages = computed(() => pagePager.pageItems.value)
const pagePageSize = computed({
  get: () => pagePager.pageSize.value,
  set: (value) => {
    pagePager.pageSize.value = Number(value) || 20
  }
})
const pagePagination = computed(() => ({
  currentPage: pagePager.currentPage.value,
  totalPages: pagePager.totalPages.value,
  totalItems: pagePager.totalItems.value,
  startItem: pagePager.startItem.value,
  endItem: pagePager.endItem.value,
  pageTokens: pagePager.pageTokens.value
}))

function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const loadPages = async ({ signal = false } = {}) => {
  if (signal) emit('loading', 'pages')
  loading.value = true
  loadError.value = ''
  try {
    pages.value = await listSitePages()
  } catch (error) {
    console.error(error)
    pages.value = []
    loadError.value = 'Revisa permisos o conexion de Firestore.'
  } finally {
    loading.value = false
    if (signal) emit('ready', 'pages')
  }
}

const openCreate = (type = 'footer') => {
  if (!canManage.value) return
  editingPage.value = pageTemplate(type)
  showEditor.value = true
  if (route.query.create === 'page') router.replace({ path: route.path, query: { ...route.query, create: undefined, section: 'pages' } })
}

const editPage = (page) => {
  editingPage.value = page
  showEditor.value = true
}

const duplicatePage = async (page) => {
  const copy = {
    ...page,
    id: undefined,
    title: `${page.title} copia`,
    slug: `${page.slug}-copia`,
    status: 'draft',
    showInFooter: false,
    footerOrder: Number(page.footerOrder || 10) + 1
  }
  await saveSitePage(copy)
  await loadPages()
  showToast('Pagina duplicada')
}

const togglePublish = async (page) => {
  await saveSitePage({ ...page, status: page.status === 'published' ? 'draft' : 'published' })
  await loadPages()
  showToast(page.status === 'published' ? 'Pagina despublicada' : 'Pagina publicada')
}

const createLegalTemplates = async () => {
  if (!canManage.value || seedingLegal.value) return
  seedingLegal.value = true
  try {
    const created = await seedMissingLegalPages({ publish: false })
    await loadPages()
    showToast(created.length ? `${created.length} plantillas legales creadas` : 'Las plantillas legales ya existen')
  } finally {
    seedingLegal.value = false
  }
}

const createStarterTemplates = async () => {
  if (!canManage.value || seedingStarter.value) return
  seedingStarter.value = true
  try {
    const created = await seedMissingStarterPages({ publish: false })
    await loadPages()
    showToast(created.length ? `${created.length} plantillas base creadas` : 'Las plantillas base ya existen')
  } finally {
    seedingStarter.value = false
  }
}

const executeDelete = async () => {
  if (!confirmDelete.value?.id) return
  await deleteSitePage(confirmDelete.value.id)
  confirmDelete.value = null
  await loadPages()
  showToast('Pagina eliminada')
}

const closeEditor = () => {
  showEditor.value = false
  editingPage.value = null
}

const showToast = (message) => {
  toast.value = message
  setTimeout(() => { toast.value = '' }, 2200)
}

watch(() => route.query.create, (target) => {
  if (target === 'page') openCreate(String(route.query.type || 'footer'))
}, { immediate: true })

watch(() => route.query.seed, async (target) => {
  if (target !== 'legal' || !canManage.value || seedingLegal.value) return
  await createLegalTemplates()
  router.replace({ path: route.path, query: { ...route.query, seed: undefined, section: 'pages' } })
}, { immediate: true })

watch([searchQuery, filter, sortMode], pagePager.resetPage)

onMounted(() => loadPages({ signal: true }))
</script>

<template>
  <section class="site-pages-panel">
    <header v-if="!embedded" class="site-pages-head">
      <div>
        <span class="admin-list-kicker">CMS Galaxia</span>
        <h1 class="admin-list-title admin-list-title--page">Paginas del sitio</h1>
        <p class="admin-list-subtitle">Footer, guias, paginas legales, landings y secciones dinamicas.</p>
      </div>
      <button class="admin-action admin-action--primary" type="button" @click="openCreate()"><i class="fas fa-plus"></i> Crear pagina</button>
    </header>

    <div class="site-pages-toolbar">
      <AdminNavGroup class="page-tabs" role="group" aria-label="Filtrar páginas">
        <button class="admin-action admin-action--ghost admin-action--sm" v-for="item in ['all','draft','published','footer','legal','guide','landing','home-section']" :key="item" :aria-pressed="filter === item" :class="{ active: filter === item, 'is-selected': filter === item }" type="button" @click="filter = item">
          {{ item === 'all' ? 'Todas' : item === 'draft' ? 'Borradores' : item === 'published' ? 'Publicadas' : item }}
        </button>
      </AdminNavGroup>
      <ListControls
        v-model:search="searchQuery"
        v-model:sort="sortMode"
        v-model:page-size="pagePageSize"
        search-placeholder="Buscar páginas..."
        :sort-options="pageSortOptions"
      />
      <div v-if="canManage" class="site-pages-actions">
        <button class="create-page-btn admin-action admin-action--primary" type="button" @click="openCreate()">
          <i class="fas fa-file-circle-plus"></i>
          Crear pagina
        </button>
        <button class="legal-seed-btn admin-action admin-action--primary" type="button" :disabled="seedingLegal" :aria-busy="seedingLegal" @click="createLegalTemplates">
          <i class="fas fa-scale-balanced"></i>
          {{ seedingLegal ? 'Creando...' : 'Crear legales' }}
        </button>
        <button class="starter-seed-btn admin-action admin-action--featured" type="button" :disabled="seedingStarter" :aria-busy="seedingStarter" @click="createStarterTemplates">
          <i class="fas fa-star"></i>
          {{ seedingStarter ? 'Creando...' : 'Crear base' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="pages-empty admin-list-state">Cargando paginas...</div>
    <div v-else-if="loadError" class="pages-empty admin-list-state">
      <i class="fas fa-triangle-exclamation"></i>
      <strong>No se pudieron cargar las paginas</strong>
      <span>{{ loadError }}</span>
    </div>
    <div v-else-if="!filteredPages.length" class="pages-empty admin-list-state">
      <i class="fas fa-file-lines"></i>
      <strong>No hay páginas con esos criterios</strong>
      <button class="admin-action admin-action--primary" v-if="canManage" type="button" @click="openCreate()">Crear una página</button>
    </div>

    <div v-else class="pages-grid">
      <AdminSurface as="article" v-for="page in paginatedPages" :key="page.id" class="site-page-card">
        <div class="page-card-icon" :style="{ '--page-accent': page.theme?.accent || '#a855f7' }">
          <i :class="page.icon || 'fas fa-book-open'"></i>
        </div>
        <div>
          <span class="admin-meta">{{ page.type }} - <AdminBadge :variant="page.status === 'published' ? 'success' : 'warning'">{{ page.status === 'published' ? 'Publicado' : 'Borrador' }}</AdminBadge></span>
          <strong class="admin-card-title">{{ page.title }}</strong>
          <p class="admin-description">{{ page.description || `/${page.slug}` }}</p>
          <small class="admin-meta" v-if="page.showInFooter"><i class="fas fa-link"></i> Footer: {{ page.footerColumn }} - orden {{ page.footerOrder }}</small>
          <small v-if="page.showInHome"><i class="fas fa-house"></i> Home: {{ page.homeSection || 'custom' }}</small>
        </div>
        <nav>
          <RouterLink class="admin-action admin-action--sm admin-action--icon" v-if="page.slug" :to="pageRoute(page)" target="_blank" title="Previsualizar"><i class="far fa-eye"></i></RouterLink>
          <button class="admin-action admin-action--sm admin-action--icon admin-action--edit" type="button" title="Editar" @click="editPage(page)"><i class="fas fa-pen"></i></button>
          <button class="admin-action admin-action--sm admin-action--icon" type="button" title="Duplicar" @click="duplicatePage(page)"><i class="far fa-copy"></i></button>
          <button class="admin-action admin-action--sm admin-action--icon" type="button" :title="page.status === 'published' ? 'Despublicar' : 'Publicar'" @click="togglePublish(page)"><i :class="page.status === 'published' ? 'fas fa-eye-slash' : 'fas fa-upload'"></i></button>
          <button type="button" class="admin-action admin-action--sm admin-action--icon admin-action--danger" title="Eliminar" @click="confirmDelete = page"><i class="fas fa-trash"></i></button>
        </nav>
      </AdminSurface>
    </div>

    <PaginationNav
      v-if="!loading && !loadError && filteredPages.length"
      :current-page="pagePagination.currentPage"
      :total-pages="pagePagination.totalPages"
      :total-items="pagePagination.totalItems"
      :start-item="pagePagination.startItem"
      :end-item="pagePagination.endItem"
      :page-tokens="pagePagination.pageTokens"
      item-label="páginas"
      @page="pagePager.setPage"
    />

    <SitePageEditor v-if="showEditor" :edit-data="editingPage" @close="closeEditor" @saved="loadPages" />

    <Teleport to="body">
      <AdminConfirmDialog :open="Boolean(confirmDelete)" title="Eliminar pagina?" description="Esta accion no se puede deshacer. La pagina dejara de verse en el sitio." confirm-label="Eliminar pagina" pending-label="Eliminando..." :confirm-action="executeDelete" @close="confirmDelete = null" />
      <AppNotice :message="toast" />
    </Teleport>
  </section>
</template>

<style scoped>
.site-pages-panel { display: grid; gap: 18px; }
.site-pages-head { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
.site-pages-toolbar { align-items: start; display: grid; gap: var(--space-4); grid-template-columns: minmax(0, 1fr) minmax(300px, auto) auto; }
.site-pages-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: flex-end; }

.pages-grid { display: grid; gap: var(--space-3); }
.site-page-card { align-items: center; display: grid; gap: var(--space-3); grid-template-columns: 58px minmax(0, 1fr) auto; }
.page-card-icon { align-items: center; background: color-mix(in srgb, var(--page-accent) 14%, var(--admin-bg)); border-radius: 14px; color: var(--page-accent); display: flex; font-size: 22px; height: 54px; justify-content: center; width: 54px; }
.site-page-card nav { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.site-page-toast { background: #111827; border-radius: 999px; bottom: 24px; color: #fff; font-size: 13px; font-weight: 950; left: 50%; padding: 12px 18px; position: fixed; transform: translateX(-50%); z-index: 5200; }
@media (max-width: 1100px) {
  .site-pages-toolbar { grid-template-columns: minmax(0, 1fr); }
  .site-pages-actions { flex-wrap: wrap; }
}
@media (max-width: 760px) {
  .site-pages-head { align-items: stretch; flex-direction: column; }
  .site-pages-toolbar { align-items: stretch; grid-template-columns: 1fr; }
  .site-pages-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); justify-content: stretch; }
  .site-page-card { grid-template-columns: 46px minmax(0,1fr); }
  .site-page-card nav { grid-column: 1 / -1; justify-content: flex-start; }
}

.site-page-card > div { min-width: 0; }
.site-page-card .admin-description { margin-top: var(--space-1); }
.site-page-card small { display: inline-flex; gap: var(--space-1); margin-right: var(--space-3); margin-top: var(--space-2); }
</style>
