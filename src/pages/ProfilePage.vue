<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { updateProfile } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, query, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import ProfileAchievementsPanel from '@/components/profile/ProfileAchievementsPanel.vue'
import ProfileHeaderCard from '@/components/profile/ProfileHeaderCard.vue'
import ProfileIconEditor from '@/components/profile/ProfileIconEditor.vue'
import ProfileRelationModal from '@/components/profile/ProfileRelationModal.vue'
import ProfileStatsPanel from '@/components/profile/ProfileStatsPanel.vue'
import ProfileFavoritesPreview from '@/components/shared/ProfileFavoritesPreview.vue'
import { resolveAssetUrl } from '@/constants/assets'
import { notifyNewFollower } from '@/services/notifications'
import {
  ICON_COST,
  achievements,
  fallbackProfileIcon,
  kirbyIcons,
  loadUploadedProfileIcons,
  redeemIcon,
  resolveProfileIcon,
  resolveProfileIconMeta,
  updateProfileIcon
} from '@/services/profileProgress'
import { ACHIEVEMENT_TYPES, PROFILE_ICON_FILTERS } from '@/constants/profile'

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
  visible: true,
  special: false,
  effectColor: '#a855f7'
})
const mobileEditorTab = ref('details')
const mobileIconPage = ref(0)
const editMessage = ref('')
let profileLoadRequestId = 0
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
const iconEditorRef = ref(null)

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
const profileIconMeta = computed(() => resolveProfileIconMeta({
  ...profile.value,
  selectedIcon: isOwnProfile.value ? pendingSelectedIcon.value || profile.value?.selectedIcon : profile.value?.selectedIcon
}))
const profileActiveMonths = computed(() => {
  const value = profile.value?.createdAt || profile.value?.joinedAt
  if (!value) return 0
  const date = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return 0
  const monthMs = 1000 * 60 * 60 * 24 * 30.4375
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / monthMs))
})
const achievementTypes = ACHIEVEMENT_TYPES
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
  const managedById = new Map(customIcons.value.map(icon => [icon.id, icon]))
  const builtInIcons = kirbyIcons.map((icon) => {
    const saved = managedById.get(icon.id)
    managedById.delete(icon.id)

    return {
      ...icon,
      ...saved,
      src: icon.src,
      sourcePath: icon.sourcePath,
      builtIn: true,
      local: true,
      visible: saved ? Boolean(saved.visible) : true,
      archived: saved ? Boolean(saved.archived) : false,
      special: saved ? Boolean(saved.special) : Boolean(icon.special),
      effectColor: saved?.effectColor || icon.effectColor || '#a855f7'
    }
  })
  const managedIcons = [...managedById.values()]
  const icons = [...builtInIcons, ...managedIcons]

  return isAdminOwnProfile.value
    ? icons
    : icons.filter(icon => icon.visible && !icon.archived)
})
const manageableProfileIcons = computed(() => allProfileIcons.value)
const redeemedProfileIcons = computed(() => allProfileIcons.value.filter(icon => unlockedIcons.value.includes(icon.id)))
const visibleProfileIcons = computed(() => redeemedProfileIcons.value.slice(0, 8))
const iconFilters = computed(() => {
  const dynamic = allProfileIcons.value.map(icon => iconSaga(icon)).filter(Boolean)
  return ['Todos', 'Especiales', ...new Set([...PROFILE_ICON_FILTERS, ...dynamic])]
})
const iconSaga = (icon) => icon.saga || 'Especiales'
const iconCost = (icon) => Math.max(0, Number(icon?.cost ?? ICON_COST))
const filteredIconCatalog = computed(() => {
  const search = normalizeText(iconSearch.value)
  return allProfileIcons.value.filter(icon => {
    const matchesFilter = iconFilter.value === 'Todos' || (iconFilter.value === 'Especiales' ? icon.special : iconSaga(icon) === iconFilter.value)
    const matchesSearch = !search || normalizeText(`${icon.name} ${iconSaga(icon)} ${icon.special ? 'especial' : ''}`).includes(search)
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
  return Boolean(auth.currentUser) && !isOwnProfile.value && isFollowing.value && (
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

const applyProfileData = (userData = {}) => {
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
  followersTotal.value = Number(profile.value.followersCount || 0)
  followingTotal.value = Number(profile.value.followingCount || 0)
}

const loadProfile = async () => {
  const requestId = ++profileLoadRequestId
  isLoading.value = true
  message.value = ''
  editMessage.value = ''
  iconPanelOpen.value = false
  iconCollectionOpen.value = false
  relationModal.value = ''
  isFollowing.value = false
  favorites.value = []
  threads.value = []
  posts.value = []
  userCommunities.value = []
  publicProfiles.value = []
  followersList.value = []
  followingList.value = []

  try {
    const userSnap = await getDoc(doc(db, 'users', profileId.value))
    if (requestId !== profileLoadRequestId) return

    if (!userSnap.exists()) {
      profile.value = null
      return
    }

    applyProfileData(userSnap.data())
    isLoading.value = false
    loadProfileExtras(requestId).catch(console.error)
  } finally {
    if (requestId === profileLoadRequestId && !profile.value) isLoading.value = false
  }
}

const loadProfileExtras = async (requestId) => {
  const [favoritesSnap, threadsSnap, postsSnap, usersSnap, communitiesSnap, followersSnap, followingSnap, followSnap, viewerSnap, uploadedIcons, achievementsSnap] = await Promise.all([
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

  if (requestId !== profileLoadRequestId || !profile.value) return

  customIcons.value = uploadedIcons
  managedAchievements.value = normalizeAchievements(
    achievementsSnap.exists?.() ? achievementsSnap.data()?.items : achievements
  )

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
    .filter(post => post.authorId === profileId.value && post.status === 'approved' && post.visibility !== 'private' && post.visibility !== 'unlisted' && post.placement !== 'hero' && !post.isMainEntry)
    .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
    .slice(0, 6)
  publicProfiles.value = usersSnap.docs
    .map(item => ({ id: item.id, role: 'user', readPostsCount: 0, ...item.data() }))
    .filter(user => user.id !== profileId.value)
    .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
    .slice(0, 8)
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
  if (typeof window === 'undefined' || !event?.currentTarget) return

  const wallet = iconEditorRef.value?.getWalletRect?.() || event.currentTarget.getBoundingClientRect()
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

const openIconDetailFromCollection = async (icon) => {
  if (!icon?.id) return
  previewIconId.value = icon.id
  iconCollectionOpen.value = false
  iconPanelOpen.value = true
  mobileEditorTab.value = 'icons'
  iconSearch.value = ''
  iconFilter.value = icon.special ? 'Especiales' : iconSaga(icon)
  mobileIconPage.value = 0
  await nextTick()
}

const openIconUpload = (icon = null) => {
  if (!isAdminOwnProfile.value) return
  uploadIconMessage.value = ''
  resetUploadIconForm()
  const editableIcon = icon || manageableProfileIcons.value[0]
  if (!editableIcon) {
    uploadIconMessage.value = 'No hay iconos cargados para gestionar.'
    iconUploadOpen.value = true
    return
  }
  editingIconId.value = editableIcon.id
  uploadIconPreview.value = editableIcon.src
  uploadIconDraft.value = {
    name: editableIcon.name,
    saga: iconSaga(editableIcon),
    cost: iconCost(editableIcon),
    visible: Boolean(editableIcon.visible && !editableIcon.archived),
    special: Boolean(editableIcon.special),
    effectColor: editableIcon.effectColor || '#a855f7'
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
    visible: true,
    special: false,
    effectColor: '#a855f7'
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
    visible: Boolean(icon.visible && !icon.archived),
    special: Boolean(icon.special),
    effectColor: icon.effectColor || '#a855f7'
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
      special: uploadIconDraft.value.special,
      effectColor: uploadIconDraft.value.effectColor,
      sourcePath: icon.sourcePath,
      src: icon.src
    })
    const updatedIcon = { ...icon, ...saved, src: icon.src, sourcePath: icon.sourcePath }
    customIcons.value = customIcons.value.some(item => item.id === icon.id)
      ? customIcons.value.map(item => (item.id === icon.id ? { ...item, ...updatedIcon } : item))
      : [...customIcons.value, updatedIcon]
    if (profile.value?.selectedIcon === icon.id) {
      const selectedIconEffect = {
        special: Boolean(updatedIcon.special),
        effectColor: updatedIcon.effectColor || '#a855f7',
        saga: iconSaga(updatedIcon)
      }
      await updateDoc(doc(db, 'users', profileId.value), {
        selectedIconEffect,
        updatedAt: Date.now()
      })
      profile.value = {
        ...profile.value,
        selectedIconEffect,
        updatedAt: Date.now()
      }
      window.dispatchEvent(new CustomEvent('galaxy-profile-updated', {
        detail: {
          uid: profileId.value,
          profile: profile.value
        }
      }))
    }
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
      iconUrl: icon.builtIn ? '' : icon.src,
      iconEffect: {
        special: Boolean(icon.special),
        effectColor: icon.effectColor || '#a855f7',
        saga: iconSaga(icon)
      }
    })
    profile.value = {
      ...profile.value,
      stars: Math.max(0, stars.value - iconCost(icon)),
      unlockedIcons: [...unlockedIcons.value, icon.id],
      selectedIcon: icon.id,
      selectedIconUrl: icon.builtIn ? '' : icon.src,
      selectedIconEffect: {
        special: Boolean(icon.special),
        effectColor: icon.effectColor || '#a855f7',
        saga: iconSaga(icon)
      },
      updatedAt: Date.now()
    }
    pendingSelectedIcon.value = icon.id
    window.dispatchEvent(new CustomEvent('galaxy-profile-updated', {
      detail: {
        uid: profileId.value,
        profile: profile.value
      }
    }))
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
  const selectedIconEffect = {
    special: Boolean(selectedCatalogIcon?.special),
    effectColor: selectedCatalogIcon?.effectColor || '#a855f7',
    saga: iconSaga(selectedCatalogIcon || {})
  }
  const previousProfile = profile.value
  const nextProfile = {
    ...profile.value,
    selectedIcon: iconId,
    selectedIconUrl,
    selectedIconEffect,
    updatedAt: Date.now()
  }
  profile.value = nextProfile
  pendingSelectedIcon.value = iconId
  window.dispatchEvent(new CustomEvent('galaxy-profile-updated', {
    detail: {
      uid: profileId.value,
      profile: nextProfile
    }
  }))

  try {
    await updateDoc(doc(db, 'users', profileId.value), {
      selectedIcon: iconId,
      selectedIconUrl,
      selectedIconEffect,
      updatedAt: Date.now()
    })
  } catch (error) {
    profile.value = previousProfile
    pendingSelectedIcon.value = previousProfile?.selectedIcon || 'kirby-01'
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
  const followsUser = followingList.value.some(item => item.id === user.id)
  if (!canUseDirectChat.value || !followsUser) {
    openRelationProfile(user)
    return
  }

  window.dispatchEvent(new CustomEvent('open-direct-chat', {
    detail: {
      source: 'galaxia-hub',
      id: user.id,
      name: user.name || user.email || 'Usuario',
      email: user.email || '',
      imageUrl: user.imageUrl || fallbackProfileIcon,
      role: user.role || 'user',
      canChat: Boolean(user.canChat),
      canMessage: true
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
      source: 'galaxia-hub',
      id: profileId.value,
      name: profile.value.name || profile.value.email || 'Usuario',
      email: profile.value.email || '',
      imageUrl: profileIcon.value,
      role: profile.value.role || 'user',
      canChat: Boolean(profile.value.canChat),
      canMessage: true
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
      <ProfileHeaderCard
        :profile="profile"
        :profile-icon="profileIcon"
        :profile-icon-meta="profileIconMeta"
        :current-achievement="currentAchievement"
        :rewards-expanded="rewardsExpanded"
        :is-own-profile="isOwnProfile"
        :member-since="memberSince"
        :redeemed-icon-count="redeemedProfileIcons.length"
        :visible-profile-icons="visibleProfileIcons"
        :social-items="socialItems"
        :display-stars="displayStars"
        :is-spending="Boolean(flyingStars.length)"
        :icon-panel-open="iconPanelOpen"
        :follow-busy="followBusy"
        :is-following="isFollowing"
        :can-use-direct-chat="canUseDirectChat"
        @toggle-rewards="rewardsExpanded = !rewardsExpanded"
        @toggle-icon-panel="toggleIconPanel"
        @open-icon-collection="openIconCollection"
        @toggle-follow="toggleFollow"
        @open-direct-message="openDirectMessage"
        @share="shareProfile"
      />

      <ProfileStatsPanel :stats="heroStats" />

      <ProfileAchievementsPanel
        v-model:draft="achievementDraft"
        :open="rewardsExpanded"
        :can-manage="canManageAchievements"
        :editor-open="achievementEditorOpen"
        :editing-id="editingAchievementId"
        :earned-count="earnedAchievements.length"
        :total-count="managedAchievements.length"
        :type-counts="achievementTypeCounts"
        :types="achievementTypes"
        :roadmap="achievementRoadmap"
        @close="rewardsExpanded = false"
        @start-create="startCreateAchievement"
        @cancel-edit="achievementEditorOpen = false; resetAchievementDraft()"
        @save="saveAchievementDraft"
        @edit="editAchievement"
        @delete="deleteAchievement"
      />

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
              <img v-if="community.iconUrl || community.bannerUrl" :src="resolveAssetUrl(community.iconUrl || community.bannerUrl)" alt="" />
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

      <ProfileIconEditor
        ref="iconEditorRef"
        v-model:profile-draft="profileDraft"
        v-model:icon-search="iconSearch"
        v-model:icon-filter="iconFilter"
        v-model:mobile-editor-tab="mobileEditorTab"
        v-model:upload-icon-draft="uploadIconDraft"
        :profile="profile"
        :profile-icon="profileIcon"
        :profile-icon-meta="profileIconMeta"
        :collection-open="iconCollectionOpen"
        :panel-open="iconPanelOpen"
        :upload-open="iconUploadOpen"
        :confirm-redeem="confirmRedeem"
        :redeemed-profile-icons="redeemedProfileIcons"
        :grouped-redeemed-icons="groupedRedeemedIcons"
        :icon-filters="iconFilters"
        :filtered-icon-catalog="filteredIconCatalog"
        :mobile-icon-catalog="mobileIconCatalog"
        :mobile-icon-page="mobileIconPage"
        :mobile-icon-page-count="mobileIconPageCount"
        :effective-unlocked-icons="effectiveUnlockedIcons"
        :test-unlocked-icons="testUnlockedIcons"
        :icon-test-mode="iconTestMode"
        :is-admin-own-profile="isAdminOwnProfile"
        :message="message"
        :edit-message="editMessage"
        :is-saving-profile="isSavingProfile"
        :is-saving-icon="isSavingIcon"
        :is-redeeming="isRedeeming"
        :is-deleting-icon="isDeletingIcon"
        :is-uploading-icon="isUploadingIcon"
        :redeeming-icon="redeemingIcon"
        :denied-icon="deniedIcon"
        :unlock-burst="unlockBurst"
        :display-stars="displayStars"
        :is-spending="Boolean(flyingStars.length)"
        :preview-icon="previewIcon"
        :preview-icon-equipped="previewIconEquipped"
        :manageable-profile-icons="manageableProfileIcons"
        :editing-icon-id="editingIconId"
        :upload-icon-preview="uploadIconPreview"
        :upload-icon-message="uploadIconMessage"
        :icon-state="iconState"
        :icon-cost="iconCost"
        :icon-saga="iconSaga"
        :managed-icon-visible="managedIconVisible"
        @close-collection="closeIconCollection"
        @close-panel="closeIconPanel"
        @close-upload="closeIconUpload"
        @save-profile="saveProfile"
        @toggle-test-mode="toggleIconTestMode"
        @choose-icon="chooseIconCard"
        @open-icon-detail="openIconDetailFromCollection"
        @change-mobile-page="changeMobileIconPage"
        @confirm-purchase="(event) => confirmRedeem ? confirmUnlockIcon() : equipPreviewIcon(event)"
        @upload-icon="openIconUpload"
        @edit-icon="openIconUpload"
        @delete-icon="deleteUploadedIcon"
        @select-managed-icon="selectManagedIcon"
        @toggle-managed-visibility="toggleManagedIconVisibility"
        @save-uploaded-icon="saveUploadedIcon"
        @close-redeem="closeRedeemConfirm"
      />

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

      <ProfileRelationModal
        v-if="relationModal"
        :title="relationTitle"
        :users="relationUsers"
        :can-use-direct-chat="canUseDirectChat"
        @close="closeRelationModal"
        @open-profile="openRelationProfile"
        @open-chat="openRelationChat"
      />
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
.link-list strong,
.post-strip strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 950;
}

.achievement-card p,
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
    url('@/iconos/Banner.png') center / cover;
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

}

@media (max-width: 760px) {
  .profile-page {
    padding: var(--public-page-top-mobile, 76px) 10px var(--public-page-bottom-mobile, calc(92px + env(safe-area-inset-bottom)));
  }

  .profile-hero {
    align-items: start;
    border-radius: 16px;
    gap: 16px 14px;
    grid-template-areas:
      "avatar info"
      "level level"
      "rewards socials"
      "wallet wallet"
      "actions actions";
    grid-template-columns: minmax(126px, 36%) minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
    padding: 18px 14px;
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
    justify-self: center;
    padding-top: 6px;
  }

  .profile-avatar-circle {
    height: clamp(112px, 31vw, 132px);
    width: clamp(112px, 31vw, 132px);
  }

  .role-badge {
    bottom: -5px;
    font-size: 9px;
    padding: 4px 8px;
  }

  .avatar-edit-shortcut {
    bottom: -36px;
    height: 36px;
    left: 50%;
    min-width: 96px;
    right: auto;
    transform: translateX(-50%);
    width: auto;
  }

  .profile-main-copy {
    align-self: start;
    min-width: 0;
    padding-top: 4px;
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
    font-size: clamp(34px, 10vw, 46px);
    line-height: 0.94;
    max-width: 8ch;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .profile-username {
    font-size: 13px;
    margin-top: 7px;
  }

  .profile-main-copy p {
    display: -webkit-box;
    font-size: 13px;
    line-height: 1.42;
    margin-top: 10px;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
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
    border-radius: 18px;
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    justify-items: start;
    justify-self: stretch;
    min-width: 0;
    width: 100%;
    padding: 14px 18px;
    position: static;
  }

  .star-wallet i {
    align-items: center;
    background: rgba(250, 204, 21, 0.14);
    border-radius: 999px;
    display: inline-flex;
    font-size: 26px;
    grid-row: span 2;
    height: 52px;
    justify-content: center;
    width: 52px;
  }

  .star-wallet strong {
    font-size: 34px;
    line-height: 0.95;
  }

  .star-wallet span {
    font-size: 10px;
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
