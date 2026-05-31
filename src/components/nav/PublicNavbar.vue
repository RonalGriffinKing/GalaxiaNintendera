<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { auth, db, firebaseConfig } from '@/firebase'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { resetPlayerSession } from '@/services/playerState'
import PostEditor from '@/components/posts/PostEditor.vue'
import PublicCreateSheet from '@/components/nav/PublicCreateSheet.vue'
import NotificationDropdown from '@/components/nav/NotificationDropdown.vue'
import PublicQuickAdminModals from '@/components/nav/PublicQuickAdminModals.vue'
import PublicSearchPanel from '@/components/nav/PublicSearchPanel.vue'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import GlobalThreadComposerLauncher from '@/components/thread/GlobalThreadComposerLauncher.vue'
import { defaultLogoUrl } from '@/constants/assets'
import { DEFAULT_POST_CATEGORIES, loadPostCategories, postCategoryLabels } from '@/services/postCategories'
import {
  DEFAULT_QUICK_THREAD_TOPICS,
  PUBLIC_NAV_LINKS,
  QUICK_THREAD_TOPIC_ICONS,
} from '@/constants/nav'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const mobileAccountOpen = ref(false)
const createMenuOpen = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')
const searchPosts = ref([])
const loadingSearch = ref(false)
const currentUser = ref(auth.currentUser)
const notificationsOpen = ref(false)
const accountMenuOpen = ref(false)
const notifications = ref([])
const isClearingNotifications = ref(false)
const currentRole = ref('user')
const currentCanChat = ref(false)
const confirmLogoutOpen = ref(false)
const isLoggingOut = ref(false)
const currentProfile = ref({})
const notificationButton = ref(null)
const globalThreadLauncher = ref(null)
const quickPostOpen = ref(false)
const quickPostCategories = ref(DEFAULT_POST_CATEGORIES)
const quickCommunityOpen = ref(false)
const quickUserOpen = ref(false)
const quickCreateSaving = ref(false)
const scrollY = ref(0)
const navHidden = ref(false)
const navCompact = ref(false)
const readingProgress = ref(0)
const quickCommunityDraft = ref({
  name: '',
  description: '',
  bannerUrl: '',
  iconUrl: '',
  threadBackgroundUrl: '',
  musicPlaylistUrl: '',
  musicVolume: 35,
  threadTopics: [...DEFAULT_QUICK_THREAD_TOPICS],
  newTopic: ''
})
const quickUserDraft = ref({
  name: '',
  email: '',
  password: '',
  description: '',
  imageUrl: '',
  role: 'user',
  canChat: false
})
let unsubscribeAuth = null
let unsubscribeNotifications = null
let lastScrollY = 0
let scrollTicking = false

const links = PUBLIC_NAV_LINKS
const mobileDrawerLinks = computed(() => links.filter(link => link.to !== '/comunidad'))

const goTo = async (to) => {
  menuOpen.value = false
  mobileAccountOpen.value = false
  createMenuOpen.value = false
  await router.push(to)

  if (to.includes('#')) {
    const hash = to.split('#')[1]
    const target = document.getElementById(hash)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const authLabel = computed(() => {
  if (!currentUser.value) return 'Unete'
  return currentUser.value.displayName || currentUser.value.email || 'Usuario'
})

const unreadCount = computed(() => notifications.value.filter(notification => !notification.read).length)
const isCurrentUserBlocked = computed(() => Boolean(currentProfile.value?.isBlocked))
const canPublish = computed(() => !isCurrentUserBlocked.value && ['admin', 'publisher'].includes(currentRole.value))
const isAdmin = computed(() => currentRole.value === 'admin')
const bottomNavItems = computed(() => PUBLIC_NAV_LINKS)
const bottomNavColumns = computed(() => bottomNavItems.value.length + 1)
const isReadingRoute = computed(() => route.path.startsWith('/post/'))
const mobileNavClass = computed(() => ({
  compact: navCompact.value,
  hidden: navHidden.value,
  reading: isReadingRoute.value,
  'account-open': accountMenuOpen.value
}))
const bottomNavClass = computed(() => ({
  compact: isReadingRoute.value,
  suppressed: menuOpen.value
    || createMenuOpen.value
    || accountMenuOpen.value
    || searchOpen.value
    || notificationsOpen.value
    || quickPostOpen.value
    || quickCommunityOpen.value
    || quickUserOpen.value
}))
const activeBottomIndex = computed(() => {
  const index = bottomNavItems.value.findIndex(item => isActivePath(item.to))
  if (index < 0) return 0
  return index < 2 ? index : index + 1
})
const bottomNavStyle = computed(() => ({
  gridTemplateColumns: `repeat(${bottomNavColumns.value}, minmax(0, 1fr))`,
  '--active-index': activeBottomIndex.value,
  '--bottom-cols': bottomNavColumns.value,
  '--bottom-nav-height': '82px',
  '--mobile-bottom-nav-height': '82px'
}))
const createOptions = computed(() => {
  if (!currentUser.value) {
    return [{ label: 'Crear perfil', icon: 'fas fa-user-plus', to: '/login?mode=register' }]
  }

  return [{ label: 'Crear hilo', icon: 'fas fa-comments', action: 'thread' }]
})
const manageOptions = computed(() => {
  if (!currentUser.value) return []

  const options = []

  if (canPublish.value) {
    options.push(
      { label: 'Gestor global', icon: 'fas fa-table-cells-large', to: '/admin/dashboard' },
      { label: 'Ver posts', icon: 'fas fa-newspaper', to: '/admin/posts' }
    )
  }

  if (isAdmin.value) {
    options.push(
      { label: 'Ver usuarios', icon: 'fas fa-users', to: '/admin/users' },
      { label: 'Ver overlays', icon: 'fas fa-layer-group', to: '/admin/overlays' }
    )
  }

  return options
})
const accountMenuItems = computed(() => {
  return [
    { label: 'Mi perfil', icon: 'far fa-user', to: currentUser.value ? `/perfil/${currentUser.value.uid}` : '/login?mode=register' },
    { label: 'Guardados', icon: 'fas fa-bookmark', to: '/mis-favoritos' },
    { label: 'Comunidades', icon: 'fas fa-users', to: '/comunidad' }
  ]
})
const accountAdminItems = computed(() => {
  if (!currentUser.value || !canPublish.value) return []

  const items = []
  if (isAdmin.value) {
    items.push(
      { label: 'Gestor global', icon: 'fas fa-table-cells-large', to: '/admin/dashboard' },
      { label: 'Crear post', icon: 'fas fa-pen-nib', action: 'post' },
      { label: 'Crear pagina', icon: 'fas fa-file-circle-plus', to: '/admin/posts?section=pages&create=page' },
      { label: 'Crear usuario', icon: 'fas fa-user-gear', action: 'user' },
      { label: 'Crear overlay', icon: 'fas fa-layer-group', to: '/admin/overlays?create=overlay' }
    )
  } else if (canPublish.value) {
    items.push(
      { label: 'Crear post', icon: 'fas fa-pen-nib', action: 'post' },
      { label: 'Mis publicaciones', icon: 'far fa-newspaper', to: '/admin/posts' }
    )
  }

  return items
})
const accountAdminLabel = computed(() => (isAdmin.value ? 'PANEL ADMIN' : canPublish.value ? 'PUBLISHER' : ''))

const filteredPosts = computed(() => {
  const query = normalize(searchQuery.value)
  if (!query) return []

  return searchPosts.value
    .filter(post => {
      const text = normalize(`${post.title || ''} ${post.content || ''} ${postCategoryLabels(post).join(' ')}`)
      return text.includes(query)
    })
    .slice(0, 5)
})

const currentProfileIcon = computed(() => {
  if (!currentUser.value) return ''
  return resolveProfileIcon({
    ...currentProfile.value,
    imageUrl: currentProfile.value.imageUrl || currentUser.value.photoURL || ''
  })
})
const currentProfileIconMeta = computed(() => resolveProfileIconMeta({
  ...currentProfile.value,
  imageUrl: currentProfile.value.imageUrl || currentUser.value?.photoURL || ''
}))
const defaultQuickThreadTopics = DEFAULT_QUICK_THREAD_TOPICS
const normalizeQuickThreadTopics = (items = []) => {
  const seen = new Set()
  const normalized = items
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .map(item => item.slice(0, 24))
    .filter((item) => {
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)

  return normalized.length ? normalized : ['Posts']
}
const getQuickTopicIcon = (topic) => QUICK_THREAD_TOPIC_ICONS[topic] || 'fas fa-hashtag'
const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const loadSearchPosts = async () => {
  if (searchPosts.value.length || loadingSearch.value) return

  loadingSearch.value = true

  try {
    const snap = await getDocs(collection(db, 'posts'))
    searchPosts.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(post => post.status === 'approved' && post.visibility !== 'private' && post.visibility !== 'unlisted' && post.placement !== 'hero' && !post.isMainEntry)
  } finally {
    loadingSearch.value = false
  }
}

const toggleSearch = async () => {
  searchOpen.value = !searchOpen.value
  menuOpen.value = false
  createMenuOpen.value = false

  if (searchOpen.value) {
    await loadSearchPosts()
  }
}

const goSearchResult = (id) => {
  searchOpen.value = false
  searchQuery.value = ''
  router.push(`/post/${id}`)
}

const submitSearch = () => {
  if (filteredPosts.value[0]) {
    goSearchResult(filteredPosts.value[0].id)
  }
}

const isMobileNav = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 859px)').matches
}

const updateScrollNavigation = () => {
  if (typeof window === 'undefined') return
  const nextY = Math.max(0, window.scrollY || 0)
  const delta = nextY - lastScrollY
  const doc = document.documentElement
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)

  scrollY.value = nextY
  navCompact.value = nextY > (isReadingRoute.value ? 8 : 28)
  readingProgress.value = isReadingRoute.value ? Math.min(100, Math.max(0, (nextY / maxScroll) * 100)) : 0

  if (isMobileNav() && !menuOpen.value && !accountMenuOpen.value && !searchOpen.value && !notificationsOpen.value) {
    const hideThreshold = isReadingRoute.value ? 72 : 150
    if (delta > 8 && nextY > hideThreshold) navHidden.value = true
    if (delta < -8 || nextY < 24) navHidden.value = false
  } else {
    navHidden.value = false
  }

  lastScrollY = nextY
  scrollTicking = false
}

