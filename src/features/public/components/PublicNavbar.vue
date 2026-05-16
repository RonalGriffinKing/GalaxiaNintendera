<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { auth, db, firebaseConfig } from '@/firebase'
import { resolveProfileIcon } from '@/services/profileProgress'
import { resetPlayerSession } from '@/services/playerState'
import PostEditor from '@/features/admin/components/PostEditor.vue'
import ThreadComposer from '@/features/public/components/ThreadComposer.vue'
import GalaxyLoader from '@/shared/components/GalaxyLoader.vue'
import { DEFAULT_POST_CATEGORIES, loadPostCategories, postCategoryLabels } from '@/services/postCategories'

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
const quickPostOpen = ref(false)
const quickPostCategories = ref(DEFAULT_POST_CATEGORIES)
const quickThreadOpen = ref(false)
const quickCommunityOpen = ref(false)
const quickUserOpen = ref(false)
const quickCreateSaving = ref(false)
const quickThreadText = ref('')
const quickThreadImageUrl = ref('')
const quickThreadSpoiler = ref(false)
const quickThreadTopic = ref('Posts')
const quickThreadCommunityId = ref('')
const quickThreadPollOpen = ref(false)
const quickThreadPollOptions = ref(['', ''])
const quickThreadEmojiOpen = ref(false)
const quickThreadStickerOpen = ref(false)
const quickThreadContextLoading = ref(false)
const quickThreadCommunityPickerOpen = ref(false)
const quickThreadTopicPickerOpen = ref(false)
const quickCommunities = ref([])
const quickJoinedCommunityIds = ref([])
const quickStickerPool = ['⭐', '🔥', '🎮', '👾', '💥', '🟣', '🌟', '🧠', '💜', '🎯']
const quickEmojiPool = ['😀', '😂', '😍', '😎', '🤯', '😭', '🥳', '🤔']
const quickCommunityDraft = ref({
  name: '',
  description: '',
  bannerUrl: '',
  iconUrl: '',
  threadBackgroundUrl: '',
  musicPlaylistUrl: '',
  musicVolume: 35,
  threadTopics: ['Posts', 'Fanarts', 'Guias', 'Trucos', 'Preguntas', 'Clips', 'Eventos'],
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

const links = [
  { label: 'Inicio', icon: 'fas fa-house', to: '/' },
  { label: 'Noticias', icon: 'fas fa-newspaper', to: '/noticias' },
  { label: 'Eventos', icon: 'far fa-calendar', to: '/eventos' },
  { label: 'Comunidades', icon: 'fas fa-users', to: '/comunidad' }
]
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
const canPublish = computed(() => ['admin', 'publisher'].includes(currentRole.value))
const isAdmin = computed(() => currentRole.value === 'admin')
const bottomNavItems = computed(() => [
  { label: 'Inicio', icon: 'fas fa-house', to: '/' },
  { label: 'Noticias', icon: 'fas fa-newspaper', to: '/noticias' },
  { label: 'Eventos', icon: 'far fa-calendar', to: '/eventos' },
  { label: 'Comunidades', icon: 'fas fa-users', to: '/comunidad' }
])
const bottomNavColumns = computed(() => bottomNavItems.value.length + 1)
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
    options.push({ label: 'Ver posts', icon: 'fas fa-newspaper', to: '/admin/posts' })
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
    { label: 'Mis publicaciones', icon: 'far fa-newspaper', to: canPublish.value ? '/admin/posts' : currentUser.value ? `/perfil/${currentUser.value.uid}` : '/login?mode=register' },
    { label: 'Guardados', icon: 'fas fa-bookmark', to: '/mis-favoritos' },
    { label: 'Comunidades', icon: 'fas fa-users', to: '/comunidad' }
  ]
})
const accountAdminItems = computed(() => {
  if (!currentUser.value || !canPublish.value) return []

  const items = []
  if (canPublish.value) {
    items.push({ label: 'Crear post', icon: 'fas fa-pen-nib', action: 'post' })
  }

  if (isAdmin.value) {
    items.push(
      { label: 'Crear comunidad', icon: 'fas fa-people-group', action: 'community' },
      { label: 'Crear evento', icon: 'far fa-calendar-plus', to: '/eventos?create=event' },
      { label: 'Crear usuario', icon: 'fas fa-user-gear', action: 'user' },
      { label: 'Ver usuarios', icon: 'fas fa-users-gear', to: '/admin/users' },
      { label: 'Ver overlays', icon: 'fas fa-layer-group', to: '/admin/overlays' }
    )
  }

  return items
})
const accountAdminLabel = computed(() => (isAdmin.value ? 'Admin' : canPublish.value ? 'Publicador' : ''))

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
const availableThreadStickers = computed(() => {
  const unlockedCount = Math.max(1, Number(currentProfile.value?.unlockedIcons?.length || 1))
  return quickStickerPool.slice(0, Math.min(quickStickerPool.length, unlockedCount))
})
const selectedThreadCommunity = computed(() => quickCommunities.value.find(item => item.id === quickThreadCommunityId.value) || null)
const hasJoinedThreadCommunity = computed(() => quickJoinedCommunityIds.value.includes(quickThreadCommunityId.value))
const quickThreadImagePreview = computed(() => quickThreadImageUrl.value.trim())
const currentRouteCommunityId = computed(() => (route.path === '/comunidad' ? String(route.query.id || '') : ''))
const quickThreadContextReady = computed(() => !quickThreadContextLoading.value && Boolean(selectedThreadCommunity.value))
const quickThreadContextEmpty = computed(() => !quickThreadContextLoading.value && !selectedThreadCommunity.value)
const defaultQuickThreadTopics = ['Posts', 'Fanarts', 'Guias', 'Trucos', 'Preguntas', 'Clips', 'Eventos']
const quickThreadTopicIcons = {
  Posts: 'far fa-comment',
  Fanarts: 'fas fa-pen-nib',
  Guias: 'far fa-book-open',
  Trucos: 'far fa-lightbulb',
  Preguntas: 'far fa-circle-question',
  Clips: 'fas fa-clapperboard',
  Eventos: 'far fa-calendar'
}
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
const getQuickTopicIcon = (topic) => quickThreadTopicIcons[topic] || 'fas fa-hashtag'
const getQuickTopicLabel = (topic) => (topic === 'Posts' ? 'Hilos' : topic)
const quickThreadTopics = computed(() => normalizeQuickThreadTopics(selectedThreadCommunity.value?.threadTopics || defaultQuickThreadTopics).map(topic => ({
  label: topic,
  displayLabel: getQuickTopicLabel(topic),
  icon: getQuickTopicIcon(topic)
})))
const fallbackThreadTopics = [
  { label: 'Posts', icon: 'far fa-comment' },
  { label: 'Fanarts', icon: 'fas fa-pen-nib' },
  { label: 'Guias', icon: 'far fa-book-open' },
  { label: 'Trucos', icon: 'far fa-lightbulb' },
  { label: 'Preguntas', icon: 'far fa-circle-question' },
  { label: 'Clips', icon: 'fas fa-clapperboard' },
  { label: 'Eventos', icon: 'far fa-calendar' }
]
const selectedThreadTopicMeta = computed(() => quickThreadTopics.value.find(topic => topic.label === quickThreadTopic.value) || quickThreadTopics.value[0] || fallbackThreadTopics[0])
const canPublishThread = computed(() => Boolean(
  quickThreadText.value.trim()
  && selectedThreadCommunity.value
  && hasJoinedThreadCommunity.value
))
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
      .filter(post => post.status === 'approved' && post.placement !== 'hero' && !post.isMainEntry)
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
  if (route.path.startsWith('/dashboard') || route.path.startsWith('/editor')) return
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
    currentRole.value = data.role || 'user'
    currentCanChat.value = Boolean(data.canChat)
  } catch (error) {
    console.error(error)
  }
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

