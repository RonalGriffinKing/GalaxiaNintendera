<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { isVideoMedia, mediaFromUrl } from '@/services/mediaLinks'
import { READ_REWARD_STARS, awardPostRead, getReadRewardDelayMs, resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { renderRichText } from '@/services/richText'
import PostCinematicHero from '@/components/posts/PostCinematicHero.vue'

const route = useRoute()
const router = useRouter()
const post = ref({ sections: [] })
const relatedPosts = ref([])
const copied = ref(false)
const isFavorite = ref(false)
const savingFavorite = ref(false)
const authorProfile = ref(null)
const rewardToast = ref({ show: false, message: '' })
const hasReachedEnd = ref(false)
const readDelayPassed = ref(false)
const rewardChecked = ref(false)
const readStatus = ref({ viewed: false, awarded: false })
const isLoading = ref(true)
let readTimer = null
let previousTitle = ''
let loadRequestId = 0

const currentUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.href
})
const publicPostPath = computed(() => `/post/${post.value.slug || post.value.id || route.params.id}`)

const postSections = computed(() => Array.isArray(post.value.sections) ? post.value.sections : [])
const mediaFor = (url) => mediaFromUrl(url)
const richText = (value) => renderRichText(value)
const postReleaseTime = computed(() => getTime(post.value.releaseAt || post.value.scheduledAt))
const isUpcomingPost = computed(() => postReleaseTime.value > Date.now())
const readRewardStars = computed(() => {
  const configuredReward = Math.max(0, Number(post.value.starReward || READ_REWARD_STARS))
  const multiplier = Math.max(0, Number(post.value.rewardMultiplier || 1))
  return Math.max(0, Math.round(configuredReward * multiplier))
})
const authorIcon = computed(() => authorProfile.value ? resolveProfileIcon(authorProfile.value) : '')
const authorIconMeta = computed(() => authorProfile.value ? resolveProfileIconMeta(authorProfile.value) : {})
const normalizeCategory = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
const isAnalysisPost = computed(() => normalizeCategory(post.value.category).includes('analisis') && post.value.analysis)
const analysisScore = computed(() => Number(post.value.analysis?.score || 0))
const analysisTier = computed(() => {
  const score = analysisScore.value
  if (score >= 95) {
      return {
        key: 'legendary',
        label: 'LEGENDARY',
        pattern: 'LEGENDARY',
        range: '95+'
      }
  }

  if (score >= 85) {
      return {
        key: 'gold',
        label: 'GOLD',
        pattern: 'GOLD',
        range: '85+'
      }
  }

  if (score >= 75) {
      return {
        key: 'purple',
        label: 'PREMIUM',
        pattern: 'PREMIUM',
        range: '75+'
      }
  }

  if (score >= 65) {
      return {
        key: 'blue',
        label: 'COOL',
        pattern: 'COOL',
        range: '65+'
      }
  }

  return {
    key: 'dark',
    label: 'REVIEW',
    pattern: 'REVIEW',
    range: '<65'
  }
})
const analysisCriteria = computed(() => Array.isArray(post.value.analysis?.criteria) ? post.value.analysis.criteria : [])
const analysisPros = computed(() => Array.isArray(post.value.analysis?.pros) ? post.value.analysis.pros : [])
const analysisCons = computed(() => Array.isArray(post.value.analysis?.cons) ? post.value.analysis.cons : [])
const readBadgeText = computed(() => {
  if (readStatus.value.awarded) return `Visto +${readRewardStars.value}`
  if (readStatus.value.viewed) return 'Visto'
  return 'No visto'
})