const onScrollNavigation = () => {
  if (scrollTicking) return
  scrollTicking = true
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(updateScrollNavigation)
  }
}

const goAccount = () => {
  searchOpen.value = false
  notificationsOpen.value = false
  createMenuOpen.value = false
  menuOpen.value = false
  mobileAccountOpen.value = false

  if (!currentUser.value) {
    router.push('/login?mode=register')
    return
  }

  accountMenuOpen.value = !accountMenuOpen.value
}

const goAccountItem = (to) => {
  menuOpen.value = false
  mobileAccountOpen.value = false
  createMenuOpen.value = false
  searchOpen.value = false
  notificationsOpen.value = false
  accountMenuOpen.value = false
  rememberPublicPath()
  router.push(to)
}

const openAccountOption = async (item) => {
  accountMenuOpen.value = false
  menuOpen.value = false
  mobileAccountOpen.value = false

  if (item.action) {
    await openCreateOption(item)
    return
  }

  if (item.to) {
    goAccountItem(item.to)
  }
}

const rememberPublicPath = () => {
  if (route.path.startsWith('/dashboard') || route.path.startsWith('/admin') || route.path.startsWith('/editor')) return
  sessionStorage.setItem('last-public-path', route.fullPath || '/')
}

const loadUserRole = async (user) => {
  currentRole.value = 'user'
  currentCanChat.value = false
  currentProfile.value = {}
  if (!user) return

  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const data = snap.data() || {}
    currentProfile.value = data
    currentRole.value = data.isBlocked ? 'user' : (data.role || 'user')
    currentCanChat.value = !data.isBlocked && Boolean(data.canChat)
  } catch (error) {
    console.error(error)
  }
}

const syncCurrentProfile = (event) => {
  if (!currentUser.value || event.detail?.uid !== currentUser.value.uid) return
  currentProfile.value = {
    ...currentProfile.value,
    ...(event.detail.profile || {})
  }
  currentRole.value = currentProfile.value.isBlocked ? 'user' : (currentProfile.value.role || currentRole.value || 'user')
  currentCanChat.value = !currentProfile.value.isBlocked && Boolean(currentProfile.value.canChat)
}

const goOwnProfile = () => {
  menuOpen.value = false
  mobileAccountOpen.value = false
  createMenuOpen.value = false
  searchOpen.value = false
  notificationsOpen.value = false
  accountMenuOpen.value = false

  if (!currentUser.value) {
    router.push('/login?mode=register')
    return
  }

  router.push(`/perfil/${currentUser.value.uid}`)
}

const logout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true

  try {
    resetPlayerSession()
    await signOut(auth)
    confirmLogoutOpen.value = false
    accountMenuOpen.value = false
    mobileAccountOpen.value = false
    router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}

const subscribeNotifications = (user) => {
  unsubscribeNotifications?.()
  notifications.value = []

  if (!user) return

  const notificationsQuery = query(
    collection(db, 'users', user.uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(8)
  )

  unsubscribeNotifications = onSnapshot(notificationsQuery, (snap) => {
    notifications.value = snap.docs.map(item => ({
      id: item.id,
      ...item.data()
    }))
  })
}

const toggleNotifications = () => {
  notificationsOpen.value = !notificationsOpen.value
  searchOpen.value = false
  menuOpen.value = false
  createMenuOpen.value = false
  accountMenuOpen.value = false
}

const clearNotifications = async () => {
  const user = currentUser.value
  if (!user || isClearingNotifications.value) return

  isClearingNotifications.value = true

  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'notifications'))
    const batches = []
    let batch = writeBatch(db)
    let operations = 0

    snap.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref)
      operations += 1

      if (operations === 450) {
        batches.push(batch.commit())
        batch = writeBatch(db)
        operations = 0
      }
    })

    if (operations > 0) {
      batches.push(batch.commit())
    }

    await Promise.all(batches)
    notifications.value = []
  } catch (error) {
    console.error(error)
  } finally {
    isClearingNotifications.value = false
  }
}

const toggleMobileMenu = () => {
  menuOpen.value = !menuOpen.value
  mobileAccountOpen.value = false
  createMenuOpen.value = false
  searchOpen.value = false
  notificationsOpen.value = false
  accountMenuOpen.value = false
}

const toggleCreateMenu = () => {
  createMenuOpen.value = !createMenuOpen.value
  menuOpen.value = false
  mobileAccountOpen.value = false
  searchOpen.value = false
  notificationsOpen.value = false
  accountMenuOpen.value = false
}

const resetQuickCommunityDraft = () => {
  quickCommunityDraft.value = {
    name: '',
    description: '',
    bannerUrl: '',
    iconUrl: '',
    threadBackgroundUrl: '',
    musicPlaylistUrl: '',
    musicVolume: 35,
    threadTopics: [...defaultQuickThreadTopics],
    newTopic: ''
  }
}

const resetQuickUserDraft = () => {
  quickUserDraft.value = {
    name: '',
    email: '',
    password: '',
    description: '',
    imageUrl: '',
    role: 'user',
    canChat: false
  }
}

