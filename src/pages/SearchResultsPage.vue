<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { resolveAssetUrl } from '@/constants/assets'
import { postCategoryLabels } from '@/services/postCategories'

const route = useRoute()
const router = useRouter()
const posts = ref([])
const loading = ref(true)
const inputQuery = ref('')

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const queryText = computed(() => String(route.query.q || '').trim())

const searchableText = (post) => [
  post.title,
  post.subtitle,
  post.content,
  post.game?.nameEs,
  post.game?.nameEn,
  ...(postCategoryLabels(post) || []),
  ...(post.tags || [])
].filter(Boolean).join(' ')

const relevanceScore = (post, query) => {
  const normalizedQuery = normalize(query)
  const tokens = normalizedQuery.split(' ').filter(token => token.length > 1)
  const title = normalize(post.title)
  const gameName = normalize(`${post.game?.nameEs || ''} ${post.game?.nameEn || ''}`)
  const fullText = normalize(searchableText(post))
  if (!tokens.length || !tokens.every(token => fullText.includes(token))) return -1

  let score = 0
  if (title === normalizedQuery) score += 100
  if (title.includes(normalizedQuery)) score += 60
  if (gameName.includes(normalizedQuery)) score += 50
  score += tokens.filter(token => title.includes(token)).length * 12
  score += tokens.filter(token => gameName.includes(token)).length * 10
  return score
}

const timestampValue = (value) => {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const results = computed(() => posts.value
  .map(post => ({ post, score: relevanceScore(post, queryText.value) }))
  .filter(item => item.score >= 0)
  .sort((a, b) => b.score - a.score || timestampValue(b.post.updatedAt || b.post.createdAt) - timestampValue(a.post.updatedAt || a.post.createdAt))
  .map(item => item.post))

const formatDate = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value || 0)
  if (Number.isNaN(date.getTime())) return 'Reciente'
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const submit = () => {
  const value = inputQuery.value.trim()
  if (!value) return
  router.replace({ name: 'search-results', query: { q: value } })
}

const loadPosts = async () => {
  loading.value = true
  try {
    const snap = await getDocs(collection(db, 'posts'))
    posts.value = snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(post => post.status === 'approved' && post.visibility !== 'private' && post.visibility !== 'unlisted' && post.placement !== 'hero' && !post.isMainEntry)
  } finally {
    loading.value = false
  }
}

watch(queryText, (value) => {
  inputQuery.value = value
}, { immediate: true })

loadPosts()
</script>

<template>
  <main class="search-page">
    <header class="search-page-head">
      <span><i class="fas fa-search"></i> Busqueda</span>
      <h1>Resultados para “{{ queryText }}”</h1>
      <p v-if="!loading">{{ results.length }} {{ results.length === 1 ? 'publicacion encontrada' : 'publicaciones encontradas' }}</p>

      <form @submit.prevent="submit">
        <i class="fas fa-search"></i>
        <input v-model="inputQuery" aria-label="Buscar publicaciones" placeholder="Buscar noticias y juegos..." />
        <button type="submit">Buscar</button>
      </form>
    </header>

    <section v-if="loading" class="search-page-state">
      <i class="fas fa-circle-notch fa-spin"></i>
      Buscando publicaciones...
    </section>

    <section v-else-if="results.length" class="search-result-grid">
      <RouterLink v-for="post in results" :key="post.id" :to="`/post/${post.slug || post.id}`" class="search-result-card">
        <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
        <div v-else class="search-image-fallback"><i class="far fa-image"></i></div>
        <div class="search-card-copy">
          <div>
            <span>{{ postCategoryLabels(post)[0] || 'Noticias' }}</span>
            <small>{{ formatDate(post.updatedAt || post.createdAt) }}</small>
          </div>
          <h2>{{ post.title }}</h2>
          <p>{{ post.subtitle || post.content }}</p>
          <strong>Leer publicacion <i class="fas fa-arrow-right"></i></strong>
        </div>
      </RouterLink>
    </section>

    <section v-else class="search-page-state empty">
      <i class="far fa-folder-open"></i>
      <h2>No encontramos publicaciones</h2>
      <p>Prueba con menos palabras o con el nombre del juego.</p>
    </section>
  </main>
