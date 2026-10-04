<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { createOfficialCommunity } from '@/constants/community'
import { defaultBannerUrl, defaultLogoUrl, resolveAssetUrl } from '@/constants/assets'
defineProps({ embedded: Boolean })

const communities = ref([])
const search = ref('')
const loading = ref(true)
const error = ref('')
const fallbackImage = (event, source) => {
  const image = event.currentTarget
  if (image.dataset.fallback) return
  image.dataset.fallback = 'true'
  image.src = source
}
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const filtered = computed(() => communities.value.filter(item => normalize(`${item.name} ${item.description}`).includes(normalize(search.value.trim()))))
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const snap = await getDocs(collection(db, 'communities'))
    const items = snap.docs.map(item => ({ ...item.data(), id: item.id }))
    const official = createOfficialCommunity()
    if (!items.some(item => item.id === official.id)) items.unshift(official)
    communities.value = items.sort((a,b) => Number(Boolean(b.isOfficial)) - Number(Boolean(a.isOfficial)) || Number(b.membersCount || 0) - Number(a.membersCount || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'es'))
  } catch {
    error.value = 'No pudimos cargar las comunidades.'
  } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <component :is="embedded ? 'section' : 'main'" class="communities-page" :class="{ embedded }">
    <header><component :is="embedded ? 'h2' : 'h1'"><i class="fas fa-users" aria-hidden="true"></i> {{ embedded ? 'Explora las comunidades' : 'Comunidades' }}</component><p v-if="!embedded">Encuentra tu comunidad y descubre qué comparten sus miembros.</p></header>
    <label class="community-search"><i class="fas fa-search" aria-hidden="true"></i><input v-model="search" type="search" aria-label="Buscar comunidades" placeholder="Buscar comunidad o saga…" /></label>
    <p v-if="loading" role="status">Cargando comunidades…</p>
    <div v-else-if="error" role="alert"><p>{{ error }}</p><button type="button" @click="load">Reintentar</button></div>
    <template v-else>
      <p class="result-count" role="status">{{ filtered.length }} comunidades</p>
      <div class="community-grid">
        <RouterLink v-for="item in filtered" :key="item.id" class="community-card" :to="{ path: '/comunidad', query: { id: item.id } }">
          <img class="community-banner" :src="resolveAssetUrl(item.bannerUrl, defaultBannerUrl)" alt="" loading="lazy" @error="fallbackImage($event, defaultBannerUrl)" />
          <div class="community-card-body"><img class="community-icon" :src="resolveAssetUrl(item.iconUrl, defaultLogoUrl)" alt="" loading="lazy" /><div><h2>{{ item.name || 'Comunidad' }}</h2><span v-if="item.isOfficial" class="official">Oficial</span></div><p>{{ item.description || 'Descubre sus publicaciones y conversa con la comunidad.' }}</p><footer><span><i class="fas fa-users" aria-hidden="true"></i> {{ Number(item.membersCount || 0) }} miembros</span><strong>Explorar <i class="fas fa-arrow-right" aria-hidden="true"></i></strong></footer></div>
        </RouterLink>
      </div>
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
</style>
