<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, getDocs } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { resolveProfileIcon } from '@/services/profileProgress'
import { categoryIcon, loadPostCategories, normalizeCategory, postCategoryLabels, postMatchesCategory } from '@/services/postCategories'
import bienvenidaImage from '@/iconos/bienvenida.png'
import bannerImage from '@/iconos/Banner.png'

const router = useRouter()
const posts = ref([])
const mainEntries = ref([])
const upcomingPosts = ref([])
const communities = ref([])
const communityThreads = ref([])
const galaxyEvents = ref([])
const viewedPosts = ref([])
const rewardedPosts = ref([])
const authorProfiles = ref({})
const latestPage = ref(0)
const selectedLatestFilter = ref('Todas')
const categories = ref([])
const heroSlideIndex = ref(0)
const heroProgressPercent = ref(0)
const latestProgressPercent = ref(0)
const POSTS_PER_PAGE = 3
const HERO_SLIDE_DURATION = 10000
const LATEST_SLIDE_DURATION = 9000
let heroTimer = null
let heroProgressTimer = null
let latestTimer = null
let latestProgressTimer = null

const latestPool = computed(() => {
  return posts.value
})
const latestPageCount = computed(() => {
  if (!latestPool.value.length) return 0
  return Math.ceil(latestPool.value.length / POSTS_PER_PAGE)
})
const maxLatestPage = computed(() => Math.max(0, latestPageCount.value - 1))
const latestPosts = computed(() => {
  const start = latestPage.value * POSTS_PER_PAGE
  return latestPool.value.slice(start, start + POSTS_PER_PAGE)
})
const featuredPost = computed(() => posts.value[0] || null)
const officialCommunity = computed(() => communities.value.find(community => community.isOfficial || community.id === 'galaxia-oficial') || communities.value[0] || null)
const recommendedCommunities = computed(() => communities.value.filter(community => community.id !== 'galaxia-oficial').slice(0, 4))
const pinnedHomeThread = computed(() => [...communityThreads.value]
  .filter(thread => thread.pinnedHome)
  .sort((a, b) => getTime(b.pinnedAt || b.updatedAt || b.createdAt) - getTime(a.pinnedAt || a.updatedAt || a.createdAt))[0] || null
)
const successfulThreads = computed(() => [...communityThreads.value]
  .sort((a, b) => (Number(b.likes || 0) + Number(b.replies || 0)) - (Number(a.likes || 0) + Number(a.replies || 0)))
  .slice(0, 3)
)
const homeCalendarItems = computed(() => {
  const postItems = upcomingPosts.value
    .filter(post => post.teaserVisible !== false)
    .map(post => ({
      id: `post-${post.id}`,
      type: 'Lanzamiento post',
      title: cardTitle(post),
      description: post.content || 'Disponible proximamente para leer.',
      startsAt: post.releaseAt || post.scheduledAt,
      action: () => goPost(post.id)
    }))

  const eventItems = galaxyEvents.value.map(event => ({
    id: `event-${event.id}`,
    type: event.type || 'Evento',
    title: event.title,
    description: event.description || 'Evento programado para la comunidad.',
    startsAt: event.startsAt,
    url: event.url || '',
    action: () => router.push(`/eventos?id=${event.id}`)
  }))

  return [...postItems, ...eventItems]
    .filter(item => getTime(item.startsAt) >= Date.now())
    .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
    .slice(0, 6)
})
const nextCalendarItem = computed(() => homeCalendarItems.value[0] || null)
const livePodcastItems = computed(() => {
  const scheduled = homeCalendarItems.value.filter(item => {
    const type = normalizeCategory(item.type)
    return type.includes('live') || type.includes('podcast')
  })

  if (scheduled.length) return scheduled.slice(0, 3)

  return posts.value
    .filter(post => {
      const categoryText = postCategoryLabels(post).join(' ')
      return normalizeCategory(categoryText).includes('podcast') || normalizeCategory(categoryText).includes('live')
    })
    .slice(0, 3)
    .map(post => ({
      id: `media-${post.id}`,
      title: cardTitle(post),
      description: post.content,
      type: post.category || 'Media',
      startsAt: post.createdAt,
      action: () => goPost(post.id)
    }))
})
const featuredDashboardPosts = computed(() => posts.value.slice(0, 4))
const mainEntry = computed(() => mainEntries.value[0] || null)
const featuredHomeEvents = computed(() => galaxyEvents.value
  .filter(event => event.featured && getTime(event.startsAt) >= Date.now())
  .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
  .slice(0, 3)
)
const formatHeroDate = (value) => {
  const time = getTime(value)
  if (!time) return ''
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}
const heroSlides = computed(() => {
  const slides = []

  if (pinnedHomeThread.value) {
    slides.push({
      id: `thread-${pinnedHomeThread.value.id}`,
      eyebrow: pinnedHomeThread.value.communityName || 'Hilo fijado',
      title: pinnedHomeThread.value.title || 'Destacado de la comunidad',
      accent: 'Destacado',
      text: pinnedHomeThread.value.body || 'Un comunicado importante fijado desde comunidades.',
      image: pinnedHomeThread.value.imageUrl || bannerImage,
      label: 'Destacado',
      primaryLabel: 'Ver hilo',
      primaryIcon: 'far fa-comment',
      action: () => router.push('/comunidad')
    })
  }

  if (mainEntry.value) {
    slides.push({
      id: `main-${mainEntry.value.id}`,
      eyebrow: mainEntry.value.category || 'Principal',
      title: cardTitle(mainEntry.value),
      accent: mainEntry.value.category || 'Hoy',
      text: mainEntry.value.content || 'Un aviso destacado para recibir a la comunidad.',
      image: mainEntry.value.image || bienvenidaImage,
      label: mainEntry.value.category || 'Principal',
      primaryLabel: 'Leer ahora',
      primaryIcon: 'fas fa-newspaper',
      action: () => goPost(mainEntry.value.id)
    })
  }

  featuredHomeEvents.value.forEach((event) => {
    slides.push({
      id: `event-${event.id}`,
      eyebrow: event.type || 'Evento',
      title: event.title || 'Evento destacado',
      accent: '',
      text: event.description || 'Un evento importante de Galaxia Nintendera.',
      meta: formatHeroDate(event.startsAt),
      image: event.backgroundUrl || event.imageUrl || bannerImage,
      label: event.type || 'Evento',
      primaryLabel: ['live', 'directo', 'direct'].includes(String(event.type || '').toLowerCase()) ? 'Apuntarme al live' : 'Apuntarme al evento',
      primaryIcon: 'far fa-bell',
      secondaryLabel: 'Ver detalles',
      secondaryIcon: 'far fa-calendar',
      action: () => router.push(`/eventos?id=${event.id}`)
    })
  })

  slides.push({
      id: 'welcome',
      eyebrow: 'Galaxia Nintendera',
      title: 'Noticias Nintendo y comunidad en un solo lugar',
      accent: 'Nintendo',
      text: 'Lee novedades, guarda tus favoritos y entra a comunidades creadas por fans.',
      image: bienvenidaImage,
      label: 'Bienvenida',
      primaryLabel: 'Ver noticias',
      primaryIcon: 'fas fa-newspaper',
      action: () => router.push('/noticias')
  })

  if (featuredPost.value) {
    slides.push({
      id: 'featured',
      eyebrow: featuredPost.value.category || 'Ultima noticia',
      title: cardTitle(featuredPost.value),
      accent: 'Ahora',
      text: featuredPost.value.content || 'Una noticia destacada para empezar la visita.',
      image: featuredPost.value.image || bannerImage,
      label: 'Noticia',
      primaryLabel: 'Leer noticia',
      primaryIcon: 'fas fa-newspaper',
      action: () => goPost(featuredPost.value.id)
    })
  }

  slides.push({
    id: 'community',
    eyebrow: 'Comunidades',
    title: 'Comparte teorias, fanarts, dudas y partidas',
    accent: 'Comunidad',
    text: 'Entra a tu galaxia favorita y habla con otros fans sin perderte las noticias. Unete a la comunidad ahora!',
    image: null,
    label: 'Comunidad',
    primaryLabel: 'Entrar a comunidades',
    primaryIcon: 'fas fa-users',
    action: () => router.push('/comunidad')
  })

  return slides
})
const activeHeroSlide = computed(() => heroSlides.value[heroSlideIndex.value] || heroSlides.value[0])

const startHeroProgress = () => {
  if (heroProgressTimer) window.clearInterval(heroProgressTimer)
  heroProgressPercent.value = 0
  heroProgressTimer = window.setInterval(() => {
    heroProgressPercent.value += 100 / (HERO_SLIDE_DURATION / 50)
    if (heroProgressPercent.value >= 100) {
      heroProgressPercent.value = 100
      clearInterval(heroProgressTimer)
    }
  }, 50)
}

const startHeroRotation = () => {
  if (heroTimer) window.clearInterval(heroTimer)
  startHeroProgress()
  heroTimer = window.setInterval(() => {
    heroSlideIndex.value = (heroSlideIndex.value + 1) % heroSlides.value.length
    startHeroProgress()
  }, HERO_SLIDE_DURATION)
}

onMounted(async () => {
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  categories.value = await loadPostCategories()
  loadLocalReadMarks()
  const cached = localStorage.getItem('posts')

  if (cached) {
    try {
      const cachedPosts = JSON.parse(cached)
      posts.value = Array.isArray(cachedPosts)
        ? cachedPosts.filter(post => post.placement !== 'hero' && !post.isMainEntry && isReleased(post))
        : []
    } catch (error) {
      localStorage.removeItem('posts')
      posts.value = []
    }
  }

  startHeroRotation()
  startLatestRotation()

  try {
    const snap = await getDocs(collection(db, "posts"))

    const approved = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.status === 'approved')
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
    const fresh = approved.filter(p => p.placement !== 'hero' && !p.isMainEntry && isReleased(p))
    const freshMainEntries = approved.filter(p => (p.placement === 'hero' || p.isMainEntry) && isReleased(p))
    upcomingPosts.value = approved
      .filter(p => p.placement !== 'hero' && !p.isMainEntry && !isReleased(p))
      .sort((a, b) => getTime(a.releaseAt || a.scheduledAt) - getTime(b.releaseAt || b.scheduledAt))

    if (JSON.stringify(fresh) !== JSON.stringify(posts.value)) {
      posts.value = fresh
      localStorage.setItem('posts', JSON.stringify(fresh))
    }

    mainEntries.value = freshMainEntries

    await loadAuthorProfiles(fresh)
    await loadRewardedPosts()
    await loadHomeCommunityData()
  } catch (error) {
    console.error(error)
  }
})

