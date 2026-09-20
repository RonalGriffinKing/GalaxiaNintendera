<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { proxiedImageUrl } from '@/constants/assets'
import { useTimedCarousel } from '@/composables/useTimedCarousel'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  communities: {
    type: Array,
    default: () => []
  },
  formatDate: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['open-community', 'open-item'])

const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID || ''
const channelHandle = String(import.meta.env.VITE_YOUTUBE_HANDLE || 'GalaxiaNintendera').replace(/^@+/, '')
const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY || ''
const selectedCommunityId = ref('latest')
const youtubeVideos = ref([])
const youtubeLive = ref(null)
const youtubeLoading = ref(false)
const youtubeError = ref('')
const RECENT_MEDIA_PAGE_SIZE = 3
const RECENT_MEDIA_SLIDE_DURATION = 5200

const communityVideoProfiles = [
  { id: 'kirby', label: 'Kirby', keywords: ['kirby', 'dream land', 'dreamland', 'waddle', 'dedede', 'meta knight', 'air riders'] },
  { id: 'mario-kart', label: 'Mario Kart', keywords: ['mario kart', 'mariokart', 'kart', 'rainbow road', 'rainbow circuit', 'circuito arcoiris', 'carreras', 'atajos'] },
  { id: 'mario', label: 'Mario', keywords: ['super mario', 'mario', 'luigi', 'peach', 'bowser', 'yoshi', 'mario galaxy', 'mario odyssey', 'mario wonder'] },
  { id: 'pokemon', label: 'Pokemon', keywords: ['pokemon', 'pokémon', 'pikachu', 'pokeball', 'pokebola', 'shiny', 'pokemon league'] },
  { id: 'zelda', label: 'Zelda', keywords: ['zelda', 'link', 'hyrule', 'ocarina', 'tears of the kingdom', 'breath of the wild'] },
  { id: 'splatoon', label: 'Splatoon', keywords: ['splatoon', 'inkling', 'splat', 'calamar', 'turf'] },
  { id: 'animal-crossing', label: 'Animal Crossing', keywords: ['animal crossing', 'acnh', 'tom nook', 'canela', 'isabelle'] },
  { id: 'metroid', label: 'Metroid', keywords: ['metroid', 'samus'] },
  { id: 'smash', label: 'Smash', keywords: ['smash', 'smash bros', 'super smash'] }
]

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
const normalizeVideoToken = (value = '') => normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
const getVideoText = (video = {}) => normalizeVideoToken(`${video.title || ''} ${video.description || ''}`)
const getCommunityVideoProfile = (community = {}) => {
  if (!community || community.isOfficial || community.id === 'galaxia-oficial') {
    return { id: 'latest', label: 'Galaxia Nintendera', keywords: [] }
  }

  const source = normalizeVideoToken([
    community.name,
    community.description,
    community.category,
    ...(Array.isArray(community.tags) ? community.tags : []),
    ...(Array.isArray(community.threadTopics) ? community.threadTopics : [])
  ].filter(Boolean).join(' '))
  const match = communityVideoProfiles.find(profile => (
    profile.keywords.some(keyword => source.includes(normalizeVideoToken(keyword)))
  ))

  if (match) return match

  return {
    id: normalizeVideoToken(community.id || community.name || 'community').replace(/\s+/g, '-') || 'community',
    label: community.name || 'Comunidad',
    keywords: [
      community.name,
      ...(Array.isArray(community.tags) ? community.tags : []),
      ...(Array.isArray(community.threadTopics) ? community.threadTopics : [])
    ].map(normalizeVideoToken).filter(keyword => keyword && keyword.length > 2)
  }
}
const videoMatchesCommunity = (video, profile) => {
  if (!profile?.keywords?.length) return true
  const text = getVideoText(video)
  return profile.keywords.some(keyword => {
    const normalized = normalizeVideoToken(keyword)
    return normalized && text.includes(normalized)
  })
}

