<script setup>
import ContentLoading from "@/components/shared/ContentLoading.vue"
import { compactPostCategory } from '@/services/postCategoryDisplay'
import { vSoftReveal } from '@/directives/softReveal'
import GalaxyAtmosphere from '@/components/shared/GalaxyAtmosphere.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { homePinnedPosts } from '@/services/homePins'
import { socialHeadline } from '@/services/socialPostPresentation'
import HomeEditorialCard from '@/components/home/HomeEditorialCard.vue'
import HomeHeroDeck from '@/components/home/HomeHeroDeck.vue'
import HomeContentCarousel from '@/components/home/HomeContentCarousel.vue'
import { useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { resolveAssetUrl } from '@/constants/assets'
import { HOME_HERO_SLIDE_DURATION } from '@/constants/home'
import { useTimedCarousel } from '@/composables/useTimedCarousel'
import bienvenidaImage from '@/iconos/bienvenida.png'
import bannerImage from '@/iconos/Banner.png'
import logoImage from '@/iconos/logo.png'
import HomeMediaPanel from '@/components/home/HomeMediaPanel.vue'
import HomeWelcomeLoader from '@/components/home/HomeWelcomeLoader.vue'
import { postCategoryLabels, normalizeCategory } from '@/services/postCategories'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { peekPublicPage, requestPublicPage } from '@/services/publicPageCache'

const router = useRouter()
const HOME_WELCOME_STORAGE_KEY = 'galaxia-home-welcome-seen'
const HOME_WELCOME_MAX_WAIT = 4200
const shouldShowHomeWelcome = typeof window !== 'undefined'
  && sessionStorage.getItem(HOME_WELCOME_STORAGE_KEY) !== 'true'
const cachedHomePosts=peekPublicPage('home-posts')
const posts = ref((cachedHomePosts || []).filter(post=>post.placement!=='hero'&&!post.isMainEntry))
const mainEntries = ref((cachedHomePosts || []).filter(post=>post.placement==='hero'||post.isMainEntry))
const communities = ref(peekPublicPage('home-communities') || [])
const communityThreads = ref(peekPublicPage('home-threads') || [])
const events = ref(peekPublicPage('home-events') || [])
const authorProfiles = ref(Object.fromEntries((cachedHomePosts || []).map(post=>[post.authorId,peekPublicPage(`home-author:${post.authorId}`)]).filter(([,profile])=>profile)))
const isLoading = ref(!cachedHomePosts)
const isInitialHomeLoading = ref(shouldShowHomeWelcome)
const initialLoadCompleted = ref(!shouldShowHomeWelcome)
const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'
const COMMUNITY_SLIDE_DURATION = 3600
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
const allNews = computed(() => approvedPosts.value.filter(post => !isAnalysisPost(post) && post.id !== latestPost.value?.id).slice(0, 20))
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
  const page = cards.slice(start, start + 3)
  if (page.length === 3) return page
  return [...page, ...cards.slice(0, 3 - page.length)]
})
const heroSlides = computed(() => homePinnedPosts(posts.value).map(post => ({
  id: post.id, eyebrow: compactPostCategory(post),
  title: socialHeadline(post).title, highlights: socialHeadline(post).highlights,
  post, text: post.summary || post.content || '', image: post.image || bannerImage,
  label: cardCategory(post), meta: formatAgo(postDisplayDate(post)),
  primaryLabel: 'Leer noticia', action: () => goPost(post)
})))
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
  const postRequest = requestPublicPage('home-posts',async()=>{
    const snapshot=await getDocs(collection(db,'posts'))
    return snapshot.docs.map(item=>({id:item.id,...item.data()})).filter(post=>post.status==='approved'&&post.visibility!=='private'&&post.visibility!=='unlisted')
  })
  loadCommunities()
  loadCommunityThreads()
  loadEvents()

  try {
    const approved = [...await postRequest]
      .sort((a, b) => postSortTime(b) - postSortTime(a))

    posts.value = approved.filter(post => post.placement !== 'hero' && !post.isMainEntry)
    mainEntries.value = approved.filter(post => (post.placement === 'hero' || post.isMainEntry) && isReleased(post))
  } catch(error) {console.warn('No se pudo actualizar la home',error)} finally {
    isLoading.value=false
    finishInitialHomeLoad()
  }

  loadAuthorProfiles()
}