onUnmounted(() => {
  if (heroTimer) window.clearInterval(heroTimer)
  if (heroProgressTimer) window.clearInterval(heroProgressTimer)
  stopLatestRotation()
})

const getTime = (timestamp) => {
  if (!timestamp) return 0
  return timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()
}

const isReleased = (post) => {
  const releaseTime = getTime(post.releaseAt || post.scheduledAt)
  return !releaseTime || releaseTime <= Date.now()
}

const formatCalendarDate = (timestamp) => {
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

const goPost = (id) => {
  router.push(`/post/${id}`)
}

const goCategory = (category) => {
  router.push(`/categoria/${encodeURIComponent(category)}`)
}

const goCommunity = (community) => {
  if (!community?.id) return
  router.push(`/comunidad?id=${encodeURIComponent(community.id)}`)
}

const openCalendarItem = (item) => {
  if (item.action) {
    item.action()
    return
  }
  if (item.url && typeof window !== 'undefined') {
    window.open(item.url, '_blank', 'noreferrer')
    return
  }
  router.push('/comunidad')
}

const selectLatestFilter = (filter) => {
  selectedLatestFilter.value = filter
  latestPage.value = 0
  restartLatestRotation()
}

const goLatestArchive = () => {
  router.push('/noticias')
}

const nextLatestPage = () => {
  latestPage.value = latestPage.value >= maxLatestPage.value ? 0 : latestPage.value + 1
  restartLatestRotation()
}

const previousLatestPage = () => {
  latestPage.value = latestPage.value <= 0 ? maxLatestPage.value : latestPage.value - 1
  restartLatestRotation()
}

const selectLatestPage = (index) => {
  latestPage.value = Math.min(Math.max(index, 0), maxLatestPage.value)
  restartLatestRotation()
}

const selectHeroSlide = (index) => {
  heroSlideIndex.value = index
  startHeroProgress()
}

const openHeroSlide = () => {
  if (typeof activeHeroSlide.value?.action === 'function') activeHeroSlide.value.action()
}

const stopLatestRotation = () => {
  if (latestTimer) window.clearInterval(latestTimer)
  if (latestProgressTimer) window.clearInterval(latestProgressTimer)
  latestTimer = null
  latestProgressTimer = null
}

const startLatestProgress = () => {
  if (latestProgressTimer) window.clearInterval(latestProgressTimer)
  latestProgressPercent.value = 0
  latestProgressTimer = window.setInterval(() => {
    latestProgressPercent.value += 100 / (LATEST_SLIDE_DURATION / 50)
    if (latestProgressPercent.value >= 100) {
      latestProgressPercent.value = 100
      window.clearInterval(latestProgressTimer)
    }
  }, 50)
}

const startLatestRotation = () => {
  stopLatestRotation()
  if (maxLatestPage.value <= 0) {
    latestProgressPercent.value = latestPool.value.length ? 100 : 0
    return
  }

  startLatestProgress()
  latestTimer = window.setInterval(() => {
    latestPage.value = latestPage.value >= maxLatestPage.value ? 0 : latestPage.value + 1
    startLatestProgress()
  }, LATEST_SLIDE_DURATION)
}

const restartLatestRotation = () => {
  startLatestRotation()
}

watch([maxLatestPage, latestPool], () => {
  if (latestPage.value > maxLatestPage.value) latestPage.value = 0
  startLatestRotation()
})

const readState = (postId) => {
  if (rewardedPosts.value.includes(postId)) return 'earned'
  if (viewedPosts.value.includes(postId)) return 'viewed'
  return ''
}

const cardTitle = (post) => post.analysis?.hypeTitle || post.title
const isAnalysisPost = (post) => postCategoryLabels(post).some(category => normalizeCategory(category).includes('analisis'))
const cardActionIcon = (post) => {
  return categoryIcon(post.category)
}
const authorProfile = (post) => authorProfiles.value[post.authorId] || {}
const authorIcon = (post) => {
  const profile = authorProfile(post)
  return post.authorId ? resolveProfileIcon(profile) : ''
}

const loadAuthorProfiles = async (sourcePosts = posts.value) => {
  const ids = [...new Set(sourcePosts.map(post => post.authorId).filter(Boolean))]
  if (!ids.length) return

  const snap = await getDocs(collection(db, 'users')).catch(() => ({ docs: [] }))
  authorProfiles.value = Object.fromEntries(
    snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(user => ids.includes(user.id))
      .map(user => [user.id, user])
  )
}

const loadLocalReadMarks = () => {
  const uid = auth.currentUser?.uid || 'guest'
  try {
    viewedPosts.value = JSON.parse(localStorage.getItem(`viewedPosts:${uid}`) || '[]')
  } catch (error) {
    viewedPosts.value = []
  }
}

const loadRewardedPosts = async () => {
  const user = auth.currentUser
  if (!user) return
  const snap = await getDocs(collection(db, 'users', user.uid, 'readPosts')).catch(() => ({ docs: [] }))
  rewardedPosts.value = snap.docs.map(item => item.id)
}

const loadHomeCommunityData = async () => {
  const [communitySnap, threadSnap, eventSnap] = await Promise.all([
    getDocs(collection(db, 'communities')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'communityThreads')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'galaxyEvents')).catch(() => ({ docs: [] }))
  ])

  const savedCommunities = communitySnap.docs.map(item => ({ id: item.id, membersCount: 0, ...item.data() }))
  const official = savedCommunities.find(item => item.id === 'galaxia-oficial')
  communities.value = [
    {
      id: 'galaxia-oficial',
      name: 'Galaxia Nintendera Oficial',
      description: 'Comunicados, lives, eventos y lanzamientos importantes de Galaxia Nintendera.',
      bannerUrl: '/src/iconos/Banner.png',
      iconUrl: '/src/iconos/logo.png',
      isOfficial: true,
      membersCount: 0,
      ...official
    },
    ...savedCommunities.filter(item => item.id !== 'galaxia-oficial')
  ].slice(0, 6)

  communityThreads.value = threadSnap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt))
    .slice(0, 12)

  galaxyEvents.value = eventSnap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
}
</script>

