<template>
  <div class="layout">
    <header class="mobile-dashboard-bar">
      <button class="mobile-menu-btn" @click="mobileMenuOpen = true" aria-label="Abrir menu">
        <i class="fas fa-bars"></i>
      </button>

      <div>
        <strong>{{ currentViewLabel }}</strong>
        <span>Dashboard</span>
      </div>
    </header>

    <div
      v-if="mobileMenuOpen"
      class="mobile-menu-backdrop"
      @click="mobileMenuOpen = false"
    ></div>

    <Sidebar
      :role="currentRole"
      :mobile-open="mobileMenuOpen"
      @change="setView"
      @close-mobile="mobileMenuOpen = false"
    />

    <div class="content">
      <div class="panel">
        <component :is="currentComponent" :user-role="currentRole" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

import Sidebar from '@/components/nav/AdminSidebar.vue'

const HomePanel = defineAsyncComponent(() => import('@/components/shared/HomePanel.vue'))
const PostPanel = defineAsyncComponent(() => import('@/components/shared/PostPanel.vue'))
const UserPanel = defineAsyncComponent(() => import('@/components/shared/UserPanel.vue'))
const OverlayPanel = defineAsyncComponent(() => import('@/components/shared/OverlayPanel.vue'))
const FavoritesPanel = defineAsyncComponent(() => import('@/components/shared/FavoritesPanel.vue'))
const CommunityPanel = defineAsyncComponent(() => import('@/components/community/CommunityPanel.vue'))

const currentView = ref('home')
const currentRole = ref('user')
const mobileMenuOpen = ref(false)
const route = useRoute()
const isAdmin = computed(() => currentRole.value === 'admin')
const canPublish = computed(() => ['admin', 'publisher'].includes(currentRole.value))

const views = {
  home: HomePanel,
  favorites: FavoritesPanel,
  community: CommunityPanel,
  posts: PostPanel,
  users: UserPanel,
  overlays: OverlayPanel
}

const viewLabels = {
  home: 'Inicio',
  favorites: 'Favoritos',
  community: 'Comunidades',
  posts: 'Posts',
  users: 'Usuarios',
  overlays: 'Overlays'
}

const currentViewLabel = computed(() => viewLabels[currentView.value] || 'Dashboard')

const currentComponent = computed(() => {
  if (!isAdmin.value && ['users', 'overlays'].includes(currentView.value)) {
    return canPublish.value ? PostPanel : FavoritesPanel
  }

  if (!canPublish.value && currentView.value === 'posts') {
    return FavoritesPanel
  }

  return views[currentView.value] || HomePanel
})

const setView = (view) => {
  if (!isAdmin.value && ['users', 'overlays'].includes(view)) {
    currentView.value = canPublish.value ? 'posts' : 'favorites'
    return
  }

  if (!canPublish.value && view === 'posts') {
    currentView.value = 'favorites'
    return
  }

  currentView.value = view
}

const applyRouteView = () => {
  const view = String(route.query.view || '')
  if (!view || !views[view]) return

  setView(view)
}

const loadRole = async () => {
  const user = auth.currentUser
  if (!user) return

  const snap = await getDoc(doc(db, 'users', user.uid))
  currentRole.value = snap.data()?.role || 'user'
  applyRouteView()
}

watch(currentRole, (role) => {
  if (role !== 'admin' && ['users', 'overlays'].includes(currentView.value)) {
    currentView.value = canPublish.value ? 'posts' : 'favorites'
  }

  if (!['admin', 'publisher'].includes(role) && currentView.value === 'posts') {
    currentView.value = 'favorites'
  }
})

watch(mobileMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(loadRole)

watch(() => route.query.view, applyRouteView)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.layout {
  background: #f8fafc;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
}

.mobile-dashboard-bar,
.mobile-menu-backdrop {
  display: none;
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.panel {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

@media (max-width: 760px) {
  .layout {
    display: block;
    min-height: 100vh;
    overflow-x: clip;
  }

  .mobile-dashboard-bar {
    align-items: center;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    gap: 12px;
    height: 58px;
    left: 0;
    padding: 0 14px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 80;
  }

  .mobile-menu-btn {
    align-items: center;
    background: #111827;
    border-radius: 12px;
    color: #ffffff;
    display: flex;
    height: 38px;
    justify-content: center;
    width: 38px;
  }

  .mobile-dashboard-bar strong {
    color: #111827;
    display: block;
    font-size: 14px;
    font-weight: 900;
  }

  .mobile-dashboard-bar span {
    color: #64748b;
    display: block;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .mobile-menu-backdrop {
    background: rgba(15, 23, 42, 0.42);
    display: block;
    inset: 0;
    position: fixed;
    z-index: 90;
  }

  .content {
    min-height: 100vh;
  }

  .panel {
    padding: 72px 14px 14px;
  }
}

@media (max-width: 520px) {
  .panel {
    padding: 68px 10px 10px;
  }
}
</style>
