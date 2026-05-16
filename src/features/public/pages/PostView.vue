<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { READ_REWARD_STARS, awardPostRead, getReadRewardDelayMs, resolveProfileIcon } from '@/services/profileProgress'

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

const currentUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.href
})

const postSections = computed(() => Array.isArray(post.value.sections) ? post.value.sections : [])
const postReleaseTime = computed(() => getTime(post.value.releaseAt || post.value.scheduledAt))
const isUpcomingPost = computed(() => postReleaseTime.value > Date.now())
const authorIcon = computed(() => authorProfile.value ? resolveProfileIcon(authorProfile.value) : '')
const normalizeCategory = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
const isAnalysisPost = computed(() => normalizeCategory(post.value.category).includes('analisis') && post.value.analysis)
const analysisScore = computed(() => Number(post.value.analysis?.score || 0))
const analysisTier = computed(() => {
  const score = analysisScore.value
  if (score >= 90) {
      return {
        key: 'legendary',
        label: 'LEGENDARY',
        pattern: 'LEGENDARY',
        range: '90+'
      }
  }

  if (score >= 80) {
      return {
        key: 'gold',
        label: 'GOLD',
        pattern: 'GOLD',
        range: '80+'
      }
  }

  return {
    key: 'review',
    label: 'REVIEW',
    pattern: 'REVIEW',
    range: '70+'
  }
})
const analysisCriteria = computed(() => Array.isArray(post.value.analysis?.criteria) ? post.value.analysis.criteria : [])
const analysisPros = computed(() => Array.isArray(post.value.analysis?.pros) ? post.value.analysis.pros : [])
const analysisCons = computed(() => Array.isArray(post.value.analysis?.cons) ? post.value.analysis.cons : [])
const readBadgeText = computed(() => {
  if (readStatus.value.awarded) return `Visto +${READ_REWARD_STARS}`
  if (readStatus.value.viewed) return 'Visto'
  return 'No visto'
})

const loadPost = async () => {
  isLoading.value = true
  clearReadTimer()
  hasReachedEnd.value = false
  readDelayPassed.value = false
  rewardChecked.value = false
  readStatus.value = { viewed: false, awarded: false }
  post.value = { sections: [] }

  try {
    const snap = await getDoc(doc(db, "posts", route.params.id))

    if (snap.exists()) {
      const loadedPost = { id: snap.id, sections: [], ...snap.data() }
      if (loadedPost.placement === 'hero' || loadedPost.isMainEntry) {
        router.replace('/')
        return
      }

      post.value = loadedPost
      if (isUpcomingPost.value) {
        await loadAuthorProfile()
        return
      }
      markPostViewed()
      await loadRelatedPosts()
      await loadFavorite()
      await loadAuthorProfile()
      await loadReadStatus()
      startReadRewardTimer()
      setTimeout(checkEndReached, 80)
    }
  } finally {
    isLoading.value = false
  }
}

const loadAuthorProfile = async () => {
  authorProfile.value = null
  if (!post.value.authorId) return

  const snap = await getDoc(doc(db, 'users', post.value.authorId))
  if (snap.exists()) {
    authorProfile.value = { id: snap.id, ...snap.data() }
  }
}

const loadFavorite = async () => {
  const user = auth.currentUser
  isFavorite.value = false
  if (!user || !route.params.id) return

  const snap = await getDoc(doc(db, 'users', user.uid, 'favorites', route.params.id))
  isFavorite.value = snap.exists()
}

