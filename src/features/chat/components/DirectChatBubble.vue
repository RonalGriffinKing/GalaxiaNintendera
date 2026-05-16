<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { resolveProfileIcon } from '@/services/profileProgress'

const open = ref(false)
const currentUser = ref(auth.currentUser)
const currentProfile = ref({ role: 'user', canChat: false, imageUrl: '' })
const users = ref([])
const activeUser = ref(null)
const messages = ref([])
const liveMessages = ref([])
const liveChatInfo = ref({ active: false })
const liveGoals = ref([])
const draft = ref('')
const isSending = ref(false)
const isClearing = ref(false)
const chatError = ref('')
const listRef = ref(null)
const dockRaised = ref(false)
const communityDock = ref(false)
const chatMode = ref('direct')
const unreadMessages = ref(0)
const unreadByChat = ref({})
const hiddenBefore = ref({})
let unsubscribeAuth = null
let unsubscribeMessages = null
let unsubscribeLiveMessages = null
let unsubscribeLiveChatInfo = null
let unsubscribeLiveGoals = null
let unsubscribeInbox = null
let unsubscribeUsers = null
let dockObserver = null
let audioContext = null
let presenceTimer = null
let inboxReady = false
let previousLastMessageIds = new Map()
let previousBodyOverflow = ''
let previousBodyOverscroll = ''
const LIVE_CHAT_ID = 'galaxia-oficial'

const canUseChat = computed(() => (
  currentUser.value &&
  (['admin', 'publisher'].includes(currentProfile.value.role) || currentProfile.value.canChat)
))
const visibleMessages = computed(() => {
  if (chatMode.value === 'live') return liveMessages.value
  const hiddenAt = hiddenBefore.value[chatId.value] || 0
  return messages.value.filter(message => getMillis(message.createdAt) > hiddenAt)
})
const isLiveChat = computed(() => chatMode.value === 'live')
const liveChatActive = computed(() => Boolean(liveChatInfo.value.active))
const liveGoalCards = computed(() => liveGoals.value.map(goal => {
  const isMission = goal.type === 'mission'
  const target = Math.max(1, Number(goal.target || 1))
  const likesBy = goal.likesBy || {}
  const current = isMission
    ? (goal.checklist || []).filter(item => item.done).length
    : Object.values(likesBy).reduce((total, count) => total + Number(count || 0), 0)
  const nextTarget = isMission ? Math.max(1, (goal.checklist || []).length || target) : target
  return {
    ...goal,
    current,
    target: nextTarget,
    progress: Math.min(100, Math.round((current / nextTarget) * 100))
  }
}))
const currentLiveGoal = computed(() => liveGoalCards.value.find(goal => goal.type !== 'mission' && goal.progress < 100) || liveGoalCards.value.find(goal => goal.type !== 'mission') || null)

const chatId = computed(() => {
  if (!currentUser.value || !activeUser.value) return ''
  return [currentUser.value.uid, activeUser.value.id].sort().join('_')
})
const activeUserLive = computed(() => users.value.find(user => user.id === activeUser.value?.id) || activeUser.value)
const activeUserStatus = computed(() => getOnlineLabel(activeUserLive.value))
const chatIdForUser = (user) => {
  if (!currentUser.value || !user?.id) return ''
  return [currentUser.value.uid, user.id].sort().join('_')
}
const unreadForUser = (user) => unreadByChat.value[chatIdForUser(user)] || 0
const firstUnreadUser = computed(() => users.value.find(user => unreadForUser(user)))

const loadProfile = async (user) => {
  currentProfile.value = { role: 'user', canChat: false, imageUrl: '' }
  if (!user) return

  const snap = await getDoc(doc(db, 'users', user.uid))
  const saved = snap.exists() ? snap.data() : {}
  currentProfile.value = {
    ...saved,
    role: saved.role || 'user',
    canChat: Boolean(saved.canChat),
    imageUrl: saved.imageUrl || user.photoURL || ''
  }
}

const subscribeUsers = () => {
  unsubscribeUsers?.()
  users.value = []
  if (!currentUser.value) return

  unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
    users.value = snap.docs
    .map(item => ({ ...item.data(), id: item.id }))
    .filter(user => user.id !== currentUser.value.uid)
    .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
  })
}

const profileIcon = (user) => resolveProfileIcon(user)

const openChat = async (user = null) => {
  if (!canUseChat.value) return
  open.value = true
  chatMode.value = user?.mode === 'live' ? 'live' : 'direct'

  if (isLiveChat.value) {
    activeUser.value = null
    subscribeLiveMessages()
  } else if (user?.id) {
    const liveUser = users.value.find(item => item.id === user.id)
    selectUser(liveUser || user)
  } else if (!activeUser.value && firstUnreadUser.value) {
    selectUser(firstUnreadUser.value)
  }
}

