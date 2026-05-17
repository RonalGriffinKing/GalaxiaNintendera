<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  closeFloatingPlayback,
  playerState,
  setCurrentTime,
  setPlaybackStatus,
  shouldShowFloatingPlayer
} from '@/services/playerState'

const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'
const YOUTUBE_SEARCH_API = 'https://www.googleapis.com/youtube/v3/search'

const router = useRouter()
const route = useRoute()
const liveVideo = ref(null)
const apiChecked = ref(false)
const apiError = ref(false)
const expanded = ref(false)
const minimized = ref(false)
const closed = ref(false)
const soundEnabled = ref(false)
const isLoading = ref(false)
const activeMedia = ref(null)
const activeLiveGoal = ref(null)
const playerFrame = ref(null)

let livePollTimer = null

const youtubeChannelId = computed(() => import.meta.env.VITE_YOUTUBE_CHANNEL_ID || '')
const youtubeApiKey = computed(() => import.meta.env.VITE_YOUTUBE_API_KEY || '')
const youtubeHandle = computed(() => String(import.meta.env.VITE_YOUTUBE_HANDLE || 'GalaxiaNintendera').replace(/^@+/, ''))
const youtubeChannelUrl = computed(() => `https://www.youtube.com/@${youtubeHandle.value}`)
const hasLiveConfig = computed(() => Boolean(youtubeChannelId.value))
const isOfficialCommunityRoute = computed(() => route.path === '/comunidad' && String(route.query.id || '') === OFFICIAL_COMMUNITY_ID)
const shouldShow = computed(() => {
  if (closed.value) return false
  return shouldShowFloatingPlayer.value
})
const isBubbleOnly = computed(() => playerState.isFloatingMinimized && !expanded.value)
const currentTitle = computed(() => playerState.currentVideo?.title || activeMedia.value?.title || liveVideo.value?.title || 'Directo oficial de Galaxia Nintendera')
const currentThumbnail = computed(() => playerState.currentVideo?.thumbnail || activeMedia.value?.thumbnail || liveVideo.value?.thumbnail || '/src/iconos/Banner.png')
const liveEmbedSrc = computed(() => {
  if (playerState.currentVideo?.id) {
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      playsinline: '1',
      enablejsapi: '1'
    })
    const startAt = Math.max(0, Math.floor(Number(playerState.currentVideo.startedAt || playerState.currentTime || 0)))
    if (startAt > 0) params.set('start', String(startAt))
    return `https://www.youtube.com/embed/${playerState.currentVideo.id}?${params.toString()}`
  }

  if (!youtubeChannelId.value) return ''
  const params = new URLSearchParams({
    autoplay: soundEnabled.value ? '1' : '0',
    mute: soundEnabled.value ? '0' : '1',
    playsinline: '1',
    rel: '0'
  })

  if (liveVideo.value?.id) {
    return `https://www.youtube.com/embed/${liveVideo.value.id}?${params.toString()}`
  }

  params.set('channel', youtubeChannelId.value)
  return `https://www.youtube.com/embed/live_stream?${params.toString()}`
})

const fetchLiveStatus = async () => {
  if (!youtubeChannelId.value || !youtubeApiKey.value || isLoading.value) return

  isLoading.value = true
  apiError.value = false

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId: youtubeChannelId.value,
      eventType: 'live',
      type: 'video',
      maxResults: '1',
      key: youtubeApiKey.value
    })
    const response = await fetch(`${YOUTUBE_SEARCH_API}?${params.toString()}`)
    if (!response.ok) throw new Error('youtube-live-check-failed')
    const data = await response.json()
    const item = data.items?.[0]

    liveVideo.value = item ? {
      id: item.id?.videoId || '',
      title: item.snippet?.title || '',
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || ''
    } : null
    apiChecked.value = true
  } catch (error) {
    console.error(error)
    apiError.value = true
  } finally {
    isLoading.value = false
  }
}

const startLivePolling = () => {
  window.clearInterval(livePollTimer)
  livePollTimer = null
  if (!youtubeChannelId.value || !youtubeApiKey.value) return
  fetchLiveStatus()
  livePollTimer = window.setInterval(fetchLiveStatus, 90000)
}

const openCommunityLive = () => {
  expanded.value = true
  minimized.value = false
  closed.value = false
  soundEnabled.value = true
  const theaterQuery = window.matchMedia?.('(max-width: 859px)').matches ? '&theater=1' : ''

  if (playerState.currentVideo?.id) {
    const mediaId = playerState.currentVideo.id
    activeMedia.value = null
    closeFloatingPlayback()
    expanded.value = false
    closed.value = true
    router.push(`/comunidad?id=${OFFICIAL_COMMUNITY_ID}&v=${encodeURIComponent(mediaId)}${theaterQuery}`)
    return
  }

  router.push(`/comunidad?id=${OFFICIAL_COMMUNITY_ID}&live=1&reload=${Date.now()}${theaterQuery}`)
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  expanded.value = true
}

