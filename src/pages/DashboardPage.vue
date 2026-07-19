<template>
  <main class="global-manager-page">
    <header class="global-manager-head">
      <div>
        <span>Galaxia Nintendera</span>
        <h1>Gestor Global</h1>
        <p>Administra la plataforma desde una sola seccion interna, sin salir del flujo normal de la web.</p>
      </div>
    </header>

    <nav class="global-manager-tabs" aria-label="Modulos del gestor global">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        @click="setActiveTab(tab.id)"
      >
        <i :class="tab.icon"></i>
        {{ tab.label }}
      </button>
    </nav>

    <section class="global-manager-shell">
      <header class="module-head">
        <div>
          <span>{{ activeMeta.kicker }}</span>
          <h2>{{ activeMeta.title }}</h2>
          <p>{{ activeMeta.description }}</p>
        </div>

        <div v-if="activeActions.length" class="module-actions">
          <button
            v-for="action in activeActions"
            :key="action.id"
            type="button"
            @click="runAction(action)"
          >
            <i :class="action.icon"></i>
            {{ action.label }}
          </button>
        </div>
      </header>

      <Transition name="manager-fade" mode="out-in">
        <section :key="activeTab" class="module-panel" :class="{ 'is-loading': isContentLoading }">
          <KeepAlive>
            <component
              :is="activeComponent"
              :user-role="currentRole"
              :show-embedded-tools="activeTab !== 'posts'"
              embedded
              @loading="handleModuleLoading"
              @ready="handleModuleReady"
            />
          </KeepAlive>

          <Transition name="content-loading-fade">
            <ContentLoading
              v-if="isInlineLoading"
              :module="activeTab"
              variant="inline"
              class="module-loading-layer"
            />
          </Transition>

          <Transition name="content-loading-fade">
            <ContentLoading
              v-if="isSkeletonLoading"
              :module="activeTab"
              class="module-loading-layer"
            />
          </Transition>
        </section>
      </Transition>
    </section>
  </main>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import ContentLoading from '@/components/shared/ContentLoading.vue'
import { createLoadingManager } from '@/composables/useLoadingManager'

const PostPanel = defineAsyncComponent(() => import('@/components/shared/PostPanel.vue'))
const SitePagesPanel = defineAsyncComponent(() => import('@/components/sitePages/SitePagesPanel.vue'))
const UserPanel = defineAsyncComponent(() => import('@/components/shared/UserPanel.vue'))
const OverlayPanel = defineAsyncComponent(() => import('@/components/shared/OverlayPanel.vue'))

const route = useRoute()
const router = useRouter()
const currentRole = ref('user')
const activeTab = ref('posts')
const loadedTabs = ref(new Set())
const currentLoadToken = ref(null)
const contentLoading = createLoadingManager()
const isContentLoading = computed(() => contentLoading.active.value)
const isInlineLoading = computed(() => contentLoading.isInline.value)
const isSkeletonLoading = computed(() => contentLoading.isSkeleton.value)

const isAdmin = computed(() => currentRole.value === 'admin')
const canPublish = computed(() => ['admin', 'publisher'].includes(currentRole.value))

const tabs = computed(() => [
  {
    id: 'posts',
    label: 'Gestionar posts',
    icon: 'far fa-newspaper',
    component: PostPanel,
    publisher: true,
    kicker: 'Publicaciones',
    title: 'Gestion de posts',
    description: 'Crea, edita, aprueba y organiza publicaciones sin mezclar otros modulos.'
  },
  {
    id: 'pages',
    label: 'Gestionar paginas',
    icon: 'far fa-file-lines',
    component: SitePagesPanel,
    admin: true,
    kicker: 'CMS del sitio',
    title: 'Gestion de paginas',
    description: 'Footer, legales, guias, landings y secciones dinamicas del sitio.'
  },
  {
    id: 'users',
    label: 'Gestionar usuarios',
    icon: 'fas fa-users',
    component: UserPanel,
    admin: true,
    kicker: 'Comunidad',
    title: 'Gestion de usuarios',
    description: 'Perfiles, roles, permisos, verificacion y bloqueo de cuentas.'
  },
  {
    id: 'overlays',
    label: 'Gestionar overlays',
    icon: 'fas fa-layer-group',
    component: OverlayPanel,
    admin: true,
    kicker: 'Directos',
    title: 'Gestion de overlays',
    description: 'Escenas, widgets y overlays para streams y contenido en vivo.'
  }
])

const visibleTabs = computed(() => tabs.value.filter(tab => {
  if (tab.admin) return isAdmin.value
  if (tab.publisher) return canPublish.value
  return true
}))

const activeMeta = computed(() => visibleTabs.value.find(tab => tab.id === activeTab.value) || visibleTabs.value[0] || tabs.value[0])
const activeComponent = computed(() => activeMeta.value.component)

const activeActions = computed(() => {
  if (activeTab.value === 'posts') {
    const actions = [
      { id: 'post', label: 'Crear post', icon: 'fas fa-plus', create: 'post' },
      { id: 'post-json', label: 'Pegar JSON', icon: 'fas fa-paste', create: 'post-json' },
      { id: 'hero', label: 'Crear principal', icon: 'fas fa-bullhorn', create: 'hero' }
    ]

    if (isAdmin.value) {
      actions.push({ id: 'categories', label: 'Categorias', icon: 'fas fa-tags', create: 'categories' })
    }

    return actions
  }

  if (activeTab.value === 'pages') return []

  if (activeTab.value === 'users' && isAdmin.value) {
    return [{ id: 'user', label: 'Crear usuario', icon: 'fas fa-user-plus', create: 'user' }]
  }

  if (activeTab.value === 'overlays' && isAdmin.value) {
    return [{ id: 'overlay', label: 'Crear overlay', icon: 'fas fa-layer-group', create: 'overlay' }]
  }

  return []
})