const closeChat = () => {
  open.value = false
}

const handleExternalPanelOpen = (event) => {
  if (['music', 'mascot'].includes(event.detail?.source)) {
    open.value = false
  }
}

const backToUsers = () => {
  activeUser.value = null
  chatMode.value = 'direct'
  draft.value = ''
  unsubscribeMessages?.()
  messages.value = []
}

const selectUser = (user) => {
  chatMode.value = 'direct'
  activeUser.value = user
  draft.value = ''
  chatError.value = ''
  subscribeMessages()
}

const openLiveChat = () => {
  chatMode.value = 'live'
  activeUser.value = null
  draft.value = ''
  chatError.value = ''
  open.value = true
  unsubscribeMessages?.()
  messages.value = []
  subscribeLiveMessages()
}

const scrollToLatestMessage = (behavior = 'auto') => {
  requestAnimationFrame(() => {
    listRef.value?.scrollTo({
      top: listRef.value.scrollHeight,
      behavior
    })
  })
}

const subscribeMessages = () => {
  unsubscribeMessages?.()
  messages.value = []
  if (!chatId.value) return

  const messagesQuery = query(
    collection(db, 'directChats', chatId.value, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(80)
  )

  unsubscribeMessages = onSnapshot(messagesQuery, async (snap) => {
    messages.value = snap.docs.map(item => ({ ...item.data(), id: item.id }))
    await markMessagesSeen()
    await nextTick()
    scrollToLatestMessage('smooth')
  }, (error) => {
    console.error(error)
    chatError.value = 'No se pudieron cargar los mensajes. Revisa permisos o intenta abrir de nuevo el chat.'
  })
}

const subscribeLiveMessages = () => {
  unsubscribeLiveMessages?.()
  liveMessages.value = []
  if (!currentUser.value || !canUseChat.value) return

  const messagesQuery = query(
    collection(db, 'liveChats', LIVE_CHAT_ID, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(120)
  )

  unsubscribeLiveMessages = onSnapshot(messagesQuery, async (snap) => {
    liveMessages.value = snap.docs.map(item => ({ ...item.data(), id: item.id }))
    await nextTick()
    scrollToLatestMessage('smooth')
  }, (error) => {
    console.error(error)
    chatError.value = 'No se pudo cargar el chat en live. Revisa permisos o intenta de nuevo.'
  })
}

const subscribeLiveChatInfo = () => {
  unsubscribeLiveChatInfo?.()
  liveChatInfo.value = { active: false }
  if (!currentUser.value || !canUseChat.value) return

  unsubscribeLiveChatInfo = onSnapshot(doc(db, 'liveChats', LIVE_CHAT_ID), (snap) => {
    liveChatInfo.value = {
      active: false,
      ...(snap.data() || {})
    }
  }, (error) => {
    console.error(error)
  })
}

const subscribeLiveGoals = () => {
  unsubscribeLiveGoals?.()
  liveGoals.value = []
  if (!currentUser.value || !canUseChat.value) return

  const goalsQuery = query(
    collection(db, 'liveGoals'),
    orderBy('createdAt', 'desc'),
    limit(8)
  )

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

const getMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.toDate) return value.toDate().getTime()
  return new Date(value).getTime()
}

const sendMessage = async () => {
  const body = draft.value.trim()
  if (!body || !currentUser.value || !canUseChat.value || isSending.value) return
  if (!isLiveChat.value && !activeUser.value) return
  if (isLiveChat.value && !liveChatActive.value) {
    chatError.value = 'El chat se habilita cuando inicia el live.'
    return
  }

  isSending.value = true
  chatError.value = ''

  try {
    if (isLiveChat.value) {
      await addDoc(collection(db, 'liveChats', LIVE_CHAT_ID, 'messages'), {
        body,
        authorId: currentUser.value.uid,
        author: currentUser.value.displayName || currentUser.value.email || 'Usuario',
        authorImage: currentProfile.value.imageUrl || currentUser.value.photoURL || '',
        createdAt: serverTimestamp()
      })
      await setDoc(doc(db, 'liveChats', LIVE_CHAT_ID), {
        title: 'Chat en live',
        lastMessagePreview: body,
        lastMessageAuthorId: currentUser.value.uid,
        updatedAt: serverTimestamp()
      }, { merge: true })
      draft.value = ''
      return
    }

    await setDoc(doc(db, 'directChats', chatId.value), {
      participants: [currentUser.value.uid, activeUser.value.id],
      participantNames: {
        [currentUser.value.uid]: currentUser.value.displayName || currentUser.value.email || 'Usuario',
        [activeUser.value.id]: activeUser.value.name || activeUser.value.email || 'Usuario'
      },
      updatedAt: serverTimestamp()
    }, { merge: true })

    const messageRef = await addDoc(collection(db, 'directChats', chatId.value, 'messages'), {
      body,
      authorId: currentUser.value.uid,
      author: currentUser.value.displayName || currentUser.value.email || 'Usuario',
      createdAt: serverTimestamp(),
      readBy: {
        [currentUser.value.uid]: true
      },
      seenAt: {
        [currentUser.value.uid]: serverTimestamp()
      }
    })

    await setDoc(doc(db, 'directChats', chatId.value), {
      participants: [currentUser.value.uid, activeUser.value.id],
      participantNames: {
        [currentUser.value.uid]: currentUser.value.displayName || currentUser.value.email || 'Usuario',
        [activeUser.value.id]: activeUser.value.name || activeUser.value.email || 'Usuario'
      },
      lastMessageId: messageRef.id,
      lastMessageAuthorId: currentUser.value.uid,
      lastMessagePreview: body,
      lastReadBy: {
        [currentUser.value.uid]: messageRef.id
      },
      updatedAt: serverTimestamp()
    }, { merge: true })

    draft.value = ''
  } catch (error) {
    console.error(error)
    chatError.value = 'No se pudo enviar. Revisa permisos o intenta abrir de nuevo el chat.'
  } finally {
    isSending.value = false
  }
}

const addLiveGoalLike = async () => {
  const goal = currentLiveGoal.value
  const user = currentUser.value
  if (!goal?.id || !user || !canUseChat.value || !liveChatActive.value) return

  const likesBy = {
    ...(goal.likesBy || {}),
    [user.uid]: Number(goal.likesBy?.[user.uid] || 0) + 1
  }
  const likerProfiles = {
    ...(goal.likerProfiles || {}),
    [user.uid]: {
      name: user.displayName || user.email || 'Usuario',
      imageUrl: currentProfile.value.imageUrl || user.photoURL || ''
    }
  }

  await setDoc(doc(db, 'liveGoals', goal.id), {
    likesBy,
    likerProfiles,
    updatedAt: Date.now()
  }, { merge: true })
}

const markMessagesSeen = async () => {
  if (!open.value || !chatId.value || !currentUser.value || !activeUser.value) return

  const unseen = messages.value.filter(message => (
    message.authorId !== currentUser.value.uid &&
    !message.readBy?.[currentUser.value.uid]
  ))

  await Promise.all(unseen.map(message => setDoc(
    doc(db, 'directChats', chatId.value, 'messages', message.id),
    {
      readBy: {
        [currentUser.value.uid]: true
      },
      seenAt: {
        [currentUser.value.uid]: serverTimestamp()
      }
    },
    { merge: true }
  )))

  const lastMessageId = messages.value[messages.value.length - 1]?.id
  if (lastMessageId) {
    await setDoc(doc(db, 'directChats', chatId.value), {
      lastReadBy: {
        [currentUser.value.uid]: lastMessageId
      }
    }, { merge: true })
  }
}

const getOnlineLabel = (user) => {
  if (!user) return 'Sin conexion'
  const lastActive = getMillis(user.lastActiveAt)
  const recentlyActive = lastActive && Date.now() - lastActive < 120000
  return user.isOnline && recentlyActive ? 'En linea' : 'Sin conexion'
}

const messageStatus = (message) => {
  if (isLiveChat.value) return ''
  if (message.authorId !== currentUser.value?.uid) return ''
  return message.readBy?.[activeUser.value?.id] ? 'Visto' : 'Enviado'
}

const touchPresence = async (isOnline = true) => {
  if (!currentUser.value) return

  await setDoc(doc(db, 'users', currentUser.value.uid), {
    isOnline,
    lastActiveAt: Date.now(),
    updatedAt: Date.now()
  }, { merge: true })
}

const startPresence = () => {
  clearInterval(presenceTimer)
  if (!currentUser.value) return

  touchPresence(true)
  presenceTimer = setInterval(() => {
    touchPresence(true)
  }, 45000)
}

const stopPresence = async () => {
  clearInterval(presenceTimer)
  presenceTimer = null
  await touchPresence(false)
}

const clearConversation = async () => {
  if (isLiveChat.value) return
  if (!chatId.value || !currentUser.value || isClearing.value) return
  if (!window.confirm('Quieres limpiar esta conversacion solo para ti?')) return

  isClearing.value = true

  try {
    const clearedAt = Date.now()
    await setDoc(doc(db, 'directChats', chatId.value), {
      hiddenBefore: {
        [currentUser.value.uid]: clearedAt
      },
      updatedAt: serverTimestamp()
    }, { merge: true })
    hiddenBefore.value = {
      ...hiddenBefore.value,
      [chatId.value]: clearedAt
    }
  } finally {
    isClearing.value = false
  }
}

const playMessageSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    audioContext ||= new AudioContext()
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const start = audioContext.currentTime

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(720, start)
    oscillator.frequency.exponentialRampToValueAtTime(1080, start + 0.09)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.24)
  } catch (error) {
    console.error(error)
  }
}

