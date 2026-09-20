<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { resolveAssetUrl } from '@/constants/assets'
import { HOME_HERO_SLIDE_DURATION } from '@/constants/home'
import { useTimedCarousel } from '@/composables/useTimedCarousel'
import bienvenidaImage from '@/iconos/bienvenida.png'
import bannerImage from '@/iconos/Banner.png'
import logoImage from '@/iconos/logo.png'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import HomeMediaPanel from '@/components/home/HomeMediaPanel.vue'
import HomeWelcomeLoader from '@/components/home/HomeWelcomeLoader.vue'
import { postCategoryLabels, normalizeCategory } from '@/services/postCategories'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'

const router = useRouter()
const HOME_WELCOME_STORAGE_KEY = 'galaxia-home-welcome-seen'
const HOME_WELCOME_MAX_WAIT = 4200
const shouldShowHomeWelcome = typeof window !== 'undefined'
  && sessionStorage.getItem(HOME_WELCOME_STORAGE_KEY) !== 'true'
const posts = ref([])
const mainEntries = ref([])
const communities = ref([])
const communityThreads = ref([])
const events = ref([])
const authorProfiles = ref({})
const isLoading = ref(true)
const isInitialHomeLoading = ref(shouldShowHomeWelcome)
const initialLoadCompleted = ref(!shouldShowHomeWelcome)
const homeWelcomeTimedOut = ref(false)
const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'
const COMMUNITY_SLIDE_DURATION = 3600
const ANALYSIS_SLIDE_DURATION = 5200
let homeWelcomeTimer = null

const approvedPosts = computed(() => posts.value
  .filter(post => post.status === 'approved')
  .filter(post => post.visibility !== 'private' && post.visibility !== 'unlisted')
  .filter(post => post.placement !== 'hero' && !post.isMainEntry)
  .filter(isReleased)
  .sort((a, b) => postSortTime(b) - postSortTime(a))
)

