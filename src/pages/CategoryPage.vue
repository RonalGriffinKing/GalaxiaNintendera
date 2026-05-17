<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { resolveProfileIcon } from '@/services/profileProgress'
import { categoryIcon, loadPostCategories, normalizeCategory as normalize, postCategoryLabels, postMatchesCategory } from '@/services/postCategories'

const route = useRoute()
const router = useRouter()
const posts = ref([])
const selectedFilter = ref('Todas')
const viewedPosts = ref([])
const rewardedPosts = ref([])
const authorProfiles = ref({})
const isLoading = ref(true)
const filters = ref(['Todas'])
const sortMode = ref('recent')
const sortOpen = ref(false)
const sortOptions = [
  { value: 'recent', label: 'Mas recientes' },
  { value: 'oldest', label: 'Mas antiguas' }
]

const pageConfig = computed(() => {
  if (route.name === 'news') {
    return {
      type: 'news',
      title: 'Todas las noticias',
      eyebrow: 'Noticias',
      description: 'Mantente al dia con todo lo que sucede en el universo Nintendo.',
      icon: 'fas fa-newspaper',
      filter: ''
    }
  }

  if (route.name === 'rumors') {
    return {
      type: 'news',
      title: 'Rumores',
      eyebrow: 'Rumores',
      description: 'Filtraciones, pistas y posibles novedades del mundo Nintendo.',
      icon: 'fas fa-question-circle',
      filter: 'Rumores'
    }
  }

  if (route.name === 'guides') {
    return {
      type: 'news',
      title: 'Guias',
      eyebrow: 'Guias',
      description: 'Consejos, rutas y ayuda para avanzar mejor en tus juegos favoritos.',
      icon: 'fas fa-book-open',
      filter: 'Guias'
    }
  }

  if (route.name === 'community') {
    return {
      type: 'news',
      title: 'Comunidades',
      eyebrow: 'Comunidades',
      description: 'Historias, eventos y publicaciones para fans de Nintendo.',
      icon: 'fas fa-users',
      filter: ''
    }
  }

  const category = decodeURIComponent(route.params.category || 'General')
  return {
    type: 'category',
    title: `Categoria: ${category}`,
    eyebrow: category,
    description: `Todas las noticias, guias y novedades del mundo ${category}.`,
    icon: categoryIcon(category),
    filter: category
  }
})

const displayedPosts = computed(() => {
  const configFilter = normalize(pageConfig.value.filter)
  const activeFilter = normalize(selectedFilter.value)

  const filtered = posts.value.filter(post => {
    if (configFilter && !postMatchesCategory(post, configFilter)) return false
    if (!configFilter && activeFilter !== 'todas' && !postMatchesCategory(post, activeFilter)) return false

    return true
  })

  return [...filtered].sort((a, b) => {
    const left = getTime(a.createdAt)
    const right = getTime(b.createdAt)
    return sortMode.value === 'recent' ? right - left : left - right
  })
})

const sortLabel = computed(() => sortOptions.find(option => option.value === sortMode.value)?.label || 'Mas recientes')

const popularPosts = computed(() => posts.value.slice(0, 4))

const moreLinks = computed(() => {
  const topic = pageConfig.value.eyebrow
  return [
    `Guias de ${topic}`,
    'Eventos actuales',
    'Proximos lanzamientos',
    'Anime y peliculas',
    'Coleccionables'
  ]
})

const loadPosts = async () => {
  isLoading.value = true
  loadLocalReadMarks()
  try {
    const loadedCategories = await loadPostCategories()
    filters.value = ['Todas', ...loadedCategories]
    const snap = await getDocs(collection(db, "posts"))

    posts.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.status === 'approved')
      .filter(p => p.placement !== 'hero' && !p.isMainEntry)
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
    await loadAuthorProfiles(posts.value)
    await loadRewardedPosts()
  } finally {
    isLoading.value = false
  }
}

const isAnalysisPost = (post) => postCategoryLabels(post).some(category => normalize(category).includes('analisis'))