<template>
  <div class="home-page">
    <div class="home-page-content">
        <section
          class="home-hero"
          :style="{ '--hero-slide-image': activeHeroSlide.image ? `url(${activeHeroSlide.image})` : `url('/src/iconos/Banner.png')` }"
        >
          <div class="hero-stars"></div>

          <div class="hero-content">
            <div class="hero-copy">
              <div class="hero-kicker-row">
                <span class="hero-kicker">{{ activeHeroSlide.eyebrow }}</span>
                <strong class="featured-kicker">Destacado</strong>
              </div>
              <h1>
                {{ activeHeroSlide.title }}
                <span v-if="activeHeroSlide.accent">{{ activeHeroSlide.accent }}</span>
              </h1>

              <strong v-if="activeHeroSlide.meta" class="hero-event-date">
                <i class="far fa-calendar"></i>
                {{ activeHeroSlide.meta }}
              </strong>

              <p>
                {{ activeHeroSlide.text }}
              </p>

              <div class="hero-actions">
                <button type="button" class="hero-primary" @click="openHeroSlide">
                  <i :class="activeHeroSlide.primaryIcon || 'fas fa-arrow-right'"></i>
                  {{ activeHeroSlide.primaryLabel || 'Ver más' }}
                </button>
                <button type="button" class="hero-secondary" @click="activeHeroSlide.secondaryLabel ? openHeroSlide() : router.push('/comunidad')">
                  <i :class="activeHeroSlide.secondaryIcon || 'fas fa-users'"></i>
                  {{ activeHeroSlide.secondaryLabel || 'Entrar a comunidades' }}
                </button>
              </div>

              <div class="hero-dashboard-cards">
                <button type="button" class="hero-mini-card" @click="router.push('/comunidad')">
                  <span><i class="fas fa-users"></i> Comunidades</span>
                  <strong>{{ communities.length || 1 }}</strong>
                  <small>galaxias activas</small>
                </button>
                <button type="button" class="hero-mini-card media" @click="nextCalendarItem ? openCalendarItem(nextCalendarItem) : router.push('/comunidad')">
                  <span><i class="far fa-calendar"></i> Proximo evento</span>
                  <strong>{{ nextCalendarItem?.title || 'Agenda libre' }}</strong>
                  <small>{{ nextCalendarItem ? formatCalendarDate(nextCalendarItem.startsAt) : 'Sin eventos por ahora' }}</small>
                </button>
                <button type="button" class="hero-mini-card mission" @click="router.push('/comunidad')">
                  <span><i class="fas fa-star"></i> Mision semanal</span>
                  <strong>Comenta en 3 publicaciones</strong>
                  <small>2/3 progreso</small>
                </button>
                <button type="button" class="hero-mini-card podcast" @click="livePodcastItems[0] ? openCalendarItem(livePodcastItems[0]) : router.push('/comunidad')">
                  <span><i class="fas fa-headphones"></i> Podcast / Live</span>
                  <strong>{{ livePodcastItems[0]?.title || 'Nintenderos al Aire' }}</strong>
                  <small>{{ livePodcastItems[0] ? 'Programado' : 'Nuevo episodio pronto' }}</small>
                </button>
              </div>

              <div class="hero-controls">
                <div class="hero-slide-dots" aria-label="Destacados principales">
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
            </div>

            <div class="hero-art">
              <button
                type="button"
                class="hero-feature-card"
                :class="{ 'no-image': !activeHeroSlide.image, clickable: activeHeroSlide.action }"
                @click="openHeroSlide"
              >
                <img v-if="activeHeroSlide.image" :src="activeHeroSlide.image" alt="" />
                <div v-else class="hero-empty-state">
                  <div class="hero-empty-content">
                    <h2>{{ activeHeroSlide.title }}</h2>
                    <p>{{ activeHeroSlide.text }}</p>
                  </div>
                </div>
                <span>{{ activeHeroSlide.label }}</span>
              </button>
            </div>
          </div>
        </section>

        <main class="home-shell">
          <section class="community-stories-panel media-center-panel">
            <div class="panel-heading">
              <h2>
                <span></span>
                Videos, lives y podcasts
              </h2>
              <button @click="router.push('/comunidad')">
                Ver canal
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>

            <div class="media-hero-card">
              <span><i class="fas fa-satellite-dish"></i> Galaxia Nintendera</span>
              <h3>{{ livePodcastItems[0]?.title || 'Directos, videos y podcasts oficiales' }}</h3>
              <p>{{ livePodcastItems[0]?.description || 'Aqui apareceran los estrenos de YouTube, lives programados, podcasts y comunicados multimedia.' }}</p>
              <button type="button" @click="livePodcastItems[0] ? openCalendarItem(livePodcastItems[0]) : router.push('/comunidad')">
                {{ livePodcastItems[0] ? 'Ver ahora' : 'Ir a la comunidad oficial' }}
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>

            <div class="media-chip-grid">
              <button
                type="button"
                @click="router.push('/comunidad')"
              >
                <i class="fas fa-video"></i>
                Lives
              </button>
              <button type="button" @click="router.push('/comunidad')">
                <i class="fas fa-play"></i>
                Videos
              </button>
              <button type="button" @click="router.push('/comunidad')">
                <i class="fas fa-headphones"></i>
                Podcasts
              </button>
              <button type="button" @click="router.push('/comunidad')">
                <i class="far fa-calendar"></i>
                Eventos
              </button>
            </div>

            <div class="media-list">
              <button
                v-for="item in livePodcastItems"
                :key="item.id"
                type="button"
                class="media-row"
                @click="openCalendarItem(item)"
              >
                <span><i class="fas fa-play"></i></span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.type }} - {{ formatCalendarDate(item.startsAt) }}</small>
                </div>
              </button>
            </div>
          </section>

          <section id="noticias" class="news-panel">
        <div class="panel-heading">
          <h2>
            <span></span>
            Ultimas noticias
          </h2>

          <button @click="goLatestArchive">
            Ver todas
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>

        <div v-if="latestPool.length" class="latest-progress-row">
          <div class="latest-progress-bar" aria-hidden="true">
            <div class="latest-progress-fill" :style="{ width: latestProgressPercent + '%' }"></div>
          </div>

          <div v-if="maxLatestPage > 0" class="latest-controls" aria-label="Paginas de noticias">
            <div class="latest-page-dots">
              <button
                v-for="page in latestPageCount"
                :key="page"
                type="button"
                :class="{ active: page - 1 === latestPage }"
                :aria-label="`Ver pagina ${page}`"
                @click="selectLatestPage(page - 1)"
              ></button>
            </div>
          </div>
        </div>

        <div v-if="latestPosts.length" class="news-grid" :class="{ single: latestPosts.length === 1 }">
          <button
            v-for="(post, index) in latestPosts"
            :key="post.id"
            class="news-card"
            :class="{ analysis: isAnalysisPost(post), featured: index === 0 }"
            @click="goPost(post.id)"
          >
            <img
              v-if="post.image"
              :src="post.image"
              alt=""
            />
            <div v-else class="news-placeholder"></div>

            <div v-if="isAnalysisPost(post)" class="analysis-card-overlay">
              <div class="analysis-card-topline">
                <span>
                  <i class="fas fa-crown"></i>
                  Analisis premium
                </span>
                <div class="analysis-card-score">
                  <b>{{ post.analysis?.score || '--' }}</b>
                  <small>Nota</small>
                </div>
              </div>

              <div class="analysis-card-copy">
                <h3>{{ cardTitle(post) }}</h3>
                <p>{{ post.content }}</p>
                <div class="analysis-card-footer">
                  <div class="analysis-card-author">
                    <span>
                      <img v-if="authorIcon(post)" :src="authorIcon(post)" alt="" />
                      <b v-else>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</b>
                    </span>
                    <small>{{ post.authorName || 'Redactor' }} - {{ formatAgo(post.createdAt) }}</small>
                  </div>
                  <em>Leer analisis <i class="fas fa-arrow-right"></i></em>
                </div>
              </div>
            </div>

            <div v-if="!isAnalysisPost(post) && index === 0" class="featured-news-overlay">
              <div class="featured-news-topline">
                <span>
                  <i :class="cardActionIcon(post)"></i>
                  {{ post.category || 'General' }}
                </span>
              </div>

              <div class="featured-news-copy">
                <h3>{{ cardTitle(post) }}</h3>
                <p>{{ post.content }}</p>
                <div class="featured-news-footer">
                  <div class="featured-news-author">
                    <span>
                      <img v-if="authorIcon(post)" :src="authorIcon(post)" alt="" />
                      <b v-else>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</b>
                    </span>
                    <small>{{ post.authorName || 'Redactor' }} - {{ formatAgo(post.createdAt) }}</small>
                  </div>
                  <em>Ver noticia <i class="fas fa-arrow-right"></i></em>
                </div>
              </div>
            </div>

            <div v-if="!isAnalysisPost(post) && index !== 0" class="standard-news-overlay">
              <span class="standard-news-category">
                <i :class="cardActionIcon(post)"></i>
                {{ post.category || 'General' }}
              </span>
              <div class="standard-news-copy">
                <h3>{{ cardTitle(post) }}</h3>
                <div class="standard-news-footer">
                  <div class="standard-news-author">
                    <span>
                      <img v-if="authorIcon(post)" :src="authorIcon(post)" alt="" />
                      <b v-else>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</b>
                    </span>
                    <small>{{ post.authorName || 'Redactor' }} - {{ formatAgo(post.createdAt) }}</small>
                  </div>
                  <em>Ver <i class="fas fa-arrow-right"></i></em>
                </div>
              </div>
            </div>

            <span
              v-if="!isAnalysisPost(post) && readState(post.id)"
              class="read-mark"
              :class="readState(post.id)"
              :title="readState(post.id) === 'earned' ? 'Leido y recompensado' : 'Visto'"
            >
              <i :class="readState(post.id) === 'earned' ? 'fas fa-star' : 'far fa-star'"></i>
              Visto
            </span>

          </button>
        </div>

        <div v-else class="latest-empty">
          <strong>No hay noticias en esta categoria</strong>
          <p>Prueba con otra seccion o vuelve a todas las noticias.</p>
        </div>
          </section>

          <section class="community-discovery-panel">
            <div class="panel-heading">
              <h2>
                <span></span>
                Comunidades y conversaciones
              </h2>
              <button @click="router.push('/comunidad')">
                Explorar
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>

            <article v-if="officialCommunity" class="official-community-strip" @click="goCommunity(officialCommunity)">
              <img v-if="officialCommunity.iconUrl" :src="officialCommunity.iconUrl" alt="" />
              <span v-else>{{ officialCommunity.name.slice(0, 2).toUpperCase() }}</span>
              <div>
                <small>Comunidad oficial</small>
                <strong>{{ officialCommunity.name }}</strong>
                <p>{{ officialCommunity.description }}</p>
              </div>
            </article>

            <div class="community-home-grid">
              <button v-for="community in recommendedCommunities" :key="community.id" type="button" class="community-home-card" @click="goCommunity(community)">
                <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
                <span v-else>{{ community.name.slice(0, 2).toUpperCase() }}</span>
                <div>
                  <strong>{{ community.name }}</strong>
                  <small>{{ community.isOfficial ? 'Oficial' : `${community.membersCount || 0} miembros` }}</small>
                </div>
              </button>
            </div>

            <div v-if="featuredDashboardPosts.length" class="featured-dashboard-news">
              <div class="side-mini-head">
                <h3>Noticias destacadas</h3>
                <button type="button" @click="goLatestArchive">Ver todas</button>
              </div>
              <button v-for="post in featuredDashboardPosts" :key="post.id" type="button" class="featured-news-row" @click="goPost(post.id)">
                <img v-if="post.image" :src="post.image" alt="" />
                <span v-else><i :class="cardActionIcon(post)"></i></span>
                <div>
                  <strong>{{ cardTitle(post) }}</strong>
                  <small>{{ post.authorName || 'Redactor' }} - {{ formatAgo(post.createdAt) }}</small>
                </div>
              </button>
            </div>

            <div v-if="successfulThreads.length" class="thread-highlight-row">
              <article v-for="thread in successfulThreads" :key="thread.id" class="thread-highlight-card">
                <span>{{ thread.communityName || 'Comunidad' }}</span>
                <h3>{{ thread.title }}</h3>
                <p>{{ thread.body }}</p>
                <small><i class="far fa-comment"></i> {{ thread.replies || 0 }} respuestas - <i class="far fa-heart"></i> {{ thread.likes || 0 }}</small>
              </article>
            </div>
          </section>
        </main>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  background:
    radial-gradient(circle at 70% 18%, rgba(147, 51, 234, 0.35), transparent 28%),
    radial-gradient(circle at 24% 38%, rgba(236, 72, 153, 0.22), transparent 24%),
    #050816;
  color: #ffffff;
  min-height: 100vh;
  overflow: hidden;
  padding: var(--public-page-top, 88px) 10px 36px;
}