const subscribeInbox = () => {
  unsubscribeInbox?.()
  inboxReady = false
  previousLastMessageIds = new Map()
  unreadByChat.value = {}
  unreadMessages.value = 0

  if (!currentUser.value || !canUseChat.value) return

  const inboxQuery = query(
    collection(db, 'directChats'),
    where('participants', 'array-contains', currentUser.value.uid)
  )

  unsubscribeInbox = onSnapshot(inboxQuery, (snap) => {
    const nextUnreadByChat = {}
    let nextUnreadTotal = 0

    snap.docs.forEach((item) => {
      const chat = item.data()
      const hiddenAt = chat.hiddenBefore?.[currentUser.value.uid]
      if (hiddenAt) {
        hiddenBefore.value = {
          ...hiddenBefore.value,
          [item.id]: hiddenAt
        }
      }
      const previousId = previousLastMessageIds.get(item.id)
      const nextId = chat.lastMessageId || ''
      const hiddenMillis = getMillis(hiddenAt)
      const updatedMillis = getMillis(chat.updatedAt)
      const isUnread = Boolean(
        nextId &&
        chat.lastMessageAuthorId !== currentUser.value.uid &&
        chat.lastReadBy?.[currentUser.value.uid] !== nextId &&
        (!hiddenMillis || updatedMillis > hiddenMillis)
      )

      if (isUnread) {
        nextUnreadByChat[item.id] = 1
        nextUnreadTotal += 1
      }

      if (
        inboxReady &&
        nextId &&
        previousId &&
        previousId !== nextId &&
        chat.lastMessageAuthorId !== currentUser.value.uid &&
        !(open.value && item.id === chatId.value)
      ) {
        playMessageSound()
      }

      if (nextId) {
        previousLastMessageIds.set(item.id, nextId)
      }
    })

    unreadByChat.value = nextUnreadByChat
    unreadMessages.value = nextUnreadTotal

    inboxReady = true
  })
}