const minimizePlayer = () => {
  playerState.isFloatingMinimized = true
  expanded.value = false
}

const closePlayer = () => {
  closeFloatingPlayback()
  activeMedia.value = null
  closed.value = true
  expanded.value = false
}

const reopenPlayer = () => {
  closed.value = false
  playerState.isFloatingMinimized = false
  expanded.value = true
}

const openLiveChat = () => {
  openCommunityLive()
}

const postPlayerCommand = (func) => {
  playerFrame.value?.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func,
    args: []
  }), '*')
}

const pauseFloatingPlayer = () => {
  postPlayerCommand('pauseVideo')
  setPlaybackStatus('paused')
}

const handleMediaPlay = (event) => {
  const detail = event.detail || {}
  if (!detail.id) return
  activeMedia.value = {
    id: detail.id,
    title: detail.title || 'Video de Galaxia Nintendera',
    thumbnail: detail.thumbnail || '/src/iconos/Banner.png',
    url: detail.url || youtubeChannelUrl.value
  }
  closed.value = false
  expanded.value = !playerState.isFloatingMinimized
}

const handleMediaStop = () => {
  activeMedia.value = null
  closeFloatingPlayback()
  expanded.value = false
  closed.value = true
}

const handleLiveGoalContext = (event) => {
  activeLiveGoal.value = event.detail || null
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

onMounted(() => {
  expanded.value = !playerState.isFloatingMinimized
  window.addEventListener('galaxy-media-play', handleMediaPlay)
  window.addEventListener('galaxy-media-stop', handleMediaStop)
  window.addEventListener('galaxy-live-goal-context', handleLiveGoalContext)
  window.addEventListener('message', handleYoutubePlayerMessage)
})

watch([youtubeChannelId, youtubeApiKey], startLivePolling, { immediate: true })

watch([shouldShow, expanded, isBubbleOnly], ([visible, isExpanded, bubbleOnly]) => {
  document.body.classList.toggle('global-live-expanded', Boolean(visible && isExpanded && !bubbleOnly))
  document.body.classList.toggle('global-live-minimized', Boolean(visible && bubbleOnly))
}, { immediate: true })

onUnmounted(() => {
  document.body.classList.remove('global-live-expanded', 'global-live-minimized')
  window.removeEventListener('galaxy-media-play', handleMediaPlay)
  window.removeEventListener('galaxy-media-stop', handleMediaStop)
  window.removeEventListener('galaxy-live-goal-context', handleLiveGoalContext)
  window.removeEventListener('message', handleYoutubePlayerMessage)
  window.clearInterval(livePollTimer)
})
</script>

<template>
  <Teleport to=".public-live-slot" :disabled="!isBubbleOnly">
    <Transition name="global-live">
      <section v-if="shouldShow" class="global-live-bubble" :class="{ expanded, minimized: isBubbleOnly }" aria-label="Directo en vivo">
        <button v-if="!isBubbleOnly" type="button" class="global-live-minimize" aria-label="Minimizar live" @click="minimizePlayer">
          <i class="fas fa-minus"></i>
        </button>

        <button v-if="!isBubbleOnly" type="button" class="global-live-close" aria-label="Cerrar live" @click="closePlayer">
          <i class="fas fa-xmark"></i>
        </button>

        <div v-if="isBubbleOnly" class="global-live-mini">
          <button type="button" class="global-live-mini-title" aria-label="Abrir video" @click="reopenPlayer">
            <i class="fas fa-play"></i>
            <b>En vivo</b>
            <span>{{ isBubbleOnly ? 'Vivo' : currentTitle }}</span>
          </button>
          <button type="button" aria-label="Pausar video" @click="pauseFloatingPlayer">
            <i class="fas fa-pause"></i>
          </button>
          <button type="button" aria-label="Cerrar video" @click="closePlayer">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <button v-else type="button" class="global-live-preview" @click="reopenPlayer">
          <span class="live-status"><i class="fas fa-circle"></i> Reproduciendo</span>
          <img v-if="!expanded" :src="currentThumbnail" alt="" />
          <div v-if="!expanded">
            <strong>{{ currentTitle }}</strong>
            <small>Toca para continuar viendo</small>
          </div>
        </button>

        <div v-if="liveEmbedSrc && (expanded || isBubbleOnly)" class="global-live-player" :class="{ 'visually-minimized': isBubbleOnly }">
          <iframe
            v-if="liveEmbedSrc"
            ref="playerFrame"
            :src="liveEmbedSrc"
            title="Video de Galaxia Nintendera"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>

        <button v-if="activeLiveGoal && !isBubbleOnly" type="button" class="global-live-goal" @click="openCommunityLive">
          <i :class="activeLiveGoal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
          <span>
            <strong>{{ activeLiveGoal.title }}</strong>
            <small>{{ activeLiveGoal.current }} / {{ activeLiveGoal.target }} {{ activeLiveGoal.type === 'mission' ? 'pasos' : 'likes' }}</small>
          </span>
          <em :style="{ width: `${activeLiveGoal.progress || 0}%` }"></em>
        </button>

        <div v-if="!isBubbleOnly" class="global-live-actions">
          <button v-if="!playerState.currentVideo" type="button" @click="toggleSound">
            <i :class="soundEnabled ? 'fas fa-volume-high' : 'fas fa-volume-xmark'"></i>
            {{ soundEnabled ? 'Sonando' : 'Sonido' }}
          </button>
          <button type="button" class="primary" @click="openCommunityLive">
            <i class="fas fa-up-right-and-down-left-from-center"></i>
            Ver grande
          </button>
          <button type="button" class="chat" @click="openLiveChat">
            <i class="fas fa-message"></i>
            Chat
          </button>
          <a :href="playerState.currentVideo?.url || youtubeChannelUrl" target="_blank" rel="noreferrer">
            <i class="fab fa-youtube"></i>
          </a>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.global-live-bubble {
  background: rgba(8, 12, 30, 0.94);
  border: 1px solid rgba(216, 180, 254, 0.24);
  border-radius: 22px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  color: #ffffff;
  display: grid;
  gap: 10px;
  padding: 12px;
  position: fixed;
  right: 20px;
  top: calc(var(--public-nav-offset, 72px) + 14px);
  width: min(360px, calc(100vw - 28px));
  z-index: 252;
}

.global-live-bubble.expanded {
  width: min(430px, calc(100vw - 28px));
}

.global-live-bubble.minimized {
  animation: liveBorderPulse 3.2s linear infinite;
  background: transparent;
  border: 0;
  border-radius: 999px;
  box-shadow: none;
  display: inline-flex;
  gap: 0;
  padding: 0;
  position: static;
  width: auto;
  z-index: 1;
}

@keyframes liveBorderPulse {
  0% {
    border-color: rgba(34, 211, 238, 0.72);
    box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.3), 0 18px 42px rgba(34, 211, 238, 0.18);
  }
  50% {
    border-color: rgba(236, 72, 153, 0.78);
    box-shadow: 0 0 0 1px rgba(236, 72, 153, 0.34), 0 18px 42px rgba(236, 72, 153, 0.22);
  }
  100% {
    border-color: rgba(250, 204, 21, 0.78);
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.3), 0 18px 42px rgba(250, 204, 21, 0.16);
  }
}