.home-hero {
  background:
    linear-gradient(#050816, #050816) padding-box,
    linear-gradient(135deg, rgba(34, 211, 238, 0.76), rgba(168, 85, 247, 0.72), rgba(236, 72, 153, 0.68), rgba(250, 204, 21, 0.56)) border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 34px rgba(168, 85, 247, 0.18),
    0 22px 70px rgba(0, 0, 0, 0.2);
  isolation: isolate;
  margin: 0 auto;
  max-width: 1280px;
  min-height: 410px;
  overflow: hidden;
  position: relative;
}

.home-hero::before {
  background:
    radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.36) 0 1px, transparent 2px),
    radial-gradient(circle at 28% 74%, rgba(168, 85, 247, 0.38) 0 2px, transparent 3px),
    radial-gradient(circle at 76% 18%, rgba(34, 211, 238, 0.34) 0 1px, transparent 2px),
    radial-gradient(circle at 90% 68%, rgba(236, 72, 153, 0.34) 0 2px, transparent 3px);
  content: "";
  inset: 0;
  opacity: 0.7;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.hero-stars {
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.9) 0 1px, transparent 2px),
    radial-gradient(circle at 24% 76%, rgba(168, 85, 247, 0.9) 0 2px, transparent 3px),
    radial-gradient(circle at 78% 26%, rgba(236, 72, 153, 0.75) 0 2px, transparent 3px),
    radial-gradient(circle at 92% 62%, rgba(255, 255, 255, 0.65) 0 1px, transparent 2px),
    linear-gradient(135deg, rgba(5, 8, 22, 0.76), rgba(17, 24, 39, 0.42)),
    var(--hero-slide-image, url('/src/iconos/Banner.png'));
  background-position: center;
  background-size: cover;
  border-radius: 7px;
  inset: 2px;
  position: absolute;
  z-index: 1;
}

.hero-stars::after {
  background: linear-gradient(90deg, rgba(5, 8, 22, 0.72), rgba(5, 8, 22, 0.22), rgba(5, 8, 22, 0.65));
  content: '';
  inset: 0;
  position: absolute;
}

.hero-content {
  align-items: center;
  display: grid;
  gap: 32px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
  min-height: 410px;
  padding: 46px 56px;
  position: relative;
  z-index: 2;
}

.hero-kicker-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 14px;
}

.hero-kicker {
  color: #c084fc;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  line-height: 1;
  text-transform: uppercase;
}

.featured-kicker {
  color: #fef3c7;
  display: none;
  font-size: 12px;
  font-weight: 950;
  line-height: 1;
  text-transform: uppercase;
}

.hero-copy h1 {
  display: block;
  font-size: clamp(38px, 4.7vw, 58px);
  font-weight: 900;
  line-height: 1.06;
  max-width: 720px;
  min-height: 0;
  overflow: visible;
  overflow-wrap: anywhere;
}

.hero-copy h1 span {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  -webkit-background-clip: text;
  color: transparent;
}

.hero-event-date {
  align-items: center;
  background: rgba(124, 58, 237, 0.18);
  border: 1px solid rgba(216, 180, 254, 0.24);
  border-radius: 999px;
  color: #f5d0fe;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  margin-top: 14px;
  min-height: 34px;
  padding: 0 13px;
  text-transform: uppercase;
  width: fit-content;
}

.hero-copy p {
  color: #e5e7eb;
  display: -webkit-box;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.6;
  margin-top: 24px;
  max-width: 620px;
  min-height: 52px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 30px;
}

.hero-dashboard-cards {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 22px;
}