const loadRelatedPosts = async () => {
  const snap = await getDocs(collection(db, "posts"))
  const category = post.value.category || ''

  relatedPosts.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(item => item.id !== route.params.id && item.status === 'approved' && item.placement !== 'hero' && !item.isMainEntry)
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

const loadReadStatus = async () => {
  const user = auth.currentUser
  const viewed = post.value.id ? getViewedPosts().includes(post.value.id) : false
  if (!user || !post.value.id) {
    readStatus.value = { viewed, awarded: false }
    return
  }

  const snap = await getDoc(doc(db, 'users', user.uid, 'readPosts', post.value.id))
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
        message: `Has ganado ${READ_REWARD_STARS} estrellas`
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
  await navigator.clipboard.writeText(currentUrl.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1800)
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
onMounted(() => {
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  window.addEventListener('scroll', checkEndReached, { passive: true })
  window.addEventListener('resize', checkEndReached)
})
onUnmounted(() => {
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
      <span v-for="tile in 220" :key="tile">{{ analysisTier.pattern }}</span>
    </div>
    <div class="post-ambient-lights" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <main class="post-layout">
      <article class="post-article">
        <nav class="post-breadcrumb">
          <button @click="router.push('/')">Inicio</button>
          <span>/</span>
          <button @click="router.push('/#noticias')">Noticias</button>
          <span>/</span>
          <span>{{ post.category || 'General' }}</span>
        </nav>

        <span v-if="!isAnalysisPost" class="post-tag mb-3 inline-block">
          {{ post.category || 'General' }}
        </span>

        <span v-else class="analysis-title-flag">
          <i class="fas fa-crown"></i>
          Análisis Premium
        </span>

        <h1 class="post-title">
          {{ post.title }}
        </h1>

        <p v-if="isAnalysisPost && post.content" class="analysis-lede">
          {{ post.content }}
        </p>

        <div class="post-hero-meta">
          <button
            v-if="post.authorId"
            class="post-author-chip"
            type="button"
            @click="goProfile(post.authorId)"
          >
            <img v-if="authorIcon" :src="authorIcon" alt="" />
            <span v-else>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</span>
            <strong>{{ post.authorName || authorProfile?.name || 'Redactor' }}</strong>
            <i class="fas fa-circle"></i>
            <small>{{ formatDate(post.createdAt) }}</small>
          </button>

          <div v-else class="post-author-chip static">
            <span>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</span>
            <strong>{{ post.authorName || 'Redactor' }}</strong>
            <i class="fas fa-circle"></i>
            <small>{{ formatDate(post.createdAt) }}</small>
          </div>

          <div class="post-hero-actions">
            <div class="read-status-strip" :class="{ earned: readStatus.awarded, viewed: readStatus.viewed && !readStatus.awarded }">
              <i :class="readStatus.awarded ? 'fas fa-star' : 'far fa-star'"></i>
              <span>{{ readBadgeText }}</span>
            </div>

            <button
              class="favorite-btn"
              :class="{ active: isFavorite }"
              :disabled="savingFavorite"
              @click="toggleFavorite"
            >
              <i :class="isFavorite ? 'fas fa-heart' : 'far fa-heart'"></i>
              {{ isFavorite ? 'Guardado' : 'Guardar' }}
            </button>
          </div>
        </div>

        <div class="post-cover-wrap" :class="{ analysis: isAnalysisPost }">
          <img
            v-if="post.image"
            :src="post.image"
            class="post-cover-image"
          />
          <div v-else class="post-cover-image post-cover-placeholder"></div>

          <strong v-if="isAnalysisPost" class="analysis-cover-score">
            {{ analysisScore }}
            <em>{{ analysisTier.label }}</em>
          </strong>
        </div>

        <p v-if="!isAnalysisPost" class="post-paragraph mb-8">
          {{ post.content }}
        </p>

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
            class="scroll-mt-28 mb-8"
          >
            <h2 class="text-xl font-black text-gray-800 mb-2">
              {{ section.title }}
            </h2>

            <img
              v-if="section.image"
              :src="section.image"
              class="post-section-image"
              alt=""
            />

            <p class="post-paragraph">
              {{ section.content }}
            </p>
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
    radial-gradient(circle at 64% 4%, rgba(124, 58, 237, 0.28), transparent 24%),
    radial-gradient(circle at 12% 34%, rgba(168, 85, 247, 0.16), transparent 28%),
    #050816;
  color: #e5e7eb;
  min-height: 100vh;
  overflow-x: hidden;
  position: relative;
}

.post-page.analysis-page {
  background:
    radial-gradient(circle at 84% 4%, rgba(250, 204, 21, 0.46), transparent 28%),
    radial-gradient(circle at 16% 24%, rgba(217, 119, 6, 0.22), transparent 28%),
    linear-gradient(135deg, #120d04, #2d1a05 46%, #5a3608);
  overflow: hidden;
  position: relative;
}

.post-page.analysis-page::before {
  content: none;
}

.analysis-pattern-field {
  display: grid;
  gap: clamp(38px, 4vw, 74px) clamp(74px, 7vw, 140px);
  grid-template-columns: repeat(11, max-content);
  left: 50%;
  opacity: 0.9;
  pointer-events: none;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-22deg);
  width: max-content;
  z-index: 0;
}

.analysis-pattern-field span {
  color: rgba(255, 244, 194, 0.13);
  display: block;
  font-size: clamp(54px, 6vw, 112px);
  font-weight: 950;
  line-height: 0.92;
  text-transform: uppercase;
  white-space: nowrap;
}

.post-page.analysis-page::after {
  background:
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.1), transparent 24%),
    linear-gradient(90deg, rgba(18, 13, 4, 0.84), rgba(18, 13, 4, 0.18) 50%, rgba(250, 204, 21, 0.16));
  content: '';
  inset: 0;
  pointer-events: none;
  position: fixed;
  z-index: 0;
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
  background:
    radial-gradient(circle, rgba(216, 180, 254, 0.78) 0 8%, rgba(168, 85, 247, 0.3) 20%, transparent 56%);
  border-radius: 999px;
  filter: blur(0.4px);
  height: 150px;
  opacity: 0.42;
  position: absolute;
  width: 150px;
}

.post-ambient-lights span:nth-child(1) {
  right: 8%;
  top: 18%;
}

.post-ambient-lights span:nth-child(2) {
  animation-delay: -2.4s;
  height: 110px;
  left: 4%;
  top: 45%;
  width: 110px;
}

.post-ambient-lights span:nth-child(3) {
  animation-delay: -4.8s;
  bottom: 8%;
  height: 130px;
  left: 58%;
  width: 130px;
}

.analysis-page .post-ambient-lights span {
  background:
    radial-gradient(circle, rgba(254, 240, 138, 0.82) 0 7%, rgba(245, 158, 11, 0.34) 22%, transparent 58%);
  opacity: 0.5;
}

.post-page.analysis-tier-legendary {
  background:
    radial-gradient(circle at 82% 2%, rgba(254, 240, 138, 0.62), transparent 30%),
    radial-gradient(circle at 20% 32%, rgba(245, 158, 11, 0.28), transparent 30%),
    linear-gradient(135deg, #171002, #3f2604 46%, #8a5a0a);
}

.post-page.analysis-tier-review {
  background:
    radial-gradient(circle at 78% 2%, rgba(234, 179, 8, 0.34), transparent 28%),
    radial-gradient(circle at 16% 30%, rgba(120, 113, 108, 0.18), transparent 30%),
    linear-gradient(135deg, #11100b, #2a220f 48%, #4a350d);
}

.post-page.analysis-page .post-layout {
  position: relative;
  z-index: 1;
}

.post-layout {
  display: grid;
  gap: 32px;
  margin: 0 auto;
  max-width: 1180px;
  padding: 112px 24px 40px;
  position: relative;
  width: 100%;
  z-index: 1;
}

.post-article {
  min-width: 0;
}

.post-sidebar {
  display: grid;
  gap: 24px;
  min-width: 0;
}

@media (min-width: 1024px) {
  .post-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: start;
  }

  .post-sidebar {
    position: sticky;
    top: 112px;
  }
}

.post-tag {
  background: rgba(124, 58, 237, 0.88);
  border: 1px solid rgba(216, 180, 254, 0.24);
  border-radius: 999px;
  color: #f5f3ff;
  font-size: 12px;
  font-weight: 900;
  padding: 4px 10px;
  text-transform: uppercase;
}

.post-breadcrumb {
  align-items: center;
  color: #8b94ad;
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: 700;
  gap: 8px;
  margin-bottom: 18px;
}

.post-breadcrumb button:hover {
  color: #7c3aed;
}

.post-breadcrumb button:hover {
  color: #c084fc;
}

.post-title {
  color: #f8fafc;
  font-size: clamp(30px, 4vw, 52px);
  font-weight: 950;
  line-height: 1.08;
  margin-bottom: 16px;
  max-width: 780px;
  text-shadow: 0 18px 42px rgba(0, 0, 0, 0.32);
}

.analysis-lede {
  color: #cbd5e1;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.7;
  margin: -2px 0 20px;
  max-width: 720px;
}

.post-hero-meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: space-between;
}

.post-author-chip {
  align-items: center;
  backdrop-filter: blur(14px);
  background: rgba(15, 23, 42, 0.66);
  border: 1px solid rgba(168, 85, 247, 0.26);
  border-radius: 999px;
  color: #ffffff;
  display: inline-grid;
  gap: 8px;
  grid-template-columns: 44px auto 14px auto;
  min-height: 58px;
  padding: 7px 16px 7px 7px;
}

.post-author-chip img,
.post-author-chip > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.78);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 13px;
  font-weight: 950;
  height: 44px;
  justify-content: center;
  object-fit: cover;
  overflow: hidden;
  width: 44px;
}