.global-live-mini {
  align-items: center;
  color: #ffffff;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 38px 38px;
}

.global-live-bubble.minimized .global-live-mini {
  display: block;
}

.global-live-bubble.minimized .global-live-mini button:not(.global-live-mini-title) {
  display: none;
}

.global-live-mini button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-weight: 950;
  height: 38px;
  justify-content: center;
}

.global-live-mini-title {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.88), rgba(236, 72, 153, 0.78)) !important;
  gap: 8px;
  min-width: 0;
  padding: 0 12px;
  position: relative;
}

.global-live-bubble.minimized .global-live-mini-title {
  animation: liveIslandGlow 2.8s ease-in-out infinite;
  background:
    linear-gradient(#070a18, #070a18) padding-box,
    linear-gradient(135deg, #22d3ee, #a855f7, #ec4899, #facc15) border-box !important;
  border: 1px solid transparent;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.34), 0 0 20px rgba(168, 85, 247, 0.2);
  gap: 7px;
  height: 34px;
  min-width: 92px;
  overflow: visible;
  padding: 0 10px;
  width: 92px;
}

@keyframes liveIslandGlow {
  0%, 100% {
    filter: saturate(1);
    transform: translateY(0);
  }
  50% {
    filter: saturate(1.3);
    transform: translateY(-1px);
  }
}

.global-live-mini-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-live-mini-title b {
  background: #ef4444;
  border: 2px solid #050816;
  border-radius: 999px;
  color: #ffffff;
  font-size: 8px;
  font-weight: 950;
  line-height: 1;
  padding: 4px 5px;
  position: absolute;
  right: -6px;
  text-transform: uppercase;
  top: -8px;
}

.global-live-bubble.minimized .global-live-mini-title b {
  display: none;
}

.global-live-bubble.minimized .global-live-mini-title i {
  font-size: 13px;
}

.global-live-bubble.minimized .global-live-mini-title span {
  display: inline;
  font-size: 10px;
  font-weight: 950;
  max-width: none;
  text-transform: uppercase;
}

.global-live-minimize,
.global-live-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #e5e7eb;
  display: flex;
  height: 28px;
  justify-content: center;
  position: absolute;
  right: 10px;
  top: 10px;
  width: 28px;
  z-index: 2;
}

