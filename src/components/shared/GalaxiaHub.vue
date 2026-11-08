<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import GiphyPicker from '@/components/shared/GiphyPicker.vue'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'

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
const chatMessagesRef = ref(null)
const chatInputRef = ref(null)
const hubContentRef = ref(null)
const hubContentHeight = ref(0)

const showJumpToBottom = ref(false)
const keyboardOffset = ref(0)
const keyboardOpen = ref(false)

let unsubscribeAuth = null
let unsubscribeUsers = null
let unsubscribeFollowing = null
let unsubscribeInbox = null
let unsubscribeHubMessages = null

let iconTimer = null
let previousBodyOverflow = ''
let previousHtmlOverflow = ''
let hubResizeObserver = null

const canUseChat = computed(() => (
  currentUser.value &&
  !currentProfile.value.isBlocked &&
  (['admin', 'publisher'].includes(currentProfile.value.role) || currentProfile.value.canChat)
))

const hubTabs = computed(() => [
  { key: 'communities', label: 'Comunidades' },
  { key: 'chat', label: 'Chat' },
])
const activeHubTabIndex = computed(() => Math.max(0, hubTabs.value.findIndex(tab => tab.key === activeTab.value)))

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
  const icons = [
    { key: 'communities', icon: 'fas fa-users', label: 'Comunidades' },
    { key: 'chat', icon: 'fas fa-comment-dots', label: 'Chat' },
  ]
  return icons[iconIndex.value % icons.length]
})

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

const measureHubContent = () => {
  nextTick(() => {
    if (!hubContentRef.value || (activeTab.value === 'chat' && activeChatUser.value)) return
    hubContentHeight.value = Math.ceil(hubContentRef.value.scrollHeight)
  })
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
  activeTab.value = ['communities', 'chat'].includes(tab) ? tab : 'communities'
  open.value = true
}

const closeHub = () => {
  open.value = false
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
          lastMessage: clearedAfterLastMessage ? 'Chat vacío' : chat.lastMessage,
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
watch([activeTab, activeChatUser], measureHubContent)

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

onMounted(() => {
  iconTimer = window.setInterval(() => {
    iconIndex.value += 1
  }, 3200)
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
  nextTick(() => {
    measureHubContent()
    if (window.ResizeObserver && hubContentRef.value) {
      hubResizeObserver = new ResizeObserver(measureHubContent)
      hubResizeObserver.observe(hubContentRef.value)
    }
  })
})

onUnmounted(() => {
  window.clearInterval(iconTimer)
  window.visualViewport?.removeEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset)
  window.removeEventListener('resize', updateKeyboardOffset)
  window.removeEventListener('open-direct-chat', handleOpenDirectChatRequest)
  unsubscribeAuth?.()
  unsubscribeUsers?.()
  unsubscribeFollowing?.()
  unsubscribeInbox?.()
  unsubscribeHubMessages?.()
  hubResizeObserver?.disconnect?.()
  resetKeyboardViewport()
  if (open.value) {
    document.body.style.overflow = previousBodyOverflow
    document.documentElement.style.overflow = previousHtmlOverflow
  }
})
</script>

<template>
  <div class="galaxia-hub-root" :class="{ open }" :style="{ '--hub-keyboard-offset': `${keyboardOffset}px` }">
    <button class="galaxia-hub-orb" :class="[`mode-${iconCycle.key}`, { unread: unreadCount }]" type="button" @click="openHub()">
      <span class="hub-orb-glow"></span>
      <Transition name="hub-icon" mode="out-in">
        <i :key="iconCycle.key" :class="iconCycle.icon"></i>
      </Transition>
      <strong v-if="unreadCount">{{ unreadCount }}</strong>
    </button>

    <Transition name="hub-backdrop">
      <button v-if="open" class="hub-backdrop" type="button" aria-label="Cerrar Galaxia Hub" @click="closeHub"></button>
    </Transition>

    <Transition name="hub-panel">
      <section
        class="galaxia-hub-panel"
        :class="{
          'hub-hidden': !open,
          'communities-active': activeTab === 'communities',
          'chat-active': activeTab === 'chat' && activeChatUser,
          'keyboard-open': keyboardOpen
        }"
        :style="{ '--hub-content-height': hubContentHeight ? `${hubContentHeight}px` : 'auto' }"
        aria-label="Galaxia Hub"
      >
        <header class="hub-head">
          <div>
            <span>Galaxia Hub</span>
            <h2>{{ activeTab === 'communities' ? 'Ecosistema social' : activeTab === 'chat' ? 'Mensajes' : activeTab === 'live' ? 'Live' : 'Música' }}</h2>
          </div>
          <button type="button" aria-label="Cerrar" @click="closeHub"><i class="fas fa-xmark"></i></button>
        </header>

        <nav
          class="hub-segments"
          :style="{ '--hub-tab-count': hubTabs.length, '--hub-tab-index': activeHubTabIndex }"
          aria-label="Secciones de Galaxia Hub"
        >
          <span class="hub-segment-indicator" aria-hidden="true"></span>
          <button
            v-for="tab in hubTabs"
            :key="tab.key"
            :class="{ active: activeTab === tab.key }"
            type="button"
            @click="activeTab = tab.key"
          >
            {{ tab.label }} <em v-if="tab.key === 'chat' && unreadCount">{{ unreadCount }}</em>
          </button>
        </nav>

        <div class="hub-content">
          <div ref="hubContentRef" class="hub-content-measure">
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
                  <p v-if="message.body">{{ message.body }}</p>
                  <div v-if="message.gif?.url" class="hub-message-media">
                    <img
                      class="hub-message-gif"
                      :src="message.gif.url"
                      :alt="message.gif.title || 'GIF'"
                      loading="lazy"
                    />
                  </div>
                  <small v-if="isLastOwnMessage(message, index)" class="hub-message-status">
                    {{ messageReadLabel(message) }}
                  </small>
                </article>
                <div v-if="!hubMessages.length" class="hub-chat-placeholder">
                  Todavía no hay mensajes con este usuario.
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
              <p>{{ canUseChat ? 'Cuando tengas mensajes aparecerán aquí.' : 'Activa permisos de chat desde tu perfil o administrador.' }}</p>
            </div>
          </section>

          </div>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.galaxia-hub-root {
  --hub-keyboard-offset: 0px;
  --hub-orb-size: 58px;
  --hub-orb-bottom: var(--public-floating-bottom, 34px);
  --hub-orb-right: 28px;
  pointer-events: none;
  position: fixed;
  z-index: 520;
}