const loadPost = async () => {
  const requestId = ++loadRequestId
  isLoading.value = true
  clearReadTimer()
  hasReachedEnd.value = false
  readDelayPassed.value = false
  rewardChecked.value = false
  readStatus.value = { viewed: false, awarded: false }
  relatedPosts.value = []
  isFavorite.value = false
  authorProfile.value = null
  post.value = { sections: [] }

  try {
    let snap = await getDoc(doc(db, "posts", route.params.id))

    if (!snap.exists()) {
      const postsSnap = await getDocs(collection(db, "posts"))
      const slugMatch = postsSnap.docs.find(item => String(item.data()?.slug || '') === String(route.params.id || ''))
      if (slugMatch) {
        snap = slugMatch
      }
    }

    if (snap.exists()) {
      const loadedPost = { id: snap.id, sections: [], ...snap.data() }
      if (requestId !== loadRequestId) return

      if (loadedPost.placement === 'hero' || loadedPost.isMainEntry) {
        router.replace('/')
        return
      }

      if (loadedPost.visibility === 'private') {
        router.replace('/noticias')
        return
      }

      post.value = loadedPost
      isLoading.value = false

      if (isUpcomingPost.value) {
        loadAuthorProfile(requestId).catch(console.error)
        return
      }

      markPostViewed()
      startReadRewardTimer()
      setTimeout(checkEndReached, 80)
      loadPostExtras(requestId).catch(console.error)
    }
  } finally {
    if (requestId === loadRequestId && !post.value.id) {
      isLoading.value = false
    }
  }
}

const loadPostExtras = async (requestId) => {
  await Promise.allSettled([
    loadAuthorProfile(requestId),
    loadFavorite(requestId),
    loadReadStatus(requestId),
    loadRelatedPosts(requestId)
  ])
}

const loadAuthorProfile = async (requestId = loadRequestId) => {
  authorProfile.value = null
  if (!post.value.authorId) return

  const snap = await getDoc(doc(db, 'users', post.value.authorId))
  if (requestId !== loadRequestId) return
  if (snap.exists()) {
    authorProfile.value = { id: snap.id, ...snap.data() }
  }
}

const loadFavorite = async (requestId = loadRequestId) => {
  const user = auth.currentUser
  isFavorite.value = false
  if (!user || !post.value.id) return

  const snap = await getDoc(doc(db, 'users', user.uid, 'favorites', post.value.id))
  if (requestId !== loadRequestId) return
  isFavorite.value = snap.exists()
}

const loadRelatedPosts = async (requestId = loadRequestId) => {
  const snap = await getDocs(collection(db, "posts"))
  if (requestId !== loadRequestId) return
  const category = post.value.category || ''

  relatedPosts.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(item => item.id !== post.value.id && item.status === 'approved' && item.visibility !== 'private' && item.visibility !== 'unlisted' && item.placement !== 'hero' && !item.isMainEntry)
    .sort((a, b) => {
      const categoryScore = Number((b.category || '') === category) - Number((a.category || '') === category)
      if (categoryScore !== 0) return categoryScore
      return getTime(b.createdAt) - getTime(a.createdAt)
    })
    .slice(0, 3)
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateTime = (timestamp) => {
  const time = getTime(timestamp)
  if (!time) return ''
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const getTime = (timestamp) => {
  if (!timestamp) return 0
  return timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()
}

const goSection = (index) => {
  const section = document.getElementById(`section-${index}`)
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const goTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const goPost = (id) => {
  router.push(`/post/${id}`)
}

const goProfile = (uid) => {
  if (uid) router.push(`/perfil/${uid}`)
}

const clearReadTimer = () => {
  if (!readTimer) return
  clearTimeout(readTimer)
  readTimer = null
}

const viewedStorageKey = () => {
  const uid = auth.currentUser?.uid || 'guest'
  return `viewedPosts:${uid}`
}

const continueStorageKey = () => {
  const uid = auth.currentUser?.uid || 'guest'
  return `continueReading:${uid}`
}

const getViewedPosts = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(viewedStorageKey()) || '[]')
  } catch (error) {
    return []
  }
}

const markPostViewed = () => {
  if (!post.value.id || typeof localStorage === 'undefined') return
  const viewed = new Set(getViewedPosts())
  viewed.add(post.value.id)
  localStorage.setItem(viewedStorageKey(), JSON.stringify([...viewed].slice(-300)))
  localStorage.setItem(continueStorageKey(), JSON.stringify({
    id: post.value.id,
    title: post.value.title || '',
    image: post.value.image || '',
    category: post.value.category || 'General',
    authorName: post.value.authorName || 'Redactor',
    createdAt: post.value.createdAt || null,
    content: post.value.content || '',
    viewedAt: Date.now()
  }))
  readStatus.value = { ...readStatus.value, viewed: true }
}