const openGlobalThreadComposer = async () => {
  if (!currentUser.value) {
    await router.push('/login?mode=register')
    return
  }
  if (isCurrentUserBlocked.value) return
  createMenuOpen.value = false
  menuOpen.value = false
  mobileAccountOpen.value = false
  searchOpen.value = false
  notificationsOpen.value = false
  accountMenuOpen.value = false
  globalThreadLauncher.value?.openGlobalThreadComposer()
}

const openCreateOption = async (item) => {
  createMenuOpen.value = false

  if (item.action === 'post') {
    quickPostCategories.value = await loadPostCategories()
    quickPostOpen.value = true
    return
  }

  if (item.action === 'thread') {
    openGlobalThreadComposer()
    return
  }

  if (item.action === 'community') {
    resetQuickCommunityDraft()
    quickCommunityOpen.value = true
    return
  }

  if (item.action === 'user') {
    resetQuickUserDraft()
    quickUserOpen.value = true
    return
  }

  if (item.to) {
    goTo(item.to)
  }
}

const closeQuickCommunity = () => {
  if (quickCreateSaving.value) return
  quickCommunityOpen.value = false
}

const updateQuickCommunityTopic = (index, value) => {
  quickCommunityDraft.value.threadTopics[index] = String(value || '').slice(0, 24)
}

const removeQuickCommunityTopic = (index) => {
  if (quickCommunityDraft.value.threadTopics.length <= 1) return
  quickCommunityDraft.value.threadTopics.splice(index, 1)
}

const addQuickCommunityTopic = () => {
  const topic = quickCommunityDraft.value.newTopic.trim().slice(0, 24)
  if (!topic || quickCommunityDraft.value.threadTopics.length >= 8) return
  const exists = quickCommunityDraft.value.threadTopics.some(item => item.toLowerCase() === topic.toLowerCase())
  if (exists) {
    quickCommunityDraft.value.newTopic = ''
    return
  }
  quickCommunityDraft.value.threadTopics.push(topic)
  quickCommunityDraft.value.newTopic = ''
}

const closeQuickUser = () => {
  if (quickCreateSaving.value) return
  quickUserOpen.value = false
}

const saveQuickCommunity = async () => {
  if (!isAdmin.value || quickCreateSaving.value) return
  const name = quickCommunityDraft.value.name.trim()
  const description = quickCommunityDraft.value.description.trim()
  const threadTopics = normalizeQuickThreadTopics(quickCommunityDraft.value.threadTopics)
  if (!name || !description) return

  quickCreateSaving.value = true
  try {
    const now = Date.now()
    await addDoc(collection(db, 'communities'), {
      name,
      description,
      bannerUrl: quickCommunityDraft.value.bannerUrl.trim(),
      iconUrl: quickCommunityDraft.value.iconUrl.trim(),
      threadBackgroundUrl: quickCommunityDraft.value.threadBackgroundUrl.trim(),
      musicPlaylistUrl: quickCommunityDraft.value.musicPlaylistUrl.trim(),
      musicVolume: Math.min(100, Math.max(0, Number(quickCommunityDraft.value.musicVolume || 35))),
      threadTopics,
      membersCount: 0,
      createdBy: currentUser.value?.uid || '',
      createdAt: now,
      updatedAt: now
    })
    quickCommunityOpen.value = false
  } finally {
    quickCreateSaving.value = false
  }
}

const saveQuickUser = async () => {
  if (!isAdmin.value || quickCreateSaving.value) return
  const name = quickUserDraft.value.name.trim()
  const email = quickUserDraft.value.email.trim()
  const password = quickUserDraft.value.password
  if (!name || !email || !password) return

  quickCreateSaving.value = true
  try {
    const secondaryApp = initializeApp(firebaseConfig, `quick-user-create-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
      await updateProfile(credential.user, {
        displayName: name,
        photoURL: quickUserDraft.value.imageUrl.trim() || null
      })
      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        email,
        description: quickUserDraft.value.description.trim(),
        imageUrl: quickUserDraft.value.imageUrl.trim(),
        provider: 'password',
        role: quickUserDraft.value.role,
        canChat: ['admin', 'publisher'].includes(quickUserDraft.value.role) || Boolean(quickUserDraft.value.canChat),
        adminCreated: true,
        emailVerified: true,
        emailVerificationRequired: false,
        isBlocked: false,
        blockReason: '',
        emailOptIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      await signOut(secondaryAuth)
    } finally {
      await deleteApp(secondaryApp)
    }

    quickUserOpen.value = false
  } finally {
    quickCreateSaving.value = false
  }
}

const isActivePath = (to) => {
  const path = String(to).split('?')[0]
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const formatNotificationDate = (value) => {
  if (!value) return ''
  const time = typeof value === 'number' ? value : value?.toDate?.().getTime?.() || new Date(value).getTime()
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} dia${days === 1 ? '' : 's'}`
}

const openNotification = async (notification) => {
  const user = currentUser.value
  if (!user) return

  if (!notification.read) {
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.id), {
      read: true
    })
  }

  notificationsOpen.value = false
  accountMenuOpen.value = false

  if (notification.targetType === 'post' && notification.targetId) {
    router.push(`/post/${notification.targetId}`)
    return
  }

  if (notification.targetType === 'thread') {
    router.push('/comunidad')
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (!user) resetPlayerSession()
    currentUser.value = user
    await loadUserRole(user)
    subscribeNotifications(user)
  })
  window.addEventListener('galaxy-profile-updated', syncCurrentProfile)
  window.addEventListener('scroll', onScrollNavigation, { passive: true })
  window.addEventListener('resize', updateScrollNavigation)
  updateScrollNavigation()
})

watch([menuOpen, createMenuOpen, accountMenuOpen, quickPostOpen, quickCommunityOpen, quickUserOpen], ([isMenuOpen, isCreateOpen, isAccountOpen, isQuickPostOpen, isQuickCommunityOpen, isQuickUserOpen]) => {
  document.body.style.overflow = isMenuOpen || isCreateOpen || (isAccountOpen && isMobileNav()) || isQuickPostOpen || isQuickCommunityOpen || isQuickUserOpen ? 'hidden' : ''
})

watch(() => route.fullPath, () => {
  navHidden.value = false
  lastScrollY = 0
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(updateScrollNavigation)
  }
})

