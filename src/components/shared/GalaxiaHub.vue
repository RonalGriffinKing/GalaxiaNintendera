<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import GiphyPicker from '@/components/shared/GiphyPicker.vue'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import {
  playerState,
  setCurrentTime,
  setPlaybackStatus
} from '@/services/playerState'
import { resolveAssetUrl } from '@/constants/assets'
import officialLogo from '@/iconos/logo.png'

const props = defineProps({
  officialCommunity: { type: Object, default: null },
  favoriteCommunities: { type: Array, default: () => [] },
  suggestedCommunities: { type: Array, default: () => [] },
  allCommunities: { type: Array, default: () => [] },
  activeCommunityId: { type: String, default: '' },
  showCommunityAccess: { type: Boolean, default: true }
})

const emit = defineEmits(['open-community', 'toggle-favorite', 'open-explore'])

const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'
const SOUNDCLOUD_API = 'https://w.soundcloud.com/player/api.js'
const DEFAULT_VOLUME = 35
const PLAYLISTS = {
  nintendo: {
    key: 'nintendo',
    name: 'Nintendo Power!',
    subtitle: 'Video Game Remixes',
    url: 'https://soundcloud.com/videogameremixes/sets/nintendo-power',
    cover: 'https://i1.sndcdn.com/artworks-000067594049-1pgk4k-t500x500.jpg'
  },
  zelda: {
    key: 'zelda',
    name: 'Lo-fi Hyrule',
    subtitle: 'Aventuras de Hyrule',
    url: 'https://soundcloud.com/videogameremixes/sets/the-legend-of-zelda-remixes',
    cover: 'https://i1.sndcdn.com/artworks-000050849323-e0sbfw-t500x500.jpg'
  },
  mario: {
    key: 'mario',
    name: 'Remixes Mario',
    subtitle: 'Clasicos del Reino Champinon',
    url: 'https://soundcloud.com/videogameremixes/sets/super-mario-remixes',
    cover: 'https://i1.sndcdn.com/artworks-000054372707-urujxv-t500x500.jpg'
  }
}

const router = useRouter()
const open = ref(false)
const activeTab = ref('communities')
const iconIndex = ref(0)
const currentUser = ref(auth.currentUser)
const currentProfile = ref({ role: 'user', canChat: false })
const users = ref([])
const followingIds = ref(new Set())
const inbox = ref([])
const unreadCount = ref(0)
const activeChatUser = ref(null)
const rawHubMessages = ref([])
const chatDraft = ref('')
const selectedChatGif = ref(null)
const chatGiphyOpen = ref(false)
const chatMenuOpen = ref(false)
const pendingChatAction = ref('')
const localClearedAtByChat = ref({})
const isPlaying = ref(false)
const currentPlaylist = ref(PLAYLISTS.nintendo)
const currentTrackTitle = ref('Nintendo Power!')
const currentTrackArtist = ref('Video Game Remixes')
const currentTrackCover = ref(PLAYLISTS.nintendo.cover)
const expandedMusic = ref(false)
const miniPlayerVisible = ref(false)
const iframeRef = ref(null)
const chatMessagesRef = ref(null)
const chatInputRef = ref(null)
const liveFrameRef = ref(null)
const liveChatMessagesRef = ref(null)
const liveChatInputRef = ref(null)
const showJumpToBottom = ref(false)
const keyboardOffset = ref(0)
const keyboardOpen = ref(false)
const liveChatDraft = ref('')
const selectedLiveGif = ref(null)
const liveGiphyOpen = ref(false)
const liveMessages = ref([])
const liveUnreadCount = ref(0)
const liveChatPinnedToBottom = ref(true)
const liveEmbedSrc = ref('')
let unsubscribeAuth = null
let unsubscribeUsers = null
let unsubscribeFollowing = null
let unsubscribeInbox = null
let unsubscribeHubMessages = null
let unsubscribeLiveMessages = null
let soundcloudWidget = null
let iconTimer = null
let miniPlayerTimer = null
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

const canUseChat = computed(() => (
  currentUser.value &&
  !currentProfile.value.isBlocked &&
  (['admin', 'publisher'].includes(currentProfile.value.role) || currentProfile.value.canChat)
))

const hasLivePlayer = computed(() => Boolean(playerState.currentVideo?.id && playerState.allowFloatingPlayback))
const buildLiveEmbedSrc = (video = playerState.currentVideo) => {
  if (!video?.id) return ''
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    origin: typeof window === 'undefined' ? '' : window.location.origin
  })
  const startAt = Math.max(0, Math.floor(Number(video.startedAt ?? playerState.currentTime ?? 0)))
  if (startAt > 0) params.set('start', String(startAt))
  return `https://www.youtube.com/embed/${video.id}?${params.toString()}`
}
const liveTitle = computed(() => playerState.currentVideo?.title || 'Video de Galaxia Nintendera')
const liveStatusLabel = computed(() => playerState.isPlaying ? 'Reproduciendo en segundo plano' : 'Pausado')

const officialCommunity = computed(() => ({
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera',
  iconUrl: officialLogo,
  isOfficial: true,
  membersCount: 512,
  ...(props.officialCommunity || {})
}))

const communityItems = computed(() => {
  const seen = new Set([OFFICIAL_COMMUNITY_ID])
  const ordered = [
    ...props.favoriteCommunities,
    ...props.suggestedCommunities,
    ...props.allCommunities
  ]

  return [
    officialCommunity.value,
    ...ordered.filter((community) => {
      if (!community?.id || community.id === OFFICIAL_COMMUNITY_ID || seen.has(community.id)) return false
      seen.add(community.id)
      return true
    })
  ].slice(0, 12)
})

const favoritePreview = computed(() => communityItems.value.slice(0, 4))
const recentPreview = computed(() => communityItems.value.slice(1, 6))
const chatPreview = computed(() => {
  const userMap = new Map(users.value.map(user => [user.id, user]))
  const fromInbox = inbox.value
    .map(chat => {
      const otherId = (chat.participants || []).find(id => id !== currentUser.value?.uid)
      const user = userMap.get(otherId)
      if (!otherId || !canMessageUser({ id: otherId })) return null
      return user ? { ...user, chatId: chat.id, lastMessage: chat.lastMessage || 'Nuevo mensaje', updatedAt: chat.updatedAt, unread: chat.unread, pinned: chat.pinned } : null
    })
    .filter(Boolean)

  const merged = [...fromInbox]
  users.value.forEach((user) => {
    if (!canMessageUser(user)) return
    if (!merged.some(item => item.id === user.id)) merged.push({ ...user, lastMessage: 'Disponible para conversar', unread: 0 })
  })
  return merged
})

const iconCycle = computed(() => {
  if (unreadCount.value) return { key: 'chat', icon: 'fas fa-comment-dots', label: 'Chat' }
  if (hasLivePlayer.value) return { key: 'live', icon: 'fas fa-circle-play', label: 'Live' }
  const icons = [
    { key: 'communities', icon: 'fas fa-users', label: 'Comunidades' },
    { key: 'chat', icon: 'fas fa-comment-dots', label: 'Chat' },
    { key: 'music', icon: 'fas fa-music', label: 'Musica' },
    ...(hasLivePlayer.value ? [{ key: 'live', icon: 'fas fa-circle-play', label: 'Live' }] : [])
  ]
  return icons[iconIndex.value % icons.length]
})

const embedSrc = computed(() => (
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(currentPlaylist.value.url)}&color=%23a855f7&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`
))

const formatMembers = (value) => {
  const count = Number(value || 0)
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K miembros`
  return `${count || 0} miembros`
}

const getMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.toDate) return value.toDate().getTime()
  return new Date(value).getTime() || 0
}