const loadReadStatus = async (requestId = loadRequestId) => {
  const user = auth.currentUser
  const viewed = post.value.id ? getViewedPosts().includes(post.value.id) : false
  if (!user || !post.value.id) {
    readStatus.value = { viewed, awarded: false }
    return
  }

  const snap = await getDoc(doc(db, 'users', user.uid, 'readPosts', post.value.id))
  if (requestId !== loadRequestId) return
  readStatus.value = { viewed: viewed || snap.exists(), awarded: snap.exists() }
}

const startReadRewardTimer = () => {
  const user = auth.currentUser
  if (!user || !post.value.id) return

  readTimer = setTimeout(() => {
    readDelayPassed.value = true
    tryAwardRead()
  }, getReadRewardDelayMs())
}

const checkEndReached = () => {
  if (typeof window === 'undefined' || !post.value.id) return
  const scrollBottom = window.scrollY + window.innerHeight
  const target = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - 80
  if (scrollBottom >= target) {
    hasReachedEnd.value = true
    tryAwardRead()
  }
}

const tryAwardRead = async () => {
  const user = auth.currentUser
  if (!user || !post.value.id || rewardChecked.value || readStatus.value.awarded) return
  if (!hasReachedEnd.value || !readDelayPassed.value) return

  rewardChecked.value = true

  try {
    const result = await awardPostRead({ user, post: post.value })
    if (result.awarded) {
      readStatus.value = { viewed: true, awarded: true }
      rewardToast.value = {
        show: true,
        message: `Has ganado ${result.awardedStars || readRewardStars.value} estrellas`
      }
      setTimeout(() => {
        rewardToast.value.show = false
      }, 3200)
    } else {
      await loadReadStatus()
    }
  } catch (error) {
    rewardChecked.value = false
    console.error(error)
  }
}

const share = (platform) => {
  const url = encodeURIComponent(currentUrl.value)
  const title = encodeURIComponent(post.value.title || '')
  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    whatsapp: `https://api.whatsapp.com/send?text=${title}%20${url}`
  }

  window.open(links[platform], '_blank', 'noopener,noreferrer,width=720,height=520')
}

const copyLink = async () => {
  const url = post.value.slug && typeof window !== 'undefined'
    ? `${window.location.origin}${publicPostPath.value}`
    : currentUrl.value
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1800)
}

