<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onAuthStateChanged, updateProfile } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import ProfileRewardDialog from '@/components/profile/ProfileRewardDialog.vue'
import ProfileRewardsHub from '@/components/profile/ProfileRewardsHub.vue'
import AppNotice from '@/components/shared/AppNotice.vue'
import ProfileAchievementsPanel from '@/components/profile/ProfileAchievementsPanel.vue'
import ProfileHeaderCard from '@/components/profile/ProfileHeaderCard.vue'
import { achievementTarget, achievementValue } from '@/services/achievementProgress'
const ProfileIconEditor = defineAsyncComponent(() => import('@/components/profile/ProfileIconEditor.vue'))
import ProfileRelationModal from '@/components/profile/ProfileRelationModal.vue'
import ProfileStatsPanel from '@/components/profile/ProfileStatsPanel.vue'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
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
const readPosts = ref([])
const userCommunities = ref([])
const publicProfiles = ref([])
const followersList = ref([])
const followingList = ref([])
const relationModal = ref('')
const activityTab = ref('posts')
const recentPostIndex = ref(0)
const showAllRecentPosts = ref(false)
const favoritesExpanded = ref(false)
const viewerProfile = ref({ role: 'user', canChat: false })
const viewerUid = ref(auth.currentUser?.uid || '')
let unsubscribeViewer
const isFollowing = ref(false)
const followBusy = ref(false)
const followersTotal = ref(0)
const followingTotal = ref(0)
const isLoading = ref(true)
const isRedeeming = ref(false)
const isSavingProfile = ref(false)
const isSavingIcon = ref(false)
const message = ref('')
const redemptionResult = ref(null)
const redemptionError = ref('')
const selectionReset = ref(0)
const confirmRedeem = ref(null)
const iconTestMode = ref(false)
const testStars = ref(100)
const testUnlockedIcons = ref([])
const iconPanelOpen = ref(false)
const iconUploadOpen = ref(false)
const achievementEditorOpen = ref(false)
const editingAchievementId = ref('')
const customIcons = ref([])
const uploadIconPreview = ref('')
const isUploadingIcon = ref(false)
const uploadIconMessage = ref('')
const editingIconId = ref('')
const uploadIconDraft = ref({
  name: '',
  saga: 'Kirby',
  rarity: 'normal',
  cost: ICON_COST,
  visible: true,
  special: false,
  effectColor: '#a855f7'
})
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