const resetQuickThreadDraft = () => {
  quickThreadText.value = ''
  quickThreadImageUrl.value = ''
  quickThreadSpoiler.value = false
  quickThreadTopic.value = 'Posts'
  quickThreadPollOpen.value = false
  quickThreadPollOptions.value = ['', '']
  quickThreadEmojiOpen.value = false
  quickThreadStickerOpen.value = false
  quickThreadCommunityPickerOpen.value = false
  quickThreadTopicPickerOpen.value = false
}

const closeQuickThread = () => {
  if (quickCreateSaving.value) return
  quickThreadOpen.value = false
  quickThreadContextLoading.value = false
  quickThreadCommunityPickerOpen.value = false
  quickThreadTopicPickerOpen.value = false
}

const openQuickThreadComposer = async () => {
  if (!currentUser.value) {
    await router.push('/login?mode=register')
    return
  }

  createMenuOpen.value = false
  quickThreadOpen.value = true
}

const loadQuickThreadContext = async () => {
  const user = currentUser.value
  if (!user) return

  quickThreadContextLoading.value = true
  const [communitiesSnap, joinedSnap] = await Promise.all([
    getDocs(collection(db, 'communities')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'users', user.uid, 'communities')).catch(() => ({ docs: [] })),
    new Promise(resolve => setTimeout(resolve, 320))
  ])

  quickCommunities.value = communitiesSnap.docs.map(item => ({ id: item.id, ...item.data() }))
  quickJoinedCommunityIds.value = joinedSnap.docs.map(item => item.id)
  const routeCommunityId = currentRouteCommunityId.value
  const routeCommunityExists = routeCommunityId && quickCommunities.value.some(community => community.id === routeCommunityId)
  quickThreadCommunityId.value = routeCommunityExists
    ? routeCommunityId
    : quickJoinedCommunityIds.value[0] || quickCommunities.value[0]?.id || ''
  quickThreadContextLoading.value = false
}

const selectQuickThreadCommunity = (community) => {
  if (!community?.id) return
  quickThreadCommunityId.value = community.id
  const communityTopics = normalizeQuickThreadTopics(community.threadTopics || defaultQuickThreadTopics)
  if (!communityTopics.includes(quickThreadTopic.value)) {
    quickThreadTopic.value = communityTopics[0]
  }
  quickThreadCommunityPickerOpen.value = false
}

const selectQuickThreadTopic = (topic) => {
  quickThreadTopic.value = topic
  quickThreadTopicPickerOpen.value = false
}

const joinThreadCommunity = async () => {
  const user = currentUser.value
  const community = selectedThreadCommunity.value
  if (!user || !community || hasJoinedThreadCommunity.value || quickCreateSaving.value) return

  quickCreateSaving.value = true
  try {
    const now = Date.now()
    await Promise.all([
      setDoc(doc(db, 'users', user.uid, 'communities', community.id), {
        communityId: community.id,
        name: community.name || '',
        description: community.description || '',
        bannerUrl: community.bannerUrl || '',
        iconUrl: community.iconUrl || '',
        role: 'Miembro',
        joinedAt: now,
        updatedAt: now
      }, { merge: true }),
      setDoc(doc(db, 'communities', community.id, 'members', user.uid), {
        uid: user.uid,
        name: currentProfile.value?.name || user.displayName || user.email || 'Usuario',
        imageUrl: currentProfileIcon.value || '',
        joinedAt: now,
        updatedAt: now
      }, { merge: true }),
      updateDoc(doc(db, 'communities', community.id), {
        membersCount: increment(1),
        updatedAt: now
      }).catch(() => {})
    ])
    quickJoinedCommunityIds.value = [...new Set([...quickJoinedCommunityIds.value, community.id])]
  } finally {
    quickCreateSaving.value = false
  }
}

const toggleThreadPoll = () => {
  quickThreadPollOpen.value = !quickThreadPollOpen.value
  if (!quickThreadPollOpen.value) {
    quickThreadPollOptions.value = ['', '']
  }
}

const addThreadEmoji = (emoji) => {
  quickThreadText.value = `${quickThreadText.value}${quickThreadText.value ? ' ' : ''}${emoji}`.slice(0, 240)
  quickThreadEmojiOpen.value = false
}

const addThreadSticker = (sticker) => {
  quickThreadText.value = `${quickThreadText.value}${quickThreadText.value ? ' ' : ''}${sticker}`.slice(0, 240)
  quickThreadStickerOpen.value = false
}

const pasteQuickThreadImageUrl = async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim()
    if (!/^https?:\/\/\S+$/i.test(text)) return
    quickThreadImageUrl.value = text
  } catch (error) {
    console.error(error)
  }
}

const publishQuickThread = async () => {
  const user = currentUser.value
  const community = selectedThreadCommunity.value
  const body = quickThreadText.value.trim()
  if (!user || !community || !body || !hasJoinedThreadCommunity.value || quickCreateSaving.value) return
  const communityTopics = normalizeQuickThreadTopics(community.threadTopics || defaultQuickThreadTopics)
  const threadTopic = communityTopics.includes(quickThreadTopic.value) ? quickThreadTopic.value : communityTopics[0]

  const pollOptions = quickThreadPollOpen.value
    ? quickThreadPollOptions.value.map(item => item.trim()).filter(Boolean).slice(0, 4)
    : []

  quickCreateSaving.value = true
  try {
    const now = Date.now()
    await addDoc(collection(db, 'communityThreads'), {
      communityId: community.id,
      communityName: community.name || '',
      authorId: user.uid,
      author: currentProfile.value?.name || user.displayName || user.email || 'Usuario',
      authorImage: currentProfileIcon.value || '',
      handle: '@tu_usuario',
      topic: threadTopic,
      title: body.length > 72 ? `${body.slice(0, 72)}...` : body,
      body,
      imageUrl: quickThreadImageUrl.value.trim(),
      spoiler: quickThreadSpoiler.value,
      poll: pollOptions.length ? { options: pollOptions, votes: {} } : null,
      replies: 0,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: now,
      updatedAt: now
    })
    resetQuickThreadDraft()
    quickThreadOpen.value = false
  } finally {
    quickCreateSaving.value = false
  }
}