const officialCommunity = computed(() => props.communities.find(community => community.isOfficial || community.id === 'galaxia-oficial') || null)
const videoLibrary = computed(() => {
  const seen = new Set()
  return [
    youtubeLive.value ? { ...youtubeLive.value, streamKind: 'live-now' } : null,
    ...youtubeVideos.value
  ].filter((video) => {
    if (!video?.id || seen.has(video.id)) return false
    seen.add(video.id)
    return true
  })
})
const communityOptions = computed(() => {
  const available = props.communities
    .filter(community => !community.isOfficial && community.id !== 'galaxia-oficial')
    .map((community) => {
      const profile = getCommunityVideoProfile(community)
      const video = videoLibrary.value.find(item => item.streamKind !== 'live-now' && videoMatchesCommunity(item, profile))
      return { community, profile, video, count: video ? 1 : 0 }
    })
    .filter(option => option.video)

  return available.slice(0, 5)
})
const selectedCommunityOption = computed(() => communityOptions.value.find(option => option.community.id === selectedCommunityId.value) || null)
const fallbackItem = computed(() => props.items[0] || null)
const activeVideo = computed(() => {
  if (selectedCommunityOption.value?.video) return selectedCommunityOption.value.video
  return videoLibrary.value[0] || null
})
const activeFallbackItem = computed(() => activeVideo.value ? null : fallbackItem.value)
const activeTitle = computed(() => (
  activeVideo.value?.title
  || activeFallbackItem.value?.title
  || 'Directos, videos y podcasts oficiales'
))
const activeDescription = computed(() => (
  activeVideo.value?.description
  || activeFallbackItem.value?.description
  || 'Aqui apareceran los estrenos de YouTube, lives programados, podcasts y comunicados multimedia.'
))
const activeCommunityLabel = computed(() => (
  selectedCommunityOption.value?.community?.name
  || (activeVideo.value?.streamKind === 'live-now' ? 'Live global del canal' : 'Galaxia Nintendera')
))
const activeCommunity = computed(() => selectedCommunityOption.value?.community || officialCommunity.value || null)
const activeEmbedUrl = computed(() => {
  if (!activeVideo.value?.id) return ''
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  return `https://www.youtube.com/embed/${activeVideo.value.id}?${params.toString()}`
})
const activeVideoUrl = computed(() => activeVideo.value?.url || (activeVideo.value?.id ? `https://www.youtube.com/watch?v=${activeVideo.value.id}` : ''))

const channelUrl = computed(() => `https://www.youtube.com/@${channelHandle}`)
const recentRows = computed(() => {
  if (videoLibrary.value.length) return videoLibrary.value.slice(0, 12)
  return props.items.slice(0, 12)
})
const recentPageCount = computed(() => Math.max(1, Math.ceil(recentRows.value.length / RECENT_MEDIA_PAGE_SIZE)))
const recentCarousel = useTimedCarousel(recentPageCount, RECENT_MEDIA_SLIDE_DURATION)
const recentSlideIndex = recentCarousel.index
const recentProgressPercent = recentCarousel.progressPercent
const visibleRows = computed(() => {
  const start = recentSlideIndex.value * RECENT_MEDIA_PAGE_SIZE
  const page = recentRows.value.slice(start, start + RECENT_MEDIA_PAGE_SIZE)
  if (page.length === RECENT_MEDIA_PAGE_SIZE || recentRows.value.length <= RECENT_MEDIA_PAGE_SIZE) return page
  return [...page, ...recentRows.value.slice(0, RECENT_MEDIA_PAGE_SIZE - page.length)]
})

const mapFeedItem = (item) => ({
  id: item.id || '',
  title: item.title || 'Video de Galaxia Nintendera',
  description: item.description || '',
  publishedAt: item.publishedAt || '',
  startsAt: item.publishedAt || '',
  thumbnail: proxiedImageUrl(item.thumbnail || ''),
  url: item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : channelUrl.value),
  mediaType: 'video'
})
const fetchYoutubeJson = async (endpoint, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  })
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('youtube-request-failed')
  return response.json()
}
const mapYoutubeSearchItem = (item) => ({
  id: item.id?.videoId || item.id || '',
  title: item.snippet?.title || 'Video de Galaxia Nintendera',
  description: item.snippet?.description || '',
  publishedAt: item.snippet?.publishedAt || '',
  startsAt: item.snippet?.publishedAt || '',
  thumbnail: proxiedImageUrl(item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ''),
  url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : channelUrl.value,
  mediaType: 'video'
})
const loadYoutubeFeed = async () => {
  if (!channelId || youtubeLoading.value) return
  youtubeLoading.value = true
  youtubeError.value = ''
  try {
    const feedResponse = await fetch(`/.netlify/functions/youtube-feed?channelId=${encodeURIComponent(channelId)}`)
    if (feedResponse.ok) {
      const feed = await feedResponse.json()
      youtubeVideos.value = (feed.items || []).map(mapFeedItem).slice(0, 12)
    }

    if (youtubeApiKey) {
      const [liveSearch, recentSearch] = await Promise.all([
        fetchYoutubeJson('search', {
          part: 'snippet',
          channelId,
          type: 'video',
          eventType: 'live',
          maxResults: 1,
          key: youtubeApiKey
        }).catch(() => null),
        fetchYoutubeJson('search', {
          part: 'snippet',
          channelId,
          type: 'video',
          order: 'date',
          maxResults: 12,
          key: youtubeApiKey
        }).catch(() => null)
      ])
      const liveItem = liveSearch?.items?.[0]
      youtubeLive.value = liveItem ? { ...mapYoutubeSearchItem(liveItem), mediaType: 'live' } : null
      const apiVideos = (recentSearch?.items || []).map(mapYoutubeSearchItem)
      if (apiVideos.length) youtubeVideos.value = apiVideos
    }
  } catch (error) {
    youtubeError.value = 'No se pudo cargar el feed del canal.'
  } finally {
    youtubeLoading.value = false
  }
}