const ensureMetaTag = (name, content) => {
  if (typeof document === 'undefined') return
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

const ensureCanonical = (href) => {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

const applyPostSeo = () => {
  if (typeof document === 'undefined' || !post.value.id) return
  document.title = `${post.value.title || 'Post'} | Galaxia Nintendera`
  ensureMetaTag('description', post.value.metaDescription || post.value.content || '')
  ensureMetaTag('keywords', Array.isArray(post.value.keywords) ? post.value.keywords.join(', ') : '')
  ensureMetaTag('robots', post.value.indexGoogle === false || post.value.visibility === 'private' ? 'noindex,nofollow' : 'index,follow')
  const canonical = post.value.canonicalUrl || `${window.location.origin}${publicPostPath.value}`
  ensureCanonical(canonical)
}

const toggleFavorite = async () => {
  const user = auth.currentUser
  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  if (savingFavorite.value || !post.value.id) return

  savingFavorite.value = true

  try {
    const favoriteRef = doc(db, 'users', user.uid, 'favorites', post.value.id)

    if (isFavorite.value) {
      await deleteDoc(favoriteRef)
      isFavorite.value = false
    } else {
      await setDoc(favoriteRef, {
        postId: post.value.id,
        title: post.value.title || '',
        image: post.value.image || '',
        category: post.value.category || 'General',
        authorName: post.value.authorName || 'Redactor',
        createdAt: post.value.createdAt || null,
        savedAt: Date.now()
      })
      isFavorite.value = true
    }
  } finally {
    savingFavorite.value = false
  }
}

watch(() => route.params.id, loadPost, { immediate: true })
watch(post, applyPostSeo, { deep: true })
onMounted(() => {
  previousTitle = document.title
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  window.addEventListener('scroll', checkEndReached, { passive: true })
  window.addEventListener('resize', checkEndReached)
})
onUnmounted(() => {
  if (previousTitle) document.title = previousTitle
  clearReadTimer()
  window.removeEventListener('scroll', checkEndReached)
  window.removeEventListener('resize', checkEndReached)
})
</script>

<template>
  <div
    v-if="!isLoading"
    class="post-page"
    :class="[{ 'analysis-page': isAnalysisPost }, isAnalysisPost ? `analysis-tier-${analysisTier.key}` : '']"
    :style="isAnalysisPost ? { '--analysis-pattern': `'${analysisTier.pattern}'` } : null"
  >
    <div v-if="isAnalysisPost" class="analysis-pattern-field" aria-hidden="true">
      <span v-for="tile in 36" :key="tile">{{ analysisTier.pattern }}</span>
    </div>
    <div class="post-ambient-lights" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <main class="post-layout">
      <article class="post-article">
        <PostCinematicHero
          :post="post"
          :author-profile="authorProfile"
          :author-icon="authorIcon"
          :author-icon-meta="authorIconMeta"
          :is-analysis="isAnalysisPost"
          :analysis-score="analysisScore"
          :analysis-tier="analysisTier"
          :read-status="readStatus"
          :read-badge-text="readBadgeText"
          :is-favorite="isFavorite"
          :saving-favorite="savingFavorite"
          :date-label="formatDate(post.createdAt)"
          @favorite="toggleFavorite"
          @profile="goProfile"
          @copy="copyLink"
          @home="router.push('/')"
          @news="router.push('/#noticias')"
        />

        <div v-if="!isAnalysisPost" class="post-paragraph rich-content mb-8" v-html="richText(post.content)"></div>

        <section v-if="isUpcomingPost" class="upcoming-post-lock">
          <span><i class="far fa-calendar"></i> Proximamente</span>
          <h2>Disponible para leer el {{ formatDateTime(postReleaseTime) }}</h2>
          <p>Este post ya esta anunciado en el calendario global, pero su contenido se abrira automaticamente cuando llegue la fecha de lanzamiento.</p>
          <button type="button" @click="router.push('/')">
            Volver al inicio
          </button>
        </section>

        <template v-else>
          <section
            v-for="(section, i) in postSections"
            :id="`section-${i}`"
            :key="i"
            class="post-content-section scroll-mt-28"
          >
            <h2 class="text-xl font-black text-gray-800 mb-2">
              {{ section.title }}
            </h2>

            <div class="post-paragraph rich-content" v-html="richText(section.content)"></div>

            <div
              v-if="section.image"
              class="post-section-image post-section-media post-content-image"
              :class="{ video: isVideoMedia(mediaFor(section.image)) }"
            >
              <iframe
                v-if="mediaFor(section.image).type === 'youtube'"
                :src="mediaFor(section.image).embedUrl"
                :title="section.title || `Seccion ${i + 1}`"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
              <video v-else-if="mediaFor(section.image).type === 'video'" :src="mediaFor(section.image).url" controls playsinline></video>
              <img v-else :src="mediaFor(section.image).url" alt="" />
            </div>
          </section>
        </template>

        <section v-if="isAnalysisPost" class="analysis-summary analysis-summary-mobile">
          <div class="analysis-score-card">
            <strong>{{ analysisScore }}</strong>
            <span>{{ analysisTier.label }}</span>
          </div>

          <div class="analysis-rating-grid">
            <div v-for="item in analysisCriteria" :key="item.key || item.label">
              <span>{{ item.label }}</span>
              <strong>
                <i
                  v-for="star in 5"
                  :key="star"
                  :class="star <= Math.round(Number(item.score || 0)) ? 'fas fa-star' : 'far fa-star'"
                ></i>
              </strong>
            </div>
          </div>

          <div class="analysis-pros-cons-view">
            <article v-if="analysisPros.length">
              <h3>Lo mejor</h3>
              <ul>
                <li v-for="item in analysisPros" :key="item">{{ item }}</li>
              </ul>
            </article>
            <article v-if="analysisCons.length">
              <h3>Lo peor</h3>
              <ul>
                <li v-for="item in analysisCons" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </section>
      </article>

      <aside class="post-sidebar">
        <section v-if="isAnalysisPost" class="analysis-summary analysis-summary-side">
          <div class="analysis-score-card">
            <strong>{{ analysisScore }}</strong>
            <span>{{ analysisTier.label }}</span>
          </div>

          <div class="analysis-rating-grid">
            <div v-for="item in analysisCriteria" :key="item.key || item.label">
              <span>{{ item.label }}</span>
              <strong>
                <i
                  v-for="star in 5"
                  :key="star"
                  :class="star <= Math.round(Number(item.score || 0)) ? 'fas fa-star' : 'far fa-star'"
                ></i>
              </strong>
            </div>
          </div>

          <div v-if="analysisPros.length || analysisCons.length" class="analysis-pros-cons-view">
            <article v-if="analysisPros.length">
              <h3>Lo mejor</h3>
              <ul>
                <li v-for="item in analysisPros" :key="item">{{ item }}</li>
              </ul>
            </article>
            <article v-if="analysisCons.length">
              <h3>Lo peor</h3>
              <ul>
                <li v-for="item in analysisCons" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </section>

        <div class="post-side-card">
          <h3 class="post-side-title">Contenido</h3>

          <ul class="post-index">
            <li>
              <button @click="goTop">
                1. Resumen
              </button>
            </li>
            <li v-for="(section, i) in postSections" :key="i">
              <button @click="goSection(i)">
                {{ i + 2 }}. {{ section.title }}
              </button>
            </li>
          </ul>
        </div>

        <div class="post-side-card">
          <h3 class="post-side-title">Compartir</h3>

          <div class="share-actions">
            <button aria-label="Compartir en Facebook" @click="share('facebook')">
              <i class="fab fa-facebook-f"></i>
            </button>
            <button aria-label="Compartir en X" @click="share('twitter')">
              <i class="fab fa-twitter"></i>
            </button>
            <button aria-label="Compartir en WhatsApp" @click="share('whatsapp')">
              <i class="fab fa-whatsapp"></i>
            </button>
            <button aria-label="Copiar enlace" @click="copyLink">
              <i class="fas fa-link"></i>
            </button>
          </div>

          <p v-if="copied" class="copy-feedback">Enlace copiado</p>
        </div>

        <div v-if="relatedPosts.length" class="post-side-card">
          <h3 class="post-side-title">Noticias relacionadas</h3>

          <div class="related-list">
            <button
              v-for="item in relatedPosts"
              :key="item.id"
              class="related-item"
              @click="goPost(item.id)"
            >
              <img
                v-if="item.image"
                :src="item.image"
                class="related-image"
              />
              <div v-else class="related-image related-placeholder"></div>

              <span>
                <strong>{{ item.title }}</strong>
                <small>{{ item.authorName || 'Redactor' }}</small>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </main>

    <Transition name="toast">
      <div v-if="rewardToast.show" class="read-reward-toast">
        <i class="fas fa-star"></i>
        <span>{{ rewardToast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.post-page {
  background:
    radial-gradient(circle at 72% 0%, rgba(124, 58, 237, 0.28), transparent 28%),
    radial-gradient(circle at 12% 36%, rgba(168, 85, 247, 0.16), transparent 30%),
    linear-gradient(135deg, #030712, #07111f 48%, #120827);
  color: #e5e7eb;
  min-height: 100vh;
  overflow-x: hidden;
  position: relative;
}

.post-page.analysis-page {
  background:
    radial-gradient(circle at 82% 2%, rgba(250, 204, 21, 0.4), transparent 30%),
    radial-gradient(circle at 18% 28%, rgba(217, 119, 6, 0.2), transparent 32%),
    linear-gradient(135deg, #100b04, #211506 48%, #3a2407);
}

.analysis-pattern-field {
  display: grid;
  gap: clamp(52px, 6vw, 96px) clamp(96px, 10vw, 180px);
  grid-template-columns: repeat(6, max-content);
  left: 50%;
  opacity: 0.42;
  pointer-events: none;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-22deg);
  width: max-content;
  z-index: 0;
}

.analysis-pattern-field span {
  color: rgba(255, 244, 194, 0.11);
  font-size: clamp(54px, 6vw, 112px);
  font-weight: 950;
  line-height: 0.9;
  text-transform: uppercase;
  white-space: nowrap;
}

.post-ambient-lights {
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: fixed;
  z-index: 0;
}

.post-ambient-lights span {
  animation: ambientDrift 7s ease-in-out infinite;
  background: radial-gradient(circle, rgba(216, 180, 254, 0.72) 0 8%, rgba(168, 85, 247, 0.28) 22%, transparent 58%);
  border-radius: 999px;
  height: 150px;
  opacity: 0.36;
  position: absolute;
  width: 150px;
}

.post-ambient-lights span:nth-child(1) { right: 8%; top: 18%; }
.post-ambient-lights span:nth-child(2) { animation-delay: -2.4s; height: 110px; left: 4%; top: 45%; width: 110px; }
.post-ambient-lights span:nth-child(3) { animation-delay: -4.8s; bottom: 8%; height: 130px; left: 58%; width: 130px; }

.analysis-page .post-ambient-lights span {
  background: radial-gradient(circle, rgba(254, 240, 138, 0.82) 0 7%, rgba(245, 158, 11, 0.32) 22%, transparent 58%);
  opacity: 0.48;
}

.post-layout {
  display: grid;
  gap: 28px;
  margin: 0 auto;
  max-width: 1440px;
  padding: 104px 22px 56px;
  position: relative;
  width: 100%;
  z-index: 1;
}

.post-article {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.post-sidebar {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.post-paragraph {
  color: #dbe4f0;
  font-size: 16px;
  line-height: 1.86;
}

.rich-content :deep(p) { margin: 0 0 14px; }
.rich-content :deep(strong) { color: #ffffff; font-weight: 950; }
.rich-content :deep(em) { font-style: italic; }
.rich-content :deep(u) { text-decoration: underline; text-decoration-color: #c084fc; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.rich-content :deep(ul), .rich-content :deep(ol) { display: grid; gap: 8px; margin: 10px 0 16px 22px; padding: 0; }
.rich-content :deep(ul) { list-style: disc; }
.rich-content :deep(ol) { list-style: decimal; }
.rich-content :deep(blockquote) { background: rgba(168, 85, 247, 0.12); border-left: 4px solid #a855f7; border-radius: 10px; margin: 14px 0; padding: 12px 14px; }
.rich-content :deep(a) { color: #d8b4fe; font-weight: 900; text-decoration: underline; text-underline-offset: 3px; }
.rich-content :deep(hr) { border: 0; border-top: 1px solid rgba(216, 180, 254, 0.35); margin: 18px 0; }
.analysis-page .rich-content :deep(blockquote) { background: rgba(250, 204, 21, 0.1); border-left-color: #facc15; }
.analysis-page .rich-content :deep(a) { color: #fde68a; }

.post-content-section {
  background: transparent;
  border: 0;
  border-radius: 0;
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
}

.post-cinematic-hero + .post-content-section,
.post-cinematic-hero + .post-paragraph + .post-content-section {
  border-top: 1px solid rgba(250, 204, 21, 0.28);
  padding-top: 26px;
}

.analysis-page .post-content-section {
  border-top-color: transparent;
}

.analysis-page .post-cinematic-hero + .post-content-section,
.analysis-page .post-cinematic-hero + .post-paragraph + .post-content-section {
  border-top-color: rgba(250, 204, 21, 0.34);
}

.post-content-section h2 {
  color: #ffffff;
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 950;
  line-height: 1.08;
  margin: 0;
}

.post-section-image,
.post-section-media {
  aspect-ratio: 21 / 9;
  background:
    radial-gradient(circle at 20% 10%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(3, 7, 18, 0.98));
  border-radius: 14px;
  justify-self: center;
  max-height: 430px;
  max-width: 100%;
  overflow: hidden;
  width: 100%;
}

.post-section-media img,
.post-section-media iframe,
.post-section-media video {
  border: 0;
  display: block;
  height: 100%;
  object-fit: cover;
  object-position: center;
  width: 100%;
}

.upcoming-post-lock {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(49, 20, 85, 0.9));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: 12px;
  padding: 24px;
}

.upcoming-post-lock span { color: #c084fc; font-size: 11px; font-weight: 950; text-transform: uppercase; }
.upcoming-post-lock h2 { color: #ffffff; font-size: clamp(22px, 3vw, 34px); font-weight: 950; line-height: 1.1; }
.upcoming-post-lock p { color: #cbd5e1; font-size: 14px; font-weight: 750; line-height: 1.55; max-width: 680px; }
.upcoming-post-lock button { background: linear-gradient(135deg, #7c3aed, #c026d3); border-radius: 12px; color: #ffffff; font-size: 13px; font-weight: 950; justify-self: start; min-height: 42px; padding: 0 18px; }

.analysis-summary {
  backdrop-filter: blur(22px);
  background:
    radial-gradient(circle at 70% 0%, rgba(250, 204, 21, 0.2), transparent 38%),
    linear-gradient(145deg, rgba(42, 30, 9, 0.82), rgba(8, 10, 18, 0.86));
  border: 1px solid rgba(250, 204, 21, 0.32);
  border-radius: 22px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34), 0 0 48px rgba(245, 158, 11, 0.16);
  display: grid;
  gap: 18px;
  overflow: hidden;
  padding: 20px;
  position: relative;
}

.analysis-summary-mobile { display: none; }
.analysis-summary-side::before { color: rgba(250, 204, 21, 0.08); content: "OFFICIAL SCORE"; font-size: 42px; font-weight: 950; left: 16px; line-height: 0.86; position: absolute; right: 16px; top: 12px; }

.analysis-score-card {
  align-items: center;
  background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.16), transparent 34%), rgba(3, 7, 18, 0.48);
  border: 1px solid rgba(250, 204, 21, 0.34);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  padding: 22px 16px;
  position: relative;
}

.analysis-score-card strong { animation: scoreTextGlow 2.7s ease-in-out infinite; color: #facc15; font-size: 70px; font-weight: 950; line-height: 1; }
.analysis-score-card span { color: #fde68a; font-size: 12px; font-weight: 950; text-transform: uppercase; }

.analysis-rating-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
.analysis-rating-grid div { align-items: center; backdrop-filter: blur(18px); background: rgba(3, 7, 18, 0.44); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #ffffff; display: flex; justify-content: space-between; min-height: 48px; padding: 0 14px; }
.analysis-rating-grid span { font-size: 13px; font-weight: 900; }
.analysis-rating-grid strong { color: #facc15; display: inline-flex; gap: 4px; }

.analysis-pros-cons-view { display: grid; gap: 14px; grid-template-columns: 1fr; }
.analysis-pros-cons-view article { backdrop-filter: blur(18px); background: rgba(3, 7, 18, 0.44); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; }
.analysis-pros-cons-view article:first-child { border-left: 5px solid #22c55e; }
.analysis-pros-cons-view article:last-child { border-left: 5px solid #ef4444; }
.analysis-pros-cons-view h3 { color: #fef3c7; font-size: 15px; font-weight: 950; margin-bottom: 10px; text-transform: uppercase; }
.analysis-pros-cons-view li { color: #e7dcc4; font-size: 14px; font-weight: 700; line-height: 1.55; margin-left: 18px; }

.analysis-tier-purple .analysis-summary { border-color: rgba(192, 132, 252, 0.32); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34), 0 0 48px rgba(168, 85, 247, 0.16); }
.analysis-tier-purple .analysis-score-card strong, .analysis-tier-purple .analysis-rating-grid strong, .analysis-tier-purple .post-index button:hover { color: #c084fc; }
.analysis-tier-blue .analysis-summary { border-color: rgba(56, 189, 248, 0.28); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34), 0 0 48px rgba(56, 189, 248, 0.14); }
.analysis-tier-blue .analysis-score-card strong, .analysis-tier-blue .analysis-rating-grid strong, .analysis-tier-blue .post-index button:hover { color: #38bdf8; }
.analysis-tier-dark .analysis-score-card strong, .analysis-tier-dark .analysis-rating-grid strong, .analysis-tier-dark .post-index button:hover { color: #cbd5e1; }

.post-side-card {
  backdrop-filter: blur(18px);
  background: rgba(3, 7, 18, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.2);
  padding: 18px;
}

.post-side-title { color: #f8fafc; font-size: 14px; font-weight: 950; margin-bottom: 14px; }
.analysis-page .post-side-title { color: #fde68a; }
.post-index { display: grid; gap: 10px; }
.post-index button { color: #cbd5e1; display: block; font-size: 13px; font-weight: 750; line-height: 1.35; text-align: left; }
.post-index button:hover { color: #c084fc; }
.analysis-page .post-index button:hover { color: #facc15; }

.share-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.share-actions button { align-items: center; background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 999px; color: #d8b4fe; display: inline-flex; height: 36px; justify-content: center; transition: all 0.2s ease; width: 36px; }
.analysis-page .share-actions button { color: #fde68a; }
.share-actions button:hover { transform: translateY(-1px); }
.copy-feedback { color: #22c55e; font-size: 12px; font-weight: 800; margin-top: 10px; }

.related-list { display: grid; gap: 14px; }
.related-item { align-items: center; display: grid; gap: 12px; grid-template-columns: 78px 1fr; text-align: left; }
.related-item strong { color: #ffffff; display: -webkit-box; font-size: 13px; font-weight: 900; line-height: 1.3; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.related-item small { color: #cbd5e1; display: block; font-size: 11px; font-weight: 700; margin-top: 4px; }
.related-image { aspect-ratio: 16 / 10; border-radius: 8px; object-fit: cover; width: 100%; }
.related-placeholder { background: rgba(148, 163, 184, 0.2); }

.read-reward-toast { align-items: center; animation: rewardPulse 0.7s ease both; background: #111827; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; bottom: 24px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24); color: #ffffff; display: flex; font-size: 13px; font-weight: 900; gap: 10px; left: 24px; padding: 12px 14px; position: fixed; z-index: 330; }
.read-reward-toast i { animation: rewardStar 1.2s ease-in-out infinite; color: #f59e0b; font-size: 18px; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-14px, 12px) scale(0.94); }

@media (min-width: 1024px) {
  .post-layout { align-items: start; grid-template-columns: minmax(0, 1fr) 360px; }
  .post-sidebar { position: sticky; top: 96px; }
}

@media (max-width: 720px) {
  .post-layout { gap: 22px; padding: 68px 0 var(--public-page-bottom-mobile, calc(112px + env(safe-area-inset-bottom))); }
  .post-cinematic-hero { margin-left: 6px; margin-right: 6px; }
  .post-paragraph, .post-content-section, .upcoming-post-lock, .analysis-summary-mobile { margin-left: 10px; margin-right: 10px; }
  .post-paragraph { font-size: 15px; }
  .post-content-section h2 {
    font-size: 24px;
    line-height: 1.12;
  }
  .post-content-section .post-paragraph {
    margin-left: 0;
    margin-right: 0;
    max-width: 100%;
  }
  .post-content-section .rich-content {
    text-align: left;
  }
  .post-content-section { padding: 0; }
  .post-cinematic-hero + .post-content-section,
  .post-cinematic-hero + .post-paragraph + .post-content-section {
    padding-top: 20px;
  }
  .post-section-image,
  .post-section-media {
    aspect-ratio: 16 / 9;
    max-width: 100%;
  }

  .post-section-media img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .post-section-media iframe,
  .post-section-media video {
    aspect-ratio: 16 / 9;
    height: auto;
  }
  .analysis-pattern-field { display: none; }
  .post-sidebar { display: none; }
  .analysis-summary-mobile { display: grid; margin-top: 6px; }
}

@keyframes ambientDrift { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(10px, -14px, 0) scale(1.08); } }
@keyframes scoreTextGlow { 0%, 100% { text-shadow: 0 0 14px rgba(250, 204, 21, 0.24); } 50% { text-shadow: 0 0 26px rgba(250, 204, 21, 0.5); } }
@keyframes rewardPulse { 0% { transform: translate(-16px, 14px) scale(0.88); } 60% { transform: translate(0, 0) scale(1.04); } 100% { transform: translate(0, 0) scale(1); } }
@keyframes rewardStar { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(14deg) scale(1.22); } }

@media (prefers-reduced-motion: reduce) {
  .post-ambient-lights span,
  .analysis-score-card strong,
  .read-reward-toast,
  .read-reward-toast i { animation: none; }
}
</style>
