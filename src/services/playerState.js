import { computed, reactive } from 'vue'

export const playerState = reactive({
  currentVideo: null,
  isPlaying: false,
  isPaused: false,
  allowFloatingPlayback: false,
  showFloatingPlayer: false,
  isFloatingMinimized: false,
  currentTime: 0
})

export const shouldShowFloatingPlayer = computed(() => (
  Boolean(playerState.currentVideo?.id) &&
  playerState.allowFloatingPlayback === true &&
  playerState.isPlaying === true
))

export const setCurrentVideo = (video) => {
  if (!video?.id) return
  playerState.currentVideo = {
    id: video.id,
    title: video.title || 'Video de Galaxia Nintendera',
    thumbnail: video.thumbnail || '/src/iconos/Banner.png',
    url: video.url || '',
    startedAt: Number(video.startedAt || playerState.currentTime || 0)
  }
  playerState.currentTime = Number(video.startedAt || playerState.currentTime || 0)
  playerState.isPlaying = true
  playerState.isPaused = false
}

export const setCurrentTime = (seconds) => {
  const next = Number(seconds)
  if (!Number.isFinite(next) || next < 0) return
  playerState.currentTime = next
  if (playerState.currentVideo) {
    playerState.currentVideo.startedAt = next
  }
}

export const setPlaybackStatus = (status) => {
  if (status === 'playing') {
    playerState.isPlaying = true
    playerState.isPaused = false
    return
  }

  if (status === 'paused' || status === 'ended' || status === 'stopped') {
    playerState.isPlaying = false
    playerState.isPaused = status === 'paused'
    if (!playerState.allowFloatingPlayback) {
      playerState.showFloatingPlayer = false
    }
  }
}

export const allowFloatingPlayback = ({ minimized = false } = {}) => {
  playerState.allowFloatingPlayback = true
  playerState.showFloatingPlayer = true
  playerState.isFloatingMinimized = minimized
}

export const disableFloatingPlayback = () => {
  playerState.allowFloatingPlayback = false
  playerState.showFloatingPlayer = false
  playerState.isFloatingMinimized = false
}

export const stopPlayback = ({ resetAsk = false } = {}) => {
  playerState.currentVideo = null
  playerState.isPlaying = false
  playerState.isPaused = false
  playerState.allowFloatingPlayback = false
  playerState.showFloatingPlayer = false
  playerState.isFloatingMinimized = false
  playerState.currentTime = 0
}

export const closeFloatingPlayback = () => {
  stopPlayback({ resetAsk: true })
}

export const resetPlayerSession = () => {
  stopPlayback({ resetAsk: true })
}