const openActive = () => {
  if (activeVideo.value) {
    emit('open-item', {
      id: activeVideo.value.id,
      title: activeVideo.value.title,
      description: activeVideo.value.description,
      type: activeVideo.value.streamKind === 'live-now' ? 'Live' : 'Video',
      startsAt: activeVideo.value.publishedAt,
      url: activeVideoUrl.value
    })
    return
  }

  if (activeFallbackItem.value) {
    emit('open-item', activeFallbackItem.value)
    return
  }

  emit('open-community', activeCommunity.value)
}
const selectCommunity = (communityId) => {
  selectedCommunityId.value = communityId
}
const selectRecentSlide = (index) => {
  recentCarousel.select(index)
}

watch(communityOptions, (options) => {
  if (selectedCommunityId.value !== 'latest' && !options.some(option => option.community.id === selectedCommunityId.value)) {
    selectedCommunityId.value = 'latest'
  }
})

onMounted(() => {
  recentCarousel.start()
  loadYoutubeFeed()
})
</script>

<template>
  <section class="community-stories-panel media-center-panel">
    <div class="panel-heading">
      <h2>
        <span></span>
        Videos, lives y podcasts
      </h2>
      <button @click="emit('open-community', officialCommunity)">
        Ver canal
        <i class="fas fa-arrow-right"></i>
      </button>
    </div>

    <div class="media-hero-card" :class="{ 'has-video': activeEmbedUrl }">
      <div class="media-spotlight">
        <div class="media-copy">
          <span><i :class="activeVideo?.streamKind === 'live-now' ? 'fas fa-tower-broadcast' : 'fas fa-satellite-dish'"></i> {{ activeCommunityLabel }}</span>
          <h3>{{ activeTitle }}</h3>
          <p>{{ activeDescription }}</p>
          <div class="media-actions">
            <button type="button" @click="openActive">
              {{ activeVideo ? 'Ver ahora' : 'Ir a la comunidad oficial' }}
              <i class="fas fa-arrow-right"></i>
            </button>
            <a :href="channelUrl" target="_blank" rel="noreferrer">
              YouTube
              <i class="fab fa-youtube"></i>
            </a>
          </div>
        </div>

        <div class="media-preview">
          <iframe
            v-if="activeEmbedUrl"
            :src="activeEmbedUrl"
            :title="activeTitle"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
          <img v-else-if="activeVideo?.thumbnail" :src="activeVideo.thumbnail" alt="" />
          <div v-else class="media-preview-empty">
            <i class="fab fa-youtube"></i>
            <strong>{{ youtubeLoading ? 'Cargando canal...' : 'Preview del canal' }}</strong>
          </div>
          <button type="button" class="media-play-orb" aria-label="Ver video" @click="openActive">
            <i class="fas fa-play"></i>
          </button>
          <small v-if="activeVideo">
            {{ activeVideo.streamKind === 'live-now' ? 'Live activo' : 'Ultimo video disponible' }}
          </small>
        </div>
      </div>
    </div>

    <div class="media-chip-grid" aria-label="Videos por comunidad">
      <button
        type="button"
        :class="{ active: selectedCommunityId === 'latest' }"
        @click="selectCommunity('latest')"
      >
        <i class="fas fa-layer-group"></i>
        Ultimo del canal
      </button>
      <button
        v-for="option in communityOptions"
        :key="option.community.id"
        type="button"
        :class="{ active: selectedCommunityId === option.community.id }"
        @click="selectCommunity(option.community.id)"
      >
        <i class="fas fa-gamepad"></i>
        {{ option.profile.label }}
      </button>
      <button type="button" class="ghost" @click="emit('open-community')">
        <i class="fas fa-users"></i>
        Ver comunidades
      </button>
    </div>

    <div class="media-list-head">
      <strong><i class="fas fa-headphones-simple"></i> Contenido reciente</strong>
      <small v-if="youtubeLoading">Actualizando canal...</small>
      <small v-else>{{ recentRows.length }} destacados</small>
    </div>

    <div class="media-list">
      <button
        v-for="item in visibleRows"
        :key="item.id"
        type="button"
        class="media-row"
        @click="item.url ? emit('open-item', { ...item, type: item.streamKind === 'live-now' ? 'Live' : item.type || 'Video', startsAt: item.publishedAt || item.startsAt }) : emit('open-item', item)"
      >
        <span class="media-row-thumb">
          <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
          <i v-else :class="item.streamKind === 'live-now' ? 'fas fa-tower-broadcast' : 'fas fa-play'"></i>
          <b><i :class="item.streamKind === 'live-now' ? 'fas fa-tower-broadcast' : 'fas fa-play'"></i></b>
        </span>
        <div>
          <em>{{ item.streamKind === 'live-now' ? 'En directo' : item.type || 'Video' }}</em>
          <strong>{{ item.title }}</strong>
          <small>{{ formatDate(item.publishedAt || item.startsAt) }}</small>
        </div>
        <i class="fas fa-ellipsis-vertical"></i>
      </button>
    </div>

    <div v-if="recentPageCount > 1" class="media-carousel-controls" aria-label="Paginas de contenido reciente">
      <div class="media-carousel-progress">
        <span :style="{ width: `${recentProgressPercent}%` }"></span>
      </div>
      <div class="media-carousel-dots">
        <button
          v-for="page in recentPageCount"
          :key="`media-page-${page}`"
          type="button"
          :class="{ active: page - 1 === recentSlideIndex }"
          :aria-label="`Ver videos ${page}`"
          @click="selectRecentSlide(page - 1)"
        ></button>
      </div>
    </div>

    <p v-if="youtubeError && !visibleRows.length" class="media-feed-error">{{ youtubeError }}</p>
  </section>