const openCreateOption = async (item) => {
  createMenuOpen.value = false

  if (item.action === 'post') {
    quickPostCategories.value = await loadPostCategories()
    quickPostOpen.value = true
    return
  }

  if (item.action === 'thread') {
    openQuickThreadComposer()
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
        role: quickUserDraft.value.role,
        canChat: ['admin', 'publisher'].includes(quickUserDraft.value.role) || Boolean(quickUserDraft.value.canChat),
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
  window.addEventListener('open-quick-thread-composer', openQuickThreadComposer)
})

watch([menuOpen, createMenuOpen, accountMenuOpen, quickPostOpen, quickThreadOpen, quickCommunityOpen, quickUserOpen], ([isMenuOpen, isCreateOpen, isAccountOpen, isQuickPostOpen, isQuickThreadOpen, isQuickCommunityOpen, isQuickUserOpen]) => {
  document.body.style.overflow = isMenuOpen || isCreateOpen || (isAccountOpen && isMobileNav()) || isQuickPostOpen || isQuickThreadOpen || isQuickCommunityOpen || isQuickUserOpen ? 'hidden' : ''
})

watch(selectedThreadCommunity, (community) => {
  if (!community) return
  const communityTopics = normalizeQuickThreadTopics(community.threadTopics || defaultQuickThreadTopics)
  if (!communityTopics.includes(quickThreadTopic.value)) {
    quickThreadTopic.value = communityTopics[0]
  }
})

onUnmounted(() => {
  window.removeEventListener('open-quick-thread-composer', openQuickThreadComposer)
  unsubscribeAuth?.()
  unsubscribeNotifications?.()
  document.body.style.overflow = ''
})
</script>