const formatChatTime = (value) => {
  const time = getMillis(value)
  if (!time) return 'Ahora'
  const diff = Date.now() - time
  if (diff > 86400000) return `${Math.floor(diff / 86400000)}d`
  return new Date(time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const fallbackImage = (event) => {
  if (event?.currentTarget) event.currentTarget.src = officialLogo
}

const profileIcon = (user) => resolveProfileIcon(user || {})
const profileIconEffect = (user) => resolveProfileIconMeta(user || {})

const chatIdForUser = (user) => {
  if (!currentUser.value || !user?.id) return ''
  return [currentUser.value.uid, user.id].sort().join('_')
}

const canMessageUser = (user) => Boolean(
  currentUser.value &&
  user?.id &&
  user.id !== currentUser.value.uid &&
  (user.canMessage || followingIds.value.has(user.id))
)

const activeChatId = computed(() => chatIdForUser(activeChatUser.value))
const activeChatRecord = computed(() => inbox.value.find(chat => chat.id === activeChatId.value) || null)
const activeChatClearedAt = computed(() => Math.max(
  getMillis(activeChatRecord.value?.clearedAtBy?.[currentUser.value?.uid]),
  Number(localClearedAtByChat.value[activeChatId.value] || 0)
))
const activeChatPinned = computed(() => Boolean(activeChatRecord.value?.pinnedBy?.[currentUser.value?.uid]))
const hubMessages = computed(() => rawHubMessages.value.filter(message => getMillis(message.createdAt) >= activeChatClearedAt.value))

const isLastOwnMessage = (message, index) => (
  message.authorId === currentUser.value?.uid &&
  index === hubMessages.value.length - 1
)

const messageReadLabel = (message) => {
  if (!activeChatUser.value || message.authorId !== currentUser.value?.uid) return ''
  return activeChatRecord.value?.lastReadBy?.[activeChatUser.value.id] === message.id ? 'Visto' : 'No visto'
}

const openHub = (tab = iconCycle.value.key) => {
  activeTab.value = ['communities', 'chat', 'music', 'live'].includes(tab) ? tab : 'communities'
  open.value = true
}

const closeHub = () => {
  open.value = false
  expandedMusic.value = false
  activeChatUser.value = null
  rawHubMessages.value = []
  chatDraft.value = ''
  selectedChatGif.value = null
  chatGiphyOpen.value = false
  selectedLiveGif.value = null
  liveGiphyOpen.value = false
  chatMenuOpen.value = false
  pendingChatAction.value = ''
  unsubscribeHubMessages?.()
  unsubscribeHubMessages = null
}

const selectCommunity = (community) => {
  closeHub()
  emit('open-community', community)
}

const exploreCommunities = () => {
  closeHub()
  emit('open-explore')
}

const openChat = (user = null) => {
  if (!canUseChat.value) return
  activeTab.value = 'chat'
  if (!user) {
    activeChatUser.value = null
    return
  }
  if (!canMessageUser(user)) return
  activeChatUser.value = user
  chatDraft.value = ''
  selectedChatGif.value = null
  chatGiphyOpen.value = false
  chatMenuOpen.value = false
  pendingChatAction.value = ''
  subscribeHubMessages()
  markActiveChatAsRead()
  scrollHubChatToBottom('auto')
}

const backToInbox = () => {
  activeChatUser.value = null
  rawHubMessages.value = []
  chatDraft.value = ''
  selectedChatGif.value = null
  chatGiphyOpen.value = false
  chatMenuOpen.value = false
  pendingChatAction.value = ''
  unsubscribeHubMessages?.()
  unsubscribeHubMessages = null
}

const isChatNearBottom = () => {
  const container = chatMessagesRef.value
  if (!container) return true
  return container.scrollHeight - container.scrollTop - container.clientHeight < 80
}

const handleChatScroll = () => {
  showJumpToBottom.value = !isChatNearBottom()
}

const scrollHubChatToBottom = (behavior = 'smooth') => {
  nextTick(() => {
    const container = chatMessagesRef.value
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    })
    showJumpToBottom.value = false
  })
}