const isRewardsPage = computed(() => route.name === 'profile-rewards')
const rewardsTab = computed(() => {
  const allowed = ['achievements', 'collection', ...(isOwnProfile.value ? ['redeem'] : []), ...(isAdminOwnProfile.value ? ['manage'] : [])]
  return allowed.includes(route.query.tab) ? route.query.tab : 'achievements'
})
const openRewards = (tab = 'achievements') => {
  closeIconPanel()
  router.push({ name: 'profile-rewards', params: { uid: profileId.value }, query: { tab } })
}
const changeRewardsTab = (tab) => router.replace({ query: { ...route.query, tab } })
const profileId = computed(() => String(route.params.uid || ''))
const isOwnProfile = computed(() => viewerUid.value === profileId.value)
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
const achievementMetricValue = (achievement) => achievementValue(achievement, {
  reads: readCount.value, posts: posts.value.length, communities: userCommunities.value.length,
  months: profileActiveMonths.value, icons: unlockedIcons.value.length, followers: followersTotal.value
})
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
    : icons.filter(icon => (icon.visible && !icon.archived) || unlockedIcons.value.includes(icon.id))
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
const canUseDirectChat = computed(() => {
  return Boolean(auth.currentUser) && !isOwnProfile.value && isFollowing.value && (
    ['admin', 'publisher'].includes(viewerProfile.value.role) || viewerProfile.value.canChat
  )
})
const communityCards = computed(() => userCommunities.value)
const showingReadPosts = computed(() => !posts.value.length)
const postActivityItems = computed(() => (showingReadPosts.value ? readPosts.value : posts.value).map(post => ({
  icon: 'fas fa-newspaper',
  id: post.id,
  image: post.image || post.imageUrl || post.coverUrl || '',
  title: post.title || 'Publicacion',
  label: post.category || 'Post',
  time: formatAgo(post.readAt || post.updatedAt || post.createdAt),
  rawAt: post.readAt || post.updatedAt || post.createdAt,
  action: () => openPost(post)
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
  if (iconTestMode.value) { iconTestMode.value = false; testUnlockedIcons.value = []; testStars.value = 100 }
  closeRedeemConfirm()
  const requestId = ++profileLoadRequestId
  isLoading.value = true
  message.value = ''
  editMessage.value = ''
  iconPanelOpen.value = false
  relationModal.value = ''
  isFollowing.value = false
  favorites.value = []
  threads.value = []
  posts.value = []
  readPosts.value = []
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
    await loadProfileExtras(requestId).catch(console.error)
  } finally {
    if (requestId === profileLoadRequestId) isLoading.value = false
  }
}

const loadProfileExtras = async (requestId) => {
  const [favoritesSnap, threadsSnap, postsSnap, usersSnap, communitiesSnap, followersSnap, followingSnap, followSnap, viewerSnap, uploadedIcons, achievementsSnap, readsSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', profileId.value, 'favorites'), limit(6))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'communityThreads'), limit(80))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'posts'), limit(120))).catch(() => ({ docs: [] })),
    getDocs(query(collection(db, 'users'), limit(120))).catch(() => ({ docs: [] })),
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
    getDoc(doc(db, 'siteConfig', 'profileAchievements')).catch(() => ({ exists: () => false, data: () => ({}) })),
    getDocs(query(collection(db, 'users', profileId.value, 'readPosts'), orderBy('readAt', 'desc'), limit(12))).catch(() => ({ docs: [] }))
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
  const allThreads = threadsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
  const followerIds = new Set(followersSnap.docs.map(item => relationIdFromDoc(item)).filter(Boolean))
  const followingIds = new Set(followingSnap.docs.map(item => relationIdFromDoc(item)).filter(Boolean))
  const { orderedIds: connectedIds } = collectPublicProfileIds({
    threads: allThreads,
    followerIds,
    followingIds
  })
  const missingUserIds = [...connectedIds].filter(id => id && !usersById.has(id)).slice(0, 24)
  const missingUserSnaps = await Promise.all(missingUserIds.map(id => getDoc(doc(db, 'users', id)).catch(() => null)))
  missingUserSnaps.forEach((snap, index) => {
    if (snap?.exists?.()) {
      usersById.set(missingUserIds[index], { id: missingUserIds[index], ...snap.data() })
    }
  })
  if (requestId !== profileLoadRequestId || !profile.value) return
  followersList.value = followersSnap.docs.map(item => relationFromDoc(item, usersById))
  followingList.value = followingSnap.docs.map(item => relationFromDoc(item, usersById))
  threads.value = allThreads
    .filter(thread => thread.authorId === profileId.value)
    .sort((a, b) => getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt))
    .slice(0, 6)
  posts.value = postsSnap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(post => post.authorId === profileId.value && post.status === 'approved' && post.visibility !== 'private' && post.visibility !== 'unlisted' && post.placement !== 'hero' && !post.isMainEntry)
    .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
    .slice(0, 6)
  // Resolve history against current posts: never expose removed or private content.
  const postsById = new Map(postsSnap.docs.map(item => [item.id, { ...item.data(), id: item.id }]))
  const history = readsSnap.docs.map(item => ({ ...item.data(), postId: item.data().postId || item.id }))
  const missingPosts = [...new Set(history.map(item => item.postId))].filter(id => !postsById.has(id))
  const historySnaps = await Promise.all(missingPosts.map(id => getDoc(doc(db, 'posts', id)).catch(() => null)))
  if (requestId !== profileLoadRequestId || !profile.value) return
  historySnaps.forEach(snap => {
    if (snap?.exists()) postsById.set(snap.id, { ...snap.data(), id: snap.id })
  })
  readPosts.value = history.flatMap(read => {
    const post = postsById.get(read.postId)
    if (!post || post.status !== 'approved' || ['private', 'unlisted'].includes(post.visibility)) return []
    return [{ ...post, readAt: read.readAt }]
  }).slice(0, 6)
  publicProfiles.value = buildPublicProfiles({
    threads: allThreads,
    usersById,
    followerIds,
    followingIds
  })
}
const relationIdFromDoc = (item) => {
  const data = item.data?.() || {}
  return data.userId || item.id || ''
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

const likedByIds = (thread) => {
  if (Array.isArray(thread?.likedBy)) return thread.likedBy.filter(Boolean)
  if (thread?.likedBy && typeof thread.likedBy === 'object') return Object.keys(thread.likedBy).filter(Boolean)
  return []
}

const isRealPublicProfile = (user) => {
  if (!user?.id || user.id === profileId.value || user.isDeleted || user.deleted) return false
  const name = String(user.name || user.displayName || user.email || '').trim()
  return Boolean(name)
}

const publicProfileName = (user) => {
  return user.name || user.displayName || user.email?.split('@')[0] || 'Usuario'
}

const publicProfileRelationLabel = (user, followerIds, followingIds, interactionIds) => {
  if (followingIds.has(user.id)) return 'Siguiendo'
  if (followerIds.has(user.id)) return 'Te sigue'
  if (interactionIds.has(user.id)) return 'Interaccion reciente'
  return 'Perfil'
}

const collectPublicProfileIds = ({ threads = [], followerIds = new Set(), followingIds = new Set() } = {}) => {
  const interactionIds = new Set()

  threads.forEach((thread) => {
    const threadAuthorId = thread.authorId || ''
    const likes = likedByIds(thread)
    const comments = thread.comments || []

    if (threadAuthorId === profileId.value) {
      likes.forEach(id => interactionIds.add(id))
      comments.forEach(comment => {
        if (comment.authorId) interactionIds.add(comment.authorId)
      })
      return
    }

    if (likes.includes(profileId.value)) interactionIds.add(threadAuthorId)
    if (comments.some(comment => comment.authorId === profileId.value)) interactionIds.add(threadAuthorId)
  })

  const orderedIds = [...new Set([
    ...followingIds,
    ...followerIds,
    ...interactionIds
  ])].filter(id => id && id !== profileId.value)

  return { orderedIds, interactionIds }
}

const buildPublicProfiles = ({ threads = [], usersById = new Map(), followerIds = new Set(), followingIds = new Set() } = {}) => {
  const { orderedIds, interactionIds } = collectPublicProfileIds({ threads, followerIds, followingIds })

  return orderedIds
    .map(id => usersById.get(id))
    .filter(isRealPublicProfile)
    .map(user => ({
      ...user,
      name: publicProfileName(user),
      iconMeta: resolveProfileIconMeta(user),
      relationLabel: publicProfileRelationLabel(user, followerIds, followingIds, interactionIds)
    }))
    .sort((a, b) => {
      const rank = (user) => followingIds.has(user.id) ? 0 : followerIds.has(user.id) ? 1 : 2
      return rank(a) - rank(b) || getTime(b.createdAt) - getTime(a.createdAt)
    })
    .slice(0, 8)
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

const toggleIconTestMode = () => {
  if (!isAdminOwnProfile.value) return

  iconTestMode.value = !iconTestMode.value
  redemptionResult.value = null
  selectionReset.value++
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
  pendingSelectedIcon.value = profile.value?.selectedIcon || 'kirby-01'
}

const requestRedeemIcon = (icon) => {
  if (!isOwnProfile.value || effectiveUnlockedIcons.value.includes(icon.id) || isRedeeming.value) return
  redemptionError.value = ''
  confirmRedeem.value = { icon }
}

const closeRedeemConfirm = () => {
  if (isRedeeming.value || isSavingIcon.value) return
  confirmRedeem.value = null
  redemptionResult.value = null
  redemptionError.value = ''
}

const toggleIconPanel = async () => {
  iconPanelOpen.value = !iconPanelOpen.value
  if (iconPanelOpen.value) {
    editMessage.value = ''
    message.value = ''
    await nextTick()
  }
}

const closeIconPanel = () => {
  iconPanelOpen.value = false
  iconUploadOpen.value = false
  editMessage.value = ''
  resetUploadIconForm()
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
    rarity: editableIcon.rarity || (editableIcon.special ? 'epic' : 'normal'),
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
    saga: 'Kirby',
    rarity: 'normal',
    cost: ICON_COST,
    visible: true,
    special: false,
    effectColor: '#a855f7'
  }
}

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
      rarity: uploadIconDraft.value.rarity,
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
    iconUploadOpen.value = false
    resetUploadIconForm()
    message.value = saved.visible ? 'Icono visible para todo el mundo.' : 'Icono oculto para todo el mundo.'
  } catch (error) {
    uploadIconMessage.value = 'No se pudo guardar la ficha del icono.'
  } finally {
    isUploadingIcon.value = false
  }
}

const confirmUnlockIcon = async () => {
  const icon = confirmRedeem.value?.icon
  if (!icon || !canUnlock(icon) || isRedeeming.value) return
  isRedeeming.value = true
  redemptionError.value = ''
  try {
    if (iconTestMode.value) {
      testStars.value -= iconCost(icon)
      testUnlockedIcons.value = [...new Set([...testUnlockedIcons.value, icon.id])]
    } else {
      const result = await redeemIcon({ userId: profileId.value, iconId: icon.id, expectedCost: iconCost(icon) })
      profile.value = { ...profile.value, stars: result.stars, unlockedIcons: result.unlockedIcons, updatedAt: Date.now() }
      window.dispatchEvent(new CustomEvent('galaxy-profile-updated', { detail: { uid: profileId.value, profile: profile.value } }))
    }
    redemptionResult.value = { icon }
    confirmRedeem.value = null
  } catch (error) {
    redemptionError.value = error.message === 'not-enough-stars' ? 'No tienes suficientes estrellas. Actualiza el saldo e intenta de nuevo.' : 'No se pudo canjear. Actualiza el catálogo e intenta de nuevo.'
  } finally {
    isRedeeming.value = false
  }
}
const useRedeemedIcon = async (id) => {
  if (await selectIcon(id)) closeRedeemConfirm()
  else redemptionError.value = 'No se pudo guardar el icono. Sigue en tu colección; puedes volver a intentarlo.'
}
const redeemAnother = () => {
  closeRedeemConfirm()
  selectionReset.value++
  changeRewardsTab('redeem')
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

  if (iconTestMode.value) {
    pendingSelectedIcon.value = iconId
    message.value = 'Icono usado en simulación. Tu perfil real no ha cambiado.'
    return true
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
    message.value = 'Icono actualizado.'
    return true
  } catch (error) {
    profile.value = previousProfile
    pendingSelectedIcon.value = previousProfile?.selectedIcon || 'kirby-01'
    message.value = 'No se pudo guardar el icono.'
    return false
  } finally {
    isSavingIcon.value = false
  }
}

const postPath = (postOrId) => {
  if (typeof postOrId === 'object' && postOrId) return `/post/${postOrId.slug || postOrId.id}`
  return `/post/${postOrId}`
}

const openPost = (postOrId) => {
  if (postOrId) router.push(postPath(postOrId))
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

let noticeTimer
watch(message, (value) => {
  clearTimeout(noticeTimer)
  if (value) noticeTimer = setTimeout(() => { message.value = '' }, 5000)
})
watch(() => route.params.uid, loadProfile)
watch(() => route.fullPath, () => { closeIconPanel(); closeRedeemConfirm(); achievementEditorOpen.value = false; message.value = ''; if (!isRewardsPage.value && iconTestMode.value) toggleIconTestMode() })
watch(postActivityItems, (items) => {
  if (recentPostIndex.value >= items.length) recentPostIndex.value = 0
})
watch(activityTab, () => {
  showAllRecentPosts.value = false
})
watch([iconPanelOpen, iconUploadOpen, relationModal, confirmRedeem, redemptionResult], values => {
  document.body.style.overflow = values.some(Boolean) ? 'hidden' : ''
})
onMounted(() => {
  unsubscribeViewer = onAuthStateChanged(auth, user => { viewerUid.value = user?.uid || '' })
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  loadProfile()
})
onUnmounted(() => {
  unsubscribeViewer?.()
  clearTimeout(noticeTimer)
  document.body.style.overflow = ''
})
</script>

<template>
  <main class="profile-page" :class="{ 'profile-ready': !isLoading && profile }" :aria-busy="isLoading">
    <section v-if="isLoading && isRewardsPage" class="rewards-loading" :class="{ 'loading-achievements': rewardsTab === 'achievements' }" role="status" aria-label="Cargando logros y recompensas">
      <span class="profile-loading-label">Cargando logros y recompensas…</span>
      <div class="rewards-loading-back" aria-hidden="true"></div>
      <div class="rewards-loading-title" aria-hidden="true"></div>
      <div class="rewards-loading-tabs" aria-hidden="true"><span v-for="index in 3" :key="index"></span></div>
      <div class="rewards-loading-summary" aria-hidden="true"></div>
      <div class="rewards-loading-grid" aria-hidden="true"><div v-for="index in (rewardsTab === 'achievements' ? 4 : 10)" :key="index"><span></span><span></span></div></div>
    </section>
    <section v-else-if="isLoading" class="profile-loading" role="status" aria-label="Cargando perfil">
      <span class="profile-loading-label">Cargando perfil…</span>
      <div class="profile-loading-hero" aria-hidden="true">
        <div class="profile-loading-avatar"></div>
        <div class="profile-loading-info"><span></span><strong></strong><span></span><span></span></div>
        <div class="profile-loading-summary"></div>
      </div>
      <div class="profile-loading-stats" aria-hidden="true"><span v-for="index in 4" :key="index"></span></div>
      <div class="profile-loading-columns" aria-hidden="true"><div v-for="index in 3" :key="index"><span></span><span></span><span></span></div></div>
    </section>
    <div v-if="!isLoading && !profile" class="profile-empty">
      Este perfil no existe.
    </div>

    <template v-if="!isLoading && profile">
      <ProfileRewardsHub v-if="isRewardsPage" :tab="rewardsTab" :profile="{ ...profile, selectedIcon: pendingSelectedIcon || profile.selectedIcon }" :icons="allProfileIcons" :unlocked="effectiveUnlockedIcons" :stars="displayStars" :simulated="iconTestMode" :selection-reset="selectionReset" :own="isOwnProfile" :admin="isAdminOwnProfile" :busy="isRedeeming || isSavingIcon" :cost="iconCost" :saga="iconSaga"
        @tab="changeRewardsTab" @back="router.push({ name: 'profile', params: { uid: profileId } })" @equip="selectIcon" @redeem="requestRedeemIcon" @manage-icon="openIconUpload" @toggle-simulation="toggleIconTestMode" @add-stars="testStars += 100" @reset-simulation="testStars = 100; testUnlockedIcons = []; pendingSelectedIcon = profile.selectedIcon; selectionReset++">
        <template #achievements>      <ProfileAchievementsPanel
        v-model:draft="achievementDraft"
        :open="true" inline
        :can-manage="isAdminOwnProfile && rewardsTab === 'manage'"
        :editor-open="achievementEditorOpen"
        :editing-id="editingAchievementId"
        :earned-count="earnedAchievements.length"
        :total-count="managedAchievements.length"
        :type-counts="achievementTypeCounts"
        :types="achievementTypes"
        :roadmap="achievementRoadmap"
        @start-create="startCreateAchievement"
        @cancel-edit="achievementEditorOpen = false; resetAchievementDraft()"
        @save="saveAchievementDraft"
        @edit="editAchievement"
        @delete="deleteAchievement"
      /></template>
        <template #management>      <ProfileAchievementsPanel
        v-model:draft="achievementDraft"
        :open="true" inline
        :can-manage="isAdminOwnProfile && rewardsTab === 'manage'"
        :editor-open="achievementEditorOpen"
        :editing-id="editingAchievementId"
        :earned-count="earnedAchievements.length"
        :total-count="managedAchievements.length"
        :type-counts="achievementTypeCounts"
        :types="achievementTypes"
        :roadmap="achievementRoadmap"
        @start-create="startCreateAchievement"
        @cancel-edit="achievementEditorOpen = false; resetAchievementDraft()"
        @save="saveAchievementDraft"
        @edit="editAchievement"
        @delete="deleteAchievement"
      /></template>
      </ProfileRewardsHub>
      <template v-else>
      <ProfileHeaderCard
        :profile="profile"
        :profile-icon="profileIcon"
        :profile-icon-meta="profileIconMeta"
        :current-achievement="currentAchievement"
        :next-progress="achievementRoadmap.find(item => item.isNext || !item.unlocked)"
        :is-own-profile="isOwnProfile"
        :member-since="memberSince"
        :redeemed-icon-count="redeemedProfileIcons.length"
        :visible-profile-icons="visibleProfileIcons"
        :social-items="socialItems"
        :display-stars="displayStars"

        :icon-panel-open="iconPanelOpen"
        :follow-busy="followBusy"
        :is-following="isFollowing"
        :can-use-direct-chat="canUseDirectChat"
        @toggle-rewards="openRewards()"
        @toggle-icon-panel="toggleIconPanel"
        @open-icon-collection="openRewards('collection')"
        @toggle-follow="toggleFollow"
        @open-direct-message="openDirectMessage"
        @share="shareProfile"
      />

      <ProfileStatsPanel :stats="heroStats" @open="openRewards($event === 'icons' ? 'collection' : 'achievements')" />


      <section class="profile-dashboard">
        <aside class="profile-middle">
          <div class="profile-section profile-about"><div class="section-head"><h2>Sobre mí</h2><button v-if="isOwnProfile" type="button" aria-label="Editar información del perfil" @click="toggleIconPanel"><i class="fas fa-pen"></i></button></div><p>{{ profile.description || 'Miembro de la comunidad de Galaxia Nintendera.' }}</p><p v-if="profile.location"><i class="fas fa-location-dot"></i> {{ profile.location }}</p><p v-if="memberSince"><i class="fas fa-calendar"></i> Miembro desde {{ memberSince }}</p></div>
      <section class="profile-highlights" aria-label="Colección y logros destacados">
        <div class="profile-section collection-preview">
          <div class="section-head"><div><span>Tu identidad en la galaxia</span><h2>Colección de iconos</h2></div><button type="button" @click="openRewards('collection')">Ver colección →</button></div>
          <div class="collection-preview-icons"><button v-for="icon in visibleProfileIcons" :key="icon.id" type="button" :aria-label="`Ver colección: ${icon.name}`" @click="openRewards('collection')"><ProfileAvatar :src="icon.src" :alt="icon.name" :effect="icon" /><small>{{ icon.name }}</small></button></div>
        </div>
        <div class="profile-section achievement-preview">
          <div class="section-head"><div><span>Progreso del perfil</span><h2>Vitrina de logros</h2></div><button type="button" @click="openRewards('achievements')">Ver todos →</button></div>
          <div class="achievement-preview-items"><button v-for="item in achievementRoadmap.filter(item => item.unlocked || item.isNext).slice(0,3)" :key="item.id" type="button" :class="{ earned: item.unlocked }" @click="openRewards('achievements')"><span><img v-if="item.iconUrl" :src="item.iconUrl" alt="" /><i v-else class="fas fa-trophy" aria-hidden="true"></i></span><strong>{{ item.label }}</strong><small>{{ item.unlocked ? 'Completado' : `${item.currentValue} / ${item.target}` }}</small><progress :value="item.progress" max="100" :aria-label="item.label"></progress></button></div>
        </div>
      </section>




        </aside>
        <aside class="profile-right">
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

      <section v-if="!isRewardsPage && publicProfiles.length" class="profile-section profile-directory">
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
            <ProfileAvatar
              class="directory-profile-avatar"
              :src="resolveProfileIcon(user)"
              :alt="user.name || user.email || 'Usuario'"
              :label="user.name || user.email || 'Usuario'"
              :effect="user.iconMeta"
            />
            <strong>{{ user.name || user.email || 'Usuario' }}</strong>
            <small>{{ user.relationLabel }}</small>
          </button>
        </div>
      </section>

        </aside>
        <div class="profile-section profile-activity">
          <div class="section-head">
            <div>
              <span>Actividad reciente</span>
              <h2>{{ activityTab === 'threads' ? 'Hilos publicados' : showingReadPosts ? 'Posts leídos' : 'Posts recientes' }}</h2>
            </div>
            <div class="activity-tabs">
              <button type="button" :class="{ active: activityTab === 'posts' }" @click="activityTab = 'posts'">
                {{ showingReadPosts ? 'Lecturas' : 'Posts' }}
              </button>
              <button type="button" :class="{ active: activityTab === 'threads' }" @click="activityTab = 'threads'">
                Hilos
              </button>
            </div>
          </div>

          <div class="profile-activity-body">
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

              <div v-if="postActivityItems.length > 1" class="activity-preview-pair"><button v-for="item in postActivityItems.filter(item => item.id !== currentRecentPost?.id).slice(0,2)" :key="item.id" type="button" @click="item.action"><img v-if="item.image" :src="item.image" alt="" /><div><small>{{ item.label }}</small><strong>{{ item.title }}</strong><em>{{ item.time }}</em></div></button></div>
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
          <p v-if="!visibleActivityItems.length" class="mini-empty">{{ activityTab === 'threads' ? 'Todavía no hay hilos publicados.' : showingReadPosts ? 'Todavía no hay lecturas disponibles.' : 'Todavía no hay publicaciones.' }}</p>
          </div>
        </div>
      </section>

      <ProfileFavoritesPreview
        v-model:expanded="favoritesExpanded"
        :favorites="favorites"
        @open-post="openPost"
      />

      </template>
      <AppNotice :message="message" :type="message.startsWith('No se') ? 'error' : 'success'" />
      <ProfileRewardDialog v-if="confirmRedeem || redemptionResult" :pending="confirmRedeem" :result="redemptionResult" :busy="isRedeeming" :saving="isSavingIcon" :stars="displayStars" :cost="iconCost" :simulated="iconTestMode" :error="redemptionError" @close="closeRedeemConfirm" @confirm="confirmUnlockIcon" @use="useRedeemedIcon" @another="redeemAnother" />
      <ProfileIconEditor v-if="iconPanelOpen || iconUploadOpen" v-model:profile-draft="profileDraft" v-model:upload-icon-draft="uploadIconDraft" :profile="profile" :profile-icon="profileIcon" :profile-icon-meta="profileIconMeta" :panel-open="iconPanelOpen" :upload-open="iconUploadOpen" :edit-message="editMessage" :is-saving-profile="isSavingProfile" :is-uploading-icon="isUploadingIcon" :editing-icon-id="editingIconId" :upload-icon-preview="uploadIconPreview" :upload-icon-message="uploadIconMessage" :icon-filters="iconFilters" @close-panel="closeIconPanel" @close-upload="closeIconUpload" @save-profile="saveProfile" @open-rewards="openRewards('collection')" @save-uploaded-icon="saveUploadedIcon" />

      <section v-if="!isRewardsPage && posts.length && !isCreatorProfile" class="profile-section">
        <div class="section-head">
          <div>
            <span>Publicaciones</span>
            <h2>Posts creados</h2>
          </div>
        </div>

        <div class="post-strip">
          <button v-for="item in posts" :key="item.id" @click="openPost(item)">
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

.profile-avatar {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}


.section-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.profile-actions button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.24);
}