<template>
  <nav class="public-nav">
    <div class="public-nav-inner">
      <div class="public-brand-zone">
        <button class="public-brand" @click="goTo('/')">
          <img src="/src/iconos/logo.png" class="public-brand-logo" alt="Galaxia Nintendera" />
          <span>Galaxia Nintendera</span>
        </button>
        <div class="public-live-slot"></div>
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
            class="public-icon notification-nav-btn"
            aria-label="Notificaciones"
            @click="toggleNotifications"
          >
            <i class="fas fa-bell"></i>
            <strong v-if="unreadCount">{{ unreadCount }}</strong>
          </button>

          <button v-if="currentUser" class="public-account-btn" type="button" @click="goAccount">
            <span class="account-btn-avatar">
              <img v-if="currentProfileIcon" :src="currentProfileIcon" alt="" class="profile-icon-img" />
              <i v-else class="fas fa-user"></i>
            </span>
            <span>{{ authLabel }}</span>
            <i class="fas fa-chevron-down"></i>
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
          <img v-if="currentProfileIcon" :src="currentProfileIcon" alt="" class="profile-icon-img" />
          <i v-else class="fas fa-user"></i>
        </button>
      </div>
    </div>

    <div v-if="searchOpen && (searchQuery || isMobileNav())" class="public-search-panel">
      <form class="public-search-box" @submit.prevent="submitSearch">
        <i class="fas fa-search"></i>
        <input
          v-model="searchQuery"
          autofocus
          placeholder="Buscar noticias, guias o rumores..."
        />
        <button type="button" @click="searchOpen = false">
          <i class="fas fa-xmark"></i>
        </button>
      </form>

      <div v-if="searchQuery" class="public-search-results">
        <button
          v-for="post in filteredPosts"
          :key="post.id"
          @click="goSearchResult(post.id)"
        >
          <span>{{ post.category || 'General' }}</span>
          <strong>{{ post.title }}</strong>
        </button>

        <p v-if="!filteredPosts.length && !loadingSearch">
          No hay resultados para esa busqueda.
        </p>

        <p v-if="loadingSearch">
          Buscando...
        </p>
      </div>
    </div>

    <div v-if="notificationsOpen" class="public-notifications-panel">
      <div class="public-notifications-card">
        <div class="public-notifications-head">
          <strong>Notificaciones</strong>
          <div class="public-notifications-actions">
            <button
              v-if="notifications.length"
              type="button"
              :disabled="isClearingNotifications"
              @click="clearNotifications"
            >
              {{ isClearingNotifications ? 'Limpiando...' : 'Limpiar' }}
            </button>
            <span>{{ unreadCount }} nuevas</span>
          </div>
        </div>

        <div v-if="notifications.length" class="public-notifications-list">
          <button
            v-for="notification in notifications"
            :key="notification.id"
            class="public-notification-row"
            :class="{ unread: !notification.read }"
            @click="openNotification(notification)"
          >
            <span></span>
            <div>
              <strong>{{ notification.title }}</strong>
              <p>{{ notification.message }}</p>
              <small>{{ formatNotificationDate(notification.createdAt) }}</small>
            </div>
          </button>
        </div>

        <p v-else class="public-notifications-empty">
          No tienes notificaciones nuevas.
        </p>
      </div>
    </div>

    <div v-if="accountMenuOpen" class="public-account-panel" @click.self="accountMenuOpen = false">
        <div class="public-account-card">
        <button class="public-account-head" type="button" @click="goOwnProfile">
          <span>
            <img v-if="currentProfileIcon" :src="currentProfileIcon" alt="" class="profile-icon-img" />
            <i v-else class="fas fa-user"></i>
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
          <img src="/src/iconos/logo.png" alt="Galaxia Nintendera" />
          <button type="button" aria-label="Cerrar menu" @click="menuOpen = false; mobileAccountOpen = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div v-if="currentUser" class="public-mobile-account-block" :class="{ open: mobileAccountOpen }">
          <button class="public-mobile-user-card" type="button" @click="mobileAccountOpen = !mobileAccountOpen">
            <span>
              <img v-if="currentProfileIcon" :src="currentProfileIcon" alt="" class="profile-icon-img" />
              <i v-else class="fas fa-user"></i>
            </span>
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

        <button v-if="!currentUser" class="public-mobile-account" @click="goAccountItem('/login?mode=register')">
          <i class="fas fa-user-plus"></i>
          Unete
        </button>

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

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="createMenuOpen" class="mobile-create-layer">
          <button class="mobile-create-backdrop" type="button" aria-label="Cerrar crear" @click="createMenuOpen = false"></button>
          <section class="mobile-create-sheet">
            <div class="mobile-create-head">
              <strong>Crear</strong>
              <button type="button" aria-label="Cerrar crear" @click="createMenuOpen = false">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <button
              v-for="item in createOptions"
              :key="item.label"
              type="button"
              class="mobile-create-option"
              @click="openCreateOption(item)"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
              <i class="fas fa-chevron-right"></i>
            </button>

            <template v-if="manageOptions.length">
              <div class="mobile-create-subtitle">Gestionar</div>
              <button
                v-for="item in manageOptions"
                :key="`manage-${item.label}`"
                type="button"
                class="mobile-create-option secondary"
                @click="openCreateOption(item)"
              >
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
                <i class="fas fa-chevron-right"></i>
              </button>
            </template>
          </section>
        </div>
      </Transition>
    </Teleport>

    <div class="public-bottom-nav" aria-label="Navegacion movil" :style="{ gridTemplateColumns: `repeat(${bottomNavColumns}, minmax(0, 1fr))` }">
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

      <button class="bottom-create-btn" type="button" aria-label="Crear hilo" @click="openQuickThreadComposer">
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

    <PostEditor
      v-if="quickPostOpen"
      :category-options="quickPostCategories"
      @close="quickPostOpen = false"
      @created="quickPostOpen = false"
    />

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="quickThreadOpen" class="quick-create-modal thread-composer-modal">
          <button class="quick-create-backdrop" type="button" @click="quickThreadOpen = false"></button>
          <ThreadComposer
            variant="modal"
            :initial-community-id="currentRouteCommunityId"
            :user-role="currentRole"
            autofocus
            @close="quickThreadOpen = false"
            @published="quickThreadOpen = false"
          />
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="false && quickThreadOpen" class="quick-create-modal quick-thread-modal">
          <button class="quick-create-backdrop" type="button" @click="closeQuickThread"></button>
          <section
            class="quick-create-card quick-thread-card"
            :class="{ 'loading-context': !quickThreadContextReady }"
          >
            <div class="quick-create-head quick-thread-head">
              <strong>Nueva publicacion</strong>
              <button type="button" @click="closeQuickThread">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div v-if="!quickThreadContextReady" class="quick-thread-loading">
              <GalaxyLoader
                compact
                :title="quickThreadContextEmpty ? 'No hay comunidad disponible' : 'Preparando publicacion'"
                :text="quickThreadContextEmpty ? 'Unete o crea una comunidad antes de publicar un hilo.' : 'Detectando la comunidad donde vas a crear el hilo...'"
              />
            </div>

            <template v-else>
              <div class="quick-thread-body">
                <div class="quick-thread-destination-row">
                  <div class="quick-thread-picker-wrap community">
                    <div class="quick-thread-context">
                      <button
                        class="quick-thread-community-trigger"
                        type="button"
                        :aria-expanded="quickThreadCommunityPickerOpen"
                        @click="quickThreadCommunityPickerOpen = !quickThreadCommunityPickerOpen; quickThreadTopicPickerOpen = false"
                      >
                        <span>
                          <img v-if="selectedThreadCommunity.iconUrl" :src="selectedThreadCommunity.iconUrl" alt="" />
                          <b v-else>{{ selectedThreadCommunity.name.slice(0, 2).toUpperCase() }}</b>
                        </span>
                      </button>
                      <div>
                        <small>Publicando en</small>
                        <strong>{{ selectedThreadCommunity.name }}</strong>
                      </div>
                      <button
                        class="quick-thread-picker-toggle"
                        type="button"
                        :aria-expanded="quickThreadCommunityPickerOpen"
                        @click="quickThreadCommunityPickerOpen = !quickThreadCommunityPickerOpen; quickThreadTopicPickerOpen = false"
                      >
                        <i :class="quickThreadCommunityPickerOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                      </button>
                    </div>

                    <div v-if="quickThreadCommunityPickerOpen" class="quick-thread-floating-picker community-picker">
                      <button
                        v-for="community in quickCommunities"
                        :key="community.id"
                        type="button"
                        :class="{ active: community.id === quickThreadCommunityId }"
                        @click="selectQuickThreadCommunity(community)"
                      >
                        <span>
                          <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
                          <b v-else>{{ community.name.slice(0, 2).toUpperCase() }}</b>
                        </span>
                        <strong>{{ community.name }}</strong>
                        <small>{{ community.membersCount || 0 }} miembros</small>
                      </button>
                    </div>
                  </div>

                  <div class="quick-thread-picker-wrap topic">
                    <button
                      class="quick-thread-topic-chip"
                      type="button"
                      :aria-expanded="quickThreadTopicPickerOpen"
                      @click="quickThreadTopicPickerOpen = !quickThreadTopicPickerOpen; quickThreadCommunityPickerOpen = false"
                    >
                      <span>
                        <i :class="selectedThreadTopicMeta.icon"></i>
                      </span>
                      <div>
                        <small>Seccion</small>
                        <strong>{{ selectedThreadTopicMeta.displayLabel || selectedThreadTopicMeta.label }}</strong>
                      </div>
                      <i :class="quickThreadTopicPickerOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                    </button>

                    <div v-if="quickThreadTopicPickerOpen" class="quick-thread-floating-picker topic-picker">
                      <button
                        v-for="topic in quickThreadTopics"
                        :key="topic.label"
                        type="button"
                        :class="{ active: topic.label === quickThreadTopic }"
                        @click="selectQuickThreadTopic(topic.label)"
                      >
                        <span><i :class="topic.icon"></i></span>
                        <strong>{{ topic.displayLabel }}</strong>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  v-if="selectedThreadCommunity && !hasJoinedThreadCommunity"
                  class="quick-thread-join"
                  type="button"
                  :disabled="quickCreateSaving"
                  @click="joinThreadCommunity"
                >
                  {{ quickCreateSaving ? 'Uniendote...' : 'Unirme a la comunidad' }}
                </button>

                <p v-if="selectedThreadCommunity && !hasJoinedThreadCommunity" class="quick-thread-alert">
                  Primero unete a {{ selectedThreadCommunity.name }} para poder publicar.
                </p>

                <div class="quick-thread-composer">
                  <span class="quick-thread-avatar">
                    <img v-if="currentProfileIcon" :src="currentProfileIcon" alt="" />
                    <b v-else>{{ (authLabel || 'U').charAt(0).toUpperCase() }}</b>
                  </span>
                  <div class="quick-thread-input-wrap">
                    <textarea
                      v-model="quickThreadText"
                      maxlength="240"
                      rows="3"
                      :placeholder="`¿Que quieres compartir sobre ${selectedThreadCommunity?.name || 'esta comunidad'} hoy?`"
                    ></textarea>
                  </div>
                </div>

                <div class="quick-thread-image-actions">
                  <button type="button" @click="pasteQuickThreadImageUrl">
                    <i class="far fa-clipboard"></i>
                    Pegar URL imagen
                  </button>
                  <button v-if="quickThreadImageUrl" type="button" class="clear" @click="quickThreadImageUrl = ''">
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>

                <figure v-if="quickThreadImagePreview" class="quick-thread-image-preview">
                  <img :src="quickThreadImagePreview" alt="" />
                </figure>

                <div class="quick-thread-tools">
                  <button type="button" :class="{ active: quickThreadPollOpen }" @click="toggleThreadPoll"><i class="fas fa-chart-simple"></i> Encuesta</button>
                  <button type="button" :class="{ active: quickThreadEmojiOpen }" @click="quickThreadEmojiOpen = !quickThreadEmojiOpen; quickThreadStickerOpen = false"><i class="far fa-face-smile"></i> Emoji</button>
                  <button type="button" :class="{ active: quickThreadStickerOpen }" @click="quickThreadStickerOpen = !quickThreadStickerOpen; quickThreadEmojiOpen = false"><i class="fas fa-star"></i> Sticker</button>
                  <button type="button" :class="{ active: quickThreadSpoiler }" @click="quickThreadSpoiler = !quickThreadSpoiler"><i class="fas fa-eye-slash"></i> Spoiler</button>
                </div>

                <div v-if="quickThreadPollOpen" class="quick-picker-grid">
                  <input v-model="quickThreadPollOptions[0]" placeholder="Opcion 1" />
                  <input v-model="quickThreadPollOptions[1]" placeholder="Opcion 2" />
                </div>

                <div v-if="quickThreadEmojiOpen" class="quick-picker-grid">
                  <button v-for="emoji in quickEmojiPool" :key="emoji" type="button" class="quick-icon-btn" @click="addThreadEmoji(emoji)">
                    {{ emoji }}
                  </button>
                </div>

                <div v-if="quickThreadStickerOpen" class="quick-picker-grid">
                  <button v-for="sticker in availableThreadStickers" :key="sticker" type="button" class="quick-icon-btn" @click="addThreadSticker(sticker)">
                    {{ sticker }}
                  </button>
                </div>
              </div>

              <div class="quick-thread-footer">
                <span>{{ quickThreadText.length }}/240</span>
                <button
                  class="quick-create-submit"
                  type="button"
                  :disabled="quickCreateSaving || !canPublishThread"
                  @click="publishQuickThread"
                >
                  {{ quickCreateSaving ? 'Publicando...' : 'Publicar hilo' }}
                </button>
              </div>
            </template>

            <Transition name="fade">
              <div v-if="quickCreateSaving" class="quick-loading-cover">
                <GalaxyLoader compact title="Guardando" text="Terminando la accion en la galaxia..." />
              </div>
            </Transition>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="quickCommunityOpen" class="quick-create-modal">
          <button class="quick-create-backdrop" type="button" @click="closeQuickCommunity"></button>
          <section class="quick-create-card">
            <div class="quick-create-head">
              <strong>Crear comunidad</strong>
              <button type="button" @click="closeQuickCommunity">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <label>
              Nombre
              <input v-model="quickCommunityDraft.name" placeholder="Ej: Zelda Fans" />
            </label>
            <label>
              Descripcion
              <textarea v-model="quickCommunityDraft.description" rows="3" placeholder="De que trata esta comunidad"></textarea>
            </label>
            <label>
              Banner (URL)
              <input v-model="quickCommunityDraft.bannerUrl" placeholder="https://..." />
            </label>
            <label>
              Icono (URL)
              <input v-model="quickCommunityDraft.iconUrl" placeholder="https://..." />
            </label>
            <label>
              Fondo cuando no hay publicaciones
              <input v-model="quickCommunityDraft.threadBackgroundUrl" placeholder="https://..." />
            </label>
            <label>
              Playlist (URL)
              <input v-model="quickCommunityDraft.musicPlaylistUrl" placeholder="https://..." />
            </label>
            <label>
              Volumen
              <input v-model.number="quickCommunityDraft.musicVolume" type="number" min="0" max="100" />
            </label>
            <div class="quick-topic-editor">
              <div class="quick-topic-head">
                <strong>Categorias de hilos</strong>
                <span>{{ quickCommunityDraft.threadTopics.length }}/8</span>
              </div>
              <label
                v-for="(topic, index) in quickCommunityDraft.threadTopics"
                :key="`quick-topic-${index}`"
                class="quick-topic-row"
              >
                <i :class="getQuickTopicIcon(topic)"></i>
                <input
                  :value="topic"
                  placeholder="Categoria"
                  @input="updateQuickCommunityTopic(index, $event.target.value)"
                />
                <button
                  type="button"
                  :disabled="quickCommunityDraft.threadTopics.length <= 1"
                  aria-label="Eliminar categoria"
                  @click="removeQuickCommunityTopic(index)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </label>
              <div class="quick-topic-add">
                <input
                  v-model="quickCommunityDraft.newTopic"
                  maxlength="24"
                  placeholder="Nueva categoria"
                  @keydown.enter.prevent="addQuickCommunityTopic"
                />
                <button
                  type="button"
                  :disabled="!quickCommunityDraft.newTopic.trim() || quickCommunityDraft.threadTopics.length >= 8"
                  @click="addQuickCommunityTopic"
                >
                  <i class="fas fa-plus"></i>
                  Agregar
                </button>
              </div>
            </div>

            <button
              class="quick-create-submit"
              type="button"
              :disabled="quickCreateSaving || !quickCommunityDraft.name.trim() || !quickCommunityDraft.description.trim()"
              @click="saveQuickCommunity"
            >
              {{ quickCreateSaving ? 'Guardando...' : 'Crear comunidad' }}
            </button>

            <Transition name="fade">
              <div v-if="quickCreateSaving" class="quick-loading-cover">
                <GalaxyLoader compact title="Creando comunidad" text="Guardando la nueva ventana con estilo unificado..." />
              </div>
            </Transition>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="quickUserOpen" class="quick-create-modal">
          <button class="quick-create-backdrop" type="button" @click="closeQuickUser"></button>
          <section class="quick-create-card">
            <div class="quick-create-head">
              <strong>Crear usuario</strong>
              <button type="button" @click="closeQuickUser">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <label>
              Nombre
              <input v-model="quickUserDraft.name" placeholder="Ej: Marta" />
            </label>
            <label>
              Email
              <input v-model="quickUserDraft.email" type="email" placeholder="persona@email.com" />
            </label>
            <label>
              Password temporal
              <input v-model="quickUserDraft.password" type="password" placeholder="Minimo 6 caracteres" />
            </label>
            <label>
              Descripcion
              <textarea v-model="quickUserDraft.description" rows="3" placeholder="Rol o presentacion"></textarea>
            </label>
            <label>
              Icono (URL)
              <input v-model="quickUserDraft.imageUrl" placeholder="https://..." />
            </label>
            <label>
              Rol
              <select v-model="quickUserDraft.role">
                <option value="user">Usuario</option>
                <option value="publisher">Publicador</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label class="quick-create-check">
              <input v-model="quickUserDraft.canChat" type="checkbox" />
              Permitir chat
            </label>

            <button
              class="quick-create-submit"
              type="button"
              :disabled="quickCreateSaving || !quickUserDraft.name.trim() || !quickUserDraft.email.trim() || !quickUserDraft.password"
              @click="saveQuickUser"
            >
              {{ quickCreateSaving ? 'Guardando...' : 'Crear usuario' }}
            </button>

            <Transition name="fade">
              <div v-if="quickCreateSaving" class="quick-loading-cover">
                <GalaxyLoader compact title="Creando usuario" text="Preparando el perfil antes de cerrar..." />
              </div>
            </Transition>
          </section>
        </div>
      </Transition>
    </Teleport>

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
  z-index: 300;
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