const latestPost = computed(() => approvedPosts.value[0] || null)
const analysisPosts = computed(() => approvedPosts.value.filter(isAnalysisPost))
const featuredAnalysisPost = computed(() => analysisPosts.value[0] || null)
const secondaryAnalysisPool = computed(() => analysisPosts.value.slice(1))
const secondaryAnalysisPageCount = computed(() => Math.max(1, Math.ceil(secondaryAnalysisPool.value.length / 3)))
const secondaryAnalysisPosts = computed(() => {
  const pool = secondaryAnalysisPool.value
  if (pool.length <= 3) return pool
  const start = secondaryAnalysisSlideIndex.value * 3
  const page = pool.slice(start, start + 3)
  if (page.length === 3) return page
  return [...page, ...pool.slice(0, 3 - page.length)]
})
const allNews = computed(() => approvedPosts.value.slice(0, 8))
const mainEntry = computed(() => mainEntries.value[0] || null)
const officialCommunity = computed(() => communities.value.find(item => item.isOfficial || item.id === OFFICIAL_COMMUNITY_ID) || communities.value[0] || null)
const pinnedHomeThread = computed(() => [...communityThreads.value]
  .filter(thread => thread.showOnHome || thread.pinnedHome)
  .sort((a, b) => getTime(b.homePinnedAt || b.pinnedAt || b.updatedAt || b.createdAt) - getTime(a.homePinnedAt || a.pinnedAt || a.updatedAt || a.createdAt))[0] || null
)
const featuredEvents = computed(() => events.value
  .filter(event => event.featured && getTime(event.startsAt) >= Date.now())
  .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
  .slice(0, 3)
)
const communityCards = computed(() => {
  const official = communities.value.find(item => item.isOfficial || item.id === OFFICIAL_COMMUNITY_ID)
  const rest = communities.value.filter(item => item.id !== official?.id).slice(0, 5)
  const cards = [
    official || {
      id: 'galaxia-oficial',
      name: 'Galaxia Nintendera',
      description: 'Noticias, directos y comunidad para fans de Nintendo.',
      iconUrl: logoImage,
      bannerUrl: bannerImage,
      isOfficial: true
    },
    ...rest
  ]
  const seen = new Set()
  return cards
    .filter((community) => {
      const key = community.id || normalizeCategory(community.name || '')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
})
const communityPageCount = computed(() => Math.max(1, Math.ceil(communityCards.value.length / 3)))
const visibleCommunityCards = computed(() => {
  const cards = communityCards.value
  if (cards.length <= 3) return cards
  const start = communitySlideIndex.value * 3
  return cards.slice(start, start + 3)
})
const heroSlides = computed(() => {
  const slides = []

  if (latestPost.value) {
    slides.push({
      id: `latest-${latestPost.value.id}`,
      eyebrow: latestPost.value.category || 'Ultima noticia',
      title: cardTitle(latestPost.value),
      text: latestPost.value.content || 'Una noticia destacada para empezar la visita.',
      image: latestPost.value.image || bannerImage,
      label: cardCategory(latestPost.value),
      meta: formatAgo(postDisplayDate(latestPost.value)),
      primaryLabel: 'Leer noticia',
      primaryIcon: 'fas fa-newspaper',
      action: () => goPost(latestPost.value)
    })
  }

  if (mainEntry.value) {
    slides.push({
      id: `main-${mainEntry.value.id}`,
      eyebrow: mainEntry.value.category || 'Principal',
      title: cardTitle(mainEntry.value),
      text: mainEntry.value.content || 'Un aviso destacado para recibir a la comunidad.',
      image: mainEntry.value.image || bienvenidaImage,
      label: mainEntry.value.category || 'Principal',
      meta: formatAgo(postDisplayDate(mainEntry.value)),
      primaryLabel: 'Leer ahora',
      primaryIcon: 'fas fa-bullhorn',
      action: () => goPost(mainEntry.value)
    })
  }

  featuredEvents.value.forEach((event) => {
    slides.push({
      id: `event-${event.id}`,
      eyebrow: event.type || 'Evento',
      title: event.title || 'Evento destacado',
      text: event.description || 'Un evento importante de Galaxia Nintendera.',
      image: event.backgroundUrl || event.imageUrl || bannerImage,
      label: event.type || 'Evento',
      meta: formatHeroDate(event.startsAt),
      primaryLabel: ['live', 'directo', 'direct'].includes(String(event.type || '').toLowerCase()) ? 'Apuntarme al live' : 'Ver evento',
      primaryIcon: 'far fa-calendar',
      action: () => router.push(`/eventos?id=${event.id}`)
    })
  })

  if (pinnedHomeThread.value) {
    const community = communityForThread(pinnedHomeThread.value)
    slides.push({
      id: `thread-${pinnedHomeThread.value.id}`,
      eyebrow: pinnedHomeThread.value.communityName || 'Comunidad',
      title: pinnedHomeThread.value.title || 'Destacado de la comunidad',
      text: pinnedHomeThread.value.body || 'Un comunicado importante fijado desde comunidades.',
      image: community?.bannerUrl || pinnedHomeThread.value.imageUrl || bannerImage,
      label: 'Comunidad',
      meta: community?.name || pinnedHomeThread.value.communityName || 'Galaxia',
      primaryLabel: 'Ver hilo',
      primaryIcon: 'far fa-comment',
      action: () => router.push({
        path: '/comunidad',
        query: {
          id: pinnedHomeThread.value.communityId || community?.id || OFFICIAL_COMMUNITY_ID,
          thread: pinnedHomeThread.value.id
        }
      })
    })
  }

  slides.push({
    id: 'community',
    eyebrow: 'Comunidades',
    title: 'Unete a nuestras comunidades',
    text: 'Comparte teorias, fanarts, dudas, partidas y eventos con otros fans de Nintendo.',
    image: officialCommunity.value?.bannerUrl || bienvenidaImage,
    label: 'Comunidad',
    meta: `${communityCards.value.length} galaxias activas`,
    primaryLabel: 'Explorar comunidades',
    primaryIcon: 'fas fa-users',
    action: () => router.push('/comunidad')
  })

  slides.push({
    id: 'welcome',
    eyebrow: 'Galaxia Nintendera',
    title: 'Noticias Nintendo y comunidad en un solo lugar',
    text: 'Lee novedades, guarda favoritos y encuentra comunidades creadas por fans.',
    image: bienvenidaImage,
    label: 'Bienvenida',
    meta: 'Nuevo inicio',
    primaryLabel: 'Ver noticias',
    primaryIcon: 'fas fa-newspaper',
    action: () => router.push('/noticias')
  })

  return slides
})
const liveItems = computed(() => {
  const eventItems = events.value.map(event => ({
    id: `event-${event.id}`,
    title: event.title || 'Evento de Galaxia',
    description: event.description || 'Actividad programada para la comunidad.',
    type: event.type || 'Evento',
    startsAt: event.startsAt,
    url: event.url || ''
  }))

  const mediaPosts = approvedPosts.value
    .filter(post => {
      const text = normalizeCategory(postCategoryLabels(post).join(' '))
      return text.includes('live') || text.includes('podcast') || text.includes('video') || text.includes('directo')
    })
    .map(post => ({
      id: `post-${post.id}`,
      title: post.title || 'Video',
      description: post.content || '',
      type: post.category || 'Video',
      startsAt: post.createdAt,
      url: '',
      action: () => goPost(post)
    }))

  return [...eventItems, ...mediaPosts]
    .sort((a, b) => getTime(b.startsAt) - getTime(a.startsAt))
    .slice(0, 5)
})

const loadData = async () => {
  isLoading.value = true
  try {
    const [postSnap, communitySnap, threadSnap, eventSnap] = await Promise.all([
      getDocs(collection(db, 'posts')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'communities')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'communityThreads')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'galaxyEvents')).catch(() => ({ docs: [] }))
    ])

    const approved = postSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(post => post.status === 'approved' && post.visibility !== 'private' && post.visibility !== 'unlisted')
      .sort((a, b) => postSortTime(b) - postSortTime(a))

    posts.value = approved.filter(post => post.placement !== 'hero' && !post.isMainEntry)
    mainEntries.value = approved.filter(post => (post.placement === 'hero' || post.isMainEntry) && isReleased(post))
    communities.value = communitySnap.docs.map(item => ({ id: item.id, ...item.data() }))
    communityThreads.value = threadSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    events.value = eventSnap.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(item => getTime(item.startsAt) >= Date.now() || item.featured)
      .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
    await loadAuthorProfiles()
  } finally {
    isLoading.value = false
    finishInitialHomeLoad()
  }
}