@property --level-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
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


.profile-directory-grid {
  display: grid;
  gap: 14px;
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


.post-strip strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 950;
}


.profile-directory-grid small {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 5px;
}

.achievement-card.unlocked .achievement-progress i {
  background: linear-gradient(90deg, #f59e0b, #facc15);
}

.profile-directory-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.profile-directory-grid button {
  background:
    radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.18), transparent 54%),
    rgba(9, 12, 30, 0.82);
  border: 1px solid rgba(216, 180, 254, 0.16);
  border-radius: 14px;
  padding: 14px;
  text-align: center;
}

.profile-directory-grid .directory-profile-avatar {
  --avatar-size: 74px;
  display: flex;
  margin: 0 auto 9px;
}

.profile-directory-grid strong {
  color: #ffffff;
  display: block;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  .achievements-section .section-head {
    margin-right: 18px;
  }

}

.profile-page {
  background:
    radial-gradient(circle at 14% 0%, rgba(168, 85, 247, 0.18), transparent 30%),
    radial-gradient(circle at 82% 10%, rgba(236, 72, 153, 0.14), transparent 28%),
    #070a16;
  color: #f8fafc;
}


.profile-section {
  background: rgba(11, 16, 32, 0.88);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  color: #f8fafc;
}


.section-head h2,
.activity-list strong,
.community-card-row strong {
  color: #ffffff;
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
.section-head p {
  color: #cbd5e1;
}

.activity-list time {
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

@media (max-width: 900px) {

  .profile-social-grid {
    grid-template-columns: 1fr;
  }

  .community-card-row {
    grid-auto-columns: minmax(132px, 46%);
    grid-auto-flow: column;
    grid-template-columns: none;
    overflow-x: auto;
    padding-bottom: 2px;
  }

}

.profile-directory-grid small {
  color: #cbd5e1;
}

@media (max-width: 760px) {
  .profile-page {
    padding: var(--public-page-top-mobile, 76px) 10px var(--public-page-bottom-mobile, calc(92px + env(safe-area-inset-bottom)));
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


.profile-page { max-width: 1360px; margin: 0 auto; }.profile-highlights { display: grid; grid-template-columns: minmax(0,1.35fr) minmax(0,1fr); gap: 18px; margin: 18px 0; }.profile-highlights .profile-section { margin: 0; }.profile-highlights h2 { font-size: 18px; }.profile-highlights .section-head > button { white-space: nowrap; color: #c084fc; font-size: 12px; min-height: 44px; }.collection-preview-icons { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }.collection-preview-icons button { display: grid; justify-items: center; gap: 8px; color: #e2e8f0; min-width: 0; }.collection-preview-icons :deep(.profile-avatar-ui) { --avatar-size: 56px; }.collection-preview-icons small { font-size: 10px; line-height: 1.4; }.achievement-preview-items { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }.achievement-preview-items button { display: grid; justify-items: center; align-content: start; padding: 14px 10px; gap: 8px; background: #6d28d920; border: 1px solid #a855f755; border-radius: 14px; color: white; }.achievement-preview-items .earned { border-color: #f59e0b66; background: #b4530918; }.achievement-preview-items span { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; background: #9333ea; box-shadow: 0 0 20px #a855f722; }.achievement-preview-items .earned span { background: linear-gradient(135deg,#f59e0b,#ffd454); }.achievement-preview-items img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }.achievement-preview-items strong { font-size: 12px; line-height: 1.5; }.achievement-preview-items small { font-size: 10px; color: #cbd5e1; }.achievement-preview-items progress { width: 100%; height: 5px; border: 0; overflow: hidden; border-radius: 10px; }.achievement-preview-items progress::-webkit-progress-bar { background: #ffffff15; }.achievement-preview-items progress::-webkit-progress-value { background: #c084fc; }.achievement-preview-items progress::-moz-progress-bar { background: #c084fc; }
.profile-social-grid { grid-template-columns: minmax(0,1.65fr) minmax(0,1fr); align-items: start; }.profile-activity { grid-column: 1; grid-row: 1; }.profile-communities { grid-column: 2; grid-row: 1; }.community-card-row { display: grid; grid-template-columns: minmax(0,1fr); gap: 10px; }.community-card-row button { display: grid; grid-template-columns: 46px minmax(0,1fr); grid-template-rows: auto auto; gap: 3px 12px; min-height: 68px; padding: 10px; background: #ffffff04; text-align: left; }.community-card-row img,.community-card-row .community-letter { position: static; grid-row: 1/span 2; width: 46px; height: 46px; border-radius: 50%; object-fit: cover; }.community-card-row .community-overlay { display: none; }.community-card-row strong,.community-card-row small,.community-card-row em { position: static; z-index: auto; }.community-card-row strong { font-size: 13px; align-self: end; }.community-card-row small { background: none; padding: 0; color: #94a3b8; font-size: 11px; }.community-card-row em { display: none; }.recent-post-card { min-height: 280px; }.recent-post-card strong { font-size: 20px; line-height: 1.45; }
@media(max-width:1000px) { .profile-highlights { grid-template-columns: minmax(0,1fr); }.collection-preview-icons { grid-template-columns: repeat(8,minmax(0,1fr)); }.collection-preview-icons :deep(.profile-avatar-ui) { --avatar-size: 48px; }.profile-social-grid { grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); }.recent-post-card { min-height: 250px; } }
@media(max-width:700px) { .profile-highlights { gap: 12px; }.collection-preview-icons { grid-template-columns: repeat(4,minmax(0,1fr)); }.profile-social-grid { grid-template-columns: minmax(0,1fr); }.profile-activity { grid-column: 1; grid-row: 1; }.profile-communities { grid-column: 1; grid-row: 2; }.community-card-row { margin: 0; overflow: visible; padding: 0; grid-auto-columns: auto; }.community-card-row button { min-height: 68px; border-radius: 12px; }.profile-highlights .section-head { flex-wrap: wrap; gap: 4px; }.recent-post-card { min-height: 220px; }.recent-post-card strong { font-size: 17px; }.achievement-preview-items { gap: 8px; }.achievement-preview-items button { padding: 12px 8px; } }


.community-card-row strong { grid-column: 2; grid-row: 1; margin: 0; }.community-card-row small { grid-column: 2; grid-row: 2; margin: 0; }.community-card-row img { opacity: 1; }.community-card-row button { align-items: center; }.community-card-row .community-letter { font-size: 16px; }.community-card-row strong { align-self: end; }.community-card-row small { align-self: start; }


.profile-right { grid-column:3; grid-row:1; min-width:0; display:grid; gap:14px; }.profile-right .profile-directory { margin:0; padding:14px; }.profile-right .profile-directory-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:8px; }.profile-right .profile-directory-grid button { display:grid; grid-template-columns:40px minmax(0,1fr); gap:4px 10px; padding:10px; text-align:left; }.profile-right .directory-profile-avatar { --avatar-size:40px; grid-row:1/span 2; margin:0; }.profile-right .profile-directory-grid strong,.profile-right .profile-directory-grid small { margin:0; white-space:normal; }.activity-preview-pair { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }.activity-preview-pair button { position:relative; min-height:190px; overflow:hidden; border:1px solid #a855f733; border-radius:12px; color:white; text-align:left; }.activity-preview-pair img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }.activity-preview-pair button > div { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:end; gap:8px; padding:14px; background:linear-gradient(transparent,#080b1f 95%); }.activity-preview-pair small { font-size:10px; color:#e9d5ff; }.activity-preview-pair strong { font-size:13px; line-height:1.4; }.activity-preview-pair em { font-size:10px; color:#cbd5e1; font-style:normal; }
@media(max-width:1100px) { .profile-right { grid-column:2; grid-row:2; } }
@media(max-width:760px) { .profile-right { grid-column:1; grid-row:3; }.profile-right .profile-directory-grid { overflow:visible; grid-auto-columns:auto; }.profile-right .profile-directory-grid button { min-width:0; }.activity-preview-pair button { min-height:170px; } }


.profile-page { --profile-content-width: 100%; width:100%; max-width:1400px; padding-left:24px; padding-right:24px; box-sizing:border-box; }.profile-hero,.profile-hero-stats { width:100%; max-width:none; margin-left:0; margin-right:0; }
.profile-dashboard { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1.05fr) minmax(0,1fr); gap:16px; align-items:start; margin:16px 0; }.profile-dashboard > .profile-activity { grid-column:1; grid-row:1; }.profile-middle { grid-column:2; grid-row:1; min-width:0; display:grid; gap:14px; }.profile-dashboard > .profile-communities { grid-column:3; grid-row:1; }.profile-dashboard .profile-section { margin:0; min-width:0; padding:16px; border-radius:14px; }.profile-dashboard .section-head { margin-bottom:12px; align-items:center; gap:10px; }.profile-dashboard .section-head h2 { font-size:17px; line-height:1.3; }.profile-dashboard .section-head span { display:none; }.profile-dashboard .section-head > button { font-size:11px; color:#c084fc; white-space:nowrap; min-height:36px; }.profile-about p { font-size:13px; line-height:1.65; color:#cbd5e1; margin:8px 0; }
.profile-highlights { display:flex; flex-direction:column; margin:0; gap:14px; }.achievement-preview { order:0; }.collection-preview { order:1; }.achievement-preview-items { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.achievement-preview-items > button:last-child:nth-child(3) { display:none; }.achievement-preview-items button { padding:12px 10px; }.collection-preview-icons { grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }.collection-preview-icons :deep(.profile-avatar-ui) { --avatar-size:44px; }.collection-preview-icons small { display:none; }
.community-card-row { gap:6px; }.community-card-row button { padding:10px 0; border:0; border-bottom:1px solid #ffffff12; background:transparent; border-radius:0; grid-template-columns:42px minmax(0,1fr); min-height:68px; }.community-card-row img,.community-card-row .community-letter { width:42px; height:42px; }.community-card-row strong { font-size:12px; }.community-card-row em { display:block; grid-column:2; position:static; font-size:9px; color:#94a3b8; }.community-card-row button { grid-template-rows:auto auto auto; }.community-card-row img { grid-row:1/span 3; }.recent-post-card { min-height:290px; border-radius:12px; }.recent-post-card strong { font-size:17px; }.profile-directory { max-width:none; }
@media(max-width:1100px) { .profile-dashboard { grid-template-columns:minmax(0,1.6fr) minmax(0,1fr); }.profile-dashboard > .profile-activity { grid-column:1; grid-row:1/span 2; }.profile-middle { grid-column:2; grid-row:1; }.profile-dashboard > .profile-communities { grid-column:2; grid-row:2; }.profile-page { padding-left:18px; padding-right:18px; } }
@media(max-width:760px) { .profile-page { padding-left:12px; padding-right:12px; }.profile-dashboard { grid-template-columns:minmax(0,1fr); gap:12px; }.profile-dashboard > .profile-activity { grid-column:1; grid-row:1; }.profile-middle { grid-column:1; grid-row:2; }.profile-dashboard > .profile-communities { grid-column:1; grid-row:3; }.collection-preview-icons { grid-template-columns:repeat(6,minmax(0,1fr)); }.collection-preview-icons > button:nth-child(n+7) { display:none; }.collection-preview-icons :deep(.profile-avatar-ui) { --avatar-size:40px; }.recent-post-card { min-height:230px; } }


.profile-right { grid-template-columns:minmax(0,1fr); }.profile-right > .profile-communities,.profile-right > .profile-directory { grid-column:1; grid-row:auto; }.profile-right > .profile-communities { order:0; }.profile-right > .profile-directory { order:1; }


.community-card-row button { grid-template-rows:18px 15px 12px; row-gap:2px; min-height:69px; }.community-card-row strong { line-height:1.4; align-self:start; }.community-card-row em { grid-row:3; line-height:1.2; }.profile-dashboard > .profile-activity { min-height:0; }.profile-right .profile-directory-grid button { min-height:65px; }

/* Activity content scrolls within its column; tabs never resize the dashboard. */
.profile-dashboard { align-items: stretch; }
.profile-middle, .profile-right { align-content: start; }
.profile-right { min-height: 640px; }
.profile-dashboard > .profile-activity { position: relative; min-height: 640px; }
.profile-activity > .section-head { min-height: 40px; }
.profile-activity-body { position: absolute; inset: 72px 16px 16px; overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; overscroll-behavior: contain; }
.recent-post-showcase { display: grid; gap: 12px; }
.recent-post-controls { margin: 0; }
.profile-activity-body .mini-empty { margin: 0; }
.profile-middle { grid-template-rows: auto minmax(0,1fr); }
.profile-middle .profile-highlights { height: 100%; }
.profile-middle .collection-preview { flex: 1; }
.profile-right { grid-template-rows: minmax(230px,1fr) auto; }
.profile-ready > .profile-hero,
.profile-ready > .profile-hero-stats,
.profile-ready > .profile-dashboard,
.profile-ready > .favorite-preview-section { animation: profileReveal 320ms ease-out both; }
@keyframes profileReveal { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.profile-loading-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.profile-loading-hero,.profile-loading-stats,.profile-loading-columns > div { border: 1px solid #a78bfa26; border-radius: 16px; background: #0b1020; }
.profile-loading-hero { min-height: 300px; display: grid; grid-template-columns: 150px minmax(0,1fr) 260px; align-items: center; gap: 28px; padding: 28px; }
.profile-loading-avatar,.profile-loading-info > *, .profile-loading-summary,.profile-loading-stats span,.profile-loading-columns span { display: block; background: linear-gradient(90deg,#94a3b82e,#d8b4fe42,#94a3b82e); animation: profileLoadingPulse 1.5s ease-in-out infinite alternate; border-radius: 12px; }
.profile-loading-avatar { width: 150px; height: 150px; border-radius: 50%; }
.profile-loading-info { display: grid; gap: 18px; }
.profile-loading-info span { height: 18px; width: 75%; }
.profile-loading-info strong { height: 42px; width: 85%; }
.profile-loading-summary { height: 180px; }
.profile-loading-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 28px; margin-top: 14px; padding: 20px; }
.profile-loading-stats span { height: 40px; }
.profile-loading-columns { display: grid; grid-template-columns: 2fr 1.05fr 1fr; gap: 16px; margin-top: 16px; }
.profile-loading-columns > div { min-height: 640px; padding: 16px; }
.profile-loading-columns span { height: 140px; margin-bottom: 16px; }
.profile-loading-columns span:first-child { width: 60%; height: 24px; }
@keyframes profileLoadingPulse { from { opacity: .55; } to { opacity: .9; } }
@media(max-width:1100px) {
  .profile-middle,.profile-right { grid-template-rows: auto; }
  .profile-middle .collection-preview { flex: none; }
  .profile-loading-hero { grid-template-columns: 100px minmax(0,1fr); }
  .profile-loading-avatar { width: 100px; height: 100px; }
  .profile-loading-summary { display: none; }
  .profile-loading-columns { grid-template-columns: 1.6fr 1fr; }
  .profile-loading-columns > div:last-child { display: none; }
}
@media(max-width:760px) {
  .profile-dashboard > .profile-activity { height: 600px; min-height: 600px; }
  .profile-right { min-height: 0; }
  .profile-middle .profile-highlights { height: auto; }
  .profile-loading-hero { padding: 20px; gap: 16px; min-height: 300px; }
  .profile-loading-stats { gap: 12px; padding: 16px; }
  .profile-loading-columns { grid-template-columns: minmax(0,1fr); }
  .profile-loading-columns > div { min-height: 600px; }
  .profile-loading-columns > div:nth-child(n+2) { display: none; }
}
@media(prefers-reduced-motion:reduce) { .profile-ready > *, .profile-loading * { animation: none !important; } }
.rewards-loading { max-width: var(--content-max,1280px); margin: 0 auto; }
.rewards-loading-back,.rewards-loading-title,.rewards-loading-tabs span,.rewards-loading-summary,.rewards-loading-grid span { background: linear-gradient(90deg,#94a3b82e,#d8b4fe42,#94a3b82e); border-radius: 10px; animation: profileLoadingPulse 1.5s ease-in-out infinite alternate; }
.rewards-loading-back { width: 120px; height: 20px; margin: 12px 0 20px; }
.rewards-loading-title { width: min(300px,75%); height: 28px; margin-bottom: 12px; }
.rewards-loading-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.rewards-loading-tabs span { flex: 1; max-width: 140px; height: 44px; }
.rewards-loading-summary { height: 64px; margin-bottom: 16px; }
.rewards-loading-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 14px; }
.rewards-loading-grid > div { display: grid; justify-items: center; align-content: center; gap: 14px; min-height: 180px; padding: 16px; border: 1px solid #a78bfa26; border-radius: 14px; background: #0b1020; }
.rewards-loading-grid span:first-child { width: 76px; height: 76px; border-radius: 50%; }
.rewards-loading-grid span:last-child { width: 75%; height: 16px; }
.loading-achievements .rewards-loading-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
.loading-achievements .rewards-loading-grid > div { min-height: 140px; }
@media(max-width:900px) { .rewards-loading-grid { grid-template-columns: repeat(3,minmax(0,1fr)); } }
@media(max-width:600px) { .rewards-loading-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }.loading-achievements .rewards-loading-grid { grid-template-columns: minmax(0,1fr); } }
@media(prefers-reduced-motion:reduce) { .rewards-loading * { animation: none !important; } }
</style>
