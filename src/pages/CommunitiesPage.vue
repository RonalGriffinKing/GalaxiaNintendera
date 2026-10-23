<script setup>
import { vSoftReveal } from '@/directives/softReveal'
import GalaxyAtmosphere from '@/components/shared/GalaxyAtmosphere.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { createOfficialCommunity } from '@/constants/community'
import { peekPublicPage, requestPublicPage, storePublicPage } from '@/services/publicPageCache'
import { defaultBannerUrl, defaultLogoUrl, resolveAssetUrl } from '@/constants/assets'
defineProps({ embedded: Boolean })

const communities = ref(peekPublicPage('communities-directory-display') || [])
const search = ref('')
const page = ref(1)
watch(search, () => { page.value = 1 })
const loading = ref(peekPublicPage('communities-directory-display') === undefined)
const error = ref('')
const fallbackImage = (event, source) => {
  const image = event.currentTarget
  if (image.dataset.fallback) return
  image.dataset.fallback = 'true'
  image.src = source
}
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const filtered = computed(() => communities.value.filter(item => normalize(`${item.name} ${item.description}`).includes(normalize(search.value.trim()))))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 10)))
const visibleCommunities = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))
watch(pageCount, count => { page.value = Math.min(page.value, count) })
const load = async () => {
  loading.value = !communities.value.length
  error.value = ''
  try {
    const items = await requestPublicPage('communities-directory', async () => {
      const snap = await getDocs(collection(db, 'communities'))
      return snap.docs.map(item => ({ ...item.data(), id: item.id }))
    })
    const sortedItems = [...items]
    const official = createOfficialCommunity()
    if (!sortedItems.some(item => item.id === official.id)) sortedItems.unshift(official)
    communities.value = sortedItems.sort((a,b) => Number(Boolean(b.isOfficial)) - Number(Boolean(a.isOfficial)) || Number(b.membersCount || 0) - Number(a.membersCount || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'es'))
    storePublicPage('communities-directory-display', communities.value)
  } catch {
    error.value = 'No pudimos cargar las comunidades.'
  } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <component :is="embedded ? 'section' : 'main'" class="communities-page" :class="{ embedded }">
    <GalaxyAtmosphere v-if="!embedded" />
    <header><component :is="embedded ? 'h2' : 'h1'"><i class="fas fa-users" aria-hidden="true"></i> {{ embedded ? 'Explora las comunidades' : 'Comunidades' }}</component><p v-if="!embedded">Encuentra tu comunidad y descubre qué comparten sus miembros.</p></header>
    <label class="community-search"><i class="fas fa-search" aria-hidden="true"></i><input v-model="search" type="search" aria-label="Buscar comunidades" placeholder="Buscar comunidad o saga…" /></label>
    <p v-if="loading" role="status">Cargando comunidades…</p>
    <div v-if="error" role="alert"><p>{{ error }}</p><button type="button" @click="load">Reintentar</button></div>
    <template v-if="!loading && communities.length">
      <p class="result-count" role="status">{{ filtered.length }} comunidades</p>
      <div v-soft-reveal="'.community-card'" class="community-grid">
        <RouterLink v-for="item in visibleCommunities" :key="page + ':' + item.id" class="community-card" :to="{ path: '/comunidad', query: { id: item.id } }">
          <img class="community-banner" @load="$event.currentTarget.classList.add('ready')" :src="resolveAssetUrl(item.bannerUrl, defaultBannerUrl)" alt="" loading="lazy" @error="fallbackImage($event, defaultBannerUrl)" />
          <div class="community-card-body"><img class="community-icon" :src="resolveAssetUrl(item.iconUrl, defaultLogoUrl)" alt="" loading="lazy" /><div><h2>{{ item.name || 'Comunidad' }}</h2><span v-if="item.isOfficial" class="official">Oficial</span></div><p>{{ item.description || 'Descubre sus publicaciones y conversa con la comunidad.' }}</p><footer><span><i class="fas fa-users" aria-hidden="true"></i> {{ Number(item.membersCount || 0) }} miembros</span><strong>Explorar <i class="fas fa-arrow-right" aria-hidden="true"></i></strong></footer></div>
        </RouterLink>
      </div>
      <nav v-if="pageCount > 1" class="community-pagination" aria-label="Páginas de comunidades"><button type="button" :disabled="page === 1" @click="page--">← Anterior</button><span aria-live="polite">{{ page }} / {{ pageCount }}</span><button type="button" :disabled="page === pageCount" @click="page++">Siguiente →</button></nav>
      <p v-if="!filtered.length" class="empty">No hay comunidades que coincidan con «{{ search }}».</p>
    </template>
  </component>
</template>

<style scoped>
.communities-page { width: 100%; box-sizing: border-box; max-width: 1280px; margin: auto; padding: var(--public-page-top,88px) 20px 100px; color: var(--text-primary); }
h1 { display: flex; align-items: center; gap: 12px; font-size: clamp(26px,4vw,36px); } h1 i { color: #a855f7; }
header p,.result-count,.empty { color: var(--text-secondary); margin: 10px 0 16px; }
.community-search { display: flex; align-items: center; gap: 12px; padding: 0 16px; border: 1px solid var(--border); background: var(--surface-elevated); border-radius: 14px; max-width: 600px; min-height: 48px; }
.community-search input { width: 100%; min-width: 0; padding: 12px 0; font: inherit; font-size: 16px; background: transparent; color: var(--text-primary); border: 0; }
.community-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; }
.community-card { display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; border: 1px solid var(--border); background: var(--surface); color: inherit; text-decoration: none; }
.community-banner { width: 100%; height: 150px; object-fit: cover; }
.community-card-body { display: grid; grid-template-columns: 48px minmax(0,1fr); gap: 10px 12px; padding: 16px; flex: 1; }
.community-icon { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
h2 { font-size: 18px; line-height: 1.35; overflow-wrap: anywhere; }.official { color: #c084fc; font-size: 12px; }
.community-card-body p { grid-column: 1/-1; color: var(--text-secondary); font-size: 14px; line-height: 1.5; }
footer { grid-column: 1/-1; display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 12px; margin-top: auto; font-size: 12px; padding-top: 12px; } footer strong { color: #c084fc; }
.community-card:focus-visible { outline: 2px solid #c084fc; outline-offset: 4px; }
.communities-page.embedded { padding: 24px 0; position: relative; z-index: 1; }.embedded header h2 { font-size: 24px; margin-bottom: 14px; }
button { min-height: 44px; padding: 10px 16px; background: var(--accent); color: white; border-radius: 10px; }
@media(max-width:1000px) { .community-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) { .communities-page { padding: var(--public-page-top-mobile,76px) 12px 100px; }.communities-page.embedded { padding: 24px 0; }.community-grid { grid-template-columns: minmax(0,1fr); }.community-banner { height: 140px; } }
.community-search:focus-within{border-color:#a78bfa88;box-shadow:0 0 0 3px #a78bfa12}.community-search input:focus,.community-search input:focus-visible{outline:none!important;box-shadow:none!important}.community-card{transition:border-color .2s,transform .2s}.community-card:hover{transform:translateY(-2px);border-color:#a78bfa77}.community-banner{opacity:0;transition:opacity .35s ease}.community-banner.ready{opacity:1}.community-pagination{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:24px;font-size:13px}.community-pagination button{font:inherit;font-size:12px;min-height:40px;padding:8px 12px;border:1px solid var(--border);background:var(--surface);color:inherit}.community-pagination button:disabled{opacity:.4;cursor:default}@media(prefers-reduced-motion:reduce){.community-card{animation:none;transition:none}.community-banner{transition:none}}
.communities-page:not(.embedded){position:relative;isolation:isolate}
</style>