.public-live-slot {
  align-items: center;
  display: inline-flex;
  min-height: 36px;
  min-width: 0;
}

.public-brand-logo {
  display: block;
  height: 44px;
  max-width: 58px;
  object-fit: contain;
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
  transition: color 0.2s ease;
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
  width: 34px;
}

.public-icon:hover {
  background: rgba(124, 58, 237, 0.24);
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
  color: #ffffff;
  display: none;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  min-height: 36px;
  padding: 0 13px;
  white-space: nowrap;
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
  align-items: center;
  background: #ffffff;
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  flex: 0 0 auto;
  height: 24px;
  justify-content: center;
  overflow: hidden;
  width: 24px;
}

.account-btn-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.public-search-panel {
  background: #050816;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.25);
  padding: 14px 24px 18px;
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

.public-mobile-user-card > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.22);
  border-radius: 16px;
  color: #ffffff;
  display: flex;
  height: 54px;
  justify-content: center;
  overflow: hidden;
  width: 54px;
}

.public-mobile-user-card img {
  height: 100%;
  object-fit: cover;
  width: 100%;
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
  display: flex;
  justify-content: flex-end;
  margin: 0 auto;
  max-width: 1280px;
  padding: 0 24px;
  position: relative;
}

.public-account-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
  color: #111827;
  display: grid;
  gap: 12px;
  margin-top: 8px;
  padding: 14px;
  position: absolute;
  right: 24px;
  top: 0;
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
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
  overflow: hidden;
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
  .public-nav-inner {
    display: flex;
    justify-content: space-between;
    max-width: none;
    padding: 8px 16px;
  }

  .public-brand-zone {
    display: inline-flex;
  }

  .public-live-slot {
    left: 50%;
    min-height: 36px;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 6;
  }

  .public-brand span {
    display: none;
  }

  .public-profile-nav {
    background: transparent;
    border: 0;
    padding: 0;
  }

  .notification-nav-btn {
    display: inline-flex;
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
    position: fixed;
    right: 0;
    top: 0;
    z-index: 340;
  }

  .public-account-card {
    animation: mobile-account-drawer-in 0.24s cubic-bezier(0.2, 0.85, 0.25, 1);
    border: 0;
    border-right: 1px solid rgba(216, 180, 254, 0.2);
    border-radius: 0 24px 24px 0;
    box-shadow: 28px 0 70px rgba(0, 0, 0, 0.38);
    gap: 22px;
    height: 100dvh;
    margin: 0;
    max-height: none;
    overflow-y: auto;
    padding: calc(22px + env(safe-area-inset-top)) 22px calc(24px + env(safe-area-inset-bottom));
    position: relative;
    right: auto;
    top: auto;
    width: min(86vw, 430px);
  }

  .public-account-head {
    gap: 14px;
    grid-template-columns: 72px minmax(0, 1fr);
    padding-bottom: 22px;
  }

  .public-account-head > span {
    border-radius: 22px;
    height: 72px;
    width: 72px;
  }

  .public-account-head strong {
    font-size: 22px;
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
    border-radius: 16px;
    font-size: 18px;
    gap: 22px;
    grid-template-columns: 32px minmax(0, 1fr) 18px;
    min-height: 58px;
    padding: 0 10px;
  }

  .public-account-list button i:first-child {
    color: #f8fafc;
    font-size: 23px;
    text-align: center;
  }

  .public-account-list button:hover,
  .public-account-list button:focus-visible {
    background: rgba(168, 85, 247, 0.16);
  }

  .public-account-actions {
    margin-top: auto;
    padding-top: 22px;
  }

  .public-account-actions button {
    border-radius: 16px;
    font-size: 16px;
    min-height: 54px;
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
    background: rgba(5, 8, 22, 0.94);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    bottom: 0;
    box-shadow: 0 -18px 42px rgba(0, 0, 0, 0.32);
    display: grid;
    gap: 2px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    left: 0;
    padding: 7px 10px calc(7px + env(safe-area-inset-bottom));
    position: fixed;
    right: 0;
    z-index: 300;
  }

  .public-bottom-nav button {
    align-items: center;
    border-radius: 12px;
    color: #94a3b8;
    display: grid;
    font-size: 10px;
    font-weight: 900;
    gap: 3px;
    justify-items: center;
    min-height: 46px;
    min-width: 0;
  }

  .public-bottom-nav i {
    font-size: 17px;
  }

  .public-bottom-nav button.active {
    color: #c084fc;
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
    box-shadow: 0 14px 30px rgba(124, 58, 237, 0.38);
    display: flex;
    font-size: 22px;
    height: 54px;
    justify-content: center;
    width: 54px;
  }
}