.galaxia-hub-orb {
  box-sizing: border-box;
  align-items: center;
  animation: hubBorderFlow 7s linear infinite;
  background:
    linear-gradient(145deg, rgba(7, 10, 25, 0.98), rgba(21, 13, 44, 0.96)) padding-box,
    linear-gradient(135deg, #22d3ee, #a855f7, #ec4899, #38bdf8, #a855f7) border-box;
  border: 2px solid transparent;
  border-radius: 999px;
  bottom: var(--hub-orb-bottom);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), 0 0 26px rgba(168, 85, 247, 0.28);
  color: #ffffff;
  display: grid;
  height: var(--hub-orb-size);
  overflow: visible;
  place-items: center;
  pointer-events: auto;
  position: fixed;
  right: var(--hub-orb-right);
  width: var(--hub-orb-size);
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

.hub-list span {
  min-width: 0;
  text-align: left;
}

.hub-list strong,
.hub-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
    radial-gradient(circle at 20% 0%, rgba(139, 92, 246, 0.16), transparent 34%),
    radial-gradient(circle at 84% 16%, rgba(34, 211, 238, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(7, 10, 25, 0.98), rgba(17, 12, 42, 0.97));
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.46), var(--glow);
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
  transition:
    width var(--motion-slow) var(--ease-emphasized),
    max-height var(--motion-slow) var(--ease-emphasized),
    box-shadow var(--motion-normal) ease,
    border-color var(--motion-normal) ease;
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
  font-size: var(--font-h2);
  font-weight: 900;
  line-height: 1.08;
}

.hub-head button {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  color: #ffffff;
  height: 36px;
  transition: background var(--motion-fast) ease, transform var(--motion-fast) var(--ease-standard);
  width: 36px;
}

.hub-head button:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.hub-segments {
  background: rgba(18, 24, 46, 0.82);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(var(--hub-tab-count, 3), minmax(0, 1fr));
  padding: 4px;
  position: relative;
}

.hub-segments button {
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 850;
  min-height: 36px;
  position: relative;
  transition: color var(--motion-fast) ease;
  z-index: 2;
}

.hub-segments button.active {
  color: #ffffff;
}

.hub-segment-indicator {
  background: linear-gradient(135deg, var(--accent), var(--accent-active));
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(139, 92, 246, 0.22);
  height: calc(100% - 8px);
  left: 4px;
  position: absolute;
  top: 4px;
  transform: translateX(calc(var(--hub-tab-index, 0) * 100%));
  transition: transform var(--motion-normal) var(--ease-emphasized), width var(--motion-normal) var(--ease-standard);
  width: calc((100% - 8px) / var(--hub-tab-count, 3));
  z-index: 1;
}

.hub-segments em {
  background: #7c3aed;
  border-radius: 999px;
  font-style: normal;
  margin-left: 4px;
  padding: 1px 6px;
}

.hub-content {
  height: var(--hub-content-height);
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding-right: 2px;
  position: relative;
  transition: height var(--motion-slow) var(--ease-emphasized);
}

.hub-content-measure {
  display: grid;
  gap: 0;
  min-width: 0;
}

.galaxia-hub-panel.chat-active .hub-content {
  height: auto;
  overflow: hidden;
  padding-right: 0;
}

.hub-section {
  display: grid;
  gap: 14px;
  min-width: 0;
  transition: opacity var(--motion-normal) ease, transform var(--motion-normal) var(--ease-standard);
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

.hub-chat-composer .hub-giphy-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e9d5ff;
}