const resizeChatInput = () => {
  nextTick(() => {
    const input = chatInputRef.value
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 104)}px`
  })
}

const gifPayload = (gif) => gif ? {
  provider: gif.provider || 'giphy',
  title: gif.title || '',
  url: gif.url || '',
  previewUrl: gif.previewUrl || ''
} : null

const insertIntoTextarea = (inputRef, draftRef, text) => {
  const input = inputRef.value
  const start = Number(input?.selectionStart ?? draftRef.value.length)
  const end = Number(input?.selectionEnd ?? start)
  draftRef.value = `${draftRef.value.slice(0, start)}${text}${draftRef.value.slice(end)}`.slice(0, 280)
  nextTick(() => {
    input?.focus?.({ preventScroll: true })
    input?.setSelectionRange?.(start + text.length, start + text.length)
    resizeChatInput()
  })
}

const handleChatGiphySelect = (item) => {
  if (item.type === 'emoji') {
    insertIntoTextarea(chatInputRef, chatDraft, item.text)
    chatGiphyOpen.value = false
    return
  }
  selectedChatGif.value = item
  chatGiphyOpen.value = false
  nextTick(() => chatInputRef.value?.focus?.({ preventScroll: true }))
}

const handleLiveGiphySelect = (item) => {
  if (item.type === 'emoji') {
    liveChatDraft.value = `${liveChatDraft.value}${item.text}`.slice(0, 280)
    liveGiphyOpen.value = false
    nextTick(() => liveChatInputRef.value?.focus?.({ preventScroll: true }))
    return
  }
  selectedLiveGif.value = item
  liveGiphyOpen.value = false
  nextTick(() => liveChatInputRef.value?.focus?.({ preventScroll: true }))
}

let lastMarkedRead = ''

const markActiveChatAsRead = async (messageId = '') => {
  const user = currentUser.value
  const chatId = activeChatId.value
  if (!user || !chatId) return
  const lastMessage = rawHubMessages.value[rawHubMessages.value.length - 1]
  const readId = messageId || activeChatRecord.value?.lastMessageId || lastMessage?.id
  if (!readId || lastMessage?.authorId === user.uid) return
  if (activeChatRecord.value?.lastReadBy?.[user.uid] === readId) return
  const marker = `${chatId}:${readId}`
  if (lastMarkedRead === marker) return
  lastMarkedRead = marker
  await setDoc(doc(db, 'directChats', chatId), {
    lastReadBy: { [user.uid]: readId },
    deletedFor: { [user.uid]: false }
  }, { merge: true })
}

const subscribeHubMessages = () => {
  unsubscribeHubMessages?.()
  rawHubMessages.value = []
  const chatId = activeChatId.value
  if (!chatId) return
  const messagesQuery = query(collection(db, 'directChats', chatId, 'messages'), orderBy('createdAt', 'asc'))
  unsubscribeHubMessages = onSnapshot(messagesQuery, (snap) => {
    const shouldStick = isChatNearBottom()
    rawHubMessages.value = snap.docs.map(item => ({ id: item.id, ...item.data() }))
    const lastMessage = rawHubMessages.value[rawHubMessages.value.length - 1]
    if (lastMessage?.authorId !== currentUser.value?.uid) markActiveChatAsRead(lastMessage?.id)
    if (shouldStick) scrollHubChatToBottom('auto')
    else nextTick(handleChatScroll)
  })
}

const sendHubMessage = async () => {
  const body = chatDraft.value.trim()
  const gif = selectedChatGif.value
  const user = currentUser.value
  const other = activeChatUser.value
  const chatId = chatIdForUser(other)
  if ((!body && !gif) || !user || !other || !chatId || !canMessageUser(other)) return
  chatDraft.value = ''
  selectedChatGif.value = null
  chatGiphyOpen.value = false
  resizeChatInput()
  const now = serverTimestamp()
  const messageRef = await addDoc(collection(db, 'directChats', chatId, 'messages'), {
    body,
    gif: gifPayload(gif),
    authorId: user.uid,
    authorName: currentProfile.value.name || user.displayName || user.email || 'Usuario',
    createdAt: now
  })
  await setDoc(doc(db, 'directChats', chatId), {
    participants: [user.uid, other.id],
    lastMessage: body || 'GIF',
    lastMessageId: messageRef.id,
    lastMessageAuthorId: user.uid,
    updatedAt: now,
    deletedFor: {
      [user.uid]: false,
      [other.id]: false
    },
    lastReadBy: {
      [user.uid]: messageRef.id
    }
  }, { merge: true })
  scrollHubChatToBottom()
  nextTick(() => {
    chatInputRef.value?.focus?.({ preventScroll: true })
    updateKeyboardOffset()
  })
}

const togglePinActiveChat = async () => {
  const user = currentUser.value
  const chatId = activeChatId.value
  if (!user || !chatId) return
  chatMenuOpen.value = false
  await setDoc(doc(db, 'directChats', chatId), {
    pinnedBy: { [user.uid]: !activeChatPinned.value }
  }, { merge: true })
}

const openActiveChatProfile = () => {
  const id = activeChatUser.value?.id
  if (!id) return
  chatMenuOpen.value = false
  closeHub()
  router.push(`/perfil/${id}`)
}

const requestChatAction = (action) => {
  chatMenuOpen.value = false
  pendingChatAction.value = action
}

const cancelChatAction = () => {
  pendingChatAction.value = ''
}

const confirmChatActionTitle = computed(() => 'Vaciar chat')
const confirmChatActionText = computed(() => 'Se limpiara el historial visible solo para ti. Los mensajes no se borran para la otra persona.')

const runConfirmedChatAction = async () => {
  const user = currentUser.value
  const chatId = activeChatId.value
  if (!user || !chatId || !pendingChatAction.value) return
  const action = pendingChatAction.value
  pendingChatAction.value = ''
  if (action !== 'clear') return
  const clearedAt = Date.now()
  localClearedAtByChat.value = { ...localClearedAtByChat.value, [chatId]: clearedAt }
  rawHubMessages.value = []
  await setDoc(doc(db, 'directChats', chatId), {
    clearedAtBy: { [user.uid]: clearedAt },
    lastReadBy: { [user.uid]: activeChatRecord.value?.lastMessageId || '' }
  }, { merge: true })
}

const updateKeyboardOffset = () => {
  if (typeof window === 'undefined') return
  if (!window.visualViewport || !window.matchMedia('(max-width: 859px)').matches) {
    keyboardOffset.value = 0
    keyboardOpen.value = false
    document.documentElement.style.removeProperty('--hub-vvh')
    document.documentElement.style.removeProperty('--hub-keyboard')
    document.documentElement.classList.remove('hub-keyboard-open')
    return
  }
  const viewport = window.visualViewport
  const visibleHeight = Math.round(viewport.height || window.innerHeight)
  keyboardOffset.value = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
  keyboardOpen.value = keyboardOffset.value > 40
  document.documentElement.style.setProperty('--hub-vvh', `${visibleHeight}px`)
  document.documentElement.style.setProperty('--hub-keyboard', `${Math.round(keyboardOffset.value)}px`)
  document.documentElement.classList.toggle('hub-keyboard-open', keyboardOpen.value)
  if (open.value && activeChatUser.value) scrollHubChatToBottom('auto')
}

const resetKeyboardViewport = () => {
  keyboardOffset.value = 0
  keyboardOpen.value = false
  if (typeof document === 'undefined') return
  document.documentElement.style.removeProperty('--hub-vvh')
  document.documentElement.style.removeProperty('--hub-keyboard')
  document.documentElement.classList.remove('hub-keyboard-open')
}

const isLiveChatAtBottom = () => {
  const container = liveChatMessagesRef.value
  if (!container) return true
  return container.scrollHeight - container.scrollTop - container.clientHeight < 48
}

const scrollLiveChatToBottom = (behavior = 'smooth') => {
  const container = liveChatMessagesRef.value
  if (!container) return
  container.scrollTo({ top: container.scrollHeight, behavior })
  liveUnreadCount.value = 0
  liveChatPinnedToBottom.value = true
}

const handleLiveChatScroll = () => {
  liveChatPinnedToBottom.value = isLiveChatAtBottom()
  if (liveChatPinnedToBottom.value) liveUnreadCount.value = 0
}

const loadSoundCloudApi = () => new Promise((resolve) => {
  if (window.SC?.Widget) {
    resolve()
    return
  }
  const existing = document.querySelector(`script[src="${SOUNDCLOUD_API}"]`)
  if (existing) {
    existing.addEventListener('load', resolve, { once: true })
    return
  }
  const script = document.createElement('script')
  script.src = SOUNDCLOUD_API
  script.onload = resolve
  document.body.appendChild(script)
})

const showMiniPlayerPreview = () => {
  miniPlayerVisible.value = true
  window.clearTimeout(miniPlayerTimer)
  miniPlayerTimer = window.setTimeout(() => {
    miniPlayerVisible.value = false
  }, 5200)
}

const setupWidget = async () => {
  await loadSoundCloudApi()
  await nextTick()
  if (!iframeRef.value || !window.SC?.Widget) return
  soundcloudWidget = window.SC.Widget(iframeRef.value)
  soundcloudWidget.bind(window.SC.Widget.Events.READY, () => {
    soundcloudWidget.setVolume(DEFAULT_VOLUME)
    const updateCurrentTrack = () => {
      soundcloudWidget.getCurrentSound((sound) => {
        if (!sound) return
        currentTrackTitle.value = sound.title || currentPlaylist.value.name
        currentTrackArtist.value = sound.user?.username || currentPlaylist.value.subtitle
        currentTrackCover.value = sound.artwork_url?.replace('-large.', '-t500x500.') || currentPlaylist.value.cover || officialLogo
      })
    }
    soundcloudWidget.bind(window.SC.Widget.Events.PLAY, () => {
      isPlaying.value = true
      showMiniPlayerPreview()
      updateCurrentTrack()
    })
    soundcloudWidget.bind(window.SC.Widget.Events.PAUSE, () => {
      isPlaying.value = false
      miniPlayerVisible.value = false
    })
    soundcloudWidget.bind(window.SC.Widget.Events.FINISH, () => {
      isPlaying.value = false
      miniPlayerVisible.value = false
      updateCurrentTrack()
    })
    soundcloudWidget.bind(window.SC.Widget.Events.PLAY_PROGRESS, updateCurrentTrack)
    updateCurrentTrack()
  })
}

const togglePlay = () => {
  if (!soundcloudWidget) return
  if (isPlaying.value) soundcloudWidget.pause()
  else soundcloudWidget.play()
}

const stopMusicPlayback = () => {
  soundcloudWidget?.pause?.()
  isPlaying.value = false
  miniPlayerVisible.value = false
}

const nextTrack = () => soundcloudWidget?.next?.()
const previousTrack = () => soundcloudWidget?.prev?.()

const applyPlaylist = (playlist) => {
  if (!playlist?.url) return
  currentPlaylist.value = playlist
  currentTrackTitle.value = playlist.name
  currentTrackArtist.value = playlist.subtitle
  currentTrackCover.value = playlist.cover || officialLogo
  showMiniPlayerPreview()
  soundcloudWidget?.load?.(playlist.url, {
    auto_play: true,
    show_comments: false,
    show_user: true,
    show_reposts: false,
    visual: false
  })
  window.setTimeout(() => {
    soundcloudWidget?.setVolume?.(playlist.volume || DEFAULT_VOLUME)
    soundcloudWidget?.play?.()
  }, 360)
}

const handleCommunityMusic = (event) => {
  const playlistUrl = String(event.detail?.playlistUrl || '').trim()
  if (!playlistUrl) return
  applyPlaylist({
    key: `community-${event.detail?.id || 'selected'}`,
    name: `Playlist ${event.detail?.name || 'Comunidad'}`,
    subtitle: 'Musica de la comunidad',
    url: playlistUrl,
    cover: event.detail?.iconUrl || officialLogo,
    volume: Number(event.detail?.volume || DEFAULT_VOLUME)
  })
}

const formatLiveTime = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)))
  const minutes = Math.floor(safe / 60)
  const rest = String(safe % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

const postLiveCommand = (func, args = []) => {
  liveFrameRef.value?.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func,
    args
  }), '*')
}

const registerLiveFrame = () => {
  const frame = liveFrameRef.value
  if (!frame?.contentWindow) return
  frame.contentWindow.postMessage(JSON.stringify({
    event: 'listening',
    id: 'galaxia-hub-live-player'
  }), '*')
}

const syncLivePlayerAfterLoad = () => {
  stopMusicPlayback()
  registerLiveFrame()
  const startAt = Math.max(0, Math.floor(Number(playerState.currentTime ?? playerState.currentVideo?.startedAt ?? 0)))
  const sync = () => {
    registerLiveFrame()
    if (startAt > 0) postLiveCommand('seekTo', [startAt, true])
    if (playerState.isPlaying) postLiveCommand('playVideo')
  }
  window.setTimeout(sync, 350)
  window.setTimeout(sync, 1100)
}

const openLiveTheater = () => {
  if (!playerState.currentVideo?.id) return
  stopMusicPlayback()
  postLiveCommand('pauseVideo')
  closeHub()
  window.dispatchEvent(new CustomEvent('galaxia-live-return-community', {
    detail: { theater: true }
  }))
  router.push(`/comunidad?id=${OFFICIAL_COMMUNITY_ID}&v=${encodeURIComponent(playerState.currentVideo.id)}&theater=1`)
}

const returnToLiveCommunity = () => {
  if (!playerState.currentVideo?.id) return
  stopMusicPlayback()
  postLiveCommand('pauseVideo')
  closeHub()
  window.dispatchEvent(new CustomEvent('galaxia-live-return-community'))
  router.push(`/comunidad?id=${OFFICIAL_COMMUNITY_ID}&v=${encodeURIComponent(playerState.currentVideo.id)}`)
}

const subscribeLiveMessages = (videoId) => {
  unsubscribeLiveMessages?.()
  unsubscribeLiveMessages = null
  liveMessages.value = []
  liveUnreadCount.value = 0
  liveChatPinnedToBottom.value = true
  if (!videoId) return
  unsubscribeLiveMessages = onSnapshot(
    query(collection(db, 'videoChats', videoId, 'messages'), orderBy('createdAt', 'asc')),
    (snap) => {
      const wasPinned = liveChatPinnedToBottom.value || isLiveChatAtBottom()
      const previousCount = liveMessages.value.length
      const nextMessages = snap.docs.map(item => ({ id: item.id, ...item.data() }))
      liveMessages.value = nextMessages
      nextTick(() => {
        if (wasPinned || previousCount === 0) {
          scrollLiveChatToBottom('auto')
          return
        }
        const addedMessages = Math.max(0, nextMessages.length - previousCount)
        if (addedMessages > 0) liveUnreadCount.value += addedMessages
      })
    },
    (error) => {
      console.error('Hub live chat:', error)
      liveMessages.value = []
    }
  )
}

const sendLiveMessage = async () => {
  const body = liveChatDraft.value.trim()
  const gif = selectedLiveGif.value
  const video = playerState.currentVideo
  const user = currentUser.value
  if ((!body && !gif) || !video?.id || !user) return

  liveChatDraft.value = ''
  selectedLiveGif.value = null
  liveGiphyOpen.value = false
  liveChatPinnedToBottom.value = true
  liveUnreadCount.value = 0
  await addDoc(collection(db, 'videoChats', video.id, 'messages'), {
    videoId: video.id,
    videoTitle: video.title || 'Video de Galaxia Nintendera',
    videoSecond: Math.max(0, Math.floor(Number(playerState.currentTime || 0))),
    body: body.slice(0, 280),
    gif: gifPayload(gif),
    authorId: user.uid,
    author: currentProfile.value.name || user.displayName || user.email || 'Usuario',
    authorImage: currentProfile.value.imageUrl || user.photoURL || '',
    likedBy: [],
    likes: 0,
    replies: [],
    kind: 'live-message',
    createdAt: Date.now()
  })
  await nextTick()
  liveChatInputRef.value?.focus({ preventScroll: true })
  updateKeyboardOffset()
}

const handleOpenLiveHub = () => {
  if (!hasLivePlayer.value) return
  openHub('live')
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
  if (state === 1) {
    stopMusicPlayback()
    setPlaybackStatus('playing')
  }
  if (state === 2) setPlaybackStatus('paused')
  if (state === 0) setPlaybackStatus('stopped')
}

const loadProfile = async (user) => {
  currentProfile.value = { role: 'user', canChat: false }
  if (!user) return
  const snap = await getDoc(doc(db, 'users', user.uid)).catch(() => null)
  const saved = snap?.exists?.() ? snap.data() : {}
  currentProfile.value = {
    ...saved,
    role: saved.isBlocked ? 'user' : (saved.role || 'user'),
    canChat: !saved.isBlocked && Boolean(saved.canChat),
    isBlocked: Boolean(saved.isBlocked)
  }
}

const subscribeUsers = () => {
  unsubscribeUsers?.()
  users.value = []
  if (!currentUser.value || !canUseChat.value) return
  unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
    users.value = snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(user => !user.isBlocked)
      .filter(user => user.id !== currentUser.value?.uid)
      .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
  })
}

const subscribeFollowing = () => {
  unsubscribeFollowing?.()
  followingIds.value = new Set()
  if (!currentUser.value || !canUseChat.value) return
  unsubscribeFollowing = onSnapshot(collection(db, 'users', currentUser.value.uid, 'following'), (snap) => {
    followingIds.value = new Set(snap.docs.map(item => item.data()?.userId || item.id))
    if (activeChatUser.value && !canMessageUser(activeChatUser.value)) backToInbox()
  })
}

const subscribeInbox = () => {
  unsubscribeInbox?.()
  inbox.value = []
  unreadCount.value = 0
  if (!currentUser.value || !canUseChat.value) return
  const inboxQuery = query(collection(db, 'directChats'), where('participants', 'array-contains', currentUser.value.uid))
  unsubscribeInbox = onSnapshot(inboxQuery, (snap) => {
    let unread = 0
    inbox.value = snap.docs
      .map((item) => {
        const chat = { id: item.id, ...item.data() }
        const hiddenForMe = Boolean(chat.deletedFor?.[currentUser.value.uid])
        if (hiddenForMe) return null
        const clearedAfterLastMessage = getMillis(chat.clearedAtBy?.[currentUser.value.uid]) >= getMillis(chat.updatedAt)
        const isUnread = Boolean(
          chat.lastMessageId &&
          chat.lastMessageAuthorId !== currentUser.value.uid &&
          chat.lastReadBy?.[currentUser.value.uid] !== chat.lastMessageId &&
          !clearedAfterLastMessage
        )
        if (isUnread) unread += 1
        return {
          ...chat,
          lastMessage: clearedAfterLastMessage ? 'Chat vacio' : chat.lastMessage,
          pinned: Boolean(chat.pinnedBy?.[currentUser.value.uid]),
          unread: isUnread ? 1 : 0
        }
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || getMillis(b.updatedAt) - getMillis(a.updatedAt))
    unreadCount.value = unread
  })
}

const handleOpenDirectChatRequest = (event) => {
  const target = event.detail
  if (!target?.id || !canUseChat.value) return
  const liveUser = users.value.find(user => user.id === target.id)
  const user = { ...(liveUser || {}), ...target }
  if (!canMessageUser(user)) return
  openHub('chat')
  openChat(user)
}

watch(open, (isOpen) => {
  if (typeof document === 'undefined') return
  if (isOpen) {
    if (window.matchMedia('(max-width: 859px)').matches) {
      previousBodyOverflow = document.body.style.overflow
      previousHtmlOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
    window.dispatchEvent(new CustomEvent('floating-panel-opened', { detail: { source: 'hub' } }))
    updateKeyboardOffset()
    return
  }
  resetKeyboardViewport()
  document.body.style.overflow = previousBodyOverflow
  document.documentElement.style.overflow = previousHtmlOverflow
})

watch(chatDraft, resizeChatInput)

watch(activeChatUser, (user) => {
  showJumpToBottom.value = false
  if (user) {
    resizeChatInput()
    updateKeyboardOffset()
    scrollHubChatToBottom('auto')
  }
})

watch(activeChatRecord, (record) => {
  if (activeChatUser.value && record?.unread) markActiveChatAsRead(record.lastMessageId)
})

watch(() => playerState.currentVideo?.id, (videoId) => {
  subscribeLiveMessages(videoId)
  liveEmbedSrc.value = videoId ? buildLiveEmbedSrc(playerState.currentVideo) : ''
}, { immediate: true })

watch(hasLivePlayer, (available) => {
  if (!available && activeTab.value === 'live') activeTab.value = 'communities'
})

onMounted(() => {
  iconTimer = window.setInterval(() => {
    iconIndex.value += 1
  }, 3200)
  setupWidget()
  window.addEventListener('community-music-context', handleCommunityMusic)
  window.addEventListener('galaxy-media-stop', stopMusicPlayback)
  window.addEventListener('open-galaxia-hub-live', handleOpenLiveHub)
  window.addEventListener('message', handleYoutubePlayerMessage)
  window.visualViewport?.addEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.addEventListener('scroll', updateKeyboardOffset)
  window.addEventListener('resize', updateKeyboardOffset)
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    await loadProfile(user)
    subscribeFollowing()
    subscribeUsers()
    subscribeInbox()
  })
  window.addEventListener('open-direct-chat', handleOpenDirectChatRequest)
})

onUnmounted(() => {
  window.clearInterval(iconTimer)
  window.clearTimeout(miniPlayerTimer)
  window.removeEventListener('community-music-context', handleCommunityMusic)
  window.removeEventListener('galaxy-media-stop', stopMusicPlayback)
  window.removeEventListener('open-galaxia-hub-live', handleOpenLiveHub)
  window.removeEventListener('message', handleYoutubePlayerMessage)
  window.visualViewport?.removeEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset)
  window.removeEventListener('resize', updateKeyboardOffset)
  window.removeEventListener('open-direct-chat', handleOpenDirectChatRequest)
  unsubscribeAuth?.()
  unsubscribeUsers?.()
  unsubscribeFollowing?.()
  unsubscribeInbox?.()
  unsubscribeHubMessages?.()
  unsubscribeLiveMessages?.()
  resetKeyboardViewport()
  if (open.value) {
    document.body.style.overflow = previousBodyOverflow
    document.documentElement.style.overflow = previousHtmlOverflow
  }
})
</script>

<template>
  <div class="galaxia-hub-root" :class="{ open }" :style="{ '--hub-keyboard-offset': `${keyboardOffset}px` }">
    <iframe ref="iframeRef" class="hub-audio-frame" :src="embedSrc" title="Galaxia musica" allow="autoplay"></iframe>

    <button class="galaxia-hub-orb" :class="[`mode-${iconCycle.key}`, { playing: isPlaying, unread: unreadCount }]" type="button" @click="openHub()">
      <span class="hub-orb-glow"></span>
      <Transition name="hub-icon" mode="out-in">
        <i :key="iconCycle.key" :class="iconCycle.icon"></i>
      </Transition>
      <strong v-if="unreadCount">{{ unreadCount }}</strong>
    </button>

    <button v-if="isPlaying && miniPlayerVisible && !open" class="hub-mini-player" type="button" @click="openHub('music')">
      <img :src="currentTrackCover || currentPlaylist.cover || officialLogo" alt="" @error="fallbackImage" />
      <span>
        <b>{{ currentTrackTitle }}</b>
        <small>SoundCloud · {{ currentTrackArtist }}</small>
      </span>
      <i class="fas fa-pause"></i>
    </button>

    <Transition name="hub-backdrop">
      <button v-if="open" class="hub-backdrop" type="button" aria-label="Cerrar Galaxia Hub" @click="closeHub"></button>
    </Transition>

    <Transition name="hub-panel">
      <section class="galaxia-hub-panel" :class="{ 'hub-hidden': !open, 'chat-active': activeTab === 'chat' && activeChatUser, 'live-active': activeTab === 'live', 'keyboard-open': keyboardOpen }" aria-label="Galaxia Hub">
        <header class="hub-head">
          <div>
            <span>Galaxia Hub</span>
            <h2>{{ activeTab === 'communities' ? 'Ecosistema social' : activeTab === 'chat' ? 'Mensajes' : activeTab === 'live' ? 'Live' : 'Musica' }}</h2>
          </div>
          <button type="button" aria-label="Cerrar" @click="closeHub"><i class="fas fa-xmark"></i></button>
        </header>

        <nav class="hub-segments" aria-label="Secciones de Galaxia Hub">
          <button :class="{ active: activeTab === 'communities' }" type="button" @click="activeTab = 'communities'">Comunidades</button>
          <button :class="{ active: activeTab === 'chat' }" type="button" @click="activeTab = 'chat'">
            Chat <em v-if="unreadCount">{{ unreadCount }}</em>
          </button>
          <button :class="{ active: activeTab === 'music' }" type="button" @click="activeTab = 'music'">Musica</button>
          <button v-if="hasLivePlayer" :class="{ active: activeTab === 'live' }" type="button" @click="activeTab = 'live'">Live</button>
        </nav>

        <div class="hub-content">
          <section v-if="activeTab === 'communities'" class="hub-section">
            <div class="hub-section-title">
              <strong>Mis comunidades</strong>
            </div>
            <div class="hub-community-grid">
              <button v-for="community in favoritePreview" :key="community.id" type="button" @click="selectCommunity(community)">
                <img v-if="community.iconUrl" :src="resolveAssetUrl(community.iconUrl)" alt="" />
                <b v-else>{{ String(community.name || 'GN').slice(0, 2).toUpperCase() }}</b>
                <strong>{{ community.name }}</strong>
                <small>{{ formatMembers(community.membersCount) }}</small>
              </button>
            </div>
            <div class="hub-section-title compact">
              <strong>Recientes</strong>
              <button type="button" @click="exploreCommunities">Explorar <i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="hub-list">
              <button v-for="community in recentPreview" :key="`recent-${community.id}`" type="button" @click="selectCommunity(community)">
                <img v-if="community.iconUrl" :src="resolveAssetUrl(community.iconUrl)" alt="" />
                <span>
                  <strong>{{ community.name }}</strong>
                  <small>Actividad reciente</small>
                </span>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </section>

          <section v-else-if="activeTab === 'chat'" class="hub-section" :class="{ 'chat-room': activeChatUser }">
            <template v-if="activeChatUser">
              <div class="hub-chat-room-head">
                <button type="button" aria-label="Volver a conversaciones" @click="backToInbox"><i class="fas fa-arrow-left"></i></button>
                <ProfileAvatar
                  class="hub-chat-avatar"
                  :src="profileIcon(activeChatUser)"
                  :alt="activeChatUser.name || activeChatUser.email || 'Usuario'"
                  :effect="profileIconEffect(activeChatUser)"
                  decorative
                />
                <span>
                  <strong>{{ activeChatUser.name || activeChatUser.email || 'Usuario' }}</strong>
                  <small>Chat privado integrado</small>
                </span>
                <div class="hub-chat-menu-wrap">
                  <button type="button" aria-label="Opciones del chat" @click="chatMenuOpen = !chatMenuOpen">
                    <i class="fas fa-ellipsis"></i>
                  </button>
                  <div v-if="chatMenuOpen" class="hub-chat-menu">
                    <button type="button" @click="openActiveChatProfile">
                      <i class="fas fa-user"></i>
                      Ver perfil
                    </button>
                    <button type="button" @click="togglePinActiveChat">
                      <i class="fas fa-thumbtack"></i>
                      {{ activeChatPinned ? 'Desfijar chat' : 'Fijar chat' }}
                    </button>
                    <button type="button" @click="requestChatAction('clear')">
                      <i class="fas fa-broom"></i>
                      Vaciar chat
                    </button>
                  </div>
                </div>
                <button class="hub-chat-close-btn" type="button" aria-label="Cerrar Galaxia Hub" @click="closeHub">
                  <i class="fas fa-xmark"></i>
                </button>
              </div>
              <div ref="chatMessagesRef" class="hub-chat-messages" @scroll="handleChatScroll">
                <article
                  v-for="(message, index) in hubMessages"
                  :key="message.id"
                  :class="{ mine: message.authorId === currentUser?.uid, 'has-status': isLastOwnMessage(message, index), 'has-gif': message.gif?.url }"
                >
                  <p>{{ message.body }}</p>
                  <img
                    v-if="message.gif?.url"
                    class="hub-message-gif"
                    :src="message.gif.url"
                    :alt="message.gif.title || 'GIF'"
                    loading="lazy"
                  />
                  <small v-if="isLastOwnMessage(message, index)" class="hub-message-status">
                    {{ messageReadLabel(message) }}
                  </small>
                </article>
                <div v-if="!hubMessages.length" class="hub-chat-placeholder">
                  Todavia no hay mensajes con este usuario.
                </div>
                <button
                  v-if="showJumpToBottom"
                  class="hub-chat-jump"
                  type="button"
                  aria-label="Ir al ultimo mensaje"
                  @click="scrollHubChatToBottom()"
                >
                  <i class="fas fa-arrow-down"></i>
                </button>
              </div>
              <figure v-if="selectedChatGif" class="hub-media-preview">
                <img :src="selectedChatGif.previewUrl || selectedChatGif.url" :alt="selectedChatGif.title || 'GIF'" />
                <figcaption>{{ selectedChatGif.title || 'GIF' }}</figcaption>
                <button type="button" aria-label="Quitar GIF" @click="selectedChatGif = null">
                  <i class="fas fa-xmark"></i>
                </button>
              </figure>
              <form class="hub-chat-composer" @submit.prevent="sendHubMessage">
                <textarea
                  ref="chatInputRef"
                  v-model="chatDraft"
                  rows="1"
                  placeholder="Escribe un mensaje..."
                  @focus="updateKeyboardOffset"
                  @keydown.enter.exact.prevent="sendHubMessage"
                ></textarea>
                <button
                  type="button"
                  class="hub-giphy-btn"
                  :class="{ active: chatGiphyOpen }"
                  aria-label="GIFs y stickers"
                  @click="chatGiphyOpen = !chatGiphyOpen"
                >
                  <i class="far fa-face-smile"></i>
                </button>
                <button
                  type="submit"
                  :disabled="!chatDraft.trim() && !selectedChatGif"
                  aria-label="Enviar mensaje"
                  @pointerdown.prevent
                >
                  <i class="fas fa-paper-plane"></i>
                </button>
                <GiphyPicker :open="chatGiphyOpen" @close="chatGiphyOpen = false" @select="handleChatGiphySelect" />
              </form>
              <div v-if="pendingChatAction" class="hub-chat-confirm" role="dialog" aria-modal="true">
                <div>
                  <strong>{{ confirmChatActionTitle }}</strong>
                  <p>{{ confirmChatActionText }}</p>
                  <span>
                    <button type="button" @click="cancelChatAction">Cancelar</button>
                    <button class="danger" type="button" @click="runConfirmedChatAction">Confirmar</button>
                  </span>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="hub-section-title">
                <strong>Conversaciones</strong>
              </div>
              <div v-if="canUseChat && chatPreview.length" class="hub-list chat">
                <button v-for="user in chatPreview" :key="user.id" type="button" @click="openChat(user)">
                  <ProfileAvatar
                    class="hub-chat-avatar"
                    :src="profileIcon(user)"
                    :alt="user.name || user.email || 'Usuario'"
                    :effect="profileIconEffect(user)"
                    decorative
                  />
                  <span>
                    <strong>{{ user.name || user.email || 'Usuario' }}</strong>
                    <small>{{ user.lastMessage }}</small>
                  </span>
                  <em v-if="user.unread">{{ user.unread }}</em>
                  <small v-else>{{ formatChatTime(user.updatedAt) }}</small>
                </button>
              </div>
            </template>
            <div v-if="!activeChatUser && (!canUseChat || !chatPreview.length)" class="hub-empty">
              <i class="fas fa-comment-dots"></i>
              <strong>{{ canUseChat ? 'Sin conversaciones recientes' : 'Chat no disponible' }}</strong>
              <p>{{ canUseChat ? 'Cuando tengas mensajes apareceran aqui.' : 'Activa permisos de chat desde tu perfil o administrador.' }}</p>
            </div>
          </section>

          <section v-else-if="activeTab === 'music'" class="hub-section music">
            <button class="hub-now-playing" type="button" @click="expandedMusic = !expandedMusic">
              <img :src="currentTrackCover || currentPlaylist.cover || officialLogo" alt="" @error="fallbackImage" />
              <span>
                <strong>{{ currentTrackTitle }}</strong>
                <small>{{ currentTrackArtist }}</small>
                <small class="hub-source">Sonando desde SoundCloud</small>
              </span>
              <i class="fas fa-chevron-right"></i>
            </button>
            <div class="hub-progress"><span :class="{ playing: isPlaying }"></span></div>
            <div class="hub-player-controls">
              <button type="button" @click="previousTrack"><i class="fas fa-backward-step"></i></button>
              <button class="primary" type="button" @click="togglePlay"><i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i></button>
              <button type="button" @click="nextTrack"><i class="fas fa-forward-step"></i></button>
              <button type="button" @click="expandedMusic = !expandedMusic"><i class="fas fa-list"></i></button>
            </div>
            <div v-if="expandedMusic" class="hub-playlists">
              <button v-for="playlist in PLAYLISTS" :key="playlist.key" type="button" @click="applyPlaylist(playlist)">
                <img :src="playlist.cover || officialLogo" alt="" @error="fallbackImage" />
                <span>
                  <strong>{{ playlist.name }}</strong>
                  <small>{{ playlist.subtitle }}</small>
                </span>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </section>

          <section class="hub-section live" :class="{ 'tab-hidden': activeTab !== 'live' }">
            <template v-if="hasLivePlayer">
              <div class="hub-live-player">
                <iframe
                  v-if="liveEmbedSrc"
                  ref="liveFrameRef"
                  :src="liveEmbedSrc"
                  title="Video de Galaxia Nintendera"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                  @load="syncLivePlayerAfterLoad"
                ></iframe>
              </div>
              <div class="hub-live-meta">
                <span>
                  <strong>{{ liveTitle }}</strong>
                  <small>{{ liveStatusLabel }} · {{ formatLiveTime(playerState.currentTime) }}</small>
                </span>
              </div>
              <div class="hub-live-controls">
                <button type="button" @click="returnToLiveCommunity">
                  <i class="fas fa-house"></i>
                  <span>Comunidad</span>
                </button>
                <button type="button" class="desktop-only" @click="openLiveTheater">
                  <i class="fas fa-up-right-and-down-left-from-center"></i>
                  <span>Ver grande</span>
                </button>
              </div>
              <div class="hub-live-chat-shell">
                <div ref="liveChatMessagesRef" class="hub-live-chat-list" @scroll="handleLiveChatScroll">
                  <article v-for="message in liveMessages" :key="message.id">
                    <img v-if="message.authorImage" :src="message.authorImage" alt="" @error="fallbackImage" />
                    <b v-else>{{ String(message.author || 'GN').slice(0, 2).toUpperCase() }}</b>
                    <span>
                      <small><strong>{{ message.author }}</strong> {{ formatLiveTime(message.videoSecond) }}</small>
                      <p>{{ message.body }}</p>
                      <img
                        v-if="message.gif?.url"
                        class="hub-message-gif"
                        :src="message.gif.url"
                        :alt="message.gif.title || 'GIF'"
                        loading="lazy"
                      />
                    </span>
                  </article>
                  <div v-if="!liveMessages.length" class="hub-chat-placeholder">
                    Aun no hay mensajes en este video.
                  </div>
                </div>
                <button
                  v-if="liveUnreadCount"
                  type="button"
                  class="hub-live-new-messages"
                  @click="scrollLiveChatToBottom()"
                >
                  <i class="fas fa-arrow-down"></i>
                  {{ liveUnreadCount }} {{ liveUnreadCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos' }}
                </button>
              </div>
              <figure v-if="selectedLiveGif" class="hub-media-preview live">
                <img :src="selectedLiveGif.previewUrl || selectedLiveGif.url" :alt="selectedLiveGif.title || 'GIF'" />
                <figcaption>{{ selectedLiveGif.title || 'GIF' }}</figcaption>
                <button type="button" aria-label="Quitar GIF" @click="selectedLiveGif = null">
                  <i class="fas fa-xmark"></i>
                </button>
              </figure>
              <form class="hub-live-composer" @submit.prevent="sendLiveMessage">
                <input ref="liveChatInputRef" v-model="liveChatDraft" maxlength="280" placeholder="Escribe en el chat..." @focus="updateKeyboardOffset" />
                <button
                  type="button"
                  class="hub-giphy-btn"
                  :class="{ active: liveGiphyOpen }"
                  aria-label="GIFs y stickers"
                  @click="liveGiphyOpen = !liveGiphyOpen"
                >
                  <i class="far fa-face-smile"></i>
                </button>
                <button type="submit" :disabled="!liveChatDraft.trim() && !selectedLiveGif" aria-label="Enviar mensaje" @pointerdown.prevent>
                  <i class="fas fa-paper-plane"></i>
                </button>
                <GiphyPicker :open="liveGiphyOpen" @close="liveGiphyOpen = false" @select="handleLiveGiphySelect" />
              </form>
            </template>
            <div v-else class="hub-empty">
              <i class="fas fa-circle-play"></i>
              <strong>No hay video en segundo plano</strong>
              <p>Minimiza un directo o video desde comunidad para verlo aqui.</p>
            </div>
          </section>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.galaxia-hub-root {
  --hub-keyboard-offset: 0px;
  pointer-events: none;
  position: fixed;
  z-index: 520;
}

.hub-audio-frame {
  height: 1px;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  width: 1px;
}

.galaxia-hub-orb {
  align-items: center;
  animation: hubBorderFlow 7s linear infinite;
  background:
    linear-gradient(145deg, rgba(7, 10, 25, 0.98), rgba(21, 13, 44, 0.96)) padding-box,
    linear-gradient(135deg, #22d3ee, #a855f7, #ec4899, #38bdf8, #a855f7) border-box;
  border: 2px solid transparent;
  border-radius: 999px;
  bottom: 34px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), 0 0 26px rgba(168, 85, 247, 0.28);
  color: #ffffff;
  display: grid;
  height: 58px;
  overflow: visible;
  place-items: center;
  pointer-events: auto;
  position: fixed;
  right: 28px;
  width: 58px;
}

.galaxia-hub-orb i {
  font-size: 20px;
  position: relative;
  z-index: 2;
}

.hub-orb-glow {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.42), transparent 64%);
  inset: -16px;
  position: absolute;
}

.galaxia-hub-orb strong {
  align-items: center;
  background: #ef4444;
  border: 2px solid #050816;
  border-radius: 999px;
  display: flex;
  font-size: 10px;
  font-weight: 950;
  height: 21px;
  justify-content: center;
  min-width: 21px;
  padding: 0 5px;
  position: absolute;
  right: -5px;
  top: -5px;
  z-index: 3;
}

.hub-mini-player {
  align-items: center;
  background: rgba(8, 12, 30, 0.82);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(168, 85, 247, 0.32);
  border-radius: 999px;
  bottom: 30px;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32), 0 0 20px rgba(168, 85, 247, 0.18);
  color: #ffffff;
  display: grid;
  gap: 9px;
  grid-template-columns: 36px minmax(0, 1fr) 32px;
  max-width: min(310px, calc(100vw - 82px));
  min-height: 48px;
  padding: 6px;
  pointer-events: auto;
  position: fixed;
  right: 104px;
  width: 260px;
}

.hub-mini-player img,
.hub-now-playing img,
.hub-playlists img {
  border-radius: 12px;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.hub-mini-player span,
.hub-now-playing span,
.hub-list span,
.hub-playlists span {
  min-width: 0;
  text-align: left;
}

.hub-mini-player b,
.hub-mini-player small,
.hub-list strong,
.hub-list small,
.hub-now-playing strong,
.hub-now-playing small,
.hub-playlists strong,
.hub-playlists small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-mini-player b {
  font-size: 12px;
  font-weight: 950;
}

.hub-mini-player small {
  color: #aeb8d3;
  font-size: 10px;
  font-weight: 800;
}

.hub-backdrop {
  background: rgba(3, 6, 18, 0.36);
  backdrop-filter: blur(9px);
  display: none;
  inset: 0;
  pointer-events: auto;
  position: fixed;
}

.galaxia-hub-panel {
  background:
    radial-gradient(circle at 20% 0%, rgba(168, 85, 247, 0.2), transparent 34%),
    radial-gradient(circle at 84% 16%, rgba(34, 211, 238, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(7, 10, 25, 0.98), rgba(17, 12, 42, 0.97));
  border: 1px solid rgba(168, 85, 247, 0.36);
  border-radius: 26px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.46), 0 0 38px rgba(168, 85, 247, 0.16);
  color: #ffffff;
  display: grid;
  gap: 16px;
  max-height: min(760px, calc(100dvh - 36px));
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 16px;
  pointer-events: auto;
  position: fixed;
  bottom: 108px;
  right: 28px;
  top: auto;
  width: min(390px, calc(100vw - 36px));
}

.galaxia-hub-panel.hub-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateX(18px) scale(0.98);
  visibility: hidden;
}

.galaxia-hub-panel.chat-active {
  grid-template-rows: minmax(0, 1fr);
  max-height: min(780px, calc(100dvh - 36px));
  width: min(520px, calc(100vw - 36px));
}

.galaxia-hub-panel.chat-active .hub-head,
.galaxia-hub-panel.chat-active .hub-segments {
  display: none;
}

.galaxia-hub-panel.live-active {
  grid-template-rows: auto auto minmax(0, 1fr);
  width: min(560px, calc(100vw - 36px));
}

.hub-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.hub-head span {
  color: #c084fc;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.hub-head h2 {
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.hub-head button {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  color: #ffffff;
  height: 36px;
  width: 36px;
}

.hub-segments {
  background: rgba(18, 24, 46, 0.82);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  padding: 4px;
}

.hub-segments button {
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 900;
  min-height: 36px;
}

.hub-segments button.active {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  box-shadow: 0 0 22px rgba(168, 85, 247, 0.26);
  color: #ffffff;
}

.hub-segments em {
  background: #7c3aed;
  border-radius: 999px;
  font-style: normal;
  margin-left: 4px;
  padding: 1px 6px;
}

.hub-content {
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding-right: 2px;
  position: relative;
}

.galaxia-hub-panel.chat-active .hub-content,
.galaxia-hub-panel.live-active .hub-content {
  overflow: hidden;
  padding-right: 0;
}

.hub-section {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.hub-section.chat-room {
  gap: 10px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.hub-section.live {
  gap: 10px;
  grid-template-rows: auto auto auto minmax(140px, 1fr) auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.hub-section.live.tab-hidden {
  height: 1px;
  left: -10000px;
  min-height: 1px;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  visibility: hidden;
  width: 1px;
}

.hub-live-player {
  aspect-ratio: 16 / 9;
  background: #020617;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  overflow: hidden;
}

.galaxia-hub-panel.live-active .hub-live-player {
  max-height: min(38vh, 300px);
}

.hub-live-player iframe {
  border: 0;
  display: block;
  height: 100%;
  width: 100%;
}

.hub-live-meta {
  align-items: start;
  display: block;
  min-width: 0;
}

.hub-live-meta span {
  min-width: 0;
}

.hub-live-meta strong,
.hub-live-meta small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-live-meta strong {
  font-size: 15px;
  font-weight: 950;
}

.hub-live-meta small {
  color: #aeb8d3;
  font-size: 11px;
  font-weight: 850;
}

.hub-live-controls {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}

.hub-live-controls button {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 40px;
  padding: 0 10px;
}

.hub-live-controls button:first-child {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
}

.hub-live-chat-shell {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.hub-live-chat-list {
  background: rgba(4, 7, 18, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  display: grid;
  gap: 9px;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  padding: 12px 12px 42px;
  scrollbar-gutter: stable;
}

.hub-live-chat-list article {
  display: grid;
  gap: 9px;
  grid-template-columns: 34px minmax(0, 1fr);
}

.hub-live-chat-list img,
.hub-live-chat-list b {
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

.hub-live-chat-list small {
  color: #aeb8d3;
  display: block;
  font-size: 11px;
  font-weight: 850;
}

.hub-live-chat-list small strong {
  color: #ffffff;
}

.hub-live-chat-list p {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.hub-live-new-messages {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.96), rgba(192, 38, 211, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  bottom: 10px;
  box-shadow: 0 12px 26px rgba(3, 6, 18, 0.34);
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  left: 50%;
  min-height: 34px;
  padding: 0 13px;
  position: absolute;
  transform: translateX(-50%);
  z-index: 3;
}

.hub-live-composer {
  background: rgba(11, 16, 34, 0.98);
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 46px 46px;
  margin-top: 0;
  padding-top: 0;
  position: relative;
  z-index: 2;
}

.hub-live-composer input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  height: 46px;
  min-height: 46px;
  min-width: 0;
  padding: 0 13px;
}

.hub-live-composer button {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 14px;
  color: #ffffff;
  height: 46px;
}

.hub-live-composer button:disabled {
  opacity: 0.48;
}

.hub-live-composer .hub-giphy-btn,
.hub-chat-composer .hub-giphy-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e9d5ff;
}

.hub-live-composer .hub-giphy-btn.active,
.hub-chat-composer .hub-giphy-btn.active {
  background: rgba(124, 58, 237, 0.28);
  border-color: rgba(192, 132, 252, 0.34);
}

.hub-message-gif {
  background: rgba(15, 23, 42, 0.58);
  border-radius: 12px;
  display: block;
  height: clamp(150px, 34vw, 240px);
  margin-top: 7px;
  max-height: 260px;
  max-width: 100%;
  object-fit: contain;
  width: 100%;
}

.hub-live-chat-list .hub-message-gif {
  height: clamp(130px, 30vw, 220px);
  max-height: 220px;
  max-width: min(280px, 100%);
  min-height: 0;
  object-fit: contain;
  width: 100%;
}

.hub-media-preview {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(192, 132, 252, 0.24);
  border-radius: 14px;
  display: grid;
  gap: 9px;
  grid-template-columns: 62px minmax(0, 1fr) 34px;
  margin: 0;
  padding: 7px;
}

.hub-media-preview img {
  border-radius: 10px;
  height: 48px;
  object-fit: cover;
  width: 62px;
}

.hub-media-preview figcaption {
  color: #e9d5ff;
  font-size: 12px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-media-preview button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #fff;
  height: 34px;
  width: 34px;
}

.hub-section-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.hub-section-title strong {
  font-size: 14px;
  font-weight: 950;
}

.hub-section-title button {
  color: #c084fc;
  font-size: 12px;
  font-weight: 900;
}

.hub-community-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.hub-community-grid button {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  gap: 7px;
  justify-items: center;
  min-width: 0;
  padding: 9px 6px;
}

.hub-community-grid img,
.hub-community-grid b {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  display: grid;
  height: 48px;
  object-fit: cover;
  place-items: center;
  width: 48px;
}

.hub-community-grid strong {
  font-size: 11px;
  font-weight: 950;
  line-height: 1.12;
}

.hub-community-grid small {
  color: #94a3b8;
  font-size: 9px;
  font-weight: 800;
}

.hub-list {
  display: grid;
  gap: 8px;
}

.hub-list button,
.hub-now-playing,
.hub-playlists button {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  min-height: 58px;
  padding: 8px;
}

.hub-list img,
.hub-list b {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  display: grid;
  height: 42px;
  object-fit: cover;
  place-items: center;
  width: 42px;
}

.hub-list strong {
  font-size: 13px;
  font-weight: 950;
}

.hub-list small {
  color: #aeb8d3;
  font-size: 11px;
  font-weight: 800;
}

.hub-list em {
  align-items: center;
  background: #7c3aed;
  border-radius: 999px;
  display: flex;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  height: 22px;
  justify-content: center;
  min-width: 22px;
}

.hub-chat-room-head {
  align-items: center;
  display: grid;
  column-gap: 12px;
  grid-template-columns: 40px 54px minmax(0, 1fr) 40px 40px;
  min-height: 56px;
  overflow: visible;
  position: relative;
}

.hub-chat-room-head > button,
.hub-chat-menu-wrap > button,
.hub-chat-close-btn {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  color: #ffffff;
  height: 40px;
  width: 40px;
}

.hub-chat-menu-wrap {
  position: relative;
}

.hub-chat-menu {
  background: rgba(10, 14, 34, 0.98);
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 16px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.36), 0 0 24px rgba(168, 85, 247, 0.12);
  display: grid;
  gap: 4px;
  min-width: 190px;
  padding: 6px;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 8;
}

.hub-chat-menu button {
  align-items: center;
  border-radius: 12px;
  color: #e2e8f0;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 9px;
  justify-content: flex-start;
  min-height: 38px;
  padding: 0 10px;
  text-align: left;
  width: 100%;
}

.hub-chat-menu button:hover {
  background: rgba(255, 255, 255, 0.07);
}

.hub-chat-menu button.danger {
  color: #fda4af;
}

.hub-chat-room-head strong,
.hub-chat-room-head small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-chat-room-head strong {
  font-size: 15px;
  font-weight: 950;
}

.hub-chat-room-head small {
  color: #aeb8d3;
  font-size: 11px;
  font-weight: 800;
}

.hub-chat-avatar {
  --avatar-size: 42px;
  justify-self: center;
  height: 42px;
  overflow: visible;
  width: 42px;
}

.hub-chat-messages {
  background: rgba(4, 7, 18, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  max-height: none;
  min-height: 300px;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px;
  position: relative;
  scroll-behavior: smooth;
}

.hub-chat-messages article {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px 14px 14px 7px;
  color: #e2e8f0;
  box-sizing: border-box;
  max-width: min(72%, 520px);
  min-height: 30px;
  min-width: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  padding: 8px 12px;
  position: relative;
  white-space: pre-wrap;
  width: fit-content;
  word-break: break-word;
}

.hub-chat-messages article.has-gif {
  width: min(78%, 340px);
}

.hub-chat-messages article.mine {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.84), rgba(192, 38, 211, 0.72));
  border-radius: 14px 14px 7px 14px;
  color: #ffffff;
}

.hub-chat-messages article.has-status {
  margin-bottom: 14px;
}

.hub-chat-messages p {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.38;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;
}

.hub-message-status {
  bottom: -16px;
  color: rgba(203, 213, 225, 0.72);
  display: block;
  font-size: 10px;
  font-weight: 950;
  line-height: 1;
  margin: 0;
  position: absolute;
  right: 5px;
  text-align: right;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.hub-chat-jump {
  align-items: center;
  align-self: center;
  background: rgba(124, 58, 237, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  bottom: 12px;
  box-shadow: 0 12px 28px rgba(124, 58, 237, 0.3);
  color: #ffffff;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  margin: 4px auto 0;
  min-width: 34px;
  position: sticky;
  z-index: 2;
}

.hub-chat-placeholder {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  margin: auto;
  text-align: center;
}

.hub-chat-composer {
  align-items: end;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 44px 44px;
  min-height: 44px;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.hub-chat-composer :deep(.giphy-picker),
.hub-live-composer :deep(.giphy-picker) {
  bottom: calc(100% + 10px);
  max-height: min(360px, 54dvh);
  right: 0;
  top: auto;
  width: min(360px, calc(100vw - 40px));
  z-index: 20;
}

.hub-chat-composer textarea {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.35;
  max-height: 104px;
  min-height: 44px;
  outline: 0;
  overflow-y: auto;
  padding: 12px 13px;
  resize: none;
}

.hub-chat-composer textarea:focus {
  border-color: rgba(192, 132, 252, 0.66);
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.16);
  outline: 0;
}

.hub-chat-composer button {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 14px;
  color: #ffffff;
  height: 44px;
  min-height: 44px;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.hub-chat-composer button:disabled {
  opacity: 0.48;
}

.hub-chat-composer button:not(:disabled):active {
  transform: scale(0.96);
}

.hub-chat-confirm {
  align-items: center;
  background: rgba(3, 6, 18, 0.54);
  backdrop-filter: blur(10px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: absolute;
  z-index: 12;
}

.hub-chat-confirm > div {
  background:
    radial-gradient(circle at 20% 0%, rgba(168, 85, 247, 0.22), transparent 38%),
    rgba(10, 14, 34, 0.98);
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
  display: grid;
  gap: 10px;
  max-width: 330px;
  padding: 18px;
  width: 100%;
}

.hub-chat-confirm strong {
  font-size: 17px;
  font-weight: 950;
}

.hub-chat-confirm p {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.hub-chat-confirm span {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
}

.hub-chat-confirm button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  min-height: 40px;
}

.hub-chat-confirm button.danger {
  background: linear-gradient(135deg, #ef4444, #c026d3);
}

.hub-empty {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  color: #cbd5e1;
  display: grid;
  gap: 8px;
  justify-items: center;
  padding: 24px 16px;
  text-align: center;
}

.hub-empty i {
  color: #c084fc;
  font-size: 24px;
}

.hub-now-playing {
  grid-template-columns: 64px minmax(0, 1fr) 24px;
  min-height: 82px;
}

.hub-source {
  color: #c084fc !important;
  margin-top: 3px;
  text-transform: uppercase;
}

.hub-progress {
  background: rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  height: 4px;
  overflow: hidden;
}

.hub-progress span {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  display: block;
  height: 100%;
  width: 38%;
}

.hub-progress span.playing {
  animation: musicProgress 9s linear infinite;
}

.hub-player-controls {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.hub-player-controls button {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  color: #ffffff;
  min-height: 42px;
}

.hub-player-controls .primary {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  box-shadow: 0 0 26px rgba(168, 85, 247, 0.28);
}

.hub-playlists {
  display: grid;
  gap: 8px;
}

@keyframes hubBorderFlow {
  0%, 100% { filter: hue-rotate(0deg) saturate(1); }
  50% { filter: hue-rotate(28deg) saturate(1.25); }
}

@keyframes musicProgress {
  0% { width: 16%; }
  100% { width: 82%; }
}

.hub-icon-enter-active,
.hub-icon-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.hub-icon-enter-from,
.hub-icon-leave-to {
  opacity: 0;
  transform: scale(0.72) rotate(-10deg);
}

.hub-backdrop-enter-active,
.hub-backdrop-leave-active,
.hub-panel-enter-active,
.hub-panel-leave-active {
  transition: opacity 0.22s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.hub-backdrop-enter-from,
.hub-backdrop-leave-to,
.hub-panel-enter-from,
.hub-panel-leave-to {
  opacity: 0;
}

.hub-panel-enter-from,
.hub-panel-leave-to {
  transform: translateX(18px) scale(0.98);
}

@media (max-width: 859px) {
  .galaxia-hub-orb {
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    right: max(14px, env(safe-area-inset-right, 0px));
  }

  .hub-mini-player {
    bottom: calc(146px + env(safe-area-inset-bottom, 0px));
    right: max(14px, env(safe-area-inset-right, 0px));
  }

  .hub-backdrop {
    display: block;
  }

  .galaxia-hub-panel {
    align-content: start;
    border-radius: 0;
    bottom: 0;
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr);
    height: 100dvh;
    left: 0;
    max-height: 100dvh;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: calc(14px + env(safe-area-inset-top, 0px)) 12px calc(92px + env(safe-area-inset-bottom, 0px));
    right: 0;
    top: 0;
    width: 100vw;
  }

  .galaxia-hub-panel.chat-active {
    bottom: var(--hub-keyboard-offset);
    grid-template-rows: minmax(0, 1fr);
    height: calc(100dvh - var(--hub-keyboard-offset));
    max-height: calc(100dvh - var(--hub-keyboard-offset));
    padding: calc(12px + env(safe-area-inset-top, 0px)) 10px calc(16px + env(safe-area-inset-bottom, 0px));
    width: 100vw;
  }

  .galaxia-hub-panel.live-active {
    grid-template-rows: auto auto auto minmax(0, 1fr);
    height: var(--hub-vvh, 100dvh);
    max-height: var(--hub-vvh, 100dvh);
    overflow: hidden;
    padding: calc(12px + env(safe-area-inset-top, 0px)) 10px calc(16px + env(safe-area-inset-bottom, 0px));
    width: 100vw;
  }

  .hub-community-grid {
    overflow-x: auto;
    grid-auto-columns: 86px;
    grid-template-columns: none;
    grid-auto-flow: column;
    padding-bottom: 4px;
  }

  .hub-segments {
    align-items: center;
    background: linear-gradient(135deg, rgba(18, 17, 44, 0.98), rgba(20, 34, 58, 0.98));
    box-shadow: 0 12px 30px rgba(3, 6, 18, 0.32);
    height: 42px;
    min-height: 42px;
    overflow: hidden;
    position: sticky;
    top: 8px;
    z-index: 3;
  }

  .hub-segments button {
    align-items: center;
    display: inline-flex;
    font-size: 11px;
    height: 32px;
    justify-content: center;
    min-height: 32px;
    padding: 0 8px;
    white-space: nowrap;
  }

  .hub-content {
    min-height: auto;
    overflow: visible;
    padding-bottom: 10px;
  }

  .galaxia-hub-panel.chat-active .hub-content,
  .galaxia-hub-panel.live-active .hub-content {
    min-height: 0;
    overflow: hidden;
    padding-bottom: 0;
  }

  .hub-section.chat-room {
    gap: 8px;
  }

  .hub-section.live {
    gap: 8px;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    height: 100%;
    min-height: 0;
  }

  .hub-live-player {
    border-radius: 14px;
    max-height: 30vh;
  }

  .galaxia-hub-panel.live-active.keyboard-open {
    bottom: 0;
    height: var(--hub-vvh, 100dvh);
    max-height: var(--hub-vvh, 100dvh);
    padding: 8px 8px 0;
    top: 0;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-content,
  .galaxia-hub-panel.live-active.keyboard-open .hub-section.live {
    height: 100%;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-section.live {
    grid-template-rows: minmax(92px, 34%) minmax(58px, 1fr) auto;
    gap: 6px;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-head {
    display: none;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-segments {
    display: none;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-player {
    max-height: none;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-meta,
  .galaxia-hub-panel.live-active.keyboard-open .hub-live-controls {
    display: none;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-chat-list {
    border-radius: 14px;
    min-height: 0;
    padding: 8px 10px 36px;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-new-messages {
    bottom: 8px;
    min-height: 30px;
    padding: 0 11px;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-chat-list article {
    gap: 7px;
    grid-template-columns: 30px minmax(0, 1fr);
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-chat-list img,
  .galaxia-hub-panel.live-active.keyboard-open .hub-live-chat-list b {
    height: 30px;
    width: 30px;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-composer {
    align-items: stretch;
    background: rgba(11, 16, 34, 0.99);
    grid-template-columns: minmax(0, 1fr) 52px 52px;
    padding-bottom: 0;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-composer input {
    border-radius: 14px;
    min-height: 52px;
  }

  .galaxia-hub-panel.live-active.keyboard-open .hub-live-composer button {
    border-radius: 14px;
    height: 52px;
  }

  .hub-live-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hub-live-controls .desktop-only {
    display: none;
  }

  .hub-live-chat-list {
    min-height: 0;
    max-height: none;
    padding: 10px 10px 38px;
  }

  .hub-live-composer {
    margin-bottom: calc(-1 * env(safe-area-inset-bottom, 0px));
    padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
  }

  .hub-chat-room-head {
    column-gap: 10px;
    grid-template-columns: 40px 52px minmax(0, 1fr) 40px 40px;
    min-height: 56px;
  }

  .hub-chat-messages {
    max-height: none;
    min-height: 0;
    flex: 1;
    padding: 10px;
  }

  .hub-chat-messages article {
    max-width: min(78vw, 520px);
    padding: 8px 12px;
  }

  .hub-chat-messages article.has-gif {
    width: min(82vw, 340px);
  }

  .hub-message-gif {
    height: clamp(150px, 44vw, 230px);
  }

  .hub-chat-messages p {
    font-size: 13px;
  }

  .hub-chat-composer {
    grid-template-columns: minmax(0, 1fr) 44px 44px;
    padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
  }

  .hub-chat-composer textarea {
    font-size: 16px;
    min-height: 44px;
    padding: 11px 13px;
  }

  .hub-section:has(.hub-chat-messages) {
    min-height: 0;
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .hub-panel-enter-from,
  .hub-panel-leave-to {
    transform: translateY(18px);
  }
}
</style>