const finishInitialHomeLoad = () => {
  if (initialLoadCompleted.value) return
  initialLoadCompleted.value = true
  isInitialHomeLoading.value = false
  if (typeof window !== 'undefined') {
    window.clearTimeout(homeWelcomeTimer)
    homeWelcomeTimer = null
  }
}

const loadAuthorProfiles = async () => {
  const ids = [...new Set(posts.value.map(post => post.authorId).filter(Boolean))]
  if (!ids.length) return
  const snap = await getDocs(collection(db, 'users')).catch(() => ({ docs: [] }))
  authorProfiles.value = Object.fromEntries(
    snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(user => ids.includes(user.id))
      .map(user => [user.id, user])
  )
}

const getTime = (timestamp) => {
  if (!timestamp) return 0
  return timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()
}

const postDisplayDate = (post = {}) => Math.max(
  getTime(post.publishedAt),
  getTime(post.updatedAt),
  getTime(post.createdAt)
) || post.publishedAt || post.updatedAt || post.createdAt
const postSortTime = (post = {}) => getTime(postDisplayDate(post))

const isReleased = (post) => {
  const releaseTime = getTime(post.releaseAt || post.scheduledAt)
  return !releaseTime || releaseTime <= Date.now()
}

const formatHeroDate = (timestamp) => {
  const time = getTime(timestamp)
  if (!time) return 'Fecha pendiente'
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const formatAgo = (timestamp) => {
  const time = getTime(timestamp)
  if (!time) return 'Reciente'
  const hours = Math.max(1, Math.floor((Date.now() - time) / 36e5))
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `Hace ${days} dia${days === 1 ? '' : 's'}`
}

const formatDate = (timestamp) => {
  const time = getTime(timestamp)
  if (!time) return 'Fecha pendiente'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const postPath = (post) => `/post/${post?.slug || post?.id}`
const goPost = (post) => {
  if (post?.action) {
    post.action()
    return
  }
  if (post?.id) router.push(postPath(post))
}
const goCommunity = (community) => {
  router.push(community?.id ? `/comunidad?id=${encodeURIComponent(community.id)}` : '/comunidad')
}
const communityForThread = (thread) => {
  if (!thread) return officialCommunity.value
  return communities.value.find(community => community.id === thread.communityId)
    || communities.value.find(community => community.name === thread.communityName)
    || officialCommunity.value
}
const openMediaItem = (item) => {
  if (item?.action) {
    item.action()
    return
  }
  if (item?.url && typeof window !== 'undefined') {
    window.open(item.url, '_blank', 'noopener,noreferrer')
    return
  }
  router.push('/eventos')
}

const postCategories = (post) => postCategoryLabels(post)
const cardTitle = (post) => post?.analysis?.hypeTitle || post?.title || 'Publicacion'
const cardCategory = (post) => postCategories(post)[0] || post?.category || 'Noticias'
const isAnalysisPost = (post) => postCategories(post).some(category => normalizeCategory(category).includes('analisis'))
const authorProfile = (post) => authorProfiles.value[post?.authorId] || {}
const authorIcon = (post) => post?.authorId ? resolveProfileIcon(authorProfile(post)) : ''
const authorIconMeta = (post) => post?.authorId ? resolveProfileIconMeta(authorProfile(post)) : {}
const heroCarousel = useTimedCarousel(computed(() => heroSlides.value.length), HOME_HERO_SLIDE_DURATION)
const heroSlideIndex = heroCarousel.index
const heroProgressPercent = heroCarousel.progressPercent
const activeHeroSlide = computed(() => heroSlides.value[heroSlideIndex.value] || heroSlides.value[0] || null)
const communityCarousel = useTimedCarousel(communityPageCount, COMMUNITY_SLIDE_DURATION)
const communitySlideIndex = communityCarousel.index
const secondaryAnalysisCarousel = useTimedCarousel(secondaryAnalysisPageCount, ANALYSIS_SLIDE_DURATION)
const secondaryAnalysisSlideIndex = secondaryAnalysisCarousel.index
const selectHeroSlide = (index) => {
  heroCarousel.select(index)
}
const selectCommunitySlide = (index) => {
  communityCarousel.select(index)
}
const selectSecondaryAnalysisSlide = (index) => {
  secondaryAnalysisCarousel.select(index)
}
const openHeroSlide = () => {
  if (typeof activeHeroSlide.value?.action === 'function') activeHeroSlide.value.action()
}

onMounted(() => {
  if (shouldShowHomeWelcome && typeof window !== 'undefined') {
    sessionStorage.setItem(HOME_WELCOME_STORAGE_KEY, 'true')
    homeWelcomeTimer = window.setTimeout(() => {
      homeWelcomeTimedOut.value = true
      finishInitialHomeLoad()
    }, HOME_WELCOME_MAX_WAIT)
  }

  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  heroCarousel.start()
  communityCarousel.start()
  secondaryAnalysisCarousel.start()
  loadData()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') window.clearTimeout(homeWelcomeTimer)
  heroCarousel.stop()
  communityCarousel.stop()
  secondaryAnalysisCarousel.stop()
})
</script>

<template>
  <div class="home2-page">
    <HomeWelcomeLoader :visible="isInitialHomeLoading" />

    <main class="home2-shell">
      <section v-if="isLoading" class="home2-loading">
        <span></span>
        <strong></strong>
        <p></p>
      </section>

      <template v-else>
        <section class="home2-hero-grid">
          <article
            v-if="activeHeroSlide"
            :class="['home2-main-hero', `is-${activeHeroSlide.id.split('-')[0]}`]"
            :style="{ '--hero-image': `url(${resolveAssetUrl(activeHeroSlide.image, bannerImage)})` }"
            role="button"
            tabindex="0"
            @click="openHeroSlide"
            @keydown.enter.prevent="openHeroSlide"
          >
            <span class="home2-pill"><i class="fas fa-fire"></i> {{ activeHeroSlide.eyebrow }}</span>
            <h1>{{ activeHeroSlide.title }}</h1>
            <p>{{ activeHeroSlide.text }}</p>
            <div class="home2-meta">
              <span><i class="far fa-clock"></i> {{ activeHeroSlide.meta }}</span>
              <span>{{ activeHeroSlide.label }}</span>
              <span class="home2-hero-cta">
                <i :class="activeHeroSlide.primaryIcon || 'fas fa-arrow-right'"></i>
                {{ activeHeroSlide.primaryLabel || 'Ver mas' }}
              </span>
            </div>
            <div v-if="heroSlides.length > 1" class="home2-hero-controls" @click.stop>
              <div class="home2-hero-progress">
                <span :style="{ width: `${heroProgressPercent}%` }"></span>
              </div>
              <div class="home2-hero-dots" aria-label="Destacados principales">
                <button
                  v-for="(slide, index) in heroSlides"
                  :key="slide.id"
                  type="button"
                  :class="{ active: index === heroSlideIndex }"
                  :aria-label="`Ver ${slide.label}`"
                  @click="selectHeroSlide(index)"
                ></button>
              </div>
            </div>
          </article>
        </section>

        <section class="home2-community-band">
          <div>
            <span><i class="fas fa-users"></i> Comunidad Nintendo</span>
            <h2>Unete a nuestras comunidades</h2>
            <p>Comparte noticias, teorias, partidas, fanarts y eventos con otros fans de Nintendo.</p>
            <button type="button" @click="router.push('/comunidad')">Explorar comunidades <i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="home2-community-carousel">
            <div class="home2-community-grid">
              <button v-for="community in visibleCommunityCards" :key="community.id" type="button" class="home2-community-card" @click="goCommunity(community)">
                <img v-if="community.iconUrl || community.bannerUrl" :src="resolveAssetUrl(community.iconUrl || community.bannerUrl, logoImage)" alt="" />
                <span v-else>{{ String(community.name || 'G').charAt(0) }}</span>
                <strong>{{ community.name || 'Comunidad' }}</strong>
              </button>
            </div>
            <div v-if="communityPageCount > 1" class="home2-community-dots" aria-label="Comunidades destacadas">
              <button
                v-for="page in communityPageCount"
                :key="`community-page-${page}`"
                type="button"
                :class="{ active: page - 1 === communitySlideIndex }"
                :aria-label="`Ver grupo ${page} de comunidades`"
                @click="selectCommunitySlide(page - 1)"
              ></button>
            </div>
          </div>
        </section>

        <section class="home2-panel analysis-panel">
          <header class="home2-panel-head">
            <h2><i class="fas fa-star"></i> Analisis destacados</h2>
            <button type="button" @click="router.push('/categoria/Analisis')">Ver todos <i class="fas fa-arrow-right"></i></button>
          </header>
          <button
            v-if="featuredAnalysisPost"
            type="button"
            class="home2-analysis-featured"
            :style="{ '--analysis-image': `url(${resolveAssetUrl(featuredAnalysisPost.image, bannerImage)})` }"
            @click="goPost(featuredAnalysisPost)"
          >
            <span><i class="fas fa-crown"></i> Analisis premium</span>
            <em><i class="fas fa-star"></i> {{ featuredAnalysisPost.analysis?.score || '--' }} <small>Nota</small></em>
            <div>
              <h3>{{ cardTitle(featuredAnalysisPost) }}</h3>
              <p>{{ featuredAnalysisPost.content }}</p>
              <footer>
                <ProfileAvatar
                  v-if="featuredAnalysisPost.authorId"
                  :src="authorIcon(featuredAnalysisPost)"
                  :alt="featuredAnalysisPost.authorName || 'Autor'"
                  :icon-id="authorIconMeta(featuredAnalysisPost)?.id"
                  :frame-id="authorIconMeta(featuredAnalysisPost)?.frameId"
                  size="sm"
                />
                <strong>{{ featuredAnalysisPost.authorName || 'Redactor' }} - {{ formatAgo(postDisplayDate(featuredAnalysisPost)) }}</strong>
                <b>Leer analisis <i class="fas fa-arrow-right"></i></b>
              </footer>
            </div>
          </button>
          <div class="home2-analysis-grid">
            <button v-for="post in secondaryAnalysisPosts" :key="post.id" type="button" class="home2-analysis-card" @click="goPost(post)">
              <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
              <span><i class="fas fa-crown"></i> Analisis premium</span>
              <strong>{{ cardTitle(post) }}</strong>
              <p>{{ post.content }}</p>
              <em><i class="fas fa-star"></i> {{ post.analysis?.score || '--' }} <small>Nota</small></em>
            </button>
          </div>
          <div v-if="secondaryAnalysisPageCount > 1" class="home2-analysis-dots" aria-label="Grupos de analisis destacados">
            <button
              v-for="page in secondaryAnalysisPageCount"
              :key="`analysis-page-${page}`"
              type="button"
              :class="{ active: page - 1 === secondaryAnalysisSlideIndex }"
              :aria-label="`Ver grupo ${page} de analisis`"
              @click="selectSecondaryAnalysisSlide(page - 1)"
            ></button>
          </div>
        </section>

        <section class="home2-panel">
          <header class="home2-panel-head">
            <h2><i class="far fa-newspaper"></i> Todas las noticias</h2>
            <button type="button" @click="router.push('/noticias')">Archivo <i class="fas fa-arrow-right"></i></button>
          </header>
          <div class="home2-all-grid">
            <button v-for="post in allNews" :key="post.id" type="button" :class="['home2-all-card', { analysis: isAnalysisPost(post) }]" @click="goPost(post)">
              <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
              <div>
                <span>{{ cardCategory(post) }}</span>
                <strong>{{ cardTitle(post) }}</strong>
                <small>{{ post.authorName || 'Redactor' }} - {{ formatAgo(postDisplayDate(post)) }}</small>
              </div>
            </button>
          </div>
        </section>

        <HomeMediaPanel
          :items="liveItems"
          :communities="communities"
          :format-date="formatDate"
          @open-community="goCommunity"
          @open-item="openMediaItem"
        />
      </template>
    </main>
  </div>
</template>

<style scoped>
.home2-page {
  background:
    linear-gradient(115deg, transparent 0 36%, rgba(34, 211, 238, 0.07) 42%, transparent 50%),
    linear-gradient(68deg, transparent 0 54%, rgba(236, 72, 153, 0.07) 60%, transparent 68%),
    radial-gradient(circle at 18% 0%, rgba(147, 51, 234, 0.24), transparent 28%),
    radial-gradient(circle at 78% 24%, rgba(34, 211, 238, 0.1), transparent 26%),
    #050816;
  color: #ffffff;
  min-height: 100vh;
  overflow: hidden auto;
  padding: var(--public-page-top, 88px) 16px 42px;
  position: relative;
}

/* Ambient background layer: remove this block and .home2-shell z-index to disable it cleanly. */
.home2-page::before,
.home2-page::after {
  content: '';
  inset: 0;
  pointer-events: none;
  position: fixed;
}

.home2-page::before {
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.22) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(168, 85, 247, 0.22) 0 1px, transparent 1.5px);
  background-position: 0 0, 42px 58px;
  background-size: 140px 140px, 190px 190px;
  opacity: 0.26;
}

