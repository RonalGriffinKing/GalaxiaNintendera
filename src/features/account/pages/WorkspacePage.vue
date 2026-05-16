<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const props = defineProps({
  panel: {
    type: String,
    required: true
  }
})

const FavoritesPanel = defineAsyncComponent(() => import('@/features/admin/components/dashboard/FavoritesPanel.vue'))
const PostPanel = defineAsyncComponent(() => import('@/features/admin/components/dashboard/PostPanel.vue'))
const UserPanel = defineAsyncComponent(() => import('@/features/admin/components/dashboard/UserPanel.vue'))
const OverlayPanel = defineAsyncComponent(() => import('@/features/admin/components/dashboard/OverlayPanel.vue'))

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
const headerActions = computed(() => {
  if (props.panel === 'posts' && canCreateContent.value) {
    const actions = [
      { label: 'Crear post', icon: 'fas fa-plus', create: 'post' },
      { label: 'Pegar JSON', icon: 'fas fa-paste', create: 'post-json' },
      { label: 'Crear principal', icon: 'fas fa-bullhorn', create: 'hero' }
    ]

    return actions
  }

  if (props.panel === 'users' && canManageUsers.value) {
    return [{ label: 'Crear usuario', icon: 'fas fa-user-plus', create: 'user' }]
  }

  return []
})

const openCreate = (target) => {
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

  const snap = await getDoc(doc(db, 'users', user.uid))
  currentRole.value = snap.data()?.role || 'user'
}

onMounted(loadRole)
</script>

<template>
  <main class="workspace-page">
    <header class="workspace-head">
      <div>
        <span>Galaxia Nintendera</span>
        <h1>{{ page.title }}</h1>
        <p>{{ page.subtitle }}</p>
      </div>

      <div v-if="headerActions.length" class="workspace-actions">
        <button
          v-for="action in headerActions"
          :key="action.create || action.to"
          type="button"
          @click="runHeaderAction(action)"
        >
          <i :class="action.icon"></i>
          {{ action.label }}
        </button>
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
.workspace-page {
  background: #f8fafc;
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

.workspace-actions button {
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

.workspace-guide {
  background: linear-gradient(135deg, #111827, #581c87);
  border-radius: 14px;
  box-shadow: 0 18px 42px rgba(88, 28, 135, 0.16);
  color: #ffffff;
  margin: 0 auto 18px;
  max-width: 1280px;
  padding: 16px 18px;
}

.guide-title {
  align-items: center;
  display: flex;
  font-size: 13px;
  font-weight: 900;
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
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
  list-style-position: inside;
}

.workspace-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.workspace-head h1 {
  color: #111827;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
  margin-top: 4px;
}

.workspace-head p {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  margin-top: 5px;
}

.workspace-surface {
  margin: 0 auto;
  max-width: 1280px;
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

  .workspace-actions button {
    justify-content: center;
  }

  .workspace-head h1 {
    font-size: 23px;
  }

  .workspace-guide {
    padding: 14px;
  }

  .workspace-guide ol {
    grid-template-columns: 1fr;
  }
}
</style>
