import { createRouter, createWebHistory } from 'vue-router'

import Home from '@/features/public/pages/Home.vue'
import PublicLayout from '@/shared/layouts/PublicLayout.vue'
import Editor from '@/features/overlay/pages/Editor.vue'
import OverlayView from '@/features/overlay/pages/OverlayView.vue'
import Login from '@/features/auth/pages/Login.vue'
import Dashboard from '@/features/admin/pages/Dashboard.vue'
import { auth, db } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const routes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', component: Home },
      {
        path: 'noticias',
        name: 'news',
        component: () => import('@/features/public/pages/CategoryView.vue')
      },
      {
        path: 'rumores',
        name: 'rumors',
        component: () => import('@/features/public/pages/CategoryView.vue')
      },
      {
        path: 'guias',
        name: 'guides',
        component: () => import('@/features/public/pages/CategoryView.vue')
      },
      {
        path: 'comunidad',
        name: 'community',
        component: () => import('@/features/public/pages/CommunityPage.vue')
      },
      {
        path: 'eventos',
        name: 'events',
        component: () => import('@/features/public/pages/EventsPage.vue')
      },
      {
        path: 'post/:id',
        component: () => import('@/features/public/pages/PostView.vue')
      },
      {
        path: 'perfil/:uid',
        name: 'profile',
        component: () => import('@/features/public/pages/ProfileView.vue')
      },
      {
        path: 'categoria/:category',
        name: 'category',
        component: () => import('@/features/public/pages/CategoryView.vue')
      },
      {
        path: 'mis-favoritos',
        component: () => import('@/features/account/pages/WorkspacePage.vue'),
        props: { panel: 'favorites' }
      },
      {
        path: 'admin/posts',
        component: () => import('@/features/account/pages/WorkspacePage.vue'),
        props: { panel: 'posts' },
        meta: { publisherOnly: true, workspace: true }
      },
      {
        path: 'admin/post-share/:id',
        component: () => import('@/features/admin/pages/PostShareView.vue'),
        meta: { publisherOnly: true }
      },
      {
        path: 'admin/users',
        component: () => import('@/features/account/pages/WorkspacePage.vue'),
        props: { panel: 'users' },
        meta: { adminOnly: true, workspace: true }
      },
      {
        path: 'admin/overlays',
        component: () => import('@/features/account/pages/WorkspacePage.vue'),
        props: { panel: 'overlays' },
        meta: { adminOnly: true, workspace: true }
      }
    ]
  },

  { path: '/dashboard', component: Dashboard },
  { path: '/editor', component: Editor, meta: { adminOnly: true } },
  { path: '/overlay/:id', component: OverlayView },
  { path: '/login', component: Login },
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

const publicRoutes = ['/', '/login']
const publicPrefixes = ['/overlay', '/post', '/perfil', '/categoria', '/noticias', '/rumores', '/guias', '/comunidad', '/eventos']
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

router.beforeEach(async (to, from, next) => {
  if (to.path === '/login') {
    const user = await getAuthUser()
    return next(user ? '/dashboard' : undefined)
  }

  if (
    publicRoutes.includes(to.path) ||
    publicPrefixes.some(prefix => to.path.startsWith(prefix))
  ) {
    return next()
  }

  const user = await getAuthUser()

  if (!user && to.path !== '/login') {
    return next('/login')
  }

  if (to.meta.adminOnly) {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const role = snap.data()?.role || 'user'

    if (role !== 'admin') {
      return next('/')
    }
  }

  if (to.meta.publisherOnly) {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const role = snap.data()?.role || 'user'

    if (!['admin', 'publisher'].includes(role)) {
      return next('/')
    }
  }

  next()
})

export default router
