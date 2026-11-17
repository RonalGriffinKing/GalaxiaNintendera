import { createRouter, createWebHistory } from 'vue-router'

import { managementDestination } from '@/services/managementNavigation'
import Home from '@/pages/Home2Page.vue'
import PublicLayout from '@/components/shared/PublicLayout.vue'
import OverlayView from '@/pages/OverlayViewPage.vue'
import { auth, db } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const isStudioBuild = import.meta.env.VITE_GALAXIA_STUDIO_BUILD === true

const routes = [
  {
    path: '/ruzafa-impresora/vacaciones/:local?',
    name: 'ruzafa-vacations',
    component: () => import('@/pages/RuzafaVacationsPage.vue')
  },
  ...(isStudioBuild ? [{
    path: '/admin/posts/new',
    name: 'post-create',
    component: () => import('@/pages/PostEditorPage.vue'),
    meta: { publisherOnly: true, workspace: true }
  }, {
    path: '/admin/posts/:id/edit',
    name: 'post-edit',
    component: () => import('@/pages/PostEditorPage.vue'),
    meta: { publisherOnly: true, workspace: true }
  }] : []),
  {
    path: '/ruzafa-impresora',
    name: 'ruzafa-printer',
    component: () => import('@/pages/RuzafaPrinterPage.vue')
  },
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', component: Home },
      {
        path: 'home2',
        redirect: '/'
      },
      {
        path: 'noticias',
        name: 'news',
        component: () => import('@/pages/CategoryPage.vue')
      },
      {
        path: 'buscar',
        name: 'search-results',
        component: () => import('@/pages/SearchResultsPage.vue')
      },
      {
        path: 'rumores',
        name: 'rumors',
        component: () => import('@/pages/CategoryPage.vue')
      },
      {
        path: 'guias',
        name: 'guides',
        component: () => import('@/pages/CategoryPage.vue')
      },
      {
        path: 'comunidades',
        name: 'communities',
        component: () => import('@/pages/CommunitiesPage.vue')
      },
      {
        path: 'comunidad/:slug?',
        name: 'community',
        component: () => import('@/pages/CommunityPage.vue')
      },
      {
        path: 'eventos',
        name: 'events',
        component: () => import('@/pages/EventsPage.vue')
      },
      {
        path: 'post/:id',
        component: () => import('@/pages/PostPage.vue')
      },
      {
        path: 'p/:slug',
        name: 'site-page',
        component: () => import('@/pages/SitePage.vue')
      },
      {
        path: ':slug(politica-privacidad|terminos-condiciones|normas-comunidad|politica-cookies|contacto-reportes|aviso-legal)',
        name: 'legal-site-page',
        component: () => import('@/pages/SitePage.vue')
      },
      {
        path: 'perfil/:uid/recompensas',
        name: 'profile-rewards',
        component: () => import('@/pages/ProfilePage.vue')
      },
      {
        path: 'perfil/:uid',
        name: 'profile',
        component: () => import('@/pages/ProfilePage.vue')
      },
      {
        path: 'categoria/:category',
        name: 'category',
        component: () => import('@/pages/CategoryPage.vue')
      },
      {
        path: 'mis-favoritos',
        component: () => import('@/pages/WorkspacePage.vue'),
        props: { panel: 'favorites' }
      },
      ...(isStudioBuild ? [{
        path: 'admin',
        redirect: '/admin/dashboard',
        meta: { publisherOnly: true, workspace: true }
      }, {
        path: 'admin/dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { publisherOnly: true, workspace: true }
      }, {
        path: 'admin/image-monitor',
        name: 'image-monitor',
        component: () => import('@/pages/ImageMonitorPage.vue'),
        meta: { adminOnly: true }
      }, {
        path: 'admin/posts',
        redirect: to => managementDestination('posts', to.query),
        meta: { publisherOnly: true, workspace: true }
      }, {
        path: 'admin/event-share/:id',
        component: () => import('@/pages/EventSharePage.vue'),
        meta: { publisherOnly: true }
      }, {
        path: 'admin/post-share/:id',
        component: () => import('@/pages/PostSharePage.vue'),
        meta: { publisherOnly: true }
      }, {
        path: 'admin/users',
        redirect: to => managementDestination('users', to.query),
        meta: { adminOnly: true, workspace: true }
      }, {
        path: 'admin/recompensas',
        redirect: to => managementDestination('rewards', to.query),
        meta: { adminOnly: true, workspace: true }
      }, {
        path: 'admin/eventos',
        redirect: to => managementDestination('events', to.query),
        meta: { adminOnly: true, workspace: true }
      }, {
        path: 'admin/overlays',
        redirect: to => managementDestination('overlays', to.query),
        meta: { adminOnly: true, workspace: true }
      }] : [])
    ]
  },

  ...(isStudioBuild ? [
    { path: '/dashboard', redirect: '/admin/dashboard', meta: { publisherOnly: true } },
    { path: '/editor', component: () => import('@/pages/OverlayEditorPage.vue'), meta: { adminOnly: true } }
  ] : [
    { path: '/admin/:pathMatch(.*)*', redirect: '/' },
    { path: '/dashboard', redirect: '/' },
    { path: '/editor', redirect: '/' }
  ]),
  { path: '/overlay/:id', component: OverlayView },
  { path: '/login', component: isStudioBuild ? () => import('@/pages/StudioLoginPage.vue') : () => import('@/pages/LoginPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: isStudioBuild ? '/admin/dashboard' : '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      return {
        el: to.hash,
        top: 88,
        behavior: 'smooth'
      }
    }

    if (to.path === from.path) {
      return false
    }

    return { top: 0 }
  }
})

const publicRoutes = isStudioBuild ? ['/login'] : ['/', '/login']
const publicPrefixes = ['/ruzafa-impresora', '/home2', '/overlay', '/post', '/p', '/politica-privacidad', '/terminos-condiciones', '/normas-comunidad', '/politica-cookies', '/contacto-reportes', '/aviso-legal', '/perfil', '/categoria', '/noticias', '/buscar', '/rumores', '/guias', '/comunidad', '/eventos']
let authReady = false
let authUser = null
let authReadyPromise = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    authReady = true
    authUser = user
    resolve(user)
  })
})

onAuthStateChanged(auth, (user) => {
  authReady = true
  authUser = user
})

const getAuthUser = async () => {
  if (!authReady) {
    await authReadyPromise
  }

  return auth.currentUser || authUser
}

router.beforeEach(async (to) => {
  if (isStudioBuild && to.path === '/') return '/admin/dashboard'

  if (to.path === '/login') {
    const user = await getAuthUser()
    return user ? (isStudioBuild ? '/admin/dashboard' : '/') : true
  }

  if (
    publicRoutes.includes(to.path) ||
    publicPrefixes.some(prefix => to.path.startsWith(prefix))
  ) {
    return true
  }

  const user = await getAuthUser()

  if (!user && to.path !== '/login') {
    return '/login'
  }

  if (to.meta.adminOnly) {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const profile = snap.data() || {}
    const role = profile.isBlocked ? 'user' : (profile.role || 'user')

    if (role !== 'admin') {
      return '/'
    }
  }

  if (to.meta.publisherOnly) {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const role = snap.data()?.role || 'user'

    if (!['admin', 'publisher'].includes(role)) {
      return '/'
    }
  }

  return true
})

export default router
