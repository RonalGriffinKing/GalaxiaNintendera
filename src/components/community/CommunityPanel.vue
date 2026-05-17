<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { notifyThreadLike, notifyThreadReply } from '@/services/notifications'
import {
  allowFloatingPlayback,
  disableFloatingPlayback,
  playerState,
  setCurrentVideo,
  setCurrentTime,
  setPlaybackStatus,
  stopPlayback
} from '@/services/playerState'
import { resolveProfileIcon } from '@/services/profileProgress'
import CommunityHero from '@/components/community/CommunityHero.vue'
import CommunityLiveHub from '@/components/community/CommunityLiveHub.vue'
import CommunityMediaTheater from '@/components/community/CommunityMediaTheater.vue'
import CommunityOfficialPanel from '@/components/community/CommunityOfficialPanel.vue'
import CommunityRailNav from '@/components/community/CommunityRailNav.vue'
import CommunityThreadList from '@/components/community/CommunityThreadList.vue'
import {
  CONTENT_TAB_ICONS,
  DEFAULT_THREAD_TOPICS,
  OFFICIAL_COMMUNITY_ID,
  createOfficialCommunity
} from '@/constants/community'

const router = useRouter()
const route = useRoute()
const props = defineProps({
  userRole: {
    type: String,
    default: 'user'
  },
  initialCommunityId: {
    type: String,
    default: ''
  },
  showRail: {
    type: Boolean,
    default: true
  }
})

const draft = ref('')
const draftImageUrl = ref('')
const draftSpoiler = ref(false)
const eventDraft = ref({
  title: '',
  description: '',
  startsAt: '',
  type: 'Evento',
  url: ''
})
const liveGoalDraft = ref({
  title: '',
  description: '',
  type: 'likes',
  target: 5000,
  checklistText: ''
})
const replyDraft = ref('')
const selectedTopic = ref('Inicio')
const selectedCommunityId = ref('')
const openThreadId = ref(null)
const defaultThreadTopics = DEFAULT_THREAD_TOPICS
const contentTabIcons = CONTENT_TAB_ICONS
const getTopicIcon = (topic) => contentTabIcons[topic] || 'fas fa-hashtag'
const getTopicLabel = (topic) => (topic === 'Posts' ? 'Hilos' : topic)
const communities = ref([])
const joinedCommunityIds = ref([])
const threads = ref([])
const galaxyEvents = ref([])
const liveGoals = ref([])
const isLoading = ref(true)
const isCommunitiesLoading = ref(true)
const isDeleting = ref(false)
const activeVideoMode = ref('live')
const officialVideoFilter = ref('all')
const officialVideoPage = ref(0)
const youtubeLiveVideo = ref(null)
const selectedYoutubeVideo = ref(null)
const youtubePastLives = ref([])
const youtubeRecentVideos = ref([])
const youtubeVideosLoading = ref(false)
const youtubeVideosError = ref('')
const videoChatMessages = ref([])
const videoChatDraft = ref('')
const videoReplyDrafts = ref({})
const mediaTheaterOpen = ref(false)
const liveClockNow = ref(Date.now())
const liveSessionStartedAt = ref(0)
const liveStageRef = ref(null)
const eventManagerOpen = ref(false)
const liveGoalManagerOpen = ref(false)
const expandedLiveGoalId = ref('')
const isSavingLiveGoal = ref(false)
const editingEventId = ref('')
const currentUserProfile = ref({ imageUrl: '' })
const communityDraft = ref({
  name: '',
  description: '',
  bannerUrl: '',
  iconUrl: '',
  threadBackgroundUrl: '',
  musicPlaylistUrl: '',
  musicVolume: 35,
  threadTopics: [...defaultThreadTopics],
  newTopic: ''
})
const editingCommunityId = ref('')
const communityEditorOpen = ref(false)
const discoverModalOpen = ref(false)
const discoverSearch = ref('')
const isSavingCommunity = ref(false)
const isTogglingMembership = ref(false)
const liveSettings = ref({
  youtubeChannelId: import.meta.env.VITE_YOUTUBE_CHANNEL_ID || '',
  youtubeHandle: import.meta.env.VITE_YOUTUBE_HANDLE || 'GalaxiaNintendera',
  youtubeApiKey: import.meta.env.VITE_YOUTUBE_API_KEY || '',
  twitchChannel: import.meta.env.VITE_TWITCH_CHANNEL || '',
  tiktokUser: import.meta.env.VITE_TIKTOK_USER || ''
})
const joinedRail = ref(null)
const communityRailPage = ref(0)
const selectedProfile = ref(null)
const isProfileLoading = ref(false)
const confirmDialog = ref({ show: false, title: '', message: '', action: null })
const officialCommunity = createOfficialCommunity()
const youtubeHandle = computed(() => String(liveSettings.value.youtubeHandle || 'GalaxiaNintendera').replace(/^@+/, ''))
const youtubeChannelId = computed(() => liveSettings.value.youtubeChannelId || '')
const youtubeApiKey = computed(() => liveSettings.value.youtubeApiKey || '')
const youtubeChannelUrl = computed(() => `https://www.youtube.com/@${youtubeHandle.value}`)
const youtubeEmbedOrigin = computed(() => (typeof window === 'undefined' ? '' : window.location.origin))
const youtubeVideosUrl = computed(() => `${youtubeChannelUrl.value}/streams`)
const youtubeLiveStreamEmbedUrl = computed(() => {
  if (!youtubeChannelId.value) return ''
  const params = new URLSearchParams({
    channel: youtubeChannelId.value,
    autoplay: '0',
    rel: '0',
    enablejsapi: '1',
    playsinline: '1',
    origin: youtubeEmbedOrigin.value
  })
  return `https://www.youtube.com/embed/live_stream?${params.toString()}`
})
const youtubeLiveUrl = computed(() => (
  youtubeLiveVideo.value?.id
    ? `https://www.youtube.com/embed/${youtubeLiveVideo.value.id}?autoplay=0&rel=0&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(youtubeEmbedOrigin.value)}`
    : ''
))
const youtubeLiveFallbackVideo = computed(() => {
  if (youtubeApiKey.value || !youtubeChannelId.value || selectedYoutubeVideo.value || youtubeLiveVideo.value) return null
  return {
    id: `channel-live-${youtubeChannelId.value}`,
    title: 'Live de Galaxia Nintendera',
    description: 'Si el canal esta en directo, YouTube cargara la transmision aqui. Si aun no aparece, espera unos segundos y vuelve a comprobar.',
    thumbnail: selectedCommunity.value?.bannerUrl || '/src/iconos/Banner.png',
    url: youtubeVideosUrl.value,
    mediaType: 'live',
    isFallbackLive: true
  }
})
const featuredYoutubeVideo = computed(() => selectedYoutubeVideo.value || youtubeLiveVideo.value || youtubeLiveFallbackVideo.value || null)
const activeVideoChatId = computed(() => featuredYoutubeVideo.value?.id || '')
const featuredYoutubeEmbedUrl = computed(() => {
  if (!featuredYoutubeVideo.value?.id) return ''
  const params = new URLSearchParams({
    autoplay: selectedYoutubeVideo.value ? '1' : '0',
    rel: '0',
    enablejsapi: '1',
    playsinline: '1',
    origin: youtubeEmbedOrigin.value
  })
  const startAt = Math.max(0, Math.floor(Number(selectedYoutubeVideo.value?.startedAt || playerState.currentTime || 0)))
  if (selectedYoutubeVideo.value && startAt > 0) params.set('start', String(startAt))
  return `https://www.youtube.com/embed/${featuredYoutubeVideo.value.id}?${params.toString()}`
})
const youtubeUploadsUrl = computed(() => (
  youtubeChannelId.value?.startsWith('UC')
    ? `https://www.youtube.com/embed/videoseries?list=UU${youtubeChannelId.value.slice(2)}`
    : ''
))
const youtubeStageEmbedUrl = computed(() => {
  if (featuredYoutubeVideo.value?.isFallbackLive) return youtubeLiveStreamEmbedUrl.value
  return featuredYoutubeEmbedUrl.value
})
const youtubeStageTitle = computed(() => (
  featuredYoutubeVideo.value?.title || (youtubeUploadsUrl.value ? 'Videos oficiales de Galaxia Nintendera' : 'Galaxia Nintendera en directo')
))
const youtubeStageDescription = computed(() => {
  if (featuredYoutubeVideo.value?.description) return featuredYoutubeVideo.value.description
  if (youtubeLiveVideo.value?.id) return 'La transmision esta activa. Entra al chat y comparte el momento con la comunidad.'
  return 'No hay transmision en vivo ahora. Revisa los horarios y eventos, o elige un video de la biblioteca para verlo aqui.'
})
const featuredVideoIsFloating = computed(() => (
  Boolean(featuredYoutubeVideo.value?.id) &&
  playerState.allowFloatingPlayback &&
  playerState.currentVideo?.id === featuredYoutubeVideo.value.id
))
const featuredVideoIsPlayingHere = computed(() => (
  Boolean(featuredYoutubeVideo.value?.id) &&
  selectedYoutubeVideo.value?.id === featuredYoutubeVideo.value.id &&
  !playerState.allowFloatingPlayback
))
const featuredVideoActionLabel = computed(() => {
  if (featuredVideoIsFloating.value) return 'Ver aquí'
  if (featuredVideoIsPlayingHere.value) return 'Ver en segundo plano'
  return 'Reproducir aquí'
})
const featuredVideoActionIcon = computed(() => {
  if (featuredVideoIsFloating.value) return 'fas fa-display'
  if (featuredVideoIsPlayingHere.value) return 'fas fa-window-minimize'
  return 'fas fa-play'
})
const featuredVideoIsLive = computed(() => Boolean(
  featuredYoutubeVideo.value?.isFallbackLive ||
  (youtubeLiveVideo.value?.id && featuredYoutubeVideo.value?.id === youtubeLiveVideo.value.id)
))
const videoDiscussionTitle = computed(() => {
  if (!featuredYoutubeVideo.value) return 'Sala del live'
  return featuredVideoIsLive.value ? 'Chat del live' : 'Comentarios del video'
})
const videoDiscussionSubtitle = computed(() => {
  if (!featuredYoutubeVideo.value) return 'El chat se activa cuando haya transmision en vivo'
  return featuredVideoIsLive.value ? 'Mensajes en tiempo real por momento' : 'Comenta, responde y guarda la conversacion'
})
const videoDiscussionPlaceholder = computed(() => {
  if (!featuredYoutubeVideo.value) return 'Esperando transmision...'
  return featuredVideoIsLive.value ? `Chatear en ${formatVideoChatTime(activeVideoSecond.value)}...` : 'Escribe un comentario...'
})
const activeVideoSecond = computed(() => {
  const youtubeSecond = Math.max(0, Math.floor(Number(playerState.currentTime || 0)))
  if (!featuredVideoIsLive.value) return youtubeSecond
  if (youtubeSecond > 0) return youtubeSecond
  const startedAt = liveSessionStartedAt.value || getMillis(featuredYoutubeVideo.value?.publishedAt)
  if (!startedAt) return 0
  return Math.max(0, Math.floor((liveClockNow.value - startedAt) / 1000))
})
const visibleVideoChatMessages = computed(() => {
  if (!featuredVideoIsLive.value) return videoChatMessages.value
  const currentSecond = activeVideoSecond.value
  const messages = videoChatMessages.value
  if (!currentSecond) return messages.slice(-80)
  return messages
    .filter(message => Number(message.videoSecond || 0) <= currentSecond + 8)
    .slice(-80)
})
const officialVideoPageSize = 5
const officialVideoLibrary = computed(() => {
  const seen = new Set()
  return [
    ...youtubePastLives.value.map(video => ({ ...video, mediaType: 'video', streamKind: video.streamKind || 'past-live' })),
    ...youtubeRecentVideos.value.map(video => ({ ...video, mediaType: 'video' }))
  ].filter((video) => {
    if (!video?.id || seen.has(video.id)) return false
    seen.add(video.id)
    return true
  })
})
const officialVideoFilters = computed(() => [
  { id: 'all', label: 'Todos', icon: 'fas fa-layer-group', count: officialVideoLibrary.value.length },
  { id: 'live', label: 'Directos', icon: 'fas fa-tower-broadcast', count: officialVideoLibrary.value.filter(video => video.streamKind === 'past-live').length },
  { id: 'video', label: 'Videos', icon: 'far fa-video', count: officialVideoLibrary.value.filter(video => video.streamKind !== 'past-live').length }
].filter(filter => filter.id === 'all' || filter.count))
const filteredOfficialVideos = computed(() => {
  if (officialVideoFilter.value === 'live') return officialVideoLibrary.value.filter(video => video.streamKind === 'past-live')
  if (officialVideoFilter.value === 'video') return officialVideoLibrary.value.filter(video => video.streamKind !== 'past-live')
  return officialVideoLibrary.value
})
const officialVideoPageCount = computed(() => Math.max(1, Math.ceil(filteredOfficialVideos.value.length / officialVideoPageSize)))
const pagedOfficialVideos = computed(() => {
  const start = officialVideoPage.value * officialVideoPageSize
  return filteredOfficialVideos.value.slice(start, start + officialVideoPageSize)
})

