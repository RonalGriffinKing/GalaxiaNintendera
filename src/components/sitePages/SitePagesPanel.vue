<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteSitePage, listSitePages, pageTemplate, saveSitePage, seedMissingLegalPages, seedMissingStarterPages } from '@/services/sitePages'
import SitePageEditor from '@/components/sitePages/SitePageEditor.vue'

const props = defineProps({
  embedded: Boolean,
  userRole: { type: String, default: 'user' }
})
const emit = defineEmits(['loading', 'ready'])

const route = useRoute()
const router = useRouter()
const pages = ref([])
const filter = ref('all')
const showEditor = ref(false)
const editingPage = ref(null)
const loading = ref(true)
const toast = ref('')
const confirmDelete = ref(null)
const seedingLegal = ref(false)
const seedingStarter = ref(false)
const canManage = computed(() => ['admin', 'publisher'].includes(props.userRole))
const pageRoute = (page) => page?.type === 'legal' ? `/${page.slug}` : `/p/${page.slug}`

const filteredPages = computed(() => {
  let list = [...pages.value]
  if (filter.value !== 'all') list = list.filter(page => page.status === filter.value || page.type === filter.value)
  return list.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
})

const loadPages = async ({ signal = false } = {}) => {
  if (signal) emit('loading', 'pages')
  loading.value = true
  try {
    pages.value = await listSitePages()
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

onMounted(() => loadPages({ signal: true }))
</script>

<template>
  <section class="site-pages-panel">
    <header v-if="!embedded" class="site-pages-head">
      <div>
        <span>CMS Galaxia</span>
        <h1>Paginas del sitio</h1>
        <p>Footer, guias, paginas legales, landings y secciones dinamicas.</p>
      </div>
      <button type="button" @click="openCreate()"><i class="fas fa-plus"></i> Crear pagina</button>
    </header>

    <div class="site-pages-toolbar">
      <div class="page-tabs">
        <button v-for="item in ['all','draft','published','footer','legal','guide','landing','home-section']" :key="item" :class="{ active: filter === item }" type="button" @click="filter = item">
          {{ item === 'all' ? 'Todas' : item === 'draft' ? 'Borradores' : item === 'published' ? 'Publicadas' : item }}
        </button>
      </div>
      <div v-if="canManage" class="site-pages-actions">
        <button class="create-page-btn" type="button" @click="openCreate()">
          <i class="fas fa-file-circle-plus"></i>
          Crear pagina
        </button>
        <button class="legal-seed-btn" type="button" :disabled="seedingLegal" @click="createLegalTemplates">
          <i class="fas fa-scale-balanced"></i>
          {{ seedingLegal ? 'Creando...' : 'Crear legales' }}
        </button>
        <button class="starter-seed-btn" type="button" :disabled="seedingStarter" @click="createStarterTemplates">
          <i class="fas fa-star"></i>
          {{ seedingStarter ? 'Creando...' : 'Crear base' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="pages-empty">Cargando paginas...</div>
    <div v-else-if="!filteredPages.length" class="pages-empty">
      <i class="fas fa-file-lines"></i>
      <strong>No hay paginas todavia</strong>
      <button v-if="canManage" type="button" @click="openCreate()">Crear la primera pagina</button>
    </div>

    <div v-else class="pages-grid">
      <article v-for="page in filteredPages" :key="page.id" class="site-page-card">
        <div class="page-card-icon" :style="{ '--page-accent': page.theme?.accent || '#a855f7' }">
          <i :class="page.icon || 'fas fa-book-open'"></i>
        </div>
        <div>
          <span>{{ page.type }} - <em :class="{ published: page.status === 'published' }">{{ page.status === 'published' ? 'Publicado' : 'Borrador' }}</em></span>
          <strong>{{ page.title }}</strong>
          <p>{{ page.description || `/${page.slug}` }}</p>
          <small v-if="page.showInFooter"><i class="fas fa-link"></i> Footer: {{ page.footerColumn }} - orden {{ page.footerOrder }}</small>
          <small v-if="page.showInHome"><i class="fas fa-house"></i> Home: {{ page.homeSection || 'custom' }}</small>
        </div>
        <nav>
          <RouterLink v-if="page.slug" :to="pageRoute(page)" target="_blank" title="Previsualizar"><i class="far fa-eye"></i></RouterLink>
          <button type="button" title="Editar" @click="editPage(page)"><i class="fas fa-pen"></i></button>
          <button type="button" title="Duplicar" @click="duplicatePage(page)"><i class="far fa-copy"></i></button>
          <button type="button" :title="page.status === 'published' ? 'Despublicar' : 'Publicar'" @click="togglePublish(page)"><i :class="page.status === 'published' ? 'fas fa-eye-slash' : 'fas fa-upload'"></i></button>
          <button type="button" class="danger" title="Eliminar" @click="confirmDelete = page"><i class="fas fa-trash"></i></button>
        </nav>
      </article>
    </div>

    <SitePageEditor v-if="showEditor" :edit-data="editingPage" @close="closeEditor" @saved="loadPages" />

    <Teleport to="body">
      <div v-if="confirmDelete" class="delete-modal">
        <button type="button" class="delete-backdrop" @click="confirmDelete = null"></button>
        <section>
          <i class="fas fa-trash"></i>
          <h2>Eliminar pagina?</h2>
          <p>Esta accion no se puede deshacer. La pagina dejara de verse en el sitio.</p>
          <div>
            <button type="button" @click="confirmDelete = null">Cancelar</button>
            <button type="button" class="danger" @click="executeDelete">Eliminar</button>
          </div>
        </section>
      </div>
      <div v-if="toast" class="site-page-toast">{{ toast }}</div>
    </Teleport>
  </section>
</template>

<style scoped>
.site-pages-panel { display: grid; gap: 18px; }
.site-pages-head { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
.site-pages-toolbar { align-items: center; display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) auto; }
.site-pages-head span { color: #7c3aed; font-size: 11px; font-weight: 950; text-transform: uppercase; }
.site-pages-head h1 { color: #111827; font-size: 28px; font-weight: 950; }
.site-pages-head p { color: #64748b; font-size: 13px; font-weight: 750; }
.site-pages-head button, .create-page-btn, .legal-seed-btn, .starter-seed-btn, .pages-empty button { background: linear-gradient(135deg, #7c3aed, #ec4899); border-radius: 12px; color: #fff; font-size: 12px; font-weight: 950; min-height: 42px; padding: 0 16px; }
.site-pages-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.legal-seed-btn, .starter-seed-btn, .create-page-btn { align-items: center; display: inline-flex; gap: 8px; justify-content: center; }
.starter-seed-btn { background: linear-gradient(135deg, #facc15, #ec4899); }
.legal-seed-btn:disabled, .starter-seed-btn:disabled { opacity: 0.62; }
.page-tabs { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; }
.page-tabs button { border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 900; min-height: 34px; padding: 0 12px; }
.page-tabs button.active { background: linear-gradient(135deg, #7c3aed, #ec4899); color: #fff; }
.pages-grid { display: grid; gap: 12px; }
.site-page-card { align-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; display: grid; gap: 14px; grid-template-columns: 58px minmax(0, 1fr) auto; padding: 14px; }
.page-card-icon { align-items: center; background: color-mix(in srgb, var(--page-accent) 14%, #f8fafc); border-radius: 14px; color: var(--page-accent); display: flex; font-size: 22px; height: 54px; justify-content: center; width: 54px; }
.site-page-card span { color: #94a3b8; display: block; font-size: 10px; font-weight: 950; text-transform: uppercase; }
.site-page-card em { color: #f59e0b; font-style: normal; }
.site-page-card em.published { color: #16a34a; }
.site-page-card strong { color: #111827; display: block; font-size: 15px; font-weight: 950; }
.site-page-card p { color: #64748b; font-size: 12px; font-weight: 750; margin-top: 4px; }
.site-page-card small { color: #7c3aed; display: inline-flex; font-size: 11px; font-weight: 900; gap: 5px; margin-right: 10px; margin-top: 8px; }
.site-page-card nav { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.site-page-card nav a, .site-page-card nav button { align-items: center; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; color: #7c3aed; display: flex; height: 34px; justify-content: center; width: 34px; }
.site-page-card nav .danger { color: #ef4444; }
.pages-empty { align-items: center; background: #fff; border: 1px dashed #d8b4fe; border-radius: 18px; color: #64748b; display: grid; gap: 10px; justify-items: center; min-height: 220px; padding: 28px; text-align: center; }
.pages-empty i { color: #a855f7; font-size: 32px; }
.pages-empty strong { color: #111827; font-size: 18px; font-weight: 950; }
.delete-modal { align-items: center; display: flex; inset: 0; justify-content: center; padding: 20px; position: fixed; z-index: 5100; }
.delete-backdrop { background: rgba(0,0,0,0.48); inset: 0; position: absolute; }
.delete-modal section { background: #fff; border-radius: 20px; box-shadow: 0 30px 90px rgba(0,0,0,0.3); max-width: 360px; padding: 24px; position: relative; text-align: center; }
.delete-modal i { color: #ef4444; font-size: 28px; }
.delete-modal h2 { color: #111827; font-size: 20px; font-weight: 950; margin-top: 10px; }
.delete-modal p { color: #64748b; font-size: 13px; font-weight: 750; line-height: 1.5; margin-top: 8px; }
.delete-modal div { display: flex; gap: 10px; margin-top: 18px; }
.delete-modal div button { background: #f1f5f9; border-radius: 12px; color: #334155; flex: 1; font-size: 12px; font-weight: 950; min-height: 40px; }
.delete-modal div .danger { background: #ef4444; color: #fff; }
.site-page-toast { background: #111827; border-radius: 999px; bottom: 24px; color: #fff; font-size: 13px; font-weight: 950; left: 50%; padding: 12px 18px; position: fixed; transform: translateX(-50%); z-index: 5200; }
@media (max-width: 760px) {
  .site-pages-head { align-items: stretch; flex-direction: column; }
  .site-pages-toolbar { align-items: stretch; grid-template-columns: 1fr; }
  .site-pages-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); justify-content: stretch; }
  .site-page-card { grid-template-columns: 46px minmax(0,1fr); }
  .site-page-card nav { grid-column: 1 / -1; justify-content: flex-start; }
}
</style>
