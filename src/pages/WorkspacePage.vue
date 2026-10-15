<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { auth } from '@/firebase'
import {isEditorialOwner,editorialRole} from "@/services/editorial";

const props = defineProps({
  panel: {
    type: String,
    required: true
  }
})

const FavoritesPanel = defineAsyncComponent(() => import('@/components/shared/FavoritesPanel.vue'))
const PostPanel = defineAsyncComponent(() => import('@/components/shared/PostPanel.vue'))
const UserPanel = defineAsyncComponent(() => import('@/components/shared/UserPanel.vue'))
const OverlayPanel = defineAsyncComponent(() => import('@/components/shared/OverlayPanel.vue'))

const currentRole = ref('user')
const route = useRoute()
const router = useRouter()

const panels = {
  favorites: {
    component: FavoritesPanel,
    title: 'Mis favoritos',
    subtitle: 'Noticias guardadas para leer despues.',
    tips: [
      'Guarda posts desde el boton de corazon en cada noticia.',
      'Usa esta zona como lista de lectura personal.',
      'Toca una tarjeta para volver al articulo completo.'
    ]
  },
  posts: {
    component: PostPanel,
    title: 'Gestion de posts',
    subtitle: 'Crea, edita y revisa publicaciones.',
    tips: [
      'Crea el post con titulo, categoria, portada y secciones.',
      'Los posts nuevos quedan en pendiente hasta aprobarlos.',
      'El admin puede aprobar, editar o eliminar contenido.'
    ]
  },
  users: {
    component: UserPanel,
    title: 'Usuarios',
    subtitle: 'Administra perfiles y permisos.',
    tips: [
      'Usa el rol user para lectores normales.',
      'Usa publisher para personas que pueden crear posts.',
      'Reserva admin para gestion total de usuarios y contenido.'
    ]
  },
  overlays: {
    component: OverlayPanel,
    title: 'Overlays',
    subtitle: 'Escenas y widgets para directos.',
    tips: [
      'Crea una escena y entra al editor visual.',
      'Anade widgets de meta, misiones o chat.',
      'Copia el enlace del overlay para usarlo en OBS.'
    ]
  }
}

const page = computed(() => panels[props.panel] || panels.favorites)
const canManageUsers = computed(() => currentRole.value === 'admin')
const canCreateContent = computed(() => ['admin', 'publisher'].includes(currentRole.value))
const managingSitePages = computed(() => props.panel === 'posts' && route.query.section === 'pages')
const headerActions = computed(() => {
  if (props.panel === 'posts' && canCreateContent.value) {
    if (managingSitePages.value) {
      return [
        { label: 'Panel admin', icon: 'fas fa-table-cells-large', to: '/admin/dashboard' },
        { label: 'Gestionar posts', icon: 'fas fa-newspaper', create: 'posts-section' },
        { label: 'Crear pagina', icon: 'fas fa-file-circle-plus', create: 'page' },
        { label: 'Crear legales', icon: 'fas fa-scale-balanced', create: 'legal-seed' }
      ]
    }

    return [
      { label: 'Panel admin', icon: 'fas fa-table-cells-large', to: '/admin/dashboard' },
      { label: 'Crear post', icon: 'fas fa-plus', create: 'post' }
    ]
  }

  if (props.panel === 'users' && canManageUsers.value) {
    return [
      { label: 'Panel admin', icon: 'fas fa-table-cells-large', to: '/admin/dashboard' },
      { label: 'Crear usuario', icon: 'fas fa-user-plus', create: 'user' }
    ]
  }

  if (props.panel === 'overlays' && canManageUsers.value) {
    return [
      { label: 'Panel admin', icon: 'fas fa-table-cells-large', to: '/admin/dashboard' },
      { label: 'Crear overlay', icon: 'fas fa-layer-group', create: 'overlay' }
    ]
  }

  return []
})

const openCreate = (target) => {
  if (target === 'posts-section') {
    router.replace({ path: route.path, query: { ...route.query, section: undefined, create: undefined } })
    return
  }
  if (target === 'pages-section') {
    router.replace({ path: route.path, query: { ...route.query, section: 'pages', create: undefined } })
    return
  }
  if (target === 'legal-seed') {
    router.replace({ path: route.path, query: { ...route.query, section: 'pages', seed: 'legal', create: undefined } })
    return
  }
  router.replace({ path: route.path, query: { ...route.query, create: target } })
}

const runHeaderAction = (action) => {
  if (action.to) {
    router.push(action.to)
    return
  }

  openCreate(action.create)
}