onUnmounted(() => {
  window.removeEventListener('galaxy-profile-updated', syncCurrentProfile)
  window.removeEventListener('scroll', onScrollNavigation)
  window.removeEventListener('resize', updateScrollNavigation)
  unsubscribeAuth?.()
  unsubscribeNotifications?.()
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <nav class="public-nav" :class="mobileNavClass" :style="{ '--read-progress': `${readingProgress}%` }">
    <div v-if="isReadingRoute" class="mobile-reading-progress" aria-hidden="true"></div>
    <div class="public-nav-inner">
      <div class="public-brand-zone">
        <button class="public-brand" @click="goTo('/')">
          <img :src="defaultLogoUrl" class="public-brand-logo" alt="Galaxia Nintendera" />
          <span>Galaxia Nintendera</span>
        </button>
      </div>

      <div class="public-links">
        <button
          v-for="link in links"
          :key="link.label"
          class="public-nav-link"
          @click="goTo(link.to)"
        >
          {{ link.label }}
        </button>

        <form
          class="public-nav-search"
          :class="{ open: searchOpen }"
          @submit.prevent="submitSearch"
        >
          <button type="button" aria-label="Buscar" @click="toggleSearch">
            <i class="fas fa-search"></i>
          </button>
          <input
            v-if="searchOpen"
            v-model="searchQuery"
            autofocus
            placeholder="Buscar..."
            @focus="loadSearchPosts"
          />
          <button
            v-if="searchOpen"
            class="search-close"
            type="button"
            aria-label="Cerrar busqueda"
            @click="searchOpen = false; searchQuery = ''"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </form>
      </div>

      <div class="public-actions">
        <button class="public-icon public-mobile-search-btn" aria-label="Buscar" @click="toggleSearch">
          <i class="fas fa-search"></i>
        </button>

        <div class="public-profile-nav">
          <button
            v-if="currentUser"
            class="public-icon public-create-thread-desktop"
            type="button"
            aria-label="Crear hilo"
            @click="openGlobalThreadComposer"
          >
            <i class="fas fa-plus"></i>
          </button>

          <button
            v-if="currentUser"
            ref="notificationButton"
            class="public-icon notification-nav-btn"
            aria-label="Notificaciones"
            @click="toggleNotifications"
          >
            <i class="fas fa-bell"></i>
            <strong v-if="unreadCount">{{ unreadCount }}</strong>
          </button>

          <button v-if="currentUser" class="public-account-btn" type="button" @click="goAccount">
            <ProfileAvatar
              class="account-btn-avatar"
              :src="currentProfileIcon"
              :alt="authLabel"
              :label="authLabel"
              :effect="currentProfileIconMeta"
            />
            <span>{{ authLabel }}</span>
            <i class="fas fa-chevron-down"></i>
          </button>

          <button v-if="!currentUser" class="public-mobile-join-top is-login" type="button" @click="goAccountItem('/login?mode=login')">
            <i class="fas fa-right-to-bracket"></i>
            Entrar
          </button>

          <button v-if="!currentUser" class="public-mobile-join-top" type="button" @click="goAccountItem('/login?mode=register')">
            <i class="fas fa-user-plus"></i>
            Unete
          </button>

        </div>

        <button
          v-if="currentUser"
          class="public-menu-toggle"
          type="button"
          aria-label="Abrir opciones de perfil"
          :aria-expanded="accountMenuOpen"
          @click="goAccount"
        >
          <ProfileAvatar
            class="profile-icon-effect-wrap"
            :src="currentProfileIcon"
            :alt="authLabel"
            :label="authLabel"
            :effect="currentProfileIconMeta"
          />
        </button>
      </div>
    </div>

    <PublicSearchPanel
      v-model:query="searchQuery"
      :open="searchOpen"
      :posts="filteredPosts"
      :loading="loadingSearch"
      :mobile-visible="isMobileNav()"
      @close="searchOpen = false"
      @submit="submitSearch"
      @open-post="goSearchResult"
    />

    <NotificationDropdown
      :open="notificationsOpen"
      :anchor-el="notificationButton"
      :notifications="notifications"
      :unread-count="unreadCount"
      :clearing="isClearingNotifications"
      :format-date="formatNotificationDate"
      @clear="clearNotifications"
      @close="notificationsOpen = false"
      @open-notification="openNotification"
    />

    <div v-if="accountMenuOpen" class="public-account-panel" @click.self="accountMenuOpen = false">
        <div class="public-account-card">
        <button class="public-account-close" type="button" aria-label="Cerrar menu de cuenta" @click="accountMenuOpen = false">
          <i class="fas fa-xmark"></i>
        </button>
        <button class="public-account-head" type="button" @click="goOwnProfile">
          <span>
            <ProfileAvatar
              class="profile-icon-effect-wrap"
              :src="currentProfileIcon"
              :alt="authLabel"
              :label="authLabel"
              :effect="currentProfileIconMeta"
            />
          </span>
          <div>
            <strong>{{ authLabel }}</strong>
            <p>{{ currentRole }}</p>
          </div>
        </button>

        <div class="public-account-list">
          <button
            v-for="item in accountMenuItems"
            :key="item.label"
            @click="openAccountOption(item)"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <template v-if="accountAdminItems.length">
          <div class="public-account-role-line">
            <span>{{ accountAdminLabel }}</span>
          </div>

          <div class="public-account-list admin-list">
            <button
              v-for="item in accountAdminItems"
              :key="`admin-${item.label}`"
              @click="openAccountOption(item)"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </template>

        <div class="public-account-actions">
          <button class="danger" @click="confirmLogoutOpen = true; accountMenuOpen = false">
            <i class="fas fa-right-from-bracket"></i>
            Cerrar sesion
          </button>
        </div>

      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmLogoutOpen" class="account-modal">
          <div class="account-backdrop" @click="!isLoggingOut && (confirmLogoutOpen = false)"></div>
          <div class="account-card compact">
            <div class="logout-icon">
              <i class="fas fa-right-from-bracket"></i>
            </div>
            <h2>Cerrar sesion?</h2>
            <p>Volveras a la pantalla de login.</p>
            <div class="logout-actions">
              <button @click="confirmLogoutOpen = false" :disabled="isLoggingOut">Cancelar</button>
              <button class="danger" @click="logout" :disabled="isLoggingOut">
                {{ isLoggingOut ? 'Cerrando...' : 'Cerrar sesion' }}
              </button>
        </div>
      </div>
    </div>

      </Transition>
    </Teleport>

    <Transition name="mobile-drawer">
      <div v-if="menuOpen" class="public-mobile-links" :class="{ 'account-mode': mobileAccountOpen }">
        <div class="mobile-drawer-head">
          <img :src="defaultLogoUrl" alt="Galaxia Nintendera" />
          <button type="button" aria-label="Cerrar menu" @click="menuOpen = false; mobileAccountOpen = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div v-if="currentUser" class="public-mobile-account-block" :class="{ open: mobileAccountOpen }">
          <button class="public-mobile-user-card" type="button" @click="mobileAccountOpen = !mobileAccountOpen">
            <ProfileAvatar
              class="mobile-user-avatar"
              :src="currentProfileIcon"
              :alt="authLabel"
              :label="authLabel"
              :effect="currentProfileIconMeta"
            />
            <div>
              <strong>{{ authLabel }}</strong>
              <small>{{ currentRole }}</small>
            </div>
            <i :class="mobileAccountOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
          </button>

          <Transition name="account-fold">
            <div v-if="mobileAccountOpen" class="public-mobile-account-menu">
              <button
                v-for="item in accountMenuItems"
                :key="item.label"
                class="public-mobile-tool-link"
                @click="openAccountOption(item)"
              >
                <i :class="item.icon"></i>
                {{ item.label }}
              </button>
            </div>
          </Transition>
        </div>

        <Transition name="fade">
          <button
            v-if="mobileAccountOpen"
            class="mobile-account-scrim"
            type="button"
            aria-label="Cerrar opciones de cuenta"
            @click="mobileAccountOpen = false"
          ></button>
        </Transition>

        <div v-if="!currentUser" class="public-mobile-auth-actions">
          <button class="public-mobile-account is-login" @click="goAccountItem('/login?mode=login')">
            <i class="fas fa-right-to-bracket"></i>
            Entrar
          </button>
          <button class="public-mobile-account" @click="goAccountItem('/login?mode=register')">
            <i class="fas fa-user-plus"></i>
            Unete
          </button>
        </div>

        <div class="mobile-primary-links">
          <button
            v-for="link in mobileDrawerLinks"
            :key="link.label"
            class="public-mobile-link"
            @click="goTo(link.to)"
          >
            <i :class="link.icon"></i>
            {{ link.label }}
          </button>
        </div>

        <button
          v-if="currentUser"
          class="public-mobile-logout"
          @click="confirmLogoutOpen = true; menuOpen = false; mobileAccountOpen = false"
        >
          <i class="fas fa-right-from-bracket"></i>
          Cerrar sesion
        </button>
      </div>
    </Transition>

    <PublicCreateSheet
      :open="createMenuOpen"
      :create-options="createOptions"
      :manage-options="manageOptions"
      @close="createMenuOpen = false"
      @select="openCreateOption"
    />

    <Teleport to="body">
      <div class="public-bottom-nav" :class="bottomNavClass" aria-label="Navegacion movil" :style="bottomNavStyle">
        <span class="bottom-nav-indicator" aria-hidden="true"></span>
        <button
          v-for="item in bottomNavItems.slice(0, 2)"
          :key="item.label"
          type="button"
          :class="{ active: isActivePath(item.to) }"
          @click="goTo(item.to)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>

        <button class="bottom-create-btn" type="button" aria-label="Crear hilo" @click="openGlobalThreadComposer">
          <i class="fas fa-plus"></i>
          <span>Hilo</span>
        </button>

        <button
          v-for="item in bottomNavItems.slice(2)"
          :key="item.label"
          type="button"
          :class="{ active: isActivePath(item.to) }"
          @click="goTo(item.to)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </Teleport>

    <PostEditor
      v-if="quickPostOpen"
      :category-options="quickPostCategories"
      @close="quickPostOpen = false"
      @created="quickPostOpen = false"
    />

    <PublicQuickAdminModals
      v-model:community-draft="quickCommunityDraft"
      v-model:user-draft="quickUserDraft"
      :community-open="quickCommunityOpen"
      :user-open="quickUserOpen"
      :saving="quickCreateSaving"
      :get-topic-icon="getQuickTopicIcon"
      @close-community="closeQuickCommunity"
      @close-user="closeQuickUser"
      @save-community="saveQuickCommunity"
      @save-user="saveQuickUser"
      @update-topic="updateQuickCommunityTopic"
      @remove-topic="removeQuickCommunityTopic"
      @add-topic="addQuickCommunityTopic"
    />

    <GlobalThreadComposerLauncher
      ref="globalThreadLauncher"
      :user-role="currentRole"
    />

  </nav>
</template>

<style scoped>
.public-nav {
  background: #050816;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: white;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  transform: translate3d(0, 0, 0);
  transition:
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1),
    background 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
  will-change: transform;
  z-index: 300;
}

.public-nav.account-open {
  z-index: 1400;
}

.mobile-reading-progress {
  background: linear-gradient(90deg, #7c3aed, #ec4899);
  box-shadow: 0 0 14px rgba(168, 85, 247, 0.45);
  height: 2px;
  left: 0;
  position: absolute;
  top: 0;
  transform: scaleX(calc(var(--read-progress, 0%) / 100%));
  transform-origin: left center;
  width: 100%;
  z-index: 4;
}

.public-nav-inner {
  align-items: center;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
  margin: 0 auto;
  max-width: min(1500px, calc(100vw - 48px));
  min-height: 64px;
  padding: 8px 0;
  position: relative;
  transition: min-height 0.24s ease, padding 0.24s ease;
}

.public-brand-zone {
  align-items: center;
  display: inline-flex;
  gap: 12px;
  justify-self: start;
  min-width: 0;
}

.public-brand {
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 10px;
  min-width: 0;
}

.public-brand-logo {
  display: block;
  height: 44px;
  max-width: 58px;
  object-fit: contain;
  transition: height 0.24s ease, max-width 0.24s ease, transform 0.24s ease;
  width: auto;
}

.public-brand span {
  color: #f8fafc;
  display: block;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0;
  line-height: 0.95;
  max-width: 112px;
  text-align: left;
  text-shadow: 0 0 18px rgba(216, 180, 254, 0.34);
  text-transform: uppercase;
}

.public-links {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #ffffff;
  display: none;
  font-size: 13px;
  font-weight: 900;
  gap: 4px;
  justify-self: center;
  padding: 4px;
}

.public-nav-link,
.public-mobile-link {
  transition: background 0.2s ease, color 0.2s ease, transform 0.18s ease;
}

.public-nav-link {
  border-radius: 999px;
  min-height: 34px;
  padding: 0 16px;
}

.public-nav-search {
  align-items: center;
  border-radius: 999px;
  display: inline-grid;
  grid-template-columns: 34px 0 0;
  min-height: 34px;
  overflow: hidden;
  transition: background 0.22s ease, grid-template-columns 0.22s ease, width 0.22s ease;
  width: 34px;
}

.public-nav-search.open {
  background: rgba(5, 8, 22, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.12);
  grid-template-columns: 34px minmax(120px, 180px) 30px;
  width: 248px;
}

.public-nav-search button {
  align-items: center;
  color: #ffffff;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.public-nav-search input {
  background: transparent;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  min-width: 0;
  outline: 0;
}

.public-nav-search input::placeholder {
  color: #94a3b8;
}

.public-nav-search .search-close {
  color: #cbd5e1;
  width: 30px;
}

.public-nav-link:hover,
.public-mobile-link:hover {
  background: rgba(124, 58, 237, 0.28);
  color: #c084fc;
}

.public-actions {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-self: end;
}

.public-profile-nav {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
}

.public-icon {
  align-items: center;
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 15px;
  height: 34px;
  justify-content: center;
  opacity: 0.92;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.18s cubic-bezier(0.2, 0.9, 0.2, 1);
  width: 34px;
}

.public-icon:hover {
  background: rgba(124, 58, 237, 0.24);
}

.public-create-thread-desktop {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(236, 72, 153, 0.88));
  box-shadow: 0 10px 26px rgba(168, 85, 247, 0.22);
}

.public-create-thread-desktop:hover,
.public-create-thread-desktop:focus-visible {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow:
    0 14px 34px rgba(168, 85, 247, 0.34),
    0 0 0 3px rgba(168, 85, 247, 0.16);
}

.public-icon:active,
.public-nav-link:active,
.public-mobile-link:active,
.public-bottom-nav button:active {
  transform: scale(0.94);
}

.public-mobile-search-btn {
  display: none;
}

.public-create-quick-btn {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
}

.public-mobile-join-top {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  box-shadow: 0 10px 28px rgba(236, 72, 153, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  min-height: 38px;
  padding: 0 16px;
  text-transform: uppercase;
  transition: box-shadow 0.18s ease, filter 0.18s ease, transform 0.18s ease;
  white-space: nowrap;
}

.public-mobile-join-top.is-login {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(216, 180, 254, 0.24);
  box-shadow: none;
  color: #f5f3ff;
}

.public-mobile-join-top:hover,
.public-mobile-join-top:focus-visible {
  box-shadow: 0 14px 34px rgba(236, 72, 153, 0.34), 0 0 0 3px rgba(168, 85, 247, 0.18);
  filter: saturate(1.08);
  transform: translateY(-1px);
}

.public-mobile-join-top i {
  font-size: 13px;
}

.notification-nav-btn {
  position: relative;
}

.notification-nav-btn strong {
  align-items: center;
  background: #ef4444;
  border: 2px solid #050816;
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 9px;
  font-weight: 900;
  height: 18px;
  justify-content: center;
  min-width: 18px;
  padding: 0 4px;
  position: absolute;
  right: -2px;
  top: -3px;
}

.public-account-btn {
  align-items: center;
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  max-width: min(210px, 42vw);
  min-height: 34px;
  overflow: hidden;
  padding: 0 12px;
  text-transform: uppercase;
  white-space: nowrap;
}

.public-account-btn > span:not(.account-btn-avatar) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.public-menu-toggle {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  display: none;
  flex: 0 0 auto;
  height: 38px;
  justify-content: center;
  overflow: hidden;
  position: relative;
  width: 38px;
}

.public-menu-toggle[aria-expanded="true"] {
  border-color: rgba(216, 180, 254, 0.78);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18);
}

.public-menu-toggle img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.public-menu-toggle i {
  color: #ffffff;
  font-size: 15px;
}

.account-btn-avatar {
  --avatar-size: 24px;
  --avatar-border: 2px;
}

.profile-icon-effect-wrap {
  --avatar-size: 42px;
  --avatar-border: 2px;
}

.public-account-head img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.public-mobile-links {
  align-content: start;
  background: #050816;
  bottom: 0;
  display: grid;
  gap: 12px;
  left: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 24px;
  position: fixed;
  right: 0;
  top: 64px;
  z-index: 299;
}

.public-mobile-link {
  color: #d1d5db;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.public-mobile-account {
  align-items: center;
  background: #ffffff;
  border-radius: 10px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  text-transform: uppercase;
  width: fit-content;
}

.public-mobile-auth-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.public-mobile-account.is-login {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(216, 180, 254, 0.24);
  color: #ffffff;
}

.public-mobile-account-block {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: grid;
  gap: 10px;
  margin-top: 4px;
  padding-top: 14px;
}

.public-mobile-user-card {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  display: grid;
  gap: 10px;
  grid-template-columns: 54px minmax(0, 1fr);
  min-height: 72px;
  padding: 9px 12px;
}

.public-mobile-user-card .mobile-user-avatar {
  --avatar-size: 54px;
  --avatar-border: 2px;
}

.public-mobile-user-card strong {
  color: #ffffff;
  display: block;
  font-size: 13px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-mobile-user-card small {
  color: #c084fc;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-top: 2px;
  text-transform: uppercase;
}

.public-mobile-tool-link {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #f8fafc;
  display: inline-flex;
  font-size: 13px;
  font-weight: 900;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  text-align: left;
}

.public-mobile-tool-link i {
  color: #c084fc;
  width: 18px;
}

.public-mobile-tool-link.strong {
  background: #ffffff;
  color: #7c3aed;
}

.public-search-box {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr) 28px;
  margin: 0 auto;
  max-width: 720px;
  min-height: 44px;
  padding: 0 12px;
}

.public-search-box input {
  background: transparent;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  min-width: 0;
  outline: none;
}

.public-search-box input::placeholder {
  color: #9ca3af;
}

.public-search-results {
  display: grid;
  gap: 8px;
  margin: 10px auto 0;
  max-width: 720px;
}

.public-search-results button,
.public-search-results p {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 10px;
  color: #111827;
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  text-align: left;
}

.public-search-results span {
  color: #7c3aed;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.public-search-results strong {
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
}

.public-notifications-panel {
  display: flex;
  justify-content: flex-end;
  margin: 0 auto;
  max-width: 1280px;
  padding: 0 24px;
  position: relative;
}

.public-account-panel {
  display: block;
  pointer-events: none;
  position: fixed;
  right: max(18px, calc((100vw - 1280px) / 2 + 24px));
  top: calc(var(--public-nav-offset, 72px) - 10px);
  z-index: 960;
}

.public-account-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
  color: #111827;
  display: grid;
  gap: 12px;
  margin-top: 0;
  padding: 14px;
  pointer-events: auto;
  position: relative;
  right: auto;
  top: auto;
  width: min(320px, calc(100vw - 32px));
}