const loadCommunities = async () => {
  try {communities.value=await requestPublicPage('home-communities',async()=>{const snap=await getDocs(collection(db,'communities'));return snap.docs.map(item=>({id:item.id,...item.data()}))})}catch{}
}

const loadCommunityThreads = async () => {
  try {communityThreads.value=await requestPublicPage('home-threads',async()=>{const snap=await getDocs(collection(db,'communityThreads'));return snap.docs.map(item=>({id:item.id,...item.data()}))})}catch{}
}

const loadEvents = async () => {
  try {events.value = (await requestPublicPage('home-events',async()=>{const snap=await getDocs(collection(db,'galaxyEvents'));return snap.docs.map(item=>({id:item.id,...item.data()}))}))
    .filter(item => getTime(item.startsAt) >= Date.now() || item.featured)
    .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
  }catch{}
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
  const ids = [...new Set([...posts.value, ...mainEntries.value].map(post => post.authorId).filter(Boolean))]
  if (!ids.length) return
  const profiles = await Promise.all(ids.map(async (id) => {
    const profile=await requestPublicPage(`home-author:${id}`,async()=>{const snap=await getDoc(doc(db,'users',id));return snap.exists()?{id,...snap.data()}:null}).catch(()=>null)
    return profile?[id,profile]:null
  }))
  authorProfiles.value = Object.fromEntries(profiles.filter(Boolean))
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
const cardCategory = (post) => postCategories(post)[0] || post?.category || 'Noticias'
const isAnalysisPost = (post) => postCategories(post).some(category => normalizeCategory(category).includes('analisis'))
const authorProfile = (post) => authorProfiles.value[post?.authorId] || {}
const authorIcon = (post) => post?.authorId ? resolveProfileIcon(authorProfile(post)) : ''
const authorIconMeta = (post) => post?.authorId ? resolveProfileIconMeta(authorProfile(post)) : {}
const heroCarousel = useTimedCarousel(computed(() => heroSlides.value.length), HOME_HERO_SLIDE_DURATION)
const heroSlideIndex = heroCarousel.index
const heroPaused = ref(false)
function startHeroIfAllowed() { if (!heroPaused.value) heroCarousel.start(); else heroCarousel.stop() }
function pauseHero() { heroPaused.value=true; heroCarousel.stop() }
function resumeHero() { heroPaused.value=false; startHeroIfAllowed() }
const activeHeroSlide = computed(() => heroSlides.value[heroSlideIndex.value] || heroSlides.value[0] || null)
const communityCarousel = useTimedCarousel(communityPageCount, COMMUNITY_SLIDE_DURATION)
const communitySlideIndex = communityCarousel.index
const selectHeroSlide = (index) => {
  heroCarousel.select(index)
  if (heroPaused.value) heroCarousel.stop()
}
function swipeHero(direction) {
  if (heroSlides.value.length > 1) selectHeroSlide((heroSlideIndex.value + direction + heroSlides.value.length) % heroSlides.value.length)
}
const selectCommunitySlide = (index) => {
  communityCarousel.select(index)
}
const openHeroSlide = () => {
  if (typeof activeHeroSlide.value?.action === 'function') activeHeroSlide.value.action()
}
onMounted(() => {
  if (shouldShowHomeWelcome && typeof window !== 'undefined') {
    sessionStorage.setItem(HOME_WELCOME_STORAGE_KEY, 'true')
    homeWelcomeTimer = window.setTimeout(() => {
      finishInitialHomeLoad()
    }, HOME_WELCOME_MAX_WAIT)
  }

  startHeroIfAllowed()
  communityCarousel.start()
  loadData()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') window.clearTimeout(homeWelcomeTimer)
  heroCarousel.stop()
  communityCarousel.stop()
})
</script>

<template>
  <div v-soft-reveal="'.home2-hero-grid,.home2-community-card,.home2-panel-head'" class="home2-page">
    <GalaxyAtmosphere />
    <HomeWelcomeLoader :visible="isInitialHomeLoading" />

    <main class="home2-shell">
      <ContentLoading v-if="isLoading" variant="hero" />

      <template v-else>
        <section class="home2-hero-grid" :class="{'home-cold-load':!cachedHomePosts}">
          <HomeHeroDeck v-if="activeHeroSlide" :slides="heroSlides" :active-index="heroSlideIndex" :author-icon="authorIcon" @select="selectHeroSlide" @read="openHeroSlide" @pause="pauseHero" @resume="resumeHero" />
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

        <div class="home2-editorial-columns">
        <section class="home2-panel home2-news-panel">
          <header class="home2-panel-head">
            <h2><i class="far fa-newspaper"></i> Últimas noticias</h2>
            <button type="button" @click="router.push('/noticias')">Archivo <i class="fas fa-arrow-right"></i></button>
          </header>
          <HomeContentCarousel :items="allNews" :page-size="4" label="Últimas noticias"><template #default="{item:post}"><HomeEditorialCard :post="post" compact :author-icon="authorIcon(post)" :to="postPath(post)" :category="cardCategory(post)" :date="formatAgo(postDisplayDate(post))" /></template></HomeContentCarousel>
        </section>

        <section class="home2-panel analysis-panel">
          <header class="home2-panel-head">
            <h2><i class="fas fa-star"></i> Analisis destacados</h2>
            <button type="button" @click="router.push({name:'news',query:{category:'Analisis'}})">Ver todos <i class="fas fa-arrow-right"></i></button>
          </header>
          <HomeContentCarousel :items="analysisPosts" label="Análisis destacados"><template #default="{item:post,index}"><HomeEditorialCard :post="post" :to="postPath(post)" :date="formatAgo(postDisplayDate(post))" analysis :featured="index===0" /></template></HomeContentCarousel>
        </section>

        </div>

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
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

/* Ambient background layer: remove this block and .home2-shell z-index to disable it cleanly. */
.home2-page::before,.home2-page::after {
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
  max-width: 1320px;
  position: relative;
  width: 100%;
  z-index: 1;
}

.home2-panel,.home2-community-band,.home2-main-hero {
  border: 1px solid rgba(168, 85, 247, 0.42);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.24), 0 0 34px rgba(168, 85, 247, 0.12);
}

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
  min-height: 340px;
  height: auto;
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
  font-size: clamp(28px, 3.4vw, 48px);
  font-weight: 950;
  line-height: 1.12;
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

