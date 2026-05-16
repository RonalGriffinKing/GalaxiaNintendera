<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { updateProfile } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, query, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import ProfileFavoritesPreview from '@/features/public/components/profile/ProfileFavoritesPreview.vue'
import { notifyNewFollower } from '@/services/notifications'
import {
  ICON_COST,
  achievements,
  fallbackProfileIcon,
  kirbyIcons,
  loadUploadedProfileIcons,
  redeemIcon,
  resolveProfileIcon,
  updateProfileIcon
} from '@/services/profileProgress'

const route = useRoute()
const router = useRouter()
const profile = ref(null)
const favorites = ref([])
const threads = ref([])
const posts = ref([])
const userCommunities = ref([])
const publicProfiles = ref([])
const followersList = ref([])
const followingList = ref([])
const relationModal = ref('')
const activityTab = ref('posts')
const recentPostIndex = ref(0)
const showAllRecentPosts = ref(false)
const rewardsExpanded = ref(false)
const favoritesExpanded = ref(false)
const viewerProfile = ref({ role: 'user', canChat: false })
const isFollowing = ref(false)
const followBusy = ref(false)
const followersTotal = ref(0)
const followingTotal = ref(0)
const isLoading = ref(true)
const isRedeeming = ref(false)
const isSavingProfile = ref(false)
const isSavingIcon = ref(false)
const unlockBurst = ref('')
const redeemingIcon = ref('')
const deniedIcon = ref('')
const message = ref('')
const flyingStars = ref([])
const confirmRedeem = ref(null)
const iconTestMode = ref(false)
const testStars = ref(100)
const testUnlockedIcons = ref([])
const iconPanelOpen = ref(false)
const iconCollectionOpen = ref(false)
const iconUploadOpen = ref(false)
const achievementEditorOpen = ref(false)
const editingAchievementId = ref('')
const iconSearch = ref('')
const iconFilter = ref('Todos')
const previewIconId = ref('')
const customIcons = ref([])
const uploadIconPreview = ref('')
const isUploadingIcon = ref(false)
const isDeletingIcon = ref(false)
const uploadIconMessage = ref('')
const editingIconId = ref('')
const uploadIconDraft = ref({
  name: '',
  saga: 'Kirby',
  cost: ICON_COST,
  visible: true
})
const mobileEditorTab = ref('details')
const mobileIconPage = ref(0)
const editMessage = ref('')
const profileDraft = ref({
  name: '',
  description: '',
  socialLinks: {
    tiktok: '',
    youtube: '',
    twitch: ''
  }
})
const achievementDraft = ref({
  label: '',
  description: '',
  type: 'reads',
  target: 10,
  iconUrl: ''
})
const pendingSelectedIcon = ref('')
const starWalletEl = ref(null)
const iconShopEl = ref(null)

const profileId = computed(() => String(route.params.uid || ''))
const isOwnProfile = computed(() => auth.currentUser?.uid === profileId.value)
const readCount = computed(() => Number(profile.value?.readPostsCount || 0))
const stars = computed(() => Number(profile.value?.stars || 0))
const unlockedIcons = computed(() => profile.value?.unlockedIcons?.length ? profile.value.unlockedIcons : ['kirby-01'])
const isAdminOwnProfile = computed(() => isOwnProfile.value && profile.value?.role === 'admin')
const displayStars = computed(() => iconTestMode.value ? testStars.value : stars.value)
const managedAchievements = ref([...achievements])
const effectiveUnlockedIcons = computed(() => {
  if (!iconTestMode.value) return unlockedIcons.value
  return [...new Set([...unlockedIcons.value, ...testUnlockedIcons.value])]
})
const profileIcon = computed(() => {
  if (!profile.value) return fallbackProfileIcon
  const selectedId = isOwnProfile.value ? pendingSelectedIcon.value || profile.value.selectedIcon : profile.value.selectedIcon
  const catalogIcon = allProfileIcons.value.find(icon => icon.id === selectedId)
  if (catalogIcon?.src) return catalogIcon.src
  return resolveProfileIcon({
    ...profile.value,
    selectedIcon: selectedId
  })
})
const profileActiveMonths = computed(() => {
  const value = profile.value?.createdAt || profile.value?.joinedAt
  if (!value) return 0
  const date = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return 0
  const monthMs = 1000 * 60 * 60 * 24 * 30.4375
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / monthMs))
})
const achievementTypes = [
  { value: 'reads', label: 'Lecturas', unit: 'lecturas', icon: 'fas fa-book-open' },
  { value: 'posts', label: 'Publicaciones', unit: 'posts publicados', icon: 'fas fa-newspaper' },
  { value: 'communities', label: 'Comunidades', unit: 'comunidades', icon: 'fas fa-people-roof' },
  { value: 'months', label: 'Meses activo', unit: 'meses activo', icon: 'fas fa-calendar-check' },
  { value: 'icons', label: 'Iconos desbloqueados', unit: 'iconos desbloqueados', icon: 'fas fa-icons' },
  { value: 'followers', label: 'Seguidores', unit: 'seguidores', icon: 'fas fa-user-group' }
]
const achievementTypeMap = Object.fromEntries(achievementTypes.map(item => [item.value, item]))
const achievementTypeCounts = computed(() => {
  return achievementTypes.map(type => ({
    ...type,
    count: managedAchievements.value.filter(achievement => (achievement.type || 'reads') === type.value).length
  })).filter(type => type.count)
})
const achievementMetricValue = (achievement) => {
  const type = achievement?.type || 'reads'
  if (type === 'posts') return posts.value.length
  if (type === 'communities') return userCommunities.value.length
  if (type === 'months') return profileActiveMonths.value
  if (type === 'icons') return redeemedProfileIcons.value.length
  if (type === 'followers') return followersTotal.value
  return readCount.value
}
const achievementTarget = (achievement) => Math.max(1, Number(achievement?.target ?? achievement?.reads ?? 1))
const achievementTypeMeta = (achievement) => achievementTypeMap[achievement?.type || 'reads'] || achievementTypeMap.reads
const earnedAchievements = computed(() => managedAchievements.value.filter(item => achievementMetricValue(item) >= achievementTarget(item)))
const nextAchievement = computed(() => managedAchievements.value.find(item => achievementMetricValue(item) < achievementTarget(item)) || managedAchievements.value[managedAchievements.value.length - 1] || achievements[0])
const currentAchievement = computed(() => [...earnedAchievements.value].pop() || managedAchievements.value[0] || achievements[0])
const canManageAchievements = computed(() => viewerProfile.value.role === 'admin')
const achievementRoadmap = computed(() => managedAchievements.value.map((achievement) => {
  const currentValue = achievementMetricValue(achievement)
  const target = achievementTarget(achievement)
  const unlocked = currentValue >= target
  const isNext = !unlocked && achievement.id === nextAchievement.value?.id
  return {
    ...achievement,
    currentValue,
    target,
    typeMeta: achievementTypeMeta(achievement),
    unlocked,
    isNext,
    progress: unlocked ? 100 : achievementProgress(achievement),
    remaining: Math.max(0, target - currentValue)
  }
}))
const isCreatorProfile = computed(() => ['admin', 'publisher'].includes(profile.value?.role))
const allProfileIcons = computed(() => {
  const managedIcons = isAdminOwnProfile.value
    ? customIcons.value
    : customIcons.value.filter(icon => icon.visible && !icon.archived)
  return [...kirbyIcons, ...managedIcons]
})
const manageableProfileIcons = computed(() => customIcons.value.filter(icon => icon.local || !icon.builtIn))
const redeemedProfileIcons = computed(() => allProfileIcons.value.filter(icon => unlockedIcons.value.includes(icon.id)))
const visibleProfileIcons = computed(() => redeemedProfileIcons.value.slice(0, 8))
const iconFilters = computed(() => {
  const defaults = ['Kirby', 'Mario', 'Zelda', 'Pokemon', 'Animal Crossing', 'Splatoon', 'Metroid', 'Donkey Kong', 'Pikmin', 'Fire Emblem', 'Xenoblade', 'Smash Bros', 'Nintendo', 'Especiales']
  const dynamic = allProfileIcons.value.map(icon => iconSaga(icon)).filter(Boolean)
  return ['Todos', ...new Set([...defaults, ...dynamic])]
})
const iconSaga = (icon) => icon.id?.startsWith('kirby') ? 'Kirby' : icon.saga || 'Especiales'
const iconCost = (icon) => Math.max(0, Number(icon?.cost ?? ICON_COST))
const filteredIconCatalog = computed(() => {
  const search = normalizeText(iconSearch.value)
  return allProfileIcons.value.filter(icon => {
    const matchesFilter = iconFilter.value === 'Todos' || iconSaga(icon) === iconFilter.value
    const matchesSearch = !search || normalizeText(`${icon.name} ${iconSaga(icon)}`).includes(search)
    return matchesFilter && matchesSearch
  })
})
const mobileIconPageSize = 6
const mobileIconPageCount = computed(() => Math.max(1, Math.ceil(filteredIconCatalog.value.length / mobileIconPageSize)))
const mobileIconCatalog = computed(() => {
  const start = mobileIconPage.value * mobileIconPageSize
  return filteredIconCatalog.value.slice(start, start + mobileIconPageSize)
})
const previewIcon = computed(() => {
  const id = previewIconId.value || pendingSelectedIcon.value || profile.value?.selectedIcon || 'kirby-01'
  return allProfileIcons.value.find(icon => icon.id === id) || kirbyIcons[0]
})
const previewIconEquipped = computed(() => previewIcon.value?.id && profile.value?.selectedIcon === previewIcon.value.id)
const commentsCount = computed(() => threads.value.reduce((total, thread) => total + Number(thread.comments?.length || 0), 0))
const receivedLikesCount = computed(() => threads.value.reduce((total, thread) => total + Number(thread.likes || 0), 0))
const hasPendingIconChange = computed(() => {
  return isOwnProfile.value && pendingSelectedIcon.value && pendingSelectedIcon.value !== profile.value?.selectedIcon
})
const socialItems = computed(() => [
  { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', url: profile.value?.socialLinks?.tiktok || '' },
  { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', url: profile.value?.socialLinks?.youtube || '' },
  { id: 'twitch', label: 'Twitch', icon: 'fab fa-twitch', url: profile.value?.socialLinks?.twitch || '' }
])
const heroStats = computed(() => [
  { id: 'followers', icon: 'fas fa-user-group', value: followersTotal.value, label: 'Seguidores' },
  { id: 'icons', icon: 'fas fa-icons', value: redeemedProfileIcons.value.length, label: 'Iconos' },
  { id: 'achievements', icon: 'fas fa-trophy', value: earnedAchievements.value.length, label: 'Logros' },
  { id: 'communities', icon: 'fas fa-people-roof', value: userCommunities.value.length, label: 'Comunidades' }
])
const groupedRedeemedIcons = computed(() => {
  const groups = redeemedProfileIcons.value.reduce((collection, icon) => {
    const saga = iconSaga(icon)
    if (!collection.has(saga)) collection.set(saga, [])
    collection.get(saga).push(icon)
    return collection
  }, new Map())

  return [...groups.entries()]
    .map(([saga, icons]) => ({ saga, icons }))
    .sort((a, b) => a.saga.localeCompare(b.saga, 'es'))
})
const canUseDirectChat = computed(() => {
  return Boolean(auth.currentUser) && (
    ['admin', 'publisher'].includes(viewerProfile.value.role) || viewerProfile.value.canChat
  )
})
const communityCards = computed(() => userCommunities.value)
const postActivityItems = computed(() => posts.value.map(post => ({
  icon: 'fas fa-newspaper',
  id: post.id,
  image: post.image || post.imageUrl || post.coverUrl || '',
  title: post.title || 'Publicacion',
  label: post.category || 'Post',
  time: formatAgo(post.updatedAt || post.createdAt),
  rawAt: post.updatedAt || post.createdAt,
  action: () => openPost(post.id)
})).sort((a, b) => getTime(b.rawAt) - getTime(a.rawAt)))
const currentRecentPost = computed(() => postActivityItems.value[recentPostIndex.value] || null)
const threadActivityItems = computed(() => threads.value.map(thread => ({
  icon: 'fas fa-comment-dots',
  title: thread.title || thread.body || 'Hilo de comunidad',
  label: thread.communityName || thread.topic || 'Comunidad',
  time: formatAgo(thread.updatedAt || thread.createdAt),
  rawAt: thread.updatedAt || thread.createdAt,
  action: () => router.push('/comunidad')
})).sort((a, b) => getTime(b.rawAt) - getTime(a.rawAt)))
const visibleActivityItems = computed(() => (
  activityTab.value === 'threads' ? threadActivityItems.value : postActivityItems.value
).slice(0, 4))
const activityItems = computed(() => [
  ...threads.value.map(thread => ({
    icon: 'fas fa-comment-dots',
    title: `Publico en ${thread.communityName || thread.topic || 'Comunidad'}`,
    text: thread.title || thread.body || 'Hilo de comunidad',
    time: formatAgo(thread.updatedAt || thread.createdAt),
    rawAt: thread.updatedAt || thread.createdAt
  })),
  ...posts.value.map(post => ({
    icon: 'fas fa-newspaper',
    title: `Publico ${post.category || 'post'}`,
    text: post.title || 'Publicacion',
    time: formatAgo(post.updatedAt || post.createdAt),
    rawAt: post.updatedAt || post.createdAt
  }))
].sort((a, b) => getTime(b.rawAt) - getTime(a.rawAt)).slice(0, 5))
const memberSince = computed(() => {
  const value = profile.value?.createdAt || profile.value?.joinedAt
  if (!value) return ''
  const date = value?.toDate ? value.toDate() : new Date(value)
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
})
const relationTitle = computed(() => {
  if (relationModal.value === 'followers') return 'Seguidores'
  if (relationModal.value === 'following') return 'Seguidos'
  return ''
})
const relationUsers = computed(() => {
  if (relationModal.value === 'followers') return followersList.value
  if (relationModal.value === 'following') return followingList.value
  return []
})
const achievementProgress = (achievement) => {
  return Math.min(100, Math.round((achievementMetricValue(achievement) / achievementTarget(achievement)) * 100))
}

const normalizeAchievements = (items) => {
  const source = Array.isArray(items) && items.length ? items : achievements
  return source
    .map((item, index) => ({
      id: item.id || `achievement-${Date.now()}-${index}`,
      label: String(item.label || 'Nuevo logro').trim(),
      description: String(item.description || 'Leer posts').trim(),
      type: achievementTypeMap[item.type] ? item.type : 'reads',
      target: Math.max(1, Number(item.target ?? item.reads ?? 1)),
      reads: Math.max(1, Number(item.target ?? item.reads ?? 1)),
      iconUrl: String(item.iconUrl || '').trim()
    }))
    .sort((a, b) => {
      const typeDiff = achievementTypes.findIndex(type => type.value === a.type) - achievementTypes.findIndex(type => type.value === b.type)
      return typeDiff || a.target - b.target
    })
}

const resetAchievementDraft = () => {
  editingAchievementId.value = ''
  achievementDraft.value = {
    label: '',
    description: '',
    type: 'reads',
    target: Math.max(10, Number(nextAchievement.value?.target ?? nextAchievement.value?.reads ?? 0) + 10),
    iconUrl: ''
  }
}

const startCreateAchievement = () => {
  resetAchievementDraft()
  achievementEditorOpen.value = true
}

const editAchievement = (achievement) => {
  editingAchievementId.value = achievement.id
  achievementDraft.value = {
    label: achievement.label,
    description: achievement.description,
    type: achievement.type || 'reads',
    target: achievementTarget(achievement),
    iconUrl: achievement.iconUrl || ''
  }
  achievementEditorOpen.value = true
}

const saveAchievementsConfig = async (items = managedAchievements.value) => {
  const normalized = normalizeAchievements(items)
  managedAchievements.value = normalized
  await setDoc(doc(db, 'siteConfig', 'profileAchievements'), {
    items: normalized,
    updatedAt: Date.now(),
    updatedBy: auth.currentUser?.uid || ''
  }, { merge: true })
}

const saveAchievementDraft = async () => {
  if (!canManageAchievements.value) return
  const label = achievementDraft.value.label.trim()
  const description = achievementDraft.value.description.trim()
  const type = achievementTypeMap[achievementDraft.value.type] ? achievementDraft.value.type : 'reads'
  const target = Math.max(1, Number(achievementDraft.value.target || 1))
  const iconUrl = achievementDraft.value.iconUrl.trim()
  if (!label || !description) return

  const nextItems = editingAchievementId.value
    ? managedAchievements.value.map(item => item.id === editingAchievementId.value ? { ...item, label, description, type, target, reads: target, iconUrl } : item)
    : [...managedAchievements.value, { id: `custom-${Date.now()}`, label, description, type, target, reads: target, iconUrl }]

  await saveAchievementsConfig(nextItems)
  resetAchievementDraft()
  achievementEditorOpen.value = false
}

const deleteAchievement = async (achievement) => {
  if (!canManageAchievements.value || managedAchievements.value.length <= 1) return
  await saveAchievementsConfig(managedAchievements.value.filter(item => item.id !== achievement.id))
  if (editingAchievementId.value === achievement.id) {
    resetAchievementDraft()
    achievementEditorOpen.value = false
  }
}

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const loadProfile = async () => {
  isLoading.value = true
  message.value = ''
  editMessage.value = ''
  iconPanelOpen.value = false
  iconCollectionOpen.value = false
  relationModal.value = ''
  isFollowing.value = false

  try {
    const [userSnap, favoritesSnap, threadsSnap, postsSnap, usersSnap, communitiesSnap, followersSnap, followingSnap, followSnap, viewerSnap, uploadedIcons, achievementsSnap] = await Promise.all([
      getDoc(doc(db, 'users', profileId.value)),
      getDocs(query(collection(db, 'users', profileId.value, 'favorites'), limit(6))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'communityThreads'), limit(80))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'posts'), limit(120))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'users'), limit(24))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'users', profileId.value, 'communities'), limit(12))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'users', profileId.value, 'followers'), limit(500))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'users', profileId.value, 'following'), limit(500))).catch(() => ({ docs: [] })),
      auth.currentUser && auth.currentUser.uid !== profileId.value
        ? getDoc(doc(db, 'users', profileId.value, 'followers', auth.currentUser.uid)).catch(() => ({ exists: () => false }))
        : Promise.resolve({ exists: () => false }),
      auth.currentUser
        ? getDoc(doc(db, 'users', auth.currentUser.uid)).catch(() => ({ exists: () => false, data: () => ({}) }))
        : Promise.resolve({ exists: () => false, data: () => ({}) }),
      loadUploadedProfileIcons({ includeHidden: true }).catch(() => []),
      getDoc(doc(db, 'siteConfig', 'profileAchievements')).catch(() => ({ exists: () => false, data: () => ({}) }))
    ])
    customIcons.value = uploadedIcons
    managedAchievements.value = normalizeAchievements(
      achievementsSnap.exists?.() ? achievementsSnap.data()?.items : achievements
    )

    if (!userSnap.exists()) {
      profile.value = null
      return
    }

    const userData = userSnap.data()
    profile.value = {
      id: profileId.value,
      role: 'user',
      description: 'Miembro de la comunidad',
      stars: 0,
      readPostsCount: 0,
      unlockedIcons: ['kirby-01'],
      selectedIcon: 'kirby-01',
      ...userData
    }
    profileDraft.value = {
      name: profile.value.name || auth.currentUser?.displayName || '',
      description: profile.value.description || '',
      socialLinks: {
        tiktok: profile.value.socialLinks?.tiktok || '',
        youtube: profile.value.socialLinks?.youtube || '',
        twitch: profile.value.socialLinks?.twitch || ''
      }
    }
    pendingSelectedIcon.value = profile.value.selectedIcon || 'kirby-01'
    const viewerData = typeof viewerSnap.exists === 'function' && viewerSnap.exists() ? viewerSnap.data() : {}
    viewerProfile.value = {
      role: viewerData.role || 'user',
      canChat: Boolean(viewerData.canChat)
    }

    favorites.value = favoritesSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    userCommunities.value = communitiesSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    followersTotal.value = Number(profile.value.followersCount ?? followersSnap.docs.length)
    followingTotal.value = Number(profile.value.followingCount ?? followingSnap.docs.length)
    isFollowing.value = followSnap.exists()
    const usersById = new Map(usersSnap.docs.map(item => [item.id, { id: item.id, ...item.data() }]))
    followersList.value = followersSnap.docs.map(item => relationFromDoc(item, usersById))
    followingList.value = followingSnap.docs.map(item => relationFromDoc(item, usersById))
    threads.value = threadsSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(thread => thread.authorId === profileId.value)
      .sort((a, b) => getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt))
      .slice(0, 6)
    posts.value = postsSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(post => post.authorId === profileId.value && post.status === 'approved' && post.placement !== 'hero' && !post.isMainEntry)
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
      .slice(0, 6)
    publicProfiles.value = usersSnap.docs
      .map(item => ({ id: item.id, role: 'user', readPostsCount: 0, ...item.data() }))
      .filter(user => user.id !== profileId.value)
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
      .slice(0, 8)
  } finally {
    isLoading.value = false
  }
}