.home2-page::after {
  background:
    linear-gradient(105deg, transparent 10%, rgba(34, 211, 238, 0.08) 32%, transparent 46%),
    linear-gradient(74deg, transparent 44%, rgba(236, 72, 153, 0.08) 62%, transparent 76%);
  mix-blend-mode: screen;
  opacity: 0.7;
}

.home2-shell {
  display: grid;
  gap: 24px;
  margin: 0 auto;
  max-width: 1280px;
  position: relative;
  z-index: 1;
}

.home2-loading,
.home2-panel,
.home2-community-band,
.home2-main-hero {
  border: 1px solid rgba(168, 85, 247, 0.42);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.24), 0 0 34px rgba(168, 85, 247, 0.12);
}

.home2-loading {
  background: rgba(8, 13, 29, 0.82);
  border-radius: 14px;
  display: grid;
  gap: 18px;
  min-height: 520px;
  padding: 48px;
}

.home2-loading span,
.home2-loading strong,
.home2-loading p {
  animation: home2Pulse 1.15s ease-in-out infinite alternate;
  background: linear-gradient(90deg, rgba(255,255,255,0.12), rgba(216,180,254,0.28), rgba(255,255,255,0.12));
  border-radius: 999px;
}

.home2-loading span { height: 36px; width: 160px; }
.home2-loading strong { height: 88px; max-width: 720px; width: 76%; }
.home2-loading p { height: 24px; max-width: 620px; width: 64%; }