.home2-pill,.home2-analysis-card span,.home2-all-card span,.home2-community-band > div > span {
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

.home2-panel-head button,.home2-community-band button {
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

.analysis-page-enter-active,.analysis-page-leave-active {
  transition: opacity 0.32s ease, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.analysis-page-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.analysis-page-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

.home2-analysis-featured,.home2-analysis-card,.home2-all-card,.home2-community-card {
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.home2-analysis-featured:hover,.home2-analysis-card:hover,.home2-all-card:hover,.home2-community-card:hover {
  transform: translateY(-2px);
}

.home2-analysis-featured,.home2-analysis-card {
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

.home2-analysis-card strong,.home2-all-card strong {
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

.analysis-panel,.home2-analysis-card {
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
  grid-template-rows: auto 29px 36px 38px;
  height: 100%;
}

.home2-analysis-card span {
  align-self: center;
  background: rgba(113, 63, 18, 0.9);
  color: #fef3c7;
}

.home2-analysis-card p {
  color: #cbd5e1;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
  min-height: 38px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home2-analysis-card strong {
  min-height: 36px;
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
  text-decoration: none;
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

.home2-community-grid img,.home2-community-grid span {
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

.home2-community-dots,.home2-analysis-dots {
  align-items: center;
  display: flex;
  gap: 7px;
  justify-content: center;
  min-height: 16px;
}

.home2-community-dots button,.home2-analysis-dots button {
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

.home2-community-dots button.active,.home2-analysis-dots button.active {
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

@media (max-height: 760px) and (min-width: 641px) {
  .home2-main-hero {
    height: auto;
    min-height: 300px;
  }

  .home2-main-hero h1 {
    font-size: clamp(26px, 2.8vw, 36px);
  }
}

@media (max-width: 980px) {
  .home2-hero-grid,.home2-community-band {
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

  .home2-shell {
    gap: 14px;
    width: 100%;
  }

  .home2-panel {
    gap: 12px;
    padding: 12px;
  }

  .home2-panel-head {
    align-items: center;
    gap: 10px;
  }

  .home2-panel-head h2 {
    font-size: 18px;
    gap: 7px;
    line-height: 1.15;
    min-width: 0;
  }

  .home2-panel-head button {
    flex: 0 0 auto;
    font-size: 10px;
    gap: 6px;
    min-height: 32px;
    padding: 0 10px;
  }

  .home2-main-hero {
    height: auto;
    min-height: 360px;
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
    min-height: 430px;
    padding: 16px;
  }

  .home2-analysis-featured > span {
    font-size: 9px;
    gap: 6px;
    left: 12px;
    padding: 7px 9px;
    top: 12px;
  }

  .home2-analysis-featured em {
    font-size: 22px;
    gap: 5px;
    padding: 7px 9px;
    right: 12px;
    top: 12px;
  }

  .home2-analysis-featured em small {
    font-size: 7px;
  }

  .home2-analysis-featured h3 {
    display: -webkit-box;
    font-size: 28px;
    line-height: 1.06;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
  }

  .home2-analysis-featured p {
    font-size: 13px;
    line-height: 1.42;
    margin-top: 10px;
  }

  .home2-analysis-featured footer {
    align-items: center;
    display: grid;
    gap: 8px 10px;
    grid-template-columns: auto minmax(0, 1fr);
    margin-top: 14px;
  }

  .home2-analysis-featured footer strong {
    font-size: 11px;
    line-height: 1.25;
  }

  .home2-analysis-featured footer b {
    grid-column: 1 / -1;
    justify-self: start;
    margin-left: 0;
    min-height: 32px;
    padding: 0 11px;
  }

  .home2-all-card {
    align-items: center;
    gap: 12px;
    grid-template-columns: 112px minmax(0, 1fr);
    min-height: 116px;
    padding: 10px;
  }

  .home2-all-card img {
    aspect-ratio: auto;
    height: 94px;
    object-position: center;
    width: 112px;
  }

  .home2-all-card div {
    align-content: center;
    gap: 6px;
  }

  .home2-all-card span {
    font-size: 9px;
    max-width: 100%;
    overflow: hidden;
    padding: 6px 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .home2-all-card strong {
    font-size: 14px;
    line-height: 1.2;
  }

  .home2-all-card small {
    line-height: 1.2;
  }

  .home2-analysis-grid,.home2-all-grid,.home2-community-grid {
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

  .home2-community-grid img,.home2-community-grid span {
    height: 64px;
    width: 64px;
  }

  .home2-community-grid strong {
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-page-enter-active,.analysis-page-leave-active {
    transition-duration: 0.01ms;
  }
}
/* Keep tablet and short desktop layouts dense without scaling the interface. */
@media (min-width: 641px) and (max-width: 1440px), (min-width: 641px) and (max-height: 900px) {
  .home2-page { padding-left: clamp(12px, 2vw, 24px); padding-right: clamp(12px, 2vw, 24px); }
  .home2-shell { gap: 16px; }
  .home2-main-hero { min-height: 260px; gap: 10px; padding: 22px; box-sizing: border-box; }
  .home2-main-hero h1 { font-size: clamp(26px, 2.8vw, 36px); line-height: 1.12; -webkit-line-clamp: 3; margin: 0; }
  .home2-main-hero p { font-size: 14px; line-height: 1.45; font-weight: 600; -webkit-line-clamp: 2; margin: 0; }
  .home2-panel { padding: 16px; }
  .home2-community-band { gap: 14px; padding: 18px; }
  .home2-community-band h2 { font-size: clamp(24px, 2.4vw, 30px); line-height: 1.12; }
  .home2-community-band p { margin: 8px 0 12px; line-height: 1.4; font-weight: 600; }
  .home2-community-carousel { gap: 8px; }
  .home2-community-grid { gap: 8px; }
  .home2-community-card { min-height: 58px; padding: 8px; gap: 8px; grid-template-columns: 40px minmax(0, 1fr); }
  .home2-community-grid img,.home2-community-grid span { width: 40px; height: 40px; }
  .home2-analysis-featured { min-height: 320px; padding: 20px; box-sizing: border-box; }
  .home2-analysis-featured h3 { font-size: clamp(26px, 2.8vw, 36px); line-height: 1.12; }
  .home2-analysis-featured p { font-size: 14px; font-weight: 600; margin-top: 8px; -webkit-line-clamp: 2; }
  .home2-analysis-featured footer { margin-top: 12px; }
}
/* Reserve the same space for every slide, including longer news headlines. */
.home2-main-hero {
  height: 400px;
  min-height: 0;
  box-sizing: border-box;
  grid-template-rows: auto auto auto auto auto;
}
.home2-main-hero h1,.home2-main-hero p { margin: 0; }
.home2-main-hero h1 { -webkit-line-clamp: 3; }
.home2-main-hero p { -webkit-line-clamp: 2; }
@media (min-width: 641px) and (max-width: 1440px), (min-width: 641px) and (max-height: 900px) {
  .home2-main-hero { height: 320px; min-height: 0; }
  .home2-main-hero h1 { -webkit-line-clamp: 2; }
}
@media (max-width: 640px) {
  .home2-main-hero { height: 380px; min-height: 0; gap: 10px; padding: 18px; }
  .home2-main-hero h1 { font-size: clamp(24px, 6.5vw, 30px); line-height: 1.12; -webkit-line-clamp: 3; }
  .home2-main-hero p { font-size: 14px; line-height: 1.45; }
  .home2-meta { gap: 6px; }
}

@media(min-width:761px) and (max-width:1440px),(min-width:761px) and (max-height:900px) {
 .home2-main-hero { height:270px; padding:18px; }
 .home2-main-hero h1 { font-size:clamp(24px,2.2vw,32px); }
 .home2-community-band { padding:14px 18px; gap:16px; grid-template-columns:minmax(0,1fr) minmax(300px,.9fr); }
 .home2-community-band h2 { font-size:24px; }
 .home2-community-band p { font-size:12px; margin:6px 0 8px; }
 .home2-community-card { min-height:52px; }
}

@media(min-width:761px) { .home2-shell { width:var(--public-content-width); max-width:100%; margin-inline:auto; } }
@media(min-width:1441px) { .home2-main-hero { height:380px; padding:28px; }.home2-main-hero h1 { font-size:38px; line-height:1.15; }.home2-community-band h2 { font-size:30px; } }
</style>



<style scoped>
.home-title-emphasis{color:#facc15;background:none;font:inherit}.home2-meta .home2-summary-cta{display:inline-flex;align-items:center;gap:8px;border:1px solid #d8b4fe55;border-radius:999px;background:linear-gradient(110deg,#7c3aed,#c026d3);padding:10px 16px;color:white;font:inherit;font-weight:800;cursor:pointer}.home2-meta button.home2-hero-cta{display:inline-flex;align-items:center;gap:8px;border-radius:999px;font:inherit;border:1px solid #ffffff30;cursor:pointer}.home2-meta button:focus-visible{outline:3px solid #d8b4fe;outline-offset:3px}
</style>

<style scoped>
.home2-main-hero{background-position:center top}
.home2-meta button.home2-hero-cta,.home2-meta button.home2-summary-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;min-height:44px;padding:0 16px;font-size:13px;line-height:1.2;white-space:nowrap}
.home2-meta button.home2-hero-cta{background:#101427b8;border:1px solid #ffffff50;box-shadow:none}
.home2-editorial-columns{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}
.home2-editorial-columns>.home2-panel{min-width:0;margin:0}
.home2-editorial-columns .home2-panel-head h2{font-size:20px}
.home2-editorial-columns .home2-all-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.home2-editorial-columns .home2-analysis-featured{height:300px;min-height:0;padding:20px;gap:10px;background-position:center top;box-sizing:border-box;width:100%}
.home2-editorial-columns .home2-analysis-featured h3{font-size:24px;line-height:1.12;margin:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.home2-editorial-columns .home2-analysis-featured p{font-size:13px;line-height:1.4;margin:10px 0 0;-webkit-line-clamp:2}
.home2-editorial-columns .home2-analysis-featured>span{font-size:10px;top:14px;left:14px;padding:7px 10px}
.home2-editorial-columns .home2-analysis-featured em{font-size:24px;top:12px;right:12px;padding:8px}
.home2-editorial-columns .home2-analysis-featured footer{margin-top:12px;gap:8px;flex-wrap:wrap}
.home2-editorial-columns .home2-analysis-featured footer strong{font-size:10px}
.home2-editorial-columns .home2-analysis-featured footer b{min-height:30px;font-size:11px;padding:0 10px}
.home2-editorial-columns .home2-analysis-grid{grid-template-columns:minmax(0,1fr);gap:10px}
.home2-editorial-columns .home2-analysis-card{display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:6px 12px;padding:12px;min-height:100px;align-items:center;text-align:left;position:relative}
.home2-editorial-columns .home2-analysis-card img{grid-column:1;grid-row:1/4;height:80px;aspect-ratio:auto;object-position:center top}
.home2-editorial-columns .home2-analysis-card>span{grid-column:2;grid-row:1;font-size:9px;padding:3px 7px;min-height:0;position:static;width:max-content}
.home2-editorial-columns .home2-analysis-card strong{grid-column:2;grid-row:2;font-size:14px;-webkit-line-clamp:3}
.home2-editorial-columns .home2-analysis-card p{display:none}
.home2-editorial-columns .home2-analysis-card em{grid-column:3;grid-row:1/4;position:static;font-size:19px;padding:0;background:none;border:0}
.home2-editorial-columns .home2-analysis-card em small{display:none}
@media(min-width:960px){.home2-editorial-columns{grid-template-columns:minmax(0,1.5fr) minmax(290px,1fr)}.home2-editorial-columns .home2-all-grid{grid-template-columns:minmax(0,1fr)}.home2-editorial-columns .home2-all-card{grid-template-columns:110px minmax(0,1fr);min-height:120px}.home2-editorial-columns .home2-all-card img{height:110px;object-position:center top}}
@media(min-width:1440px){.home2-editorial-columns .home2-all-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.home2-editorial-columns .home2-all-card{grid-template-columns:minmax(0,1fr)}.home2-editorial-columns .home2-all-card img{width:100%;height:150px}.home2-editorial-columns .home2-all-card strong{-webkit-line-clamp:3}}
@media(max-width:640px){.home2-main-hero{height:auto;min-height:390px;gap:12px;background-position:center top}.home2-meta{gap:8px}.home2-meta button.home2-hero-cta,.home2-meta button.home2-summary-cta{font-size:12px;min-height:42px;padding:0 14px}.home2-meta .home2-summary-cta{margin-left:0}.home2-editorial-columns .home2-all-grid{grid-template-columns:minmax(0,1fr)}.home2-editorial-columns .home2-analysis-featured{height:310px}.home2-editorial-columns .home2-analysis-card{grid-template-columns:72px minmax(0,1fr) auto}.home2-editorial-columns .home2-analysis-card img{height:72px}.home2-editorial-columns .home2-panel-head h2{font-size:18px}}
</style>

<style scoped>
@media(max-width:640px){.home2-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;gap:10px}.home2-meta>span{width:max-content;min-width:0;max-width:100%;box-sizing:border-box;font-size:11px;padding:0 10px}.home2-meta button.home2-summary-cta{grid-column:1;grid-row:2}.home2-meta button.home2-hero-cta{grid-column:2;grid-row:2}.home2-meta button.home2-summary-cta,.home2-meta button.home2-hero-cta{width:100%;box-sizing:border-box;padding:0 10px}}
</style>

<style scoped>
.home2-editorial-columns{align-items:stretch;--editorial-card-height:280px}.home2-editorial-columns>.home2-panel{display:flex;flex-direction:column;gap:14px;align-items:stretch}.home2-editorial-columns .home2-panel-head{min-height:40px;flex-shrink:0}.home2-editorial-columns .home2-all-grid,.home2-editorial-columns .home2-analysis-grid{gap:14px;align-items:stretch;grid-auto-rows:var(--editorial-card-height)}.home2-editorial-columns .home2-analysis-dots{margin-top:auto;padding-top:12px}
@media(max-width:640px){.home2-editorial-columns{--editorial-card-height:280px}}
</style>

<style scoped>
@media(min-width:1200px){.home2-editorial-columns .home2-all-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:641px) and (max-width:1199px){.home2-editorial-columns{grid-template-columns:minmax(0,1fr)}.home2-editorial-columns .home2-all-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.home2-editorial-columns .home2-analysis-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>

<style scoped>
.home2-news-panel .home2-all-grid{grid-auto-rows:162px}.home2-hero-grid .home2-hero-controls{margin:0;max-width:none;width:100%;display:flex;align-items:center;gap:14px}.home2-hero-grid .home2-hero-progress{flex:1;max-width:550px}.home2-hero-grid .home2-hero-dots{flex-shrink:0}
@media(min-width:960px) and (max-width:1439px){.home2-news-panel .home2-all-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){.home2-news-panel .home2-all-grid{grid-auto-rows:150px}}
</style>

<style scoped>
.home2-editorial-columns>.home2-panel{align-self:start}.home2-editorial-columns .analysis-panel{--editorial-card-height:338px}.home2-news-panel :deep(.home-editorial-card.compact){height:100%}
</style>

<style scoped>
.hero-news-label{font-size:10px;color:#c7c5db;white-space:nowrap;flex:0 0 auto}.home2-hero-grid .home2-hero-controls{flex-direction:row;gap:12px}.home2-hero-grid .home2-hero-progress{max-width:360px}.home2-hero-grid .home2-hero-controls .home2-hero-dots{gap:5px}
@media(max-width:760px){.home2-hero-grid .home2-hero-controls{gap:9px;flex-wrap:wrap}.home2-hero-grid .home2-hero-progress{min-width:40px}.home2-hero-grid .home2-hero-dots button{width:7px;height:7px}.home2-hero-grid .home2-hero-dots button.active{width:22px}}
</style>

<style scoped>
@media(max-width:760px){
 .home2-hero-grid .home2-hero-controls .home2-hero-dots{gap:0}
 .home2-hero-grid .home2-hero-dots button,
 .home2-hero-grid .home2-hero-dots button.active{width:26px;height:32px;display:grid;place-items:center;background:transparent;box-shadow:none;border-radius:8px}
 .home2-hero-grid .home2-hero-dots button::before{content:'';width:7px;height:7px;border-radius:999px;background:#647084}
 .home2-hero-grid .home2-hero-dots button.active::before{width:22px;background:linear-gradient(90deg,#a855f7,#ec4899);box-shadow:0 0 12px #c026d355}
}
</style>

<style scoped>
@media(max-width:760px){}

</style>

<style scoped>
.home2-page{position:relative;isolation:isolate}
</style>

<style scoped>
@media(max-width:360px){}
</style>