const getTime = (timestamp) => {
  if (!timestamp) return 0
  return timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()
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

const selectFilter = (filter) => {
  selectedFilter.value = filter

  if (pageConfig.value.type !== 'category') return

  if (filter === 'Todas') {
    router.push('/noticias')
    return
  }

  router.push(`/categoria/${encodeURIComponent(filter)}`)
}

const selectSort = (value) => {
  sortMode.value = value
  sortOpen.value = false
}

const goPurpleAction = () => {
  router.push(pageConfig.value.type === 'category' ? '/noticias' : '/comunidad')
}

const readState = (postId) => {
  if (rewardedPosts.value.includes(postId)) return 'earned'
  if (viewedPosts.value.includes(postId)) return 'viewed'
  return ''
}

const cardTitle = (post) => post.analysis?.hypeTitle || post.title
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

watch(() => route.fullPath, () => {
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
  selectedFilter.value = pageConfig.value.type === 'category' && filters.value.includes(pageConfig.value.eyebrow)
    ? pageConfig.value.eyebrow
    : 'Todas'
  loadPosts()
}, { immediate: true })
</script>

<template>
  <div class="listing-page" @click="sortOpen = false">
    <main v-if="!isLoading" class="listing-shell">
      <header class="listing-header">
        <div>
          <div class="listing-title-row">
            <span class="listing-icon">
              <i :class="pageConfig.icon"></i>
            </span>
            <h1>{{ pageConfig.title }}</h1>
          </div>
          <p>{{ pageConfig.description }}</p>
        </div>

      </header>

      <div class="listing-filter-bar">
        <div class="filter-row">
          <button
            v-for="filter in filters"
            :key="filter"
            :class="{ active: selectedFilter === filter }"
            @click="selectFilter(filter)"
          >
            <i :class="categoryIcon(filter)"></i>
            {{ filter }}
          </button>
        </div>

        <div class="listing-sort-combobox" @click.stop>
          <button
            type="button"
            class="listing-sort-trigger"
            :aria-expanded="sortOpen"
            aria-haspopup="listbox"
            @click="sortOpen = !sortOpen"
          >
            <span>{{ sortLabel }}</span>
            <i :class="sortOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
          </button>

          <div v-if="sortOpen" class="listing-sort-menu" role="listbox">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              :class="{ active: sortMode === option.value }"
              role="option"
              :aria-selected="sortMode === option.value"
              @click="selectSort(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <section class="listing-layout">
        <div>
          <div
            v-if="displayedPosts.length"
            class="news-list"
          >
            <button
              v-for="post in displayedPosts"
              :key="post.id"
              :class="['news-row', { analysis: isAnalysisPost(post) }]"
              @click="goPost(post.id)"
            >
              <img v-if="post.image" :src="post.image" alt="" />
              <div v-else class="post-placeholder"></div>

              <div class="listing-author-overlay">
                <span>
                  <img v-if="authorIcon(post)" :src="authorIcon(post)" alt="" />
                  <b v-else>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</b>
                </span>
                <div>
                  <strong>{{ post.authorName || 'Redactor' }}</strong>
                  <small>{{ formatAgo(post.createdAt) }}</small>
                </div>
              </div>

              <span v-if="isAnalysisPost(post)" class="listing-analysis-score">
                <i class="fas fa-star"></i>
                <b>{{ post.analysis?.score || '--' }}</b>
                <small>Nota</small>
                <em>Nota final del analisis</em>
              </span>

              <div class="post-copy">
                <span>{{ post.category || 'General' }}</span>
                <h2>{{ cardTitle(post) }}</h2>
                <p v-if="pageConfig.type === 'news'">{{ post.content }}</p>
                <div class="post-mobile-meta">
                  <span>
                    <img v-if="authorIcon(post)" :src="authorIcon(post)" alt="" />
                    <b v-else>{{ (post.authorName || 'R').charAt(0).toUpperCase() }}</b>
                    <strong>{{ post.authorName || 'Redactor' }}</strong>
                  </span>
                  <small>{{ formatAgo(post.createdAt) }}</small>
                </div>
                <small>{{ formatAgo(post.createdAt) }}</small>
              </div>
            </button>
          </div>

          <div v-else class="empty-state">
            <h2>No hay articulos disponibles</h2>
            <p>Cuando apruebes publicaciones para esta seccion apareceran aqui.</p>
          </div>
        </div>

        <aside class="listing-sidebar">
          <div class="side-card">
            <h3>Noticias populares</h3>
            <button
              v-for="post in popularPosts"
              :key="post.id"
              class="popular-post"
              @click="goPost(post.id)"
            >
              <img v-if="post.image" :src="post.image" alt="" />
              <div v-else class="popular-placeholder"></div>
              <span>
                <strong>{{ post.title }}</strong>
                <small>{{ formatAgo(post.createdAt) }}</small>
              </span>
            </button>
          </div>

          <div class="purple-card">
            <span>{{ pageConfig.type === 'category' ? 'Sabias que?' : 'Unete a las comunidades' }}</span>
            <p>
              {{ pageConfig.type === 'category'
                ? 'Publicamos curiosidades, guias y novedades para que no se te escape nada.'
                : 'Conecta con otros fans de Nintendo y comparte tu pasion.' }}
            </p>
            <button @click="goPurpleAction">
              {{ pageConfig.type === 'category' ? 'Explorar mas' : 'Entrar a comunidades' }}
            </button>
          </div>
        </aside>
      </section>
    </main>
  </div>
</template>

<style scoped>
.listing-page {
  background:
    radial-gradient(circle at 8% 0%, rgba(168, 85, 247, 0.13), transparent 26%),
    #fbfbff;
  color: #111827;
  min-height: 100vh;
  padding-top: var(--public-nav-offset, 72px);
}

.listing-shell {
  margin: 0 auto;
  max-width: 1160px;
  padding: 16px 24px 58px;
}

.listing-header {
  align-items: end;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin-bottom: 24px;
}

.listing-title-row {
  align-items: center;
  display: flex;
  gap: 12px;
}

.listing-icon {
  align-items: center;
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.listing-header h1 {
  color: #111827;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
}

.listing-header p {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  margin-top: 9px;
}

.listing-tools {
  align-items: center;
  display: flex;
  gap: 12px;
}

.listing-tools label {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #94a3b8;
  display: flex;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
}

.listing-tools input {
  color: #111827;
  font-size: 12px;
  outline: 0;
  width: 180px;
}

.listing-tools select {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  height: 38px;
  padding: 0 12px;
}

.listing-filter-bar {
  align-items: start;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 0;
}

.filter-row button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
  min-height: 34px;
  padding: 0 14px;
}

.filter-row button.active,
.filter-row button:hover {
  background: #f3e8ff;
  border-color: #d8b4fe;
  color: #7c3aed;
}

.listing-sort-combobox {
  min-width: 172px;
  position: relative;
  z-index: 10;
}

.listing-sort-trigger {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #475569;
  display: grid;
  font-size: 12px;
  font-weight: 900;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 44px;
  padding: 0 14px 0 16px;
  text-align: left;
  width: 100%;
}

.listing-sort-trigger span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listing-sort-trigger i {
  color: #a78bfa;
  font-size: 11px;
}

.listing-sort-menu {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 24px 58px rgba(15, 23, 42, 0.2);
  display: grid;
  gap: 4px;
  left: 0;
  margin-top: 8px;
  padding: 6px;
  position: absolute;
  right: 0;
}

.listing-sort-menu button {
  border-radius: 9px;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
  min-height: 36px;
  padding: 0 10px;
  text-align: left;
}

.listing-sort-menu button.active,
.listing-sort-menu button:hover {
  background: #f3e8ff;
  color: #7c3aed;
}

.listing-layout {
  align-items: start;
  display: grid;
  gap: 32px;
  grid-template-columns: minmax(0, 1fr) 300px;
}

.news-list {
  display: grid;
  gap: 24px;
}

.news-row {
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  display: grid;
  gap: 22px;
  grid-template-columns: 310px 1fr;
  padding-bottom: 24px;
  position: relative;
  text-align: left;
}

.news-row.analysis {
  background:
    radial-gradient(circle at 86% 18%, rgba(250, 204, 21, 0.2), transparent 22%),
    radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.18), transparent 34%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.99), rgba(250, 245, 255, 0.9));
  border: 1px solid rgba(168, 85, 247, 0.48);
  border-left: 5px solid #8b5cf6;
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(88, 28, 135, 0.12);
  padding: 16px 118px 16px 16px;
}

