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
import CommunityRailNav from '@/features/public/components/CommunityRailNav.vue'
import ThreadComposer from '@/features/public/components/ThreadComposer.vue'

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
const defaultThreadTopics = ['Posts', 'Fanarts', 'Guias', 'Trucos', 'Preguntas', 'Clips', 'Eventos']
const contentTabIcons = {
  Inicio: 'far fa-comment',
  Hilos: 'fas fa-feather',
  Posts: 'far fa-comment',
  Fanarts: 'fas fa-pen-nib',
  Guias: 'far fa-book-open',
  Trucos: 'far fa-lightbulb',
  Preguntas: 'far fa-circle-question',
  Clips: 'fas fa-clapperboard',
  Eventos: 'far fa-calendar',
  'Acerca de': 'fas fa-circle-info'
}
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
const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'
const officialCommunity = {
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera Oficial',
  description: 'Comunicados, lives, eventos y lanzamientos importantes de Galaxia Nintendera.',
  bannerUrl: '/src/iconos/Banner.png',
  iconUrl: '/src/iconos/logo.png',
  membersCount: 0,
  isOfficial: true,
  lockedMembership: true,
  adminOnlyThreads: true,
  threadTopics: [...defaultThreadTopics],
  createdAt: 0,
  updatedAt: 0
}
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
        <section v-if="selectedCommunity" class="galaxy-hero" :style="{ '--community-banner': selectedCommunity.bannerUrl ? `url(${selectedCommunity.bannerUrl})` : `url('/src/iconos/Banner.png')` }">
          <div class="galaxy-icon">
            <img v-if="selectedCommunity.iconUrl" :src="selectedCommunity.iconUrl" alt="" />
            <span v-else>{{ selectedCommunity.name.slice(0, 2).toUpperCase() }}</span>
          </div>
          <div class="galaxy-copy">
            <span>{{ isOfficialSelectedCommunity ? 'Oficial' : 'Galaxia' }}</span>
            <h1>{{ selectedCommunity.name }} <i class="fas fa-circle-check"></i></h1>
            <p>{{ selectedCommunity.description }}</p>
          </div>
          <div class="galaxy-actions">
            <button v-if="isAdmin" type="button" class="admin-action" @click="startEditCommunity(selectedCommunity)">
              <i class="fas fa-pen"></i>
              Editar
            </button>
            <button v-if="isAdmin && !isOfficialSelectedCommunity" type="button" class="admin-danger" @click="triggerDeleteCommunity(selectedCommunity)">
              <i class="fas fa-trash"></i>
              Eliminar
            </button>
            <button v-if="!isOfficialSelectedCommunity" type="button" :class="{ joined: isJoinedSelectedCommunity }" :disabled="isTogglingMembership" @click="joinSelectedCommunity">
              <i :class="isJoinedSelectedCommunity ? 'fas fa-check' : 'far fa-star'"></i>
              {{ isTogglingMembership ? 'Guardando...' : (isJoinedSelectedCommunity ? 'Salir' : 'Unirse') }}
            </button>
          </div>
        </section>

        <section v-if="isOfficialSelectedCommunity" class="official-media-hub">
          <article ref="liveStageRef" class="official-live-stage">
            <div class="official-section-title">
              <span><i class="fas fa-circle"></i> En vivo ahora</span>
              <button type="button" class="live-refresh-btn" :disabled="youtubeVideosLoading" @click="refreshLiveNow">
                <i class="fas fa-rotate-right"></i>
                {{ youtubeVideosLoading ? 'Buscando...' : 'Buscar live' }}
              </button>
            </div>

            <div class="official-live-layout">
              <div class="official-live-video-column">
                <div class="official-live-frame">
                  <iframe
                    v-if="youtubeStageEmbedUrl"
                    :src="youtubeStageEmbedUrl"
                    title="Directo o video destacado de Galaxia Nintendera"
                    allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  ></iframe>
                  <div v-else class="live-waiting-state">
                    <span><i class="fas fa-satellite-dish"></i></span>
                    <h3>No hay transmision en vivo</h3>
                    <p>La sala esta esperando senal galactica. Revisa los horarios o elige un video de la biblioteca para verlo aqui.</p>
                    <button type="button" :disabled="youtubeVideosLoading" @click="refreshLiveNow">
                      <i class="fas fa-rotate-right"></i>
                      {{ youtubeVideosLoading ? 'Buscando live...' : 'Comprobar ahora' }}
                    </button>
                  </div>
                </div>

                <button
                  v-if="currentLiveGoal"
                  type="button"
                  class="official-live-goal-overlay"
                  @click="toggleLiveGoalExpanded(currentLiveGoal)"
                >
                  <span>
                    <i :class="currentLiveGoal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
                  </span>
                  <strong>{{ currentLiveGoal.title }}</strong>
                  <em>{{ currentLiveGoal.current }} / {{ currentLiveGoal.target }} {{ currentLiveGoal.type === 'mission' ? 'pasos' : 'likes' }}</em>
                  <i :style="{ width: currentLiveGoal.progress + '%' }"></i>
                </button>

                <div class="official-live-copy">
                  <span>{{ featuredVideoIsLive ? 'En vivo' : (featuredYoutubeVideo ? 'Video destacado' : 'Esperando live') }}</span>
                  <h2>{{ youtubeStageTitle }}</h2>
                  <p>{{ youtubeStageDescription }}</p>
                  <div class="official-live-actions">
                    <button v-if="featuredYoutubeVideo" type="button" @click="handleFeaturedVideoAction">
                      <i :class="featuredVideoActionIcon"></i>
                      <span>{{ featuredVideoActionLabel }}</span>
                    </button>
                    <button v-if="featuredYoutubeVideo" type="button" class="mobile-theater-btn" @click="openVideoTheater">
                      <i class="fas fa-up-right-and-down-left-from-center"></i>
                      <span>Ver en grande</span>
                    </button>
                    <a :href="featuredYoutubeVideo?.url || youtubeVideosUrl" target="_blank" rel="noreferrer">
                      <i class="fab fa-youtube"></i>
                      <span>Ver en YouTube</span>
                    </a>
                  </div>
                </div>
              </div>

              <aside class="video-chat-panel">
                <header>
                  <div>
                    <strong>{{ videoDiscussionTitle }}</strong>
                    <span>{{ videoDiscussionSubtitle }}</span>
                  </div>
                  <small>{{ formatVideoChatTime(activeVideoSecond) }}</small>
                </header>

                <div class="video-chat-list">
                  <article v-for="message in visibleVideoChatMessages" :key="message.id">
                    <img v-if="message.authorImage" :src="message.authorImage" alt="" />
                    <span v-else>{{ avatarInitial(message.author) }}</span>
                    <div>
                      <p><strong>{{ message.author }}</strong> <em>{{ formatVideoChatTime(message.videoSecond) }}</em></p>
                      <b>{{ message.body }}</b>
                      <div v-if="!featuredVideoIsLive" class="video-comment-actions">
                        <button type="button" :class="{ active: hasLikedVideoMessage(message) }" @click="toggleVideoMessageLike(message)">
                          <i :class="hasLikedVideoMessage(message) ? 'fas fa-heart' : 'far fa-heart'"></i>
                          {{ message.likes || message.likedBy?.length || 0 }}
                        </button>
                        <button type="button" @click="videoReplyDrafts = { ...videoReplyDrafts, [message.id]: videoReplyDrafts[message.id] ?? '' }">
                          <i class="far fa-comment"></i>
                          Responder
                        </button>
                        <button v-if="canDeleteVideoMessage(message)" type="button" class="danger" @click="deleteVideoMessage(message)">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                      <div v-if="!featuredVideoIsLive && message.replies?.length" class="video-comment-replies">
                        <article v-for="reply in message.replies" :key="reply.id">
                          <img v-if="reply.authorImage" :src="reply.authorImage" alt="" />
                          <span v-else>{{ avatarInitial(reply.author) }}</span>
                          <div>
                            <p><strong>{{ reply.author }}</strong></p>
                            <b>{{ reply.body }}</b>
                          </div>
                        </article>
                      </div>
                      <form
                        v-if="!featuredVideoIsLive && Object.prototype.hasOwnProperty.call(videoReplyDrafts, message.id)"
                        class="video-reply-form"
                        @submit.prevent="sendVideoReply(message)"
                      >
                        <input v-model="videoReplyDrafts[message.id]" maxlength="220" placeholder="Responder comentario..." />
                        <button type="submit" :disabled="!videoReplyDrafts[message.id]?.trim()">
                          <i class="fas fa-paper-plane"></i>
                        </button>
                      </form>
                    </div>
                  </article>
                  <div v-if="!visibleVideoChatMessages.length" class="video-chat-empty">
                    {{ !featuredYoutubeVideo ? 'El chat se abrira cuando el live este en vivo.' : (featuredVideoIsLive ? 'Aun no hay mensajes para este momento.' : 'Aun no hay comentarios en este video.') }}
                  </div>
                </div>

                <form class="video-chat-form" @submit.prevent="sendVideoChatMessage">
                  <input
                    v-model="videoChatDraft"
                    maxlength="280"
                    :disabled="!featuredYoutubeVideo"
                    :placeholder="videoDiscussionPlaceholder"
                  />
                  <button type="submit" :disabled="!featuredYoutubeVideo || !videoChatDraft.trim()">
                    <i class="fas fa-paper-plane"></i>
                  </button>
                </form>
              </aside>
            </div>
          </article>

          <section class="official-video-shelf">
            <div class="official-video-head">
              <div>
                <strong><i class="fas fa-layer-group"></i> Biblioteca del canal</strong>
                <span>{{ filteredOfficialVideos.length }} videos</span>
              </div>
              <a :href="youtubeChannelUrl" target="_blank" rel="noreferrer">Ver canal</a>
            </div>

            <div v-if="officialVideoLibrary.length" class="official-video-browser">
              <div class="official-video-filters" aria-label="Filtrar videos">
                <button
                  v-for="filter in officialVideoFilters"
                  :key="filter.id"
                  type="button"
                  :class="{ active: officialVideoFilter === filter.id }"
                  @click="officialVideoFilter = filter.id; officialVideoPage = 0"
                >
                  <i :class="filter.icon"></i>
                  {{ filter.label }}
                  <span>{{ filter.count }}</span>
                </button>
              </div>

              <div class="official-video-grid">
                <button
                  v-for="video in pagedOfficialVideos"
                  :key="video.id"
                  type="button"
                  class="official-video-card"
                  @click="playYoutubeVideo(video)"
                >
                  <span>
                    <img :src="video.thumbnail" alt="" />
                    <em v-if="video.duration">{{ video.duration }}</em>
                    <b v-else-if="video.streamKind === 'past-live'">Directo</b>
                  </span>
                  <strong>{{ video.title }}</strong>
                  <small>{{ formatVideoDate(video.publishedAt) }}</small>
                </button>
              </div>

              <div
                v-if="officialVideoPageCount > 1"
                class="official-video-dots"
                aria-label="Paginas de videos"
              >
                <button
                  v-for="page in officialVideoPageCount"
                  :key="`video-page-${page}`"
                  type="button"
                  :aria-label="`Pagina ${page}`"
                  :class="{ active: officialVideoPage === page - 1 }"
                  @click="officialVideoPage = page - 1"
                ></button>
              </div>
            </div>

            <div v-else class="official-video-empty">
              <p v-if="youtubeVideosLoading">Cargando videos del canal...</p>
              <p v-else-if="youtubeVideosError">{{ youtubeVideosError }}</p>
              <p v-else-if="!youtubeApiKey">Agrega tu YouTube API key para traer directos antiguos y videos recientes.</p>
              <p v-else>Aun no encontramos videos recientes.</p>

              <div v-if="youtubeUploadsUrl" class="official-uploads-fallback">
                <iframe
                  :src="youtubeUploadsUrl"
                  title="Videos de Galaxia Nintendera"
                  allowfullscreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                ></iframe>
              </div>
            </div>
          </section>
        </section>

        <main class="community-feed" :style="communityThreadBackgroundStyle">
          <ThreadComposer
            v-if="canCreateThreadInSelectedCommunity"
            class="community-thread-composer"
            variant="inline"
            :initial-community-id="selectedCommunity?.id || ''"
            :user-role="props.userRole"
          />

          <div v-else-if="isOfficialSelectedCommunity" class="official-readonly-note">
            <i class="fas fa-bullhorn"></i>
            Esta comunidad es oficial: solo admin y publicadores crean comunicados. Todos pueden comentar.
          </div>

          <div class="topic-tabs">
            <button
              v-for="topic in threadTopicFilters"
              :key="topic.value"
              :class="{ active: selectedTopic === topic.value }"
              @click="selectedTopic = topic.value"
            >
              <i :class="topic.icon"></i>
              {{ topic.label }}
            </button>
            <button class="filter-button" type="button"><i class="fas fa-sliders"></i> Filtros</button>
          </div>

          <div v-if="isLoading" class="community-empty">
            Cargando hilos de la comunidad...
          </div>

          <div
            v-else-if="!filteredThreads.length"
            class="community-empty community-empty-threads"
            :class="{ 'with-background': hasThreadBackground }"
          >
            <div class="empty-thread-visual">
              <img v-if="selectedCommunity?.iconUrl" :src="selectedCommunity.iconUrl" alt="" />
              <i v-else class="fas fa-wand-magic-sparkles"></i>
            </div>
            <h2>{{ isOfficialSelectedCommunity ? 'Aun no hay comunicados oficiales' : 'No hay hilos todavia en esta seccion' }}</h2>
            <p>{{ isOfficialSelectedCommunity ? 'Cuando haya un anuncio importante, live o evento, aparecera aqui para toda la galaxia.' : `Se el primero en compartir algo con la comunidad de ${selectedCommunity?.name || 'este espacio'}.` }}</p>
            <button v-if="canCreateThreadInSelectedCommunity" type="button" class="empty-create-thread" @click="openThreadComposer">
              <i class="fas fa-feather"></i>
              Crear publicacion
            </button>
          </div>

          <article v-for="thread in filteredThreads" v-else :key="thread.id" class="thread-card">
            <button class="thread-avatar profile-trigger" type="button" @click="openUserProfile(thread)">
              <img v-if="thread.authorImage" :src="thread.authorImage" alt="" />
              <span v-else>{{ avatarInitial(thread.author) }}</span>
            </button>

            <div class="thread-main">
              <div class="thread-meta">
                <button type="button" @click="openUserProfile(thread)">
                  <strong>{{ thread.author }}</strong>
                </button>
                <span>{{ thread.handle }}</span>
                <span>{{ formatAgo(thread.createdAt) }}</span>
              </div>

              <h2>{{ thread.title }}</h2>
              <small v-if="thread.spoiler" class="spoiler-badge"><i class="fas fa-eye-slash"></i> Spoiler</small>
              <p>{{ thread.body }}</p>
              <figure v-if="thread.imageUrl" class="thread-image">
                <img :src="thread.imageUrl" alt="" />
              </figure>

              <div class="thread-footer">
                <button @click="toggleThread(thread)">
                  <i class="far fa-comment"></i>
                  {{ thread.replies }}
                </button>
                <button
                  class="like-thread"
                  :class="{ active: hasLiked(thread) }"
                  @click="toggleLike(thread)"
                >
                  <i :class="hasLiked(thread) ? 'fas fa-heart' : 'far fa-heart'"></i>
                  {{ thread.likes }}
                </button>
                <button
                  v-if="canPinThread(thread)"
                  class="pin-thread"
                  :class="{ active: thread.pinnedHome }"
                  title="Fijar en home"
                  @click="togglePinnedThread(thread)"
                >
                  <i class="fas fa-thumbtack"></i>
                  {{ thread.pinnedHome ? 'Fijado' : 'Fijar' }}
                </button>
                <button
                  v-if="canDeleteThread(thread)"
                  class="delete-thread"
                  title="Borrar hilo"
                  @click="triggerDeleteThread(thread)"
                >
                  <i class="fas fa-trash"></i>
                  Borrar
                </button>
                <span>{{ thread.topic }}</span>
              </div>

              <section v-if="openThreadId === thread.id" class="thread-chat">
                <div class="chat-title">
                  <strong>Conversacion</strong>
                  <small>{{ thread.comments?.length || 0 }} mensajes</small>
                </div>

                <div v-if="thread.comments?.length" class="comment-list">
                  <div v-for="comment in thread.comments" :key="comment.id" class="comment-row">
                    <button class="comment-avatar profile-trigger" type="button" @click="openUserProfile(comment)">
                      <img v-if="comment.authorImage" :src="comment.authorImage" alt="" />
                      <span v-else>{{ avatarInitial(comment.author) }}</span>
                    </button>
                    <div>
                      <div class="comment-meta">
                        <button type="button" @click="openUserProfile(comment)">
                          <strong>{{ comment.author }}</strong>
                        </button>
                        <span>{{ comment.handle }}</span>
                        <span>{{ formatAgo(comment.createdAt) }}</span>
                      </div>
                      <p>{{ comment.body }}</p>
                    </div>
                    <button
                      v-if="canDeleteComment(comment)"
                      class="delete-comment"
                      title="Borrar mensaje"
                      @click="triggerDeleteComment(thread, comment)"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div v-else class="empty-chat">
                  Se el primero en seguir hablando dentro de este hilo.
                </div>

                <div class="reply-box">
                  <input
                    v-model="replyDraft"
                    maxlength="180"
                    placeholder="Responder dentro del hilo..."
                    @keyup.enter="publishReply(thread)"
                  />
                  <button @click="publishReply(thread)" :disabled="!replyDraft.trim()">
                    <i class="fas fa-paper-plane"></i>
                  </button>
                </div>
              </section>
            </div>
          </article>
        </main>
      </div>

      <aside class="community-side">
        <div v-if="youtubeLiveUrl && !isOfficialSelectedCommunity" class="side-box live-box">
          <span class="live-pill">
            <i class="fas fa-circle"></i>
            En vivo ahora
          </span>
          <div class="side-live-frame">
            <iframe
              :src="youtubeLiveUrl"
              title="Directo de YouTube de GalaxiaNintendera"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            ></iframe>
          </div>
          <a :href="youtubeChannelUrl" target="_blank" rel="noreferrer">Ver en YouTube</a>
        </div>

        <div v-else-if="isAdmin && !isOfficialSelectedCommunity" class="side-box live-box setup-only">
          <span class="live-pill"><i class="fas fa-circle"></i> YouTube</span>
          <h2>Falta configurar Channel ID</h2>
          <p>Este aviso solo se muestra para admin. Agrega VITE_YOUTUBE_CHANNEL_ID en tus variables de entorno para activar el live.</p>
        </div>

        <div class="side-box galaxy-calendar-box">
          <div class="side-box-head">
            <div>
              <h2>Calendario global</h2>
              <span>{{ upcomingEvents.length }} proximos</span>
            </div>
            <button type="button" class="event-manager-btn" @click="router.push('/eventos')">
              <i class="far fa-calendar"></i>
              Ver eventos
            </button>
          </div>

          <div v-if="upcomingEvents.length" class="event-stack">
            <button
              v-for="event in upcomingEvents"
              :key="event.id"
              class="event-mini-card"
              type="button"
              :style="{ '--event-bg': `url(${event.backgroundUrl || event.imageUrl || '/src/iconos/Banner.png'})` }"
              @click="router.push(`/eventos?id=${event.id}`)"
            >
              <span>{{ event.type || 'Evento' }}</span>
              <strong>{{ event.title }}</strong>
              <small><i class="far fa-calendar"></i> {{ formatEventDate(event.startsAt) }}</small>
              <p v-if="event.description">{{ event.description }}</p>
              <em
                class="event-notify-mini"
                :class="{ active: isEventNotified(event) }"
                role="button"
                tabindex="0"
                @click.stop="toggleEventNotify(event)"
                @keydown.enter.stop.prevent="toggleEventNotify(event)"
                @keydown.space.stop.prevent="toggleEventNotify(event)"
              >
                <i :class="isEventNotified(event) ? 'fas fa-bell' : 'far fa-bell'"></i>
              </em>
            </button>
          </div>

          <p v-else>No hay eventos programados todavia.</p>
        </div>

        <div v-if="canManageOfficialContent" class="side-box live-goals-box">
          <div class="side-box-head">
            <div>
              <h2>Metas del live</h2>
              <span>{{ liveGoalCards.length }} activos</span>
            </div>
            <button v-if="canManageOfficialContent" type="button" class="event-manager-btn" @click="openLiveGoalManager">
              <i class="fas fa-trophy"></i>
              Crear
            </button>
          </div>

          <div v-if="liveGoalCards.length" class="live-goal-stack">
            <article
              v-for="goal in liveGoalCards"
              :key="goal.id"
              class="live-goal-card"
              :class="{ mission: goal.type === 'mission', complete: goal.progress >= 100 }"
            >
              <button class="live-goal-summary" type="button" @click="toggleLiveGoalExpanded(goal)">
                <span class="live-goal-orb">
                  <i :class="goal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
                </span>
                <span>
                  <em>{{ goal.type === 'mission' ? 'Mision' : 'Meta de likes' }}</em>
                  <strong>{{ goal.title }}</strong>
                  <small>{{ goal.current }} / {{ goal.target }} {{ goal.type === 'mission' ? 'pasos' : 'likes' }}</small>
                </span>
                <i class="fas fa-chevron-down"></i>
              </button>

              <div class="live-goal-progress">
                <i :style="{ width: goal.progress + '%' }"></i>
              </div>

              <p v-if="goal.description">{{ goal.description }}</p>

              <div v-if="goal.type !== 'mission'" class="live-goal-like-row">
                <button type="button" class="live-goal-like-btn" @click="addLiveGoalLike(goal)">
                  <i class="fas fa-heart"></i>
                  Dar like
                </button>
                <div v-if="goal.ranking.length" class="live-goal-avatars">
                  <button
                    v-for="user in goal.ranking.slice(0, 4)"
                    :key="user.uid"
                    type="button"
                    :title="`${user.name}: ${user.count}`"
                    @click="toggleLiveGoalExpanded(goal)"
                  >
                    <img v-if="user.imageUrl" :src="user.imageUrl" alt="" />
                    <span v-else>{{ avatarInitial(user.name) }}</span>
                  </button>
                </div>
              </div>

              <div v-if="expandedLiveGoalId === goal.id" class="live-goal-detail">
                <div v-if="goal.type === 'mission'" class="live-mission-list">
                  <button
                    v-for="item in goal.checklist"
                    :key="item.id"
                    type="button"
                    :class="{ done: item.done }"
                    :disabled="!canManageOfficialContent"
                    @click="toggleLiveMissionItem(goal, item)"
                  >
                    <i :class="item.done ? 'fas fa-check' : 'far fa-circle'"></i>
                    {{ item.label }}
                  </button>
                </div>

                <div v-else class="live-like-ranking">
                  <strong>Ranking de likes</strong>
                  <button
                    v-for="user in goal.ranking"
                    :key="`rank-${goal.id}-${user.uid}`"
                    type="button"
                    @click="openUserProfile({ uid: user.uid, name: user.name, imageUrl: user.imageUrl })"
                  >
                    <img v-if="user.imageUrl" :src="user.imageUrl" alt="" />
                    <span v-else>{{ avatarInitial(user.name) }}</span>
                    <em>{{ user.name }}</em>
                    <small>{{ user.count }}</small>
                  </button>
                  <p v-if="!goal.ranking.length">Todavia nadie ha dado like.</p>
                </div>

                <button v-if="canManageOfficialContent" class="live-goal-delete" type="button" @click="deleteLiveGoal(goal)">
                  <i class="fas fa-trash"></i>
                  Eliminar
                </button>
              </div>
            </article>
          </div>

          <p v-else>Crea metas de likes o misiones para el proximo directo.</p>
        </div>

        <div class="side-box">
          <h2>Usuarios activos</h2>

          <div v-if="activeUsers.length">
            <div v-for="user in activeUsers" :key="user.id || user.name" class="user-row">
              <button class="user-row-avatar profile-trigger" type="button" @click="openUserProfile(user)">
                <img v-if="user.imageUrl" :src="user.imageUrl" alt="" />
                <span v-else>{{ user.name.slice(0, 2).toUpperCase() }}</span>
              </button>
              <div>
                <button type="button" @click="openUserProfile(user)">
                  <strong>{{ user.name }}</strong>
                </button>
                <p>{{ user.action }}</p>
              </div>
            </div>
          </div>

          <p v-else>Apareceran aqui cuando la comunidad empiece a publicar y responder.</p>
        </div>

        <div class="side-box trend-box">
          <h2>Temas en tendencia</h2>
          <button v-for="[topic, count] in trendingTopics" :key="topic" type="button">
            #{{ topic }}
            <span>{{ count }} posts</span>
          </button>
          <p v-if="!trendingTopics.length">Apareceran cuando existan hilos reales.</p>
        </div>

        <div class="side-box rules-box">
          <h2>Reglas de la comunidad</h2>
          <ol>
            <li>Se respetuoso con todos los miembros.</li>
            <li>No spam ni contenido sin relacion.</li>
            <li>No spoilers sin etiqueta.</li>
            <li>Nada de contenido ofensivo.</li>
          </ol>
        </div>
      </aside>
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

    <Teleport to="body">
      <Transition name="fade">
        <section v-if="mediaTheaterOpen" class="media-theater">
          <header>
            <strong>{{ youtubeStageTitle }}</strong>
            <button type="button" aria-label="Cerrar vista grande" @click="closeVideoTheater">
              <i class="fas fa-xmark"></i>
            </button>
          </header>

          <div class="media-theater-body">
            <div class="media-theater-player">
              <iframe
                v-if="youtubeStageEmbedUrl"
                :src="youtubeStageEmbedUrl"
                title="Video de Galaxia Nintendera"
                allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              ></iframe>
              <button
                v-if="currentLiveGoal"
                type="button"
                class="official-live-goal-overlay theater-goal-overlay"
                @click="toggleLiveGoalExpanded(currentLiveGoal)"
              >
                <span>
                  <i :class="currentLiveGoal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
                </span>
                <strong>{{ currentLiveGoal.title }}</strong>
                <em>{{ currentLiveGoal.current }} / {{ currentLiveGoal.target }} {{ currentLiveGoal.type === 'mission' ? 'pasos' : 'likes' }}</em>
                <i :style="{ width: currentLiveGoal.progress + '%' }"></i>
              </button>
            </div>

            <aside class="video-chat-panel media-theater-chat">
              <header>
                <div>
                  <strong>{{ videoDiscussionTitle }}</strong>
                  <span>{{ videoDiscussionSubtitle }}</span>
                </div>
                <small>{{ formatVideoChatTime(activeVideoSecond) }}</small>
              </header>

              <div class="video-chat-list">
                <article v-for="message in visibleVideoChatMessages" :key="`theater-${message.id}`">
                  <img v-if="message.authorImage" :src="message.authorImage" alt="" />
                  <span v-else>{{ avatarInitial(message.author) }}</span>
                  <div>
                    <p><strong>{{ message.author }}</strong> <em>{{ formatVideoChatTime(message.videoSecond) }}</em></p>
                    <b>{{ message.body }}</b>
                    <div v-if="!featuredVideoIsLive" class="video-comment-actions">
                      <button type="button" :class="{ active: hasLikedVideoMessage(message) }" @click="toggleVideoMessageLike(message)">
                        <i :class="hasLikedVideoMessage(message) ? 'fas fa-heart' : 'far fa-heart'"></i>
                        {{ message.likes || message.likedBy?.length || 0 }}
                      </button>
                      <button v-if="canDeleteVideoMessage(message)" type="button" class="danger" @click="deleteVideoMessage(message)">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </article>
                <div v-if="!visibleVideoChatMessages.length" class="video-chat-empty">
                  {{ !featuredYoutubeVideo ? 'El chat se abrira cuando el live este en vivo.' : (featuredVideoIsLive ? 'Aun no hay mensajes para este momento.' : 'Aun no hay comentarios en este video.') }}
                </div>
              </div>

              <form class="video-chat-form" @submit.prevent="sendVideoChatMessage">
                <input
                  v-model="videoChatDraft"
                  maxlength="280"
                  :disabled="!featuredYoutubeVideo"
                  :placeholder="videoDiscussionPlaceholder"
                />
                <button type="submit" :disabled="!featuredYoutubeVideo || !videoChatDraft.trim()">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </form>
            </aside>
          </div>
        </section>
      </Transition>
    </Teleport>

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