.hub-chat-composer .hub-giphy-btn.active {
  background: rgba(124, 58, 237, 0.28);
  border-color: rgba(192, 132, 252, 0.34);
}

.hub-message-media {
  background: rgba(15, 23, 42, 0.58);
  border-radius: 12px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  height: 220px;
  justify-content: center;
  margin: 7px 0 0;
  max-width: 100%;
  min-height: 0;
  overflow: hidden;
  width: 100%;
}

.hub-message-gif {
  display: block;
  height: 100%;
  max-height: none;
  max-width: 100%;
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
  border-radius: var(--radius-md);
  color: #ffffff;
  display: grid;
  gap: 7px;
  justify-items: center;
  min-width: 0;
  padding: 9px 6px;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease, transform var(--motion-fast) var(--ease-standard);
}

.hub-community-grid button:hover,
.hub-list button:hover {
  background: rgba(255, 255, 255, 0.075);
  border-color: rgba(192, 132, 252, 0.28);
  transform: translateY(-1px);
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

.hub-list button {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  min-height: 58px;
  padding: 8px;
  transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease, transform var(--motion-fast) var(--ease-standard);
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
  font-weight: 850;
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
  flex: 0 0 auto;
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
  display: grid;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 0;
  max-width: min(82%, 360px);
  overflow: hidden;
  padding: 8px;
  white-space: normal;
  width: min(82%, 360px);
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

.hub-chat-composer :deep(.giphy-picker) {
  bottom: calc(100% + 10px);
  max-height: min(360px, 54dvh);
  right: 0;
  top: auto;
  left: 0;
  width: 100%;
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

@keyframes hubBorderFlow {
  0%, 100% { filter: hue-rotate(0deg) saturate(1); }
  50% { filter: hue-rotate(28deg) saturate(1.25); }
}

.hub-icon-enter-active,
.hub-icon-leave-active {
  transition: opacity var(--motion-fast) ease, transform var(--motion-fast) var(--ease-standard);
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
  transition: opacity var(--motion-normal) ease, transform var(--motion-normal) var(--ease-standard);
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
  .galaxia-hub-root {
    --hub-orb-bottom: var(--public-floating-bottom, calc(84px + env(safe-area-inset-bottom, 0px)));
    --hub-orb-right: max(14px, env(safe-area-inset-right, 0px));
  }

  .galaxia-hub-orb {
    bottom: var(--hub-orb-bottom);
    right: var(--hub-orb-right);
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

  .galaxia-hub-panel.chat-active .hub-content {
    min-height: 0;
    overflow: hidden;
    padding-bottom: 0;
  }

  .hub-section.chat-room {
    gap: 8px;
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
    max-width: min(86vw, 360px);
    width: min(86vw, 360px);
  }

  .hub-message-media {
    height: 210px;
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
/* Bound the conversation itself, not only the surrounding overlay. */
@media (min-width: 860px) {
  .galaxia-hub-panel.chat-active { height: min(780px,calc(100dvh - 36px)); }
}
@media (max-width: 859px) {
  .galaxia-hub-panel.chat-active {
    height: var(--hub-vvh,100dvh);
    max-height: var(--hub-vvh,100dvh);
    bottom: auto;
  }
}
.galaxia-hub-panel.chat-active .hub-content { height: 100%; min-height: 0; overflow: hidden; }
.galaxia-hub-panel.chat-active .hub-content-measure { height: 100%; min-height: 0; grid-template-rows: minmax(0,1fr); }
.galaxia-hub-panel.chat-active .hub-section.chat-room { display: flex; flex-direction: column; height: 100%; max-height: 100%; min-height: 0; overflow: hidden; box-sizing: border-box; }
.chat-room .hub-chat-room-head,.chat-room .hub-chat-composer,.chat-room .hub-media-preview { flex: 0 0 auto; }
.chat-room .hub-chat-messages { flex: 1 1 0; min-height: 0; max-height: none; overflow-y: auto; overscroll-behavior: contain; }
.chat-room .hub-chat-composer { min-height: 52px; padding-bottom: max(8px,env(safe-area-inset-bottom)); }
.chat-room .hub-chat-composer textarea { min-width: 0; font-size: 16px; }

/* A floating chat should leave the page visible on tablets and laptops. */
@media(min-width:641px) {
 .galaxia-hub-panel.chat-active { width:min(420px,calc(100vw - 32px)); height:min(560px,calc(100dvh - 96px)); max-height:calc(100dvh - 96px); right:16px; left:auto; bottom:16px; top:auto; padding:12px; gap:10px; box-sizing:border-box; border-radius:18px; }
 .chat-active .hub-chat-messages article.has-gif { width:auto; max-width:min(80%,260px); }
 .chat-active .hub-message-media { height:140px; max-height:22dvh; }
 .chat-active .hub-head { min-height:44px; padding:0; }
 .chat-active .hub-chat-composer { min-height:52px; }
}

</style>
