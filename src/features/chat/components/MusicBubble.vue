<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const open = ref(false)
const isPlaying = ref(false)
const trackPillVisible = ref(false)
const currentTrackTitle = ref('Playlist Nintendo')
const currentTrackArtist = ref('Videogame Remixes')
const showCommunitySuggest = ref(false)
const suggestedCommunityName = ref('')
const suggestedPlaylistName = ref('')
const showExitCommunitySuggest = ref(false)
const pendingOpenAfterExitPrompt = ref(false)
const isInCommunityPage = ref(false)

const dockRaised = ref(false)
const communityDock = ref(false)
const suppressTrackPillOnce = ref(false)

const iframeRef = ref(null)

let dockObserver = null
let soundcloudWidget = null
let lastCommunityPromptKey = ''
let trackPillTimer = null

const SOUNDCLOUD_API =
  'https://w.soundcloud.com/player/api.js'
const DEFAULT_VOLUME = 35
const PLAYLISTS = {
  nintendo: {
    key: 'nintendo',
    name: 'Playlist Nintendo',
    subtitle: 'Remixes y bandas sonoras',
    url: 'https://soundcloud.com/videogameremixes/sets/nintendo-power'
  },
  zelda: {
    key: 'zelda',
    name: 'Playlist Zelda',
    subtitle: 'Aventuras de Hyrule',
    url: 'https://soundcloud.com/videogameremixes/sets/the-legend-of-zelda-remixes'
  },
  mario: {
    key: 'mario',
    name: 'Playlist Mario',
    subtitle: 'Clasicos del Reino Champinon',
    url: 'https://soundcloud.com/videogameremixes/sets/super-mario-remixes'
  },
  pokemon: {
    key: 'pokemon',
    name: 'Playlist Pokemon',
    subtitle: 'Batallas y rutas iconicas',
    url: 'https://soundcloud.com/videogameremixes/sets/pokemon-remixes'
  }
}
const currentPlaylist = ref(PLAYLISTS.nintendo)
const suggestedPlaylist = ref(null)
const suggestedVolume = ref(DEFAULT_VOLUME)
const activeVolume = ref(DEFAULT_VOLUME)
const defaultPlaylist = PLAYLISTS.nintendo
const isCommunityPlaylist = computed(() => String(currentPlaylist.value?.key || '').startsWith('community-'))
const pendingAutoplay = ref(false)
const embedSrc = computed(() => (
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(currentPlaylist.value.url)}&color=%23a855f7&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`
))

const loadSoundCloudApi = () => {
  return new Promise((resolve) => {
    if (window.SC?.Widget) {
      resolve()
      return
    }

    const existing = document.querySelector(
      `script[src="${SOUNDCLOUD_API}"]`
    )

    if (existing) {
      existing.addEventListener('load', resolve, {
        once: true
      })

      return
    }

    const script = document.createElement('script')

    script.src = SOUNDCLOUD_API
    script.onload = resolve

    document.body.appendChild(script)
  })
}

const setupWidget = async () => {
  await loadSoundCloudApi()

  await nextTick()

  if (!iframeRef.value) return

  soundcloudWidget = window.SC.Widget(
    iframeRef.value
  )

  const ensurePlaying = (volume, attemptsLeft = 6) => {
    if (!soundcloudWidget) return

    const safeVolume = Math.min(100, Math.max(0, Number(volume ?? activeVolume.value ?? DEFAULT_VOLUME)))

    try {
      soundcloudWidget.play?.()
      soundcloudWidget.setVolume?.(safeVolume)
    } catch {
      // ignore: some browsers may throw while autoplay blocked
    }

    soundcloudWidget.isPaused?.((paused) => {
      if (!paused) {
        pendingAutoplay.value = false
        return
      }

      if (attemptsLeft <= 0) {
        pendingAutoplay.value = false
        return
      }

      window.setTimeout(() => ensurePlaying(safeVolume, attemptsLeft - 1), 350)
    })
  }

  soundcloudWidget.bind(
    window.SC.Widget.Events.READY,
    () => {
      soundcloudWidget.setVolume(activeVolume.value ?? DEFAULT_VOLUME)

      const updateCurrentTrack = () => {
        soundcloudWidget.getCurrentSound((sound) => {
          if (!sound) return
          currentTrackTitle.value = sound.title || 'Playlist Nintendo'
          currentTrackArtist.value = sound.user?.username || 'SoundCloud'
        })
      }

      soundcloudWidget.bind(
        window.SC.Widget.Events.PLAY,
        () => {
          isPlaying.value = true
          updateCurrentTrack()
          pendingAutoplay.value = false
        }
      )

      soundcloudWidget.bind(
        window.SC.Widget.Events.PAUSE,
        () => {
          isPlaying.value = false
        }
      )

      soundcloudWidget.bind(
        window.SC.Widget.Events.FINISH,
        () => {
          isPlaying.value = false
          updateCurrentTrack()
        }
      )

      soundcloudWidget.bind(
        window.SC.Widget.Events.PLAY_PROGRESS,
        () => {
          updateCurrentTrack()
        }
      )

      soundcloudWidget.bind(
        window.SC.Widget.Events.LOAD_PROGRESS,
        () => {
          if (pendingAutoplay.value) {
            ensurePlaying(activeVolume.value ?? DEFAULT_VOLUME)
          }
        }
      )

      updateCurrentTrack()

      if (pendingAutoplay.value) {
        ensurePlaying(activeVolume.value ?? DEFAULT_VOLUME)
      }
    }
  )
}

const applyPlaylist = (playlist) => {
  if (!playlist || !soundcloudWidget?.load) return
  const safeVolume = Math.min(100, Math.max(0, Number(playlist.volume ?? activeVolume.value ?? DEFAULT_VOLUME)))
  currentPlaylist.value = playlist
  activeVolume.value = safeVolume
  pendingAutoplay.value = true
  soundcloudWidget.load(playlist.url, {
    auto_play: true,
    show_comments: true,
    show_user: true,
    show_reposts: false,
    visual: true
  })
  window.setTimeout(() => {
    try {
      soundcloudWidget?.setVolume?.(safeVolume)
      soundcloudWidget?.play?.()
    } catch {
      // ignore autoplay blocks
    }

    soundcloudWidget?.isPaused?.((paused) => {
      if (!paused) return
      window.setTimeout(() => {
        try {
          soundcloudWidget?.play?.()
          soundcloudWidget?.setVolume?.(safeVolume)
        } catch {
          // ignore autoplay blocks
        }
      }, 420)
      window.setTimeout(() => {
        try {
          soundcloudWidget?.play?.()
          soundcloudWidget?.setVolume?.(safeVolume)
        } catch {
          // ignore autoplay blocks
        }
      }, 980)
    })
  }, 420)
}

const handleCommunityContext = (event) => {
  const communityName = event.detail?.name || ''
  const communityId = event.detail?.id || ''
  const playlistUrl = String(event.detail?.playlistUrl || '').trim()
  if (!communityName || !communityId || !isPlaying.value || !playlistUrl) return

  const playlist = {
    key: `community-${communityId}`,
    name: `Playlist ${communityName}`,
    subtitle: 'Musica de la comunidad',
    url: playlistUrl,
    volume: Math.min(100, Math.max(0, Number(event.detail?.volume ?? activeVolume.value ?? DEFAULT_VOLUME)))
  }

  if (playlist.url === currentPlaylist.value.url) return

  const promptKey = `${communityId}:${playlist.key}`
  if (lastCommunityPromptKey === promptKey) return

  suggestedPlaylist.value = playlist
  suggestedVolume.value = playlist.volume
  suggestedCommunityName.value = communityName
  suggestedPlaylistName.value = playlist.name
  showCommunitySuggest.value = true
  lastCommunityPromptKey = promptKey
}

const confirmCommunityPlaylist = () => {
  if (suggestedPlaylist.value) {
    applyPlaylist({
      ...suggestedPlaylist.value,
      volume: suggestedVolume.value
    })
  }
  showCommunitySuggest.value = false
}

const closeCommunitySuggest = () => {
  showCommunitySuggest.value = false
}

const toggleMusic = () => {
  const nextOpen = !open.value
  if (
    nextOpen &&
    !isInCommunityPage.value &&
    isCommunityPlaylist.value &&
    isPlaying.value &&
    currentPlaylist.value.url !== defaultPlaylist.url
  ) {
    pendingOpenAfterExitPrompt.value = true
    showExitCommunitySuggest.value = true
    return
  }

  open.value = nextOpen
}

const showTrackPillBriefly = () => {
  window.clearTimeout(trackPillTimer)
  trackPillVisible.value = true
  trackPillTimer = window.setTimeout(() => {
    trackPillVisible.value = false
  }, 4200)
}

const handleExternalPanelOpen = (event) => {
  if (['chat', 'mascot'].includes(event.detail?.source)) {
    suppressTrackPillOnce.value = true
    trackPillVisible.value = false
    open.value = false
  }
}

const confirmExitCommunityPlaylist = () => {
  applyPlaylist({ ...defaultPlaylist, volume: DEFAULT_VOLUME })
  showExitCommunitySuggest.value = false
  if (pendingOpenAfterExitPrompt.value) open.value = true
  pendingOpenAfterExitPrompt.value = false
}

const closeExitCommunitySuggest = () => {
  showExitCommunitySuggest.value = false
  if (pendingOpenAfterExitPrompt.value) open.value = true
  pendingOpenAfterExitPrompt.value = false
}

const handlePageContext = (event) => {
  isInCommunityPage.value = Boolean(event.detail?.inCommunity)
}

const togglePlay = () => {
  if (!soundcloudWidget) return

  if (isPlaying.value) {
    soundcloudWidget.pause()
  } else {
    soundcloudWidget.play()
  }
}

const previousTrack = () => {
  if (!soundcloudWidget?.prev) return
  soundcloudWidget.prev()
}

const nextTrack = () => {
  if (!soundcloudWidget?.next) return
  soundcloudWidget.next()
}

const updateDockPosition = () => {
  dockRaised.value = Boolean(
    document.querySelector(
      '.user-panel, .panel, .animate-slide-left'
    )
  )

  communityDock.value = Boolean(
    document.querySelector(
      '.community-switcher-shell, .community-quick-shell'
    )
  )
}

onMounted(() => {
  dockObserver = new MutationObserver(
    updateDockPosition
  )

  dockObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  })

  updateDockPosition()

  setupWidget()
  window.addEventListener('community-music-context', handleCommunityContext)
  window.addEventListener('music-page-context', handlePageContext)
  window.addEventListener('floating-panel-opened', handleExternalPanelOpen)
})

onUnmounted(() => {
  dockObserver?.disconnect()
  window.clearTimeout(trackPillTimer)
  window.removeEventListener('community-music-context', handleCommunityContext)
  window.removeEventListener('music-page-context', handlePageContext)
  window.removeEventListener('floating-panel-opened', handleExternalPanelOpen)
})

watch(open, (isOpen) => {
  if (!isOpen) {
    if (suppressTrackPillOnce.value) {
      suppressTrackPillOnce.value = false
      return
    }
    if (isPlaying.value) showTrackPillBriefly()
    return
  }
  window.clearTimeout(trackPillTimer)
  trackPillVisible.value = false
  window.dispatchEvent(new CustomEvent('floating-panel-opened', {
    detail: { source: 'music' }
  }))
})
</script>

<template>
  <!-- BOTÓN -->
  <button
    class="music-bubble-fab"
    :class="{ playing: isPlaying, raised: dockRaised, community: communityDock }"
    type="button"
    aria-label="Abrir música"
    @click="toggleMusic"
  >
    <i :class="isPlaying ? 'fas fa-compact-disc' : 'fas fa-music'"></i>
  </button>

  <button
    v-if="trackPillVisible"
    class="music-track-pill"
    :class="{ open, raised: dockRaised, community: communityDock, playing: isPlaying }"
    type="button"
    aria-label="Abrir reproductor de música"
    @click="toggleMusic"
  >
    <span class="music-track-title">{{ currentTrackTitle }}</span>
    <small class="music-track-artist">{{ currentTrackArtist }}</small>
  </button>

  <!-- PANEL -->
  <section
    class="music-bubble-panel"
    :class="{ open, closed: !open, raised: dockRaised, community: communityDock }"
  >
    <header class="music-bubble-head">
      <div class="music-bubble-title">
        <i class="fas fa-music"></i>

        <div>
          <strong>{{ currentPlaylist.name }}</strong>

          <span>
            {{ currentPlaylist.subtitle }}
          </span>
        </div>
      </div>

      <button
        class="panel-close-btn"
        type="button"
        @click="open = false"
      >
        ×
      </button>
    </header>

    <div class="music-bubble-body">
      <div class="music-player">
        <iframe
          ref="iframeRef"
          width="100%"
          height="100%"
          scrolling="no"
          frameborder="no"
          allow="autoplay"
          :src="embedSrc"
        ></iframe>
      </div>

      <div class="music-player-controls">
        <button type="button" aria-label="Canción anterior" @click="previousTrack">
          <i class="fas fa-backward-step"></i>
          Anterior
        </button>

        <button
          :class="{ active: isPlaying }"
          type="button"
          @click="togglePlay"
        >
          <i
            :class="
              isPlaying
                ? 'fas fa-pause'
                : 'fas fa-play'
            "
          ></i>

          {{
            isPlaying
              ? 'Pausar'
              : 'Reproducir'
          }}
        </button>

        <button type="button" aria-label="Siguiente canción" @click="nextTrack">
          <i class="fas fa-forward-step"></i>
          Siguiente
        </button>
      </div>
    </div>
  </section>

  <Transition name="music-confirm">
    <div v-if="showCommunitySuggest" class="music-confirm-modal">
      <div class="music-confirm-backdrop" @click="closeCommunitySuggest"></div>
      <div class="music-confirm-card">
        <div class="music-confirm-icon">
          <i class="fas fa-music"></i>
        </div>
        <h2>Cambiar playlist?</h2>
        <p>
          Estas escuchando musica. Te gustaria escuchar la musica de
          <strong>{{ suggestedCommunityName }}</strong>?
        </p>
        <small>{{ suggestedPlaylistName }}</small>
        <div class="music-confirm-actions">
          <button class="music-cancel" type="button" @click="closeCommunitySuggest">Cancelar</button>
          <button class="music-confirm" type="button" @click="confirmCommunityPlaylist">Confirmar</button>
        </div>
      </div>
    </div>
  </Transition>

  <Transition name="music-confirm">
    <div v-if="showExitCommunitySuggest" class="music-confirm-modal">
      <div class="music-confirm-backdrop" @click="closeExitCommunitySuggest"></div>
      <div class="music-confirm-card">
        <div class="music-confirm-icon">
          <i class="fas fa-music"></i>
        </div>
        <h2>Salir de la musica de comunidad?</h2>
        <p>
          Estas fuera de comunidades. Quieres volver a la musica general
          <strong>{{ defaultPlaylist.name }}</strong>?
        </p>
        <div class="music-confirm-actions">
          <button class="music-cancel" type="button" @click="closeExitCommunitySuggest">Mantener</button>
          <button class="music-confirm" type="button" @click="confirmExitCommunityPlaylist">Cambiar</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.music-bubble-fab {
  align-items: center;
  background:
    linear-gradient(145deg, rgba(9, 13, 31, 0.98), rgba(22, 15, 42, 0.96)) padding-box,
    linear-gradient(135deg, rgba(34, 211, 238, 0.76), rgba(168, 85, 247, 0.72), rgba(236, 72, 153, 0.7)) border-box;
  border: 1px solid transparent;
  border-radius: 999px;
  color: #f8fafc;
  display: flex;
  height: 54px;
  justify-content: center;
  position: fixed;
  right: var(--galaxy-dock-music-right, 22px);
  bottom: var(--galaxy-dock-bottom, 22px);
  width: 54px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), 0 0 24px rgba(168, 85, 247, 0.26);
  transition: transform 0.2s ease;
  z-index: 258;
}

.music-bubble-fab:hover {
  transform: scale(1.08);
}

.music-bubble-fab.raised {
  bottom: 84px;
}

:global(body.direct-chat-available) .music-bubble-fab,
.music-bubble-fab {
  z-index: 265;
}

.music-bubble-fab i {
  font-size: 20px;
}

.music-track-pill {
  align-items: flex-start;
  background:
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) padding-box,
    linear-gradient(135deg, #22d3ee, #a855f7, #ec4899, #facc15) border-box;
  border: 2px solid transparent;
  border-radius: 18px;
  bottom: calc(var(--galaxy-dock-bottom, 22px) + 76px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.78),
    0 0 22px rgba(34, 211, 238, 0.26),
    0 0 34px rgba(236, 72, 153, 0.24),
    0 20px 52px rgba(15, 23, 42, 0.3);
  color: #111827;
  display: flex;
  flex-direction: column;
  gap: 3px;
  isolation: isolate;
  max-width: min(340px, calc(100vw - 28px));
  min-width: 230px;
  padding: 12px 15px;
  position: fixed;
  right: max(14px, calc(var(--galaxy-dock-music-right, 22px) - 44px));
  text-align: left;
  transition: opacity 0.2s ease, transform 0.2s ease;
  white-space: nowrap;
  z-index: 263;
}

.music-track-pill::after {
  background: #ffffff;
  border-bottom: 2px solid rgba(236, 72, 153, 0.55);
  border-right: 2px solid rgba(34, 211, 238, 0.45);
  bottom: -8px;
  box-shadow: 6px 6px 18px rgba(236, 72, 153, 0.2);
  content: "";
  height: 14px;
  position: absolute;
  right: 54px;
  transform: rotate(45deg);
  width: 14px;
  z-index: -1;
}

.music-track-title {
  font-size: 12.5px;
  font-weight: 900;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-track-artist {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-track-pill.playing {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.84),
    0 0 28px rgba(34, 211, 238, 0.3),
    0 0 42px rgba(168, 85, 247, 0.34),
    0 20px 52px rgba(15, 23, 42, 0.3);
}

.music-track-pill.open {
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
}

.music-track-pill.raised {
  bottom: calc(var(--galaxy-dock-bottom, 22px) + 132px);
}

.music-track-pill.community {
  bottom: calc(var(--galaxy-dock-bottom, 22px) + 132px);
}

/* PANEL */

.music-bubble-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
  color: #111827;
  display: flex;
  flex-direction: column;
  width: min(640px, calc(100vw - 28px));
  height: 430px;
  position: fixed;
  right: 22px;
  bottom: var(--galaxy-dock-panel-bottom, 88px);
  transform-origin: bottom right;
  transition: opacity 0.25s ease, visibility 0.25s ease, transform 0.25s ease;
  z-index: 270;
}

.music-bubble-panel.raised {
  bottom: 150px;
}

.music-bubble-panel.open {
  opacity: 1;

  visibility: visible;

  pointer-events: auto;

  transform:
    scale(1)
    translateY(0);
}

.music-bubble-panel.closed {
  opacity: 0;

  visibility: hidden;

  pointer-events: none;

  transform:
    scale(0.85)
    translateY(16px);
}

.music-bubble-head {
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
}

.music-bubble-title {
  align-items: center;

  display: flex;

  flex: 1;

  gap: 12px;
}

.music-bubble-title i {
  color: #7c3aed;
  font-size: 18px;
}

.music-bubble-title div {
  flex: 1;

  min-width: 0;
}

.music-bubble-title strong {
  color: #111827;
  display: block;
  font-size: 14px;
  font-weight: 900;
  text-align: left;
}

.music-bubble-title span {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 800;
  text-align: left;
}

.panel-close-btn {
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  display: flex;
  font-size: 20px;
  font-weight: 700;
  height: 40px;
  justify-content: center;
  padding: 0;
  width: 40px;
}

.panel-close-btn:hover {
  background: #f5f3ff;
  color: #7c3aed;
}

.music-bubble-body {
  display: flex;

  flex-direction: column;

  flex: 1;

  gap: 12px;

  overflow: hidden;

  padding: 12px;
}

.music-player {
  flex: 1;
  overflow: hidden;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.music-player-controls {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.music-player-controls button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #475569;
  display: flex;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  width: 100%;
  font-size: 12px;
  font-weight: 700;
}

.music-player-controls button:hover {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #7c3aed;
}

.music-player-controls button.active {
  background: #7c3aed;
  border-color: #7c3aed;
  color: #ffffff;
}

.music-confirm-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 1200;
}

.music-confirm-backdrop {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(16px);
  inset: 0;
  position: absolute;
}

.music-confirm-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  max-width: 360px;
  padding: 24px;
  position: relative;
  text-align: center;
  width: 100%;
}

.music-confirm-icon {
  align-items: center;
  background: #f3e8ff;
  border-radius: 999px;
  color: #7c3aed;
  display: flex;
  height: 48px;
  justify-content: center;
  margin: 0 auto 14px;
  width: 48px;
}

.music-confirm-card h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.music-confirm-card p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  margin-top: 8px;
}

.music-confirm-card p strong {
  color: #111827;
}

.music-confirm-card small {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 900;
  margin-top: 8px;
}

.music-confirm-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.music-cancel,
.music-confirm {
  border-radius: 12px;
  flex: 1;
  font-size: 12px;
  font-weight: 900;
  min-height: 42px;
  text-transform: uppercase;
}

.music-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.music-confirm {
  background: #7c3aed;
  color: #ffffff;
}

.music-confirm-enter-active,
.music-confirm-leave-active {
  transition: opacity 0.22s ease;
}

.music-confirm-enter-from,
.music-confirm-leave-to {
  opacity: 0;
}

/* MOBILE */

@media (max-width: 859px) {
  .music-bubble-fab {
    z-index: 265;
  }

  .music-bubble-fab.raised {
    bottom: var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom)));
  }

  .music-bubble-fab.community {
    bottom: var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom)));
  }

  .music-track-pill {
    bottom: calc(var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom))) + 72px);
    display: flex;
    max-width: min(340px, calc(100vw - 24px));
    min-width: min(240px, calc(100vw - 24px));
    right: max(12px, calc(var(--galaxy-dock-music-right, 16px) - 54px));
  }

  .music-bubble-panel {
    bottom: calc(var(--mobile-bottom-nav-height, 82px) + 12px + env(safe-area-inset-bottom));
    height: auto;
    left: 10px;
    max-height: none;
    overflow-y: auto;
    right: 10px;
    top: calc(var(--public-nav-offset, 72px) + 10px);
    transform-origin: bottom right;
    width: auto;
  }

  .music-bubble-panel.raised,
  .music-bubble-panel.community {
    bottom: calc(var(--mobile-bottom-nav-height, 82px) + 12px + env(safe-area-inset-bottom));
  }

  .music-bubble-panel.open {
    transform: scale(1) translateY(0);
  }

  .music-bubble-panel.closed {
    transform: scale(0.85) translateY(16px);
  }

  .music-player-controls {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 420px) {
  .music-bubble-panel {
    left: 6px;
    right: 6px;
    top: calc(var(--public-nav-offset, 72px) + 8px);
  }
}
</style>