const formatTime = (value) => {
  const date = value?.toDate ? value.toDate() : null
  if (!date) return 'Ahora'

  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleOpenRequest = async (event) => {
  await openChat(event.detail)
}

const handleOpenLiveRequest = async () => {
  await openChat({ mode: 'live' })
}

const updateDockPosition = () => {
  dockRaised.value = Boolean(
    document.querySelector('.user-panel, .panel, .animate-slide-left')
  )
  communityDock.value = Boolean(document.querySelector('.community-switcher-shell, .community-quick-shell'))
}

const updateViewportVars = () => {
  const viewport = window.visualViewport
  const height = viewport?.height || window.innerHeight
  const keyboardOffset = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0

  document.documentElement.style.setProperty('--direct-chat-vvh', `${Math.round(height)}px`)
  document.documentElement.style.setProperty('--direct-chat-keyboard', `${Math.round(keyboardOffset)}px`)
}

const lockPageScroll = () => {
  previousBodyOverflow = document.body.style.overflow
  previousBodyOverscroll = document.body.style.overscrollBehavior
  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
}

const unlockPageScroll = () => {
  document.body.style.overflow = previousBodyOverflow
  document.body.style.overscrollBehavior = previousBodyOverscroll
}

watch(open, async (isOpen) => {
  if (isOpen) {
    window.dispatchEvent(new CustomEvent('floating-panel-opened', {
      detail: { source: 'chat' }
    }))
    updateViewportVars()
    lockPageScroll()
    await nextTick()
    scrollToLatestMessage()
    if (!isLiveChat.value) await markMessagesSeen()
    return
  }

  unlockPageScroll()
})

watch(activeUser, markMessagesSeen)

watch(chatMode, async (mode) => {
  if (mode !== 'live') return
  subscribeLiveMessages()
  await nextTick()
  scrollToLatestMessage()
})

watch(() => visibleMessages.value.length, async () => {
  if (!open.value) return
  await nextTick()
  scrollToLatestMessage()
})

watch(canUseChat, (value) => {
  document.body.classList.toggle('direct-chat-available', Boolean(value))
  if (!value) open.value = false
  if (value) {
    subscribeLiveChatInfo()
    subscribeLiveGoals()
  } else {
    unsubscribeLiveChatInfo?.()
    unsubscribeLiveGoals?.()
  }
}, { immediate: true })

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (currentUser.value && currentUser.value.uid !== user?.uid) {
      await stopPresence()
    }
    currentUser.value = user
    await loadProfile(user)
    subscribeUsers()
    startPresence()
    subscribeInbox()
    subscribeLiveChatInfo()
    subscribeLiveGoals()
  })

  window.addEventListener('open-direct-chat', handleOpenRequest)
  window.addEventListener('open-live-chat', handleOpenLiveRequest)
  window.addEventListener('floating-panel-opened', handleExternalPanelOpen)
  window.addEventListener('beforeunload', () => {
    touchPresence(false)
  })
  window.addEventListener('resize', updateViewportVars)
  window.visualViewport?.addEventListener('resize', updateViewportVars)
  window.visualViewport?.addEventListener('scroll', updateViewportVars)

  dockObserver = new MutationObserver(updateDockPosition)
  dockObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  })
  updateDockPosition()
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeMessages?.()
  unsubscribeLiveMessages?.()
  unsubscribeLiveChatInfo?.()
  unsubscribeLiveGoals?.()
  unsubscribeInbox?.()
  unsubscribeUsers?.()
  stopPresence()
  window.removeEventListener('open-direct-chat', handleOpenRequest)
  window.removeEventListener('open-live-chat', handleOpenLiveRequest)
  window.removeEventListener('floating-panel-opened', handleExternalPanelOpen)
  window.removeEventListener('resize', updateViewportVars)
  window.visualViewport?.removeEventListener('resize', updateViewportVars)
  window.visualViewport?.removeEventListener('scroll', updateViewportVars)
  dockObserver?.disconnect()
  if (open.value) unlockPageScroll()
  document.body.classList.remove('direct-chat-available')
  document.documentElement.style.removeProperty('--direct-chat-vvh')
  document.documentElement.style.removeProperty('--direct-chat-keyboard')
})
</script>