.post-author-chip strong {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
}

.post-author-chip i {
  color: #a855f7;
  font-size: 13px;
}

.post-author-chip small {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
}

.post-hero-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.post-paragraph {
  color: #4b5563;
  font-size: 15px;
  line-height: 1.8;
}

.post-paragraph,
.post-page section h2 {
  color: #e5e7eb;
}

.post-meta-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 24px;
}

.post-meta-row.below-cover {
  margin-bottom: 18px;
}

.post-cover-wrap {
  background: #111827;
  border-radius: 14px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
  margin-bottom: 18px;
  min-height: 260px;
  overflow: hidden;
  position: relative;
}

.post-cover-wrap::before {
  background:
    radial-gradient(circle at 8% 18%, rgba(192, 132, 252, 0.72), transparent 11%),
    radial-gradient(circle at 92% 78%, rgba(236, 72, 153, 0.46), transparent 13%),
    linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent);
  content: '';
  filter: blur(8px);
  inset: -18px;
  opacity: 0.42;
  pointer-events: none;
  position: absolute;
  mix-blend-mode: screen;
  z-index: 2;
}

.post-cover-wrap.analysis {
  aspect-ratio: 16 / 8.5;
  border: 1px solid rgba(250, 204, 21, 0.72);
  box-shadow: 0 28px 74px rgba(146, 64, 14, 0.42);
  min-height: 320px;
}