const relationFromDoc = (item, usersById) => {
  const data = item.data()
  const id = data.userId || item.id
  const liveProfile = usersById.get(id) || {}

  return {
    id,
    name: data.name || liveProfile.name || liveProfile.displayName || liveProfile.email || 'Usuario',
    username: liveProfile.username || '',
    email: liveProfile.email || '',
    role: liveProfile.role || data.role || 'user',
    imageUrl: data.imageUrl || resolveProfileIcon(liveProfile),
    canChat: Boolean(liveProfile.canChat)
  }
}

const getTime = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.toDate) return value.toDate().getTime()
  return new Date(value).getTime()
}

const formatAgo = (value) => {
  const time = getTime(value)
  if (!time) return 'Reciente'
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} dia${days === 1 ? '' : 's'}`
}

const normalizeSocialUrl = (value) => {
  const url = String(value || '').trim()
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const canUnlock = (icon) => {
  return isOwnProfile.value && !effectiveUnlockedIcons.value.includes(icon.id) && displayStars.value >= iconCost(icon)
}

const iconState = (icon) => {
  if (profile.value?.selectedIcon === icon.id) return 'Equipado'
  if (effectiveUnlockedIcons.value.includes(icon.id)) return iconTestMode.value && testUnlockedIcons.value.includes(icon.id) ? 'Test' : 'Desbloqueado'
  return `${iconCost(icon)} estrellas`
}

const toggleIconTestMode = () => {
  if (!isAdminOwnProfile.value) return

  iconTestMode.value = !iconTestMode.value
  confirmRedeem.value = null
  message.value = ''

  if (iconTestMode.value) {
    testStars.value = 100
    testUnlockedIcons.value = []
    pendingSelectedIcon.value = profile.value?.selectedIcon || 'kirby-01'
    return
  }

  testStars.value = 100
  testUnlockedIcons.value = []
  if (!unlockedIcons.value.includes(pendingSelectedIcon.value)) {
    pendingSelectedIcon.value = profile.value?.selectedIcon || 'kirby-01'
  }
}

const launchSpendStars = (event) => {
  if (typeof window === 'undefined' || !starWalletEl.value || !event?.currentTarget) return

  const wallet = starWalletEl.value.getBoundingClientRect()
  const target = event.currentTarget.getBoundingClientRect()
  const startX = wallet.left + wallet.width / 2
  const startY = wallet.top + wallet.height / 2
  const endX = target.left + target.width / 2
  const endY = target.top + target.height / 2
  const id = Date.now()

  flyingStars.value = Array.from({ length: 7 }, (_, index) => ({
    id: `${id}-${index}`,
    x: startX,
    y: startY,
    tx: endX - startX + (index - 3) * 7,
    ty: endY - startY + (index % 2 === 0 ? -8 : 8),
    delay: index * 45
  }))

  setTimeout(() => {
    flyingStars.value = []
  }, 1050)
}

const requestRedeemIcon = (icon, event) => {
  const targetRect = event?.currentTarget?.getBoundingClientRect()
  confirmRedeem.value = {
    icon,
    targetRect: targetRect
      ? {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height
        }
      : null
  }
}

const closeRedeemConfirm = () => {
  if (isRedeeming.value) return
  confirmRedeem.value = null
}

const toggleIconPanel = async () => {
  iconPanelOpen.value = !iconPanelOpen.value
  if (iconPanelOpen.value) {
    editMessage.value = ''
    message.value = ''
    mobileEditorTab.value = 'details'
    mobileIconPage.value = 0
    iconSearch.value = ''
    iconFilter.value = 'Todos'
    previewIconId.value = pendingSelectedIcon.value || profile.value?.selectedIcon || 'kirby-01'
    await nextTick()
  }
}

const closeIconPanel = () => {
  iconPanelOpen.value = false
  iconUploadOpen.value = false
  iconSearch.value = ''
  editMessage.value = ''
  resetUploadIconForm()
}

const openIconCollection = () => {
  iconCollectionOpen.value = true
}

const closeIconCollection = () => {
  iconCollectionOpen.value = false
}

const openIconUpload = (icon = null) => {
  if (!isAdminOwnProfile.value) return
  uploadIconMessage.value = ''
  resetUploadIconForm()
  const editableIcon = icon && !icon.builtIn ? icon : manageableProfileIcons.value[0]
  if (!editableIcon) {
    uploadIconMessage.value = 'Crea carpetas en src/iconos/profileIcons, por ejemplo src/iconos/profileIcons/Mario/icon_01.png.'
    iconUploadOpen.value = true
    return
  }
  editingIconId.value = editableIcon.id
  uploadIconPreview.value = editableIcon.src
  uploadIconDraft.value = {
    name: editableIcon.name,
    saga: iconSaga(editableIcon),
    cost: iconCost(editableIcon),
    visible: Boolean(editableIcon.visible && !editableIcon.archived)
  }
  iconUploadOpen.value = true
}

const closeIconUpload = () => {
  if (isUploadingIcon.value) return
  iconUploadOpen.value = false
  resetUploadIconForm()
}

const resetUploadIconForm = () => {
  uploadIconPreview.value = ''
  uploadIconMessage.value = ''
  editingIconId.value = ''
  uploadIconDraft.value = {
    name: '',
    saga: iconFilter.value !== 'Todos' ? iconFilter.value : 'Kirby',
    cost: ICON_COST,
    visible: true
  }
}

const selectManagedIcon = (icon) => {
  if (!icon || isUploadingIcon.value) return
  editingIconId.value = icon.id
  uploadIconPreview.value = icon.src
  uploadIconDraft.value = {
    name: icon.name,
    saga: iconSaga(icon),
    cost: iconCost(icon),
    visible: Boolean(icon.visible && !icon.archived)
  }
  uploadIconMessage.value = ''
}

const toggleManagedIconVisibility = (icon) => {
  if (!icon || isUploadingIcon.value) return
  if (editingIconId.value !== icon.id) {
    selectManagedIcon(icon)
  }
  uploadIconDraft.value.visible = !uploadIconDraft.value.visible
}

const managedIconVisible = (icon) => (
  editingIconId.value === icon.id
    ? uploadIconDraft.value.visible
    : Boolean(icon.visible && !icon.archived)
)

const saveUploadedIcon = async () => {
  if (!isAdminOwnProfile.value || isUploadingIcon.value) return
  const icon = manageableProfileIcons.value.find(item => item.id === editingIconId.value)
  if (!icon) {
    uploadIconMessage.value = 'Elige un icono local para gestionarlo.'
    return
  }

  isUploadingIcon.value = true
  uploadIconMessage.value = ''

  try {
    const saved = await updateProfileIcon({
      iconId: icon.id,
      name: uploadIconDraft.value.name,
      saga: uploadIconDraft.value.saga,
      cost: uploadIconDraft.value.cost,
      visible: uploadIconDraft.value.visible,
      sourcePath: icon.sourcePath,
      src: icon.src
    })
    customIcons.value = customIcons.value.map(item => (
      item.id === icon.id ? { ...item, ...saved } : item
    ))
    previewIconId.value = icon.id
    iconFilter.value = saved.saga
    iconSearch.value = ''
    iconUploadOpen.value = false
    resetUploadIconForm()
    message.value = saved.visible ? 'Icono visible para todo el mundo.' : 'Icono oculto para todo el mundo.'
  } catch (error) {
    uploadIconMessage.value = 'No se pudo guardar la ficha del icono.'
  } finally {
    isUploadingIcon.value = false
  }
}

const deleteUploadedIcon = async () => {
  if (!isAdminOwnProfile.value || !previewIcon.value || previewIcon.value.builtIn || isDeletingIcon.value) return
  const icon = previewIcon.value

  isDeletingIcon.value = true
  message.value = ''

  try {
    await updateProfileIcon({
      iconId: icon.id,
      name: icon.name,
      saga: iconSaga(icon),
      cost: iconCost(icon),
      visible: false,
      sourcePath: icon.sourcePath,
      src: icon.src
    })
    customIcons.value = customIcons.value.map(item => (
      item.id === icon.id ? { ...item, visible: false, archived: true } : item
    ))
    previewIconId.value = pendingSelectedIcon.value === icon.id ? 'kirby-01' : pendingSelectedIcon.value || 'kirby-01'
    if (editingIconId.value === icon.id) closeIconUpload()
    message.value = 'Icono oculto para todo el mundo.'
  } catch (error) {
    message.value = 'No se pudo ocultar el icono.'
  } finally {
    isDeletingIcon.value = false
  }
}

const changeMobileIconPage = (direction) => {
  mobileIconPage.value = (mobileIconPage.value + direction + mobileIconPageCount.value) % mobileIconPageCount.value
}

const chooseIconCard = (icon, event) => {
  previewIconId.value = icon.id
  unlockIcon(icon, event)
}

const equipPreviewIcon = async (event) => {
  const icon = previewIcon.value
  if (!icon) return
  if (effectiveUnlockedIcons.value.includes(icon.id)) {
    await selectIcon(icon.id)
    return
  }
  unlockIcon(icon, event)
}

const unlockIcon = async (icon, event) => {
  if (!isOwnProfile.value || isRedeeming.value || isSavingIcon.value) return

  if (effectiveUnlockedIcons.value.includes(icon.id)) {
    return
  }

  if (!canUnlock(icon)) {
    deniedIcon.value = icon.id
    setTimeout(() => {
      if (deniedIcon.value === icon.id) deniedIcon.value = ''
    }, 620)
    return
  }

  requestRedeemIcon(icon, event)
}

const confirmUnlockIcon = async () => {
  const icon = confirmRedeem.value?.icon
  if (!icon || !canUnlock(icon) || isRedeeming.value) return
  const targetRect = confirmRedeem.value?.targetRect || null

  isRedeeming.value = true
  message.value = ''
  redeemingIcon.value = icon.id
  confirmRedeem.value = null

  await nextTick()

  if (targetRect) {
    launchSpendStars({
      currentTarget: {
        getBoundingClientRect: () => targetRect
      }
    })
  }

  if (iconTestMode.value) {
    setTimeout(() => {
      testStars.value = Math.max(0, testStars.value - iconCost(icon))
      testUnlockedIcons.value = [...new Set([...testUnlockedIcons.value, icon.id])]
      pendingSelectedIcon.value = icon.id
      redeemingIcon.value = ''
      unlockBurst.value = icon.id
      isRedeeming.value = false
      setTimeout(() => {
        unlockBurst.value = ''
      }, 1500)
    }, 900)
    return
  }

  try {
    await redeemIcon({
      userId: profileId.value,
      iconId: icon.id,
      stars: displayStars.value,
      unlockedIcons: unlockedIcons.value,
      cost: iconCost(icon),
      iconUrl: icon.builtIn ? '' : icon.src
    })
    profile.value = {
      ...profile.value,
      stars: Math.max(0, stars.value - iconCost(icon)),
      unlockedIcons: [...unlockedIcons.value, icon.id],
      selectedIcon: icon.id,
      selectedIconUrl: icon.builtIn ? '' : icon.src,
      updatedAt: Date.now()
    }
    pendingSelectedIcon.value = icon.id
    redeemingIcon.value = ''
    unlockBurst.value = icon.id
    setTimeout(() => {
      unlockBurst.value = ''
    }, 1500)
  } catch (error) {
    redeemingIcon.value = ''
    message.value = 'No se pudo canjear el icono.'
  } finally {
    isRedeeming.value = false
  }
}

const saveProfile = async () => {
  const user = auth.currentUser
  if (!isOwnProfile.value || !user || isSavingProfile.value) return

  const cleanName = profileDraft.value.name.trim() || user.displayName || 'Usuario'
  const cleanDescription = profileDraft.value.description.trim()
  const cleanSocialLinks = {
    tiktok: normalizeSocialUrl(profileDraft.value.socialLinks.tiktok),
    youtube: normalizeSocialUrl(profileDraft.value.socialLinks.youtube),
    twitch: normalizeSocialUrl(profileDraft.value.socialLinks.twitch)
  }
  isSavingProfile.value = true
  editMessage.value = ''

  try {
    await updateDoc(doc(db, 'users', profileId.value), {
      name: cleanName,
      description: cleanDescription,
      socialLinks: cleanSocialLinks,
      updatedAt: Date.now()
    })
    await updateProfile(user, {
      displayName: cleanName
    })
    profile.value = {
      ...profile.value,
      name: cleanName,
      description: cleanDescription,
      socialLinks: cleanSocialLinks,
      updatedAt: Date.now()
    }
    editMessage.value = 'Perfil actualizado.'
  } catch (error) {
    editMessage.value = 'No se pudo guardar el perfil.'
  } finally {
    isSavingProfile.value = false
  }
}

const selectIcon = async (iconId) => {
  if (!isOwnProfile.value || !effectiveUnlockedIcons.value.includes(iconId) || isSavingIcon.value) return

  if (iconTestMode.value && testUnlockedIcons.value.includes(iconId)) {
    pendingSelectedIcon.value = iconId
    return
  }

  isSavingIcon.value = true
  message.value = ''
  const selectedCatalogIcon = allProfileIcons.value.find(icon => icon.id === iconId)
  const selectedIconUrl = selectedCatalogIcon?.builtIn ? '' : selectedCatalogIcon?.src || ''

  try {
    await updateDoc(doc(db, 'users', profileId.value), {
      selectedIcon: iconId,
      selectedIconUrl,
      updatedAt: Date.now()
    })
    profile.value = {
      ...profile.value,
      selectedIcon: iconId,
      selectedIconUrl,
      updatedAt: Date.now()
    }
  } catch (error) {
    message.value = 'No se pudo guardar el icono.'
  } finally {
    isSavingIcon.value = false
  }
}

const openPost = (id) => {
  if (id) router.push(`/post/${id}`)
}

const changeRecentPost = (direction) => {
  const total = postActivityItems.value.length
  if (!total) return
  recentPostIndex.value = (recentPostIndex.value + direction + total) % total
}

const toggleFollow = async () => {
  const user = auth.currentUser
  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (isOwnProfile.value || followBusy.value || !profile.value) return

  followBusy.value = true
  const now = Date.now()
  const followerRef = doc(db, 'users', profileId.value, 'followers', user.uid)
  const followingRef = doc(db, 'users', user.uid, 'following', profileId.value)

  try {
    if (isFollowing.value) {
      await Promise.all([
        deleteDoc(followerRef),
        deleteDoc(followingRef),
        updateDoc(doc(db, 'users', profileId.value), {
          followersCount: increment(-1),
          updatedAt: now
        }).catch(() => {}),
        updateDoc(doc(db, 'users', user.uid), {
          followingCount: increment(-1),
          updatedAt: now
        }).catch(() => {})
      ])
      isFollowing.value = false
      followersTotal.value = Math.max(0, followersTotal.value - 1)
      followersList.value = followersList.value.filter(item => item.id !== user.uid)
      return
    }

    await Promise.all([
      setDoc(followerRef, {
        userId: user.uid,
        name: user.displayName || user.email || 'Usuario',
        imageUrl: auth.currentUser?.photoURL || '',
        followedAt: now
      }),
      setDoc(followingRef, {
        userId: profileId.value,
        name: profile.value.name || profile.value.email || 'Usuario',
        imageUrl: profileIcon.value,
        followedAt: now
      }),
      updateDoc(doc(db, 'users', profileId.value), {
        followersCount: increment(1),
        updatedAt: now
      }).catch(() => {}),
      updateDoc(doc(db, 'users', user.uid), {
        followingCount: increment(1),
        updatedAt: now
      }).catch(() => {})
    ])
    await notifyNewFollower({
      targetUserId: profileId.value,
      actor: {
        uid: user.uid,
        name: user.displayName || user.email || 'Usuario'
      }
    })
    isFollowing.value = true
    followersTotal.value += 1
    followersList.value = [
      {
        id: user.uid,
        name: user.displayName || user.email || 'Usuario',
        email: user.email || '',
        role: 'user',
        imageUrl: auth.currentUser?.photoURL || fallbackProfileIcon,
        canChat: true
      },
      ...followersList.value.filter(item => item.id !== user.uid)
    ]
  } finally {
    followBusy.value = false
  }
}

const openRelationModal = (type) => {
  relationModal.value = type
}

const closeRelationModal = () => {
  relationModal.value = ''
}

const openRelationProfile = (user) => {
  closeRelationModal()
  router.push(`/perfil/${user.id}`)
}

const openRelationChat = (user) => {
  const current = auth.currentUser
  if (!current) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (!canUseDirectChat.value) {
    openRelationProfile(user)
    return
  }

  window.dispatchEvent(new CustomEvent('open-direct-chat', {
    detail: {
      id: user.id,
      name: user.name || user.email || 'Usuario',
      email: user.email || '',
      imageUrl: user.imageUrl || fallbackProfileIcon,
      role: user.role || 'user',
      canChat: Boolean(user.canChat)
    }
  }))
  closeRelationModal()
}

const openDirectMessage = () => {
  const user = auth.currentUser
  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (isOwnProfile.value || !profile.value) return
  if (!canUseDirectChat.value) return

  window.dispatchEvent(new CustomEvent('open-direct-chat', {
    detail: {
      id: profileId.value,
      name: profile.value.name || profile.value.email || 'Usuario',
      email: profile.value.email || '',
      imageUrl: profileIcon.value,
      role: profile.value.role || 'user',
      canChat: Boolean(profile.value.canChat)
    }
  }))
}

const shareProfile = async () => {
  const url = `${window.location.origin}/perfil/${profileId.value}`
  const title = profile.value?.name || profile.value?.email || 'Perfil de Galaxia Nintendera'
  try {
    if (navigator.share) {
      await navigator.share({ title, url })
      return
    }
    await navigator.clipboard.writeText(url)
    message.value = 'Enlace del perfil copiado.'
  } catch (error) {
    if (error?.name !== 'AbortError') {
      message.value = 'No se pudo compartir el perfil.'
    }
  }
}

watch(() => route.params.uid, loadProfile)
watch(postActivityItems, (items) => {
  if (recentPostIndex.value >= items.length) recentPostIndex.value = 0
})
watch(activityTab, () => {
  showAllRecentPosts.value = false
})
watch([iconSearch, iconFilter], () => {
  mobileIconPage.value = 0
})
watch([iconPanelOpen, iconCollectionOpen, iconUploadOpen, rewardsExpanded, relationModal, confirmRedeem], ([isIconOpen, isCollectionOpen, isUploadOpen, isRewardsOpen, isRelationOpen, isRedeemOpen]) => {
  document.body.style.overflow = isIconOpen || isCollectionOpen || isUploadOpen || isRewardsOpen || Boolean(isRelationOpen) || Boolean(isRedeemOpen) ? 'hidden' : ''
})
onMounted(() => {
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  loadProfile()
})
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <main class="profile-page">
    <div v-if="!isLoading && !profile" class="profile-empty">
      Este perfil no existe.
    </div>

    <template v-if="!isLoading && profile">
      <section class="profile-hero">
        <button
          class="profile-level-pill"
          type="button"
          :aria-expanded="rewardsExpanded"
          @click="rewardsExpanded = !rewardsExpanded"
        >
          <span class="profile-level-icon">
            <img v-if="currentAchievement.iconUrl" :src="currentAchievement.iconUrl" alt="" />
            <i v-else class="fas fa-gem"></i>
          </span>
          <span class="profile-level-label">{{ currentAchievement.label }}</span>
          <i class="fas fa-crown profile-level-crown" aria-hidden="true"></i>
          <i :class="rewardsExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
        </button>

        <div class="profile-avatar-wrap">
          <span class="profile-avatar-circle">
            <img :src="profileIcon" alt="" class="profile-avatar" />
          </span>
          <span class="role-badge">{{ profile.role || 'user' }}</span>
          <button
            v-if="isOwnProfile"
            class="avatar-edit-shortcut"
            type="button"
            aria-label="Editar perfil e iconos"
            @click="toggleIconPanel"
          >
            <i class="fas fa-pen"></i>
            <span>Iconos</span>
          </button>
        </div>

        <div class="profile-main-copy">
          <h1>{{ profile.name || profile.email || 'Usuario' }}</h1>
          <small class="profile-username">@{{ profile.username || (profile.name || profile.email || 'usuario').toString().split('@')[0].replace(/\s+/g, '') }}</small>
          <p>{{ profile.description || 'Miembro de la comunidad' }}</p>
          <div class="profile-meta-row">
            <span v-if="memberSince"><i class="fas fa-calendar"></i> Miembro desde {{ memberSince }}</span>
            <span v-if="profile.location"><i class="fas fa-location-dot"></i> {{ profile.location }}</span>
            <span v-if="profile.birthday"><i class="fas fa-cake-candles"></i> {{ profile.birthday }}</span>
          </div>
        </div>

        <div class="hero-rewards-panel">
          <button type="button" @click.stop.prevent="openIconCollection">
            <i class="fas fa-icons"></i>
            <span>{{ redeemedProfileIcons.length }} iconos</span>
          </button>
          <div v-if="visibleProfileIcons.length" class="hero-icon-stack">
            <span v-for="icon in visibleProfileIcons.slice(0, 4)" :key="icon.id">
              <img :src="icon.src" alt="" />
            </span>
          </div>
        </div>

        <div class="profile-social-panel">
          <strong>Mis redes</strong>
          <div class="profile-social-links">
          <component
            v-for="item in socialItems"
            :is="item.url ? 'a' : 'span'"
            :key="item.id"
            :href="item.url"
            :aria-label="item.label"
            target="_blank"
            rel="noopener noreferrer"
            :class="{ disabled: !item.url }"
            @click.stop
          >
            <i :class="item.icon"></i>
          </component>
          </div>
        </div>

        <div ref="starWalletEl" class="star-wallet" :class="{ spending: flyingStars.length }">
          <i class="fas fa-star"></i>
          <strong>{{ displayStars }}</strong>
          <span>estrellas</span>
        </div>

        <div class="profile-actions">
          <button
            v-if="isOwnProfile"
            class="profile-edit-main-action"
            :class="{ active: iconPanelOpen }"
            type="button"
            @click="toggleIconPanel"
          >
            <i class="fas fa-user-pen"></i>
            Editar perfil
          </button>
          <button v-if="!isOwnProfile" type="button" :disabled="followBusy" @click="toggleFollow">
            <i class="fas fa-plus"></i>
            {{ isFollowing ? 'Dejar de seguir' : 'Seguir' }}
          </button>
          <button v-if="!isOwnProfile && canUseDirectChat" type="button" class="ghost" @click="openDirectMessage">
            <i class="far fa-envelope"></i>
            Enviar mensaje
          </button>
          <button type="button" class="ghost" @click="shareProfile">
            <i class="fas fa-share-nodes"></i>
            Compartir perfil
          </button>
        </div>

      </section>

      <div class="profile-hero-stats" aria-label="Resumen rapido del perfil">
        <div v-for="item in heroStats" :key="item.id">
          <i :class="item.icon"></i>
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <Transition name="modal-fade">
        <div v-if="rewardsExpanded" class="achievement-modal-backdrop" @click.self="rewardsExpanded = false">
          <section class="achievement-roadmap achievement-modal-card">
            <button class="icon-modal-close" type="button" aria-label="Cerrar logros" @click="rewardsExpanded = false">
              <i class="fas fa-xmark"></i>
            </button>

            <div class="achievement-roadmap-head">
              <div>
                <span>Progreso del perfil</span>
                <h2>Logros por desbloquear</h2>
              </div>
              <div class="achievement-roadmap-actions">
                <button v-if="canManageAchievements" type="button" @click="startCreateAchievement">
                  <i class="fas fa-plus"></i>
                  Agregar logro
                </button>
                <strong>{{ earnedAchievements.length }} / {{ managedAchievements.length }} logros</strong>
              </div>
            </div>

            <div class="achievement-type-row" aria-label="Categorias de logros">
              <span v-for="type in achievementTypeCounts" :key="type.value">
                <i :class="type.icon"></i>
                {{ type.label }}
                <strong>{{ type.count }}</strong>
              </span>
            </div>

            <form v-if="canManageAchievements && achievementEditorOpen" class="achievement-editor" @submit.prevent="saveAchievementDraft">
              <label class="achievement-field-name">
                Nombre
                <input v-model="achievementDraft.label" placeholder="Ej: Ganador espacial" />
              </label>
              <label class="achievement-field-type">
                Tipo de logro
                <select v-model="achievementDraft.type">
                  <option v-for="type in achievementTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </label>
              <label class="achievement-field-target">
                Objetivo
                <input v-model.number="achievementDraft.target" type="number" min="1" />
              </label>
              <label class="achievement-field-description">
                Descripcion
                <input v-model="achievementDraft.description" placeholder="Ej: Desbloquear 10 iconos" />
              </label>
              <label class="achievement-field-icon">
                Icono (URL)
                <input v-model="achievementDraft.iconUrl" placeholder="https://..." />
              </label>
              <div class="achievement-editor-actions">
                <button type="button" @click="achievementEditorOpen = false; resetAchievementDraft()">Cancelar</button>
                <button type="submit">{{ editingAchievementId ? 'Guardar logro' : 'Crear logro' }}</button>
              </div>
            </form>

            <div class="achievement-roadmap-grid">
              <article
                v-for="achievement in achievementRoadmap"
                :key="achievement.id"
                class="achievement-roadmap-card"
                :class="{ unlocked: achievement.unlocked, next: achievement.isNext }"
              >
                <span class="achievement-orb">
                  <img v-if="achievement.iconUrl" :src="achievement.iconUrl" alt="" />
                  <i v-else :class="achievement.unlocked ? 'fas fa-check' : achievement.typeMeta.icon"></i>
                </span>
                <div>
                  <em class="achievement-type-chip">{{ achievement.typeMeta.label }}</em>
                  <strong>{{ achievement.label }}</strong>
                  <p>{{ achievement.description }}</p>
                  <div class="achievement-progress">
                    <i :style="{ width: achievement.progress + '%' }"></i>
                  </div>
                  <small>
                    {{ achievement.unlocked ? 'Desbloqueado' : `${achievement.currentValue} / ${achievement.target} ${achievement.typeMeta.unit}` }}
                  </small>
                  <div v-if="canManageAchievements" class="achievement-card-actions">
                    <button type="button" @click="editAchievement(achievement)">Editar</button>
                    <button type="button" @click="deleteAchievement(achievement)">Eliminar</button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </Transition>

      <span
        v-for="star in flyingStars"
        :key="star.id"
        class="spend-star"
        :style="{
          left: `${star.x}px`,
          top: `${star.y}px`,
          '--tx': `${star.tx}px`,
          '--ty': `${star.ty}px`,
          '--delay': `${star.delay}ms`
        }"
        aria-hidden="true"
      >
        <i class="fas fa-star"></i>
      </span>

      <section class="profile-social-grid">
        <div class="profile-section profile-communities">
          <div class="section-head">
            <div>
              <span>Galaxias / Comunidades</span>
              <h2>Comunidades activas</h2>
            </div>
            <button type="button" @click="router.push('/comunidad')">Ver todas</button>
          </div>

          <div class="community-card-row">
            <button
              v-for="community in communityCards"
              :key="community.name"
              type="button"
              @click="router.push(`/comunidad?id=${community.id}`)"
            >
              <img v-if="community.iconUrl || community.bannerUrl" :src="community.iconUrl || community.bannerUrl" alt="" />
              <span v-else class="community-letter">{{ community.name?.slice(0, 2).toUpperCase() }}</span>
              <span class="community-overlay"></span>
              <strong>{{ community.name }}</strong>
              <small>{{ community.role || 'Miembro' }}</small>
              <em>{{ formatAgo(community.joinedAt) }}</em>
            </button>
          </div>
          <p v-if="!communityCards.length" class="mini-empty">Todavia no pertenece a ninguna comunidad.</p>
        </div>

        <div class="profile-section profile-activity">
          <div class="section-head">
            <div>
              <span>Actividad reciente</span>
              <h2>{{ activityTab === 'threads' ? 'Hilos publicados' : 'Posts recientes' }}</h2>
            </div>
            <div class="activity-tabs">
              <button type="button" :class="{ active: activityTab === 'posts' }" @click="activityTab = 'posts'">
                Posts
              </button>
              <button type="button" :class="{ active: activityTab === 'threads' }" @click="activityTab = 'threads'">
                Hilos
              </button>
            </div>
          </div>

          <Transition name="activity-swap" mode="out-in">
            <div v-if="activityTab === 'posts'" key="posts" class="recent-post-showcase">
              <button
                v-if="currentRecentPost"
                class="recent-post-card"
                type="button"
                @click="currentRecentPost.action"
              >
                <img v-if="currentRecentPost.image" :src="currentRecentPost.image" alt="" />
                <span v-else class="recent-post-fallback"></span>
                <span class="recent-post-shade"></span>
                <div>
                  <small>{{ currentRecentPost.label }}</small>
                  <strong>{{ currentRecentPost.title }}</strong>
                  <em>{{ currentRecentPost.time }}</em>
                </div>
              </button>

              <div v-if="postActivityItems.length" class="recent-post-controls">
                <button type="button" aria-label="Post anterior" @click="changeRecentPost(-1)">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <span>{{ recentPostIndex + 1 }} / {{ postActivityItems.length }}</span>
                <button type="button" aria-label="Post siguiente" @click="changeRecentPost(1)">
                  <i class="fas fa-chevron-right"></i>
                </button>
                <button type="button" class="view-all-posts" @click="showAllRecentPosts = !showAllRecentPosts">
                  {{ showAllRecentPosts ? 'Ocultar' : 'Ver todos' }}
                </button>
              </div>

              <div v-if="showAllRecentPosts" class="recent-post-list">
                <button v-for="item in postActivityItems" :key="item.id" type="button" @click="item.action">
                  <span v-if="item.image"><img :src="item.image" alt="" /></span>
                  <i v-else class="fas fa-newspaper"></i>
                  <strong>{{ item.title }}</strong>
                </button>
              </div>
            </div>

            <div v-else key="threads" class="activity-list">
              <button v-for="item in visibleActivityItems" :key="`${item.label}-${item.title}`" type="button" @click="item.action">
                <i :class="item.icon"></i>
                <div>
                  <small>{{ item.label }}</small>
                  <strong>{{ item.title }}</strong>
                </div>
                <time>{{ item.time }}</time>
              </button>
            </div>
          </Transition>
          <p v-if="!visibleActivityItems.length" class="mini-empty">Todavia no hay actividad publica.</p>
        </div>
      </section>

      <ProfileFavoritesPreview
        v-model:expanded="favoritesExpanded"
        :favorites="favorites"
        @open-post="openPost"
      />

      <Transition name="modal-fade">
        <div v-if="iconCollectionOpen" class="icon-collection-backdrop" @click.self="closeIconCollection">
          <section class="icon-collection-card">
            <button class="icon-modal-close" type="button" aria-label="Cerrar coleccion de iconos" @click="closeIconCollection">
              <i class="fas fa-xmark"></i>
            </button>

            <div class="icon-collection-head">
              <span class="collection-profile-avatar">
                <img :src="profileIcon" alt="" />
              </span>
              <div>
                <span class="collection-kicker">Coleccion canjeada</span>
                <h2>{{ profile.name || profile.email || 'Usuario' }}</h2>
                <p>{{ redeemedProfileIcons.length }} iconos desbloqueados por categoria</p>
              </div>
              <strong>
                <i class="fas fa-icons"></i>
                {{ redeemedProfileIcons.length }}
              </strong>
            </div>

            <div v-if="groupedRedeemedIcons.length" class="icon-collection-groups">
              <article v-for="group in groupedRedeemedIcons" :key="group.saga" class="icon-collection-group">
                <header>
                  <span>{{ group.saga }}</span>
                  <small>{{ group.icons.length }} iconos</small>
                </header>
                <div class="collection-icon-grid">
                  <figure v-for="icon in group.icons" :key="icon.id" :class="{ equipped: profile.selectedIcon === icon.id }">
                    <span>
                      <img :src="icon.src" alt="" />
                    </span>
                    <figcaption>
                      {{ icon.name }}
                      <em v-if="profile.selectedIcon === icon.id">Equipado</em>
                    </figcaption>
                  </figure>
                </div>
              </article>
            </div>

            <div v-else class="icon-collection-empty">
              <i class="fas fa-icons"></i>
              <strong>Sin iconos canjeados todavia</strong>
              <p>Cuando desbloquee iconos, apareceran aqui organizados por categoria.</p>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="modal-fade">
        <div v-if="iconPanelOpen" class="icon-modal-backdrop" @click.self="closeIconPanel">
          <section ref="iconShopEl" class="icon-modal-card">
            <button class="icon-modal-close" type="button" aria-label="Cerrar selector de iconos" @click="closeIconPanel">
              <i class="fas fa-xmark"></i>
            </button>

            <div class="icon-modal-head">
              <span class="icon-modal-symbol"><i class="fas fa-user-pen"></i></span>
              <div>
                <h2>Editar perfil</h2>
                <p>Ajusta tu nombre, descripcion e icono de comunidad</p>
              </div>
              <div class="icon-modal-actions">
                <div ref="starWalletEl" class="icon-modal-wallet" :class="{ spending: flyingStars.length }">
                  <i class="fas fa-star"></i>
                  <strong>{{ displayStars }}</strong>
                  <span>estrellas</span>
                </div>
                <button
                  v-if="isAdminOwnProfile"
                  class="icon-add-button"
                  type="button"
                  title="Gestionar iconos"
                  aria-label="Gestionar iconos"
                  @click="openIconUpload"
                >
                  <i class="fas fa-sliders"></i>
                </button>
              </div>
            </div>

            <nav class="mobile-editor-tabs" aria-label="Editor de perfil">
              <button type="button" :class="{ active: mobileEditorTab === 'details' }" @click="mobileEditorTab = 'details'">
                <i class="fas fa-id-card"></i>
                Datos
              </button>
              <button type="button" :class="{ active: mobileEditorTab === 'icons' }" @click="mobileEditorTab = 'icons'">
                <i class="fas fa-wand-magic-sparkles"></i>
                Iconos
              </button>
            </nav>

            <div class="profile-editor-layout">
              <aside class="profile-editor-panel" :class="{ 'mobile-hidden-panel': mobileEditorTab !== 'details' }">
                <span class="editor-avatar-preview">
                  <img :src="profileIcon" alt="" />
                </span>

                <div class="profile-edit-form modal-profile-form">
                  <label>
                    Nombre
                    <input v-model="profileDraft.name" />
                  </label>

                  <label>
                    Descripcion
                    <textarea v-model="profileDraft.description" rows="4"></textarea>
                  </label>

                  <div class="social-edit-grid modal-social-grid">
                    <label>
                      TikTok
                      <input v-model="profileDraft.socialLinks.tiktok" placeholder="https://www.tiktok.com/@usuario" />
                    </label>

                    <label>
                      YouTube
                      <input v-model="profileDraft.socialLinks.youtube" placeholder="https://www.youtube.com/@canal" />
                    </label>

                    <label>
                      Twitch
                      <input v-model="profileDraft.socialLinks.twitch" placeholder="https://www.twitch.tv/usuario" />
                    </label>
                  </div>

                  <div class="profile-edit-actions modal-edit-actions">
                    <p v-if="editMessage">{{ editMessage }}</p>
                    <button type="button" :disabled="isSavingProfile" @click="saveProfile">
                      {{ isSavingProfile ? 'Guardando...' : 'Guardar cambios' }}
                    </button>
                  </div>
                </div>
              </aside>

              <section class="icon-picker-panel" :class="{ 'mobile-hidden-panel': mobileEditorTab !== 'icons' }">
                <div class="icon-modal-toolbar">
                  <label class="icon-search-box">
                    <i class="fas fa-search"></i>
                    <input v-model="iconSearch" placeholder="Buscar icono..." />
                  </label>

                  <div class="icon-filter-row">
                    <button
                      v-for="filter in iconFilters"
                      :key="filter"
                      type="button"
                      :class="{ active: iconFilter === filter }"
                      @click="iconFilter = filter"
                    >
                      {{ filter }}
                    </button>
                  </div>
                </div>

                <div class="icon-modal-layout">
                  <div class="icon-modal-list">
                    <strong>Todos los iconos</strong>

                    <div v-if="isAdminOwnProfile" class="icon-test-panel" :class="{ active: iconTestMode }">
                      <button
                        type="button"
                        :aria-pressed="iconTestMode"
                        :title="iconTestMode ? 'Desactivar modo test de canjes' : 'Activar modo test de canjes'"
                        @click="toggleIconTestMode"
                      >
                        <i :class="iconTestMode ? 'fas fa-toggle-on' : 'fas fa-toggle-off'"></i>
                        Test
                      </button>
                    </div>

                    <p v-if="message" class="profile-message soft">{{ message }}</p>

                    <div class="icon-grid compact modal-icons desktop-icon-grid">
                      <button
                        v-for="icon in filteredIconCatalog"
                        :key="icon.id"
                        class="icon-card"
                        :class="{
                          locked: !effectiveUnlockedIcons.includes(icon.id),
                          test: iconTestMode && testUnlockedIcons.includes(icon.id),
                          selected: previewIcon.id === icon.id,
                          saved: profile.selectedIcon === icon.id,
                          denied: deniedIcon === icon.id,
                          redeeming: redeemingIcon === icon.id,
                          burst: unlockBurst === icon.id
                        }"
                        :aria-label="`${icon.name} - ${iconState(icon)}`"
                        type="button"
                        @click="chooseIconCard(icon, $event)"
                      >
                        <span v-if="redeemingIcon === icon.id" class="redeem-fill" aria-hidden="true">
                          <i></i>
                        </span>
                        <span class="icon-art">
                          <img :src="icon.src" alt="" />
                        </span>
                        <span v-if="!effectiveUnlockedIcons.includes(icon.id)" class="lock-badge" aria-hidden="true">
                          <i class="fas fa-lock"></i>
                        </span>
                        <small>
                          <i v-if="!effectiveUnlockedIcons.includes(icon.id)" class="fas fa-star"></i>
                          {{ effectiveUnlockedIcons.includes(icon.id) ? iconState(icon) : iconCost(icon) }}
                        </small>
                      </button>
                    </div>

                    <div class="icon-grid compact modal-icons mobile-icon-grid">
                      <button
                        v-for="icon in mobileIconCatalog"
                        :key="icon.id"
                        class="icon-card"
                        :class="{
                          locked: !effectiveUnlockedIcons.includes(icon.id),
                          test: iconTestMode && testUnlockedIcons.includes(icon.id),
                          selected: previewIcon.id === icon.id,
                          saved: profile.selectedIcon === icon.id,
                          denied: deniedIcon === icon.id,
                          redeeming: redeemingIcon === icon.id,
                          burst: unlockBurst === icon.id
                        }"
                        :aria-label="`${icon.name} - ${iconState(icon)}`"
                        type="button"
                        @click="chooseIconCard(icon, $event)"
                      >
                        <span v-if="redeemingIcon === icon.id" class="redeem-fill" aria-hidden="true">
                          <i></i>
                        </span>
                        <span class="icon-art">
                          <img :src="icon.src" alt="" />
                        </span>
                        <span v-if="!effectiveUnlockedIcons.includes(icon.id)" class="lock-badge" aria-hidden="true">
                          <i class="fas fa-lock"></i>
                        </span>
                        <small>
                          <i v-if="!effectiveUnlockedIcons.includes(icon.id)" class="fas fa-star"></i>
                          {{ effectiveUnlockedIcons.includes(icon.id) ? iconState(icon) : iconCost(icon) }}
                        </small>
                      </button>
                    </div>

                    <div class="mobile-icon-pager">
                      <button type="button" aria-label="Iconos anteriores" @click="changeMobileIconPage(-1)">
                        <i class="fas fa-chevron-left"></i>
                      </button>
                      <span>{{ mobileIconPage + 1 }} / {{ mobileIconPageCount }}</span>
                      <button type="button" aria-label="Iconos siguientes" @click="changeMobileIconPage(1)">
                        <i class="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>

                  <aside class="icon-preview-panel">
                    <h3>Vista previa</h3>
                    <span class="preview-large-avatar">
                      <img :src="previewIcon.src" alt="" />
                    </span>
                    <strong>{{ previewIcon.name }}</strong>
                    <small>{{ iconSaga(previewIcon) }}</small>
                    <p>{{ previewIconEquipped ? 'Este icono esta equipado ahora mismo.' : (effectiveUnlockedIcons.includes(previewIcon.id) ? 'Icono desbloqueado para tu perfil.' : `Necesitas ${iconCost(previewIcon)} estrellas para desbloquearlo.`) }}</p>
                    <button
                      type="button"
                      :class="{ equipped: previewIconEquipped }"
                      :disabled="isSavingIcon || isRedeeming || previewIconEquipped"
                      @click="equipPreviewIcon"
                    >
                      <i :class="previewIconEquipped ? 'fas fa-check' : (effectiveUnlockedIcons.includes(previewIcon.id) ? 'fas fa-shirt' : 'fas fa-star')"></i>
                      {{ previewIconEquipped ? 'Icono equipado' : (effectiveUnlockedIcons.includes(previewIcon.id) ? 'Equipar icono' : 'Desbloquear icono') }}
                    </button>
                    <div v-if="isAdminOwnProfile && !previewIcon.builtIn" class="icon-preview-actions">
                      <button type="button" :disabled="isDeletingIcon" @click="openIconUpload(previewIcon)">
                        <i class="fas fa-pen"></i>
                        Editar
                      </button>
                      <button type="button" class="danger" :disabled="isDeletingIcon" @click="deleteUploadedIcon">
                        <i class="fas fa-trash"></i>
                        {{ isDeletingIcon ? 'Ocultando...' : 'Ocultar' }}
                      </button>
                    </div>
                  </aside>
                </div>
              </section>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="modal-fade">
        <div v-if="iconUploadOpen" class="icon-upload-backdrop" @click.self="closeIconUpload">
          <section class="icon-upload-card">
            <button class="icon-modal-close" type="button" aria-label="Cerrar gestion de iconos" @click="closeIconUpload">
              <i class="fas fa-xmark"></i>
            </button>

            <div class="icon-modal-head upload-head">
              <span class="icon-modal-symbol"><i class="fas fa-sliders"></i></span>
              <div>
                <h2>Gestionar iconos</h2>
                <p>Toca el ojo para mostrar u ocultar, ajusta datos y guarda</p>
              </div>
            </div>

            <div class="icon-upload-layout">
              <div class="icon-manage-list">
                <div
                  v-for="icon in manageableProfileIcons"
                  :key="icon.id"
                  :class="{ selected: editingIconId === icon.id, visible: managedIconVisible(icon) }"
                  @click="selectManagedIcon(icon)"
                >
                  <img :src="icon.src" alt="" />
                  <span>
                    <strong>{{ icon.name }}</strong>
                    <small>{{ icon.sourcePath || iconSaga(icon) }}</small>
                  </span>
                  <span class="icon-manage-actions">
                    <button
                      type="button"
                      :aria-label="managedIconVisible(icon) ? 'Ocultar icono' : 'Mostrar icono'"
                      :title="managedIconVisible(icon) ? 'Ocultar para todos' : 'Mostrar para todos'"
                      @click.stop="toggleManagedIconVisibility(icon)"
                    >
                      <i :class="managedIconVisible(icon) ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
                    </button>
                  </span>
                </div>
                <p v-if="!manageableProfileIcons.length" class="profile-message soft">
                  Crea carpetas como src/iconos/profileIcons/Mario y sube ahi tus PNG, JPG o WEBP.
                </p>
              </div>

              <div class="icon-upload-form">
                <label>
                  Nombre
                  <input v-model="uploadIconDraft.name" :disabled="!editingIconId" placeholder="Mario Fuego" />
                </label>

                <label>
                  Categoria
                  <select v-model="uploadIconDraft.saga" :disabled="!editingIconId">
                    <option v-for="filter in iconFilters.filter(item => item !== 'Todos')" :key="filter" :value="filter">
                      {{ filter }}
                    </option>
                  </select>
                </label>

                <label>
                  Coste en estrellas
                  <input v-model.number="uploadIconDraft.cost" :disabled="!editingIconId" type="number" min="0" step="1" />
                </label>

                <aside class="icon-upload-mini-preview">
                  <span class="preview-large-avatar">
                    <img v-if="uploadIconPreview" :src="uploadIconPreview" alt="" />
                    <i v-else class="fas fa-wand-magic-sparkles"></i>
                  </span>
                  <strong>{{ uploadIconDraft.name || 'Nuevo icono' }}</strong>
                  <small>{{ uploadIconDraft.saga }} · {{ Math.max(0, Number(uploadIconDraft.cost || 0)) }} estrellas</small>
                </aside>

                <p v-if="uploadIconMessage" class="profile-message soft">{{ uploadIconMessage }}</p>
                <button type="button" :disabled="isUploadingIcon || !editingIconId" @click="saveUploadedIcon">
                  <i class="fas fa-floppy-disk"></i>
                  {{ isUploadingIcon ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="modal-fade">
        <div v-if="confirmRedeem" class="redeem-confirm-backdrop" @click.self="closeRedeemConfirm">
          <section class="redeem-confirm">
            <button class="redeem-close" type="button" aria-label="Cerrar" @click="closeRedeemConfirm">
              <i class="fas fa-xmark"></i>
            </button>

            <span class="redeem-confirm-icon">
              <img :src="confirmRedeem.icon.src" alt="" />
              <i class="fas fa-crown"></i>
            </span>

            <div>
              <span>Confirmar canje</span>
              <h2>Seguro que quieres canjear?</h2>
              <p>Vas a gastar {{ iconCost(confirmRedeem.icon) }} estrellas. Esta accion no se puede revertir.</p>
            </div>

            <div class="redeem-confirm-actions">
              <button type="button" class="cancel-redeem" :disabled="isRedeeming" @click="closeRedeemConfirm">
                Cancelar
              </button>
              <button type="button" class="confirm-redeem" :disabled="isRedeeming" @click="confirmUnlockIcon">
                {{ isRedeeming ? 'Canjeando...' : `Canjear por ${iconCost(confirmRedeem.icon)}` }}
              </button>
            </div>
          </section>
        </div>
      </Transition>

      <section v-if="publicProfiles.length" class="profile-section profile-directory">
        <div class="section-head">
          <div>
            <span>Comunidad</span>
            <h2>Otros perfiles</h2>
          </div>
        </div>

        <div class="profile-directory-grid">
          <button
            v-for="user in publicProfiles"
            :key="user.id"
            type="button"
            @click="router.push(`/perfil/${user.id}`)"
          >
            <span>
              <img :src="resolveProfileIcon(user)" alt="" />
            </span>
            <strong>{{ user.name || user.email || 'Usuario' }}</strong>
            <small>{{ user.readPostsCount || 0 }} posts leidos</small>
          </button>
        </div>
      </section>

      <section v-if="posts.length && !isCreatorProfile" class="profile-section">
        <div class="section-head">
          <div>
            <span>Publicaciones</span>
            <h2>Posts creados</h2>
          </div>
        </div>

        <div class="post-strip">
          <button v-for="item in posts" :key="item.id" @click="openPost(item.id)">
            <img v-if="item.image" :src="item.image" alt="" />
            <span v-else></span>
            <strong>{{ item.title }}</strong>
          </button>
        </div>
      </section>

      <Teleport to="body">
        <div v-if="relationModal" class="profile-relation-modal">
          <button class="relation-backdrop" type="button" aria-label="Cerrar" @click="closeRelationModal"></button>
          <section class="relation-card">
            <div class="relation-head">
              <div>
                <span>Comunidad</span>
                <h2>{{ relationTitle }}</h2>
              </div>
              <button type="button" aria-label="Cerrar" @click="closeRelationModal">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div v-if="relationUsers.length" class="relation-list">
              <article v-for="user in relationUsers" :key="user.id">
                <button type="button" class="relation-profile" @click="openRelationProfile(user)">
                  <img :src="user.imageUrl || fallbackProfileIcon" alt="" class="profile-icon-img" />
                  <span>
                    <strong>{{ user.name }}</strong>
                    <small>{{ user.username ? `@${user.username}` : user.role }}</small>
                  </span>
                </button>
                <button type="button" class="relation-talk" @click="canUseDirectChat ? openRelationChat(user) : openRelationProfile(user)">
                  <i :class="canUseDirectChat ? 'fas fa-comment-dots' : 'fas fa-user'"></i>
                  {{ canUseDirectChat ? 'Enviar mensaje' : 'Ver perfil' }}
                </button>
              </article>
            </div>

            <p v-else class="relation-empty">
              Todavia no hay usuarios en esta lista.
            </p>
          </section>
        </div>
      </Teleport>
    </template>
  </main>
</template>

<style scoped>
.profile-page {
  --profile-content-width: min(1500px, calc(100vw - 48px));
  background:
    radial-gradient(circle at 12% 4%, rgba(236, 72, 153, 0.14), transparent 28%),
    radial-gradient(circle at 90% 12%, rgba(124, 58, 237, 0.12), transparent 30%),
    #f8fafc;
  color: #111827;
  min-height: 100vh;
  overflow-x: hidden;
  padding: var(--public-page-top, 88px) 18px 42px;
}

@media (min-width: 1780px) {
  .profile-page {
    --profile-content-width: min(1500px, calc(100vw - 48px));
    padding-left: 18px;
    padding-right: 18px;
  }
}

.profile-empty,
.profile-hero,
.profile-hero-stats,
.profile-section {
  margin: 0 auto;
  max-width: var(--profile-content-width);
}

.profile-empty {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  color: #64748b;
  font-weight: 900;
  padding: 38px;
  text-align: center;
}

.profile-hero {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 22px;
  grid-template-columns: auto minmax(260px, 0.9fr) minmax(180px, 1fr) auto;
  padding: 24px;
  position: relative;
}

.profile-hero-stats {
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  display: grid;
  gap: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 14px;
  overflow: hidden;
  width: 100%;
}

.profile-hero-stats div {
  align-items: center;
  display: grid;
  gap: 3px 10px;
  grid-template-columns: 34px minmax(0, 1fr);
  min-height: 72px;
  padding: 12px 14px;
  position: relative;
}

.profile-hero-stats div + div::before {
  background: rgba(148, 163, 184, 0.16);
  bottom: 16px;
  content: '';
  left: 0;
  position: absolute;
  top: 16px;
  width: 1px;
}

.profile-hero-stats i {
  align-items: center;
  color: #a855f7;
  display: flex;
  font-size: 18px;
  grid-row: span 2;
  justify-content: center;
}

.profile-hero-stats strong {
  color: #111827;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.profile-hero-stats span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.15;
  text-transform: uppercase;
}

.profile-avatar-wrap {
  position: relative;
}

.profile-avatar-circle {
  background: #ffffff;
  border: 4px solid #f5f3ff;
  border-radius: 999px;
  display: block;
  height: 118px;
  overflow: hidden;
  width: 118px;
}

.profile-avatar {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.role-badge {
  background: #111827;
  border: 2px solid #ffffff;
  border-radius: 999px;
  bottom: -8px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  left: 50%;
  padding: 5px 10px;
  position: absolute;
  text-transform: uppercase;
  transform: translateX(-50%);
}

.avatar-edit-shortcut {
  align-items: center;
  background: rgba(15, 23, 42, 0.92);
  border: 2px solid rgba(255, 255, 255, 0.84);
  border-radius: 999px;
  bottom: 0;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.34);
  color: #ffffff;
  display: none;
  font-size: 15px;
  height: 38px;
  justify-content: center;
  position: absolute;
  right: -2px;
  width: 38px;
  z-index: 3;
}

.avatar-edit-shortcut span {
  display: none;
}

.profile-main-copy span,
.section-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.profile-level-pill {
  align-items: center;
  background:
    radial-gradient(circle at 10% 50%, rgba(236, 72, 153, 0.28), transparent 30%),
    linear-gradient(135deg, rgba(88, 28, 135, 0.42), rgba(120, 53, 15, 0.22));
  border: 1px solid rgba(250, 204, 21, 0.46);
  border-radius: 999px;
  box-shadow: 0 16px 34px rgba(124, 58, 237, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  color: #7c3aed;
  display: inline-grid;
  font-size: 15px;
  gap: 10px;
  grid-area: level;
  grid-template-columns: 34px minmax(0, 1fr) 16px 14px;
  min-height: 42px;
  min-width: 0;
  padding: 4px 14px 4px 5px;
  position: relative;
  text-transform: none;
  width: fit-content;
  max-width: min(100%, 420px);
  z-index: 0;
}

.profile-level-pill::before {
  animation: level-border-flow 3.2s linear infinite;
  background: conic-gradient(from var(--level-angle), #ec4899, #a855f7, #facc15, #fb7185, #ec4899);
  border-radius: inherit;
  content: '';
  inset: -2px;
  opacity: 0.92;
  padding: 2px;
  pointer-events: none;
  position: absolute;
  z-index: -2;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.profile-level-pill::after {
  animation: level-glow-pulse 2.4s ease-in-out infinite;
  background: linear-gradient(90deg, rgba(236, 72, 153, 0.64), rgba(250, 204, 21, 0.46));
  border-radius: inherit;
  content: '';
  filter: blur(12px);
  inset: -4px;
  opacity: 0.35;
  pointer-events: none;
  position: absolute;
  z-index: -3;
}

.profile-level-pill > i {
  color: #fde68a;
  font-size: 10px;
  justify-self: end;
}

.profile-level-crown {
  color: #facc15 !important;
  font-size: 13px !important;
  justify-self: center !important;
  text-shadow: 0 0 12px rgba(250, 204, 21, 0.58);
}

.profile-level-label {
  color: inherit !important;
  display: block !important;
  font-size: 13px !important;
  font-weight: 950 !important;
  letter-spacing: 0;
  line-height: 1.15;
  min-width: 0;
  overflow: visible;
  text-transform: uppercase;
  white-space: normal;
}

.profile-level-icon {
  align-items: center;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.48), transparent 24%),
    linear-gradient(135deg, #a855f7, #ec4899);
  border-radius: 999px;
  box-shadow: 0 0 18px rgba(236, 72, 153, 0.34);
  color: #fde68a !important;
  display: grid !important;
  flex: 0 0 auto;
  font-size: 15px !important;
  height: 34px;
  place-items: center;
  overflow: hidden;
  width: 34px;
}

.profile-level-icon i {
  display: block;
  line-height: 1;
  margin: 0;
  transform: translateY(0.5px);
}

.profile-level-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.profile-main-copy h1 {
  color: #111827;
  font-size: 34px;
  font-weight: 950;
  line-height: 1.05;
  margin-top: 5px;
}

.profile-main-copy p {
  color: #64748b;
  display: -webkit-box;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.55;
  margin-top: 8px;
  max-width: 52ch;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.profile-social-links {
  align-items: center;
  align-self: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  justify-self: center;
  min-width: 0;
}

.profile-social-links a {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #111827;
  display: inline-flex;
  font-size: 16px;
  height: 44px;
  justify-content: center;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
  width: 44px;
}

.profile-social-links a:hover {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
  transform: translateY(-1px);
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 0;
}

.profile-actions button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
}

.profile-actions button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.24);
}

.profile-actions .profile-edit-main-action {
  animation: edit-action-gradient 5.5s ease-in-out infinite;
  background: linear-gradient(110deg, #7c3aed, #c026d3, #ec4899, #7c3aed);
  background-size: 260% 260%;
  box-shadow: 0 14px 36px rgba(192, 38, 211, 0.28);
  overflow: hidden;
  position: relative;
}

.profile-actions .profile-edit-main-action::before {
  background: linear-gradient(110deg, transparent, rgba(255, 255, 255, 0.34), transparent);
  content: '';
  inset: 0 auto 0 -45%;
  pointer-events: none;
  position: absolute;
  transform: skewX(-18deg);
  width: 36%;
}

.profile-actions .profile-edit-main-action:hover::before {
  animation: edit-action-shine 0.82s ease;
}

.profile-actions .profile-edit-main-action i,
.profile-actions .profile-edit-main-action span {
  position: relative;
  z-index: 1;
}

.hero-rewards-panel {
  align-self: center;
  display: grid;
  gap: 10px;
  justify-items: center;
}

.hero-rewards-panel button {
  align-items: center;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  position: relative;
  z-index: 0;
}

.hero-rewards-panel button::before {
  animation: level-border-flow 3.4s linear infinite;
  background: conic-gradient(from var(--level-angle), #a855f7, #22d3ee, #facc15, #ec4899, #a855f7);
  border-radius: inherit;
  content: '';
  inset: -2px;
  opacity: 0.92;
  padding: 2px;
  pointer-events: none;
  position: absolute;
  z-index: -1;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.hero-rewards-panel button::after {
  animation: reward-glow-pulse 2.8s ease-in-out infinite;
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.72), rgba(34, 211, 238, 0.42), rgba(236, 72, 153, 0.58));
  border-radius: inherit;
  content: '';
  filter: blur(13px);
  inset: -6px;
  opacity: 0.35;
  pointer-events: none;
  position: absolute;
  z-index: -2;
}

.hero-icon-stack {
  display: flex;
  justify-content: center;
}

.hero-icon-stack span {
  background: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.94);
  border-radius: 999px;
  box-shadow:
    0 0 0 1px rgba(168, 85, 247, 0.32),
    0 0 18px rgba(168, 85, 247, 0.34),
    0 0 24px rgba(34, 211, 238, 0.16);
  display: block;
  height: 36px;
  margin-left: -8px;
  overflow: hidden;
  width: 36px;
}

.hero-icon-stack span:first-child {
  margin-left: 0;
}

.hero-icon-stack img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.achievement-roadmap {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.16), transparent 32%),
    radial-gradient(circle at 82% 12%, rgba(236, 72, 153, 0.1), transparent 28%),
    rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(168, 85, 247, 0.18);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 16px;
  margin: 14px auto 0;
  max-width: 1120px;
  overflow: hidden;
  padding: 18px;
}

.achievement-modal-backdrop {
  align-items: center;
  background: rgba(3, 7, 18, 0.76);
  backdrop-filter: blur(12px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.achievement-modal-card {
  margin: 0;
  align-content: start;
  max-height: min(840px, calc(100dvh - 36px));
  overflow-y: auto;
  padding-right: 20px;
  position: relative;
  width: min(1180px, calc(100vw - 28px));
}

.achievement-modal-card .icon-modal-close {
  right: 16px;
  top: 16px;
  z-index: 3;
}

.achievement-roadmap-head {
  align-items: end;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  padding-right: 46px;
}

.achievement-roadmap-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}

.achievement-roadmap-actions button {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

.achievement-roadmap-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.achievement-roadmap-head h2 {
  color: #111827;
  font-size: 22px;
  font-weight: 950;
  margin-top: 3px;
}

.achievement-roadmap-actions > strong {
  background: #111827;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  padding: 9px 12px;
  white-space: nowrap;
}

.achievement-editor {
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(190px, 1.1fr) minmax(170px, 0.9fr) 104px minmax(220px, 1.25fr) minmax(160px, 0.75fr) auto;
  padding: 14px;
}

.achievement-type-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.achievement-type-row::-webkit-scrollbar {
  display: none;
}

.achievement-type-row span {
  align-items: center;
  background: rgba(124, 58, 237, 0.13);
  border: 1px solid rgba(168, 85, 247, 0.22);
  border-radius: 999px;
  color: #c4b5fd;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 10px;
}

.achievement-type-row i {
  color: #c084fc;
}

.achievement-type-row strong {
  color: #ffffff;
}

.achievement-editor label {
  color: #64748b;
  display: grid;
  font-size: 10px;
  font-weight: 950;
  gap: 5px;
  min-width: 0;
  text-transform: uppercase;
}

.achievement-editor input,
.achievement-editor select {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 850;
  min-height: 38px;
  min-width: 0;
  outline: none;
  padding: 0 12px;
  width: 100%;
}

.achievement-editor select option {
  background: #0b1020;
  color: #ffffff;
}

.achievement-editor label small {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 850;
  min-height: 12px;
  text-transform: none;
}

.achievement-field-icon {
  grid-column: auto;
}

.achievement-field-target input {
  max-width: 100%;
}

.achievement-editor-actions {
  align-items: end;
  display: flex;
  gap: 8px;
  grid-column: auto;
  justify-content: flex-end;
}

.achievement-editor button {
  border-radius: 12px;
  font-size: 11px;
  font-weight: 950;
  min-height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

.achievement-editor button[type="button"] {
  background: #f1f5f9;
  color: #64748b;
}

.achievement-editor button[type="submit"] {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.achievement-roadmap-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.achievement-roadmap-card {
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  display: grid;
  gap: 12px;
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 172px;
  padding: 14px;
}

.achievement-roadmap-card.unlocked {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.92));
  border-color: rgba(245, 158, 11, 0.56);
}

.achievement-roadmap-card.next {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.2), transparent 34%),
    #ffffff;
  border-color: rgba(168, 85, 247, 0.58);
  box-shadow: 0 18px 44px rgba(124, 58, 237, 0.14);
}

.achievement-orb {
  align-items: center;
  background: #e2e8f0;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.achievement-orb img {
  border-radius: inherit;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.achievement-roadmap-card.unlocked .achievement-orb {
  background: linear-gradient(135deg, #f59e0b, #facc15);
  color: #ffffff;
}

.achievement-roadmap-card.next .achievement-orb {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.achievement-roadmap-card strong {
  color: #111827;
  display: block;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.15;
}

.achievement-type-chip {
  background: rgba(124, 58, 237, 0.12);
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 9px;
  font-style: normal;
  font-weight: 950;
  margin-bottom: 6px;
  padding: 4px 7px;
  text-transform: uppercase;
}

.achievement-roadmap-card p {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  margin-top: 5px;
}

.achievement-roadmap-card small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 950;
  margin-top: 7px;
}

.achievement-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

.achievement-card-actions button {
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  min-height: 28px;
  padding: 0 9px;
}

@property --level-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes level-border-flow {
  to {
    --level-angle: 360deg;
  }
}

@keyframes level-glow-pulse {
  0%,
  100% {
    opacity: 0.26;
  }

  50% {
    opacity: 0.48;
  }
}

@keyframes reward-glow-pulse {
  0%,
  100% {
    opacity: 0.28;
    transform: scale(0.98);
  }

  50% {
    opacity: 0.58;
    transform: scale(1.04);
  }
}

@keyframes wallet-glow-pulse {
  0%,
  100% {
    opacity: 0.36;
    transform: scale(0.98);
  }

  50% {
    opacity: 0.66;
    transform: scale(1.05);
  }
}

@keyframes edit-action-gradient {
  0%,
  100% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }
}

@keyframes edit-action-shine {
  from {
    left: -45%;
  }

  to {
    left: 115%;
  }
}

.edit-profile-section {
  border-color: #ddd6fe;
}

.profile-edit-form {
  display: grid;
  gap: 14px;
}

.social-edit-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.profile-edit-form label {
  color: #64748b;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  text-transform: uppercase;
}

.profile-edit-form input,
.profile-edit-form textarea {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 14px;
  font-weight: 750;
  outline: none;
  padding: 11px 12px;
  resize: vertical;
  text-transform: none;
}

.profile-edit-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}

.profile-edit-actions p {
  color: #16a34a;
  font-size: 12px;
  font-weight: 900;
}

.profile-edit-actions button {
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  min-height: 42px;
  padding: 0 16px;
  text-transform: uppercase;
}

.profile-edit-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.star-wallet {
  align-items: center;
  background: linear-gradient(135deg, #fef3c7, #fce7f3);
  border: 1px solid rgba(253, 230, 138, 0.82);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(250, 204, 21, 0.22),
    0 16px 42px rgba(245, 158, 11, 0.18);
  color: #92400e;
  display: grid;
  justify-items: center;
  min-width: 120px;
  padding: 16px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 0;
}

.star-wallet::before {
  animation: level-border-flow 3s linear infinite;
  background: conic-gradient(from var(--level-angle), #facc15, #fb923c, #fce7f3, #a855f7, #facc15);
  border-radius: inherit;
  content: '';
  inset: -3px;
  opacity: 0.95;
  padding: 3px;
  pointer-events: none;
  position: absolute;
  z-index: -1;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.star-wallet::after {
  animation: wallet-glow-pulse 2.5s ease-in-out infinite;
  background: radial-gradient(circle, rgba(250, 204, 21, 0.56), rgba(236, 72, 153, 0.18), transparent 68%);
  border-radius: inherit;
  content: '';
  filter: blur(14px);
  inset: -10px;
  opacity: 0.48;
  pointer-events: none;
  position: absolute;
  z-index: -2;
}

.star-wallet i {
  color: #f59e0b;
}

.star-wallet.spending {
  animation: walletSpend 0.55s ease;
  box-shadow: 0 14px 34px rgba(245, 158, 11, 0.24);
}

.star-wallet strong {
  font-size: 28px;
  font-weight: 950;
}

.star-wallet span {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.spend-star {
  animation: spendStarFly 0.92s cubic-bezier(0.2, 0.76, 0.28, 1) var(--delay) both;
  color: #f59e0b;
  filter: drop-shadow(0 8px 12px rgba(245, 158, 11, 0.34));
  font-size: 16px;
  left: 0;
  pointer-events: none;
  position: fixed;
  top: 0;
  transform: translate(-50%, -50%);
  z-index: 3600;
}

.spend-star:nth-of-type(odd) {
  color: #facc15;
  font-size: 19px;
}

.profile-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.05);
}

.profile-relation-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 2000;
}

.relation-backdrop {
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(16px);
  border: 0;
  inset: 0;
  position: absolute;
}

.relation-card {
  background: #0b1020;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
  color: #f8fafc;
  max-height: min(680px, calc(100dvh - 40px));
  overflow: hidden;
  padding: 20px;
  position: relative;
  width: min(520px, calc(100vw - 28px));
}

.relation-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.relation-head span {
  color: #8b5cf6;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.relation-head h2 {
  font-size: 24px;
  margin-top: 3px;
}

.relation-head button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.relation-list {
  display: grid;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
}

.relation-list article {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  overflow: hidden;
  padding: 10px;
}

.relation-profile {
  align-items: center;
  color: inherit;
  display: grid;
  gap: 10px;
  grid-template-columns: 44px minmax(0, 1fr);
  min-width: 0;
  overflow: hidden;
  text-align: left;
}

.relation-profile img {
  border-radius: 13px;
  height: 44px;
  object-fit: cover;
  transform: none;
  width: 48px;
}

.relation-profile .profile-icon-img {
  transform: none;
  width: 44px;
}

.relation-profile strong,
.relation-profile small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-profile small {
  color: #a78bfa;
  font-size: 12px;
  font-weight: 900;
}

.relation-talk {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

.relation-empty {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  color: #94a3b8;
  font-weight: 900;
  padding: 18px;
}

@media (max-width: 520px) {
  .profile-relation-modal {
    align-items: center;
    padding: 16px;
  }

  .relation-card {
    border-radius: 18px;
    max-height: calc(100svh - 32px);
    padding: 16px;
  }

  .relation-list article {
    grid-template-columns: 1fr;
  }

  .relation-talk {
    justify-content: center;
    width: 100%;
  }
}

.profile-section {
  margin-top: 18px;
  padding: 20px;
}

.section-head {
  align-items: end;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-head h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
  margin-top: 3px;
}

.section-head p {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.achievement-grid,
.icon-grid,
.profile-directory-grid,
.profile-columns {
  display: grid;
  gap: 14px;
}

.achievement-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.achievement-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.achievement-grid.compact.collapsed {
  grid-template-columns: minmax(0, 1fr);
}

.rewards-overview {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
}

.profile-reward-icons {
  align-content: start;
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid rgba(168, 85, 247, 0.18);
  border-radius: 14px;
  display: grid;
  gap: 12px;
  padding: 14px;
}

.profile-reward-icons span {
  color: #7c3aed;
  display: block;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.profile-reward-icons strong {
  color: #111827;
  display: block;
  font-size: 15px;
  font-weight: 950;
  margin-top: 3px;
}

.reward-icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reward-icon-row span {
  background: #ffffff;
  border: 2px solid rgba(168, 85, 247, 0.28);
  border-radius: 999px;
  display: block;
  height: 42px;
  overflow: hidden;
  width: 42px;
}

.reward-icon-row img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.achievement-card {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 28px minmax(0, 1fr);
  min-height: 72px;
  padding: 12px;
}

.achievement-card.unlocked {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-color: #f59e0b;
  box-shadow: 0 10px 24px rgba(245, 158, 11, 0.16);
}

.achievement-card.next {
  background: #ffffff;
  border-color: #c4b5fd;
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.1);
}

.achievement-card i {
  color: #cbd5e1;
  font-size: 18px;
}

.achievement-card.unlocked i {
  color: #f59e0b;
}

.achievement-card.next i {
  color: #7c3aed;
}

.achievement-card.unlocked strong {
  color: #92400e;
}

.achievement-card.unlocked p {
  color: #b45309;
}

.achievement-card strong,
.icon-card strong,
.link-list strong,
.post-strip strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 950;
}

.achievement-card p,
.icon-card small,
.profile-directory-grid small,
.link-list span {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 5px;
}

.achievement-progress {
  background: rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  display: block;
  height: 7px;
  margin-top: 10px;
  overflow: hidden;
  width: 100%;
}

.achievement-progress i {
  background: linear-gradient(90deg, #7c3aed, #ec4899);
  border-radius: inherit;
  display: block;
  height: 100%;
  min-width: 4px;
}

.achievement-card small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-top: 6px;
}

.achievement-card.unlocked .achievement-progress i {
  background: linear-gradient(90deg, #f59e0b, #facc15);
}

.profile-directory-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.profile-directory-grid button {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  text-align: center;
}

.profile-directory-grid span {
  background: #ffffff;
  border-radius: 999px;
  display: block;
  height: 74px;
  margin: 0 auto 9px;
  overflow: hidden;
  width: 74px;
}

.profile-directory-grid img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.profile-directory-grid strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.icon-shop.compact {
  border-color: #ddd6fe;
  box-shadow: 0 18px 50px rgba(124, 58, 237, 0.1);
  padding-bottom: 18px;
  scroll-margin-top: 92px;
}

.icon-test-panel {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.icon-test-panel.active {
  color: #ffffff;
}

.icon-test-panel button {
  align-items: center;
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 14px;
  text-transform: uppercase;
}

.icon-test-panel.active button {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: transparent;
  color: #ffffff;
}

.icon-preview-bar {
  align-items: center;
  background: linear-gradient(135deg, #fff7ed, #fffbeb);
  border: 1px solid #fed7aa;
  border-radius: 14px;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  margin-bottom: 14px;
  padding: 10px 12px;
}

.preview-avatar {
  background: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.16);
  height: 48px;
  overflow: hidden;
  width: 48px;
}

.preview-avatar img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.icon-preview-bar strong {
  color: #92400e;
  display: block;
  font-size: 13px;
  font-weight: 950;
}

.icon-preview-bar small {
  color: #b45309;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 2px;
}

.icon-preview-bar button {
  background: #111827;
  border-radius: 999px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  min-height: 34px;
  padding: 0 14px;
  text-transform: uppercase;
}

.icon-preview-bar button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.profile-message.soft {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #64748b;
}

.icon-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
}

.icon-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  padding: 12px;
  position: relative;
  text-align: center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.icon-card:hover {
  border-color: #c4b5fd;
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.1);
  transform: translateY(-2px);
}

.icon-card.selected {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px #f3e8ff;
}

.icon-card.saved::after {
  align-items: center;
  background: #111827;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  content: '\f00c';
  display: flex;
  font-family: 'Font Awesome 6 Free';
  font-size: 8px;
  font-weight: 900;
  height: 18px;
  justify-content: center;
  position: absolute;
  right: 8px;
  top: 8px;
  width: 18px;
  z-index: 3;
}

.icon-card.saved small {
  color: #22c55e;
}

.icon-card.test {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px #fef3c7;
}

.icon-card.test::before {
  background: #f59e0b;
  border-radius: 999px;
  color: #ffffff;
  content: 'TEST';
  font-size: 8px;
  font-weight: 950;
  left: 8px;
  padding: 2px 5px;
  position: absolute;
  top: 8px;
  z-index: 3;
}

.icon-card.redeeming {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px #fef3c7, 0 16px 34px rgba(245, 158, 11, 0.18);
  transform: translateY(-2px);
}

.redeem-fill {
  background: linear-gradient(180deg, rgba(253, 230, 138, 0.12), rgba(245, 158, 11, 0.32));
  bottom: 0;
  inset-inline: 0;
  overflow: hidden;
  position: absolute;
  top: 0;
  z-index: 1;
}

.redeem-fill::before {
  animation: cardFill 0.82s ease-out both;
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.1), rgba(250, 204, 21, 0.52));
  bottom: 0;
  content: '';
  left: 0;
  position: absolute;
  right: 0;
  top: 100%;
}

.redeem-fill i {
  animation: fillShine 0.82s ease-out both;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  height: 140%;
  left: -80%;
  position: absolute;
  top: -20%;
  transform: rotate(18deg);
  width: 46%;
}

.icon-card.redeeming .icon-art,
.icon-card.redeeming small,
.icon-card.redeeming .lock-badge {
  position: relative;
  z-index: 2;
}

.icon-card.locked {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.icon-card.locked .icon-art {
  opacity: 0.42;
}

.icon-card.locked .icon-art img {
  filter: grayscale(0.82) saturate(0.55);
}

.icon-art {
  align-items: center;
  background: #ffffff;
  border: 3px solid #ffffff;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  min-height: 104px;
  overflow: hidden;
}

.icon-grid.compact .icon-art {
  margin: 0 auto 8px;
  min-height: 58px;
  width: 58px;
}

.icon-art img {
  height: 136px;
  max-width: none;
  object-fit: cover;
  transform: translateY(-15px);
  width: 136px;
}

.icon-grid.compact .icon-art img {
  height: 82px;
  transform: translateY(-10px);
  width: 82px;
}

.lock-badge {
  align-items: center;
  background: #e5e7eb;
  border: 2px solid #ffffff;
  border-radius: 999px;
  bottom: 30px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
  color: #64748b;
  display: inline-flex;
  font-size: 10px;
  height: 22px;
  justify-content: center;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 22px;
  z-index: 2;
}

.icon-card.denied .lock-badge {
  animation: lockShake 0.58s ease;
}

.icon-grid.compact .icon-card {
  padding: 9px;
}

.icon-grid.compact .icon-card small {
  font-size: 9px;
  line-height: 1.15;
  margin-top: 0;
}

.icon-modal-backdrop,
.icon-collection-backdrop {
  align-items: center;
  background: rgba(3, 7, 18, 0.76);
  backdrop-filter: blur(12px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.icon-collection-card {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.24), transparent 30%),
    radial-gradient(circle at 90% 8%, rgba(236, 72, 153, 0.16), transparent 26%),
    #0b1020;
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 18px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
  color: #f8fafc;
  display: grid;
  gap: 18px;
  max-height: min(760px, calc(100dvh - 36px));
  overflow: hidden;
  padding: 20px;
  position: relative;
  width: min(920px, calc(100vw - 28px));
}

.icon-collection-head {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: 86px minmax(0, 1fr) auto;
  padding-right: 46px;
}

.collection-profile-avatar {
  background: #ffffff;
  border: 4px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  display: block;
  height: 86px;
  overflow: hidden;
  width: 86px;
}

.collection-profile-avatar img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.collection-kicker {
  color: #c084fc;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.icon-collection-head h2 {
  color: #ffffff;
  font-size: 28px;
  font-weight: 950;
  line-height: 1.05;
  margin-top: 4px;
}

.icon-collection-head p {
  color: #aeb8d3;
  font-size: 13px;
  font-weight: 800;
  margin-top: 6px;
}

.icon-collection-head > strong {
  align-items: center;
  background: rgba(168, 85, 247, 0.16);
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 16px;
  color: #ffffff;
  display: inline-flex;
  font-size: 22px;
  font-weight: 950;
  gap: 8px;
  min-height: 54px;
  padding: 0 16px;
}

.icon-collection-head > strong i {
  color: #c084fc;
  font-size: 18px;
}

.icon-collection-groups {
  display: grid;
  gap: 14px;
  max-height: min(560px, calc(100dvh - 190px));
  overflow-y: auto;
  padding-right: 4px;
}

.icon-collection-group {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: grid;
  gap: 12px;
  padding: 14px;
}

.icon-collection-group header {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.icon-collection-group header span {
  color: #ffffff;
  font-size: 15px;
  font-weight: 950;
}

.icon-collection-group header small {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 900;
  padding: 6px 9px;
}

.collection-icon-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
}

.collection-icon-grid figure {
  align-content: start;
  background: rgba(6, 9, 24, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 132px;
  padding: 12px 8px;
  text-align: center;
}

.collection-icon-grid figure.equipped {
  background:
    radial-gradient(circle at 50% 0%, rgba(250, 204, 21, 0.18), transparent 52%),
    rgba(88, 28, 135, 0.32);
  border-color: rgba(250, 204, 21, 0.36);
}

.collection-icon-grid figure > span {
  background: #ffffff;
  border: 3px solid rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  display: block;
  height: 66px;
  overflow: hidden;
  width: 66px;
}

.collection-icon-grid img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.collection-icon-grid figcaption {
  color: #e2e8f0;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 5px;
  line-height: 1.15;
}

.collection-icon-grid em {
  color: #facc15;
  font-size: 9px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}

.icon-collection-empty {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px dashed rgba(168, 85, 247, 0.28);
  border-radius: 16px;
  color: #aeb8d3;
  display: grid;
  justify-items: center;
  min-height: 220px;
  padding: 24px;
  text-align: center;
}

.icon-collection-empty i {
  color: #c084fc;
  font-size: 34px;
}

.icon-collection-empty strong {
  color: #ffffff;
  font-size: 18px;
  font-weight: 950;
  margin-top: 10px;
}

.icon-collection-empty p {
  font-size: 13px;
  font-weight: 800;
  margin-top: 6px;
}

.icon-modal-card {
  background: #0b1020;
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 18px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
  color: #f8fafc;
  display: grid;
  gap: 16px;
  max-height: min(760px, calc(100dvh - 36px));
  overflow: hidden;
  padding: 20px;
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100vw - 28px));
}

.icon-modal-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #cbd5e1;
  display: flex;
  height: 38px;
  justify-content: center;
  position: absolute;
  right: 18px;
  top: 18px;
  width: 38px;
  z-index: 2;
}

.icon-modal-head {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  padding-right: 48px;
}

.icon-modal-symbol {
  align-items: center;
  background: rgba(168, 85, 247, 0.18);
  border-radius: 999px;
  color: #c084fc;
  display: flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.icon-modal-head h2 {
  color: #ffffff;
  font-size: 22px;
  font-weight: 950;
}

.icon-modal-head p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 750;
  margin-top: 3px;
}

.icon-modal-wallet {
  align-items: center;
  background: linear-gradient(135deg, #fef3c7, #fce7f3);
  border: 1px solid #fde68a;
  border-radius: 14px;
  color: #92400e;
  display: grid;
  gap: 2px 7px;
  grid-template-columns: auto auto;
  justify-items: center;
  min-width: 104px;
  padding: 10px 12px;
}

.icon-modal-wallet.spending {
  animation: walletSpend 0.55s ease;
  box-shadow: 0 14px 34px rgba(245, 158, 11, 0.24);
}

.icon-modal-wallet i {
  color: #f59e0b;
}

.icon-modal-wallet strong {
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.icon-modal-wallet span {
  font-size: 9px;
  font-weight: 950;
  grid-column: 1 / -1;
  text-transform: uppercase;
}

.icon-modal-actions {
  align-items: center;
  display: inline-flex;
  gap: 8px;
  justify-self: end;
}

.icon-add-button {
  align-items: center;
  background: linear-gradient(135deg, #22c55e, #06b6d4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  color: #ffffff;
  display: inline-flex;
  font-size: 15px;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.icon-add-button:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.icon-upload-backdrop {
  align-items: center;
  background: rgba(3, 7, 18, 0.68);
  backdrop-filter: blur(14px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.icon-upload-card {
  background: #0b1020;
  border: 1px solid rgba(34, 211, 238, 0.25);
  border-radius: 18px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.46);
  color: #f8fafc;
  display: grid;
  gap: 18px;
  max-height: min(720px, calc(100dvh - 36px));
  overflow: hidden;
  padding: 20px;
  position: relative;
  width: min(760px, calc(100vw - 28px));
  z-index: 1;
}

.upload-head {
  grid-template-columns: 34px minmax(0, 1fr);
}

.icon-upload-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 0;
}

.icon-drop-zone {
  align-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(34, 211, 238, 0.42);
  border-radius: 16px;
  cursor: pointer;
  display: grid;
  gap: 10px;
  justify-items: center;
  min-height: 310px;
  padding: 18px;
  text-align: center;
}

.icon-drop-zone.active,
.icon-drop-zone.filled {
  background: rgba(34, 211, 238, 0.08);
  border-color: rgba(34, 211, 238, 0.78);
}

.icon-drop-zone input {
  display: none;
}

.icon-manage-list {
  align-content: start;
  display: grid;
  gap: 8px;
  max-height: 440px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.icon-manage-list > div {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #f8fafc;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: 46px minmax(0, 1fr) 24px;
  min-height: 60px;
  padding: 7px;
  text-align: left;
}

.icon-manage-list > div.selected {
  background: rgba(34, 211, 238, 0.12);
  border-color: rgba(34, 211, 238, 0.72);
}

.icon-manage-list > div.visible .icon-manage-actions i {
  color: #86efac;
}

.icon-manage-list img {
  aspect-ratio: 1;
  border-radius: 10px;
  height: 46px;
  object-fit: cover;
  width: 46px;
}

.icon-manage-list span {
  display: grid;
  min-width: 0;
}

.icon-manage-list strong,
.icon-manage-list small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-manage-list small {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 800;
}

.icon-manage-actions {
  align-items: center;
  display: flex;
  justify-content: center;
}

.icon-manage-actions button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #cbd5e1;
  display: inline-flex;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.icon-drop-zone strong,
.icon-upload-mini-preview strong {
  color: #ffffff;
  font-size: 15px;
  font-weight: 950;
  text-transform: capitalize;
}

.icon-drop-zone small,
.icon-upload-mini-preview small {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.upload-preview-avatar i,
.icon-upload-mini-preview .preview-large-avatar i {
  color: #7c3aed;
  font-size: 34px;
}

.icon-upload-form {
  align-content: start;
  display: grid;
  gap: 12px;
}

.icon-upload-form label {
  color: #cbd5e1;
  display: grid;
  gap: 6px;
  font-size: 11px;
  font-weight: 900;
}

.icon-upload-form input,
.icon-upload-form select {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  min-height: 42px;
  outline: none;
  padding: 0 12px;
}

.icon-upload-form select option {
  background: #0b1020;
  color: #ffffff;
}

.icon-upload-mini-preview {
  align-items: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: grid;
  gap: 5px 12px;
  grid-template-columns: 70px minmax(0, 1fr);
  padding: 12px;
}

.icon-upload-mini-preview .preview-large-avatar {
  grid-row: span 2;
  height: 70px;
  margin: 0;
  width: 70px;
}

.icon-upload-progress {
  display: grid;
  gap: 7px;
}

.icon-upload-progress span {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
}

.icon-upload-progress strong {
  background: linear-gradient(135deg, #22d3ee, #a3e635);
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 0.18s ease;
}

.icon-upload-progress small {
  color: #bae6fd;
  font-size: 11px;
  font-weight: 900;
}

.icon-upload-form > button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 44px;
  width: 100%;
}

.icon-upload-form > button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.mobile-editor-tabs,
.mobile-icon-grid,
.mobile-icon-pager {
  display: none;
}

.icon-modal-toolbar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 10px;
  grid-template-columns: 210px minmax(0, 1fr);
  padding: 0 0 12px;
}

.profile-editor-layout {
  display: grid;
  gap: 18px;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.profile-editor-panel,
.icon-picker-panel {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  min-height: 0;
}

.profile-editor-panel {
  align-content: start;
  display: grid;
  gap: 16px;
  overflow-y: auto;
  padding: 18px;
}

.icon-picker-panel {
  display: grid;
  gap: 14px;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  padding: 16px;
}

.editor-avatar-preview {
  background: #ffffff;
  border: 4px solid rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  box-shadow: 0 0 34px rgba(168, 85, 247, 0.58);
  display: block;
  height: 116px;
  justify-self: center;
  overflow: hidden;
  width: 116px;
}

.editor-avatar-preview img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.modal-profile-form {
  gap: 12px;
}

.modal-profile-form label {
  color: #cbd5e1;
}

.modal-profile-form input,
.modal-profile-form textarea {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.11);
  color: #ffffff;
}

.modal-profile-form input:focus,
.modal-profile-form textarea:focus {
  border-color: rgba(168, 85, 247, 0.62);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.14);
}

.modal-social-grid {
  grid-template-columns: 1fr;
}

.modal-edit-actions {
  align-items: stretch;
  display: grid;
  gap: 10px;
}

.modal-edit-actions p {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 10px;
  color: #86efac;
  padding: 9px 10px;
}

.modal-edit-actions button {
  width: 100%;
}

.icon-search-box {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #94a3b8;
  display: grid;
  gap: 8px;
  grid-template-columns: 16px minmax(0, 1fr);
  min-height: 38px;
  padding: 0 12px;
}

.icon-search-box input {
  background: transparent;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  min-width: 0;
  outline: none;
}

.icon-filter-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 1px;
  scrollbar-width: none;
}

.icon-filter-row::-webkit-scrollbar {
  display: none;
}

.icon-filter-row button {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #cbd5e1;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 900;
  min-height: 38px;
  padding: 0 10px;
}

.icon-filter-row button.active {
  background: linear-gradient(135deg, #7c3aed, #9333ea);
  border-color: transparent;
  color: #ffffff;
}

.icon-modal-layout {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 280px;
  min-height: 0;
  overflow: hidden;
}

.icon-modal-list {
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.icon-modal-list > strong {
  color: #ffffff;
  display: block;
  font-size: 13px;
  font-weight: 950;
  margin-bottom: 12px;
}

.modal-icons {
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
}

.modal-icons .icon-card {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.modal-icons .icon-card.selected {
  border-color: #a855f7;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.42);
}

.modal-icons .icon-card.saved {
  border-color: rgba(34, 197, 94, 0.72);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.22);
}

.modal-icons .icon-card small {
  align-items: center;
  color: #facc15;
  display: inline-flex;
  gap: 5px;
  justify-content: center;
}

.icon-preview-panel {
  align-content: start;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: grid;
  gap: 12px;
  justify-items: center;
  padding: 20px 16px;
  text-align: center;
}

.icon-preview-panel h3 {
  color: #ffffff;
  font-size: 15px;
  font-weight: 950;
  justify-self: start;
}

.preview-large-avatar {
  background: #ffffff;
  border: 4px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 0 34px rgba(168, 85, 247, 0.72);
  display: block;
  height: 126px;
  margin-top: 8px;
  overflow: hidden;
  width: 126px;
}

.preview-large-avatar img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.icon-preview-panel strong {
  color: #ffffff;
  font-size: 17px;
  font-weight: 950;
}

.icon-preview-panel small {
  background: rgba(168, 85, 247, 0.2);
  border-radius: 999px;
  color: #c084fc;
  font-size: 11px;
  font-weight: 900;
  padding: 4px 9px;
}

.icon-preview-panel p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.icon-preview-panel button {
  background: linear-gradient(135deg, #7c3aed, #9333ea);
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 950;
  min-height: 44px;
  width: 100%;
}

.icon-preview-panel button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.icon-preview-panel button.equipped {
  background: linear-gradient(135deg, #16a34a, #22c55e);
  opacity: 1;
}

.icon-preview-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.icon-preview-actions button {
  align-items: center;
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: inline-flex;
  font-size: 12px;
  gap: 7px;
  justify-content: center;
  min-height: 38px;
}

.icon-preview-actions button.danger {
  background: rgba(239, 68, 68, 0.13);
  border-color: rgba(248, 113, 113, 0.26);
  color: #fecaca;
}

@keyframes lockShake {
  0%,
  100% { transform: translateX(-50%) rotate(0deg); }
  18% { transform: translateX(calc(-50% - 3px)) rotate(-10deg); }
  36% { transform: translateX(calc(-50% + 3px)) rotate(10deg); }
  54% { transform: translateX(calc(-50% - 2px)) rotate(-7deg); }
  72% { transform: translateX(calc(-50% + 2px)) rotate(7deg); }
}

@keyframes walletSpend {
  0%,
  100% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.07) rotate(-1deg);
  }
  70% {
    transform: scale(0.97) rotate(1deg);
  }
}

@keyframes spendStarFly {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
  }
  16% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.25) rotate(18deg);
  }
  78% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.35) rotate(220deg);
  }
}

@keyframes cardFill {
  0% {
    top: 100%;
  }
  100% {
    top: 0;
  }
}

@keyframes fillShine {
  0% {
    opacity: 0;
    left: -80%;
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    left: 125%;
  }
}

.redeem-confirm-backdrop {
  align-items: center;
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(10px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 3000;
}

.redeem-confirm {
  background: #ffffff;
  border: 1px solid #fde68a;
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.26);
  max-width: 360px;
  padding: 22px;
  position: relative;
  text-align: center;
  width: min(100%, 360px);
}

.redeem-close {
  align-items: center;
  background: #f1f5f9;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  height: 30px;
  justify-content: center;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 30px;
}

.redeem-confirm-icon {
  background: #fffbeb;
  border: 3px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 14px 30px rgba(245, 158, 11, 0.18);
  display: block;
  height: 78px;
  margin: 4px auto 14px;
  overflow: hidden;
  position: relative;
  width: 78px;
}

.redeem-confirm-icon img {
  height: 112px;
  margin-left: -17px;
  margin-top: -15px;
  max-width: none;
  object-fit: cover;
  width: 112px;
}

.redeem-confirm-icon i {
  color: #f59e0b;
  font-size: 18px;
  left: 50%;
  position: absolute;
  text-shadow: 0 4px 10px rgba(245, 158, 11, 0.34);
  top: 4px;
  transform: translateX(-50%);
}

.redeem-confirm span:not(.redeem-confirm-icon) {
  color: #7c3aed;
  display: block;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.redeem-confirm h2 {
  color: #111827;
  font-size: 22px;
  font-weight: 950;
  margin-top: 3px;
}

.redeem-confirm p {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
  margin-top: 8px;
}

.redeem-confirm-actions {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  margin-top: 18px;
}

.redeem-confirm-actions button {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  min-height: 40px;
  padding: 0 14px;
}

.cancel-redeem {
  background: #f1f5f9;
  color: #475569;
}

.confirm-redeem {
  background: linear-gradient(135deg, #f59e0b, #ec4899);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(245, 158, 11, 0.22);
}

.redeem-confirm-actions button:disabled,
.redeem-close:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .redeem-confirm,
.modal-fade-leave-active .redeem-confirm {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .redeem-confirm,
.modal-fade-leave-to .redeem-confirm {
  transform: translateY(14px) scale(0.96);
}

.creator-showcase {
  border-color: #ddd6fe;
}

.creator-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
}

.featured-post {
  background: #111827;
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  min-height: 190px;
  overflow: hidden;
  position: relative;
  text-align: left;
}

.featured-post img,
.featured-post > span {
  height: 100%;
  inset: 0;
  object-fit: cover;
  opacity: 0.58;
  position: absolute;
  width: 100%;
}

.featured-post > span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
}

.featured-post div {
  align-self: end;
  padding: 18px;
  position: relative;
}

.featured-post small,
.creator-list small {
  color: #c4b5fd;
  display: block;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.featured-post strong {
  color: #ffffff;
  display: block;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.2;
  margin-top: 5px;
}

.creator-list {
  display: grid;
  gap: 10px;
}

.creator-list button {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  text-align: left;
}

.creator-list strong {
  color: #111827;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.3;
  margin-top: 4px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.icon-card.burst {
  animation: unlockGlow 0.9s ease-out;
}

.profile-message {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 12px;
  color: #c2410c;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 12px;
  padding: 10px 12px;
}

.profile-columns {
  align-items: start;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 auto;
  max-width: 1120px;
}

.profile-columns.single {
  grid-template-columns: minmax(0, 1fr);
}

.link-list {
  display: grid;
  gap: 10px;
}

.link-list button {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  text-align: left;
}

.mini-empty {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.post-strip {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.post-strip button {
  text-align: left;
}

.post-strip img,
.post-strip span {
  aspect-ratio: 16 / 9;
  background: #e5e7eb;
  border-radius: 12px;
  display: block;
  object-fit: cover;
  width: 100%;
}

.post-strip strong {
  margin-top: 9px;
}

@keyframes unlockGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0);
    transform: translateY(-2px) scale(1);
  }
  45% {
    box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.32), 0 18px 34px rgba(245, 158, 11, 0.18);
    transform: translateY(-3px) scale(1.035);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0);
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 760px) {
  .profile-page {
    padding-left: 12px;
    padding-right: 12px;
  }

  .profile-hero {
    align-items: start;
    gap: 16px;
    grid-template-columns: auto minmax(0, 1fr);
    min-height: 236px;
    padding: 24px 20px 20px;
  }

  .profile-avatar-circle {
    height: 112px;
    width: 112px;
  }

  .profile-main-copy {
    grid-column: 1 / -1;
    padding-top: 2px;
  }

  .profile-main-copy h1 {
    font-size: 30px;
  }

  .profile-main-copy p {
    margin-right: 0;
  }

  .profile-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-actions button {
    justify-content: center;
    padding: 0 10px;
  }

  .profile-social-links {
    grid-column: 1 / -1;
    justify-content: flex-start;
    justify-self: stretch;
    margin-top: -4px;
  }

  .profile-social-links a {
    font-size: 14px;
    height: 36px;
    width: 36px;
  }

  .social-edit-grid {
    grid-template-columns: 1fr;
  }

  .star-wallet {
    align-self: start;
    display: grid;
    column-gap: 5px;
    grid-template-columns: auto auto;
    justify-content: center;
    justify-items: center;
    min-width: 104px;
    padding: 11px 12px;
    position: absolute;
    right: 18px;
    top: 18px;
  }

  .star-wallet strong {
    font-size: 24px;
    line-height: 1;
  }

  .star-wallet span {
    grid-column: 1 / -1;
    margin-top: 4px;
    text-align: center;
    width: 100%;
  }

  .icon-shop.compact {
    border-color: #c4b5fd;
    box-shadow: 0 18px 50px rgba(124, 58, 237, 0.16);
    margin-top: 14px;
  }

  .icon-modal-backdrop {
    align-items: center;
    padding: 16px;
  }

  .icon-modal-card {
    border-radius: 18px;
    display: grid;
    gap: 10px;
    grid-template-rows: auto auto minmax(0, 1fr);
    height: auto;
    max-height: calc(100svh - 32px);
    overflow: hidden;
    padding: 12px;
    width: min(100%, 1120px);
  }

  .icon-modal-close {
    height: 34px;
    right: 12px;
    top: 12px;
    width: 34px;
  }

  .icon-modal-head {
    align-items: center;
    gap: 9px;
    grid-template-columns: 28px minmax(0, 1fr) 76px;
    padding-right: 38px;
  }

  .icon-modal-symbol {
    height: 28px;
    width: 28px;
  }

  .icon-modal-head h2 {
    font-size: 19px;
    line-height: 1.05;
  }

  .icon-modal-head p {
    display: none;
  }

  .icon-modal-wallet {
    gap: 1px 5px;
    grid-column: auto;
    justify-self: end;
    min-width: 70px;
    padding: 6px 7px;
  }

  .icon-modal-wallet strong {
    font-size: 17px;
  }

  .icon-modal-wallet span {
    font-size: 7px;
  }

  .icon-modal-actions {
    gap: 6px;
  }

  .icon-add-button {
    border-radius: 12px;
    height: 34px;
    width: 34px;
  }

  .icon-upload-backdrop {
    align-items: center;
    padding: 16px;
  }

  .icon-upload-card {
    border-radius: 18px;
    gap: 12px;
    height: auto;
    max-height: calc(100svh - 32px);
    overflow-y: auto;
    padding: 12px;
    width: min(100%, 760px);
  }

  .icon-upload-layout {
    grid-template-columns: 1fr;
  }

  .icon-drop-zone {
    min-height: 190px;
    padding: 14px;
  }

  .icon-upload-mini-preview {
    grid-template-columns: 58px minmax(0, 1fr);
  }

  .icon-upload-mini-preview .preview-large-avatar {
    height: 58px;
    width: 58px;
  }

  .mobile-editor-tabs {
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    display: grid;
    gap: 6px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 5px;
  }

  .mobile-editor-tabs button {
    align-items: center;
    border-radius: 10px;
    color: #cbd5e1;
    display: inline-flex;
    font-size: 12px;
    font-weight: 950;
    gap: 7px;
    justify-content: center;
    min-height: 38px;
  }

  .mobile-editor-tabs button.active {
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    color: #ffffff;
  }

  .profile-editor-layout {
    gap: 0;
    grid-template-columns: 1fr;
    min-height: 0;
    overflow: hidden;
  }

  .profile-editor-panel,
  .icon-picker-panel {
    border-radius: 14px;
    height: 100%;
    overflow: hidden;
    padding: 12px;
  }

  .icon-picker-panel:not(.mobile-hidden-panel) {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
  }

  .profile-editor-panel:not(.mobile-hidden-panel) {
    overflow-y: auto;
  }

  .profile-editor-panel:not(.mobile-hidden-panel) .profile-edit-form {
    padding-bottom: 8px;
  }

  .modal-edit-actions {
    background: #0b1020;
    bottom: 0;
    margin: 0 -12px -12px;
    padding: 10px 12px max(10px, env(safe-area-inset-bottom));
    position: sticky;
  }

  .mobile-hidden-panel {
    display: none;
  }

  .editor-avatar-preview {
    height: 74px;
    width: 74px;
  }

  .modal-profile-form {
    gap: 9px;
  }

  .modal-profile-form input,
  .modal-profile-form textarea {
    border-radius: 11px;
    font-size: 13px;
    padding: 9px 10px;
  }

  .modal-profile-form textarea {
    min-height: 68px;
  }

  .modal-profile-form label {
    font-size: 10px;
    gap: 5px;
  }

  .modal-social-grid {
    display: none;
  }

  .modal-edit-actions button {
    min-height: 40px;
  }

  .icon-modal-toolbar,
  .icon-modal-layout {
    grid-template-columns: 1fr;
  }

  .icon-modal-toolbar {
    border-bottom: 0;
    gap: 8px;
    padding: 0;
  }

  .icon-search-box {
    min-height: 38px;
  }

  .icon-filter-row {
    margin: 0 -14px;
    overflow-x: auto;
    padding: 0 14px 2px;
  }

  .icon-filter-row button {
    min-height: 36px;
    padding: 0 11px;
  }

  .icon-modal-layout {
    gap: 9px;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }

  .icon-modal-list {
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 6px;
    padding-right: 0;
  }

  .desktop-icon-grid {
    display: none;
  }

  .mobile-icon-grid {
    display: grid;
  }

  .modal-icons {
    gap: 8px;
    grid-auto-flow: row;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: none;
    margin: 0;
    overflow: visible;
    padding: 2px 0 4px;
  }

  .modal-icons::-webkit-scrollbar {
    display: none;
  }

  .modal-icons .icon-card {
    border-radius: 12px;
    min-height: 104px;
    padding: 7px 5px;
  }

  .icon-grid.compact .icon-art {
    margin-bottom: 5px;
    min-height: 46px;
    width: 46px;
  }

  .icon-grid.compact .icon-art img {
    height: 66px;
    transform: translateY(-8px);
    width: 66px;
  }

  .mobile-icon-pager {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: center;
    padding-top: 6px;
  }

  .mobile-icon-pager button {
    align-items: center;
    background: rgba(168, 85, 247, 0.18);
    border: 1px solid rgba(168, 85, 247, 0.28);
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    height: 34px;
    justify-content: center;
    width: 34px;
  }

  .mobile-icon-pager span {
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 950;
  }

  .icon-preview-panel {
    order: -1;
    display: grid;
    gap: 6px 10px;
    grid-template-columns: 64px minmax(0, 1fr);
    justify-items: start;
    padding: 10px;
    text-align: left;
  }

  .preview-large-avatar {
    grid-row: span 4;
    height: 64px;
    margin: 0;
    width: 64px;
  }

  .icon-preview-panel h3 {
    display: none;
  }

  .icon-preview-panel strong {
    font-size: 14px;
  }

  .icon-preview-panel p {
    display: none;
    font-size: 11px;
    margin: 0;
  }

  .icon-preview-panel button {
    font-size: 11px;
    min-height: 34px;
    padding: 0 10px;
  }

  .icon-test-panel {
    margin-bottom: 8px;
  }

  .icon-shop .section-head h2 {
    font-size: 24px;
    line-height: 1.05;
  }

  .icon-shop .section-head p {
    background: #f5f3ff;
    border-radius: 10px;
    padding: 9px 10px;
  }

  .icon-preview-bar {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .icon-preview-bar button {
    grid-column: 1 / -1;
    width: 100%;
  }

  .icon-test-panel button {
    justify-content: center;
  }

  .redeem-confirm-actions {
    grid-template-columns: 1fr;
  }

  .achievements-section {
    overflow: hidden;
    padding: 18px 0 18px 18px;
  }

  .achievements-section .section-head {
    margin-right: 18px;
  }

  .achievement-grid.compact {
    display: grid;
    gap: 10px;
    grid-auto-columns: minmax(210px, 74%);
    grid-auto-flow: column;
    grid-template-columns: none;
    overflow-x: auto;
    padding: 1px 18px 2px 0;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .achievement-grid.compact.collapsed {
    grid-auto-columns: minmax(260px, calc(100% - 18px));
  }

  .rewards-overview {
    grid-template-columns: 1fr;
  }

  .profile-reward-icons {
    margin-right: 18px;
  }

  .achievement-grid.compact::-webkit-scrollbar {
    display: none;
  }

  .achievement-card {
    min-height: 78px;
    scroll-snap-align: start;
  }

  .profile-columns,
  .creator-grid {
    grid-template-columns: 1fr;
  }

}

.profile-page {
  background:
    radial-gradient(circle at 14% 0%, rgba(168, 85, 247, 0.18), transparent 30%),
    radial-gradient(circle at 82% 10%, rgba(236, 72, 153, 0.14), transparent 28%),
    #070a16;
  color: #f8fafc;
}

.profile-hero,
.profile-section {
  background: rgba(11, 16, 32, 0.88);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  color: #f8fafc;
}

.profile-hero {
  background:
    linear-gradient(90deg, rgba(7, 10, 22, 0.92), rgba(7, 10, 22, 0.54)),
    url('/src/iconos/Banner.png') center / cover;
  align-items: center;
  gap: 18px 28px;
  grid-template-columns: 150px minmax(300px, 1fr) minmax(170px, auto) minmax(160px, auto) minmax(130px, auto);
  grid-template-areas:
    "avatar info rewards socials wallet"
    "level level actions actions actions";
  min-height: 300px;
  padding: 28px 30px;
}

.profile-avatar-wrap {
  grid-area: avatar;
  justify-self: center;
}

.profile-main-copy {
  grid-area: info;
  align-self: center;
}

.hero-rewards-panel {
  grid-area: rewards;
  padding-right: 18px;
}

.profile-social-panel {
  grid-area: socials;
  border-left: 1px solid rgba(255, 255, 255, 0.16);
  min-height: 108px;
  padding-left: 28px;
}

.star-wallet {
  grid-area: wallet;
  justify-self: end;
}

.profile-hero-stats {
  background: rgba(6, 9, 24, 0.68);
  border-color: rgba(255, 255, 255, 0.1);
}

.profile-hero-stats strong {
  color: #ffffff;
}

.profile-hero-stats span {
  color: #aeb8d3;
}

.profile-actions {
  grid-area: actions;
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  justify-self: stretch;
  width: 100%;
}

.profile-actions button {
  flex: none;
  min-height: 50px;
}

.profile-main-copy h1,
.section-head h2,
.activity-list strong,
.community-card-row strong {
  color: #ffffff;
}

.profile-username {
  color: #a855f7;
  display: block;
  font-size: 13px;
  font-weight: 900;
  margin-top: 4px;
}

.profile-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.profile-meta-row span {
  align-items: center;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 12px;
  font-weight: 800;
  gap: 7px;
}

.profile-actions .ghost {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.profile-level-pill,
.hero-rewards-panel button {
  background: rgba(168, 85, 247, 0.14);
  border-color: rgba(168, 85, 247, 0.22);
  color: #c084fc;
}

.profile-level-pill {
  background:
    radial-gradient(circle at 10% 50%, rgba(236, 72, 153, 0.34), transparent 30%),
    linear-gradient(135deg, rgba(88, 28, 135, 0.78), rgba(120, 53, 15, 0.5));
  border-color: rgba(250, 204, 21, 0.58);
  color: #fde68a;
  justify-self: stretch;
  min-width: 0;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.36);
  width: 100%;
  max-width: 100%;
}

.achievement-roadmap {
  background:
    radial-gradient(circle at 14% 0%, rgba(168, 85, 247, 0.2), transparent 32%),
    radial-gradient(circle at 86% 18%, rgba(236, 72, 153, 0.12), transparent 30%),
    rgba(11, 16, 32, 0.92);
  border-color: rgba(168, 85, 247, 0.24);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
}

.achievement-roadmap-head h2,
.achievement-roadmap-card strong {
  color: #ffffff;
}

.achievement-roadmap-actions > strong {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.achievement-editor {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 255, 255, 0.12);
}

.achievement-editor label {
  color: #cbd5e1;
}

.achievement-editor input,
.achievement-editor select {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.achievement-roadmap-card {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.1);
}

.achievement-roadmap-card.next {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.24), transparent 34%),
    rgba(255, 255, 255, 0.07);
}

.achievement-roadmap-card.unlocked {
  background:
    radial-gradient(circle at 20% 0%, rgba(250, 204, 21, 0.22), transparent 34%),
    rgba(120, 53, 15, 0.28);
}

.achievement-roadmap-card p {
  color: #cbd5e1;
}

.achievement-card-actions button {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.profile-social-panel {
  align-self: center;
  display: grid;
  gap: 10px;
  justify-items: center;
}

.profile-social-panel strong {
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.profile-social-links {
  gap: 10px;
  justify-content: center;
}

.profile-social-links a,
.profile-social-links span {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.profile-social-links .disabled {
  color: #64748b;
  filter: grayscale(1);
  opacity: 0.55;
}

.profile-social-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 20px auto 0;
  max-width: var(--profile-content-width);
  width: 100%;
}

.profile-social-grid .profile-section {
  margin: 0;
  max-width: none;
  width: 100%;
}

.profile-communities,
.profile-activity {
  min-height: 0;
}

.profile-communities:has(.mini-empty),
.profile-activity:has(.mini-empty) {
  align-content: start;
  min-height: 230px;
}

.profile-communities .mini-empty,
.profile-activity .mini-empty {
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  color: #94a3b8;
  margin-top: 8px;
  padding: 16px;
  width: 100%;
}

.section-head button {
  color: #c084fc;
  font-size: 12px;
  font-weight: 900;
}

.activity-tabs {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
}

.activity-tabs button {
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 950;
  min-height: 30px;
  padding: 0 10px;
}

.activity-tabs button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
}

.activity-swap-enter-active,
.activity-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.activity-swap-enter-from,
.activity-swap-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.community-card-row {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.community-card-row button {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  min-height: 170px;
  overflow: hidden;
  padding: 12px;
  position: relative;
  text-align: left;
}

.community-card-row img,
.community-card-row .community-overlay,
.community-card-row .community-letter {
  height: 100%;
  inset: 0;
  object-fit: cover;
  position: absolute;
  width: 100%;
}

.community-card-row img,
.community-card-row .community-letter {
  opacity: 0.62;
}

.community-card-row .community-letter {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-size: 32px;
  font-weight: 950;
  justify-content: center;
}

.community-card-row .community-overlay {
  background: linear-gradient(180deg, transparent, rgba(7, 10, 22, 0.94));
  opacity: 1;
}

.community-card-row strong,
.community-card-row small,
.community-card-row em {
  display: block;
  position: relative;
  z-index: 1;
}

.community-card-row strong {
  margin-top: 80px;
}

.community-card-row small {
  background: linear-gradient(90deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 950;
  margin-top: 7px;
  padding: 4px 8px;
  width: fit-content;
}

.community-card-row em {
  color: #cbd5e1;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  margin-top: 8px;
}

.activity-list {
  display: grid;
  gap: 10px;
}

.recent-post-showcase {
  display: grid;
  gap: 12px;
}

.recent-post-card {
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  min-height: 220px;
  overflow: hidden;
  position: relative;
  text-align: left;
}

.recent-post-card img,
.recent-post-fallback,
.recent-post-shade {
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
}

.recent-post-card img {
  object-fit: cover;
}

.recent-post-fallback {
  background:
    radial-gradient(circle at 25% 25%, rgba(168, 85, 247, 0.34), transparent 30%),
    linear-gradient(135deg, #111827, #4c1d95);
}

.recent-post-shade {
  background: linear-gradient(180deg, rgba(7, 10, 22, 0.16), rgba(7, 10, 22, 0.94));
}

.recent-post-card div {
  align-self: end;
  display: grid;
  gap: 7px;
  padding: 18px;
  position: relative;
  z-index: 1;
}

.recent-post-card small {
  color: #c084fc;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.recent-post-card strong {
  color: #ffffff;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.18;
}

.recent-post-card em {
  color: #cbd5e1;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
}

.recent-post-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-post-controls button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  min-height: 34px;
  padding: 0 12px;
}

.recent-post-controls > button:not(.view-all-posts) {
  justify-content: center;
  padding: 0;
  width: 34px;
}

.recent-post-controls span {
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 950;
}

.view-all-posts {
  margin-left: auto;
}

.recent-post-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.recent-post-list button {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 46px minmax(0, 1fr);
  min-height: 62px;
  padding: 8px;
  text-align: left;
}

.recent-post-list span,
.recent-post-list i {
  align-items: center;
  background: rgba(168, 85, 247, 0.18);
  border-radius: 10px;
  color: #c084fc;
  display: flex;
  height: 46px;
  justify-content: center;
  overflow: hidden;
  width: 46px;
}

.recent-post-list img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.recent-post-list strong {
  color: #ffffff;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.activity-list button {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: inherit;
  display: grid;
  gap: 12px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  padding: 0 0 10px;
  text-align: left;
}

.activity-list button:only-child {
  min-height: 76px;
}

.profile-social-grid .section-head {
  align-items: start;
  min-height: 52px;
}

.activity-list i {
  align-items: center;
  background: rgba(168, 85, 247, 0.18);
  border-radius: 999px;
  color: #c084fc;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.activity-list small {
  color: #a855f7;
  display: block;
  font-size: 10px;
  font-weight: 950;
  margin-bottom: 3px;
  text-transform: uppercase;
}

.activity-list p,
.activity-list time,
.section-head p,
.achievement-card p,
.link-list span {
  color: #cbd5e1;
}

.profile-reward-icons {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.profile-reward-icons strong {
  color: #ffffff;
}

.activity-list time {
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .profile-hero,
  .profile-social-grid {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    grid-template-areas:
      "avatar info info wallet"
      "level level level level"
      "rewards rewards socials socials"
      "actions actions actions actions";
    grid-template-columns: 96px minmax(0, 1fr) minmax(0, 1fr) 92px;
    justify-items: stretch;
  }

  .profile-level-pill {
    justify-self: stretch;
    width: 100%;
    max-width: 100%;
  }

  .star-wallet {
    justify-self: stretch;
  }

  .profile-edit-main-action {
    display: none;
  }

  .avatar-edit-shortcut {
    display: inline-flex;
  }

  .community-card-row {
    grid-auto-columns: minmax(132px, 46%);
    grid-auto-flow: column;
    grid-template-columns: none;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .achievement-editor {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr) 104px;
  }

  .achievement-field-icon {
    grid-column: 1 / span 2;
  }

  .achievement-editor-actions {
    grid-column: 3 / 4;
  }

}

@media (max-width: 760px) {
  .profile-page {
    padding: var(--public-page-top-mobile, 76px) 10px var(--public-page-bottom-mobile, calc(92px + env(safe-area-inset-bottom)));
  }

  .icon-collection-backdrop {
    align-items: stretch;
    padding: 10px;
  }

  .icon-collection-card {
    align-self: center;
    border-radius: 16px;
    gap: 14px;
    max-height: calc(100dvh - 20px);
    padding: 14px;
    width: 100%;
  }

  .icon-collection-card .icon-modal-close {
    right: 12px;
    top: 12px;
  }

  .icon-collection-head {
    gap: 10px;
    grid-template-columns: 58px minmax(0, 1fr);
    padding-right: 42px;
  }

  .collection-profile-avatar {
    height: 58px;
    width: 58px;
  }

  .icon-collection-head h2 {
    display: -webkit-box;
    font-size: 20px;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .icon-collection-head p {
    font-size: 11px;
    line-height: 1.25;
  }

  .icon-collection-head > strong {
    grid-column: 1 / -1;
    justify-content: center;
    min-height: 40px;
    width: 100%;
  }

  .icon-collection-groups {
    max-height: calc(100dvh - 186px);
  }

  .icon-collection-group {
    border-radius: 14px;
    padding: 12px;
  }

  .collection-icon-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .collection-icon-grid figure {
    border-radius: 12px;
    min-height: 112px;
    padding: 10px 5px;
  }

  .collection-icon-grid figure > span {
    height: 54px;
    width: 54px;
  }

  .collection-icon-grid figcaption {
    font-size: 9.5px;
  }

  .profile-hero {
    align-items: center;
    border-radius: 16px;
    gap: 12px;
    grid-template-areas:
      "avatar info info wallet"
      "level level level level"
      "rewards rewards socials socials"
      "actions actions actions actions";
    grid-template-columns: 92px minmax(0, 1fr) minmax(0, 1fr) 86px;
    min-height: 0;
    overflow: hidden;
    padding: 14px;
    pointer-events: auto;
    isolation: isolate;
  }

  .profile-avatar-wrap,
  .profile-main-copy,
  .profile-level-pill,
  .hero-rewards-panel,
  .profile-social-panel,
  .star-wallet,
  .profile-actions {
    pointer-events: auto;
    position: relative;
    z-index: 2;
  }

  .profile-avatar-wrap {
    justify-self: start;
  }

  .profile-avatar-circle {
    height: 92px;
    width: 92px;
  }

  .role-badge {
    bottom: -5px;
    font-size: 9px;
    padding: 4px 8px;
  }

  .avatar-edit-shortcut {
    bottom: 2px;
    height: 32px;
    right: -4px;
    width: 32px;
  }

  .profile-main-copy {
    align-self: center;
    min-width: 0;
    padding-top: 0;
  }

  .profile-level-pill {
    justify-self: stretch;
    max-width: 100%;
    font-size: 11px;
    grid-template-columns: 28px minmax(0, 1fr) 14px 12px;
    min-height: 38px;
    min-width: 0;
    padding: 4px 10px 4px 4px;
    width: 100%;
  }

  .profile-level-label {
    font-size: 10.5px !important;
    line-height: 1.2;
    white-space: normal;
  }

  .profile-level-icon {
    height: 28px;
    font-size: 12px;
    width: 28px;
  }

  .profile-main-copy h1 {
    display: -webkit-box;
    font-size: clamp(24px, 7vw, 30px);
    line-height: 1.06;
    max-width: 100%;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .profile-username {
    font-size: 12px;
    margin-top: 3px;
  }

  .profile-main-copy p {
    display: -webkit-box;
    font-size: 12px;
    line-height: 1.35;
    margin-top: 5px;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .hero-rewards-panel {
    align-items: center;
    background: rgba(6, 9, 24, 0.56);
    border: 1px solid rgba(168, 85, 247, 0.18);
    border-radius: 14px;
    display: grid;
    gap: 8px;
    justify-items: center;
    min-height: 96px;
    padding: 10px;
  }

  .hero-rewards-panel button {
    min-height: 32px;
    padding: 0 10px;
  }

  .achievement-roadmap {
    border-radius: 16px;
    padding: 14px;
  }

  .achievement-modal-backdrop {
    align-items: stretch;
    padding: 10px;
  }

  .achievement-modal-card {
    align-self: center;
    max-height: calc(100dvh - 20px);
    overflow-y: auto;
    padding: 14px;
    width: 100%;
  }

  .achievement-modal-card .icon-modal-close {
    right: 12px;
    top: 12px;
  }

  .achievement-roadmap-head {
    align-items: start;
    flex-direction: column;
    gap: 10px;
    padding-right: 42px;
  }

  .achievement-roadmap-actions {
    align-items: stretch;
    width: 100%;
  }

  .achievement-roadmap-actions button {
    justify-content: center;
    min-width: 0;
  }

  .achievement-roadmap-head h2 {
    font-size: 18px;
  }

  .achievement-editor {
    grid-template-columns: 1fr;
  }

  .achievement-field-icon,
  .achievement-editor-actions {
    grid-column: 1 / -1;
  }

  .achievement-field-target input {
    max-width: none;
  }

  .achievement-editor-actions {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .achievement-roadmap-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr;
    margin: 0;
    overflow: visible;
    padding: 0;
  }

  .achievement-roadmap-card {
    min-height: 150px;
  }

  .hero-icon-stack span {
    height: 30px;
    width: 30px;
  }

  .profile-hero-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 10px;
  }

  .profile-hero-stats div {
    align-content: center;
    gap: 5px;
    grid-template-columns: 1fr;
    justify-items: center;
    min-height: 70px;
    padding: 10px 4px;
    text-align: center;
  }

  .profile-hero-stats div + div::before {
    bottom: 14px;
    top: 14px;
  }

  .profile-hero-stats i {
    font-size: 15px;
    grid-row: auto;
  }

  .profile-hero-stats strong {
    font-size: 18px;
  }

  .profile-hero-stats span {
    font-size: 8.5px;
    line-height: 1.15;
  }

  .profile-meta-row {
    display: none;
  }

  .hero-rewards-panel,
  .profile-social-panel {
    align-content: center;
    align-items: center;
    align-self: stretch;
    border-left: 0;
    border-radius: 14px;
    display: grid;
    justify-items: center;
    min-height: 96px;
    padding-left: 0;
    width: 100%;
  }

  .hero-rewards-panel {
    padding: 10px;
  }

  .hero-rewards-panel button {
    width: min(100%, 140px);
  }

  .profile-social-panel strong {
    font-size: 10px;
  }

  .profile-social-links {
    gap: 7px;
    justify-content: center;
  }

  .profile-social-links a,
  .profile-social-links span {
    height: 34px;
    width: 34px;
  }

  .star-wallet {
    align-self: center;
    align-content: center;
    border-radius: 14px;
    justify-self: end;
    min-width: 0;
    width: 82px;
    padding: 8px 7px;
    position: static;
  }

  .star-wallet i {
    font-size: 15px;
  }

  .star-wallet strong {
    font-size: 20px;
  }

  .star-wallet span {
    font-size: 8px;
    margin-top: 2px;
  }

  .profile-actions {
    grid-area: actions;
    margin-top: 0;
  }

  .profile-actions .profile-edit-main-action {
    display: none !important;
  }

  .profile-actions {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr;
  }

  .profile-actions button {
    flex: none;
    min-height: 38px;
  }

  .profile-section {
    max-width: 100%;
    overflow: hidden;
    padding: 16px;
  }

  .section-head {
    align-items: start;
    gap: 10px;
  }

  .section-head h2 {
    font-size: 22px;
  }

  .profile-social-grid {
    gap: 12px;
    margin-top: 12px;
  }

  .profile-communities,
  .profile-activity {
    min-height: 0;
  }

  .community-card-row {
    gap: 10px;
    grid-auto-columns: minmax(124px, 42%);
    margin: 0 -16px;
    overflow-x: auto;
    padding: 0 16px 2px;
    scrollbar-width: none;
  }

  .community-card-row::-webkit-scrollbar {
    display: none;
  }

  .community-card-row button {
    border-radius: 12px;
    min-height: 126px;
    padding: 10px;
  }

  .community-card-row strong {
    font-size: 15px;
    line-height: 1.05;
    margin-top: 58px;
  }

  .community-card-row small {
    font-size: 9px;
    margin-top: 6px;
    padding: 3px 7px;
  }

  .community-card-row em {
    font-size: 10px;
    margin-top: 6px;
  }

  .activity-tabs {
    justify-self: start;
  }

  .activity-list {
    gap: 8px;
  }

  .recent-post-card {
    border-radius: 13px;
    min-height: 158px;
  }

  .recent-post-card div {
    gap: 5px;
    padding: 13px;
  }

  .recent-post-card strong {
    display: -webkit-box;
    font-size: 16px;
    line-height: 1.2;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .recent-post-controls {
    gap: 7px;
  }

  .view-all-posts {
    margin-left: 0;
  }

  .recent-post-list {
    grid-template-columns: 1fr;
  }

  .activity-list button {
    gap: 9px;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    padding-bottom: 8px;
  }

  .activity-list button:only-child {
    min-height: 0;
  }

  .activity-list i {
    height: 32px;
    width: 32px;
  }

  .activity-list strong {
    display: -webkit-box;
    font-size: 13px;
    line-height: 1.25;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .activity-list time {
    font-size: 10px;
  }

  .profile-directory {
    padding: 16px;
  }

  .profile-directory-grid {
    display: flex;
    gap: 10px;
    margin: 0 -16px;
    overflow-x: auto;
    padding: 0 16px 2px;
    scrollbar-width: none;
  }

  .profile-directory-grid::-webkit-scrollbar {
    display: none;
  }

  .profile-directory-grid button {
    align-items: center;
    background: rgba(255, 255, 255, 0.055);
    border-color: rgba(255, 255, 255, 0.1);
    display: grid;
    flex: 0 0 176px;
    gap: 10px;
    grid-template-columns: 50px minmax(0, 1fr);
    min-height: 74px;
    padding: 10px;
    text-align: left;
  }

  .profile-directory-grid span {
    height: 50px;
    margin: 0;
    width: 50px;
  }

  .profile-directory-grid strong,
  .profile-directory-grid small {
    color: #ffffff;
    margin: 0;
  }

  .profile-directory-grid strong {
    font-size: 12px;
  }

  .profile-directory-grid small {
    color: #cbd5e1;
    font-size: 10px;
  }

}
</style>