</template>

<style scoped>
.community-stories-panel {
  background:
    radial-gradient(circle at 12% 12%, rgba(236, 72, 153, 0.18), transparent 32%),
    radial-gradient(circle at 88% 0%, rgba(168, 85, 247, 0.2), transparent 30%),
    rgba(8, 13, 29, 0.82);
  border: 1px solid rgba(236, 72, 153, 0.34);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28), 0 0 40px rgba(168, 85, 247, 0.14);
  overflow: hidden;
  padding: 20px;
}

.media-center-panel {
  container-type: inline-size;
  display: grid;
  gap: 16px;
}

.panel-heading {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 14px;
}

.panel-heading h2 {
  align-items: center;
  display: flex;
  font-size: 21px;
  font-weight: 950;
  gap: 10px;
}

.panel-heading h2 span {
  align-items: center;
  background: rgba(168, 85, 247, 0.18);
  border: 1px solid rgba(236, 72, 153, 0.38);
  border-radius: 12px;
  box-shadow: 0 0 22px rgba(236, 72, 153, 0.22);
  display: inline-flex;
  height: 44px;
  justify-content: center;
  position: relative;
  width: 44px;
}

.panel-heading h2 span::before {
  color: #f0abfc;
  content: '\f03d';
  font-family: 'Font Awesome 6 Free';
  font-size: 17px;
  font-weight: 900;
}

.panel-heading button {
  align-items: center;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(236, 72, 153, 0.28);
  border-radius: 10px;
  color: #f5d0fe;
  display: inline-flex;
  font-size: 12px;
  gap: 9px;
  font-weight: 900;
  min-height: 42px;
  padding: 0 15px;
}

.media-hero-card {
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.5), rgba(236, 72, 153, 0.22)),
    rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(244, 114, 182, 0.22);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 18px 42px rgba(0, 0, 0, 0.22);
  min-height: 0;
  overflow: hidden;
  padding: 20px;
  position: relative;
}