.post-cover-wrap.analysis::before {
  animation: goldEdgeGlow 3.8s ease-in-out infinite;
  background:
    radial-gradient(circle at 8% 14%, rgba(254, 240, 138, 0.78), transparent 12%),
    radial-gradient(circle at 94% 18%, rgba(245, 158, 11, 0.5), transparent 12%),
    radial-gradient(circle at 78% 88%, rgba(250, 204, 21, 0.54), transparent 13%),
    linear-gradient(90deg, transparent 4%, rgba(250, 204, 21, 0.36), transparent 56%, rgba(245, 158, 11, 0.26), transparent);
  opacity: 0.58;
}

.post-cover-image {
  height: 100%;
  display: block;
  min-height: 260px;
  object-fit: cover;
  object-position: center top;
  position: relative;
  width: 100%;
  z-index: 1;
}

.post-cover-placeholder {
  background: linear-gradient(135deg, #ede9fe, #f8fafc);
}

.post-section-image {
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  display: block;
  margin: 16px 0 18px;
  object-fit: cover;
  width: 100%;
}

.post-cover-wrap::after {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.5));
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 3;
}

.post-cover-wrap.analysis::after {
  background:
    radial-gradient(circle at 82% 16%, rgba(250, 204, 21, 0.28), transparent 26%),
    linear-gradient(180deg, rgba(7, 10, 22, 0.08), rgba(42, 25, 5, 0.72));
}

.floating-author {
  align-items: center;
  backdrop-filter: blur(12px);
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  bottom: 16px;
  color: #ffffff;
  display: inline-grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr);
  left: 16px;
  max-width: calc(100% - 32px);
  padding: 8px 14px 8px 8px;
  position: absolute;
  text-align: left;
  z-index: 4;
}

.floating-author.compact {
  display: none;
}

.floating-author img,
.floating-author > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.78);
  border-radius: 999px;
  display: flex;
  font-size: 13px;
  font-weight: 950;
  height: 42px;
  justify-content: center;
  object-fit: cover;
  overflow: hidden;
  width: 42px;
}