.hero-mini-card {
  background: rgba(11, 16, 32, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 7px;
  height: 88px;
  padding: 12px;
  text-align: left;
}

.hero-mini-card span {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.hero-mini-card strong {
  color: #ffffff;
  display: -webkit-box;
  font-size: 15px;
  font-weight: 950;
  line-height: 1.15;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.hero-mini-card small {
  color: #cbd5e1;
  display: block;
  font-size: 11px;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-mini-card.media {
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(11, 16, 32, 0.86)),
    url('/src/iconos/Banner.png') center / cover;
}

.hero-mini-card.mission strong,
.hero-mini-card.podcast strong {
  font-size: 13px;
}

.hero-primary,
.hero-secondary {
  align-items: center;
  border-radius: 8px;
  display: inline-flex;
  font-size: 13px;
  font-weight: 900;
  gap: 10px;
  justify-content: center;
  min-height: 42px;
  padding: 0 26px;
}

.hero-primary {
  background: linear-gradient(90deg, #7c3aed, #ec4899);
  box-shadow: 0 12px 30px rgba(168, 85, 247, 0.35);
}

.hero-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.hero-slide-dots {
  display: flex;
  gap: 8px;
}

.hero-slide-dots button {
  background: rgba(255, 255, 255, 0.38);
  border-radius: 999px;
  height: 8px;
  transition: background 0.2s ease, width 0.2s ease;
  width: 8px;
}

.hero-slide-dots button.active {
  background: #ec4899;
  width: 28px;
}

.hero-controls {
  align-items: center;
  display: flex;
  gap: 12px;
  margin-top: 26px;
}

.hero-progress-bar {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  flex: 1;
  height: 4px;
  min-width: 60px;
  overflow: hidden;
}

.hero-progress-fill {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  height: 100%;
  transition: width 0.05s linear;
  width: 0%;
}

.hero-art {
  display: flex;
  justify-content: center;
}

.hero-feature-card {
  aspect-ratio: 16 / 10;
  background: rgba(5, 8, 22, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
  color: inherit;
  max-width: 460px;
  overflow: hidden;
  position: relative;
  text-align: left;
  width: 100%;
}

.hero-feature-card.clickable {
  cursor: pointer;
}

.hero-feature-card::after {
  background: linear-gradient(180deg, transparent 45%, rgba(5, 8, 22, 0.86));
  content: '';
  inset: 0;
  position: absolute;
}

.hero-feature-card img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.hero-feature-card span {
  background: rgba(5, 8, 22, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  bottom: 14px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 950;
  left: 14px;
  padding: 7px 10px;
  position: absolute;
  text-transform: uppercase;
  z-index: 1;
}

.hero-feature-card.no-image {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(236, 72, 153, 0.25));
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-empty-state {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset: 0;
}

.hero-empty-content {
  text-align: center;
  padding: 40px;
  z-index: 1;
  max-width: 90%;
}

.hero-empty-content h2 {
  font-size: 28px;
  font-weight: 900;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-empty-content h2 span {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  -webkit-background-clip: text;
  color: transparent;
}

.hero-empty-content p {
  font-size: 14px;
  color: #e5e7eb;
  line-height: 1.6;
}

.home-shell {
  display: grid;
  gap: 24px;
  margin: -26px auto 0;
  max-width: 1210px;
  position: relative;
  z-index: 2;
}

.news-panel {
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(124, 58, 237, 0.28);
  padding: 22px;
}

.news-panel {
  background: rgba(7, 10, 22, 0.92);
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: #ffffff;
}

.panel-heading {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-heading h2 {
  align-items: center;
  display: flex;
  font-size: 15px;
  font-weight: 900;
  gap: 8px;
}

.panel-heading h2 span {
  background: #a855f7;
  border-radius: 999px;
  height: 10px;
  width: 10px;
}

.panel-heading button {
  color: #7c3aed;
  font-size: 12px;
  font-weight: 900;
}

.latest-filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  overflow-x: auto;
  padding: 2px 0 8px;
}

.latest-filter-row button {
  align-items: center;
  background: rgba(11, 16, 32, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  color: #e2e8f0;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  gap: 9px;
  min-height: 40px;
  padding: 0 14px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.latest-filter-row button:hover {
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateY(-1px);
}

.latest-filter-row button.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(190, 24, 147, 0.72));
  border-color: rgba(216, 180, 254, 0.48);
  color: #ffffff;
}

.latest-filter-row i {
  color: #facc15;
}

.latest-controls {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
}

.latest-empty {
  background: rgba(8, 13, 29, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  padding: 34px 18px;
  text-align: center;
}

.latest-empty strong {
  color: #ffffff;
  display: block;
  font-size: 18px;
  font-weight: 950;
}

.latest-empty p {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
}

.latest-page-dots {
  align-items: center;
  display: inline-flex;
  gap: 7px;
}

.latest-page-dots button {
  background: rgba(148, 163, 184, 0.42);
  border: 0;
  border-radius: 999px;
  height: 8px;
  min-height: 0;
  padding: 0;
  transition: background 0.2s ease, transform 0.2s ease, width 0.2s ease;
  width: 8px;
}

.latest-page-dots button.active {
  background: linear-gradient(135deg, #a855f7, #ec4899);
  transform: scale(1.08);
  width: 22px;
}

.latest-progress-row {
  align-items: center;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin: -4px 0 16px;
}

.latest-progress-bar {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  height: 4px;
  overflow: hidden;
  width: 100%;
}

.latest-progress-fill {
  background: linear-gradient(90deg, #a855f7, #ec4899);
  height: 100%;
  transition: width 0.05s linear;
  width: 0%;
}

.community-stories-panel {
  background: rgba(7, 10, 22, 0.88);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(124, 58, 237, 0.18);
  color: #ffffff;
  padding: 22px;
}

.community-story-row {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 4px 2px 10px;
  scrollbar-width: none;
}

.community-story-row::-webkit-scrollbar {
  display: none;
}

.community-story {
  color: #ffffff;
  display: grid;
  flex: 0 0 78px;
  gap: 8px;
  justify-items: center;
  text-align: center;
}

.community-story > span {
  background:
    linear-gradient(#081022, #081022) padding-box,
    linear-gradient(135deg, #a855f7, #ec4899, #facc15) border-box;
  border: 2px solid transparent;
  border-radius: 999px;
  display: grid;
  height: 64px;
  overflow: hidden;
  place-items: center;
  width: 64px;
}

.community-story.official > span {
  box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.12);
}

.community-story img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-story b {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  display: flex;
  font-size: 13px;
  font-weight: 950;
  height: 100%;
  justify-content: center;
  width: 100%;
}

.community-story strong {
  color: #e5e7eb;
  display: -webkit-box;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.15;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.media-center-panel {
  display: grid;
  gap: 12px;
  overflow: hidden;
}

.media-hero-card {
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(8, 12, 30, 0.92)),
    url('/src/iconos/Banner.png') center / cover;
  border: 1px solid rgba(192, 132, 252, 0.22);
  border-radius: 14px;
  display: grid;
  gap: 8px;
  min-height: 142px;
  padding: 16px;
}

.media-hero-card span,
.media-hero-card small {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.media-hero-card h3 {
  color: #ffffff;
  display: -webkit-box;
  font-size: 19px;
  font-weight: 950;
  line-height: 1.12;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.media-hero-card p {
  color: #dbeafe;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.media-hero-card button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-self: start;
  min-height: 36px;
  padding: 0 14px;
}

.media-chip-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.media-chip-grid button {
  align-items: center;
  background: rgba(124, 58, 237, 0.16);
  border: 1px solid rgba(192, 132, 252, 0.22);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  font-size: 10px;
  font-weight: 950;
  gap: 6px;
  justify-items: center;
  min-height: 52px;
  text-transform: uppercase;
}

.media-chip-grid i {
  color: #facc15;
}

.media-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.story-pinned-preview {
  background: rgba(124, 58, 237, 0.16);
  border: 1px solid rgba(192, 132, 252, 0.24);
  border-radius: 14px;
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding: 12px;
}

.story-pinned-preview span,
.story-pinned-preview small {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.story-pinned-preview strong {
  color: #ffffff;
  display: -webkit-box;
  font-size: 14px;
  font-weight: 950;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.galaxy-live-panel,
.community-discovery-panel {
  background: rgba(7, 10, 22, 0.88);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(124, 58, 237, 0.18);
  color: #ffffff;
  padding: 22px;
}

.galaxy-live-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
}

.dashboard-side-stack {
  grid-template-columns: 1fr;
}

.official-community-card {
  background: #0b1020;
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 16px;
  cursor: pointer;
  display: grid;
  min-height: 320px;
  overflow: hidden;
  position: relative;
}

.official-community-card img {
  height: 100%;
  inset: 0;
  object-fit: cover;
  opacity: 0.54;
  position: absolute;
  width: 100%;
}

.official-community-card::after {
  background: linear-gradient(180deg, rgba(5, 8, 22, 0.18), rgba(5, 8, 22, 0.95));
  content: '';
  inset: 0;
  position: absolute;
}

.official-community-card div {
  align-self: end;
  display: grid;
  gap: 10px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.official-community-card span,
.calendar-card span,
.thread-highlight-card span {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.official-community-card h3 {
  color: #ffffff;
  font-size: clamp(28px, 4vw, 46px);
  font-weight: 950;
  line-height: 1.02;
}

.official-community-card p,
.calendar-card p,
.thread-highlight-card p {
  color: #cbd5e1;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.official-community-card strong {
  color: #fef3c7;
  font-size: 12px;
  font-weight: 950;
}

.calendar-stack,
.thread-highlight-row {
  display: grid;
  gap: 12px;
}

.calendar-card,
.calendar-empty,
.thread-highlight-card,
.community-home-card {
  background: rgba(11, 16, 32, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
}

.calendar-card {
  color: #ffffff;
  display: grid;
  gap: 7px;
  min-height: 118px;
  padding: 14px;
  text-align: left;
}

.calendar-card h3,
.thread-highlight-card h3 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.18;
}

.calendar-card strong,
.thread-highlight-card small {
  color: #e9d5ff;
  font-size: 11px;
  font-weight: 900;
}

.home-calendar-card,
.live-now-card,
.featured-dashboard-news,
.official-community-strip {
  background: rgba(11, 16, 32, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  padding: 14px;
}

.calendar-month-head,
.side-mini-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.calendar-month-head strong,
.side-mini-head h3 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
}

.calendar-month-head span,
.side-mini-head button {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.calendar-mini-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(7, 1fr);
  margin-top: 12px;
}

.calendar-mini-grid span,
.calendar-mini-grid button {
  align-items: center;
  border-radius: 999px;
  color: #cbd5e1;
  display: flex;
  font-size: 10px;
  font-weight: 850;
  height: 24px;
  justify-content: center;
}

.calendar-mini-grid span {
  color: #8b95ad;
  height: 18px;
}

.calendar-mini-grid button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
}

.calendar-mini-grid button.marked {
  border: 1px solid rgba(192, 132, 252, 0.42);
  color: #e9d5ff;
}

.live-now-card {
  display: grid;
  gap: 10px;
}

.media-action-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.media-action-grid button {
  align-items: center;
  background: rgba(124, 58, 237, 0.16);
  border: 1px solid rgba(192, 132, 252, 0.2);
  border-radius: 11px;
  color: #f5f3ff;
  display: grid;
  font-size: 10px;
  font-weight: 950;
  gap: 5px;
  justify-items: center;
  min-height: 50px;
  padding: 7px 5px;
  text-transform: uppercase;
}

.media-action-grid i {
  color: #facc15;
  font-size: 13px;
}

.media-row,
.featured-news-row {
  align-items: center;
  background: rgba(5, 8, 22, 0.54);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 58px;
  padding: 8px;
  text-align: left;
}

.media-row > span,
.featured-news-row > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.featured-news-row img {
  border-radius: 12px;
  height: 42px;
  object-fit: cover;
  width: 42px;
}

.media-row strong,
.featured-news-row strong {
  color: #ffffff;
  display: block;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-row small,
.featured-news-row small {
  color: #b8c1d8;
  font-size: 10px;
  font-weight: 850;
}

.calendar-empty {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 850;
  padding: 18px;
}

.community-home-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.official-community-strip {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: 52px minmax(0, 1fr);
  margin-bottom: 12px;
}

.official-community-strip img,
.official-community-strip > span {
  border-radius: 14px;
  height: 52px;
  width: 52px;
}

.official-community-strip img {
  object-fit: cover;
}

.official-community-strip > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  display: flex;
  font-size: 13px;
  font-weight: 950;
  justify-content: center;
}

.official-community-strip small {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.official-community-strip strong {
  color: #ffffff;
  display: block;
  font-size: 15px;
  font-weight: 950;
}

.official-community-strip p {
  color: #cbd5e1;
  display: -webkit-box;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.community-home-card {
  align-items: center;
  color: #ffffff;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px minmax(0, 1fr);
  min-height: 72px;
  padding: 12px;
  text-align: left;
}

.community-home-card img,
.community-home-card > span {
  border-radius: 14px;
  height: 48px;
  width: 48px;
}

.community-home-card img {
  object-fit: cover;
}

.community-home-card > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  display: flex;
  font-size: 13px;
  font-weight: 950;
  justify-content: center;
}

.community-home-card strong {
  color: #ffffff;
  display: block;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-home-card small {
  color: #c4b5fd;
  font-size: 11px;
  font-weight: 850;
}

.thread-highlight-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.thread-highlight-card {
  padding: 16px;
}

.featured-dashboard-news {
  display: grid;
  gap: 9px;
  margin-bottom: 12px;
}

@media (min-width: 1180px) {
  .home-page {
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    padding: var(--public-page-top, 88px) 16px 18px;
  }

  .home-page-content {
    display: grid;
    gap: 18px 22px;
    grid-template-areas:
      "featured news"
      "stories news";
    grid-template-columns: minmax(460px, 0.84fr) minmax(560px, 1.16fr);
    grid-template-rows: minmax(0, 0.6fr) minmax(0, 0.4fr);
    height: calc(100dvh - 94px);
    margin: 0 auto;
    max-width: 1500px;
    width: min(1500px, calc(100vw - 48px));
  }

  .home-hero {
    grid-area: featured;
    border-radius: 16px;
    max-width: none;
    min-height: 0;
    height: 100%;
  }

  .hero-content {
    align-content: center;
    gap: 28px;
    grid-template-columns: 1fr;
    min-height: 100%;
    padding: 58px 56px;
  }

  .hero-art {
    display: none;
  }

  .featured-kicker {
    display: inline-flex;
  }

  .hero-kicker-row {
    gap: 8px 14px;
    margin-bottom: 16px;
  }

  .hero-copy h1 {
    font-size: clamp(36px, 3.6vw, 58px);
    line-height: 1.05;
    max-width: 820px;
    min-height: 0;
  }

  .hero-copy p {
    font-size: 16px;
    line-height: 1.55;
    margin-top: 24px;
    max-width: 720px;
    min-height: 0;
    -webkit-line-clamp: 3;
  }

  .hero-actions {
    gap: 10px;
    margin-top: 18px;
  }

  .hero-primary,
  .hero-secondary {
    min-height: 38px;
    padding: 0 18px;
  }

  .hero-controls {
    margin-top: 14px;
  }

  .hero-feature-card {
    aspect-ratio: 16 / 8.5;
    max-width: 380px;
  }

  .hero-dashboard-cards {
    display: none;
  }

  .home-shell {
    display: contents;
    margin: 0;
    max-width: none;
  }

  .community-stories-panel {
    grid-area: stories;
    min-height: 0;
    padding: 18px;
  }

  .community-story-row {
    gap: 14px;
    padding-top: 10px;
  }

  .community-story {
    flex-basis: 74px;
  }

  .community-story > span {
    height: 62px;
    width: 62px;
  }

  .story-pinned-preview {
    margin-top: 18px;
  }

  .media-center-panel {
    align-content: start;
    min-height: 0;
  }

  .media-hero-card {
    min-height: 0;
  }

  .media-chip-grid button {
    min-height: 60px;
  }

  .media-list {
    display: none;
  }

  .news-panel {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-area: news;
    padding: 16px;
    min-height: 0;
    overflow: hidden;
  }

  .community-discovery-panel {
    display: none;
  }

  .panel-heading {
    margin-bottom: 10px;
  }

  .latest-filter-row {
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 4px;
  }

  .latest-filter-row button {
    font-size: 11px;
    min-height: 34px;
    padding: 0 11px;
  }

  .latest-progress-row {
    margin: -2px 0 10px;
  }

  .news-grid {
    display: grid;
    gap: 14px;
    grid-template-rows: minmax(0, 1.22fr) minmax(0, 0.78fr);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    height: 100%;
    max-width: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 0 2px 2px;
  }

  .news-grid.single {
    display: grid;
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .news-card,
  .news-card.analysis,
  .news-card.analysis:not(.featured),
  .news-card.featured,
  .news-card.featured.analysis,
  .news-card.featured:not(.analysis) {
    border-radius: 14px;
    grid-column: auto;
    height: auto;
    min-height: 0;
  }

  .news-card.featured,
  .news-card.featured.analysis,
  .news-card.featured:not(.analysis) {
    grid-column: 1 / -1;
    min-height: 0;
  }

  .news-grid.single .news-card {
    flex-basis: auto;
    max-width: 100%;
  }

  .news-card.featured .analysis-card-footer em,
  .news-card.featured .featured-news-footer em {
    align-self: end;
  }

  .analysis-card-overlay,
  .featured-news-overlay,
  .standard-news-overlay {
    padding: 16px;
  }

  .analysis-card-copy,
  .featured-news-copy,
  .standard-news-copy {
    align-self: end;
    gap: 8px;
    min-height: 0;
  }

  .analysis-card-copy h3,
  .featured-news-copy h3 {
    font-size: clamp(24px, 1.85vw, 32px);
    line-height: 1.1;
    -webkit-line-clamp: 3;
  }

  .news-card.analysis:not(.featured) .analysis-card-copy h3 {
    font-size: clamp(18px, 1.35vw, 23px);
    line-height: 1.08;
    -webkit-line-clamp: 2;
  }

  .standard-news-copy h3 {
    font-size: clamp(18px, 1.25vw, 23px);
    line-height: 1.12;
    -webkit-line-clamp: 3;
  }

  .analysis-card-copy p,
  .featured-news-copy p {
    font-size: 12px;
    line-height: 1.45;
    -webkit-line-clamp: 2;
  }

  .news-card.analysis:not(.featured) .analysis-card-copy p {
    display: none;
  }

  .analysis-card-score {
    border-radius: 12px;
    min-height: 66px;
    min-width: 72px;
    padding: 7px 9px;
  }

  .analysis-card-score b {
    font-size: 30px;
  }

  .news-card.analysis:not(.featured) .analysis-card-score {
    border-radius: 12px;
    min-height: 52px;
    min-width: 58px;
    padding: 6px 8px;
  }

  .news-card.analysis:not(.featured) .analysis-card-score b {
    font-size: 24px;
  }

  .news-card.analysis:not(.featured) .analysis-card-score small {
    font-size: 8px;
  }

  .analysis-card-footer,
  .featured-news-footer,
  .standard-news-footer {
    margin-top: 0;
    overflow: hidden;
  }

  .news-card.analysis:not(.featured) .analysis-card-footer,
  .standard-news-footer {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .analysis-card-footer em,
  .featured-news-footer em {
    min-height: 38px;
    min-width: 118px;
    padding: 0 12px;
  }

  .news-card.analysis:not(.featured) .analysis-card-footer em,
  .standard-news-footer em {
    min-height: 34px;
    min-width: 0;
    padding: 0 11px;
  }

  .galaxy-live-grid {
    gap: 10px;
    grid-template-columns: minmax(0, 0.95fr) minmax(260px, 1.05fr);
    height: calc(100% - 40px);
    min-height: 0;
  }

  .dashboard-side-stack {
    grid-template-columns: minmax(0, 0.9fr) minmax(250px, 1.1fr);
    grid-template-areas:
      "events calendar"
      "media calendar";
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .calendar-stack {
    grid-area: events;
    gap: 8px;
    min-height: 0;
    overflow: hidden;
  }

  .home-calendar-card {
    grid-area: calendar;
    min-height: 100%;
    padding: 16px;
  }

  .live-now-card {
    grid-area: media;
    align-content: start;
    min-height: 0;
  }

  .calendar-card {
    height: 92px;
    min-height: 84px;
    padding: 11px;
  }

  .calendar-card h3 {
    font-size: 14px;
    -webkit-line-clamp: 2;
  }

  .calendar-card p {
    font-size: 11px;
    -webkit-line-clamp: 1;
  }

  .calendar-card:nth-of-type(n+4) {
    display: none;
  }

  .calendar-mini-grid {
    gap: 7px;
  }

  .calendar-mini-grid button {
    height: 25px;
  }
}

.news-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.news-grid.single {
  grid-template-columns: 1fr;
}

.news-card {
  background: #0b1020;
  border: 1px solid rgba(59, 75, 115, 0.86);
  border-radius: 8px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.24);
  min-height: 330px;
  overflow: hidden;
  padding: 0;
  position: relative;
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.news-card.featured {
  grid-column: span 2;
  min-height: 500px;
}

.news-card:hover {
  border-color: rgba(168, 85, 247, 0.72);
  box-shadow: 0 18px 40px rgba(124, 58, 237, 0.18);
  transform: translateY(-3px);
}

.news-card:not(.analysis)::before {
  background:
    linear-gradient(180deg, rgba(7, 10, 22, 0.02) 0%, rgba(7, 10, 22, 0.14) 35%, rgba(7, 10, 22, 0.9) 100%),
    radial-gradient(circle at 22% 0%, rgba(124, 58, 237, 0.2), transparent 32%);
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 1;
}

.news-card.analysis {
  background:
    radial-gradient(circle at 18% 10%, rgba(168, 85, 247, 0.18), transparent 30%),
    #080b18;
  border: 1px solid rgba(190, 156, 255, 0.38);
  border-radius: 18px;
  box-shadow: 0 18px 44px rgba(4, 6, 18, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  min-height: 430px;
  padding: 0;
}

.news-card.featured.analysis {
  min-height: 560px;
}

.news-card.analysis:not(.featured) {
  border-radius: 14px;
  min-height: 330px;
}

.news-card.analysis > img,
.news-card.analysis > .news-placeholder {
  height: 100%;
  inset: 0;
  opacity: 0.6;
  position: absolute;
  width: 100%;
}

.news-card.analysis::before {
  background:
    radial-gradient(circle at 18% 18%, rgba(232, 213, 255, 0.18) 0 1px, transparent 2px),
    radial-gradient(circle at 52% 10%, rgba(255, 255, 255, 0.14) 0 1px, transparent 2px),
    radial-gradient(circle at 86% 34%, rgba(250, 204, 21, 0.12) 0 1px, transparent 2px),
    radial-gradient(circle at 24% 28%, rgba(168, 85, 247, 0.3), transparent 34%),
    linear-gradient(180deg, rgba(92, 54, 142, 0.54), rgba(8, 11, 24, 0.72) 45%, rgba(5, 7, 18, 0.97));
  content: '';
  inset: 0;
  position: absolute;
  z-index: 1;
}

.news-card.analysis::after {
  background:
    linear-gradient(100deg, transparent 14%, rgba(255, 255, 255, 0.11) 42%, transparent 66%),
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.1), transparent 34%);
  content: '';
  inset: -40% -65%;
  opacity: 0.42;
  pointer-events: none;
  position: absolute;
  transform: rotate(7deg) translateX(-22%);
  transition: opacity 0.35s ease, transform 0.55s ease;
  z-index: 1;
}

.news-card.analysis:hover {
  border-color: rgba(216, 180, 254, 0.66);
  box-shadow: 0 24px 56px rgba(88, 28, 135, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.news-card.analysis:hover::after {
  opacity: 0.58;
  transform: rotate(7deg) translateX(2%);
}

.analysis-card-overlay {
  color: #ffffff;
  display: grid;
  grid-template-rows: auto 1fr;
  inset: 0;
  overflow: hidden;
  padding: 28px;
  position: absolute;
  z-index: 2;
}

.news-card.analysis:not(.featured) .analysis-card-overlay {
  padding: 22px;
}

.analysis-card-topline {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.analysis-card-topline > span {
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(70, 51, 108, 0.58);
  border: 1px solid rgba(216, 180, 254, 0.44);
  border-radius: 999px;
  color: #f5f3ff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  letter-spacing: 0;
  padding: 12px 18px;
  text-transform: uppercase;
}

.analysis-card-topline > span i {
  color: #f4d7ff;
  font-size: 10px;
}

.news-card.analysis:not(.featured) .analysis-card-topline > span {
  font-size: 10px;
  gap: 6px;
  min-height: 38px;
  padding: 0 13px;
}

.analysis-card-score {
  align-items: center;
  backdrop-filter: blur(16px);
  background: rgba(10, 13, 30, 0.82);
  border: 1px solid rgba(216, 180, 254, 0.26);
  border-radius: 18px;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.26);
  display: grid;
  justify-items: center;
  min-height: 96px;
  min-width: 100px;
  padding: 12px 16px;
}

.analysis-card-score b {
  color: #ffffff;
  font-size: 50px;
  font-weight: 950;
  line-height: 0.9;
}

.analysis-card-score small {
  color: #d8b4fe;
  font-size: 10px;
  font-weight: 950;
  line-height: 1;
  margin-top: 4px;
  text-transform: uppercase;
}

.news-card.analysis:not(.featured) .analysis-card-score {
  border-radius: 16px;
  min-height: 74px;
  min-width: 82px;
  padding: 8px 12px;
}

.news-card.analysis:not(.featured) .analysis-card-score b {
  font-size: 36px;
}

.news-card.analysis:not(.featured) .analysis-card-score small {
  font-size: 9px;
}

.analysis-card-copy {
  align-self: end;
  display: grid;
  gap: 16px;
  position: relative;
  z-index: 2;
}

.analysis-card-copy h3 {
  color: #ffffff;
  display: -webkit-box;
  font-size: clamp(38px, 4.8vw, 58px);
  font-weight: 950;
  line-height: 1.08;
  margin: 0;
  max-width: 660px;
  overflow: hidden;
  text-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.news-card.analysis:not(.featured) .analysis-card-copy {
  gap: 12px;
}

.news-card.analysis:not(.featured) .analysis-card-copy h3 {
  font-size: clamp(28px, 2.7vw, 42px);
  line-height: 1.08;
  max-width: 100%;
  -webkit-line-clamp: 3;
}

.analysis-card-copy p {
  color: rgba(241, 245, 249, 0.86);
  display: -webkit-box;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.62;
  margin: 0;
  max-width: 620px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.news-card.analysis:not(.featured) .analysis-card-copy p {
  font-size: 13px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
}

.analysis-card-footer {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-top: 12px;
}

.news-card.analysis:not(.featured) .analysis-card-footer {
  gap: 10px;
  margin-top: 4px;
}

.analysis-card-author {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 38px minmax(0, 1fr);
  min-width: 0;
}

.analysis-card-author span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  display: block;
  height: 36px;
  overflow: hidden;
  width: 36px;
}

.analysis-card-author img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.analysis-card-author span b {
  align-items: center;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  height: 100%;
  justify-content: center;
}

.analysis-card-author small {
  color: rgba(226, 232, 240, 0.9);
  font-size: 12px;
  font-weight: 900;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-card-footer em {
  align-items: center;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.88), rgba(190, 24, 147, 0.72));
  border: 1px solid rgba(244, 214, 255, 0.36);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  font-style: normal;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 48px;
  min-width: 138px;
  padding: 0 18px;
  box-shadow: 0 14px 32px rgba(168, 85, 247, 0.24);
}

.news-card.analysis:not(.featured) .analysis-card-footer em {
  font-size: 12px;
  min-height: 42px;
  min-width: 118px;
  padding: 0 14px;
}

.analysis-card-footer em i {
  font-size: 11px;
  transition: transform 0.2s ease;
}

.news-card.analysis:hover .analysis-card-footer em i {
  transform: translateX(3px);
}

.standard-news-overlay {
  color: #ffffff;
  display: grid;
  grid-template-rows: auto 1fr;
  inset: 0;
  padding: 18px;
  position: absolute;
  z-index: 2;
}

.standard-news-category {
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(124, 58, 237, 0.72);
  border: 1px solid rgba(216, 180, 254, 0.36);
  border-radius: 999px;
  color: #f5f3ff;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  gap: 7px;
  justify-self: start;
  padding: 8px 11px;
  text-transform: uppercase;
}

.standard-news-category i {
  color: #facc15;
}

.standard-news-copy {
  align-self: end;
  display: grid;
  gap: 12px;
}

.standard-news-copy h3 {
  color: #ffffff;
  display: -webkit-box;
  font-size: clamp(20px, 2.1vw, 28px);
  font-weight: 950;
  line-height: 1.15;
  margin: 0;
  overflow: hidden;
  text-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.standard-news-footer {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.standard-news-author {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: 34px minmax(0, 1fr);
  min-width: 0;
}

.standard-news-author span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  display: block;
  height: 34px;
  overflow: hidden;
  width: 34px;
}

.standard-news-author img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.standard-news-author b {
  align-items: center;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  height: 100%;
  justify-content: center;
}

.standard-news-author small {
  color: rgba(226, 232, 240, 0.92);
  display: block;
  font-size: 11px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.standard-news-footer em {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(190, 24, 147, 0.72));
  border: 1px solid rgba(244, 214, 255, 0.34);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
  gap: 7px;
  min-height: 38px;
  padding: 0 13px;
}

.news-card:not(.analysis):hover .standard-news-footer em i {
  transform: translateX(3px);
}

.news-card img,
.news-placeholder {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
}

.news-card:not(.analysis) > img,
.news-card:not(.analysis) > .news-placeholder {
  aspect-ratio: auto;
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
}

.news-card.analysis > img,
.news-card.analysis > .news-placeholder {
  aspect-ratio: auto;
  height: 100%;
  inset: 0;
  opacity: 0.6;
  position: absolute;
  width: 100%;
}

.news-card.analysis .analysis-card-footer img {
  aspect-ratio: auto;
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  width: 138%;
}

.news-placeholder {
  background: linear-gradient(135deg, #182033, #0b1020);
}

.read-mark {
  align-items: center;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
  color: #64748b;
  display: inline-flex;
  font-size: 10px;
  font-weight: 900;
  gap: 5px;
  left: 10px;
  margin: 0;
  padding: 6px 8px;
  position: absolute;
  top: 16px;
  z-index: 3;
}

.read-mark.earned {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.read-mark.earned i {
  color: #f59e0b;
}

.news-card.analysis .read-mark {
  top: 58px;
}

.news-card.featured:not(.analysis) .read-mark {
  left: auto;
  right: 28px;
  top: 28px;
}

.news-card > span:not(.read-mark):not(.standard-news-category) {
  background: rgba(124, 58, 237, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #e9d5ff;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  left: 18px;
  margin: 0;
  padding: 6px 9px;
  position: absolute;
  text-transform: uppercase;
  top: 62%;
  z-index: 2;
}

.news-card > strong {
  color: #ffffff;
  display: -webkit-box;
  font-size: 21px;
  font-weight: 950;
  left: 18px;
  line-height: 1.22;
  margin: 0;
  overflow: hidden;
  position: absolute;
  right: 74px;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.38);
  top: calc(62% + 42px);
  z-index: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.news-card.featured:not(.analysis) strong {
  font-size: clamp(30px, 4vw, 48px);
  max-width: 720px;
  right: 110px;
}

.news-card.featured:not(.analysis) {
  border-color: rgba(168, 85, 247, 0.52);
  border-radius: 18px;
  min-height: 560px;
}

.news-card.featured:not(.analysis)::before {
  background:
    radial-gradient(circle at 18% 12%, rgba(168, 85, 247, 0.28), transparent 32%),
    radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(76, 29, 149, 0.22), rgba(7, 10, 22, 0.64) 42%, rgba(5, 8, 20, 0.96));
}

.featured-news-overlay {
  color: #ffffff;
  display: grid;
  grid-template-rows: auto 1fr;
  inset: 0;
  overflow: hidden;
  padding: 28px;
  position: absolute;
  z-index: 2;
}

.featured-news-topline {
  align-items: center;
  display: flex;
  justify-content: flex-start;
}

.featured-news-topline > span {
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(76, 29, 149, 0.68);
  border: 1px solid rgba(216, 180, 254, 0.42);
  border-radius: 999px;
  color: #f5f3ff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  padding: 12px 18px;
  text-transform: uppercase;
}

.featured-news-topline i {
  color: #facc15;
}

.featured-news-copy {
  align-self: end;
  display: grid;
  gap: 16px;
}

.featured-news-copy h3 {
  color: #ffffff;
  display: -webkit-box;
  font-size: clamp(38px, 4.8vw, 58px);
  font-weight: 950;
  line-height: 1.08;
  margin: 0;
  max-width: 720px;
  overflow: hidden;
  text-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.featured-news-copy p {
  color: rgba(241, 245, 249, 0.88);
  display: -webkit-box;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.62;
  margin: 0;
  max-width: 660px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.featured-news-footer {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-top: 12px;
}

.featured-news-author {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 38px minmax(0, 1fr);
  min-width: 0;
}

.featured-news-author span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  display: block;
  height: 36px;
  overflow: hidden;
  width: 36px;
}

.featured-news-author img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.featured-news-author b {
  align-items: center;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  height: 100%;
  justify-content: center;
}

.featured-news-author small {
  color: rgba(226, 232, 240, 0.92);
  font-size: 12px;
  font-weight: 900;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.featured-news-footer em {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(190, 24, 147, 0.72));
  border: 1px solid rgba(244, 214, 255, 0.36);
  border-radius: 999px;
  box-shadow: 0 14px 32px rgba(168, 85, 247, 0.24);
  color: #ffffff;
  display: inline-flex;
  font-size: 13px;
  font-style: normal;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 48px;
  min-width: 138px;
  padding: 0 18px;
}

.featured-news-footer em i {
  font-size: 11px;
  transition: transform 0.2s ease;
}

.news-card.featured:not(.analysis):hover .featured-news-footer em i {
  transform: translateX(3px);
}

@media (min-width: 1180px) {
  .news-grid {
    display: grid;
    gap: 14px;
    grid-template-rows: minmax(0, 1.22fr) minmax(0, 0.78fr);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 0 2px 2px;
  }

  .news-grid.single {
    display: grid;
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .news-grid.single .news-card {
    max-width: 100%;
  }

  .news-card,
  .news-card.analysis,
  .news-card.analysis:not(.featured),
  .news-card.featured,
  .news-card.featured.analysis,
  .news-card.featured:not(.analysis) {
    border-radius: 14px;
    grid-column: auto;
    height: auto;
    min-height: 0;
  }

  .news-card.featured,
  .news-card.featured.analysis,
  .news-card.featured:not(.analysis) {
    grid-column: 1 / -1;
    min-height: 0;
  }

  .analysis-card-overlay,
  .featured-news-overlay,
  .standard-news-overlay {
    padding: 16px;
  }

  .analysis-card-copy h3,
  .featured-news-copy h3 {
    font-size: clamp(24px, 1.85vw, 32px);
    line-height: 1.1;
    -webkit-line-clamp: 3;
  }

  .news-card.analysis:not(.featured) .analysis-card-copy h3 {
    font-size: clamp(18px, 1.35vw, 23px);
    line-height: 1.08;
    -webkit-line-clamp: 2;
  }

  .standard-news-copy h3 {
    font-size: clamp(18px, 1.25vw, 23px);
    line-height: 1.12;
    -webkit-line-clamp: 3;
  }

  .analysis-card-copy p,
  .featured-news-copy p {
    font-size: 12px;
    line-height: 1.45;
    -webkit-line-clamp: 2;
  }

  .news-card.analysis:not(.featured) .analysis-card-copy p {
    display: none;
  }

  .analysis-card-score {
    border-radius: 12px;
    min-height: 66px;
    min-width: 72px;
    padding: 7px 9px;
  }

  .analysis-card-score b {
    font-size: 30px;
  }

  .news-card.analysis:not(.featured) .analysis-card-score {
    border-radius: 12px;
    min-height: 52px;
    min-width: 58px;
    padding: 6px 8px;
  }

  .news-card.analysis:not(.featured) .analysis-card-score b {
    font-size: 24px;
  }

  .news-card.analysis:not(.featured) .analysis-card-score small {
    font-size: 8px;
  }

  .analysis-card-footer,
  .featured-news-footer {
    align-items: center;
    gap: 10px;
    margin-top: 0;
  }

  .news-card.analysis:not(.featured) .analysis-card-footer,
  .standard-news-footer {
    grid-template-columns: minmax(0, 1fr) auto;
    margin-top: 0;
    overflow: hidden;
  }

  .analysis-card-footer em,
  .featured-news-footer em {
    font-size: 12px;
    min-height: 38px;
    min-width: 118px;
    padding: 0 12px;
  }

  .news-card.analysis:not(.featured) .analysis-card-footer em,
  .standard-news-footer em {
    min-height: 34px;
    min-width: 0;
    padding: 0 11px;
  }
}

@media (max-width: 980px) {
  .news-grid,
  .galaxy-live-grid,
  .community-home-grid,
  .thread-highlight-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-content {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .hero-art {
    display: none;
  }

  .hero-copy h1 {
    font-size: clamp(34px, 6vw, 48px);
    line-height: 1.08;
  }

  .hero-dashboard-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-mini-card {
    height: auto;
    min-height: 82px;
  }

  .news-card.featured {
    grid-column: 1 / -1;
  }

  .official-community-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 680px) {
  .home-page {
    padding: var(--public-page-top-mobile, 76px) 0 calc(160px + env(safe-area-inset-bottom));
  }

  .home-hero {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }

  .hero-content,
  .news-grid,
  .galaxy-live-grid,
  .community-home-grid,
  .thread-highlight-row,
  .hero-dashboard-cards {
    grid-template-columns: 1fr;
  }

  .hero-content {
    padding: 38px 22px 34px;
  }

  .hero-copy h1 {
    display: block;
    font-size: clamp(34px, 9vw, 42px);
    line-height: 1.08;
    min-height: 0;
    overflow: visible;
    overflow-wrap: anywhere;
    -webkit-line-clamp: unset;
  }

  .hero-copy p {
    font-size: 15px;
    line-height: 1.55;
    min-height: 0;
    overflow: visible;
    -webkit-line-clamp: unset;
  }

  .hero-art {
    display: none;
  }

  .hero-dashboard-cards {
    display: none;
  }

  .home-shell {
    margin-top: -16px;
    padding: 0 14px calc(150px + env(safe-area-inset-bottom));
  }

  .community-discovery-panel,
  .galaxy-live-panel {
    display: none;
  }

  .community-home-grid {
    display: flex;
    gap: 10px;
    margin-left: -14px;
    margin-right: -14px;
    overflow-x: auto;
    padding: 0 14px 6px;
    scrollbar-width: none;
  }

  .community-home-grid::-webkit-scrollbar {
    display: none;
  }

  .community-home-card {
    flex: 0 0 min(78vw, 290px);
  }

  .galaxy-live-panel,
  .community-discovery-panel {
    padding: 14px;
  }

  .official-community-card {
    min-height: 230px;
  }

  .calendar-card {
    min-height: 94px;
  }

  .latest-progress-row {
    gap: 9px;
  }

  .latest-filter-row {
    margin-left: -14px;
    margin-right: -14px;
    padding-left: 14px;
    padding-right: 14px;
  }

  .hero-feature-card {
    max-width: 100%;
  }

  .news-author-overlay {
    grid-template-columns: 30px minmax(0, 1fr);
    max-width: min(210px, calc(58% - 10px));
    min-height: 38px;
    padding: 5px 10px 5px 5px;
  }

  .news-card {
    height: auto;
    min-height: 360px;
  }

  .news-card.featured {
    grid-column: auto;
    min-height: 470px;
  }

  .news-card > span:not(.read-mark) {
    top: 58%;
  }

  .news-card strong {
    font-size: 22px;
    top: calc(58% + 42px);
  }

  .news-card.analysis {
    grid-column: auto;
    min-height: 560px;
  }

  .analysis-card-overlay {
    padding: 28px;
  }

  .analysis-card-topline {
    align-items: start;
    gap: 12px;
  }

  .analysis-card-topline > span {
    font-size: 11px;
    padding: 10px 14px;
  }

  .analysis-card-score {
    border-radius: 16px;
    min-height: 92px;
    min-width: 88px;
    padding: 10px 12px;
  }

  .analysis-card-score b {
    font-size: 46px;
  }

  .analysis-card-copy {
    gap: 14px;
  }

  .analysis-card-copy h3 {
    font-size: clamp(36px, 10.5vw, 50px);
    max-width: 100%;
  }

  .analysis-card-copy p {
    font-size: 15px;
    line-height: 1.65;
    max-width: 100%;
    -webkit-line-clamp: 3;
  }

  .analysis-card-footer {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .analysis-card-footer em {
    justify-content: center;
    width: 100%;
  }

  .featured-news-overlay {
    padding: 28px;
  }

  .featured-news-copy {
    gap: 14px;
  }

  .featured-news-copy h3 {
    font-size: clamp(36px, 10.5vw, 50px);
    max-width: 100%;
  }

  .featured-news-copy p {
    font-size: 15px;
    line-height: 1.65;
    max-width: 100%;
    -webkit-line-clamp: 3;
  }

  .featured-news-footer {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .featured-news-footer em {
    justify-content: center;
    width: 100%;
  }

  .news-card .news-author-overlay strong {
    font-size: 9px;
    line-height: 1;
  }
}

/* Gold premium analysis skin */
.news-card.analysis {
  background:
    radial-gradient(circle at 50% 18%, rgba(250, 204, 21, 0.18), transparent 34%),
    #100d05;
  border-color: rgba(245, 158, 11, 0.78);
  box-shadow: 0 20px 50px rgba(146, 64, 14, 0.28), inset 0 1px 0 rgba(255, 251, 235, 0.08);
}

.news-card.analysis > img,
.news-card.analysis > .news-placeholder {
  filter: sepia(0.28) saturate(1.2) contrast(0.96);
  opacity: 0.68;
}

.news-card.analysis::before {
  background:
    radial-gradient(circle at 24% 22%, rgba(250, 204, 21, 0.28), transparent 34%),
    radial-gradient(circle at 78% 12%, rgba(245, 158, 11, 0.2), transparent 28%),
    linear-gradient(180deg, rgba(120, 53, 15, 0.54), rgba(17, 13, 5, 0.72) 44%, rgba(8, 8, 8, 0.98));
}

.news-card.analysis::after {
  background:
    linear-gradient(100deg, transparent 12%, rgba(253, 230, 138, 0.14) 42%, transparent 66%),
    radial-gradient(circle at 52% 18%, rgba(250, 204, 21, 0.14), transparent 34%);
}

.news-card.analysis:hover {
  border-color: rgba(251, 191, 36, 0.9);
  box-shadow: 0 26px 62px rgba(180, 83, 9, 0.32), inset 0 1px 0 rgba(255, 251, 235, 0.1);
}

.analysis-card-topline > span {
  background: rgba(113, 63, 18, 0.62);
  border-color: rgba(250, 204, 21, 0.52);
  color: #fef3c7;
}

.analysis-card-topline > span i {
  color: #facc15;
}

.analysis-card-score {
  background: rgba(17, 17, 17, 0.84);
  border-color: rgba(250, 204, 21, 0.36);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28), 0 0 26px rgba(245, 158, 11, 0.14);
}

.analysis-card-score b {
  color: #facc15;
}

.analysis-card-score small {
  color: #fde68a;
}

.analysis-card-footer em {
  background: linear-gradient(135deg, rgba(146, 64, 14, 0.9), rgba(202, 138, 4, 0.74));
  border-color: rgba(253, 230, 138, 0.44);
  box-shadow: 0 14px 34px rgba(180, 83, 9, 0.26);
}

@media (max-width: 680px) {
  .home-page {
    overflow-x: hidden;
  }

  .home-shell {
    box-sizing: border-box;
    max-width: 100vw;
    overflow-x: hidden;
    padding: 0 8px;
    width: 100%;
  }

  .news-panel {
    box-sizing: border-box;
    border-radius: 16px;
    max-width: 100%;
    overflow: visible;
    padding: 10px 10px calc(118px + env(safe-area-inset-bottom));
    width: 100%;
  }

  .news-grid {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
    overflow: visible;
    width: 100%;
  }

  .news-card {
    box-sizing: border-box;
    justify-self: center;
    max-width: 100%;
    min-width: 0;
    width: 100%;
  }

  .latest-filter-row {
    scrollbar-width: none;
  }

  .latest-filter-row::-webkit-scrollbar {
    display: none;
  }

  .latest-filter-row button {
    min-height: 38px;
    padding: 0 12px;
  }

  .latest-progress-row {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .latest-page-dots {
    gap: 5px;
  }

  .latest-page-dots button {
    height: 6px;
    width: 6px;
  }

  .latest-page-dots button.active {
    width: 16px;
  }

  .news-card.featured,
  .news-card.analysis,
  .news-card.featured.analysis {
    min-height: 520px;
  }

  .news-card.analysis:not(.featured) {
    min-height: 390px;
  }

  .news-card.featured:not(.analysis) {
    min-height: 500px;
  }

  .analysis-card-overlay,
  .featured-news-overlay {
    box-sizing: border-box;
    max-width: 100%;
    min-width: 0;
    padding: 18px;
  }

  .analysis-card-topline > span,
  .featured-news-topline > span {
    font-size: 10px;
    min-height: 36px;
    padding: 0 14px;
  }

  .analysis-card-score {
    border-radius: 14px;
    min-height: 72px;
    min-width: 76px;
    padding: 8px 10px;
  }

  .analysis-card-score b {
    font-size: 34px;
  }

  .analysis-card-copy h3,
  .featured-news-copy h3 {
    font-size: clamp(25px, 7.2vw, 34px);
    line-height: 1.12;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: normal;
    -webkit-line-clamp: 4;
  }

  .analysis-card-copy p,
  .featured-news-copy p {
    font-size: 13px;
    line-height: 1.5;
    -webkit-line-clamp: 2;
  }

  .analysis-card-footer,
  .featured-news-footer {
    gap: 12px;
    margin-top: 6px;
  }

  .analysis-card-footer em,
  .featured-news-footer em {
    box-sizing: border-box;
    min-height: 44px;
    min-width: 0;
    padding: 0 14px;
    width: 100%;
  }

  .analysis-card-author small,
  .featured-news-author small {
    white-space: normal;
  }

  .news-card:not(.analysis):not(.featured) {
    min-height: 330px;
  }

  .news-author-overlay {
    gap: 5px;
    grid-template-columns: 24px minmax(0, 1fr);
    left: auto;
    max-width: min(160px, calc(52% - 8px));
    min-height: 32px;
    padding: 4px 8px 4px 4px;
    right: 10px;
  }

  .news-author-overlay > span {
    border-width: 1px;
    height: 24px;
    width: 24px;
  }

  .news-card .news-author-overlay strong {
    font-size: 7px;
    line-height: 1;
  }

  .news-card .news-author-overlay small {
    font-size: 7px;
  }

  .news-card:not(.analysis):not(.featured) strong {
    font-size: 21px;
    right: 18px;
  }
}
</style>