.global-live-minimize {
  right: 44px;
}

.global-live-close {
  right: 10px;
}

.global-live-preview {
  display: grid;
  gap: 10px;
  padding-right: 30px;
  text-align: left;
}

.global-live-preview img {
  aspect-ratio: 16 / 9;
  border-radius: 15px;
  object-fit: cover;
  width: 100%;
}

.live-status {
  align-items: center;
  background: rgba(239, 68, 68, 0.18);
  border-radius: 999px;
  color: #fecaca;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 8px;
  justify-self: start;
  padding: 7px 10px;
  text-transform: uppercase;
}

.live-status i {
  color: #ef4444;
  font-size: 8px;
}

.global-live-preview strong {
  color: #ffffff;
  display: block;
  font-size: 15px;
  font-weight: 950;
  line-height: 1.15;
}

.global-live-preview small {
  color: #cbd5e1;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 4px;
}

.global-live-player {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 16px;
  overflow: hidden;
}

.global-live-player iframe {
  border: 0;
  height: 100%;
  width: 100%;
}

.global-live-player.visually-minimized {
  height: 1px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  width: 1px;
}

.global-live-goal {
  align-items: center;
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(244, 114, 182, 0.24);
  border-radius: 14px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 34px minmax(0, 1fr);
  min-height: 48px;
  overflow: hidden;
  padding: 8px 10px;
  position: relative;
  text-align: left;
}

.global-live-goal > i {
  align-items: center;
  background: linear-gradient(135deg, #ec4899, #f59e0b);
  border-radius: 999px;
  display: flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.global-live-goal strong,
.global-live-goal small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-live-goal strong {
  font-size: 12px;
  font-weight: 950;
}

.global-live-goal small {
  color: #fde68a;
  font-size: 10px;
  font-weight: 900;
  margin-top: 2px;
}

.global-live-goal em {
  background: linear-gradient(90deg, #9333ea, #ec4899, #f59e0b);
  bottom: 0;
  height: 3px;
  left: 0;
  position: absolute;
}

.global-live-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr)) 42px;
}

.global-live-actions button,
.global-live-actions a {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 40px;
  padding: 0 10px;
}

.global-live-actions button.primary {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: transparent;
}

.global-live-actions button.chat {
  padding: 0 8px;
}

.global-live-actions a {
  color: #ef4444;
  font-size: 16px;
  padding: 0;
}

.global-live-enter-active,
.global-live-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.global-live-enter-from,
.global-live-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

@media (max-width: 859px) {
  .global-live-bubble {
    bottom: auto;
    max-height: calc(44dvh - 10px);
    overflow-y: auto;
    top: calc(var(--public-nav-offset, 72px) + 12px);
    left: 12px;
    right: 12px;
    width: auto;
  }

  .global-live-bubble.expanded {
    width: auto;
  }

  .global-live-bubble.expanded .global-live-player {
    aspect-ratio: 16 / 8.4;
  }

  .global-live-bubble.expanded .global-live-actions {
    grid-template-columns: repeat(3, minmax(0, 1fr)) 42px;
  }

  .global-live-bubble.minimized {
    max-height: none;
    overflow: visible;
    transform: none;
    width: auto;
    z-index: 1;
  }

  .global-live-bubble.minimized .global-live-mini {
    display: block;
  }

  .global-live-bubble.minimized .global-live-mini button:not(.global-live-mini-title) {
    display: none;
  }

  .global-live-bubble.minimized .global-live-mini-title {
    background:
      linear-gradient(#070a18, #070a18) padding-box,
      linear-gradient(135deg, #22d3ee, #a855f7, #ec4899, #facc15) border-box !important;
    border: 1px solid transparent;
    border-radius: 999px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.34), 0 0 20px rgba(168, 85, 247, 0.2);
    gap: 7px;
    height: 34px;
    min-width: 92px;
    overflow: visible;
    padding: 0 10px;
    width: 92px;
  }

  .global-live-bubble.minimized .global-live-mini-title i {
    font-size: 13px;
  }

  .global-live-bubble.minimized .global-live-mini-title span {
    display: inline;
    font-size: 10px;
    font-weight: 950;
    max-width: none;
    text-transform: uppercase;
  }

  .global-live-bubble.minimized .global-live-mini-title b {
    display: none;
  }

  .global-live-actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .global-live-actions a {
    min-height: 38px;
  }
}
</style>