.floating-author strong {
  display: block;
  font-size: 14px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floating-author small {
  color: #e5e7eb;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 2px;
}

.analysis-cover-badge {
  align-items: center;
  background: rgba(74, 44, 7, 0.9);
  border: 1px solid rgba(250, 204, 21, 0.44);
  border-radius: 999px;
  color: #fef3c7;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  left: 18px;
  letter-spacing: 0;
  max-width: calc(100% - 150px);
  overflow: hidden;
  padding: 9px 14px;
  position: absolute;
  text-overflow: ellipsis;
  text-transform: uppercase;
  top: 18px;
  white-space: nowrap;
  z-index: 4;
}

.analysis-cover-badge i {
  color: #facc15;
}

.analysis-cover-score {
  align-items: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(254, 240, 138, 0.24), transparent 42%),
    linear-gradient(135deg, rgba(120, 70, 8, 0.96), rgba(59, 35, 8, 0.94));
  border: 1px solid rgba(250, 204, 21, 0.58);
  border-radius: 18px;
  animation: scoreGlow 2.9s ease-in-out infinite;
  box-shadow: 0 20px 44px rgba(146, 64, 14, 0.36), 0 0 34px rgba(250, 204, 21, 0.26), inset 0 1px 0 rgba(254, 240, 138, 0.22);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  font-size: 38px;
  font-weight: 950;
  height: 112px;
  justify-content: center;
  position: absolute;
  right: 18px;
  top: 18px;
  width: 104px;
  z-index: 4;
}

.analysis-cover-score::after {
  color: #fde68a;
  content: 'Nota';
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.analysis-cover-score em {
  background: rgba(17, 24, 39, 0.72);
  border-radius: 999px;
  color: #fef3c7;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  line-height: 1;
  margin-top: 8px;
  padding: 6px 10px;
}

.analysis-title-flag {
  align-items: center;
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.82), rgba(234, 179, 8, 0.34));
  border: 1px solid rgba(250, 204, 21, 0.36);
  border-radius: 999px;
  color: #fef3c7;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  line-height: 1;
  margin-bottom: 14px;
  padding: 8px 14px;
  text-transform: uppercase;
}

.analysis-title-flag i {
  color: #facc15;
}

.author-line {
  align-items: center;
  color: #6b7280;
  display: flex;
  flex-wrap: wrap;
  font-size: 14px;
  font-weight: 700;
  gap: 10px;
}

.author-chip {
  align-items: center;
  display: inline-flex;
  gap: 8px;
}

.author-chip img,
.author-chip span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  height: 30px;
  justify-content: center;
  object-fit: cover;
  width: 30px;
}

.author-chip strong {
  color: #4b5563;
  font-weight: 900;
}

.author-chip:hover strong {
  color: #7c3aed;
}

.favorite-btn {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
}

.analysis-page .favorite-btn {
  background: rgba(74, 44, 7, 0.68);
  border-color: rgba(250, 204, 21, 0.42);
  color: #fef3c7;
}

.favorite-btn.active {
  background: #fdf2f8;
  border-color: #fbcfe8;
  color: #db2777;
}

.upcoming-post-lock {
  background:
    radial-gradient(circle at 22% 12%, rgba(168, 85, 247, 0.2), transparent 30%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(49, 20, 85, 0.9));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: 12px;
  margin: 0 0 34px;
  padding: 24px;
}

.upcoming-post-lock span {
  color: #c084fc;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.upcoming-post-lock h2 {
  color: #ffffff;
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 950;
  line-height: 1.1;
}

.upcoming-post-lock p {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.55;
  max-width: 680px;
}

.upcoming-post-lock button {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 950;
  justify-self: start;
  min-height: 42px;
  padding: 0 18px;
}

.read-status-strip {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #94a3b8;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
}

.analysis-page .read-status-strip {
  background: rgba(15, 23, 42, 0.64);
  border-color: rgba(250, 204, 21, 0.48);
  color: #facc15;
}

.analysis-summary {
  background:
    radial-gradient(circle at 88% 0%, rgba(250, 204, 21, 0.16), transparent 32%),
    rgba(35, 24, 7, 0.9);
  border: 1px solid rgba(250, 204, 21, 0.28);
  border-radius: 16px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 18px;
  margin-bottom: 32px;
  padding: 18px;
}

.analysis-summary-mobile {
  display: none;
  margin-top: 12px;
}

.analysis-summary-side {
  margin-bottom: 0;
}

.analysis-summary-side .analysis-rating-grid {
  grid-template-columns: 1fr;
}

.analysis-score-card {
  align-items: center;
  background:
    radial-gradient(circle at 92% 0%, rgba(254, 240, 138, 0.22), transparent 36%),
    linear-gradient(135deg, rgba(120, 70, 8, 0.46), rgba(30, 20, 7, 0.72));
  border: 1px solid rgba(250, 204, 21, 0.34);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
}

.analysis-score-card span {
  color: #fde68a;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.analysis-score-card strong {
  animation: scoreTextGlow 2.7s ease-in-out infinite;
  color: #facc15;
  font-size: 42px;
  font-weight: 950;
  line-height: 1;
}