<template>
  <button
    v-if="canUseChat"
    class="direct-chat-fab"
    :class="{ raised: dockRaised, community: communityDock }"
    type="button"
    aria-label="Abrir mensajes privados"
    @click="openChat()"
  >
    <i class="fas fa-message"></i>
    <strong v-if="unreadMessages">{{ unreadMessages }}</strong>
  </button>

  <Transition name="chat-pop">
    <section
      v-if="open && canUseChat"
      class="direct-chat-panel"
      :class="{ raised: dockRaised, community: communityDock, 'has-active-chat': activeUser || isLiveChat, 'is-live-chat': isLiveChat }"
    >
      <header class="direct-chat-head">
        <button
          v-if="activeUser || isLiveChat"
          class="direct-back-btn"
          type="button"
          aria-label="Volver a conversaciones"
          @click="backToUsers"
        >
          <i class="fas fa-arrow-left"></i>
        </button>

          <div class="direct-chat-title" :class="{ active: activeUser || isLiveChat }">
            <img v-if="activeUser && profileIcon(activeUser)" :src="profileIcon(activeUser)" alt="" class="direct-chat-title-avatar profile-icon-img" />
            <span v-else-if="activeUser" class="direct-chat-title-avatar">
              {{ (activeUser.name || activeUser.email || 'U').charAt(0).toUpperCase() }}
            </span>
            <span v-else-if="isLiveChat" class="direct-chat-title-avatar live">
              <i class="fas fa-tower-broadcast"></i>
            </span>
            <div>
              <strong>{{ isLiveChat ? 'Chat en live' : (activeUser ? (activeUser.name || activeUser.email || 'Usuario') : 'Mensajes') }}</strong>
              <span v-if="isLiveChat">{{ liveChatActive ? 'Conversacion visible para todos' : 'Disponible cuando inicia el live' }}</span>
              <span v-else-if="activeUser">Chat privado - {{ activeUserStatus }}</span>
              <span v-else>Elige una persona</span>
            </div>
          </div>

        <div class="direct-chat-head-actions">
          <button
            v-if="activeUser && !isLiveChat"
            class="direct-clear-btn"
            type="button"
            :disabled="isClearing"
            @click="clearConversation"
          >
            <i class="fas fa-broom"></i>
          </button>
          <button class="panel-close-btn" type="button" @click="closeChat">x</button>
        </div>
      </header>

      <div class="direct-chat-body" :class="{ 'has-active-chat': activeUser || isLiveChat }">
        <aside class="direct-chat-users">
          <button
            class="live-chat-entry"
            :class="{ active: isLiveChat }"
            type="button"
            @click="openLiveChat"
          >
            <span><i class="fas fa-tower-broadcast"></i></span>
            <div>
              <strong>Chat en live</strong>
              <small>Todos los mensajes del directo</small>
            </div>
            <i class="fas fa-chevron-right user-arrow"></i>
          </button>

          <button
            v-for="user in users"
            :key="user.id"
            :class="{ active: activeUser?.id === user.id, unread: unreadForUser(user) }"
            type="button"
            @click="selectUser(user)"
          >
            <img v-if="profileIcon(user)" :src="profileIcon(user)" alt="" class="profile-icon-img" />
            <span v-else>{{ (user.name || user.email || 'U').charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ user.name || user.email || 'Usuario' }}</strong>
              <small :class="{ online: getOnlineLabel(user) === 'En linea' }">
                {{ getOnlineLabel(user) }}
              </small>
            </div>
            <strong v-if="unreadForUser(user)" class="user-unread-pill">
              {{ unreadForUser(user) }} nuevo{{ unreadForUser(user) === 1 ? '' : 's' }}
            </strong>
            <i class="fas fa-chevron-right user-arrow"></i>
          </button>
        </aside>

        <main class="direct-chat-room">
          <div v-if="isLiveChat && currentLiveGoal" class="direct-live-goal-chip">
            <span><i class="fas fa-heart"></i></span>
            <strong>{{ currentLiveGoal.title }}</strong>
            <em>{{ currentLiveGoal.current }} / {{ currentLiveGoal.target }}</em>
            <i :style="{ width: currentLiveGoal.progress + '%' }"></i>
          </div>

          <div v-if="activeUser || isLiveChat" ref="listRef" class="direct-message-list" :class="{ live: isLiveChat }">
            <article
              v-for="message in visibleMessages"
              :key="message.id"
              :class="{ mine: message.authorId === currentUser?.uid }"
            >
              <small>
                {{ message.author }} - {{ formatTime(message.createdAt) }}
                <span v-if="messageStatus(message)"> - {{ messageStatus(message) }}</span>
              </small>
              <p>{{ message.body }}</p>
            </article>

            <div v-if="!visibleMessages.length" class="direct-chat-empty">
              {{ isLiveChat ? (liveChatActive ? 'Todavia no hay mensajes en este live.' : 'El chat se abre cuando el live inicia.') : 'Todavia no hay mensajes con esta persona.' }}
            </div>
          </div>

          <div v-else class="direct-chat-empty">
            Selecciona un usuario para enviar un mensaje privado.
          </div>

          <form class="direct-chat-composer" :class="{ 'has-live-like': isLiveChat && currentLiveGoal }" @submit.prevent="sendMessage">
            <p v-if="chatError" class="direct-chat-error">{{ chatError }}</p>
            <input
              v-model="draft"
              :disabled="(!activeUser && !isLiveChat) || (isLiveChat && !liveChatActive) || isSending"
              maxlength="240"
              :placeholder="isLiveChat ? (liveChatActive ? 'Escribe en el chat del live...' : 'Esperando que inicie el live...') : 'Escribe un mensaje privado...'"
            />
            <button
              v-if="isLiveChat && currentLiveGoal"
              class="live-like-composer-btn"
              type="button"
              :disabled="!liveChatActive"
              @click="addLiveGoalLike"
            >
              <i class="fas fa-heart"></i>
            </button>
            <button :disabled="!draft.trim() || (!activeUser && !isLiveChat) || (isLiveChat && !liveChatActive) || isSending">
              <i class="fas fa-paper-plane"></i>
            </button>
          </form>
        </main>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.direct-chat-fab {
  align-items: center;
  background:
    linear-gradient(145deg, rgba(9, 13, 31, 0.98), rgba(22, 15, 42, 0.96)) padding-box,
    linear-gradient(135deg, rgba(34, 211, 238, 0.72), rgba(168, 85, 247, 0.76), rgba(236, 72, 153, 0.72)) border-box;
  border: 1px solid transparent;
  border-radius: 999px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), 0 0 24px rgba(168, 85, 247, 0.26);
  color: #f8fafc;
  display: flex;
  height: 54px;
  justify-content: center;
  position: fixed;
  right: var(--galaxy-dock-chat-right, 22px);
  bottom: var(--galaxy-dock-bottom, 22px);
  width: 54px;
  transition: transform 0.2s ease;
  z-index: 266;
}