const loadRole = async () => {
  const user = auth.currentUser
  if (!user) return

  currentRole.value = await editorialRole(user)
}

onMounted(loadRole)
</script>

<template>
  <main class="workspace-page" :class="{ 'admin-surfaces': panel === 'posts' || panel === 'users' }">
    <header class="workspace-head">
      <div>
        <span class="admin-list-kicker">Galaxia Nintendera</span>
        <h1 class="admin-list-title admin-list-title--page">{{ page.title }}</h1>
        <p class="admin-list-subtitle">{{ page.subtitle }}</p>
      </div>

      <div v-if="headerActions.length" class="workspace-actions">
        <component
          :is="action.to && (panel === 'posts' || panel === 'users') ? RouterLink : 'button'"
          :to="action.to && (panel === 'posts' || panel === 'users') ? action.to : undefined"
          v-for="action in headerActions"
          :key="action.create || action.to"
          class="admin-action admin-action--primary"
          type="button"
          @click="action.to && (panel === 'posts' || panel === 'users') ? undefined : runHeaderAction(action)"
        >
          <i :class="action.icon"></i>
          {{ action.label }}
        </component>
      </div>
    </header>

    <aside class="workspace-guide">
      <div class="guide-title">
        <i class="fas fa-circle-info"></i>
        <strong>Guia rapida</strong>
      </div>

      <ol>
        <li v-for="tip in page.tips" :key="tip">
          {{ tip }}
        </li>
      </ol>
    </aside>

    <section class="workspace-surface">
      <component :is="page.component" :user-role="currentRole" embedded />
    </section>
  </main>
</template>

<style scoped>
.workspace-page.admin-surfaces .workspace-actions { gap: var(--space-2); }
.workspace-page {
  background: var(--admin-bg);
  min-height: 100vh;
  padding: calc(var(--public-nav-offset, 0px) + 22px) 22px 34px;
  transition: padding-top 0.2s ease;
}

.workspace-head {
  align-items: end;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin: 0 auto 18px;
  max-width: 1280px;
}

.workspace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.workspace-guide {
  background: linear-gradient(135deg, #111827, #581c87);
  border-radius: var(--radius-control);
  box-shadow: 0 18px 42px rgba(88, 28, 135, 0.16);
  color: #ffffff;
  margin: 0 auto 18px;
  max-width: 1280px;
  padding: 16px 18px;
}

.guide-title {
  align-items: center;
  display: flex;
  font-size: var(--font-body);
  font-weight: var(--weight-heading);
  gap: 9px;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.guide-title i {
  color: #c084fc;
}

.workspace-guide ol {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.workspace-guide li {
  color: #e9d5ff;
  font-size: var(--font-caption);
  font-weight: var(--weight-label);
  line-height: 1.45;
  list-style-position: inside;
}

.workspace-head h1 {
  margin-top: 4px;
}

.workspace-head p {
  margin-top: 5px;
}

.workspace-surface {
  margin: 0 auto;
  max-width: 1280px;
}

@media (max-width: 1100px) {
  .workspace-head { flex-wrap: wrap; align-items: start; }
  .workspace-guide ol { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .workspace-page {
    padding: calc(var(--public-nav-offset, 0px) + 16px) 12px 24px;
  }

  .workspace-head {
    align-items: start;
    display: grid;
  }

  .workspace-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    justify-content: stretch;
    width: 100%;
  }

  .workspace-guide {
    padding: 14px;
  }

  .workspace-guide ol {
    grid-template-columns: 1fr;
  }
}
.workspace-page.admin-surfaces { padding: calc(var(--public-nav-offset, 0px) + var(--space-6)) var(--page-gutter) var(--space-6); }
.admin-surfaces .workspace-head, .admin-surfaces .workspace-guide { margin-bottom: var(--section-gap); max-width: var(--content-max); }
.admin-surfaces .workspace-head { gap: var(--space-4); }
.admin-surfaces .workspace-head h1 { margin-top: var(--space-1); }
.admin-surfaces .workspace-head p { margin-top: var(--space-2); }
.admin-surfaces .workspace-surface { max-width: var(--content-max); }
.admin-surfaces .workspace-guide { padding: var(--space-4); }
.admin-surfaces .workspace-guide li { line-height: var(--line-body); }
@media(max-width:760px) { .workspace-page.admin-surfaces { padding: calc(var(--public-nav-offset, 0px) + var(--space-4)) var(--space-3) var(--space-6); } }
</style>