.public-account-head {
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  display: grid;
  gap: 12px;
  grid-template-columns: 42px minmax(0, 1fr);
  padding-bottom: 12px;
  text-align: left;
  width: 100%;
}

.public-account-head > span {
  align-items: center;
  background: transparent;
  border-radius: 999px;
  display: flex;
  height: 42px;
  justify-content: center;
  overflow: visible;
  width: 42px;
}

.public-account-head > span .profile-icon-effect-wrap {
  --avatar-size: 42px;
  --avatar-border: 2px;
}

.public-account-head strong {
  color: #111827;
  display: block;
  font-size: 14px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-account-head p {
  color: #7c3aed;
  font-size: 10px;
  font-weight: 900;
  margin-top: 2px;
  text-transform: uppercase;
}

.public-account-list {
  display: grid;
  gap: 8px;
}

.public-account-role-line {
  align-items: center;
  color: #c084fc;
  display: grid;
  font-size: 10px;
  font-weight: 950;
  grid-template-columns: minmax(28px, 1fr) auto minmax(28px, 1fr);
  letter-spacing: 0.08em;
  margin: 2px 0;
  text-align: center;
  text-transform: uppercase;
}

.public-account-role-line::before,
.public-account-role-line::after {
  background: rgba(192, 132, 252, 0.22);
  content: '';
  height: 1px;
}

.public-account-role-line span {
  padding: 0 12px;
}

.public-account-list button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  display: grid;
  font-size: 12px;
  font-weight: 900;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr) 12px;
  min-height: 42px;
  padding: 0 12px;
  text-align: left;
}