.analysis-rating-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-rating-grid div {
  align-items: center;
  background: rgba(17, 15, 10, 0.74);
  border: 1px solid rgba(250, 204, 21, 0.18);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 14px;
}

.analysis-rating-grid span {
  font-size: 13px;
  font-weight: 900;
}

.analysis-rating-grid strong {
  color: #facc15;
  display: inline-flex;
  gap: 4px;
}

.analysis-pros-cons-view {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-pros-cons-view article {
  background: rgba(17, 15, 10, 0.64);
  border: 1px solid rgba(250, 204, 21, 0.14);
  border-radius: 12px;
  padding: 16px;
}

.analysis-pros-cons-view article:first-child {
  border-left: 5px solid #22c55e;
}

.analysis-pros-cons-view article:last-child {
  border-left: 5px solid #ef4444;
}

.analysis-pros-cons-view h3 {
  color: #fef3c7;
  font-size: 15px;
  font-weight: 950;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.analysis-pros-cons-view li {
  color: #e7dcc4;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
  margin-left: 18px;
}

.read-status-strip.viewed {
  background: #f1f5f9;
  color: #64748b;
}

.read-status-strip.earned {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.read-status-strip.earned i {
  animation: rewardStar 1.4s ease-in-out infinite;
  color: #f59e0b;
}

.post-side-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.05);
  padding: 18px;
}

.analysis-page .post-side-card {
  backdrop-filter: blur(16px);
  background:
    radial-gradient(circle at 100% 0%, rgba(250, 204, 21, 0.14), transparent 34%),
    rgba(35, 24, 7, 0.82);
  border-color: rgba(250, 204, 21, 0.28);
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.24);
}

.post-side-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 14px;
}

.analysis-page .post-side-title {
  color: #fde68a;
}

.post-index {
  display: grid;
  gap: 10px;
}

.post-index button {
  color: #64748b;
  display: block;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
}

.analysis-page .post-index button {
  color: #e7dcc4;
}

.analysis-page .post-index button:hover {
  color: #facc15;
}

.post-index button:hover {
  color: #7c3aed;
}

.post-stickers {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.post-stickers span {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  display: flex;
  font-size: 20px;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.analysis-page .post-stickers span {
  background: #fff7ed;
  border-color: rgba(250, 204, 21, 0.44);
}

.share-actions {
  display: flex;
  gap: 10px;
}

.share-actions button {
  align-items: center;
  background: #f1f5f9;
  border-radius: 999px;
  color: #2563eb;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  transition: all 0.2s ease;
  width: 34px;
}

.analysis-page .share-actions button {
  background: rgba(17, 15, 10, 0.72);
  border: 1px solid rgba(250, 204, 21, 0.28);
  color: #fde68a;
}

.share-actions button:hover {
  background: #ede9fe;
  color: #7c3aed;
  transform: translateY(-1px);
}

.copy-feedback {
  color: #16a34a;
  font-size: 12px;
  font-weight: 800;
  margin-top: 10px;
}

.related-list {
  display: grid;
  gap: 14px;
}

.related-item {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 78px 1fr;
  text-align: left;
}

.related-item strong {
  color: #1f2937;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.3;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.analysis-page .related-item strong {
  color: #ffffff;
}

.related-item small {
  color: #9ca3af;
  display: block;
  font-size: 11px;
  font-weight: 700;
  margin-top: 4px;
}

.analysis-page .related-item small {
  color: #e7dcc4;
}

.related-image {
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  object-fit: cover;
  width: 100%;
}

.related-placeholder {
  background: #e5e7eb;
}

.read-reward-toast {
  align-items: center;
  animation: rewardPulse 0.7s ease both;
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  bottom: 24px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
  color: #ffffff;
  display: flex;
  font-size: 13px;
  font-weight: 900;
  gap: 10px;
  left: 24px;
  padding: 12px 14px;
  position: fixed;
  z-index: 330;
}

.read-reward-toast i {
  animation: rewardStar 1.2s ease-in-out infinite;
  color: #f59e0b;
  font-size: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-14px, 12px) scale(0.94);
}

@keyframes rewardPulse {
  0% {
    transform: translate(-16px, 14px) scale(0.88);
  }
  60% {
    transform: translate(0, 0) scale(1.04);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

@keyframes rewardStar {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(14deg) scale(1.22);
  }
}

@keyframes ambientDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(10px, -14px, 0) scale(1.08);
  }
}