.composer,
.thread-card,
.side-box {
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

.composer-avatar,
.thread-avatar,
.user-row-avatar {
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

.thread-avatar,
.comment-avatar,
.composer-avatar,
.user-row-avatar {
  overflow: hidden;
}

.profile-trigger {
  border: 0;
  cursor: pointer;
  padding: 0;
}

.thread-avatar img,
.comment-avatar img,
.composer-avatar img,
.user-row-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.thread-avatar span,
.comment-avatar span,
.user-row-avatar span {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
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

.community-main-column,
.community-feed {
  min-width: 0;
}

.community-feed {
  background-position: center;
  background-size: cover;
  border-radius: 18px;
  display: block;
  padding: 0;
}

.community-thread-composer {
  margin: 30px 0 30px;
}

.topic-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 18px;
}

.topic-tabs button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  min-height: 32px;
  padding: 0 13px;
}

.topic-tabs button.active,
.topic-tabs button:hover {
  background: #f3e8ff;
  border-color: #d8b4fe;
  color: #7c3aed;
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

.community-empty-threads {
  align-items: center;
  background:
    radial-gradient(circle at 50% 18%, rgba(168, 85, 247, 0.2), transparent 30%),
    linear-gradient(135deg, rgba(12, 16, 38, 0.94), rgba(22, 15, 48, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  color: #cbd5e1;
  display: grid;
  justify-items: center;
  min-height: 300px;
  overflow: hidden;
  padding: 48px 20px;
  position: relative;
}

.community-empty-threads.with-background {
  background: transparent;
  backdrop-filter: blur(2px);
}

.community-empty-threads::before {
  background:
    radial-gradient(circle, rgba(192, 132, 252, 0.42) 1px, transparent 2px),
    radial-gradient(circle, rgba(255, 255, 255, 0.24) 1px, transparent 2px);
  background-position: 0 0, 28px 34px;
  background-size: 86px 86px, 118px 118px;
  content: '';
  inset: 0;
  opacity: 0.22;
  pointer-events: none;
  position: absolute;
}

.empty-thread-visual,
.community-empty-threads h2,
.community-empty-threads p,
.empty-create-thread {
  position: relative;
  z-index: 1;
}

.empty-thread-visual {
  align-items: center;
  background:
    radial-gradient(circle at 50% 25%, rgba(216, 180, 254, 0.42), transparent 34%),
    linear-gradient(135deg, rgba(124, 58, 237, 0.24), rgba(192, 38, 211, 0.16));
  border: 1px solid rgba(216, 180, 254, 0.34);
  border-radius: 24px;
  box-shadow: 0 18px 42px rgba(124, 58, 237, 0.24);
  color: #f5f3ff;
  display: flex;
  font-size: 42px;
  height: 104px;
  justify-content: center;
  margin-bottom: 18px;
  overflow: hidden;
  width: 104px;
}

.empty-thread-visual img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-empty-threads h2 {
  color: #f8fafc;
  font-size: clamp(20px, 2.5vw, 24px);
  font-weight: 950;
  line-height: 1.15;
}

.community-empty-threads p {
  color: #aeb8cf;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.45;
  margin: 8px 0 18px;
  max-width: 560px;
}

.empty-create-thread {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border: 1px solid rgba(216, 180, 254, 0.32);
  border-radius: 12px;
  box-shadow: 0 14px 30px rgba(124, 58, 237, 0.32);
  color: #ffffff;
  display: inline-flex;
  font-size: 14px;
  font-weight: 950;
  gap: 10px;
  min-height: 46px;
  padding: 0 20px;
}

.thread-card {
  display: grid;
  align-items: start;
  gap: 16px;
  grid-template-columns: 58px minmax(0, 1fr);
  margin-bottom: 12px;
  padding: 16px;
}

.thread-main {
  min-width: 0;
}

.thread-meta {
  align-items: center;
  color: #94a3b8;
  display: flex;
  flex-wrap: wrap;
  font-size: 11px;
  font-weight: 800;
  gap: 8px;
}

.thread-meta button,
.comment-meta button,
.user-row button:not(.user-row-avatar) {
  text-align: left;
}

.thread-meta button:hover strong,
.comment-meta button:hover strong,
.user-row button:not(.user-row-avatar):hover strong {
  color: #7c3aed;
}

.thread-meta strong {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.thread-card h2 {
  color: #111827;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 10px;
  overflow-wrap: anywhere;
}

.thread-card p {
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.55;
  margin-top: 8px;
}

.thread-footer {
  align-items: center;
  display: flex;
  gap: 16px;
  margin-top: 14px;
}

.thread-footer button {
  align-items: center;
  color: #64748b;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 7px;
}

.thread-footer .delete-thread {
  color: #ef4444;
}

.thread-footer .like-thread.active {
  color: #ec4899;
}

.thread-footer .pin-thread {
  color: #facc15;
}

.thread-footer .pin-thread.active {
  background: rgba(250, 204, 21, 0.14);
  border-radius: 999px;
  color: #fde68a;
  padding: 5px 8px;
}

.thread-footer .delete-thread:hover {
  color: #dc2626;
}

.thread-footer span {
  background: #eef2ff;
  border-radius: 999px;
  color: #4f46e5;
  font-size: 10px;
  font-weight: 900;
  margin-left: auto;
  padding: 5px 8px;
  text-transform: uppercase;
}

.thread-chat {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-top: 16px;
  padding: 14px;
}

.chat-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chat-title strong {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.chat-title small {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 900;
}

.comment-list {
  display: grid;
  gap: 10px;
}

.comment-row {
  align-items: start;
  background: #ffffff;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 32px minmax(0, 1fr) 24px;
  padding: 10px;
}

.comment-avatar {
  align-items: center;
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  display: flex;
  font-size: 11px;
  font-weight: 900;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.comment-meta {
  align-items: center;
  color: #94a3b8;
  display: flex;
  flex-wrap: wrap;
  font-size: 10px;
  font-weight: 800;
  gap: 7px;
}

.comment-meta strong {
  color: #111827;
  font-size: 12px;
  font-weight: 900;
}

.comment-row p {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  margin-top: 5px;
}

.delete-comment {
  align-items: center;
  color: #ef4444;
  display: flex;
  font-size: 11px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.empty-chat {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  padding: 14px;
  text-align: center;
}

.reply-box {
  align-items: center;
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 42px;
  margin-top: 12px;
  padding: 8px;
}

.reply-box input {
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 13px;
  font-weight: 850;
  min-height: 42px;
  min-width: 0;
  outline: none;
  padding: 0 4px 0 8px;
}

.reply-box input::placeholder {
  color: #94a3b8;
}

.reply-box button {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 10px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
}

.reply-box button:disabled {
  opacity: 0.45;
}

.community-side {
  display: grid;
  gap: 14px;
  min-width: 0;
  position: sticky;
  top: 0;
}

.side-box {
  border-radius: 18px;
  padding: 18px;
}

.side-box h2 {
  color: #111827;
  font-size: 15px;
  font-weight: 900;
}

.side-box p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
  margin-top: 8px;
}

.live-box {
  background: #ffffff;
  color: #111827;
}

.live-box h2,
.live-box p {
  color: #111827;
}

.live-pill {
  align-items: center;
  background: #fee2e2;
  border-radius: 999px;
  color: #dc2626;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  margin-bottom: 12px;
  padding: 6px 10px;
  text-transform: uppercase;
}

.live-pill i {
  color: #ef4444;
  font-size: 8px;
}

.user-row {
  align-items: center;
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
}

.user-row-avatar {
  border-radius: 999px;
  font-size: 11px;
  height: 34px;
  width: 34px;
}

.user-row strong {
  color: #111827;
  display: block;
  font-size: 12px;
  font-weight: 900;
}

.user-row p {
  font-size: 11px;
  margin-top: 2px;
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

  .community-side {
    position: static;
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
  .composer,
  .thread-card {
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

  .community-empty-threads {
    min-height: 260px;
    padding: 34px 16px;
  }

  .empty-thread-visual {
    border-radius: 20px;
    font-size: 34px;
    height: 82px;
    width: 82px;
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

.composer-image-preview,
.thread-image {
  margin: 0 0 0 66px;
  overflow: hidden;
  position: relative;
}

.composer-image-preview img,
.thread-image img {
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

.thread-image img {
  border: 1px solid #e5e7eb;
  width: min(420px, 100%);
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

.filter-button {
  margin-left: auto;
}

.thread-card {
  border-radius: 16px;
}

.spoiler-badge {
  align-items: center;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 999px;
  color: #92400e;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 6px;
  margin: 6px 0 0;
  padding: 5px 9px;
}

.official-media-hub {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.official-live-stage,
.official-video-shelf {
  background:
    linear-gradient(135deg, rgba(12, 16, 38, 0.94), rgba(22, 15, 48, 0.88));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.24);
  color: #f8fafc;
  min-width: 0;
  overflow: hidden;
  padding: 14px;
}

.official-section-title {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
}

.official-section-title span,
.live-refresh-btn {
  align-items: center;
  background: rgba(239, 68, 68, 0.16);
  border-radius: 999px;
  color: #fecaca;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 8px;
  padding: 8px 12px;
  text-transform: uppercase;
}

.live-refresh-btn {
  background: rgba(168, 85, 247, 0.16);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #e9d5ff;
  cursor: pointer;
}

.live-refresh-btn:disabled {
  cursor: wait;
  opacity: 0.68;
}

.official-section-title i {
  color: #ef4444;
  font-size: 8px;
}

.live-refresh-btn i {
  color: #c084fc;
  font-size: 11px;
}

.official-live-layout {
  display: grid;
  align-items: stretch;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  margin-top: 12px;
  position: relative;
}

.official-live-video-column {
  min-width: 0;
  position: relative;
}

.official-live-frame {
  aspect-ratio: 16 / 9;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  width: 100%;
}

.live-waiting-state {
  align-items: center;
  background:
    radial-gradient(circle at 50% 32%, rgba(168, 85, 247, 0.22), transparent 36%),
    linear-gradient(135deg, rgba(2, 6, 23, 0.98), rgba(18, 12, 42, 0.96)),
    var(--community-banner);
  background-position: center;
  background-size: cover;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  justify-content: center;
  padding: 24px;
  position: relative;
  text-align: center;
}

.live-waiting-state::before {
  background: rgba(2, 6, 23, 0.7);
  content: "";
  inset: 0;
  position: absolute;
}

.live-waiting-state > * {
  position: relative;
  z-index: 1;
}

.live-waiting-state > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  box-shadow: 0 18px 40px rgba(236, 72, 153, 0.28);
  display: inline-flex;
  height: 58px;
  justify-content: center;
  width: 58px;
}

.live-waiting-state h3 {
  font-size: clamp(20px, 3vw, 34px);
  font-weight: 950;
  line-height: 1;
}

.live-waiting-state p {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.45;
  max-width: 560px;
}

.live-waiting-state button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
}

.live-waiting-state button:disabled {
  opacity: 0.68;
}

.video-chat-panel {
  background:
    radial-gradient(circle at 16% 0%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(18, 12, 42, 0.96));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  color: #f8fafc;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  width: 100%;
}

.video-chat-panel header {
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
  padding: 14px;
}

.video-chat-panel header > div {
  min-width: 0;
}

.video-chat-panel header strong {
  color: #ffffff;
  display: block;
  font-size: 16px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-chat-panel header span {
  color: #aeb8d3;
  display: block;
  font-size: 11px;
  font-weight: 850;
  margin-top: 3px;
}

.video-chat-panel header small {
  background: rgba(124, 58, 237, 0.24);
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 999px;
  color: #e9d5ff;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  padding: 6px 9px;
}

.video-chat-list {
  align-content: start;
  display: grid;
  gap: 10px;
  max-width: 100%;
  min-height: 240px;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
}

.video-chat-list article {
  display: grid;
  gap: 9px;
  grid-template-columns: 34px minmax(0, 1fr);
}

.video-chat-list img,
.video-chat-list article > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  height: 34px;
  justify-content: center;
  object-fit: cover;
  width: 34px;
}

.video-chat-list p {
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 800;
  margin: 0 0 3px;
}

.video-chat-list p strong {
  color: #ffffff;
  font-weight: 950;
}

.video-chat-list p em {
  color: #c084fc;
  font-style: normal;
  font-weight: 950;
}

.video-chat-list b {
  color: #e5e7eb;
  display: block;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.35;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.video-comment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.video-comment-actions button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
}

.video-comment-actions button.active {
  color: #f9a8d4;
}

.video-comment-actions button.danger {
  color: #fecaca;
}

.video-comment-replies {
  border-left: 2px solid rgba(168, 85, 247, 0.3);
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding-left: 10px;
}

.video-comment-replies article {
  grid-template-columns: 28px minmax(0, 1fr);
}

.video-comment-replies img,
.video-comment-replies article > span {
  height: 28px;
  width: 28px;
}

.video-reply-form {
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 36px;
  margin-top: 10px;
}

.video-reply-form input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  color: #ffffff;
  min-height: 36px;
  padding: 0 10px;
}

.video-reply-form button {
  background: rgba(168, 85, 247, 0.26);
  border-radius: 12px;
  color: #ffffff;
}

.video-chat-empty {
  align-self: center;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 850;
  justify-self: center;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 0 8px;
  text-align: center;
}

.video-chat-form {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 44px;
  min-width: 0;
  padding: 12px;
}

.video-chat-form input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #ffffff;
  font-weight: 850;
  min-height: 44px;
  min-width: 0;
  padding: 0 14px;
}

.video-chat-form button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  justify-content: center;
}

.video-chat-form button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.media-theater {
  background: #050816;
  box-sizing: border-box;
  color: #ffffff;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100dvh;
  inset: 0;
  overflow: hidden;
  padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
  position: fixed;
  max-width: 100dvw;
  width: 100dvw;
  z-index: 7000;
}

.media-theater,
.media-theater * {
  box-sizing: border-box;
}

.media-theater > header {
  align-items: center;
  background: #050816;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  max-width: 100%;
  min-height: 52px;
  min-width: 0;
  position: relative;
  width: 100%;
  z-index: 2;
}

.media-theater > header strong {
  flex: 1 1 auto;
  font-size: 15px;
  font-weight: 950;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-theater > header button {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #ffffff;
  flex: 0 0 auto;
  height: 40px;
  width: 40px;
}

.media-theater-body {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  width: 100%;
}

.media-theater-player {
  align-self: start;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 18px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.theater-goal-overlay {
  left: 12px;
  max-width: min(420px, calc(100% - 24px));
  top: 12px;
}

.media-theater-player iframe {
  border: 0;
  display: block;
  height: 100%;
  width: 100%;
}

.media-theater-chat {
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

@media (min-width: 900px) {
  .media-theater-body {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
  }
}

.official-live-frame iframe,
.official-live-frame img {
  border: 0;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.official-live-goal-overlay {
  align-items: center;
  background: rgba(8, 12, 30, 0.86);
  border: 1px solid rgba(216, 180, 254, 0.28);
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
  color: #ffffff;
  display: grid;
  gap: 9px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  left: 14px;
  max-width: min(520px, calc(100% - 28px));
  min-height: 42px;
  overflow: hidden;
  padding: 7px 12px 7px 7px;
  position: absolute;
  right: auto;
  text-align: left;
  top: 14px;
  z-index: 3;
  pointer-events: none;
}

.official-live-goal-overlay span {
  align-items: center;
  background: linear-gradient(135deg, #ec4899, #f59e0b);
  border-radius: 999px;
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.official-live-goal-overlay strong {
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.official-live-goal-overlay em {
  color: #fde68a;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  white-space: nowrap;
}

.official-live-goal-overlay > i:last-child {
  background: linear-gradient(90deg, #9333ea, #ec4899, #f59e0b);
  bottom: 0;
  display: block;
  height: 3px;
  left: 0;
  position: absolute;
  transition: width 0.35s ease;
}

.official-live-copy {
  background:
    radial-gradient(circle at 8% 0%, rgba(168, 85, 247, 0.18), transparent 32%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(22, 15, 48, 0.96));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0 0 16px 16px;
  border-top: 0;
  display: grid;
  gap: 10px;
  padding: 16px 18px 18px;
  position: static;
}

.official-live-copy span {
  align-items: center;
  background: rgba(239, 68, 68, 0.18);
  border-radius: 999px;
  color: #fecaca;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  justify-self: start;
  padding: 6px 9px;
  text-transform: uppercase;
}

.official-live-copy h2 {
  color: #ffffff;
  font-size: clamp(17px, 1.8vw, 24px);
  font-weight: 950;
  line-height: 1.05;
  max-width: 980px;
  overflow-wrap: anywhere;
}

.official-live-copy p {
  color: #b8c1d8;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 860px;
}

.official-live-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mobile-theater-btn {
  display: none;
}

.official-live-actions button,
.official-live-actions a {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  width: auto;
}

.official-live-actions a {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.official-video-head {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.official-video-head > div {
  display: grid;
  gap: 3px;
}

.official-video-head strong,
.official-video-head a {
  align-items: center;
  display: inline-flex;
  gap: 8px;
}

.official-video-head strong {
  color: #e9d5ff;
  font-size: 15px;
  font-weight: 950;
}

.official-video-head a {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
}

.official-video-head span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.official-video-browser {
  display: grid;
  gap: 14px;
}

.official-video-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.official-video-filters button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 11px;
}

.official-video-filters button.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(236, 72, 153, 0.72));
  border-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.official-video-filters span {
  background: rgba(2, 6, 23, 0.36);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  min-width: 20px;
  padding: 3px 6px;
  text-align: center;
}

.official-video-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.official-video-card {
  appearance: none;
  background: transparent;
  border: 0;
  color: #ffffff;
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 0;
  text-align: left;
}

.official-video-card > span {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 12px;
  display: block;
  overflow: hidden;
  position: relative;
}

.official-video-card img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.official-video-card em {
  background: rgba(2, 6, 23, 0.82);
  border-radius: 6px;
  bottom: 7px;
  color: #ffffff;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  padding: 3px 6px;
  position: absolute;
  right: 7px;
}

.official-video-card b {
  background: linear-gradient(135deg, #ef4444, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 950;
  left: 7px;
  padding: 4px 7px;
  position: absolute;
  text-transform: uppercase;
  top: 7px;
}

.official-video-card strong {
  color: #ffffff;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.official-video-card small,
.official-video-empty {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.official-video-dots {
  align-items: center;
  display: flex;
  gap: 7px;
  justify-content: center;
}

.official-video-dots button {
  background: rgba(203, 213, 225, 0.32);
  border-radius: 999px;
  height: 9px;
  transition: background 0.2s ease, transform 0.2s ease, width 0.2s ease;
  width: 9px;
}

.official-video-dots button.active {
  background: linear-gradient(135deg, #c084fc, #ec4899);
  box-shadow: 0 0 16px rgba(192, 132, 252, 0.42);
  width: 24px;
}

.official-video-empty {
  background: rgba(8, 12, 30, 0.72);
  border: 1px dashed rgba(168, 85, 247, 0.28);
  border-radius: 14px;
  display: grid;
  gap: 12px;
  padding: 16px;
  text-align: center;
}

.official-uploads-fallback {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 14px;
  overflow: hidden;
}

.official-uploads-fallback iframe {
  border: 0;
  height: 100%;
  width: 100%;
}

.side-live-frame {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 14px;
  margin: 12px 0;
  overflow: hidden;
}

.side-live-frame iframe {
  border: 0;
  height: 100%;
  width: 100%;
}

.live-box a {
  align-items: center;
  background: linear-gradient(to right, #7c3aed, #c026d3);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  justify-content: center;
  min-height: 40px;
}

.official-readonly-note {
  align-items: center;
  background: rgba(124, 58, 237, 0.18);
  border: 1px solid rgba(216, 180, 254, 0.24);
  border-radius: 14px;
  color: #e9d5ff;
  display: flex;
  font-size: 13px;
  font-weight: 850;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
}

.side-box-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.side-box-head > div {
  min-width: 0;
}

.side-box-head span {
  color: #c084fc;
  display: block;
  font-size: 10px;
  font-weight: 950;
  margin-top: 2px;
  text-transform: uppercase;
}

.event-manager-btn {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
}

.event-stack,
.event-admin-form {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.event-mini-card {
  background:
    linear-gradient(180deg, rgba(8, 12, 30, 0.22), rgba(8, 12, 30, 0.9)),
    var(--event-bg, none) center / cover,
    rgba(8, 12, 30, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  color: #f8fafc;
  display: grid;
  gap: 5px;
  min-height: 112px;
  overflow: hidden;
  padding: 12px 54px 12px 12px;
  position: relative;
  text-align: left;
}

.galaxy-calendar-box {
  padding: 16px;
}

.galaxy-calendar-box .event-stack {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}

.event-mini-card span {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.event-mini-card strong {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
}

.event-mini-card small,
.event-mini-card p {
  color: #b8c1d8;
  font-size: 11px;
  font-weight: 800;
}

.event-mini-card p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-notify-mini {
  align-items: center;
  background: rgba(5, 8, 22, 0.72);
  border: 1px solid rgba(216, 180, 254, 0.28);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-style: normal;
  height: 36px;
  justify-content: center;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 36px;
}

.event-notify-mini.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  box-shadow: 0 0 18px rgba(236, 72, 153, 0.32);
}

.live-goals-box {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(145deg, rgba(11, 16, 38, 0.98), rgba(24, 16, 50, 0.96));
  border-color: rgba(216, 180, 254, 0.22);
  color: #f8fafc;
}

.live-goals-box h2 {
  color: #ffffff;
}

.live-goals-box > p {
  color: #b8c1d8;
}

.live-goal-stack {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.live-goal-card {
  background: rgba(248, 250, 252, 0.94);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 16px;
  color: #111827;
  display: grid;
  gap: 10px;
  overflow: hidden;
  padding: 12px;
}

.live-goal-card.complete {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.94));
  border-color: rgba(245, 158, 11, 0.52);
}

.live-goal-summary {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) 20px;
  text-align: left;
}

.live-goal-orb {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.live-goal-card.mission .live-goal-orb {
  background: linear-gradient(135deg, #2563eb, #06b6d4);
}

.live-goal-summary em {
  color: #7c3aed;
  display: block;
  font-size: 9px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}

.live-goal-summary strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.live-goal-summary small {
  color: #64748b;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-top: 2px;
}

.live-goal-progress {
  background: #e2e8f0;
  border-radius: 999px;
  height: 9px;
  overflow: hidden;
}

.live-goal-progress i {
  background: linear-gradient(90deg, #9333ea, #ec4899, #f59e0b);
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 0.42s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.live-goal-card > p {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
  margin: 0;
}

.live-goal-like-row {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.live-goal-like-btn {
  align-items: center;
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(236, 72, 153, 0.24);
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
}

.live-goal-like-btn:active {
  transform: scale(0.96);
}

.live-goal-avatars {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.live-goal-avatars button {
  border: 2px solid #ffffff;
  border-radius: 999px;
  height: 30px;
  margin-left: -8px;
  overflow: hidden;
  width: 30px;
}

.live-goal-avatars img,
.live-goal-avatars span,
.live-like-ranking img,
.live-like-ranking > button > span {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.live-goal-avatars span,
.live-like-ranking > button > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-size: 10px;
  font-weight: 950;
  justify-content: center;
}

.live-goal-detail {
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  display: grid;
  gap: 8px;
  padding: 10px;
}

.live-mission-list,
.live-like-ranking {
  display: grid;
  gap: 7px;
}

.live-mission-list button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #475569;
  display: flex;
  font-size: 11px;
  font-weight: 850;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  text-align: left;
}

.live-mission-list button.done {
  background: #ecfdf5;
  border-color: #86efac;
  color: #15803d;
}

.live-mission-list button:disabled {
  cursor: default;
  opacity: 1;
}

.live-like-ranking > strong {
  color: #111827;
  font-size: 11px;
  font-weight: 950;
}

.live-like-ranking > button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 8px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  min-height: 38px;
  padding: 5px 8px;
  text-align: left;
}

.live-like-ranking img,
.live-like-ranking > button > span {
  border-radius: 999px;
  height: 28px;
  overflow: hidden;
  width: 28px;
}

.live-like-ranking em {
  color: #111827;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-like-ranking small {
  background: #f3e8ff;
  border-radius: 999px;
  color: #7c3aed;
  font-size: 10px;
  font-weight: 950;
  padding: 4px 7px;
}

.live-like-ranking p {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
  margin: 0;
}

.live-goal-delete {
  align-items: center;
  background: #fff1f2;
  border-radius: 10px;
  color: #e11d48;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 34px;
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

.trend-box,
.rules-box {
  display: grid;
  gap: 10px;
}

.trend-box button {
  color: #4f46e5;
  display: grid;
  font-size: 13px;
  font-weight: 900;
  text-align: left;
}

.trend-box span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  margin-top: 2px;
}

.rules-box ol {
  color: #64748b;
  display: grid;
  font-size: 12px;
  font-weight: 750;
  gap: 9px;
  list-style-position: inside;
}

@media (max-width: 780px) {
  .community-thread-composer {
    display: none;
  }

  .miiverse-composer {
    display: none;
  }

  .official-live-stage,
  .official-video-shelf {
    padding: 12px;
  }

  .official-live-layout {
    grid-template-columns: 1fr;
  }

  .video-chat-panel {
    min-height: 420px;
  }

  .video-chat-list {
    min-height: 260px;
  }

  .media-theater {
    left: 0;
    max-width: 100dvw;
    padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom));
    right: 0;
    width: 100dvw;
  }

  .media-theater > header {
    min-height: 44px;
  }

  .media-theater > header strong {
    font-size: 13px;
  }

  .media-theater > header button {
    height: 38px;
    width: 38px;
  }

  .media-theater-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 4px;
  }

  .media-theater-player {
    border-radius: 14px;
    max-width: 100%;
    max-height: 36dvh;
  }

  .media-theater-chat {
    min-height: 0;
    max-height: none;
    max-width: 100%;
    width: 100%;
  }

  .media-theater-chat .video-chat-list {
    min-height: 0;
    width: 100%;
  }

  .official-live-copy {
    padding: 12px;
  }

  .official-live-goal-overlay {
    grid-template-columns: 26px minmax(0, 1fr);
    left: 10px;
    max-width: min(280px, calc(100% - 20px));
    min-height: 38px;
    right: auto;
    top: 10px;
  }

  .official-live-goal-overlay em {
    grid-column: 2;
  }

  .official-live-copy p {
    -webkit-line-clamp: 2;
  }

  .official-live-actions {
    display: flex;
    flex-wrap: nowrap;
  }

  .mobile-theater-btn {
    display: inline-flex;
  }

  .official-live-actions button,
  .official-live-actions a {
    border-radius: 999px;
    flex: 0 0 44px;
    height: 44px;
    min-height: 44px;
    padding: 0;
    width: 44px;
  }

  .official-live-actions button span,
  .official-live-actions a span {
    display: none;
  }

  .official-video-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .official-video-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .official-video-filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .official-video-filters button {
    flex: 0 0 auto;
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