.public-account-list button i:first-child {
  color: #7c3aed;
}

.public-account-list button i:last-child {
  color: #cbd5e1;
  font-size: 10px;
}

.public-account-actions {
  border-top: 1px solid #f1f5f9;
  display: grid;
  gap: 8px;
  padding-top: 12px;
}

.public-account-actions button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 9px;
  min-height: 40px;
  padding: 0 12px;
}

.public-account-actions .danger {
  background: #fff1f2;
  border-color: #ffe4e6;
  color: #e11d48;
}

.account-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.account-backdrop {
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(16px);
  inset: 0;
  position: absolute;
}

.account-card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
  display: grid;
  gap: 14px;
  max-width: 420px;
  padding: 20px;
  position: relative;
  width: 100%;
}

.account-card.compact {
  max-width: 360px;
  text-align: center;
}

.account-modal-head {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
}

.account-card h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.account-card p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  margin-top: 4px;
}

.logout-actions .danger {
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  min-height: 42px;
  text-transform: uppercase;
}

.logout-icon {
  align-items: center;
  background: #fff1f2;
  border-radius: 999px;
  color: #e11d48;
  display: flex;
  height: 48px;
  justify-content: center;
  justify-self: center;
  width: 48px;
}

.logout-actions {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  margin-top: 4px;
}

.logout-actions button:first-child {
  background: #f1f5f9;
  border-radius: 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.logout-actions .danger {
  background: #e11d48;
}


.public-notifications-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
  color: #111827;
  margin-top: 8px;
  max-height: min(420px, calc(100vh - 84px));
  overflow-y: auto;
  padding: 12px;
  position: absolute;
  right: 24px;
  top: 0;
  width: min(360px, calc(100vw - 32px));
}

.public-notifications-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 6px 6px 10px;
}

.public-notifications-head strong {
  font-size: 14px;
  font-weight: 900;
}

.public-notifications-head span {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 900;
}

.public-notifications-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.public-notifications-actions button {
  background: #f1f5f9;
  border-radius: 10px;
  color: #64748b;
  font-size: 10px;
  font-weight: 900;
  min-height: 30px;
  padding: 0 10px;
  text-transform: uppercase;
}

.public-notifications-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.public-notifications-list {
  display: grid;
  gap: 8px;
}

.public-notification-row {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 8px minmax(0, 1fr);
  padding: 10px;
  text-align: left;
}