.direct-chat-fab strong {
  align-items: center;
  background: #ef4444;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 10px;
  font-weight: 900;
  height: 20px;
  justify-content: center;
  min-width: 20px;
  padding: 0 5px;
  position: absolute;
  right: -4px;
  top: -4px;
}

.direct-chat-fab:hover {
  transform: scale(1.08);
}

.direct-chat-fab.raised {
  bottom: 84px;
}

.direct-chat-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  bottom: 88px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
  color: #111827;
  overflow: hidden;
  position: fixed;
  right: 22px;
  width: min(640px, calc(100vw - 28px));
  z-index: 270;
}

.direct-chat-panel.raised {
  bottom: 150px;
}

.direct-chat-head {
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 14px;
}

.direct-chat-title {
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  gap: 10px;
  min-width: 0;
}

.direct-chat-title > div {
  flex: 1 1 auto;
  min-width: 0;
}

.direct-chat-title-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: none;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  height: 38px;
  justify-content: center;
  object-fit: cover;
  overflow: hidden;
  width: 38px;
}

.direct-chat-title-avatar.live {
  background: linear-gradient(135deg, #ef4444, #ec4899);
  display: flex;
}

.direct-chat-head-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.direct-clear-btn {
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #64748b;
  display: flex;
  height: 40px;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
  width: 40px;
}

.direct-back-btn {
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  display: none;
  flex: 0 0 auto;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.direct-clear-btn:hover:not(:disabled) {
  background: #fff1f2;
  color: #e11d48;
}

.direct-clear-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.direct-chat-head strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.direct-chat-head span {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 2px;
}

.direct-chat-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 430px;
  min-height: 0;
}

.direct-chat-users {
  align-content: start;
  border-right: 1px solid #e5e7eb;
  display: grid;
  gap: 8px;
  grid-auto-rows: min-content;
  max-height: none;
  overflow-y: auto;
  padding: 12px;
}

.direct-chat-users button {
  align-items: center;
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  min-height: 58px;
  padding: 8px 10px;
  position: relative;
  text-align: left;
  width: 100%;
}

.direct-chat-users button.active,
.direct-chat-users button:hover {
  background: #f5f3ff;
}

.direct-chat-users .live-chat-entry {
  background: linear-gradient(135deg, #fff1f2, #f5f3ff);
  border: 1px solid #ede9fe;
}

.direct-chat-users .live-chat-entry span {
  background: linear-gradient(135deg, #ef4444, #ec4899);
  color: #ffffff;
}

.direct-chat-users .live-chat-entry small {
  color: #7c3aed;
}

.direct-chat-users button.unread {
  background: #fff7ed;
  box-shadow: inset 3px 0 0 #f59e0b;
}

.direct-chat-users img,
.direct-chat-users span {
  align-items: center;
  background: #ffffff;
  border-radius: 999px;
  color: #7c3aed;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  height: 42px;
  justify-content: center;
  object-fit: cover;
  overflow: hidden;
  width: 42px;
}

.direct-chat-users strong {
  color: #111827;
  display: block;
  font-size: 12px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.direct-chat-users small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-top: 2px;
}

.direct-chat-users small.online {
  color: #16a34a;
}

.user-unread-pill {
  background: #f59e0b;
  border-radius: 999px;
  color: #ffffff;
  font-size: 9px;
  font-weight: 950;
  padding: 4px 7px;
  position: absolute;
  right: 8px;
  top: 8px;
  text-transform: uppercase;
}

.user-arrow {
  color: #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0.6;
  transition: opacity 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.direct-chat-users button:hover .user-arrow {
  color: #7c3aed;
  opacity: 1;
  transform: translateX(4px);
}

.direct-chat-room {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.direct-chat-panel.is-live-chat .direct-chat-room {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.direct-live-goal-chip {
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.98), rgba(245, 243, 255, 0.98));
  border-bottom: 1px solid #ede9fe;
  display: grid;
  gap: 8px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  min-height: 44px;
  overflow: hidden;
  padding: 8px 12px;
  position: relative;
}

.direct-live-goal-chip span {
  align-items: center;
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.direct-live-goal-chip strong {
  color: #111827;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.direct-live-goal-chip em {
  color: #7c3aed;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  white-space: nowrap;
}

.direct-live-goal-chip > i:last-child {
  background: linear-gradient(90deg, #9333ea, #ec4899, #f59e0b);
  bottom: 0;
  display: block;
  height: 3px;
  left: 0;
  position: absolute;
  transition: width 0.3s ease;
}

.direct-message-list {
  align-content: start;
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
}

.direct-message-list article {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  max-width: 82%;
  padding: 10px 12px;
}

.direct-message-list article.mine {
  background: #f5f3ff;
  border-color: #ddd6fe;
  justify-self: end;
}

.direct-message-list.live article {
  max-width: 92%;
}

.direct-message-list small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-bottom: 4px;
}

.direct-message-list p {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.direct-chat-empty {
  align-self: center;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  justify-self: center;
  max-width: 240px;
  padding: 18px;
  text-align: center;
}

.direct-chat-composer {
  border-top: 1px solid #e5e7eb;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 42px;
  padding: 12px;
}

.direct-chat-composer.has-live-like {
  grid-template-columns: minmax(0, 1fr) 42px 42px;
}

.direct-chat-error {
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  border-radius: 10px;
  color: #e11d48;
  font-size: 11px;
  font-weight: 900;
  grid-column: 1 / -1;
  line-height: 1.35;
  padding: 8px 10px;
}

.direct-chat-composer input {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  outline: none;
  padding: 0 12px;
}

.direct-chat-composer button {
  align-items: center;
  background: #7c3aed;
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
}

.direct-chat-composer .live-like-composer-btn {
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  box-shadow: 0 10px 20px rgba(236, 72, 153, 0.22);
}

.direct-chat-composer button:disabled,
.direct-chat-composer input:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.chat-pop-enter-active,
.chat-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.chat-pop-enter-from,
.chat-pop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (min-width: 681px) {
  .direct-chat-body:not(.has-active-chat) {
    grid-template-columns: 1fr;
    height: 360px;
  }

  .direct-chat-body:not(.has-active-chat) .direct-chat-users {
    border-right: 0;
  }

  .direct-chat-body:not(.has-active-chat) .direct-chat-room {
    display: none;
  }
}

@media (max-width: 859px) {
  .direct-chat-fab {
    bottom: var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom)));
  }

  .direct-chat-fab.raised {
    bottom: var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom)));
  }

  .direct-chat-fab.community {
    bottom: var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom)));
  }

  .direct-chat-panel {
    bottom: max(92px, calc(var(--direct-chat-keyboard, 0px) + 92px + env(safe-area-inset-bottom)));
    height: auto;
    left: 10px;
    max-height: none;
    right: 10px;
    top: calc(var(--public-nav-offset, 72px) + 10px);
    width: auto;
  }

  .direct-chat-panel.has-active-chat {
    height: auto;
    max-height: none;
  }

  .direct-chat-panel.is-live-chat.has-active-chat {
    height: auto;
    max-height: none;
  }

  .direct-chat-panel.raised {
    bottom: max(92px, calc(var(--direct-chat-keyboard, 0px) + 92px + env(safe-area-inset-bottom)));
  }

  .direct-chat-panel.community {
    bottom: max(92px, calc(var(--direct-chat-keyboard, 0px) + 92px + env(safe-area-inset-bottom)));
    height: auto;
    max-height: none;
  }

  .direct-chat-panel.community.is-live-chat {
    height: auto;
    max-height: none;
  }

  :global(body.community-quick-nav-active) .direct-chat-panel {
    bottom: max(92px, calc(var(--direct-chat-keyboard, 0px) + 92px + env(safe-area-inset-bottom)));
    height: auto;
    max-height: none;
  }

  :global(body.community-quick-nav-active) .direct-chat-panel.is-live-chat {
    height: auto;
    max-height: none;
  }

  :global(body.global-live-expanded) .direct-chat-panel.is-live-chat.has-active-chat {
    top: calc(var(--public-nav-offset, 72px) + 44dvh + 18px);
  }

  .direct-back-btn {
    display: inline-flex;
  }

  .direct-chat-head {
    min-height: 64px;
    padding: 10px;
  }

  .direct-chat-title-avatar {
    display: flex;
  }

  .direct-chat-title.active strong {
    font-size: 13px;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .direct-chat-head span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .direct-chat-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr);
    height: calc(100% - 65px);
    min-height: 0;
    overflow: hidden;
  }

  .direct-chat-users {
    align-content: start;
    border-right: 0;
    border-bottom: 0;
    display: grid;
    gap: 8px;
    grid-auto-rows: min-content;
    height: 100%;
    max-height: none;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 12px;
  }

  .direct-chat-body.has-active-chat .direct-chat-users {
    display: none;
  }

  .direct-chat-users button {
    min-height: 56px;
    width: 100%;
  }

  .direct-chat-room {
    height: 100%;
    min-height: 0;
  }

  .direct-chat-body:not(.has-active-chat) .direct-chat-room {
    display: none;
  }

  .direct-message-list {
    max-height: none;
    min-height: 0;
    overscroll-behavior: contain;
  }

  .direct-chat-composer {
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }

  .direct-live-goal-chip {
    min-height: 40px;
    padding: 7px 10px;
  }

}