.media-hero-card::before {
  background:
    linear-gradient(90deg, rgba(34, 211, 238, 0.18), transparent 28%),
    radial-gradient(circle at 84% 20%, rgba(236, 72, 153, 0.18), transparent 32%);
  content: '';
  inset: 0;
  opacity: 0.9;
  pointer-events: none;
  position: absolute;
}

.media-hero-card > * {
  position: relative;
  z-index: 1;
}

.media-spotlight {
  align-items: stretch;
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr;
  min-width: 0;
}

.media-copy {
  align-content: center;
  display: grid;
  min-width: 0;
}

.media-copy span,
.media-preview small {
  color: #c4b5fd;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.media-copy h3 {
  display: -webkit-box;
  font-size: clamp(24px, 6cqw, 38px);
  font-weight: 950;
  line-height: 1.05;
  margin-top: 14px;
  max-width: 620px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.media-copy p {
  color: #cbd5e1;
  display: -webkit-box;
  font-size: 14px;
  line-height: 1.5;
  margin-top: 12px;
  max-width: 620px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.media-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.media-actions button,
.media-actions a {
  align-items: center;
  border-radius: 10px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 9px;
  min-height: 42px;
  padding: 11px 16px;
}

.media-actions button {
  background: #ffffff;
  color: #111827;
}

.media-actions a {
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.media-preview {
  aspect-ratio: 16 / 9;
  background: rgba(3, 7, 18, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 54px rgba(0, 0, 0, 0.32);
  display: grid;
  min-height: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.media-preview iframe,
.media-preview img {
  border: 0;
  height: 100%;
  inset: 0;
  object-fit: cover;
  position: absolute;
  width: 100%;
}

.media-preview::after {
  background: linear-gradient(180deg, transparent 48%, rgba(3, 7, 18, 0.78));
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.media-preview-empty {
  align-content: center;
  color: #c4b5fd;
  display: grid;
  gap: 10px;
  justify-items: center;
  min-height: 0;
}

.media-preview-empty i {
  font-size: 34px;
}

.media-preview small {
  background: rgba(8, 13, 28, 0.78);
  border-radius: 999px;
  bottom: 12px;
  color: #ffffff;
  left: 12px;
  padding: 7px 10px;
  position: absolute;
  z-index: 2;
}

.media-play-orb {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(236, 72, 153, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  box-shadow: 0 0 0 12px rgba(236, 72, 153, 0.12), 0 0 40px rgba(236, 72, 153, 0.42);
  color: #fff;
  display: inline-flex;
  font-size: 24px;
  height: 78px;
  justify-content: center;
  left: 50%;
  padding-left: 4px;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 78px;
  z-index: 3;
}

.media-preview:has(iframe) .media-play-orb {
  opacity: 0;
  pointer-events: none;
}

.media-chip-grid {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.media-chip-grid::-webkit-scrollbar {
  display: none;
}

.media-chip-grid button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #ffffff;
  display: flex;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
}

.media-chip-grid button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow: 0 12px 28px rgba(168, 85, 247, 0.25);
}

.media-chip-grid button.ghost {
  background: rgba(255, 255, 255, 0.1);
}

.media-chip-grid i {
  color: #f0abfc;
}

.media-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
}

.media-carousel-controls {
  align-items: center;
  display: grid;
  gap: 10px;
  justify-items: center;
  margin-top: -2px;
}

.media-carousel-progress {
  background: rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  height: 4px;
  max-width: 420px;
  overflow: hidden;
  width: 100%;
}

.media-carousel-progress span {
  background: linear-gradient(90deg, #22d3ee, #a855f7, #ec4899);
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 0.2s linear;
}

.media-carousel-dots {
  align-items: center;
  display: inline-flex;
  gap: 8px;
  justify-content: center;
}

.media-carousel-dots button {
  background: rgba(148, 163, 184, 0.46);
  border: 0;
  border-radius: 999px;
  height: 9px;
  padding: 0;
  transition: background 0.2s ease, box-shadow 0.2s ease, width 0.2s ease;
  width: 9px;
}

.media-carousel-dots button.active {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  box-shadow: 0 0 18px rgba(236, 72, 153, 0.46);
  width: 30px;
}

.media-list-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.media-list-head strong {
  align-items: center;
  color: #ffffff;
  display: inline-flex;
  font-size: 16px;
  font-weight: 950;
  gap: 9px;
}

.media-list-head strong i {
  color: #d946ef;
}

.media-list-head small {
  color: #a5b4fc;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.media-row {
  align-content: start;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.72), rgba(15, 23, 42, 0.74));
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 22px;
  overflow: hidden;
  padding: 10px;
  position: relative;
  text-align: left;
}

.media-row:hover {
  border-color: rgba(236, 72, 153, 0.38);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2), 0 0 24px rgba(236, 72, 153, 0.12);
  transform: translateY(-1px);
}

.media-row-thumb {
  align-items: center;
  aspect-ratio: 16 / 9;
  background: rgba(3, 7, 18, 0.55);
  border-radius: 9px;
  display: flex;
  grid-column: 1 / -1;
  height: auto;
  justify-content: center;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.media-row-thumb img {
  height: 100%;
  object-fit: cover;
  object-position: center;
  width: 100%;
}

.media-row-thumb > i {
  color: #f0abfc;
  font-size: 22px;
}

.media-row-thumb b {
  align-items: center;
  background: rgba(3, 7, 18, 0.76);
  border-radius: 999px;
  bottom: 8px;
  color: #fff;
  display: inline-flex;
  height: 30px;
  justify-content: center;
  position: absolute;
  right: 8px;
  width: 30px;
}

.media-row > div {
  min-width: 0;
}

.media-row > .fa-ellipsis-vertical {
  align-self: start;
  color: #94a3b8;
  justify-self: end;
  padding-top: 4px;
}

.media-row em {
  color: #f0abfc;
  display: block;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.media-row strong {
  display: -webkit-box;
  font-size: 13px;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.media-row small {
  color: #94a3b8;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 3px;
}

.media-feed-error {
  color: #fca5a5;
  font-size: 12px;
  font-weight: 800;
}

@container (min-width: 920px) {
  .media-spotlight {
    grid-template-columns: minmax(0, 0.94fr) minmax(360px, 1.06fr);
  }

  .media-copy h3 {
    font-size: clamp(24px, 4cqw, 38px);
  }
}

@container (max-width: 919px) {
  .media-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .media-hero-card {
    padding: 16px;
  }

  .media-copy {
    align-content: start;
  }

  .media-copy h3 {
    -webkit-line-clamp: 2;
    font-size: clamp(22px, 6.4cqw, 32px);
  }

  .media-copy p {
    -webkit-line-clamp: 2;
  }

  .media-actions {
    margin-top: 14px;
  }
}

@container (max-width: 760px) {
  .media-hero-card {
    min-height: 0;
    padding: 16px;
  }

  .media-spotlight {
    grid-template-columns: 1fr;
  }

  .media-copy h3 {
    font-size: clamp(22px, 7cqw, 30px);
    margin-top: 12px;
  }

  .media-copy p {
    -webkit-line-clamp: 2;
  }
}

@media (max-width: 680px) {
  .community-stories-panel {
    border-radius: 14px;
    margin-inline: -2px;
    overflow: hidden;
    padding: 14px;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel-heading button {
    width: 100%;
    justify-content: center;
  }

  .media-hero-card {
    min-height: 0;
    padding: 14px;
  }

  .media-preview {
    min-height: 220px;
  }

  .media-preview-empty {
    min-height: 210px;
  }

  .media-copy h3 {
    font-size: clamp(21px, 6vw, 28px);
    margin-top: 12px;
  }

  .media-copy p {
    font-size: 13px;
    line-height: 1.45;
  }

  .media-chip-grid {
    margin-inline: -14px;
    padding: 0 14px 4px;
    scroll-padding: 14px;
    scroll-snap-type: x proximity;
  }

  .media-chip-grid button {
    min-height: 40px;
    scroll-snap-align: start;
  }

  .media-list {
    display: flex;
    gap: 10px;
    margin-inline: -14px;
    overflow-x: auto;
    padding: 0 14px 4px;
    scroll-padding: 14px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .media-carousel-controls {
    margin-top: 0;
  }

  .media-list::-webkit-scrollbar {
    display: none;
  }

  .media-row {
    flex: 0 0 min(82vw, 320px);
    scroll-snap-align: start;
  }

  .media-play-orb {
    height: 62px;
    width: 62px;
  }
}
</style>