const normalizeTab = (value) => {
  const requested = String(value || 'posts')
  return visibleTabs.value.some(tab => tab.id === requested) ? requested : 'posts'
}

const setActiveTab = (tab) => {
  const nextTab = normalizeTab(tab)
  if (nextTab === activeTab.value && route.query.view === nextTab) return
  activeTab.value = nextTab
  if (!loadedTabs.value.has(nextTab)) {
    currentLoadToken.value = contentLoading.start({ id: nextTab })
  }
  router.replace({ path: route.path, query: { ...route.query, view: activeTab.value } })
}

const runAction = (action) => {
  const query = { view: activeTab.value }
  if (action.create) query.create = action.create
  if (action.seed) query.seed = action.seed
  router.replace({ path: route.path, query })
}

const applyRouteTab = () => {
  const nextTab = normalizeTab(route.query.view)
  if (nextTab === activeTab.value) return
  activeTab.value = nextTab
  if (!loadedTabs.value.has(nextTab)) {
    currentLoadToken.value = contentLoading.start({ id: nextTab })
  }
}

const handleModuleLoading = (moduleId = activeTab.value) => {
  if (loadedTabs.value.has(moduleId)) return
  currentLoadToken.value = contentLoading.start({ id: moduleId })
}

const handleModuleReady = async (moduleId = activeTab.value) => {
  loadedTabs.value = new Set([...loadedTabs.value, moduleId])
  await nextTick()
  if (moduleId === activeTab.value) {
    contentLoading.finish(currentLoadToken.value)
  }
}

const loadRole = async () => {
  const user = auth.currentUser
  if (!user) return

  const snap = await getDoc(doc(db, 'users', user.uid))
  currentRole.value = snap.data()?.role || 'user'

  if (!['admin', 'publisher'].includes(currentRole.value)) {
    router.replace('/')
    return
  }

  applyRouteTab()
}

watch(() => route.query.view, applyRouteTab)
watch(visibleTabs, () => {
  if (!visibleTabs.value.some(tab => tab.id === activeTab.value)) {
    activeTab.value = 'posts'
  }
})

onMounted(loadRole)
</script>

<style scoped>
.global-manager-page {
  background:
    radial-gradient(circle at top left, rgba(168, 85, 247, 0.16), transparent 30%),
    linear-gradient(180deg, #f8fafc 0%, #f3f4ff 100%);
  min-height: 100vh;
  padding: calc(var(--public-nav-offset, 0px) + 24px) 22px 36px;
}

.global-manager-head,
.global-manager-tabs,
.global-manager-shell {
  margin-left: auto;
  margin-right: auto;
  max-width: 1280px;
}

.global-manager-head {
  align-items: end;
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.global-manager-head span,
.module-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.global-manager-head h1 {
  color: #0f172a;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 950;
  line-height: 1.05;
  margin-top: 4px;
}

.global-manager-head p,
.module-head p {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
  margin-top: 6px;
}

.global-manager-tabs {
  align-items: center;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 20px 46px rgba(88, 28, 135, 0.08);
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  overflow-x: auto;
  padding: 8px;
}

.global-manager-tabs button {
  align-items: center;
  border-radius: 14px;
  color: #64748b;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.global-manager-tabs button.active {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow: 0 12px 26px rgba(147, 51, 234, 0.24);
  color: #ffffff;
}

.global-manager-shell {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  overflow: visible;
  padding: 18px;
}

.module-head {
  align-items: end;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 16px;
}

.module-head h2 {
  color: #0f172a;
  font-size: 26px;
  font-weight: 950;
  line-height: 1.08;
  margin-top: 4px;
}

.module-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.module-actions button {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 13px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
}

.module-panel {
  min-height: 360px;
  position: relative;
}

.module-panel.is-loading > :deep(:first-child) {
  opacity: 0.34;
  pointer-events: none;
}

.module-loading-layer {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 16px;
  inset: 0;
  padding: 0;
  position: absolute;
  z-index: 4;
}

.content-loading-fade-enter-active,
.content-loading-fade-leave-active {
  transition: opacity 0.16s ease;
}

.content-loading-fade-enter-from,
.content-loading-fade-leave-to {
  opacity: 0;
}

.manager-fade-enter-active,
.manager-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.manager-fade-enter-from,
.manager-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 760px) {
  .global-manager-page {
    padding: calc(var(--public-nav-offset, 0px) + 16px) 12px 26px;
  }

  .global-manager-head,
  .module-head {
    align-items: stretch;
    display: grid;
  }

  .global-manager-tabs {
    border-radius: 16px;
    gap: 6px;
    padding: 7px;
  }

  .global-manager-tabs button {
    font-size: 12px;
    min-height: 40px;
    padding: 0 12px;
  }

  .global-manager-shell {
    border-radius: 18px;
    padding: 14px;
  }

  .module-head h2 {
    font-size: 22px;
  }

  .module-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
    justify-content: stretch;
  }

  .module-actions button {
    justify-content: center;
  }
}
</style>