.home2-hero-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr;
}

.home2-main-hero {
  align-content: end;
  background:
    linear-gradient(90deg, rgba(5, 8, 22, 0.92), rgba(5, 8, 22, 0.42)),
    var(--hero-image);
  background-position: center;
  background-size: cover;
  border-color: rgba(34, 211, 238, 0.68);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(168, 85, 247, 0.42),
    0 0 34px rgba(34, 211, 238, 0.28),
    0 0 62px rgba(236, 72, 153, 0.2),
    0 30px 90px rgba(0, 0, 0, 0.36);
  cursor: pointer;
  display: grid;
  gap: 16px;
  height: clamp(500px, 44vw, 560px);
  overflow: hidden;
  padding: clamp(24px, 4vw, 42px);
  position: relative;
  text-align: left;
}

.home2-main-hero::before {
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.85), rgba(168, 85, 247, 0.72), rgba(236, 72, 153, 0.84), rgba(250, 204, 21, 0.68));
  content: '';
  inset: 0;
  opacity: 0.16;
  pointer-events: none;
  position: absolute;
}

.home2-main-hero > * {
  position: relative;
  z-index: 1;
}

.home2-main-hero h1 {
  display: -webkit-box;
  font-size: clamp(34px, 4.2vw, 58px);
  font-weight: 950;
  line-height: 0.98;
  max-width: 760px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.home2-main-hero p {
  color: #cbd5e1;
  display: -webkit-box;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.55;
  max-width: 640px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.home2-pill,
.home2-analysis-card span,
.home2-all-card span,
.home2-community-band > div > span {
  align-items: center;
  background: rgba(124, 58, 237, 0.78);
  border-radius: 999px;
  color: #f5f3ff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  padding: 7px 11px;
  text-transform: uppercase;
  width: max-content;
}

.home2-meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.home2-meta span {
  align-items: center;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #e2e8f0;
  display: inline-flex;
  font-size: 12px;
  font-weight: 850;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
}

.home2-meta .home2-hero-cta {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.94), rgba(236, 72, 153, 0.78));
  border-color: rgba(244, 214, 255, 0.42);
  box-shadow: 0 14px 32px rgba(168, 85, 247, 0.24);
  color: #fff;
  min-height: 38px;
  padding: 0 15px;
}