.public-bottom-nav {
  display: none;
}

.mobile-create-layer {
  display: flex;
  align-items: center;
  inset: 0;
  justify-content: center;
  padding: 18px 14px;
  position: fixed;
  z-index: 340;
}

.mobile-create-backdrop {
  background: rgba(3, 6, 18, 0.54);
  backdrop-filter: blur(10px);
  inset: 0;
  position: absolute;
}

.mobile-create-sheet {
  background: rgba(11, 16, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
  color: #f8fafc;
  display: grid;
  gap: 9px;
  max-width: 420px;
  padding: 14px;
  position: relative;
  width: 100%;
}

.mobile-create-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 2px 2px 6px;
}

.mobile-create-head strong {
  font-size: 18px;
  font-weight: 950;
}

.mobile-create-head button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.mobile-create-option {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  display: grid;
  font-size: 14px;
  font-weight: 950;
  gap: 12px;
  grid-template-columns: 38px minmax(0, 1fr) 16px;
  min-height: 54px;
  padding: 0 14px 0 10px;
  text-align: left;
}

.mobile-create-option i:first-child {
  align-items: center;
  background: rgba(168, 85, 247, 0.18);
  border-radius: 12px;
  color: #c084fc;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.mobile-create-subtitle {
  color: #a78bfa;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.02em;
  padding: 4px 8px 0;
  text-transform: uppercase;
}

.mobile-create-option.secondary i:first-child {
  background: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

.quick-create-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: fixed;
  z-index: 360;
}

.quick-create-backdrop {
  background: rgba(3, 6, 18, 0.66);
  backdrop-filter: blur(12px);
  inset: 0;
  position: absolute;
}

.thread-composer-modal {
  align-items: center;
  justify-content: center;
  padding: 22px;
}

.thread-composer-modal .thread-composer {
  max-height: calc(100dvh - 44px);
  overflow: hidden;
  position: relative;
  width: min(100%, 1120px);
  z-index: 1;
}

.quick-create-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.26);
  color: #111827;
  display: grid;
  gap: 14px;
  max-height: calc(100dvh - 32px);
  max-width: 720px;
  overflow-y: auto;
  padding: 22px;
  position: relative;
  width: 100%;
}