@media (max-width: 420px) {
  .direct-chat-panel {
    left: 6px;
    right: 6px;
    top: calc(var(--public-nav-offset, 72px) + 8px);
  }

  .direct-chat-panel.has-active-chat {
    height: auto;
    max-height: none;
  }

  .direct-chat-panel.is-live-chat.has-active-chat {
    height: auto;
    max-height: none;
  }

  .direct-chat-panel.community,
  .direct-chat-panel.community.has-active-chat {
    height: auto;
    max-height: none;
  }

  .direct-chat-panel.community.is-live-chat,
  .direct-chat-panel.community.is-live-chat.has-active-chat {
    height: auto;
    max-height: none;
  }

  :global(body.global-live-expanded) .direct-chat-panel.is-live-chat.has-active-chat {
    top: calc(var(--public-nav-offset, 72px) + 44dvh + 16px);
  }

  .direct-chat-body {
    height: calc(100% - 57px);
  }

  .direct-clear-btn,
  .direct-back-btn,
  .panel-close-btn {
    height: 36px;
    width: 36px;
  }

  .direct-chat-head-actions {
    gap: 6px;
  }

  .direct-chat-composer {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 40px;
    padding: 10px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .direct-chat-composer.has-live-like {
    grid-template-columns: minmax(0, 1fr) 40px 40px;
  }

  .direct-chat-composer button {
    height: 40px;
  }
}
</style>