.home2-hero-cta i {
  font-size: 12px;
}

.home2-hero-controls {
  align-items: center;
  display: flex;
  gap: 14px;
  margin-top: 6px;
  max-width: 640px;
}

.home2-hero-progress {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  flex: 1;
  height: 4px;
  overflow: hidden;
}

.home2-hero-progress span {
  background: linear-gradient(90deg, #22d3ee, #a855f7, #ec4899);
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 0.2s linear;
}

.home2-hero-dots {
  align-items: center;
  display: inline-flex;
  gap: 8px;
}

.home2-hero-dots button {
  background: rgba(148, 163, 184, 0.48);
  border: 0;
  border-radius: 999px;
  height: 9px;
  padding: 0;
  transition: background 0.2s ease, width 0.2s ease;
  width: 9px;
}

.home2-hero-dots button.active {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  box-shadow: 0 0 18px rgba(236, 72, 153, 0.42);
  width: 30px;
}

.home2-panel {
  background: rgba(8, 13, 29, 0.78);
  border-radius: 14px;
  display: grid;
  gap: 16px;
  padding: 18px;
}

.home2-panel-head {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
}

.home2-panel-head h2 {
  align-items: center;
  display: inline-flex;
  font-size: 22px;
  font-weight: 950;
  gap: 10px;
}

.home2-panel-head h2 i {
  color: #facc15;
}

.home2-panel-head button,
.home2-community-band button {
  align-items: center;
  background: rgba(124, 58, 237, 0.72);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
}

.home2-analysis-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.home2-analysis-featured,
.home2-analysis-card,
.home2-all-card,
.home2-community-card {
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.home2-analysis-featured:hover,
.home2-analysis-card:hover,
.home2-all-card:hover,
.home2-community-card:hover {
  transform: translateY(-2px);
}

.home2-analysis-featured,
.home2-analysis-card {
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(168, 85, 247, 0.42);
  border-radius: 10px;
  display: grid;
  gap: 10px;
  overflow: hidden;
  padding: 10px;
  position: relative;
}

.home2-analysis-featured {
  align-content: end;
  background:
    linear-gradient(180deg, rgba(120, 53, 15, 0.34), rgba(15, 12, 7, 0.74) 48%, rgba(5, 8, 16, 0.98)),
    var(--analysis-image);
  background-position: center 24%;
  background-size: cover;
  border: 2px solid rgba(250, 204, 21, 0.88);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(245, 158, 11, 0.34),
    0 0 28px rgba(250, 204, 21, 0.2),
    0 0 48px rgba(168, 85, 247, 0.16),
    0 26px 78px rgba(120, 53, 15, 0.42);
  color: #fff;
  cursor: pointer;
  isolation: isolate;
  min-height: 560px;
  overflow: hidden;
  padding: clamp(18px, 3vw, 30px);
}

.home2-analysis-featured::before {
  background:
    linear-gradient(100deg, transparent 10%, rgba(253, 230, 138, 0.16) 42%, transparent 68%),
    radial-gradient(circle at 16% 10%, rgba(250, 204, 21, 0.2), transparent 28%);
  content: '';
  inset: 0;
  opacity: 0.85;
  pointer-events: none;
  position: absolute;
}

.home2-analysis-featured::after {
  background:
    linear-gradient(90deg, #facc15, #f59e0b, #a855f7, #ec4899, #22d3ee),
    radial-gradient(circle at 18% 20%, rgba(250, 204, 21, 0.55), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(168, 85, 247, 0.45), transparent 30%);
  border-radius: inherit;
  content: '';
  filter: saturate(1.2);
  inset: -2px;
  opacity: 0.46;
  pointer-events: none;
  position: absolute;
  z-index: -1;
}

.home2-analysis-featured:hover {
  border-color: rgba(253, 230, 138, 0.94);
  box-shadow:
    0 0 0 1px rgba(250, 204, 21, 0.4),
    0 0 40px rgba(250, 204, 21, 0.24),
    0 0 58px rgba(168, 85, 247, 0.2),
    0 30px 86px rgba(120, 53, 15, 0.48);
}

.home2-analysis-featured > * {
  position: relative;
  z-index: 1;
}

.home2-analysis-featured > span {
  align-items: center;
  background: linear-gradient(135deg, rgba(161, 98, 7, 0.96), rgba(120, 53, 15, 0.92));
  border: 1px solid rgba(250, 204, 21, 0.78);
  border-radius: 999px;
  color: #fef3c7;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  left: 22px;
  padding: 10px 16px;
  position: absolute;
  text-transform: uppercase;
  top: 22px;
}

.home2-analysis-featured em {
  align-items: center;
  background: rgba(8, 13, 29, 0.9);
  border: 1px solid rgba(250, 204, 21, 0.42);
  border-radius: 14px;
  color: #facc15;
  display: inline-flex;
  font-size: 34px;
  font-style: normal;
  font-weight: 950;
  gap: 8px;
  padding: 10px 14px;
  position: absolute;
  right: 22px;
  top: 22px;
}

.home2-analysis-featured em small {
  color: #fde68a;
  font-size: 9px;
  text-transform: uppercase;
}

.home2-analysis-featured h3 {
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.05;
  max-width: 760px;
}

.home2-analysis-featured p {
  color: #e2e8f0;
  display: -webkit-box;
  font-size: 15px;
  font-weight: 850;
  line-height: 1.5;
  margin-top: 14px;
  max-width: 820px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.home2-analysis-featured footer {
  align-items: center;
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.home2-analysis-featured footer strong {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 950;
}

.home2-analysis-featured footer b {
  align-items: center;
  background: rgba(146, 64, 14, 0.86);
  border: 1px solid rgba(253, 230, 138, 0.44);
  border-radius: 999px;
  color: #fff7ed;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  margin-left: auto;
  min-height: 38px;
  padding: 0 15px;
}

.home2-analysis-card img {
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  object-fit: cover;
  object-position: center top;
  width: 100%;
}

.home2-analysis-card strong,
.home2-all-card strong {
  color: #fff;
  display: -webkit-box;
  font-size: 15px;
  font-weight: 950;
  line-height: 1.18;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home2-all-card small {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.analysis-panel,
.home2-analysis-card {
  border-color: rgba(250, 204, 21, 0.7);
  box-shadow:
    0 0 0 1px rgba(245, 158, 11, 0.18),
    0 0 36px rgba(250, 204, 21, 0.12),
    0 24px 74px rgba(0, 0, 0, 0.28);
}

.home2-analysis-card {
  background:
    linear-gradient(135deg, rgba(24, 18, 6, 0.96), rgba(40, 24, 4, 0.88)) padding-box,
    linear-gradient(135deg, rgba(250, 204, 21, 0.9), rgba(168, 85, 247, 0.62), rgba(245, 158, 11, 0.82)) border-box,
    radial-gradient(circle at 84% 18%, rgba(250, 204, 21, 0.18), transparent 28%),
    rgba(19, 15, 8, 0.94);
  border-color: transparent;
  box-shadow:
    0 0 0 1px rgba(250, 204, 21, 0.2),
    0 0 28px rgba(245, 158, 11, 0.16),
    0 20px 48px rgba(0, 0, 0, 0.34);
}

.home2-analysis-card span {
  background: rgba(113, 63, 18, 0.9);
  color: #fef3c7;
}

.home2-analysis-card p {
  color: #cbd5e1;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home2-analysis-card em {
  align-items: center;
  background: rgba(8, 13, 29, 0.88);
  border: 1px solid rgba(250, 204, 21, 0.46);
  border-radius: 12px;
  color: #facc15;
  display: inline-flex;
  font-size: 24px;
  font-style: normal;
  font-weight: 950;
  gap: 6px;
  padding: 8px 10px;
  position: absolute;
  right: 16px;
  top: 16px;
}

.home2-analysis-card em small {
  color: #fde68a;
  font-size: 8px;
  text-transform: uppercase;
}

.home2-all-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.home2-all-card {
  align-items: center;
  background: rgba(15, 23, 42, 0.74);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  display: grid;
  gap: 12px;
  grid-template-columns: 126px minmax(0, 1fr);
  padding: 10px;
}

.home2-all-card.analysis {
  border-color: rgba(250, 204, 21, 0.54);
}

.home2-all-card img {
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  object-fit: cover;
  width: 100%;
}

.home2-all-card div {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.home2-community-band {
  align-items: center;
  background:
    radial-gradient(circle at 18% 46%, rgba(236, 72, 153, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(76, 29, 149, 0.92), rgba(124, 58, 237, 0.78), rgba(15, 23, 42, 0.92));
  border-radius: 14px;
  display: grid;
  gap: 22px;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.95fr);
  padding: 28px;
}

.home2-community-carousel {
  align-self: center;
  display: grid;
  gap: 14px;
  justify-self: end;
  max-width: 640px;
  min-width: 0;
  width: 100%;
}

.home2-community-band h2 {
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 950;
  line-height: 1;
  margin-top: 10px;
}

.home2-community-band p {
  color: #e9d5ff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.55;
  margin: 12px 0 18px;
  max-width: 560px;
}

.home2-community-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.home2-community-card {
  align-items: center;
  background: rgba(15, 23, 42, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  color: #fff;
  display: grid;
  gap: 12px;
  grid-template-columns: 54px minmax(0, 1fr);
  justify-items: start;
  min-height: 78px;
  padding: 10px 16px 10px 10px;
  text-align: left;
}

.home2-community-card:first-child {
  border-color: rgba(216, 180, 254, 0.44);
  box-shadow: 0 0 24px rgba(168, 85, 247, 0.18);
}

.home2-community-grid img,
.home2-community-grid span {
  border-radius: 16px;
  height: 54px;
  object-fit: cover;
  width: 54px;
}

.home2-community-grid span {
  align-items: center;
  background: #7c3aed;
  display: flex;
  font-size: 20px;
  font-weight: 950;
  justify-content: center;
}

.home2-community-grid strong {
  display: -webkit-box;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.2;
  overflow: hidden;
  text-align: left;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home2-community-dots,
.home2-analysis-dots {
  align-items: center;
  display: flex;
  gap: 7px;
  justify-content: center;
  min-height: 16px;
}

.home2-community-dots button,
.home2-analysis-dots button {
  background: rgba(216, 180, 254, 0.34);
  border: 0;
  border-radius: 999px;
  display: block;
  flex: 0 0 auto;
  height: 7px;
  min-height: 0;
  min-width: 0;
  padding: 0 !important;
  transition: background 0.2s ease, box-shadow 0.2s ease, width 0.2s ease;
  width: 22px;
}

.home2-community-dots button.active,
.home2-analysis-dots button.active {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  box-shadow: 0 0 16px rgba(236, 72, 153, 0.44);
  width: 34px;
}

.home2-analysis-dots {
  margin-top: -2px;
}

@keyframes home2Pulse {
  from { opacity: 0.58; }
  to { opacity: 1; }
}

@media (max-width: 980px) {
  .home2-hero-grid,
  .home2-community-band {
    grid-template-columns: 1fr;
  }

  .home2-all-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home2-analysis-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home2-page {
    padding: var(--public-page-top-mobile, 72px) 10px var(--public-page-bottom-mobile, 124px);
  }

  .home2-main-hero {
    height: 520px;
  }

  .home2-hero-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .home2-main-hero h1 {
    font-size: 34px;
    -webkit-line-clamp: 5;
  }

  .home2-analysis-featured {
    background-position: center top;
    min-height: 520px;
  }

  .home2-analysis-featured em {
    font-size: 24px;
  }

  .home2-analysis-featured footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .home2-analysis-featured footer b {
    margin-left: 0;
  }

  .home2-all-card {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .home2-analysis-grid,
  .home2-all-grid,
  .home2-community-grid {
    grid-template-columns: 1fr;
  }

  .home2-community-card {
    justify-items: center;
    grid-template-columns: 64px minmax(0, 1fr);
    min-height: 92px;
  }

  .home2-community-carousel {
    justify-self: center;
  }

  .home2-community-grid img,
  .home2-community-grid span {
    height: 64px;
    width: 64px;
  }

  .home2-community-grid strong {
    justify-self: start;
  }
}
</style>