.quick-create-card:not(.quick-thread-card) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.quick-create-card:not(.quick-thread-card) .quick-create-head,
.quick-create-card:not(.quick-thread-card) label:has(textarea),
.quick-create-card:not(.quick-thread-card) .quick-create-check,
.quick-create-card:not(.quick-thread-card) .quick-live-intro,
.quick-create-card:not(.quick-thread-card) .quick-live-note,
.quick-create-card:not(.quick-thread-card) .quick-topic-editor,
.quick-create-card:not(.quick-thread-card) .quick-create-submit,
.quick-create-card:not(.quick-thread-card) .quick-loading-cover {
  grid-column: 1 / -1;
}

.quick-live-card {
  background:
    radial-gradient(circle at 12% 0%, rgba(147, 51, 234, 0.08), transparent 34%),
    #ffffff;
}

.quick-live-intro,
.quick-live-note {
  border-radius: 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
  margin: 0;
}

.quick-live-intro {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  padding: 12px 14px;
}

.quick-live-note {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  padding: 10px 12px;
}

.quick-create-head {
  align-items: center;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  margin: -4px -4px 4px;
  padding: 0 0 14px;
}

.quick-create-head strong {
  color: #1f2937;
  font-size: 18px;
  font-weight: 950;
}

.quick-create-head button {
  align-items: center;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 999px;
  color: #94a3b8;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.quick-create-card label {
  color: #64748b;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
  text-transform: uppercase;
}

.quick-create-card input,
.quick-create-card textarea,
.quick-create-card select {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 750;
  outline: none;
  min-height: 44px;
  padding: 10px 12px;
  text-transform: none;
}

.quick-create-card input:focus,
.quick-create-card textarea:focus,
.quick-create-card select:focus {
  background: #ffffff;
  border-color: #c084fc;
  box-shadow: 0 0 0 3px #f3e8ff;
}

.quick-create-card input::placeholder,
.quick-create-card textarea::placeholder {
  color: #94a3b8;
}

.quick-create-card select {
  appearance: none;
  background-color: #f9fafb;
  background-image: linear-gradient(45deg, transparent 50%, #9333ea 50%), linear-gradient(135deg, #9333ea 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 3px), calc(100% - 12px) calc(50% - 3px);
  background-repeat: no-repeat;
  background-size: 6px 6px, 6px 6px;
  padding-right: 34px;
}

.quick-create-card option {
  background: #ffffff;
  color: #111827;
}

.quick-topic-editor {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 9px;
  padding: 10px;
}

.quick-topic-head,
.quick-topic-row,
.quick-topic-add {
  align-items: center;
  display: grid;
  gap: 8px;
}

.quick-topic-head {
  grid-template-columns: minmax(0, 1fr) auto;
}

.quick-topic-head strong {
  color: #111827;
  font-size: 12px;
  font-weight: 950;
}

.quick-topic-head span {
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  font-size: 10px;
  font-weight: 950;
  padding: 4px 8px;
}

.quick-topic-row {
  grid-template-columns: 28px minmax(0, 1fr) 34px;
  margin: 0;
}

.quick-topic-row i {
  color: #9333ea;
  text-align: center;
}

.quick-topic-row button,
.quick-topic-add button {
  align-items: center;
  border-radius: 10px;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 38px;
}

.quick-topic-row button {
  background: #fff1f2;
  color: #e11d48;
}

.quick-topic-add {
  grid-template-columns: minmax(0, 1fr) auto;
}

.quick-topic-add button {
  background: #7c3aed;
  color: #ffffff;
  padding: 0 12px;
}

.quick-topic-row button:disabled,
.quick-topic-add button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.quick-create-check {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: inline-flex !important;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  text-transform: none !important;
}

.quick-create-check input {
  accent-color: #7c3aed;
  min-height: 18px;
  width: 18px;
}

.quick-create-submit {
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  margin-top: 4px;
  min-height: 42px;
  padding: 0 18px;
  text-transform: uppercase;
  white-space: nowrap;
}

.quick-create-submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.quick-thread-card {
  border-radius: 24px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-width: min(1220px, calc(100vw - 96px));
  overflow: hidden;
  padding: 18px;
  width: min(1220px, calc(100vw - 96px));
}

.quick-thread-card.loading-context {
  overflow: hidden;
}

.quick-thread-loading {
  min-height: 320px;
}

.quick-thread-loading :deep(.galaxy-loader) {
  min-height: 320px;
}

.quick-thread-alert {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  color: #92400e;
  font-size: 12px;
  font-weight: 800;
  padding: 8px 10px;
}

.quick-thread-join {
  background: #f3e8ff;
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 900;
  min-height: 40px;
  text-transform: uppercase;
}

.quick-thread-head strong {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.quick-thread-body {
  align-content: start;
  display: grid;
  gap: 14px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
}

.quick-thread-destination-row {
  align-items: start;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(280px, 1.25fr) minmax(210px, 0.75fr);
  position: relative;
  z-index: 3;
}

.quick-thread-picker-wrap {
  min-width: 0;
  position: relative;
}

.quick-thread-context {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #111827;
  display: grid;
  gap: 10px;
  grid-template-columns: 44px minmax(0, 1fr) 36px;
  min-height: 50px;
  padding: 8px 10px;
}

.quick-thread-community-trigger,
.quick-thread-picker-toggle,
.quick-thread-topic-chip {
  align-items: center;
  display: flex;
  justify-content: center;
}

.quick-thread-community-trigger {
  border-radius: 14px;
  height: 44px;
  padding: 0;
  width: 44px;
}

.quick-thread-community-trigger > span,
.quick-thread-floating-picker button > span,
.quick-thread-topic-chip > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  height: 100%;
  justify-content: center;
  overflow: hidden;
  width: 100%;
}

.quick-thread-context img,
.quick-thread-floating-picker img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.quick-thread-context div {
  display: grid;
  min-width: 0;
}

.quick-thread-context small {
  color: #9333ea;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.quick-thread-context strong {
  color: #111827;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-thread-picker-toggle {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #d8b4fe;
  height: 36px;
  width: 36px;
}

.quick-thread-topic-chip {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  color: #111827;
  display: grid;
  gap: 14px;
  grid-template-columns: 46px minmax(120px, 1fr) 24px;
  min-height: 68px;
  padding: 10px 18px 10px 12px;
  text-align: left;
  width: 100%;
}

.quick-thread-topic-chip > span {
  height: 46px;
  width: 46px;
}

.quick-thread-topic-chip > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.quick-thread-topic-chip small {
  color: #9333ea;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.quick-thread-topic-chip strong {
  color: #111827;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-thread-topic-chip > i {
  align-self: center;
  color: #d8b4fe;
  justify-self: end;
  padding-left: 4px;
}

.quick-thread-floating-picker {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: grid;
  gap: 8px;
  left: 0;
  max-height: 220px;
  overflow-y: auto;
  padding: 10px;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 5;
}

.community-picker {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.topic-picker {
  grid-template-columns: 1fr;
  left: auto;
  min-width: 240px;
  width: min(280px, 48vw);
}

.quick-thread-floating-picker button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #111827;
  display: grid;
  gap: 2px 10px;
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 58px;
  padding: 8px;
  text-align: left;
}

.topic-picker button {
  grid-template-columns: 36px minmax(96px, 1fr);
}

.quick-thread-floating-picker button.active {
  background: rgba(124, 58, 237, 0.28);
  border-color: rgba(196, 181, 253, 0.48);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.14);
}