const displayName = computed(() => auth.currentUser?.displayName || auth.currentUser?.email || 'Usuario')
const currentUserId = computed(() => auth.currentUser?.uid || '')
const actor = computed(() => ({
  uid: currentUserId.value,
  name: displayName.value,
  imageUrl: currentUserImage.value
}))
const currentUserImage = computed(() => resolveProfileIcon({
  ...currentUserProfile.value,
  imageUrl: currentUserProfile.value.imageUrl || auth.currentUser?.photoURL || ''
}))
const isAdmin = computed(() => props.userRole === 'admin')
const canManageOfficialContent = computed(() => ['admin', 'publisher'].includes(props.userRole))
const communityRef = collection(db, 'communityThreads')
const communitiesRef = collection(db, 'communities')
const eventsRef = collection(db, 'galaxyEvents')
const liveGoalsRef = collection(db, 'liveGoals')
const selectedCommunity = computed(() => communities.value.find(item => item.id === selectedCommunityId.value) || communities.value[0] || null)
const normalizeThreadTopics = (items = []) => {
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
const selectedCommunityTopics = computed(() => normalizeThreadTopics(selectedCommunity.value?.threadTopics || defaultThreadTopics))
const threadTopicFilters = computed(() => [
  { label: 'Todos', value: 'Inicio', icon: 'fas fa-layer-group' },
  ...selectedCommunityTopics.value.map(topic => ({
    label: getTopicLabel(topic),
    value: topic,
    icon: getTopicIcon(topic)
  }))
])
const selectedCommunityThreads = computed(() => {
  if (!selectedCommunity.value) return []
  return threads.value.filter(thread => (thread.communityId || '') === selectedCommunity.value.id)
})
const isJoinedSelectedCommunity = computed(() => selectedCommunity.value && joinedCommunityIds.value.includes(selectedCommunity.value.id))
const isOfficialSelectedCommunity = computed(() => selectedCommunity.value?.id === OFFICIAL_COMMUNITY_ID || selectedCommunity.value?.isOfficial)
const canCreateThreadInSelectedCommunity = computed(() => {
  if (!selectedCommunity.value) return false
  if (isOfficialSelectedCommunity.value) return canManageOfficialContent.value
  return isJoinedSelectedCommunity.value
})
const communityBannerPreview = computed(() => communityDraft.value.bannerUrl.trim())
const communityIconPreview = computed(() => communityDraft.value.iconUrl.trim())
const communityMusicPreview = computed(() => communityDraft.value.musicPlaylistUrl.trim())
const communityMusicVolumePreview = computed(() => Number(communityDraft.value.musicVolume || 35))
const communityThreadBackgroundPreview = computed(() => communityDraft.value.threadBackgroundUrl.trim())
const draftImagePreview = computed(() => draftImageUrl.value.trim())
const isEditingCommunity = computed(() => Boolean(editingCommunityId.value))
const communityThreadBackgroundStyle = computed(() => {
  const background = selectedCommunity.value?.threadBackgroundUrl?.trim()
  if (!background) return {}
  return {
    backgroundImage: `linear-gradient(180deg, rgba(5, 8, 22, 0.82), rgba(5, 8, 22, 0.9)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})
const hasThreadBackground = computed(() => Boolean(selectedCommunity.value?.threadBackgroundUrl?.trim()))
const joinedCommunities = computed(() => {
  const joinedIds = new Set(joinedCommunityIds.value)
  joinedIds.add(OFFICIAL_COMMUNITY_ID)
  return communities.value.filter(community => community.id === OFFICIAL_COMMUNITY_ID || joinedIds.has(community.id))
})
const railPageSize = 4
const communityRailPageCount = computed(() => Math.max(1, Math.ceil(joinedCommunities.value.length / railPageSize)))
const discoveryCommunities = computed(() => {
  const joinedIds = new Set(joinedCommunityIds.value)
  return communities.value.filter(community => !joinedIds.has(community.id))
})
const filteredDiscoveryCommunities = computed(() => {
  const query = normalizeText(discoverSearch.value)
  if (!query) return discoveryCommunities.value

  return discoveryCommunities.value.filter(community => {
    return normalizeText(`${community.name || ''} ${community.description || ''}`).includes(query)
  })
})
const communityStats = computed(() => [
  { label: 'Miembros', value: Number(selectedCommunity.value?.membersCount || 0), icon: 'fas fa-users' },
  { label: 'En linea', value: activeUsers.value.length, icon: 'fas fa-signal' },
  { label: 'Posts', value: selectedCommunityThreads.value.length, icon: 'far fa-comment' }
])
const trendingTopics = computed(() => {
  const counts = new Map()
  selectedCommunityThreads.value.forEach(thread => {
    const key = thread.topic || 'Posts'
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
})
const upcomingEvents = computed(() => {
  const now = Date.now()
  return galaxyEvents.value
    .filter(event => getMillis(event.startsAt) >= now || event.isPinned)
    .sort((a, b) => getMillis(a.startsAt) - getMillis(b.startsAt))
    .slice(0, 5)
})
const isEventNotified = (event) => {
  const uid = auth.currentUser?.uid
  return Boolean(uid && Array.isArray(event?.notifyBy) && event.notifyBy.includes(uid))
}
const toggleEventNotify = async (event) => {
  const uid = auth.currentUser?.uid
  if (!uid || !event?.id) {
    router.push('/login?mode=login')
    return
  }

  await updateDoc(doc(db, 'galaxyEvents', event.id), {
    notifyBy: isEventNotified(event) ? arrayRemove(uid) : arrayUnion(uid)
  })
}
const liveGoalCards = computed(() => liveGoals.value.map(goal => {
  const isMission = goal.type === 'mission'
  const target = Math.max(1, Number(goal.target || 1))
  const likesBy = goal.likesBy || {}
  const likerProfiles = goal.likerProfiles || {}
  const ranking = Object.entries(likesBy)
    .map(([uid, count]) => ({
      uid,
      count: Number(count || 0),
      name: likerProfiles[uid]?.name || 'Usuario',
      imageUrl: likerProfiles[uid]?.imageUrl || ''
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
  const current = isMission
    ? (goal.checklist || []).filter(item => item.done).length
    : ranking.reduce((total, item) => total + item.count, 0)
  return {
    ...goal,
    current,
    target: isMission ? Math.max(1, (goal.checklist || []).length || target) : target,
    progress: Math.min(100, Math.round((current / (isMission ? Math.max(1, (goal.checklist || []).length || target) : target)) * 100)),
    ranking
  }
}))
const currentLiveGoal = computed(() => liveGoalCards.value.find(goal => goal.progress < 100) || liveGoalCards.value[0] || null)
const formatDateInputValue = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const eventDateOptions = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() + index)
  const value = formatDateInputValue(date)
  return {
    value,
    day: new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date),
    weekday: index === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date)
  }
}))
const setEventDraftDateTime = (dateValue, timeValue = '21:00') => {
  if (!dateValue) return
  eventDraft.value.startsAt = `${dateValue}T${timeValue || '21:00'}`
}
const eventDateValue = computed({
  get: () => eventDraft.value.startsAt?.slice(0, 10) || '',
  set: (value) => setEventDraftDateTime(value, eventTimeValue.value)
})
const eventTimeValue = computed({
  get: () => eventDraft.value.startsAt?.slice(11, 16) || '21:00',
  set: (value) => setEventDraftDateTime(eventDateValue.value || eventDateOptions.value[0]?.value, value)
})

let unsubscribeThreads = null
let unsubscribeCommunities = null
let unsubscribeEvents = null
let unsubscribeLiveGoals = null
let unsubscribeVideoChat = null
let skipNextVideoRouteScroll = false
let liveClockTimer = null

const filteredThreads = computed(() => {
  const base = selectedCommunityThreads.value
  if (!selectedCommunityTopics.value.includes(selectedTopic.value)) return base
  return base.filter(thread => thread.topic === selectedTopic.value)
})

const activeUsers = computed(() => {
  const users = new Map()

  selectedCommunityThreads.value.forEach(thread => {
    registerActiveUser(users, {
      id: thread.authorId,
      name: thread.author,
      imageUrl: thread.authorImage || '',
      action: `Publico en ${thread.topic}`,
      at: thread.updatedAt || thread.createdAt || 0
    })

    ;(thread.comments || []).forEach(comment => {
      registerActiveUser(users, {
        id: comment.authorId || `${comment.author}-${comment.id}`,
        name: comment.author,
        imageUrl: comment.authorImage || '',
        action: 'Comento un hilo',
        at: comment.createdAt || 0
      })
    })
  })

  return [...users.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, 4)
})

const registerActiveUser = (users, user) => {
  if (!user.name) return
  const key = user.id || user.name
  const current = users.get(key)

  if (!current || user.at > current.at) {
    users.set(key, user)
  }
}

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const isOwnThread = (thread) => {
  return Boolean(thread?.authorId && currentUserId.value && String(thread.authorId) === String(currentUserId.value))
}

const canDeleteThread = (thread) => {
  if (!thread?.id) return false
  if (isAdmin.value) return true
  return isOwnThread(thread)
}

const canPinThread = (thread) => {
  return canManageOfficialContent.value && Boolean(thread?.id)
}

const canDeleteComment = (comment) => {
  return isAdmin.value || Boolean(comment.authorId && comment.authorId === currentUserId.value)
}

const formatAgo = (value) => {
  const time = getMillis(value)
  if (!time) return 'Ahora'

  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `Hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  const days = Math.floor(hours / 24)
  return `Hace ${days} dia${days === 1 ? '' : 's'}`
}

const getMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.toDate) return value.toDate().getTime()
  return new Date(value).getTime()
}

const avatarInitial = (name = '') => {
  return name.trim().charAt(0).toUpperCase() || 'U'
}

const loadCurrentUserProfile = async () => {
  const user = auth.currentUser
  if (!user) return

  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const saved = snap.data() || {}
    currentUserProfile.value = {
      ...saved,
      imageUrl: saved.imageUrl || user.photoURL || ''
    }
    const membershipSnap = await getDocs(collection(db, 'users', user.uid, 'communities')).catch(() => ({ docs: [] }))
    joinedCommunityIds.value = [...new Set([OFFICIAL_COMMUNITY_ID, ...membershipSnap.docs.map(item => item.id)])]
  } catch (error) {
    console.error(error)
    currentUserProfile.value = {
      imageUrl: user.photoURL || ''
    }
  }
}

const threadRef = (id) => doc(db, 'communityThreads', id)

const buildProfileSeed = (source = {}) => ({
  uid: source.uid || source.authorId || source.id || '',
  name: source.name || source.author || displayName.value,
  description: source.description || '',
  imageUrl: source.imageUrl || source.authorImage || ''
})

const openUserProfile = async (source) => {
  const seed = buildProfileSeed(source)
  if (!seed.uid) return

  router.push(`/perfil/${seed.uid}`)
  return

  selectedProfile.value = {
    ...seed,
    threads: threads.value.filter(thread => thread.authorId === seed.uid).slice(0, 4),
    favorites: [],
    posts: []
  }
  isProfileLoading.value = true

  try {
    const [userSnap, favoritesSnap, postsSnap] = await Promise.all([
      getDoc(doc(db, 'users', seed.uid)),
      getDocs(query(collection(db, 'users', seed.uid, 'favorites'), limit(4))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'posts'), limit(80))).catch(() => ({ docs: [] }))
    ])

    const saved = userSnap.exists() ? userSnap.data() : {}
    const posts = postsSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(post => post.authorId === seed.uid)
      .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
      .slice(0, 4)

    selectedProfile.value = {
      uid: seed.uid,
      name: saved.name || seed.name,
      description: saved.description || seed.description || 'Miembro de la comunidad',
      imageUrl: saved.imageUrl || seed.imageUrl,
      threads: threads.value.filter(thread => thread.authorId === seed.uid).slice(0, 4),
      favorites: favoritesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
      posts
    }
  } catch (error) {
    console.error(error)
  } finally {
    isProfileLoading.value = false
  }
}

const closeUserProfile = () => {
  selectedProfile.value = null
}

const openPost = (id) => {
  if (!id) return
  closeUserProfile()
  router.push(`/post/${id}`)
}

const insertPollPrompt = () => {
  const prompt = 'Encuesta: opcion A / opcion B'
  draft.value = draft.value.trim() ? `${draft.value.trim()}\n${prompt}` : prompt
}

const addSticker = () => {
  draft.value = `${draft.value}${draft.value ? ' ' : ''}⭐`.slice(0, 240)
}

const focusDraftImageField = (event) => {
  const body = event.currentTarget.closest('.composer-body')
  body?.querySelector('.composer-image-field input')?.focus()
}

const pasteDraftImageUrl = async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim()
    if (!/^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif)(\?\S*)?$/i.test(text) && !/^https?:\/\/\S+$/i.test(text)) return
    draftImageUrl.value = text
  } catch (error) {
    console.error(error)
  }
}

const publishThread = async () => {
  const body = draft.value.trim()
  const imageUrl = draftImageUrl.value.trim()
  const threadTopic = selectedCommunityTopics.value.includes(selectedTopic.value) ? selectedTopic.value : selectedCommunityTopics.value[0]
  if (!body || !selectedCommunity.value || !canCreateThreadInSelectedCommunity.value) return

  const now = Date.now()

  await addDoc(communityRef, {
    communityId: selectedCommunity.value.id,
    communityName: selectedCommunity.value.name,
    authorId: currentUserId.value,
    author: displayName.value,
    authorImage: currentUserImage.value,
    handle: '@tu_usuario',
    topic: threadTopic,
    title: body.length > 72 ? `${body.slice(0, 72)}...` : body,
    body,
    imageUrl,
    spoiler: draftSpoiler.value,
    isOfficial: isOfficialSelectedCommunity.value,
    lockedThread: isOfficialSelectedCommunity.value,
    replies: 0,
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: now,
    updatedAt: now
  })

  draft.value = ''
  draftImageUrl.value = ''
  draftSpoiler.value = false
}

const resetCommunityDraft = () => {
  editingCommunityId.value = ''
  communityDraft.value = {
    name: '',
    description: '',
    bannerUrl: '',
    iconUrl: '',
    threadBackgroundUrl: '',
    musicPlaylistUrl: '',
    musicVolume: 35,
    threadTopics: [...defaultThreadTopics],
    newTopic: ''
  }
}