</template>

<style scoped>
.search-page {
  color: #f8fafc;
  margin: 0 auto;
  max-width: 1240px;
  min-height: 80vh;
  padding: 54px 24px 120px;
}

.search-page-head {
  display: grid;
  gap: 12px;
  margin-bottom: 34px;
}

.search-page-head > span {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.search-page-head h1 {
  font-size: clamp(30px, 5vw, 54px);
  font-weight: 950;
  line-height: 1.05;
  margin: 0;
  overflow-wrap: anywhere;
}

.search-page-head > p {
  color: #aeb8cc;
  font-size: 14px;
  font-weight: 800;
  margin: 0;
}

.search-page-head form {
  align-items: center;
  background: rgba(9, 12, 31, 0.9);
  border: 1px solid rgba(192, 132, 252, 0.35);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-top: 8px;
  max-width: 760px;
  min-height: 52px;
  padding: 6px 7px 6px 16px;
}

.search-page-head form > i { color: #c084fc; }
.search-page-head input { background: transparent; color: #fff; font-size: 15px; font-weight: 800; outline: none; width: 100%; }
.search-page-head button { background: #8b5cf6; border-radius: 7px; color: #fff; font-size: 12px; font-weight: 950; min-height: 40px; padding: 0 18px; }

.search-result-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.search-result-card {
  background: rgba(8, 11, 29, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  cursor: pointer;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  min-height: 190px;
  overflow: hidden;
  text-decoration: none;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.search-result-card:hover, .search-result-card:focus-visible { border-color: #a855f7; transform: translateY(-2px); }
.search-result-card:focus-visible { outline: 2px solid #c084fc; outline-offset: 2px; }
.search-result-card > img, .search-image-fallback { height: 100%; min-height: 190px; object-fit: cover; width: 100%; }
.search-image-fallback { align-items: center; background: #17152d; color: #7c3aed; display: flex; font-size: 28px; justify-content: center; }
.search-card-copy { display: grid; gap: 10px; padding: 18px; }
.search-card-copy > div { align-items: center; display: flex; justify-content: space-between; gap: 8px; }
.search-card-copy span { color: #c084fc; font-size: 10px; font-weight: 950; text-transform: uppercase; }
.search-card-copy small { color: #94a3b8; font-size: 10px; font-weight: 800; }
.search-card-copy h2 { font-size: 20px; font-weight: 950; line-height: 1.14; margin: 0; }
.search-card-copy p { color: #b9c2d3; display: -webkit-box; font-size: 12px; font-weight: 700; line-height: 1.55; margin: 0; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.search-card-copy > strong { align-self: end; color: #c084fc; font-size: 11px; font-weight: 950; }

.search-page-state { align-items: center; color: #aeb8cc; display: flex; gap: 10px; justify-content: center; min-height: 260px; text-align: center; }
.search-page-state.empty { display: grid; justify-items: center; }
.search-page-state.empty > i { color: #8b5cf6; font-size: 32px; }
.search-page-state h2, .search-page-state p { margin: 0; }

@media (max-width: 860px) {
  .search-page { padding: 28px 16px 120px; }
  .search-result-grid { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .search-page-head h1 { font-size: 31px; }
  .search-page-head form { grid-template-columns: auto minmax(0, 1fr) 42px; }
  .search-page-head button { font-size: 0; padding: 0; }
  .search-page-head button::after { content: "→"; font-size: 18px; }
  .search-result-card { grid-template-columns: 112px minmax(0, 1fr); min-height: 164px; }
  .search-result-card > img, .search-image-fallback { min-height: 164px; }
  .search-card-copy { padding: 13px; }
  .search-card-copy h2 { font-size: 16px; }
}
</style>