.quick-thread-floating-picker button > span {
  grid-row: span 2;
  height: 42px;
  width: 42px;
}

.topic-picker button > span {
  grid-row: auto;
  height: 36px;
  width: 36px;
}

.quick-thread-floating-picker strong {
  color: #111827;
  font-size: 12px;
  font-weight: 950;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-thread-floating-picker small {
  color: #64748b;
  font-size: 10px;
  font-weight: 850;
}

.quick-thread-composer {
  align-items: start;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  display: grid;
  gap: 14px;
  grid-template-columns: 50px minmax(0, 1fr);
  min-height: 220px;
  padding: 16px;
}

.quick-thread-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  height: 44px;
  justify-content: center;
  overflow: hidden;
  width: 44px;
}

.quick-thread-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.quick-thread-avatar b {
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.quick-thread-input-wrap {
  align-self: stretch;
  display: grid;
  min-width: 0;
}

.quick-thread-input-wrap textarea {
  background: transparent;
  border: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  min-height: 186px;
  padding: 2px 0;
  resize: none;
  width: 100%;
}

.quick-thread-input-wrap textarea::placeholder {
  color: #9ca3af;
}

.quick-thread-tools {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.quick-thread-tools button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #475569;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
  justify-content: center;
  min-height: 40px;
}

.quick-thread-image-preview {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  margin: 0;
  overflow: hidden;
}

.quick-thread-image-preview img {
  aspect-ratio: 16 / 7;
  background: #111827;
  object-fit: cover;
  width: 100%;
}

.quick-thread-tools button.active {
  background: #f3e8ff;
  border-color: #c084fc;
  color: #7c3aed;
}

.quick-picker-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.quick-icon-btn {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #111827;
  display: flex;
  font-size: 18px;
  height: 42px;
  justify-content: center;
}

.quick-loading-cover {
  align-items: center;
  background: rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(10px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: absolute;
  z-index: 12;
}

.quick-loading-cover :deep(.galaxy-loader) {
  min-height: min(340px, calc(100dvh - 80px));
  max-width: 500px;
}

.quick-thread-footer {
  align-items: center;
  background: #ffffff;
  border-top: 1px solid #eef2f7;
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr auto;
  margin: 0 -18px -18px;
  padding: 18px 22px 22px;
  overflow: hidden;
}

.quick-thread-footer .quick-create-submit {
  border-radius: 14px;
  min-height: 52px;
  min-width: 180px;
  padding: 0 26px;
}

.quick-thread-footer span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

@media (max-width: 859px) {
  .thread-composer-modal {
    align-items: stretch;
    justify-content: flex-start;
    padding: 0;
  }

  .thread-composer-modal .thread-composer {
    max-height: 100dvh;
    width: 100vw;
  }

  .quick-thread-modal {
    align-items: center;
    padding: 14px 10px calc(14px + env(safe-area-inset-bottom));
  }

  .quick-thread-card {
    border-radius: 22px;
    min-height: auto;
    max-height: calc(100dvh - 28px);
    max-width: calc(100% - 20px);
    overflow: hidden;
    padding: 14px 14px calc(14px + env(safe-area-inset-bottom));
    width: calc(100% - 20px);
  }

  .quick-create-card:not(.quick-thread-card) {
    grid-template-columns: 1fr;
    max-width: 520px;
  }

  .quick-thread-loading {
    min-height: calc(100dvh - 82px - env(safe-area-inset-bottom));
  }

  .quick-thread-head {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 40px;
    padding-bottom: 2px;
  }

  .quick-thread-head strong {
    font-size: 10px;
    justify-self: center;
    letter-spacing: 0;
    text-transform: none;
  }

  .quick-thread-head button {
    grid-column: 1;
    grid-row: 1;
    height: 32px;
    width: 32px;
  }

  .quick-thread-body {
    gap: 10px;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 10px;
    scrollbar-width: thin;
  }

  .quick-thread-destination-row {
    gap: 7px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: sticky;
    top: 0;
    z-index: 6;
  }

  .quick-thread-context {
    gap: 6px;
    grid-template-columns: 34px minmax(0, 1fr) 28px;
    min-height: 50px;
    padding: 6px;
  }

  .quick-thread-community-trigger {
    height: 34px;
    width: 34px;
  }

  .quick-thread-picker-toggle {
    height: 28px;
    width: 28px;
  }

  .quick-thread-topic-chip {
    gap: 7px;
    grid-template-columns: 34px minmax(0, 1fr) 16px;
    min-height: 50px;
    padding: 6px 8px 6px 6px;
  }

  .quick-thread-topic-chip > span {
    border-radius: 11px;
    height: 34px;
    width: 34px;
  }

  .quick-thread-topic-chip small {
    font-size: 9px;
  }

  .quick-thread-topic-chip strong,
  .quick-thread-context strong {
    font-size: 10px;
    line-height: 1.1;
  }

  .quick-thread-floating-picker {
    max-height: min(34dvh, 260px);
    position: absolute;
  }

  .topic-picker {
    min-width: 210px;
    width: min(240px, calc(100vw - 28px));
  }

  .community-picker {
    grid-template-columns: 1fr;
  }

  .quick-thread-composer {
    background: transparent;
    border: 0;
    border-radius: 14px;
    grid-template-columns: 40px minmax(0, 1fr);
    min-height: 0;
    padding: 4px 0;
  }

  .quick-thread-avatar {
    border-radius: 14px;
    height: 38px;
    width: 38px;
  }

  .quick-thread-input-wrap textarea {
    font-size: 13px;
    min-height: clamp(220px, 38dvh, 360px);
  }

  .quick-thread-tools {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .quick-thread-tools button {
    font-size: 0;
    min-height: 38px;
  }

  .quick-thread-tools button i {
    font-size: 12px;
  }

  .quick-thread-footer {
    grid-template-columns: 1fr;
    margin: 0 -14px calc((14px + env(safe-area-inset-bottom)) * -1);
    padding: 14px 14px calc(16px + env(safe-area-inset-bottom));
    position: sticky;
    bottom: 0;
    z-index: 7;
  }

  .quick-thread-footer .quick-create-submit {
    min-height: 50px;
    width: 100%;
  }
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

  .public-search-panel {
    padding: 12px 16px 16px;
  }

  .public-mobile-links {
    max-height: 100dvh;
    padding: 16px;
    top: 0;
  }

  .quick-thread-tools,
  .quick-picker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-thread-footer {
    grid-template-columns: 1fr;
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

.public-mobile-user-card > span {
  border-radius: 18px;
  height: 58px;
  width: 58px;
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

</style>