const openCreateCommunity = () => {
  if (!isAdmin.value) return
  resetCommunityDraft()
  communityEditorOpen.value = true
  if (route.query.create === 'community') {
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
}

const openThreadComposer = async () => {
  await nextTick()
  window.dispatchEvent(new CustomEvent('open-quick-thread-composer'))
  if (route.query.create === 'thread') {
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
}

const closeCommunityEditor = () => {
  if (isSavingCommunity.value) return
  communityEditorOpen.value = false
  resetCommunityDraft()
}

const finishCommunityEditor = () => {
  communityEditorOpen.value = false
  resetCommunityDraft()
}

const scrollCommunityRail = (rail, direction) => {
  rail?.scrollBy({
    left: direction * 280,
    behavior: 'smooth'
  })
}

const scrollCommunityRailToPage = (index) => {
  communityRailPage.value = index
  joinedRail.value?.scrollTo({
    left: index * joinedRail.value.clientWidth,
    behavior: 'smooth'
  })
}

const syncCommunityRailPage = () => {
  const rail = joinedRail.value
  if (!rail?.clientWidth) return
  communityRailPage.value = Math.round(rail.scrollLeft / rail.clientWidth)
}

const openDiscoverModal = () => {
  discoverSearch.value = ''
  discoverModalOpen.value = true
}

const closeDiscoverModal = () => {
  discoverModalOpen.value = false
  discoverSearch.value = ''
}

const viewDiscoveredCommunity = (community) => {
  if (community?.id !== selectedCommunityId.value && !playerState.allowFloatingPlayback) {
    stopPlayback()
    selectedYoutubeVideo.value = null
  }
  selectedCommunityId.value = community.id
  closeDiscoverModal()
}

const selectRailCommunity = (community) => {
  if (community?.id !== selectedCommunityId.value && !playerState.allowFloatingPlayback) {
    stopPlayback()
    selectedYoutubeVideo.value = null
  }
  selectedCommunityId.value = community.id
}

const startEditCommunity = (community) => {
  if (!isAdmin.value || !community) return
  editingCommunityId.value = community.id
  communityDraft.value = {
    name: community.name || '',
    description: community.description || '',
    bannerUrl: community.bannerUrl || '',
    iconUrl: community.iconUrl || '',
    threadBackgroundUrl: community.threadBackgroundUrl || '',
    musicPlaylistUrl: community.musicPlaylistUrl || '',
    musicVolume: Number.isFinite(Number(community.musicVolume)) ? Number(community.musicVolume) : 35,
    threadTopics: normalizeThreadTopics(community.threadTopics || defaultThreadTopics),
    newTopic: ''
  }
  communityEditorOpen.value = true
}

const updateCommunityDraftTopic = (index, value) => {
  communityDraft.value.threadTopics[index] = String(value || '').slice(0, 24)
}

const removeCommunityDraftTopic = (index) => {
  if (communityDraft.value.threadTopics.length <= 1) return
  communityDraft.value.threadTopics.splice(index, 1)
}

const addCommunityDraftTopic = () => {
  const topic = communityDraft.value.newTopic.trim().slice(0, 24)
  if (!topic || communityDraft.value.threadTopics.length >= 8) return
  const exists = communityDraft.value.threadTopics.some(item => item.toLowerCase() === topic.toLowerCase())
  if (exists) {
    communityDraft.value.newTopic = ''
    return
  }
  communityDraft.value.threadTopics.push(topic)
  communityDraft.value.newTopic = ''
}

const saveCommunity = async () => {
  if (!isAdmin.value || isSavingCommunity.value) return
  const name = communityDraft.value.name.trim()
  const description = communityDraft.value.description.trim()
  const musicVolume = Math.min(100, Math.max(0, Number(communityDraft.value.musicVolume || 35)))
  const threadTopics = normalizeThreadTopics(communityDraft.value.threadTopics)
  if (!name || !description) return

  isSavingCommunity.value = true
  try {
    const now = Date.now()
    if (editingCommunityId.value) {
      const communityPayload = {
        name,
        description,
        bannerUrl: communityDraft.value.bannerUrl.trim(),
        iconUrl: communityDraft.value.iconUrl.trim(),
        threadBackgroundUrl: communityDraft.value.threadBackgroundUrl.trim(),
        musicPlaylistUrl: communityDraft.value.musicPlaylistUrl.trim(),
        musicVolume,
        threadTopics,
        isOfficial: editingCommunityId.value === OFFICIAL_COMMUNITY_ID,
        lockedMembership: editingCommunityId.value === OFFICIAL_COMMUNITY_ID,
        adminOnlyThreads: editingCommunityId.value === OFFICIAL_COMMUNITY_ID,
        updatedAt: now
      }

      if (editingCommunityId.value === OFFICIAL_COMMUNITY_ID) {
        communityPayload.createdAt = selectedCommunity.value?.createdAt || 0
      }

      await setDoc(doc(db, 'communities', editingCommunityId.value), communityPayload, { merge: true })
      finishCommunityEditor()
      return
    }

    const created = await addDoc(communitiesRef, {
      name,
      description,
      bannerUrl: communityDraft.value.bannerUrl.trim(),
      iconUrl: communityDraft.value.iconUrl.trim(),
      threadBackgroundUrl: communityDraft.value.threadBackgroundUrl.trim(),
      musicPlaylistUrl: communityDraft.value.musicPlaylistUrl.trim(),
      musicVolume,
      threadTopics,
      membersCount: 0,
      createdBy: currentUserId.value,
      createdAt: now,
      updatedAt: now
    })
    selectedCommunityId.value = created.id
    finishCommunityEditor()
  } finally {
    isSavingCommunity.value = false
  }
}

const triggerDeleteCommunity = (community) => {
  if (!isAdmin.value || !community) return
  if (community.id === OFFICIAL_COMMUNITY_ID || community.isOfficial) return

  confirmDialog.value = {
    show: true,
    title: 'Eliminar comunidad?',
    message: `Se borrara "${community.name}" junto con sus hilos y membresias. Esta accion no se puede deshacer.`,
    action: () => deleteCommunity(community)
  }
}

const deleteCommunity = async (community) => {
  if (!isAdmin.value || !community) return

  isDeleting.value = true

  try {
    const membersSnap = await getDocs(collection(db, 'communities', community.id, 'members')).catch(() => ({ docs: [] }))
    const relatedThreads = threads.value.filter(thread => thread.communityId === community.id)

    await Promise.all([
      ...membersSnap.docs.map(member => deleteDoc(doc(db, 'communities', community.id, 'members', member.id))),
      ...membersSnap.docs.map(member => deleteDoc(doc(db, 'users', member.id, 'communities', community.id)).catch(() => {})),
      ...relatedThreads.map(thread => deleteDoc(threadRef(thread.id))),
      deleteDoc(doc(db, 'communities', community.id))
    ])

    if (selectedCommunityId.value === community.id) {
      selectedCommunityId.value = communities.value.find(item => item.id !== community.id)?.id || ''
    }
    if (editingCommunityId.value === community.id) resetCommunityDraft()
    confirmDialog.value.show = false
  } finally {
    isDeleting.value = false
  }
}

const joinSelectedCommunity = async () => {
  const user = auth.currentUser
  const community = selectedCommunity.value
  if (!user || !community || isTogglingMembership.value) return
  if (community.id === OFFICIAL_COMMUNITY_ID || community.lockedMembership) {
    joinedCommunityIds.value = [...new Set([OFFICIAL_COMMUNITY_ID, ...joinedCommunityIds.value])]
    return
  }

  const now = Date.now()
  isTogglingMembership.value = true

  try {
    if (isJoinedSelectedCommunity.value) {
      await Promise.all([
        deleteDoc(doc(db, 'users', user.uid, 'communities', community.id)),
        deleteDoc(doc(db, 'communities', community.id, 'members', user.uid)),
        updateDoc(doc(db, 'communities', community.id), {
          membersCount: increment(-1),
          updatedAt: now
        }).catch(() => {})
      ])
      joinedCommunityIds.value = joinedCommunityIds.value.filter(id => id !== community.id)
      return
    }

    await Promise.all([
      setDoc(doc(db, 'users', user.uid, 'communities', community.id), {
        communityId: community.id,
        name: community.name,
        description: community.description || '',
        bannerUrl: community.bannerUrl || '',
        iconUrl: community.iconUrl || '',
        role: 'Miembro',
        joinedAt: now,
        updatedAt: now
      }),
      setDoc(doc(db, 'communities', community.id, 'members', user.uid), {
        userId: user.uid,
        name: displayName.value,
        imageUrl: currentUserImage.value,
        joinedAt: now
      }),
      updateDoc(doc(db, 'communities', community.id), {
        membersCount: increment(1),
        updatedAt: now
      })
    ])

    joinedCommunityIds.value = [...new Set([...joinedCommunityIds.value, community.id])]
  } finally {
    isTogglingMembership.value = false
  }
}

const toggleThread = (thread) => {
  openThreadId.value = openThreadId.value === thread.id ? null : thread.id
  replyDraft.value = ''
}

const hasLiked = (thread) => {
  return thread.likedBy?.includes(currentUserId.value)
}

const toggleLike = async (thread) => {
  const userId = currentUserId.value
  if (!userId) return

  const likedBy = thread.likedBy || []

  if (likedBy.includes(userId)) {
    await updateDoc(threadRef(thread.id), {
      likedBy: arrayRemove(userId),
      likes: increment(-1),
      updatedAt: Date.now()
    })
    return
  }

  await updateDoc(threadRef(thread.id), {
    likedBy: arrayUnion(userId),
    likes: increment(1),
    updatedAt: Date.now()
  })

  await notifyThreadLike({ thread, actor: actor.value })
}

const togglePinnedThread = async (thread) => {
  if (!canPinThread(thread)) return
  const now = Date.now()
  await updateDoc(threadRef(thread.id), {
    pinnedHome: !thread.pinnedHome,
    pinnedAt: !thread.pinnedHome ? now : 0,
    pinnedBy: !thread.pinnedHome ? currentUserId.value : '',
    updatedAt: now
  })
}

const formatEventDate = (value) => {
  const time = getMillis(value)
  if (!time) return 'Fecha pendiente'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const formatVideoDate = (value) => {
  const time = getMillis(value)
  if (!time) return 'Fecha reciente'
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Hace 1 dia'
  if (days < 30) return `Hace ${days} dias`
  const months = Math.floor(days / 30)
  return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`
}

const formatIsoDuration = (value) => {
  const match = String(value || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)
  const parts = hours ? [hours, String(minutes).padStart(2, '0'), String(seconds).padStart(2, '0')] : [minutes, String(seconds).padStart(2, '0')]
  return parts.join(':')
}

const guessYoutubeMediaType = () => 'video'

const fetchYoutubeJson = async (endpoint, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url.toString())
  if (!response.ok) {
    const error = new Error('youtube-request-failed')
    error.status = response.status
    throw error
  }
  return response.json()
}

const mapYoutubeSearchItem = (item) => ({
  id: item.id?.videoId || item.id || '',
  title: item.snippet?.title || 'Video de Galaxia Nintendera',
  description: item.snippet?.description || '',
  publishedAt: item.snippet?.publishedAt || '',
  thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
  url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : youtubeChannelUrl.value,
  mediaType: item.mediaType || guessYoutubeMediaType({
    title: item.snippet?.title,
    description: item.snippet?.description
  })
})

const playYoutubeVideo = (video) => {
  if (!video?.id) return
  const resumeAt = Number(video.startedAt || (playerState.currentVideo?.id === video.id ? playerState.currentTime : 0) || 0)
  const nextVideo = {
    ...video,
    startedAt: resumeAt
  }
  window.dispatchEvent(new CustomEvent('galaxy-media-stop'))
  selectedYoutubeVideo.value = nextVideo
  disableFloatingPlayback()
  setCurrentVideo(nextVideo)
  setPlaybackStatus('playing')
  skipNextVideoRouteScroll = route.query.v !== video.id
  router.replace({ path: route.path, query: { ...route.query, id: selectedCommunityId.value, v: video.id, live: undefined, reload: undefined } })
}

const refreshLiveNow = async () => {
  selectedYoutubeVideo.value = null
  stopPlayback()
  await loadYoutubeVideos({ force: true })
  await scrollToLiveStage()
}

const openLiveChat = () => {
  window.dispatchEvent(new CustomEvent('open-live-chat'))
}

const moveYoutubeVideoToFloating = (video) => {
  if (!video?.id) return
  setCurrentVideo({
    ...video,
    startedAt: playerState.currentTime
  })
  allowFloatingPlayback({ minimized: window.matchMedia?.('(max-width: 859px)').matches })
  window.dispatchEvent(new CustomEvent('galaxy-media-play', { detail: playerState.currentVideo }))
  selectedYoutubeVideo.value = null
  router.replace({ path: route.path, query: { ...route.query, v: undefined, live: undefined, reload: undefined } })
}

const handleFeaturedVideoAction = () => {
  const video = featuredYoutubeVideo.value
  if (!video?.id) return

  if (featuredVideoIsFloating.value) {
    playYoutubeVideo({
      ...video,
      startedAt: playerState.currentTime
    })
    return
  }

  if (featuredVideoIsPlayingHere.value) {
    moveYoutubeVideoToFloating(video)
    return
  }

  playYoutubeVideo(video)
}

const formatVideoChatTime = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = String(safe % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

const sendVideoChatMessage = async () => {
  const body = videoChatDraft.value.trim()
  const video = featuredYoutubeVideo.value
  const userId = currentUserId.value
  if (!body || !video?.id || !userId) return

  const videoSecond = activeVideoSecond.value
  const message = {
    videoId: video.id,
    videoTitle: video.title || 'Video de Galaxia Nintendera',
    videoSecond,
    body: body.slice(0, 280),
    authorId: userId,
    author: displayName.value,
    authorImage: currentUserImage.value,
    likedBy: [],
    likes: 0,
    replies: [],
    kind: featuredVideoIsLive.value ? 'live-message' : 'video-comment',
    createdAt: Date.now()
  }

  videoChatDraft.value = ''
  await addDoc(collection(db, 'videoChats', video.id, 'messages'), message)
}

const canDeleteVideoMessage = (message) => {
  return isAdmin.value || Boolean(message?.authorId && message.authorId === currentUserId.value)
}

const hasLikedVideoMessage = (message) => {
  return Array.isArray(message?.likedBy) && message.likedBy.includes(currentUserId.value)
}

const toggleVideoMessageLike = async (message) => {
  const videoId = activeVideoChatId.value
  const userId = currentUserId.value
  if (!videoId || !message?.id || !userId) return

  const likedBy = Array.isArray(message.likedBy) ? [...message.likedBy] : []
  const hasLiked = likedBy.includes(userId)
  const nextLikedBy = hasLiked ? likedBy.filter(id => id !== userId) : [...likedBy, userId]
  await updateDoc(doc(db, 'videoChats', videoId, 'messages', message.id), {
    likedBy: nextLikedBy,
    likes: nextLikedBy.length
  })
}

const sendVideoReply = async (message) => {
  const videoId = activeVideoChatId.value
  const body = String(videoReplyDrafts.value[message.id] || '').trim()
  if (!videoId || !message?.id || !body || !currentUserId.value) return

  const reply = {
    id: `${Date.now()}-${currentUserId.value}`,
    body: body.slice(0, 220),
    authorId: currentUserId.value,
    author: displayName.value,
    authorImage: currentUserImage.value,
    createdAt: Date.now()
  }

  videoReplyDrafts.value = { ...videoReplyDrafts.value, [message.id]: '' }
  await updateDoc(doc(db, 'videoChats', videoId, 'messages', message.id), {
    replies: arrayUnion(reply)
  })
}

const deleteVideoMessage = async (message) => {
  const videoId = activeVideoChatId.value
  if (!videoId || !message?.id || !canDeleteVideoMessage(message)) return
  await deleteDoc(doc(db, 'videoChats', videoId, 'messages', message.id))
}

const openVideoTheater = () => {
  if (!featuredYoutubeVideo.value?.id) return
  playYoutubeVideo(featuredYoutubeVideo.value)
  mediaTheaterOpen.value = true
}

const closeVideoTheater = () => {
  mediaTheaterOpen.value = false
  if (route.query.theater) {
    router.replace({ path: route.path, query: { ...route.query, theater: undefined } })
  }
}

const handleYoutubePlayerMessage = (event) => {
  if (!String(event.origin || '').includes('youtube.com')) return

  let payload = event.data
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch (error) {
      return
    }
  }

  if (payload?.event !== 'infoDelivery') return
  if (Number.isFinite(Number(payload.info?.currentTime))) {
    setCurrentTime(Number(payload.info.currentTime))
  }
  const state = payload.info?.playerState
  if (state === 1) setPlaybackStatus('playing')
  if (state === 2) setPlaybackStatus('paused')
  if (state === 0) setPlaybackStatus('stopped')
}

const subscribeVideoChat = (videoId) => {
  unsubscribeVideoChat?.()
  unsubscribeVideoChat = null
  videoChatMessages.value = []
  videoChatDraft.value = ''
  videoReplyDrafts.value = {}
  if (!videoId) return

  const messagesQuery = query(
    collection(db, 'videoChats', videoId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(160)
  )

  unsubscribeVideoChat = onSnapshot(messagesQuery, (snap) => {
    videoChatMessages.value = snap.docs.map(item => ({ id: item.id, ...item.data() }))
  })
}

const scrollToLiveStage = async (retries = 8) => {
  selectedTopic.value = 'Inicio'
  await nextTick()

  const stage = liveStageRef.value
  if (!stage) {
    if (retries > 0) {
      window.setTimeout(() => scrollToLiveStage(retries - 1), 120)
    }
    return
  }

  const navOffset = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--public-nav-offset'),
    10
  ) || 72
  const rect = stage.getBoundingClientRect()
  const topPadding = navOffset + 14
  const availableHeight = Math.max(280, window.innerHeight - topPadding - 18)
  const centerOffset = Math.max(0, (availableHeight - rect.height) / 2)
  const targetTop = window.scrollY + rect.top - topPadding - centerOffset

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth'
  })
}

const hydrateYoutubeVideos = async (videos) => {
  if (!videos.length) return []

  const detailData = await fetchYoutubeJson('videos', {
    part: 'contentDetails,statistics',
    id: videos.map(video => video.id).join(','),
    key: youtubeApiKey.value
  }).catch(() => ({ items: [] }))
  const details = new Map((detailData.items || []).map(item => [item.id, item]))

  return videos.map(video => {
    const detail = details.get(video.id)
    return {
      ...video,
      duration: formatIsoDuration(detail?.contentDetails?.duration),
      views: Number(detail?.statistics?.viewCount || 0)
    }
  })
}

const loadYoutubeFeedFallback = async () => {
  if (!youtubeChannelId.value?.startsWith('UC')) return false

  const response = await fetch(`/.netlify/functions/youtube-feed?channelId=${encodeURIComponent(youtubeChannelId.value)}`)
  if (!response.ok) return false

  const data = await response.json()
  const feedVideos = (data.items || []).map(item => ({
    ...item,
    duration: '',
    views: 0,
    mediaType: 'video'
  }))

  if (!feedVideos.length) return false

  youtubeLiveVideo.value = null
  youtubePastLives.value = []
  youtubeRecentVideos.value = feedVideos.slice(0, 15)
  return true
}

const loadYoutubeVideos = async ({ force = false } = {}) => {
  if (!youtubeChannelId.value || youtubeVideosLoading.value) return

  youtubeVideosLoading.value = true
  youtubeVideosError.value = ''
  if (force) {
    youtubeLiveVideo.value = null
  }

  try {
    if (!youtubeApiKey.value) {
      const loadedFallback = await loadYoutubeFeedFallback()
      youtubeVideosError.value = loadedFallback ? '' : 'Agrega tu YouTube API key para traer directos antiguos y videos recientes.'
      return
    }

    const [liveSearch, pastLiveSearch, recentSearch] = await Promise.all([
      fetchYoutubeJson('search', {
        part: 'snippet',
        channelId: youtubeChannelId.value,
        eventType: 'live',
        type: 'video',
        maxResults: 1,
        key: youtubeApiKey.value
      }).catch(() => ({ items: [] })),
      fetchYoutubeJson('search', {
        part: 'snippet',
        channelId: youtubeChannelId.value,
        eventType: 'completed',
        type: 'video',
        order: 'date',
        maxResults: 12,
        key: youtubeApiKey.value
      }).catch(() => ({ items: [] })),
      fetchYoutubeJson('search', {
        part: 'snippet',
        channelId: youtubeChannelId.value,
        order: 'date',
        type: 'video',
        maxResults: 25,
        key: youtubeApiKey.value
      })
    ])

    const liveItem = liveSearch.items?.[0]
    youtubeLiveVideo.value = liveItem ? { ...mapYoutubeSearchItem(liveItem), mediaType: 'live' } : null

    const pastLives = (pastLiveSearch.items || [])
      .map(mapYoutubeSearchItem)
      .map(video => ({ ...video, mediaType: 'video', streamKind: 'past-live' }))
      .filter(video => video.id && video.id !== youtubeLiveVideo.value?.id)
    const pastLiveIds = new Set(pastLives.map(video => video.id))

    const videos = (recentSearch.items || [])
      .map(mapYoutubeSearchItem)
      .filter(video => video.id && video.id !== youtubeLiveVideo.value?.id && !pastLiveIds.has(video.id))

    youtubePastLives.value = await hydrateYoutubeVideos(pastLives)
    youtubeRecentVideos.value = await hydrateYoutubeVideos(videos)
  } catch (error) {
    console.error(error)
    const loadedFallback = await loadYoutubeFeedFallback().catch(() => false)
    if (loadedFallback) {
      youtubeVideosError.value = error.status === 403
        ? 'La cuota de YouTube API se agoto; mostrando los ultimos videos desde el feed publico.'
        : ''
      return
    }
    youtubeVideosError.value = error.status === 403
      ? 'YouTube rechazo la API key o agoto la cuota. Revisa YouTube Data API v3, restricciones y cuota disponible.'
      : 'No pudimos cargar los videos de YouTube ahora mismo.'
  } finally {
    youtubeVideosLoading.value = false
  }
}

const saveGalaxyEvent = async () => {
  if (!canManageOfficialContent.value) return
  const title = eventDraft.value.title.trim()
  const startsAt = new Date(eventDraft.value.startsAt).getTime()
  if (!title || !Number.isFinite(startsAt)) return

  const now = Date.now()
  const payload = {
    title,
    description: eventDraft.value.description.trim(),
    type: eventDraft.value.type || 'Evento',
    url: eventDraft.value.url.trim(),
    communityId: OFFICIAL_COMMUNITY_ID,
    communityName: officialCommunity.name,
    updatedAt: now,
    startsAt
  }

  if (editingEventId.value) {
    await updateDoc(doc(db, 'galaxyEvents', editingEventId.value), payload)
  } else {
    await addDoc(eventsRef, {
      ...payload,
      createdBy: currentUserId.value,
      createdAt: now
    })
  }

  resetGalaxyEventDraft()
}

const resetGalaxyEventDraft = () => {
  editingEventId.value = ''

  eventDraft.value = {
    title: '',
    description: '',
    startsAt: '',
    type: 'Evento',
    url: ''
  }
}

const openEventManager = () => {
  resetGalaxyEventDraft()
  eventManagerOpen.value = true
}

const closeEventManager = () => {
  eventManagerOpen.value = false
  resetGalaxyEventDraft()
}

const formatDateTimeInput = (value) => {
  const time = getMillis(value)
  if (!time) return ''
  const date = new Date(time)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const editGalaxyEvent = (event) => {
  editingEventId.value = event.id
  eventDraft.value = {
    title: event.title || '',
    description: event.description || '',
    startsAt: formatDateTimeInput(event.startsAt),
    type: event.type || 'Evento',
    url: event.url || ''
  }
}

const deleteGalaxyEvent = async (event) => {
  if (!canManageOfficialContent.value || !event?.id) return
  await deleteDoc(doc(db, 'galaxyEvents', event.id))
  if (editingEventId.value === event.id) resetGalaxyEventDraft()
}

const resetLiveGoalDraft = () => {
  liveGoalDraft.value = {
    title: '',
    description: '',
    type: 'likes',
    target: 5000,
    checklistText: ''
  }
}

const openLiveGoalManager = () => {
  if (!canManageOfficialContent.value) return
  resetLiveGoalDraft()
  liveGoalManagerOpen.value = true
}

const closeLiveGoalManager = () => {
  liveGoalManagerOpen.value = false
  resetLiveGoalDraft()
}

const saveLiveGoal = async () => {
  if (!canManageOfficialContent.value || isSavingLiveGoal.value) return
  const title = liveGoalDraft.value.title.trim()
  const description = liveGoalDraft.value.description.trim()
  if (!title) return

  const now = Date.now()
  const checklist = liveGoalDraft.value.type === 'mission'
    ? liveGoalDraft.value.checklistText
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean)
      .map((label, index) => ({ id: `${now}-${index}`, label, done: false }))
    : []

  isSavingLiveGoal.value = true
  try {
    await addDoc(liveGoalsRef, {
      title,
      description,
      type: liveGoalDraft.value.type,
      target: liveGoalDraft.value.type === 'mission'
        ? Math.max(1, checklist.length || 1)
        : Math.max(1, Number(liveGoalDraft.value.target || 1)),
      checklist,
      likesBy: {},
      likerProfiles: {},
      communityId: OFFICIAL_COMMUNITY_ID,
      createdBy: currentUserId.value,
      createdAt: now,
      updatedAt: now
    })
    resetLiveGoalDraft()
  } finally {
    isSavingLiveGoal.value = false
  }
}

const deleteLiveGoal = async (goal) => {
  if (!canManageOfficialContent.value || !goal?.id) return
  await deleteDoc(doc(db, 'liveGoals', goal.id))
}

const toggleLiveMissionItem = async (goal, item) => {
  if (!canManageOfficialContent.value || !goal?.id || !item?.id) return
  const checklist = (goal.checklist || []).map(entry => (
    entry.id === item.id ? { ...entry, done: !entry.done } : entry
  ))
  await updateDoc(doc(db, 'liveGoals', goal.id), {
    checklist,
    target: Math.max(1, checklist.length),
    updatedAt: Date.now()
  })
}

const addLiveGoalLike = async (goal) => {
  const userId = currentUserId.value
  if (!userId || !goal?.id || goal.type === 'mission') return

  const likesBy = {
    ...(goal.likesBy || {}),
    [userId]: Number(goal.likesBy?.[userId] || 0) + 1
  }
  const likerProfiles = {
    ...(goal.likerProfiles || {}),
    [userId]: {
      name: displayName.value,
      imageUrl: currentUserImage.value
    }
  }

  await setDoc(doc(db, 'liveGoals', goal.id), {
    likesBy,
    likerProfiles,
    updatedAt: Date.now()
  }, { merge: true })
}

const toggleLiveGoalExpanded = (goal) => {
  expandedLiveGoalId.value = expandedLiveGoalId.value === goal.id ? '' : goal.id
}

const publishReply = async (thread) => {
  const body = replyDraft.value.trim()
  if (!body) return

  const now = Date.now()
  const comment = {
    id: `${now}-${currentUserId.value}`,
    authorId: currentUserId.value,
    author: displayName.value,
    authorImage: currentUserImage.value,
    handle: '@tu_usuario',
    body,
    createdAt: now
  }

  await updateDoc(threadRef(thread.id), {
    comments: arrayUnion(comment),
    replies: increment(1),
    updatedAt: now
  })

  await notifyThreadReply({ thread, actor: actor.value, comment })
  replyDraft.value = ''
}

const triggerDeleteThread = (thread) => {
  if (!canDeleteThread(thread)) return

  confirmDialog.value = {
    show: true,
    title: 'Eliminar hilo?',
    message: 'Se borrara el hilo completo junto con sus respuestas.',
    action: () => deleteThread(thread)
  }
}

const triggerDeleteComment = (thread, comment) => {
  if (!canDeleteComment(comment)) return

  confirmDialog.value = {
    show: true,
    title: 'Eliminar mensaje?',
    message: 'Se borrara este mensaje de la conversacion.',
    action: () => deleteComment(thread, comment)
  }
}

const closeConfirm = () => {
  if (isDeleting.value) return
  confirmDialog.value.show = false
}

const deleteThread = async (thread) => {
  if (!canDeleteThread(thread)) return

  isDeleting.value = true

  try {
    await deleteDoc(threadRef(thread.id))
    if (openThreadId.value === thread.id) openThreadId.value = null
    confirmDialog.value.show = false
  } finally {
    isDeleting.value = false
  }
}

const deleteComment = async (thread, comment) => {
  if (!canDeleteComment(comment)) return

  isDeleting.value = true

  try {
    await updateDoc(threadRef(thread.id), {
      comments: arrayRemove(comment),
      replies: increment(-1),
      updatedAt: Date.now()
    })
    confirmDialog.value.show = false
  } finally {
    isDeleting.value = false
  }
}

const subscribeThreads = () => {
  const threadsQuery = query(communityRef, orderBy('updatedAt', 'desc'), limit(40))

  unsubscribeThreads = onSnapshot(threadsQuery, (snap) => {
    threads.value = snap.docs.map(item => ({
      id: item.id,
      replies: 0,
      likes: 0,
      likedBy: [],
      comments: [],
      ...item.data()
    }))
    isLoading.value = false
  }, (error) => {
    console.error(error)
    isLoading.value = false
  })
}

const subscribeCommunities = () => {
  const communitiesQuery = query(communitiesRef, orderBy('createdAt', 'asc'), limit(30))
  unsubscribeCommunities = onSnapshot(communitiesQuery, (snap) => {
    const savedCommunities = snap.docs.map(item => ({ id: item.id, membersCount: 0, ...item.data() }))
    const savedOfficial = savedCommunities.find(item => item.id === OFFICIAL_COMMUNITY_ID)
    const customCommunities = savedCommunities.filter(item => item.id !== OFFICIAL_COMMUNITY_ID)
    communities.value = [
      { ...officialCommunity, ...savedOfficial, id: OFFICIAL_COMMUNITY_ID, isOfficial: true, lockedMembership: true, adminOnlyThreads: true },
      ...customCommunities
    ]
    if (!selectedCommunityId.value && communities.value[0]) {
      if (props.initialCommunityId && communities.value.some(c => c.id === props.initialCommunityId)) {
        selectedCommunityId.value = props.initialCommunityId
      } else if (route.query.id && communities.value.some(c => c.id === route.query.id)) {
        selectedCommunityId.value = route.query.id
      } else {
        selectedCommunityId.value = communities.value[0].id
      }
    }
    isCommunitiesLoading.value = false
  }, (error) => {
    console.error(error)
    isCommunitiesLoading.value = false
  })
}

const subscribeEvents = () => {
  const eventsQuery = query(eventsRef, orderBy('startsAt', 'asc'), limit(30))
  unsubscribeEvents = onSnapshot(eventsQuery, (snap) => {
    galaxyEvents.value = snap.docs.map(item => ({ id: item.id, ...item.data() }))
  }, (error) => {
    console.error(error)
  })
}

const subscribeLiveGoals = () => {
  const goalsQuery = query(liveGoalsRef, orderBy('createdAt', 'desc'), limit(12))
  unsubscribeLiveGoals = onSnapshot(goalsQuery, (snap) => {
    liveGoals.value = snap.docs.map(item => ({
      id: item.id,
      type: 'likes',
      target: 1,
      checklist: [],
      likesBy: {},
      likerProfiles: {},
      ...item.data()
    }))
  }, (error) => {
    console.error(error)
  })
}

const syncOfficialLiveChatState = async (isActive) => {
  if (!canManageOfficialContent.value) return

  await setDoc(doc(db, 'liveChats', OFFICIAL_COMMUNITY_ID), {
    active: Boolean(isActive),
    title: 'Chat en live',
    updatedAt: Date.now()
  }, { merge: true }).catch(console.error)

  if (isActive) return

  const messagesSnap = await getDocs(collection(db, 'liveChats', OFFICIAL_COMMUNITY_ID, 'messages')).catch(() => ({ docs: [] }))
  await Promise.all(messagesSnap.docs.map(item => (
    deleteDoc(doc(db, 'liveChats', OFFICIAL_COMMUNITY_ID, 'messages', item.id)).catch(() => {})
  )))
}

const syncLiveSessionClock = (video) => {
  if (!featuredVideoIsLive.value || !video?.id) {
    liveSessionStartedAt.value = 0
    return
  }

  const storageKey = `galaxy-live-session-start:${youtubeChannelId.value || video.id}`
  const savedStart = Number(typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : 0)
  const apiStart = getMillis(video.publishedAt)
  const startedAt = apiStart || (Number.isFinite(savedStart) && savedStart > 0 ? savedStart : Date.now())
  liveSessionStartedAt.value = startedAt

  if (!apiStart && typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, String(startedAt))
  }
}

onMounted(() => {
  window.addEventListener('message', handleYoutubePlayerMessage)
  liveClockTimer = window.setInterval(() => {
    liveClockNow.value = Date.now()
  }, 1000)
  loadCurrentUserProfile()
  subscribeCommunities()
  subscribeThreads()
  subscribeEvents()
  subscribeLiveGoals()
  if (route.query.create === 'community') {
    nextTick(openCreateCommunity)
  } else if (route.query.create === 'thread') {
    openThreadComposer()
  }
  if (route.query.explore) {
    nextTick(openDiscoverModal)
    router.replace({ path: route.path, query: { ...route.query, explore: undefined } })
  }
})

watch([communityEditorOpen, discoverModalOpen, eventManagerOpen, liveGoalManagerOpen, selectedProfile, mediaTheaterOpen, () => confirmDialog.value.show], ([isEditorOpen, isDiscoverOpen, isEventOpen, isLiveGoalOpen, profileOpen, theaterOpen, confirmOpen]) => {
  document.body.style.overflow = isEditorOpen || isDiscoverOpen || isEventOpen || isLiveGoalOpen || Boolean(profileOpen) || Boolean(theaterOpen) || Boolean(confirmOpen) ? 'hidden' : ''
})

watch(() => route.query.create, (createTarget) => {
  if (createTarget === 'community') openCreateCommunity()
  if (createTarget === 'thread') openThreadComposer()
})

watch(() => route.query.explore, (exploreTarget) => {
  if (!exploreTarget) return
  openDiscoverModal()
  router.replace({ path: route.path, query: { ...route.query, explore: undefined } })
})

watch(selectedCommunityId, (id) => {
  if (!id || route.query.id === id) return
  router.replace({ path: route.path, query: { ...route.query, id } })
})

watch(() => route.query.id, (id) => {
  if (!id || selectedCommunityId.value === id) return
  if (communities.value.some(community => community.id === id)) {
    selectedCommunityId.value = id
  }
})

watch([() => route.query.v, youtubeRecentVideos, youtubePastLives, youtubeLiveVideo], ([videoId]) => {
  if (!videoId) return
  const id = String(videoId)
  const video = [
    youtubeLiveVideo.value,
    ...youtubeRecentVideos.value,
    ...youtubePastLives.value
  ].find(item => item?.id === id)

  selectedYoutubeVideo.value = video || {
    id,
    title: 'Video de Galaxia Nintendera',
    thumbnail: selectedCommunity.value?.bannerUrl || '/src/iconos/Banner.png',
    url: `https://www.youtube.com/watch?v=${id}`
  }
  if (skipNextVideoRouteScroll) {
    skipNextVideoRouteScroll = false
    return
  }
  scrollToLiveStage()
}, { immediate: true })

watch(() => route.query.live, (live) => {
  if (!live) return
  selectedYoutubeVideo.value = null
  loadYoutubeVideos().finally(() => scrollToLiveStage())
}, { immediate: true })

watch(() => route.query.theater, (theater) => {
  if (theater) mediaTheaterOpen.value = true
}, { immediate: true })

watch([youtubeChannelId, youtubeApiKey], () => {
  youtubeLiveVideo.value = null
  youtubePastLives.value = []
  youtubeRecentVideos.value = []
  youtubeVideosError.value = ''
  loadYoutubeVideos()
}, { immediate: true })

watch(filteredOfficialVideos, () => {
  if (officialVideoPage.value >= officialVideoPageCount.value) {
    officialVideoPage.value = Math.max(0, officialVideoPageCount.value - 1)
  }
})

watch(youtubeLiveVideo, (video) => {
  syncOfficialLiveChatState(Boolean(video?.id))
})

watch([featuredYoutubeVideo, featuredVideoIsLive], ([video]) => {
  syncLiveSessionClock(video)
}, { immediate: true })

watch(currentLiveGoal, (goal) => {
  window.dispatchEvent(new CustomEvent('galaxy-live-goal-context', {
    detail: goal ? {
      title: goal.title,
      current: goal.current,
      target: goal.target,
      type: goal.type,
      progress: goal.progress
    } : null
  }))
}, { immediate: true })

watch(activeVideoChatId, subscribeVideoChat, { immediate: true })

watch(selectedCommunity, (community) => {
  if (!community?.id) return
  if (selectedTopic.value !== 'Inicio' && !selectedCommunityTopics.value.includes(selectedTopic.value)) {
    selectedTopic.value = 'Inicio'
  }
  window.dispatchEvent(new CustomEvent('community-music-context', {
    detail: {
      id: community.id,
      name: community.name || '',
      playlistUrl: community.musicPlaylistUrl || '',
      volume: Number.isFinite(Number(community.musicVolume)) ? Number(community.musicVolume) : 35
    }
  }))
})

onBeforeRouteLeave((to, from, next) => {
  if (selectedYoutubeVideo.value?.id && !playerState.allowFloatingPlayback) {
    stopPlayback()
    selectedYoutubeVideo.value = null
  }
  next()
})

onBeforeRouteUpdate((to, from, next) => {
  const fromCommunityId = String(from.query.id || selectedCommunityId.value || '')
  const toCommunityId = String(to.query.id || '')
  const isChangingCommunity = to.path === '/comunidad' && toCommunityId && toCommunityId !== fromCommunityId

  if (isChangingCommunity && selectedYoutubeVideo.value?.id && !playerState.allowFloatingPlayback) {
    stopPlayback()
    selectedYoutubeVideo.value = null
  }
  next()
})

onUnmounted(() => {
  window.removeEventListener('message', handleYoutubePlayerMessage)
  window.clearInterval(liveClockTimer)
  unsubscribeThreads?.()
  unsubscribeCommunities?.()
  unsubscribeEvents?.()
  unsubscribeLiveGoals?.()
  unsubscribeVideoChat?.()
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="community-panel">
    <div v-if="isCommunitiesLoading" class="community-empty">
      Cargando comunidades...
    </div>

    <div v-else-if="!communities.length" class="community-empty">
      Todavia no hay comunidades creadas.
    </div>

    <template v-else>
    <section v-if="props.showRail" class="community-switcher-shell">
      <CommunityRailNav
        :communities="joinedCommunities"
        :selected-id="selectedCommunity?.id || ''"
        :can-create="isAdmin"
        @select="selectRailCommunity"
        @create="openCreateCommunity"
        @explore="openDiscoverModal"
      />
    </section>

    <div class="community-stage">
      <div class="community-main-column">
        <CommunityHero
          v-if="selectedCommunity"
          :community="selectedCommunity"
          :is-admin="isAdmin"
          :is-official="isOfficialSelectedCommunity"
          :is-joined="isJoinedSelectedCommunity"
          :is-toggling="isTogglingMembership"
          @edit="startEditCommunity"
          @delete="triggerDeleteCommunity"
          @toggle-membership="joinSelectedCommunity"
        />

        <CommunityLiveHub
          v-if="isOfficialSelectedCommunity"
          ref="liveStageRef"
          v-model:video-chat-draft="videoChatDraft"
          v-model:video-reply-drafts="videoReplyDrafts"
          :youtube-videos-loading="youtubeVideosLoading"
          :youtube-stage-embed-url="youtubeStageEmbedUrl"
          :current-live-goal="currentLiveGoal"
          :featured-video-is-live="featuredVideoIsLive"
          :featured-youtube-video="featuredYoutubeVideo"
          :youtube-stage-title="youtubeStageTitle"
          :youtube-stage-description="youtubeStageDescription"
          :featured-video-action-icon="featuredVideoActionIcon"
          :featured-video-action-label="featuredVideoActionLabel"
          :youtube-videos-url="youtubeVideosUrl"
          :video-discussion-title="videoDiscussionTitle"
          :video-discussion-subtitle="videoDiscussionSubtitle"
          :active-video-second="activeVideoSecond"
          :visible-video-chat-messages="visibleVideoChatMessages"
          :video-discussion-placeholder="videoDiscussionPlaceholder"
          :filtered-official-videos="filteredOfficialVideos"
          :youtube-channel-url="youtubeChannelUrl"
          :official-video-library="officialVideoLibrary"
          :official-video-filters="officialVideoFilters"
          :official-video-filter="officialVideoFilter"
          :official-video-page="officialVideoPage"
          :paged-official-videos="pagedOfficialVideos"
          :official-video-page-count="officialVideoPageCount"
          :youtube-videos-error="youtubeVideosError"
          :youtube-api-key="youtubeApiKey"
          :youtube-uploads-url="youtubeUploadsUrl"
          :format-video-chat-time="formatVideoChatTime"
          :avatar-initial="avatarInitial"
          :has-liked-video-message="hasLikedVideoMessage"
          :can-delete-video-message="canDeleteVideoMessage"
          :format-video-date="formatVideoDate"
          @refresh-live="refreshLiveNow"
          @toggle-live-goal="toggleLiveGoalExpanded"
          @featured-video-action="handleFeaturedVideoAction"
          @open-theater="openVideoTheater"
          @like-message="toggleVideoMessageLike"
          @delete-message="deleteVideoMessage"
          @send-reply="sendVideoReply"
          @send-message="sendVideoChatMessage"
          @update-video-filter="(filter) => { officialVideoFilter = filter; officialVideoPage = 0 }"
          @update-video-page="(page) => { officialVideoPage = page }"
          @play-video="playYoutubeVideo"
        />

        <CommunityThreadList
          v-model:reply-draft="replyDraft"
          :background-style="communityThreadBackgroundStyle"
          :can-create="canCreateThreadInSelectedCommunity"
          :initial-community-id="selectedCommunity?.id || ''"
          :user-role="props.userRole"
          :is-official="isOfficialSelectedCommunity"
          :topic-filters="threadTopicFilters"
          :selected-topic="selectedTopic"
          :is-loading="isLoading"
          :threads="filteredThreads"
          :open-thread-id="openThreadId"
          :has-background="hasThreadBackground"
          :community="selectedCommunity"
          :avatar-initial="avatarInitial"
          :format-ago="formatAgo"
          :has-liked="hasLiked"
          :can-pin-thread="canPinThread"
          :can-delete-thread="canDeleteThread"
          :can-delete-comment="canDeleteComment"
          @create-thread="openThreadComposer"
          @open-thread="toggleThread"
          @like-thread="toggleLike"
          @pin-thread="togglePinnedThread"
          @delete-thread="triggerDeleteThread"
          @delete-comment="triggerDeleteComment"
          @comment-thread="publishReply"
          @open-profile="openUserProfile"
          @update-filter="(topic) => { selectedTopic = topic }"
        />
      </div>

      <CommunityOfficialPanel
        :youtube-live-url="youtubeLiveUrl"
        :youtube-channel-url="youtubeChannelUrl"
        :is-official="isOfficialSelectedCommunity"
        :is-admin="isAdmin"
        :upcoming-events="upcomingEvents"
        :live-goal-cards="liveGoalCards"
        :can-manage-official-content="canManageOfficialContent"
        :expanded-live-goal-id="expandedLiveGoalId"
        :active-users="activeUsers"
        :trending-topics="trendingTopics"
        :format-event-date="formatEventDate"
        :is-event-notified="isEventNotified"
        :avatar-initial="avatarInitial"
        @open-events="router.push('/eventos')"
        @open-event="(event) => router.push(`/eventos?id=${event.id}`)"
        @toggle-event-notify="toggleEventNotify"
        @open-live-goal-manager="openLiveGoalManager"
        @toggle-live-goal="toggleLiveGoalExpanded"
        @add-live-goal-like="addLiveGoalLike"
        @toggle-live-mission-item="toggleLiveMissionItem"
        @delete-live-goal="deleteLiveGoal"
        @open-profile="openUserProfile"
      />
    </div>
    </template>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="communityEditorOpen" class="community-editor-modal">
          <div class="confirm-backdrop" @click="closeCommunityEditor"></div>

          <section class="community-editor-card">
            <div class="community-editor-topbar">
              <div>
                <span>Admin</span>
                <h2>{{ isEditingCommunity ? 'Editar comunidad' : 'Crear comunidad' }}</h2>
              </div>
              <button type="button" aria-label="Cerrar editor" @click="closeCommunityEditor">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div class="community-editor-layout">
              <div class="community-editor-fields">
                <label>
                  Nombre
                  <input v-model="communityDraft.name" placeholder="Nombre de la comunidad" />
                </label>
                <label>
                  Descripcion
                  <input v-model="communityDraft.description" placeholder="Descripcion corta" />
                </label>
                <label>
                  Banner URL
                  <input v-model="communityDraft.bannerUrl" placeholder="https://..." />
                </label>
                <label>
                  Icono URL
                  <input v-model="communityDraft.iconUrl" placeholder="https://..." />
                </label>
                <label>
                  Fondo cuando no hay publicaciones
                  <input v-model="communityDraft.threadBackgroundUrl" placeholder="https://..." />
                </label>
                <label>
                  Playlist musica (opcional)
                  <input v-model="communityDraft.musicPlaylistUrl" placeholder="https://soundcloud.com/.../sets/..." />
                </label>
                <label>
                  Volumen musica (0-100)
                  <input v-model.number="communityDraft.musicVolume" type="number" min="0" max="100" placeholder="35" />
                </label>
                <div class="community-topic-editor">
                  <div class="community-topic-editor-head">
                    <strong>Categorias de hilos</strong>
                    <span>{{ communityDraft.threadTopics.length }}/8</span>
                  </div>

                  <div class="community-topic-list">
                    <label
                      v-for="(topic, index) in communityDraft.threadTopics"
                      :key="`draft-topic-${index}`"
                      class="community-topic-row"
                    >
                      <i :class="getTopicIcon(topic)"></i>
                      <input
                        :value="topic"
                        placeholder="Nombre de categoria"
                        @input="updateCommunityDraftTopic(index, $event.target.value)"
                      />
                      <button
                        type="button"
                        :disabled="communityDraft.threadTopics.length <= 1"
                        aria-label="Eliminar categoria"
                        @click="removeCommunityDraftTopic(index)"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                    </label>
                  </div>

                  <div class="community-topic-add">
                    <input
                      v-model="communityDraft.newTopic"
                      maxlength="24"
                      placeholder="Nueva categoria"
                      @keydown.enter.prevent="addCommunityDraftTopic"
                    />
                    <button
                      type="button"
                      :disabled="!communityDraft.newTopic.trim() || communityDraft.threadTopics.length >= 8"
                      @click="addCommunityDraftTopic"
                    >
                      <i class="fas fa-plus"></i>
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div class="community-editor-preview">
                <figure class="community-banner-preview">
                  <img v-if="communityBannerPreview" :src="communityBannerPreview" alt="" />
                  <span v-else>Banner</span>
                </figure>
                <figure class="community-icon-preview">
                  <img v-if="communityIconPreview" :src="communityIconPreview" alt="" />
                  <span v-else>{{ communityDraft.name.slice(0, 2).toUpperCase() || 'GN' }}</span>
                </figure>
                <strong>{{ communityDraft.name || 'Nueva comunidad' }}</strong>
                <p>{{ communityDraft.description || 'Descripcion corta para presentar el espacio.' }}</p>
                <small v-if="communityThreadBackgroundPreview">Fondo de hilos configurado</small>
                <small v-if="communityMusicPreview">Playlist vinculada</small>
                <small>Volumen: {{ communityMusicVolumePreview }}%</small>
                <div class="community-topic-preview">
                  <span v-for="topic in normalizeThreadTopics(communityDraft.threadTopics)" :key="topic">
                    <i :class="getTopicIcon(topic)"></i>
                    {{ getTopicLabel(topic) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="community-editor-actions">
              <button type="button" class="secondary-admin-action" :disabled="isSavingCommunity" @click="closeCommunityEditor">
                Cancelar
              </button>
              <button type="button" :disabled="isSavingCommunity || !communityDraft.name.trim() || !communityDraft.description.trim()" @click="saveCommunity">
                {{ isSavingCommunity ? 'Guardando...' : (isEditingCommunity ? 'Guardar cambios' : 'Crear comunidad') }}
              </button>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="discoverModalOpen" class="discover-modal">
          <div class="confirm-backdrop" @click="closeDiscoverModal"></div>

          <section class="discover-card">
            <div class="discover-head">
              <div>
                <span>Comunidades</span>
                <h2>Por descubrir</h2>
              </div>
              <button type="button" aria-label="Cerrar descubrimiento" @click="closeDiscoverModal">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <label class="discover-search">
              <i class="fas fa-search"></i>
              <input v-model="discoverSearch" placeholder="Buscar comunidad..." />
            </label>

            <div v-if="filteredDiscoveryCommunities.length" class="discover-grid">
              <article v-for="community in filteredDiscoveryCommunities" :key="community.id" class="discover-mini-card">
                <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
                <span v-else>{{ community.name.slice(0, 2).toUpperCase() }}</span>
                <div>
                  <strong>{{ community.name }}</strong>
                  <small>{{ community.membersCount || 0 }} miembros</small>
                </div>
                <button type="button" @click="viewDiscoveredCommunity(community)">
                  Ver
                </button>
              </article>
            </div>

            <p v-else class="discover-empty">
              No encontramos comunidades con ese filtro.
            </p>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Transition name="fade">
      <div v-if="eventManagerOpen" class="confirm-modal event-manager-modal">
        <div class="confirm-backdrop" @click="closeEventManager"></div>

        <section class="event-manager-card">
          <button class="profile-view-close" type="button" aria-label="Cerrar calendario" @click="closeEventManager">
            <i class="fas fa-xmark"></i>
          </button>

          <div class="event-manager-head">
            <span><i class="far fa-calendar"></i> Calendario global</span>
            <h2>{{ editingEventId ? 'Editar evento' : 'Crear evento' }}</h2>
          </div>

          <form class="event-admin-form" @submit.prevent="saveGalaxyEvent">
            <input v-model="eventDraft.title" placeholder="Titulo del evento" />
            <div class="event-date-picker">
              <button
                v-for="option in eventDateOptions"
                :key="option.value"
                type="button"
                :class="{ active: eventDateValue === option.value }"
                @click="eventDateValue = option.value"
              >
                <span>{{ option.weekday }}</span>
                <strong>{{ option.day }}</strong>
                <small>{{ option.month }}</small>
              </button>
            </div>
            <div class="event-time-row">
              <label>
                <i class="far fa-calendar"></i>
                <input v-model="eventDateValue" type="date" />
              </label>
              <label>
                <i class="far fa-clock"></i>
                <input v-model="eventTimeValue" type="time" />
              </label>
            </div>
            <select v-model="eventDraft.type">
              <option>Evento</option>
              <option>Live</option>
              <option>Podcast</option>
              <option>Lanzamiento post</option>
            </select>
            <textarea v-model="eventDraft.description" placeholder="Descripcion corta opcional"></textarea>
            <input v-model="eventDraft.url" placeholder="Link opcional" />
            <div class="event-form-actions" :class="{ single: !editingEventId }">
              <button v-if="editingEventId" type="button" class="event-secondary-btn" @click="resetGalaxyEventDraft">
                Nuevo
              </button>
              <button type="submit" :disabled="!eventDraft.title.trim() || !eventDraft.startsAt">
                <i class="fas fa-calendar-plus"></i>
                {{ editingEventId ? 'Guardar cambios' : 'Crear evento' }}
              </button>
            </div>
          </form>

          <div class="event-manager-list">
            <strong>Eventos activos</strong>
            <article v-for="event in upcomingEvents" :key="`manager-${event.id}`" class="event-manager-row">
              <div>
                <span>{{ event.type || 'Evento' }}</span>
                <h3>{{ event.title }}</h3>
                <small>{{ formatEventDate(event.startsAt) }}</small>
              </div>
              <div>
                <button type="button" @click="editGalaxyEvent(event)">
                  <i class="fas fa-pen"></i>
                </button>
                <button type="button" class="danger" @click="deleteGalaxyEvent(event)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </article>
            <p v-if="!upcomingEvents.length" class="event-manager-empty">Todavia no hay eventos.</p>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="liveGoalManagerOpen" class="confirm-modal event-manager-modal">
        <div class="confirm-backdrop" @click="closeLiveGoalManager"></div>

        <section class="event-manager-card live-goal-manager-card">
          <button class="profile-view-close" type="button" aria-label="Cerrar metas" @click="closeLiveGoalManager">
            <i class="fas fa-xmark"></i>
          </button>

          <div class="event-manager-head">
            <span><i class="fas fa-trophy"></i> Live oficial</span>
            <h2>Crear meta o mision</h2>
          </div>

          <form class="event-admin-form live-goal-admin-form" @submit.prevent="saveLiveGoal">
            <select v-model="liveGoalDraft.type">
              <option value="likes">Meta de likes</option>
              <option value="mission">Mision con checklist</option>
            </select>
            <input v-model="liveGoalDraft.title" placeholder="Ej: 5000 likes o Buscar a Pikachu" />
            <textarea v-model="liveGoalDraft.description" placeholder="Descripcion corta opcional"></textarea>
            <input
              v-if="liveGoalDraft.type === 'likes'"
              v-model.number="liveGoalDraft.target"
              type="number"
              min="1"
              placeholder="Meta de likes"
            />
            <textarea
              v-else
              v-model="liveGoalDraft.checklistText"
              placeholder="Un paso por linea. Ej: Entrar al bosque&#10;Encontrar a Pikachu&#10;Completar captura"
            ></textarea>
            <button type="submit" :disabled="isSavingLiveGoal || !liveGoalDraft.title.trim()">
              <i class="fas fa-sparkles"></i>
              {{ isSavingLiveGoal ? 'Guardando...' : 'Crear' }}
            </button>
          </form>
        </section>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="confirmDialog.show" class="confirm-modal">
        <div class="confirm-backdrop" @click="closeConfirm"></div>

        <div class="confirm-card">
          <div class="confirm-icon">
            <i class="fas fa-trash-alt"></i>
          </div>

          <h2>{{ confirmDialog.title }}</h2>
          <p>{{ confirmDialog.message }}</p>

          <div class="confirm-actions">
            <button class="confirm-cancel" :disabled="isDeleting" @click="closeConfirm">
              Cancelar
            </button>
            <button class="confirm-delete" :disabled="isDeleting" @click="confirmDialog.action">
              {{ isDeleting ? 'Eliminando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <CommunityMediaTheater
      v-model:video-chat-draft="videoChatDraft"
      :open="mediaTheaterOpen"
      :youtube-stage-title="youtubeStageTitle"
      :youtube-stage-embed-url="youtubeStageEmbedUrl"
      :current-live-goal="currentLiveGoal"
      :video-discussion-title="videoDiscussionTitle"
      :video-discussion-subtitle="videoDiscussionSubtitle"
      :active-video-second="activeVideoSecond"
      :visible-video-chat-messages="visibleVideoChatMessages"
      :featured-youtube-video="featuredYoutubeVideo"
      :featured-video-is-live="featuredVideoIsLive"
      :video-discussion-placeholder="videoDiscussionPlaceholder"
      :format-video-chat-time="formatVideoChatTime"
      :avatar-initial="avatarInitial"
      :has-liked-video-message="hasLikedVideoMessage"
      :can-delete-video-message="canDeleteVideoMessage"
      @close="closeVideoTheater"
      @toggle-live-goal="toggleLiveGoalExpanded"
      @like-message="toggleVideoMessageLike"
      @delete-message="deleteVideoMessage"
      @send-message="sendVideoChatMessage"
    />

    <Transition name="fade">
      <div v-if="selectedProfile" class="profile-view-modal">
        <div class="confirm-backdrop" @click="closeUserProfile"></div>

        <div class="profile-view-card">
          <button class="profile-view-close" type="button" aria-label="Cerrar perfil" @click="closeUserProfile">
            <i class="fas fa-xmark"></i>
          </button>

          <div class="profile-view-head">
            <div class="profile-view-avatar">
              <img v-if="selectedProfile.imageUrl" :src="selectedProfile.imageUrl" alt="" />
              <span v-else>{{ avatarInitial(selectedProfile.name) }}</span>
            </div>

            <div>
              <h2>{{ selectedProfile.name }}</h2>
              <p>{{ selectedProfile.description || 'Miembro de la comunidad' }}</p>
            </div>
          </div>

          <div class="profile-view-stats">
            <span>
              <strong>{{ selectedProfile.threads.length }}</strong>
              Hilos
            </span>
            <span>
              <strong>{{ selectedProfile.posts.length }}</strong>
              Blogs
            </span>
            <span>
              <strong>{{ selectedProfile.favorites.length }}</strong>
              Favoritos
            </span>
          </div>

          <div v-if="isProfileLoading" class="profile-view-empty">
            Cargando perfil...
          </div>

          <div v-else class="profile-view-sections">
            <section>
              <h3>Hilos recientes</h3>
              <div v-if="selectedProfile.threads.length" class="profile-link-list">
                <button
                  v-for="thread in selectedProfile.threads"
                  :key="thread.id"
                  type="button"
                  @click="openThreadId = thread.id; closeUserProfile()"
                >
                  <strong>{{ thread.title }}</strong>
                  <span>{{ thread.topic }} - {{ formatAgo(thread.createdAt) }}</span>
                </button>
              </div>
              <p v-else class="profile-view-empty">Todavia no tiene hilos.</p>
            </section>

            <section>
              <h3>Blogs publicados</h3>
              <div v-if="selectedProfile.posts.length" class="profile-link-list">
                <button
                  v-for="post in selectedProfile.posts"
                  :key="post.id"
                  type="button"
                  @click="openPost(post.id)"
                >
                  <strong>{{ post.title }}</strong>
                  <span>{{ post.category || 'General' }}</span>
                </button>
              </div>
              <p v-else class="profile-view-empty">Sin blogs publicados.</p>
            </section>

            <section>
              <h3>Favoritos</h3>
              <div v-if="selectedProfile.favorites.length" class="profile-link-list">
                <button
                  v-for="favorite in selectedProfile.favorites"
                  :key="favorite.postId || favorite.id"
                  type="button"
                  @click="openPost(favorite.postId || favorite.id)"
                >
                  <strong>{{ favorite.title }}</strong>
                  <span>{{ favorite.category || 'General' }}</span>
                </button>
              </div>
              <p v-else class="profile-view-empty">Sin favoritos visibles.</p>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.community-panel {
  display: grid;
  gap: 18px;
  min-height: 100%;
  overflow-x: clip;
  padding-bottom: 0;
  width: 100%;
}

.composer {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.composer {
  display: grid;
  gap: 14px;
  grid-template-columns: 58px minmax(0, 1fr);
  margin-bottom: 18px;
  padding: 22px;
}

.composer-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 18px;
  color: #ffffff;
  display: flex;
  font-weight: 900;
  height: 58px;
  justify-content: center;
  width: 58px;
}

.composer-avatar {
  overflow: hidden;
}

.composer-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.composer-body textarea {
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  color: #111827;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.45;
  min-height: 102px;
  outline: none;
  padding: 14px;
  resize: vertical;
  width: 100%;
}

.composer-body textarea::placeholder {
  color: #94a3b8;
}

.composer-actions {
  align-items: center;
  display: flex;
  gap: 10px;
  padding-top: 0;
}

.composer-actions select {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
  height: 36px;
  padding: 0 10px;
}

.composer-actions span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 900;
  margin-left: auto;
}

.composer-actions button {
  align-items: center;
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 10px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  text-transform: uppercase;
}

.composer-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.community-stage {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  max-width: 100%;
  overflow: hidden;
}

.composer-body textarea:focus {
  border-color: rgba(168, 85, 247, 0.55);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.community-main-column {
  min-width: 0;
}

.community-empty {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  padding: 28px 18px;
  text-align: center;
}

.confirm-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.profile-view-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.confirm-backdrop {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(16px);
  inset: 0;
  position: absolute;
}

.confirm-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  max-width: 360px;
  padding: 24px;
  position: relative;
  text-align: center;
  width: 100%;
}

.profile-view-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  max-height: min(760px, calc(100dvh - 36px));
  max-width: 620px;
  overflow-y: auto;
  padding: 22px;
  position: relative;
  width: 100%;
}

.profile-view-close {
  align-items: center;
  background: #f1f5f9;
  border-radius: 999px;
  color: #64748b;
  display: flex;
  height: 34px;
  justify-content: center;
  position: absolute;
  right: 16px;
  top: 16px;
  width: 34px;
}

.profile-view-head {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: 72px minmax(0, 1fr);
  padding-right: 44px;
}

.profile-view-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 18px;
  color: #ffffff;
  display: flex;
  font-size: 22px;
  font-weight: 900;
  height: 72px;
  justify-content: center;
  overflow: hidden;
  width: 72px;
}

.profile-view-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.profile-view-head h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 900;
}

.profile-view-head p {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  margin-top: 4px;
}

.profile-view-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 18px;
}

.profile-view-stats span {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #64748b;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 2px;
  padding: 12px;
  text-align: center;
  text-transform: uppercase;
}

.profile-view-stats strong {
  color: #111827;
  font-size: 18px;
}

.profile-view-sections {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.profile-view-sections h3 {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.profile-link-list {
  display: grid;
  gap: 8px;
}

.profile-link-list button {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 4px;
  padding: 11px 12px;
  text-align: left;
}

.profile-link-list strong {
  color: #111827;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.3;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.profile-link-list span,
.profile-view-empty {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
}

.profile-view-empty {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.confirm-icon {
  align-items: center;
  background: #fff1f2;
  border-radius: 999px;
  color: #e11d48;
  display: flex;
  height: 48px;
  justify-content: center;
  margin: 0 auto 14px;
  width: 48px;
}

.confirm-card h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.confirm-card p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  margin-top: 6px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.confirm-cancel,
.confirm-delete {
  border-radius: 12px;
  flex: 1;
  font-size: 12px;
  font-weight: 900;
  padding: 11px;
  text-transform: uppercase;
}

.confirm-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.confirm-delete {
  background: #e11d48;
  color: #ffffff;
}

.confirm-cancel:disabled,
.confirm-delete:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (max-width: 980px) {
  .community-stage {
    grid-template-columns: 1fr;
  }

  .galaxy-hero {
    grid-template-columns: clamp(82px, 18vw, 118px) minmax(0, 1fr);
  }

  .galaxy-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (min-width: 781px) and (max-width: 1420px) {
  .community-stage {
    grid-template-columns: minmax(0, 1fr) minmax(270px, 300px);
  }

  .community-switcher-shell {
    bottom: calc(72px + env(safe-area-inset-bottom));
    left: 10px;
    margin: 0;
    position: fixed;
    right: 10px;
    top: auto;
    transform: none;
    width: auto;
    z-index: 64;
  }

  .community-switcher-shell :deep(.community-rail-nav) {
    margin: 0 auto;
  }
}

@media (max-width: 620px) {
  .composer {
    grid-template-columns: 1fr;
  }

  .composer {
    gap: 10px;
    padding: 14px;
  }

  .miiverse-composer {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .miiverse-composer .composer-avatar {
    border-radius: 14px;
    height: 42px;
    width: 42px;
  }

  .miiverse-composer .composer-body textarea {
    font-size: 14px;
    min-height: 86px;
    padding-top: 4px;
  }

  .profile-view-modal {
    align-items: stretch;
    padding: 12px;
  }

  .profile-view-card {
    border-radius: 18px;
    max-height: calc(100dvh - 24px);
    padding: 18px;
  }

  .profile-view-head {
    grid-template-columns: 56px minmax(0, 1fr);
    padding-right: 38px;
  }

  .profile-view-avatar {
    border-radius: 14px;
    font-size: 18px;
    height: 56px;
    width: 56px;
  }

  .profile-view-head h2 {
    font-size: 17px;
  }

  .profile-view-stats {
    grid-template-columns: 1fr;
  }

  .composer-actions {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .composer-actions span {
    margin-left: 0;
  }

  .galaxy-hero {
    align-items: start;
    background:
      linear-gradient(180deg, rgba(7, 10, 22, 0.42), rgba(7, 10, 22, 0.92) 54%),
      var(--community-banner) center top / cover;
    gap: 14px;
    grid-template-columns: 74px minmax(0, 1fr);
    min-height: 0;
    padding: 18px;
  }

  .galaxy-icon {
    border-radius: 18px;
    height: 74px;
    width: 74px;
  }

  .galaxy-copy h1 {
    font-size: clamp(24px, 10vw, 34px);
  }

  .galaxy-copy p {
    font-size: 13px;
  }

  .galaxy-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .galaxy-actions button {
    justify-content: center;
    width: 100%;
  }
}

.community-panel {
  background: #f8fafc;
  padding-bottom: 82px;
}

.community-editor-topbar span {
  color: #7c3aed;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0;
  text-transform: uppercase;
}

.community-editor-actions button:last-child {
  align-items: center;
  background: #7c3aed;
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
}

.community-editor-modal {
  align-items: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(16px);
  display: flex;
  inset: 0;
  justify-content: center;
  min-height: 100dvh;
  overflow: hidden;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.community-editor-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.26);
  display: grid;
  gap: 18px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: calc(100dvh - 36px);
  max-width: 920px;
  min-height: min(700px, calc(100dvh - 36px));
  overflow: hidden;
  padding: 18px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.community-editor-topbar {
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  padding-bottom: 14px;
}

.community-editor-topbar h2 {
  color: #111827;
  font-size: 22px;
  font-weight: 950;
}

.community-editor-topbar > button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #64748b;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.community-editor-layout {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 320px;
  min-height: 0;
  overflow-y: auto;
}

.community-editor-fields {
  display: grid;
  gap: 12px;
}

.community-editor-fields label {
  color: #334155;
  display: grid;
  font-size: 11px;
  font-weight: 950;
  gap: 6px;
  text-transform: uppercase;
}

.community-editor-fields input {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  min-height: 46px;
  outline: none;
  padding: 0 14px;
}

.community-editor-fields input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px #f3e8ff;
}

.community-topic-editor {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.community-topic-editor-head,
.community-topic-add,
.community-topic-row {
  align-items: center;
  display: grid;
  gap: 8px;
}

.community-topic-editor-head {
  grid-template-columns: minmax(0, 1fr) auto;
}

.community-topic-editor-head strong {
  color: #111827;
  font-size: 12px;
  font-weight: 950;
}

.community-topic-editor-head span {
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  font-size: 10px;
  font-weight: 950;
  padding: 4px 8px;
}

.community-topic-list {
  display: grid;
  gap: 8px;
}

.community-topic-row {
  grid-template-columns: 32px minmax(0, 1fr) 36px;
  margin: 0;
}

.community-topic-row i {
  color: #9333ea;
  text-align: center;
}

.community-topic-row button,
.community-topic-add button {
  align-items: center;
  border-radius: 10px;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 38px;
}

.community-topic-row button {
  background: #fff1f2;
  color: #e11d48;
}

.community-topic-add {
  grid-template-columns: minmax(0, 1fr) auto;
}

.community-topic-add button {
  background: #7c3aed;
  color: #ffffff;
  padding: 0 12px;
}

.community-topic-row button:disabled,
.community-topic-add button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.community-editor-preview {
  align-content: start;
  background: #0b1020;
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  overflow: hidden;
  padding: 12px;
}

.community-banner-preview {
  aspect-ratio: 16 / 7;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  margin: 0;
  overflow: hidden;
}

.community-icon-preview {
  align-items: center;
  background: #ffffff;
  border: 3px solid #0b1020;
  border-radius: 18px;
  display: flex;
  height: 74px;
  justify-content: center;
  margin: -42px 0 0 14px;
  overflow: hidden;
  width: 74px;
}

.community-banner-preview img,
.community-icon-preview img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-banner-preview span,
.community-icon-preview span {
  align-items: center;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  height: 100%;
  justify-content: center;
  text-transform: uppercase;
}

.community-icon-preview span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  width: 100%;
}

.community-editor-preview strong {
  color: #ffffff;
  font-size: 18px;
  font-weight: 950;
}

.community-editor-preview p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.community-editor-preview small {
  color: #c084fc;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.community-topic-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 4px;
}

.community-topic-preview span {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #e9d5ff;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  gap: 6px;
  min-height: 28px;
  padding: 0 9px;
}

.community-editor-actions {
  background: #ffffff;
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 14px;
}

.community-editor-actions .secondary-admin-action {
  background: #f1f5f9;
  border-radius: 12px;
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  min-height: 42px;
  padding: 0 16px;
}

.community-editor-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.community-switcher-shell {
  align-items: center;
  bottom: auto;
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
  left: max(18px, calc((100vw - 1500px) / 2 - 238px));
  margin: 0;
  position: fixed;
  top: calc(var(--public-nav-offset, 72px) + 20px);
  transform: none;
  width: 220px;
  z-index: 64;
}

.community-rail-dots {
  align-items: center;
  background: rgba(8, 12, 30, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  display: inline-flex;
  gap: 6px;
  padding: 6px 8px;
}

.community-rail-dots button {
  background: rgba(203, 213, 225, 0.42);
  border-radius: 999px;
  height: 7px;
  transition: background 0.2s ease, transform 0.2s ease, width 0.2s ease;
  width: 7px;
}

.community-rail-dots button.active {
  background: #c084fc;
  transform: scale(1.05);
  width: 18px;
}

.community-rail-card {
  align-items: stretch;
  backdrop-filter: blur(18px);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 28px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
  min-width: 0;
  max-width: 220px;
  padding: 10px;
  width: 100%;
}

.community-rail-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 32px;
}

.community-rail-head h2 {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.community-rail-controls {
  display: inline-flex;
  gap: 6px;
}

.community-rail-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.community-rail-controls button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #7c3aed;
  display: flex;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.discover-more-btn {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border: 1px solid rgba(216, 180, 254, 0.6);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: flex-start;
  min-height: 50px;
  padding: 0 14px;
  white-space: nowrap;
  width: 100%;
}

.discover-more-btn i {
  color: #ffffff;
}

.rail-create-btn {
  align-items: center;
  background: #111827;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: flex-start;
  min-height: 50px;
  padding: 0 14px;
  white-space: nowrap;
  width: 100%;
}

.community-switcher {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: calc(100dvh - 300px);
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 2px;
  scrollbar-width: none;
  scroll-snap-type: y proximity;
}

.community-switcher::-webkit-scrollbar {
  display: none;
}

.community-switcher button {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  color: #334155;
  display: inline-grid;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 50px;
  padding: 4px 12px 4px 4px;
  scroll-snap-align: start;
  width: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.community-switcher button:hover {
  transform: translateX(2px);
}

.community-switcher button.active {
  background: #111827;
  border-color: rgba(17, 24, 39, 0.1);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
  color: #7c3aed;
}

.community-switcher button.active strong {
  color: #ffffff;
}

.community-switcher button.joined:not(.active) {
  border-color: transparent;
  box-shadow: none;
}

.community-rail-empty {
  align-items: center;
  background: #f8fafc;
  border: 1px dashed #d8b4fe;
  border-radius: 14px;
  color: #64748b;
  display: flex;
  font-size: 12px;
  font-weight: 850;
  min-height: 56px;
  padding: 0 12px;
}

.discover-modal {
  align-items: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(16px);
  display: flex;
  inset: 0;
  justify-content: center;
  min-height: 100dvh;
  overflow: hidden;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.discover-card {
  align-content: start;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.26);
  display: grid;
  gap: 14px;
  max-height: calc(100dvh - 36px);
  max-width: 720px;
  overflow: hidden;
  padding: 18px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.discover-head {
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  padding-bottom: 12px;
}

.discover-head span {
  color: #7c3aed;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.discover-head h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
}

.discover-head > button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #64748b;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.discover-search {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #7c3aed;
  display: grid;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr);
  min-height: 46px;
  padding: 0 14px;
}

.discover-search input {
  background: transparent;
  color: #111827;
  font-size: 13px;
  font-weight: 850;
  min-width: 0;
  outline: none;
}

.discover-grid {
  align-content: start;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 0;
  overflow-y: auto;
}

.discover-mini-card {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: grid;
  gap: 10px;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  min-height: 64px;
  padding: 10px;
}

.discover-mini-card img,
.discover-mini-card > span {
  border-radius: 12px;
  height: 44px;
  width: 44px;
}

.discover-mini-card img {
  object-fit: cover;
}

.discover-mini-card > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  justify-content: center;
}

.discover-mini-card strong {
  color: #111827;
  display: block;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discover-mini-card small {
  color: #64748b;
  display: block;
  font-size: 10px;
  font-weight: 850;
  margin-top: 2px;
}

.discover-mini-card button {
  background: #ffffff;
  border: 1px solid #ddd6fe;
  border-radius: 11px;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
  min-height: 34px;
  padding: 0 12px;
}

.discover-empty {
  background: #f8fafc;
  border: 1px dashed #d8b4fe;
  border-radius: 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
  padding: 18px;
  text-align: center;
}

.community-switcher img,
.community-switcher span,
.galaxy-icon span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-weight: 950;
  justify-content: center;
}

.community-switcher img,
.community-switcher span {
  border-radius: 999px;
  height: 42px;
  object-fit: cover;
  width: 42px;
}

.galaxy-hero {
  align-items: end;
  background:
    linear-gradient(90deg, rgba(7, 10, 22, 0.9), rgba(7, 10, 22, 0.48) 48%, rgba(7, 10, 22, 0.18)),
    var(--community-banner) center / cover;
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: clamp(14px, 2.4vw, 24px);
  grid-template-columns: clamp(82px, 11vw, 124px) minmax(0, 1fr) minmax(132px, auto);
  min-height: clamp(210px, 24vw, 290px);
  overflow: hidden;
  padding: clamp(18px, 3vw, 30px);
  position: relative;
}

.galaxy-hero::before {
  background:
    radial-gradient(circle at 12% 18%, rgba(168, 85, 247, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.08), rgba(2, 6, 23, 0.34));
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.galaxy-hero > * {
  position: relative;
  z-index: 1;
}

.galaxy-icon {
  align-self: center;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 20px;
  height: clamp(82px, 11vw, 124px);
  overflow: hidden;
  width: clamp(82px, 11vw, 124px);
}

.galaxy-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.galaxy-icon span {
  height: 100%;
  width: 100%;
}

.galaxy-copy span {
  color: #ddd6fe;
  display: block;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.galaxy-copy h1 {
  align-items: center;
  color: #ffffff;
  display: flex;
  flex-wrap: wrap;
  font-size: clamp(30px, 3.7vw, 48px);
  font-weight: 950;
  gap: 10px;
  line-height: 1;
  margin-top: 8px;
}

.galaxy-copy h1 i {
  color: #6366f1;
  font-size: 22px;
}

.galaxy-copy p {
  color: #f8fafc;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.5;
  margin-top: 8px;
  max-width: 640px;
}

.galaxy-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 18px;
}

.galaxy-stats span {
  align-items: center;
  color: #e5e7eb;
  display: grid;
  font-size: 11px;
  font-weight: 800;
  gap: 0 8px;
  grid-template-columns: 18px auto;
}

.galaxy-stats i {
  color: #ffffff;
  grid-row: span 2;
}

.galaxy-stats strong {
  color: #ffffff;
  font-size: 15px;
  font-weight: 950;
}

.galaxy-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  min-width: 0;
  flex-wrap: wrap;
}

.galaxy-actions button {
  align-items: center;
  background: linear-gradient(90deg, #7c3aed, #c026d3);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  min-height: 44px;
  padding: 0 22px;
  white-space: nowrap;
}

.galaxy-actions button:disabled {
  cursor: default;
  opacity: 0.82;
}

.galaxy-actions button.joined {
  background: linear-gradient(90deg, #4338ca, #7c3aed);
}

.galaxy-actions .admin-action {
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.galaxy-actions .admin-danger {
  background: rgba(225, 29, 72, 0.92);
}

.miiverse-composer {
  background:
    linear-gradient(135deg, rgba(12, 16, 38, 0.94), rgba(20, 14, 44, 0.9)) !important;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.24);
  display: block;
  margin-bottom: 18px;
  overflow: hidden;
  padding: 16px;
}

.miiverse-composer .composer-body {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.composer-input-row {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: 54px minmax(0, 1fr);
}

.miiverse-composer .composer-avatar {
  border-radius: 18px;
  height: 54px;
  width: 54px;
}

.miiverse-composer .composer-body textarea {
  background: transparent;
  border: 0;
  border-radius: 0;
  color: #f8fafc;
  font-size: 19px;
  font-weight: 850;
  min-height: 116px;
  padding: 6px 4px;
}

.miiverse-composer .composer-body textarea::placeholder {
  color: #aeb8d3;
}

.miiverse-composer .composer-body textarea:focus {
  box-shadow: none;
}

.composer-image-tools {
  align-items: center;
  display: flex;
  gap: 10px;
  margin: 4px 0 14px;
  min-height: 42px;
}

.paste-image-btn,
.clear-image-btn {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #475569;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
}

.paste-image-btn:hover,
.clear-image-btn:hover {
  border-color: #c084fc;
  color: #7c3aed;
}

.clear-image-btn {
  flex: 0 0 42px;
  justify-content: center;
  padding: 0;
}

.composer-image-preview {
  margin: 0 0 0 66px;
  overflow: hidden;
  position: relative;
}

.composer-image-preview img {
  aspect-ratio: 16 / 8;
  background: #e5e7eb;
  border-radius: 14px;
  object-fit: cover;
  width: min(520px, 100%);
}

.composer-image-preview button {
  align-items: center;
  background: rgba(8, 12, 30, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  position: absolute;
  right: 10px;
  top: 10px;
  width: 34px;
}

.miiverse-composer .composer-actions {
  align-items: center;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-left: 66px;
  padding-top: 12px;
}

.composer-topic-select {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: #c084fc;
  display: inline-flex;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
}

.composer-topic-select select {
  appearance: none;
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 950;
  height: 38px;
  outline: 0;
  padding: 0 16px 0 0;
}

.composer-topic-select option {
  background: #0b1020;
  color: #f8fafc;
}

.composer-tool-row,
.composer-submit-row {
  align-items: center;
  display: flex;
  gap: 8px;
}

.composer-tool-row {
  flex-wrap: wrap;
}

.composer-submit-row {
  justify-content: flex-end;
}

.composer-submit-row > span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 950;
}

.miiverse-composer .composer-actions span {
  margin-left: 0;
}

.miiverse-composer .composer-actions button {
  background: rgba(8, 12, 30, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: #d8ddeb;
  height: 40px;
  padding: 0 13px;
  text-transform: none;
}

.miiverse-composer .composer-actions button.active {
  background: rgba(168, 85, 247, 0.2);
  border-color: rgba(192, 132, 252, 0.5);
  color: #f5d0fe;
}

.miiverse-composer .composer-actions .publish-btn {
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-color: transparent;
  color: #ffffff;
  min-width: 118px;
  text-transform: uppercase;
}

.event-admin-form {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.live-goal-admin-form {
  grid-template-columns: 1fr;
}

.event-admin-form input,
.event-admin-form select,
.event-admin-form textarea {
  background: rgba(8, 12, 30, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 800;
  min-height: 40px;
  outline: 0;
  padding: 0 12px;
}

.event-date-picker {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-top: 12px;
}

.event-date-picker button {
  background: rgba(8, 12, 30, 0.66);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #f8fafc;
  display: grid;
  gap: 2px;
  justify-items: center;
  min-height: 74px;
  padding: 8px 4px;
}

.event-date-picker button.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.82), rgba(236, 72, 153, 0.72));
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 14px 34px rgba(124, 58, 237, 0.28);
}

.event-date-picker span,
.event-date-picker small {
  color: #c4b5fd;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.event-date-picker strong {
  color: #ffffff;
  font-size: 20px;
  font-weight: 950;
}

.event-time-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 160px;
}

.event-time-row label {
  align-items: center;
  background: rgba(8, 12, 30, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr);
  min-height: 44px;
  padding: 0 12px;
}

.event-time-row i {
  color: #c084fc;
}

.event-time-row input {
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 13px;
  font-weight: 900;
  min-height: 42px;
  padding: 0;
}

.event-admin-form textarea {
  min-height: 72px;
  padding: 10px 12px;
  resize: vertical;
}

.event-admin-form button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 42px;
}

.event-admin-form button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.event-manager-modal {
  z-index: 2100;
}

.event-manager-card {
  background:
    linear-gradient(145deg, rgba(11, 16, 38, 0.98), rgba(24, 16, 50, 0.98));
  border: 1px solid rgba(216, 180, 254, 0.24);
  border-radius: 22px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
  color: #f8fafc;
  display: grid;
  gap: 16px;
  max-height: min(760px, calc(100dvh - 36px));
  max-width: 720px;
  overflow-y: auto;
  padding: 22px;
  position: relative;
  width: 100%;
}

.event-manager-head {
  padding-right: 42px;
}

.event-manager-head span {
  color: #c084fc;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 8px;
  text-transform: uppercase;
}

.event-manager-head h2 {
  color: #ffffff;
  font-size: 22px;
  font-weight: 950;
  margin-top: 5px;
}

.event-form-actions {
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
}

.event-form-actions.single {
  grid-template-columns: 1fr;
}

.event-form-actions .event-secondary-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.event-manager-list {
  display: grid;
  gap: 10px;
}

.event-manager-list > strong {
  color: #e9d5ff;
  font-size: 13px;
  font-weight: 950;
}

.event-manager-row {
  align-items: center;
  background: rgba(8, 12, 30, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 12px;
}

.event-manager-row span {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.event-manager-row h3 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.25;
  margin-top: 2px;
  overflow-wrap: anywhere;
}

.event-manager-row small,
.event-manager-empty {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.event-manager-row > div:last-child {
  display: flex;
  gap: 8px;
}

.event-manager-row button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.event-manager-row button.danger {
  color: #fecaca;
}

.setup-only {
  background: #111827;
  color: #ffffff;
}

.setup-only h2,
.setup-only p {
  color: #ffffff;
}

@media (max-width: 780px) {
  .miiverse-composer {
    display: none;
  }

  .event-date-picker {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .event-time-row {
    grid-template-columns: 1fr;
  }

  .community-panel {
    padding-bottom: calc(78px + env(safe-area-inset-bottom));
  }

  .community-switcher-shell {
    bottom: calc(72px + env(safe-area-inset-bottom));
    left: 10px;
    margin: 0;
    position: fixed;
    right: 10px;
    top: auto;
    transform: none;
    width: auto;
    z-index: 64;
  }

  .community-rail-card {
    background: rgba(15, 23, 42, 0.88);
    border-color: rgba(255, 255, 255, 0.16);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
    flex-direction: row;
    justify-content: flex-start;
    margin: 0 auto;
    max-width: min(100%, 430px);
    padding: 6px;
    width: 100%;
  }

  .fixed-communities {
    flex: 1 1 auto;
    flex-direction: row;
    gap: 6px;
    max-width: none;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .fixed-communities button {
    aspect-ratio: 1;
    border-radius: 999px;
    grid-template-columns: 1fr;
    min-height: 46px;
    padding: 5px;
    width: 46px;
  }

  .fixed-communities button strong {
    display: none;
  }

  .fixed-communities img,
  .fixed-communities span {
    border-radius: 999px;
    height: 34px;
    width: 34px;
  }

  .discover-more-btn {
    flex: 0 0 46px;
    height: 46px;
    justify-content: center;
    min-height: 46px;
    padding: 0;
    width: 46px;
  }

  .rail-create-btn {
    display: none;
  }

  .discover-more-btn span {
    display: none;
  }

  .discover-modal {
    align-items: center;
    padding: 16px;
  }

  .discover-card {
    border-radius: 18px;
    gap: 12px;
    grid-template-rows: auto auto minmax(0, 1fr);
    height: auto;
    max-height: calc(100svh - 32px);
    padding: 14px;
    width: min(100%, 720px);
  }

  .discover-head {
    padding-bottom: 10px;
  }

  .discover-head h2 {
    font-size: 18px;
    line-height: 1.1;
  }

  .discover-head > button {
    border-radius: 999px;
    height: 38px;
    width: 38px;
  }

  .discover-search {
    border-radius: 13px;
    min-height: 44px;
  }

  .discover-mini-card {
    border-radius: 14px;
    min-height: 68px;
  }

  .discover-grid {
    align-content: start;
    gap: 10px;
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .community-editor-modal {
    align-items: center;
    padding: 16px;
  }

  .community-editor-card {
    border-radius: 18px;
    gap: 10px;
    height: auto;
    max-height: calc(100svh - 32px);
    min-height: 0;
    padding: 12px;
    width: min(100%, 920px);
  }

  .community-editor-topbar {
    padding-bottom: 10px;
  }

  .community-editor-topbar h2 {
    font-size: 18px;
    line-height: 1.1;
  }

  .community-editor-topbar > button {
    border-radius: 999px;
    height: 38px;
    width: 38px;
  }

  .community-editor-layout {
    gap: 10px;
    grid-template-columns: 1fr;
    overflow-y: auto;
    padding: 0 2px;
  }

  .community-editor-preview {
    order: -1;
    border-radius: 14px;
    gap: 8px;
    padding: 10px;
  }

  .community-banner-preview {
    aspect-ratio: 16 / 5.8;
    border-radius: 12px;
  }

  .community-icon-preview {
    border-radius: 14px;
    height: 58px;
    margin: -32px 0 0 12px;
    width: 58px;
  }

  .community-editor-preview strong {
    font-size: 16px;
  }

  .community-editor-preview p {
    font-size: 11px;
    line-height: 1.35;
  }

  .community-editor-fields {
    gap: 10px;
  }

  .community-editor-fields input {
    border-radius: 12px;
    min-height: 42px;
  }

  .community-editor-actions {
    background: #ffffff;
    display: grid;
    grid-template-columns: 1fr;
    margin: 0 -12px max(-12px, calc(env(safe-area-inset-bottom) * -1));
    padding: 10px 12px max(10px, env(safe-area-inset-bottom));
  }

  .galaxy-hero {
    align-items: start;
    grid-template-columns: 92px minmax(0, 1fr);
    min-height: 300px;
    padding: 22px 16px;
  }

  .galaxy-icon {
    height: 92px;
    width: 92px;
  }

  .galaxy-actions {
    grid-column: 1 / -1;
    width: 100%;
  }

  .galaxy-actions button:first-child {
    flex: 1;
    justify-content: center;
  }

  .miiverse-composer .composer-actions {
    display: grid;
    grid-template-columns: 1fr;
    margin-left: 0;
  }

  .miiverse-composer .composer-actions button {
    font-size: 12px;
    justify-content: center;
  }

  .miiverse-composer .composer-actions button i {
    font-size: 13px;
  }

  .miiverse-composer .composer-actions span,
  .miiverse-composer .composer-actions .publish-btn {
    grid-column: auto;
  }

  .composer-input-row {
    grid-template-columns: 46px minmax(0, 1fr);
  }

  .miiverse-composer .composer-avatar {
    height: 46px;
    width: 46px;
  }

  .composer-image-preview {
    margin-left: 0;
  }

  .composer-topic-select,
  .composer-tool-row,
  .composer-submit-row {
    width: 100%;
  }

  .composer-tool-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .composer-tool-row .composer-tool {
    padding: 0;
  }

  .composer-tool-row .composer-tool span {
    display: none;
  }
}

@media (max-width: 980px) {
  .galaxy-hero {
    grid-template-columns: clamp(82px, 18vw, 118px) minmax(0, 1fr);
  }

  .galaxy-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .galaxy-hero {
    align-items: start;
    background:
      linear-gradient(180deg, rgba(7, 10, 22, 0.42), rgba(7, 10, 22, 0.92) 54%),
      var(--community-banner) center top / cover;
    gap: 14px;
    grid-template-columns: 74px minmax(0, 1fr);
    min-height: 0;
    padding: 18px;
  }

  .galaxy-icon {
    border-radius: 18px;
    height: 74px;
    width: 74px;
  }

  .galaxy-copy h1 {
    font-size: clamp(24px, 10vw, 34px);
  }

  .galaxy-copy p {
    font-size: 13px;
  }

  .galaxy-stats {
    gap: 8px;
    grid-column: 1 / -1;
  }

  .galaxy-stats span {
    background: rgba(8, 12, 30, 0.52);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    flex: 1 1 92px;
    padding: 8px;
  }

  .galaxy-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .galaxy-actions button,
  .galaxy-actions button:first-child {
    justify-content: center;
    width: 100%;
  }
}
</style>