.public-notification-row.unread {
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.public-notification-row > span {
  background: #cbd5e1;
  border-radius: 999px;
  height: 8px;
  margin-top: 5px;
  width: 8px;
}

.public-notification-row.unread > span {
  background: #7c3aed;
}

.public-notification-row strong {
  color: #111827;
  display: block;
  font-size: 12px;
  font-weight: 900;
}

.public-notification-row p {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 3px;
}

.public-notification-row small,
.public-notifications-empty {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 900;
}

.public-notifications-empty {
  padding: 18px 8px;
  text-align: center;
}

@media (min-width: 860px) {
  .public-links {
    display: flex;
  }

  .public-search-box {
    display: none;
  }

  .public-mobile-links {
    display: none;
  }
}

@media (max-width: 859px) {
  .public-nav {
    background: rgba(5, 8, 22, 0.86);
    backdrop-filter: blur(18px) saturate(1.25);
    border-bottom-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.18);
  }

  .public-nav.compact {
    background: rgba(5, 8, 22, 0.68);
    border-bottom-color: rgba(168, 85, 247, 0.14);
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.18);
  }

  .public-nav.hidden {
    transform: translate3d(0, calc(-100% - 8px), 0);
  }

  .public-nav.reading.compact {
    background: rgba(5, 8, 22, 0.56);
  }

  .public-nav-inner {
    display: flex;
    justify-content: space-between;
    max-width: none;
    padding: 8px 16px;
  }

  .public-nav.compact .public-nav-inner {
    min-height: 52px;
    padding: 4px 14px;
  }

  .public-brand-zone {
    display: inline-flex;
  }

  .public-brand span {
    display: none;
  }

  .public-nav.compact .public-brand-logo {
    height: 34px;
    max-width: 46px;
    transform: translateY(-1px);
  }

  .public-nav.compact .public-icon {
    height: 32px;
    width: 32px;
  }

  .public-profile-nav {
    background: transparent;
    border: 0;
    padding: 0;
  }

  .notification-nav-btn {
    display: inline-flex;
  }

  .public-create-thread-desktop {
    display: none;
  }

  .public-mobile-search-btn {
    display: inline-flex;
  }

  .public-create-quick-btn {
    display: inline-flex;
  }

  .public-account-btn {
    display: none;
  }

  .public-mobile-join-top {
    display: inline-flex;
  }

  .public-menu-toggle {
    display: inline-flex;
  }

  .public-account-panel {
    align-items: stretch;
    background:
      linear-gradient(90deg, rgba(5, 8, 22, 0.18) 0%, rgba(5, 8, 22, 0.78) 100%),
      rgba(5, 8, 22, 0.58);
    backdrop-filter: blur(10px);
    bottom: 0;
    display: flex;
    justify-content: flex-start;
    left: 0;
    margin: 0;
    max-width: none;
    padding: 0;
    pointer-events: auto;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 960;
  }

  .public-account-card {
    animation: mobile-account-drawer-in 0.24s cubic-bezier(0.2, 0.85, 0.25, 1);
    border: 0;
    border-right: 1px solid rgba(216, 180, 254, 0.2);
    border-radius: 0 24px 24px 0;
    box-shadow: 28px 0 70px rgba(0, 0, 0, 0.38);
    gap: 14px;
    height: 100dvh;
    margin: 0;
    max-height: none;
    overflow-y: auto;
    padding: calc(16px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));
    position: relative;
    right: auto;
    top: auto;
    width: min(86vw, 430px);
  }

  .public-account-close {
    display: flex;
  }

  .public-account-head {
    gap: 12px;
    grid-template-columns: 64px minmax(0, 1fr);
    padding-bottom: 16px;
    padding-right: 42px;
  }

  .public-account-head > span {
    height: 64px;
    width: 64px;
  }

  .public-account-head > span .profile-icon-effect-wrap {
    --avatar-size: 64px;
    --avatar-border: 3px;
  }

  .public-account-head strong {
    font-size: 20px;
    line-height: 1.05;
  }

  .public-account-head p {
    font-size: 13px;
    margin-top: 6px;
  }

  .public-account-list {
    gap: 4px;
  }

  .public-account-role-line {
    font-size: 11px;
    margin: 4px 0;
  }

  .public-account-list button {
    background: transparent;
    border: 0;
    border-radius: 14px;
    font-size: 15px;
    gap: 14px;
    grid-template-columns: 28px minmax(0, 1fr) 14px;
    min-height: 46px;
    padding: 0 8px;
  }

  .public-account-list button i:first-child {
    color: #f8fafc;
    font-size: 19px;
    text-align: center;
  }

  .public-account-list button:hover,
  .public-account-list button:focus-visible {
    background: rgba(168, 85, 247, 0.16);
  }

  .public-account-actions {
    margin-top: auto;
    padding-top: 14px;
  }

  .public-account-actions button {
    border-radius: 14px;
    font-size: 14px;
    min-height: 46px;
  }

  @keyframes mobile-account-drawer-in {
    from {
      opacity: 0;
      transform: translateX(-24px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .public-bottom-nav {
    align-items: center;
    background:
      linear-gradient(180deg, rgba(5, 8, 22, 0.82), rgba(5, 8, 22, 0.72)),
      var(--app-bg, #070816);
    backdrop-filter: blur(22px) saturate(1.25);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.34),
      0 0 34px rgba(168, 85, 247, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    display: grid;
    gap: 2px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    left: 12px !important;
    margin: 0;
    overflow: visible;
    padding: 7px 8px max(7px, env(safe-area-inset-bottom, 0px));
    pointer-events: auto;
    position: fixed !important;
    right: 12px !important;
    transform: translate3d(0, 0, 0);
    transition:
      opacity 0.24s ease,
      transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1),
      padding 0.22s ease,
      background 0.22s ease;
    will-change: transform;
    z-index: 240;
  }

  .public-bottom-nav.thread-open {
    box-shadow:
      0 20px 56px rgba(0, 0, 0, 0.42),
      0 0 42px rgba(168, 85, 247, 0.26),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .public-bottom-nav.compact {
    background: rgba(5, 8, 22, 0.58);
    padding: 5px 8px;
    transform: translate3d(0, 4px, 0) scale(0.985);
  }

  .public-bottom-nav.suppressed {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, 120%, 0) scale(0.96);
  }

  .bottom-nav-indicator {
    background: linear-gradient(90deg, rgba(124, 58, 237, 0.04), rgba(236, 72, 153, 0.9), rgba(124, 58, 237, 0.04));
    border-radius: 999px;
    bottom: 6px;
    box-shadow: 0 0 16px rgba(216, 180, 254, 0.62);
    height: 3px;
    left: 8px;
    pointer-events: none;
    position: absolute;
    transform: translateX(calc(var(--active-index, 0) * 100%));
    transition:
      opacity 0.2s ease,
      transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
    width: calc((100% - 16px) / var(--bottom-cols, 5));
    z-index: 0;
  }

  .bottom-nav-indicator::before {
    background: linear-gradient(90deg, rgba(168, 85, 247, 0.1), #c084fc, #ec4899, rgba(168, 85, 247, 0.1));
    border-radius: inherit;
    content: '';
    display: block;
    height: 100%;
    margin: 0 auto;
    width: 28px;
  }

  .public-bottom-nav button {
    align-items: center;
    background: transparent;
    border-radius: 12px;
    color: #94a3b8;
    display: grid;
    font-size: 10px;
    font-weight: 900;
    gap: 3px;
    justify-items: center;
    min-height: 46px;
    min-width: 0;
    position: relative;
    transition:
      color 0.2s ease,
      text-shadow 0.2s ease,
      transform 0.18s cubic-bezier(0.2, 0.9, 0.2, 1);
    z-index: 1;
  }

  .public-bottom-nav button:hover,
  .public-bottom-nav button:focus-visible {
    background: rgba(255, 255, 255, 0.06);
    color: #f8fafc;
  }

  .public-bottom-nav i {
    font-size: 17px;
  }

  .public-bottom-nav button.active {
    color: #c084fc;
    text-shadow: 0 0 18px rgba(216, 180, 254, 0.46);
  }

  .public-bottom-nav button.active i {
    filter: drop-shadow(0 0 12px rgba(192, 132, 252, 0.5));
  }

  .public-bottom-nav .bottom-create-btn {
    color: #ffffff;
    margin-top: -24px;
  }

  .bottom-create-btn i {
    align-items: center;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    border: 4px solid #050816;
    border-radius: 999px;
    box-shadow:
      0 14px 30px rgba(124, 58, 237, 0.38),
      0 0 0 0 rgba(236, 72, 153, 0.28);
    display: flex;
    font-size: 22px;
    height: 54px;
    justify-content: center;
    animation: bottom-fab-pulse 4.2s ease-in-out infinite;
    transition: box-shadow 0.22s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease;
    width: 54px;
  }

  .bottom-create-btn.open i {
    animation: none;
    background: linear-gradient(135deg, #9333ea, #d946ef);
    box-shadow:
      0 16px 38px rgba(168, 85, 247, 0.55),
      0 0 0 9px rgba(216, 180, 254, 0.1);
    transform: rotate(90deg) scale(1.04);
  }

  .bottom-create-btn:active i {
    transform: scale(0.9);
  }

  @keyframes bottom-fab-pulse {
    0%,
    100% {
      box-shadow:
        0 14px 30px rgba(124, 58, 237, 0.38),
        0 0 0 0 rgba(236, 72, 153, 0.2);
    }

    50% {
      box-shadow:
        0 18px 36px rgba(124, 58, 237, 0.5),
        0 0 0 8px rgba(236, 72, 153, 0.08);
    }
  }
}

.public-bottom-nav {
  display: none;
}

@media (max-width: 859px) {

  .public-bottom-nav {
    display: grid;
  }

  .mobile-create-layer {
    align-items: end;
    display: flex;
    padding: 18px 14px calc(88px + env(safe-area-inset-bottom));
  }
}

@media (max-width: 420px) {
  .public-nav-inner {
    min-height: 58px;
    padding: 8px 16px;
  }

  .public-brand-logo {
    height: 36px;
    max-width: 82px;
  }

  .public-actions {
    gap: 6px;
  }

  .public-account-btn {
    font-size: 10px;
    min-height: 32px;
    max-width: 128px;
    padding: 0 9px;
  }

  .public-mobile-join-top {
    font-size: 11px;
    gap: 6px;
    height: 32px;
    min-height: 32px;
    padding: 0 10px;
    width: auto;
  }

  .public-mobile-join-top i {
    font-size: 12px;
  }

  .public-icon {
    height: 32px;
    width: 32px;
  }

  .public-mobile-links {
    max-height: 100dvh;
    padding: 16px;
    top: 0;
  }

}

.mobile-drawer-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.mobile-drawer-head img {
  height: 70px;
  object-fit: contain;
  width: 112px;
}

.mobile-drawer-head button {
  align-items: center;
  color: #ffffff;
  display: flex;
  font-size: 30px;
  height: 48px;
  justify-content: center;
  width: 48px;
}

.mobile-primary-links,
.public-mobile-account-menu {
  display: grid;
  gap: 8px;
}

.public-mobile-links {
  background:
    radial-gradient(circle at 18% 0%, rgba(124, 58, 237, 0.26), transparent 34%),
    linear-gradient(180deg, #080b18 0%, #050816 100%);
  gap: 22px;
  isolation: isolate;
  padding: 22px 24px 26px;
  top: 0;
}

.public-mobile-links.account-mode {
  overflow: hidden;
}

.public-mobile-links.account-mode .mobile-drawer-head,
.public-mobile-links.account-mode .mobile-primary-links,
.public-mobile-links.account-mode .public-mobile-logout {
  filter: blur(3px);
  opacity: 0.46;
  pointer-events: none;
  transform: scale(0.985);
}

.mobile-drawer-head,
.mobile-primary-links,
.public-mobile-logout {
  position: relative;
  transition: filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  z-index: 1;
}

.mobile-account-scrim {
  background: rgba(5, 8, 22, 0.34);
  border: 0;
  inset: 0;
  position: absolute;
  z-index: 2;
}

.public-mobile-link {
  align-items: center;
  border-radius: 16px;
  color: #f8fafc;
  display: grid;
  font-size: 16px;
  font-weight: 900;
  gap: 16px;
  grid-template-columns: 28px minmax(0, 1fr);
  min-height: 50px;
  padding: 0 14px;
}

.public-mobile-link i {
  color: #a855f7;
  font-size: 18px;
  text-align: center;
}

.public-mobile-link:hover {
  background: linear-gradient(90deg, rgba(124, 58, 237, 0.86), rgba(236, 72, 153, 0.36));
  color: #ffffff;
}

.public-mobile-account-block {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  gap: 0;
  margin: 0;
  overflow: visible;
  padding: 0;
  position: relative;
  z-index: 3;
}

.public-mobile-user-card {
  background: transparent;
  border: 0;
  border-radius: 0;
  grid-template-columns: 58px minmax(0, 1fr) 42px;
  min-height: 86px;
  padding: 12px 14px;
  width: 100%;
}

.public-mobile-user-card .mobile-user-avatar {
  --avatar-size: 58px;
}

.public-mobile-user-card strong {
  font-size: 17px;
}

.public-mobile-user-card small {
  font-size: 12px;
}

.public-mobile-user-card > i {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  justify-self: end;
  width: 42px;
}

.public-mobile-account-menu {
  background: rgba(8, 11, 24, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  left: 0;
  max-height: min(360px, calc(100dvh - 190px));
  overflow-y: auto;
  padding: 8px 12px;
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 4;
}

.public-mobile-tool-link {
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  font-size: 15px;
  gap: 14px;
  min-height: 48px;
  padding: 0 8px;
  width: 100%;
}

.public-mobile-tool-link i {
  font-size: 17px;
  width: 22px;
}

.public-mobile-logout {
  align-items: center;
  align-self: end;
  background: rgba(225, 29, 72, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.26);
  border-radius: 14px;
  color: #fb7185;
  display: flex;
  font-size: 15px;
  font-weight: 950;
  gap: 14px;
  min-height: 54px;
  padding: 0 16px;
}

.public-account-card {
  background: #0b1020;
  border-color: rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
  color: #f8fafc;
}

.public-account-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #ffffff;
  display: none;
  height: 36px;
  justify-content: center;
  position: absolute;
  right: 14px;
  top: 14px;
  width: 36px;
  z-index: 3;
}

.public-account-head {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.public-account-head strong,
.public-account-list button,
.public-account-actions button {
  color: #f8fafc;
}

.public-account-list button,
.public-account-actions button {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.08);
}

.public-account-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.public-account-actions .danger,
.public-mobile-tool-link.danger {
  background: rgba(225, 29, 72, 0.12);
  border-color: rgba(244, 63, 94, 0.24);
  color: #fb7185;
}

@media (max-width: 768px) {
  .public-account-card {
    border-radius: 0 22px 22px 0;
  }

  .public-account-close {
    display: flex;
  }

  .public-account-list button {
    font-size: 15px;
    min-height: 46px;
  }

  .public-account-actions button {
    font-size: 14px;
    min-height: 46px;
  }
}

.mobile-drawer-enter-active,
.mobile-drawer-leave-active,
.account-fold-enter-active,
.account-fold-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mobile-create-backdrop-enter-active,
.mobile-create-backdrop-leave-active {
  transition: opacity 0.22s ease;
}

.mobile-create-backdrop-enter-from,
.mobile-create-backdrop-leave-to {
  opacity: 0;
}

.mobile-drawer-enter-from,
.mobile-drawer-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

.account-fold-enter-from,
.account-fold-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .public-nav,
  .public-nav-inner,
  .public-brand-logo,
  .public-icon,
  .public-bottom-nav,
  .public-bottom-nav button,
  .bottom-nav-indicator,
  .bottom-create-btn i,
  .mobile-reading-progress {
    animation: none !important;
    transition: none !important;
  }
}

</style>