@keyframes goldEdgeGlow {
  0%,
  100% {
    opacity: 0.44;
  }
  50% {
    opacity: 0.68;
  }
}

@keyframes scoreGlow {
  0%,
  100% {
    box-shadow: 0 20px 44px rgba(146, 64, 14, 0.36), 0 0 24px rgba(250, 204, 21, 0.22), inset 0 1px 0 rgba(254, 240, 138, 0.22);
    transform: translateZ(0);
  }
  50% {
    box-shadow: 0 22px 52px rgba(146, 64, 14, 0.44), 0 0 44px rgba(250, 204, 21, 0.38), inset 0 1px 0 rgba(254, 240, 138, 0.32);
    transform: translateY(-1px);
  }
}

@keyframes scoreTextGlow {
  0%,
  100% {
    text-shadow: 0 0 14px rgba(250, 204, 21, 0.24);
  }
  50% {
    text-shadow: 0 0 26px rgba(250, 204, 21, 0.5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-ambient-lights span,
  .post-cover-wrap.analysis::before,
  .analysis-cover-score,
  .analysis-score-card strong {
    animation: none;
  }
}

@media (max-width: 720px) {
  .post-layout {
    gap: 20px;
    padding: 90px 14px 32px;
  }

  .post-title {
    font-size: 26px;
    line-height: 1.12;
  }

  .analysis-lede {
    font-size: 14px;
    margin-bottom: 16px;
  }

  .analysis-author-chip {
    border-radius: 18px;
    grid-template-columns: 40px minmax(0, 1fr) 14px;
    width: 100%;
  }

  .analysis-author-chip small {
    grid-column: 2 / -1;
    margin-top: -8px;
  }

  .analysis-author-chip img,
  .analysis-author-chip > span {
    height: 40px;
    width: 40px;
  }

  .post-cover-wrap {
    min-height: 220px;
  }

  .post-cover-wrap.analysis {
    aspect-ratio: auto;
    min-height: 240px;
  }

  .post-cover-image {
    min-height: 220px;
  }

  .post-cover-wrap.analysis .post-cover-image {
    min-height: 240px;
  }

  .floating-author {
    border-radius: 18px;
    bottom: 12px;
    left: 12px;
    max-width: calc(100% - 24px);
  }

  .analysis-cover-badge {
    display: none;
  }

  .analysis-cover-score {
    border-radius: 14px;
    font-size: 28px;
    height: 76px;
    right: 12px;
    top: 12px;
    width: 76px;
  }

  .analysis-cover-score::after {
    font-size: 7px;
  }

  .analysis-cover-score em {
    font-size: 8px;
    margin-top: 6px;
    padding: 5px 8px;
  }

  .analysis-title-flag {
    font-size: 11px;
    margin-bottom: 10px;
    padding: 7px 11px;
  }

  .analysis-rating-grid,
  .analysis-pros-cons-view {
    grid-template-columns: 1fr;
  }

  .analysis-summary-mobile {
    display: grid;
  }

  .analysis-summary-side {
    display: none;
  }
}

/* Compact post header pills style */
.post-hero-meta {
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 10px;
  gap: 10px;
}

.post-author-chip {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: 30px;
  padding: 0;
  grid-template-columns: 32px auto 10px auto;
  gap: 7px;
}

.post-author-chip img,
.post-author-chip > span {
  border-width: 1px;
  height: 24px;
  width: 24px;
  font-size: 11px;
}

.post-author-chip strong {
  font-size: 22px;
  line-height: 1;
}

.post-author-chip i {
  color: #a855f7;
  font-size: 6px;
}

.post-author-chip small {
  font-size: 11px;
  line-height: 1;
  color: #cbd5e1;
}

.post-hero-actions {
  align-items: center;
  gap: 8px;
}

.read-status-strip,
.favorite-btn {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  color: #e2e8f0;
  min-height: 30px;
  padding: 0;
  font-size: 12px;
  gap: 7px;
}

.read-status-strip {
  border-right: 1px solid rgba(148, 163, 184, 0.3);
  padding-right: 10px;
}

.analysis-page .favorite-btn,
.analysis-page .read-status-strip,
.favorite-btn.active,
.read-status-strip.viewed,
.read-status-strip.earned {
  background: transparent;
  border: 0;
}
</style>