.news-row.analysis::before {
  background: linear-gradient(180deg, #facc15, #a855f7);
  border-radius: 999px;
  content: '';
  height: calc(100% - 28px);
  left: -3px;
  position: absolute;
  top: 14px;
  width: 5px;
}

.news-row.analysis .post-copy h2 {
  font-size: 22px;
  line-height: 1.16;
}

.news-row img,
.post-placeholder {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  object-fit: cover;
  width: 100%;
}

.post-placeholder {
  background: linear-gradient(135deg, #e5e7eb, #f8fafc);
}

.post-sticker {
  align-items: center;
  background: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 999px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
  display: flex;
  font-size: 18px;
  height: 38px;
  justify-content: center;
  padding: 0;
  position: absolute;
  right: 14px;
  top: 142px;
  transform: translateY(-50%);
  width: 38px;
  z-index: 2;
}

.listing-analysis-score {
  align-items: center;
  background:
    linear-gradient(135deg, rgba(88, 28, 135, 0.96), rgba(15, 23, 42, 0.96));
  border: 1px solid rgba(217, 70, 239, 0.42);
  border-radius: 999px;
  box-shadow: 0 18px 34px rgba(88, 28, 135, 0.28);
  color: #f8fafc;
  display: inline-grid;
  gap: 5px;
  grid-template-columns: auto auto;
  height: 58px;
  justify-content: center;
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  width: 100px;
  z-index: 3;
}

.listing-analysis-score i {
  color: #facc15;
  font-size: 17px;
}

.listing-analysis-score b {
  color: #facc15;
  font-size: 30px;
  font-weight: 950;
  line-height: 1;
}

.listing-analysis-score small {
  color: #e9d5ff;
  font-size: 8px;
  font-weight: 950;
  grid-column: 1 / -1;
  line-height: 1;
  margin-top: -7px;
  text-transform: uppercase;
}

.listing-analysis-score em {
  display: none;
  font-style: normal;
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
  left: 12px;
  padding: 6px 8px;
  position: absolute;
  top: 12px;
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

.listing-author-overlay {
  align-items: center;
  backdrop-filter: blur(12px);
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  color: #ffffff;
  display: grid;
  gap: 8px;
  grid-template-columns: 32px minmax(0, 1fr);
  left: auto;
  max-width: calc(100% - 24px);
  min-height: 44px;
  padding: 6px 12px 6px 6px;
  position: absolute;
  right: 12px;
  top: 12px;
  bottom: auto;
  z-index: 4;
}

.news-row .listing-author-overlay {
  left: 96px;
  right: auto;
  top: 12px;
  width: 204px;
}

.listing-author-overlay > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  height: 32px;
  justify-content: center;
  overflow: hidden;
  width: 32px;
}

.listing-author-overlay img {
  height: 138%;
  margin-left: -19%;
  margin-top: -18%;
  max-width: none;
  object-fit: cover;
  width: 138%;
}

.listing-author-overlay b {
  font-size: 11px;
}

.news-row .listing-author-overlay strong {
  color: #ffffff;
  display: block;
  font-size: 11px;
  font-weight: 950;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.news-row .listing-author-overlay small {
  color: #e5e7eb;
  display: block;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.1;
  margin-top: 2px;
}

.news-row .post-sticker {
  left: 286px;
  right: auto;
}

.post-copy {
  padding: 12px 0;
}

.post-copy span {
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 10px;
  font-weight: 900;
  padding: 4px 8px;
}

.post-copy h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 9px;
}

.post-copy p {
  color: #64748b;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.55;
  margin-top: 8px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-copy small {
  color: #94a3b8;
  display: block;
  font-size: 11px;
  font-weight: 900;
  margin-top: 9px;
}

.listing-sidebar {
  display: grid;
  gap: 20px;
  position: sticky;
  top: 104px;
}

.side-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 14px;
  padding: 20px;
}

.side-card h3 {
  color: #111827;
  font-size: 15px;
  font-weight: 900;
  margin-bottom: 2px;
}

.side-card > button:not(.popular-post) {
  align-items: center;
  color: #475569;
  display: flex;
  font-size: 13px;
  font-weight: 800;
  gap: 10px;
  text-align: left;
}

.side-card i {
  color: #7c3aed;
}

.popular-post {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 74px 1fr;
  text-align: left;
}

.popular-post img,
.popular-placeholder {
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  width: 100%;
}

.popular-placeholder {
  background: #e5e7eb;
}

.popular-post strong {
  color: #111827;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.3;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.popular-post small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 800;
  margin-top: 4px;
}

.purple-card {
  background:
    radial-gradient(circle at 88% 88%, rgba(250, 204, 21, 0.3), transparent 28%),
    linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 14px;
  box-shadow: 0 16px 36px rgba(124, 58, 237, 0.26);
  color: #ffffff;
  padding: 22px;
}

.purple-card span {
  display: block;
  font-size: 15px;
  font-weight: 900;
}

.purple-card p {
  color: #f5e8ff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
  margin-top: 10px;
}

.purple-card button {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 900;
  margin-top: 16px;
  min-height: 34px;
  padding: 0 14px;
}

.empty-state {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 44px 24px;
  text-align: center;
}

.empty-state h2 {
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.empty-state p {
  color: #64748b;
  font-weight: 700;
  margin-top: 10px;
}

@media (max-width: 920px) {
  .listing-header,
  .listing-layout {
    display: grid;
    grid-template-columns: 1fr;
  }

  .listing-sidebar {
    position: static;
  }
}

@media (max-width: 680px) {
  .listing-shell {
    padding-left: 10px;
    padding-right: 10px;
  }

  .listing-tools,
  .news-row {
    grid-template-columns: 1fr;
  }

  .listing-filter-bar {
    grid-template-columns: 1fr;
  }

  .listing-sort-combobox {
    min-width: 0;
    width: 100%;
  }

  .news-row .post-sticker,
  .post-sticker {
    left: auto;
    right: 14px;
    top: min(58vw, 318px);
  }

  .listing-author-overlay,
  .news-row .listing-author-overlay {
    left: 16px;
    right: 12px;
    top: 52px;
    width: auto;
    max-width: calc(100% - 28px);
    min-height: 40px;
    grid-template-columns: 28px minmax(0, 1fr);
    padding: 5px 10px 5px 5px;
  }

  .listing-author-overlay > span {
    height: 28px;
    width: 28px;
  }

  .news-row .listing-author-overlay strong {
    font-size: 10px;
  }

  .news-row .listing-author-overlay small {
    font-size: 8px;
  }

  .news-row.analysis {
    padding: 14px 14px 18px;
  }

  .listing-analysis-score {
    right: 14px;
    top: 14px;
    transform: none;
    height: 46px;
    width: 84px;
  }

  .listing-analysis-score b {
    font-size: 23px;
  }

  .listing-analysis-score small {
    margin-top: -6px;
  }

  .news-row.analysis .listing-author-overlay {
    top: 68px;
  }

  .listing-tools {
    display: grid;
  }

  .listing-tools input {
    width: 100%;
  }
}

/* Editorial galaxy listing */
.listing-page {
  --community-rail-edge: max(18px, calc((100vw - 1500px) / 2 - 238px));
  --community-rail-gap: 24px;
  --community-rail-width: 220px;
  background:
    radial-gradient(circle at 86% 0%, rgba(124, 58, 237, 0.28), transparent 30%),
    radial-gradient(circle at 10% 18%, rgba(168, 85, 247, 0.16), transparent 28%),
    linear-gradient(180deg, #070a18 0%, #090d1d 52%, #060914 100%);
  color: #f8fafc;
  overflow-x: hidden;
  padding-top: var(--public-nav-offset, 72px);
}

.listing-page::before {
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.16) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(168, 85, 247, 0.18) 0 1px, transparent 1.5px);
  background-position: 0 0, 46px 34px;
  background-size: 118px 118px, 156px 156px;
  content: '';
  inset: 0;
  opacity: 0.24;
  pointer-events: none;
  position: fixed;
}

.listing-shell {
  margin: 0 auto;
  max-width: 1500px;
  padding: 16px 0 70px;
  position: relative;
  width: min(1500px, calc(100vw - 48px));
  z-index: 1;
}

@media (min-width: 1780px) {
  .listing-shell {
    margin-left: auto;
    margin-right: auto;
    max-width: 1500px;
    width: min(1500px, calc(100vw - 48px));
  }
}

.listing-header {
  align-items: end;
  margin-bottom: 24px;
}

.listing-title-row {
  gap: 14px;
}

.listing-icon {
  background: rgba(124, 58, 237, 0.18);
  color: #c4b5fd;
}

.listing-header h1 {
  color: #ffffff;
  font-size: clamp(32px, 4vw, 44px);
  letter-spacing: 0;
}

.listing-header p {
  color: #cbd5e1;
  font-size: 15px;
  margin-top: 12px;
}

.listing-tools {
  display: flex;
  min-width: min(100%, 460px);
}

.listing-tools label,
.listing-tools select {
  backdrop-filter: blur(14px);
  background: rgba(11, 16, 32, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  color: #cbd5e1;
  height: 46px;
}

.listing-tools label {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 10px;
  padding: 0 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.listing-tools label i {
  color: #a78bfa;
  font-size: 14px;
}

.listing-tools label:focus-within {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(196, 181, 253, 0.7);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
}

.listing-tools input {
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  min-width: 0;
  outline: none;
  width: 100%;
}

.listing-tools input::placeholder {
  color: #a5b4fc;
  font-weight: 700;
}

.listing-tools select {
  color: #f8fafc;
  min-width: 150px;
}

.listing-filter-bar {
  align-items: start;
  gap: 16px;
}

.filter-row {
  gap: 12px;
  margin-bottom: 0;
}

.filter-row button {
  align-items: center;
  background: rgba(11, 16, 32, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 9px;
  color: #e2e8f0;
  display: inline-flex;
  gap: 10px;
  min-height: 44px;
  padding: 0 18px;
}

.filter-row button i {
  color: #facc15;
  font-size: 13px;
}

.filter-row button.active,
.filter-row button:hover {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(91, 33, 182, 0.82));
  border-color: rgba(196, 181, 253, 0.48);
  color: #ffffff;
}

.listing-sort-combobox {
  min-width: 180px;
}

.listing-sort-trigger {
  backdrop-filter: blur(14px);
  background: rgba(11, 16, 32, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  color: #f8fafc;
  min-height: 44px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.listing-sort-trigger:hover,
.listing-sort-trigger[aria-expanded="true"] {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(196, 181, 253, 0.72);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18);
}

.listing-sort-menu {
  background: rgba(10, 14, 31, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
}

.listing-sort-menu button {
  color: #cbd5e1;
}

.listing-sort-menu button.active,
.listing-sort-menu button:hover {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.78), rgba(190, 24, 147, 0.46));
  color: #ffffff;
}

.listing-layout {
  gap: 28px;
  grid-template-columns: minmax(0, 1fr) 360px;
}

.news-list {
  gap: 14px;
}

.news-row {
  align-items: center;
  background:
    radial-gradient(circle at 88% 18%, rgba(124, 58, 237, 0.14), transparent 24%),
    rgba(8, 13, 29, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.2);
  gap: 24px;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr) 78px;
  min-height: 176px;
  overflow: hidden;
  padding: 14px 16px 14px 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.news-row:hover {
  border-color: rgba(168, 85, 247, 0.56);
  box-shadow: 0 22px 56px rgba(88, 28, 135, 0.24);
  transform: translateY(-2px);
}

.news-row.analysis {
  background:
    radial-gradient(circle at 82% 42%, rgba(124, 58, 237, 0.26), transparent 34%),
    radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.2), transparent 32%),
    rgba(11, 13, 34, 0.92);
  border: 1px solid rgba(168, 85, 247, 0.68);
  box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.2), 0 22px 58px rgba(88, 28, 135, 0.28);
  padding: 14px 16px 14px 14px;
}

.news-row.analysis > img,
.news-row.analysis > .post-placeholder {
  grid-column: 1;
  grid-row: 1;
}

.news-row.analysis::before {
  background: linear-gradient(180deg, #a855f7, #7c3aed);
  border-radius: 999px;
  height: calc(100% - 28px);
  left: 0;
  top: 14px;
  width: 4px;
}

.news-row img,
.news-row .post-placeholder {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  height: auto;
  min-height: 148px;
}

.listing-author-overlay,
.news-row .listing-author-overlay,
.news-row.analysis .listing-author-overlay {
  align-self: start;
  background: rgba(13, 20, 38, 0.76);
  border-color: rgba(255, 255, 255, 0.16);
  grid-column: 2;
  grid-row: 1;
  justify-self: start;
  left: auto;
  margin: 0 0 14px;
  max-width: 220px;
  right: auto;
  top: auto;
  width: 220px;
  position: relative;
}

.read-mark {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
  left: 24px;
  top: 26px;
}

.read-mark i,
.read-mark.earned i {
  color: #f59e0b;
}

.post-sticker,
.news-row .post-sticker {
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #facc15;
  left: auto;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
}

.news-row.analysis .post-sticker {
  left: 342px;
  right: auto;
}

.news-row.analysis .listing-author-overlay > span {
  height: 34px;
  width: 34px;
}

.news-row.analysis .listing-author-overlay strong {
  font-size: 13px;
  text-transform: none;
}

.news-row.analysis .listing-author-overlay small {
  color: #cbd5e1;
  font-size: 11px;
}

.listing-analysis-score {
  background: rgba(12, 16, 36, 0.9);
  border: 1px solid rgba(168, 85, 247, 0.48);
  border-radius: 14px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.26);
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  position: static;
  transform: none;
}

.post-copy {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  min-width: 0;
  padding: 0;
  padding-top: 56px;
}

.news-row.analysis .post-copy {
  align-self: center;
  padding-top: 58px;
}

.post-copy span {
  background: rgba(124, 58, 237, 0.5);
  color: #e9d5ff;
  font-size: 11px;
  padding: 6px 10px;
  text-transform: uppercase;
}

.post-copy h2,
.news-row.analysis .post-copy h2 {
  color: #ffffff;
  display: -webkit-box;
  font-size: clamp(21px, 2.2vw, 28px);
  line-height: 1.14;
  margin-top: 12px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-copy p {
  color: #cbd5e1;
  font-size: 15px;
  line-height: 1.55;
  max-width: 680px;
  -webkit-line-clamp: 2;
}

.post-copy small {
  color: #94a3b8;
  font-size: 12px;
}

.post-mobile-meta {
  display: none;
}

.listing-sidebar {
  gap: 18px;
}

.side-card {
  background: rgba(8, 13, 29, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
  padding: 20px;
}

.side-card h3 {
  color: #ffffff;
  font-size: 18px;
}

.popular-post {
  grid-template-columns: 76px minmax(0, 1fr);
}

.popular-post img,
.popular-placeholder {
  border-radius: 8px;
}

.popular-post strong {
  color: #f8fafc;
  font-size: 13px;
}

.popular-post small {
  color: #94a3b8;
}

.purple-card {
  background:
    radial-gradient(circle at 88% 88%, rgba(255, 255, 255, 0.14), transparent 28%),
    linear-gradient(135deg, #4c1d95, #7c3aed 55%, #c026d3);
  border: 1px solid rgba(216, 180, 254, 0.22);
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(124, 58, 237, 0.24);
  padding: 26px;
}

.purple-card span {
  font-size: 18px;
}

.purple-card p {
  font-size: 14px;
}

.purple-card button {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 9px;
  min-height: 42px;
  padding: 0 18px;
}

.empty-state {
  background: rgba(8, 13, 29, 0.78);
  border-color: rgba(148, 163, 184, 0.16);
}

.empty-state h2 {
  color: #ffffff;
}

.empty-state p {
  color: #cbd5e1;
}

@media (max-width: 1100px) {
  .listing-layout {
    grid-template-columns: 1fr;
  }

  .listing-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: static;
  }
}

@media (max-width: 760px) {
  .listing-page {
    padding-top: var(--public-page-top-mobile, 76px);
  }

  .listing-shell {
    padding: 0 0 46px;
    width: min(100% - 28px, 1500px);
  }

  .listing-header,
  .listing-tools {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }

  .listing-filter-bar {
    grid-template-columns: 1fr;
  }

  .listing-sort-combobox {
    min-width: 0;
    width: 100%;
  }

  .listing-header h1 {
    font-size: 34px;
  }

  .filter-row {
    flex-wrap: nowrap;
    margin-left: -14px;
    margin-right: -14px;
    overflow-x: auto;
    padding: 0 14px 4px;
  }

  .filter-row button {
    flex: 0 0 auto;
  }

  .news-row,
  .news-row.analysis {
    grid-template-columns: 1fr;
    min-height: 0;
    padding: 12px;
  }

  .news-row.analysis > img,
  .news-row.analysis > .post-placeholder,
  .news-row.analysis .listing-author-overlay,
  .news-row.analysis .post-copy,
  .listing-analysis-score {
    grid-column: auto;
    grid-row: auto;
  }

  .news-row img,
  .news-row .post-placeholder {
    min-height: 0;
  }

  .listing-author-overlay,
  .news-row .listing-author-overlay {
    left: auto;
    max-width: calc(100% - 108px);
    right: auto;
    top: auto;
    width: auto;
  }

  .read-mark {
    left: 24px;
    top: 24px;
  }

  .post-sticker,
  .news-row .post-sticker {
    left: auto;
    right: 26px;
    top: min(53vw, 232px);
  }

  .listing-analysis-score {
    grid-column: auto;
    height: 56px;
    justify-self: start;
    margin-top: 2px;
    order: 4;
    width: 104px;
  }

  .post-copy {
    order: 2;
    padding-top: 2px;
  }

  .news-row.analysis .listing-author-overlay {
    margin: 4px 0 0;
    max-width: 100%;
    order: 2;
    width: 100%;
  }

  .news-row .listing-author-overlay {
    margin: 4px 0 0;
    max-width: 100%;
    order: 2;
    width: 100%;
  }

  .news-row.analysis .post-copy {
    order: 3;
    padding-bottom: 0;
    padding-top: 0;
  }

  .news-row .post-copy {
    order: 3;
    padding-top: 0;
  }

  .post-copy h2,
  .news-row.analysis .post-copy h2 {
    font-size: 25px;
    -webkit-line-clamp: 3;
  }

  .post-copy p {
    font-size: 14px;
    -webkit-line-clamp: 3;
  }

  .listing-sidebar {
    grid-template-columns: 1fr;
  }
}

/* Gold premium analysis skin */
.news-row.analysis {
  background:
    radial-gradient(circle at 52% 18%, rgba(250, 204, 21, 0.16), transparent 34%),
    radial-gradient(circle at 84% 48%, rgba(245, 158, 11, 0.18), transparent 28%),
    rgba(19, 15, 8, 0.94);
  border-color: rgba(245, 158, 11, 0.78);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.22), 0 22px 58px rgba(120, 53, 15, 0.28);
}

.news-row.analysis::before {
  background: linear-gradient(180deg, #facc15, #b45309);
}

.news-row.analysis > img,
.news-row.analysis > .post-placeholder {
  filter: sepia(0.24) saturate(1.14) contrast(0.96);
}

.news-row.analysis .listing-author-overlay {
  align-self: end;
  background: rgba(17, 17, 17, 0.58);
  border-color: rgba(250, 204, 21, 0.18);
  grid-column: 2 / 4;
  justify-self: end;
  margin: 14px 0 0;
  order: initial;
}

.news-row.analysis .post-copy {
  align-self: center;
  padding-bottom: 58px;
  padding-top: 0;
}

.news-row.analysis .post-copy > small {
  display: none;
}

.news-row.analysis .listing-analysis-score {
  align-self: start;
  margin-top: 0;
}

.news-row.analysis .post-copy span {
  background: rgba(113, 63, 18, 0.72);
  color: #fef3c7;
}

.listing-analysis-score {
  background: rgba(17, 17, 17, 0.88);
  border-color: rgba(250, 204, 21, 0.42);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28), 0 0 26px rgba(245, 158, 11, 0.14);
}

.listing-analysis-score i,
.listing-analysis-score b {
  color: #facc15;
}

.listing-analysis-score small {
  color: #fde68a;
}

.news-row .listing-author-overlay,
.news-row.analysis .listing-author-overlay {
  align-self: end;
  background: rgba(8, 13, 29, 0.66);
  border-color: rgba(255, 255, 255, 0.14);
  grid-column: 2 / 4;
  justify-self: end;
  margin: 14px 0 0;
}

.news-row.analysis .listing-author-overlay {
  background: rgba(17, 17, 17, 0.58);
  border-color: rgba(250, 204, 21, 0.18);
}

.news-row .post-copy,
.news-row.analysis .post-copy {
  align-self: center;
  padding-bottom: 58px;
  padding-top: 0;
}

.news-row .post-copy > small,
.news-row.analysis .post-copy > small {
  display: none;
}

@media (max-width: 760px) {
  .news-row,
  .news-row.analysis {
    gap: 0;
    overflow: hidden;
    padding: 12px;
    position: relative;
  }

  .news-row > img,
  .news-row > .post-placeholder,
  .news-row.analysis > img,
  .news-row.analysis > .post-placeholder {
    border-radius: 12px;
    display: block;
    grid-column: auto;
    grid-row: auto;
    order: 1;
    width: 100%;
  }

  .listing-author-overlay,
  .news-row .listing-author-overlay,
  .news-row.analysis .listing-author-overlay {
    align-self: auto;
    backdrop-filter: blur(14px);
    background: rgba(8, 13, 29, 0.84);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
    grid-column: auto;
    grid-row: auto;
    left: auto;
    margin: 0;
    max-width: min(280px, calc(100% - 88px));
    min-height: 42px;
    order: initial;
    padding: 5px 12px 5px 5px;
    position: absolute;
    bottom: auto;
    right: 18px;
    top: clamp(258px, calc(56.25vw + 44px), 380px);
    width: auto;
    z-index: 5;
  }

  .listing-author-overlay > span,
  .news-row.analysis .listing-author-overlay > span {
    height: 32px;
    width: 32px;
  }

  .news-row .listing-author-overlay strong,
  .news-row.analysis .listing-author-overlay strong {
    font-size: 11px;
    text-transform: uppercase;
  }

  .news-row .listing-author-overlay small,
  .news-row.analysis .listing-author-overlay small {
    font-size: 9px;
  }

  .post-copy,
  .news-row .post-copy,
  .news-row.analysis .post-copy {
    background:
      radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.13), transparent 34%),
      rgba(7, 10, 22, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 14px;
    grid-column: auto;
    grid-row: auto;
    margin-top: 16px;
    order: 2;
    padding: 16px;
  }

  .news-row.analysis .post-copy {
    background:
      radial-gradient(circle at 100% 0%, rgba(250, 204, 21, 0.12), transparent 34%),
      rgba(17, 17, 17, 0.68);
    border-color: rgba(250, 204, 21, 0.16);
  }

  .post-copy h2,
  .news-row.analysis .post-copy h2 {
    font-size: clamp(23px, 7.6vw, 32px);
    line-height: 1.14;
    margin-top: 12px;
  }

  .post-copy p {
    font-size: 14px;
    line-height: 1.55;
  }

  .listing-analysis-score {
    align-items: center;
    align-self: stretch;
    display: grid;
    gap: 6px 10px;
    grid-column: auto;
    grid-row: auto;
    grid-template-columns: auto auto minmax(0, 1fr);
    height: auto;
    justify-self: stretch;
    margin: 14px 0 0;
    order: 3;
    padding: 12px 14px;
    width: 100%;
  }

  .listing-analysis-score i {
    font-size: 18px;
  }

  .listing-analysis-score b {
    font-size: 28px;
  }

  .listing-analysis-score small {
    grid-column: auto;
    margin: 0;
  }

  .listing-analysis-score em {
    color: #f8fafc;
    display: block;
    font-size: 12px;
    font-weight: 850;
    grid-column: 1 / -1;
    line-height: 1.35;
    opacity: 0.88;
  }

  .post-sticker,
  .news-row .post-sticker,
  .news-row.analysis .post-sticker {
    left: auto;
    right: 24px;
    top: clamp(152px, 48vw, 286px);
    z-index: 4;
  }

  .listing-author-overlay,
  .news-row .listing-author-overlay,
  .news-row.analysis .listing-author-overlay {
    display: none;
  }

  .post-copy > small {
    display: none;
  }

  .news-row.analysis .post-copy > small {
    display: none;
  }

  .post-mobile-meta {
    align-items: center;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-top: 14px;
    padding-top: 12px;
  }

  .post-mobile-meta > span {
    align-items: center;
    color: #ffffff;
    display: inline-flex;
    font-size: 10px;
    font-weight: 950;
    gap: 7px;
    line-height: 1;
    max-width: min(68%, 240px);
    min-width: 0;
    text-transform: uppercase;
  }

  .post-mobile-meta img,
  .post-mobile-meta b {
    align-items: center;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    border: 2px solid rgba(255, 255, 255, 0.72);
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 950;
    height: 26px;
    justify-content: center;
    object-fit: cover;
    overflow: hidden;
    width: 26px;
  }

  .post-mobile-meta strong {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .post-mobile-meta small {
    color: #94a3b8;
    display: block;
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 900;
    text-align: right;
    white-space: nowrap;
  }
}

@media (max-width: 820px) {
  .news-row:not(.analysis) .listing-author-overlay {
    display: none !important;
  }

  .news-row:not(.analysis) .post-mobile-meta {
    display: flex;
  }
}

/* Compact post meta pills style */
.news-row .listing-author-overlay,
.news-row.analysis .listing-author-overlay {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: 26px;
  padding: 0;
  gap: 6px;
  max-width: min(260px, 100%);
}

.news-row .listing-author-overlay > span,
.news-row.analysis .listing-author-overlay > span {
  height: 28px;
  width: 28px;
}

.news-row .listing-author-overlay strong,
.news-row.analysis .listing-author-overlay strong {
  font-size: 12px;
  line-height: 1;
}

.news-row .listing-author-overlay small,
.news-row.analysis .listing-author-overlay small {
  font-size: 9px;
  line-height: 1.1;
  margin-top: 1px;
}

.read-mark {
  background: transparent;
  border: 0;
  box-shadow: none;
  min-height: 32px;
  padding: 0;
  font-size: 10px;
  gap: 6px;
  border-radius: 0;
}

.read-mark.unseen {
  background: transparent;
  border: 0;
  color: #cbd5e1;
}
</style>
