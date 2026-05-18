<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import DirectChatBubble from '@/components/widgets/chat/DirectChatBubble.vue'
import MusicBubble from '@/components/widgets/chat/MusicBubble.vue'
import CommunityFloatingAccess from '@/components/community/CommunityFloatingAccess.vue'
import GlobalLiveBubble from '@/components/widgets/GlobalLiveBubble.vue'
import PublicNavbar from '@/components/nav/PublicNavbar.vue'

const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'
const COMMUNITY_FAVORITES_KEY = 'galaxia-community-favorites'

const route = useRoute()
const router = useRouter()
const communities = ref([])
const favoriteCommunityIds = ref([])
const isWorkspace = computed(() => Boolean(route.meta.workspace))
const isCreationRoute = computed(() => Boolean(route.query.create || route.query.mode === 'register'))
const showCommunityAccess = computed(() => {
  if (isWorkspace.value || isCreationRoute.value) return false
  if (route.path.startsWith('/admin') || route.path.startsWith('/login')) return false
  return true
})
const layoutStyle = computed(() => ({
  '--public-nav-offset': '72px',
  '--public-page-top': '88px',
  '--public-page-top-mobile': '76px',
  '--public-page-bottom-mobile': 'calc(92px + env(safe-area-inset-bottom))',
  '--public-page-gutter': '18px'
}))

const officialCommunity = computed(() => communities.value.find(community => community.id === OFFICIAL_COMMUNITY_ID || community.isOfficial) || null)
const favoriteCommunities = computed(() => {
  const ids = new Set(favoriteCommunityIds.value)
  return communities.value.filter(community => community.id !== OFFICIAL_COMMUNITY_ID && ids.has(community.id))
})
const suggestedCommunities = computed(() => communities.value
  .filter(community => community.id !== OFFICIAL_COMMUNITY_ID && !favoriteCommunityIds.value.includes(community.id))
)
const activeCommunityId = computed(() => String(route.query.id || OFFICIAL_COMMUNITY_ID))

const loadFavoriteCommunities = () => {
  if (typeof window === 'undefined') return
  try {
    const saved = JSON.parse(localStorage.getItem(COMMUNITY_FAVORITES_KEY) || '[]')
    favoriteCommunityIds.value = Array.isArray(saved)
      ? saved.filter(id => id && id !== OFFICIAL_COMMUNITY_ID).slice(0, 5)
      : []
  } catch (error) {
    favoriteCommunityIds.value = []
  }
}

const saveFavoriteCommunities = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMMUNITY_FAVORITES_KEY, JSON.stringify(favoriteCommunityIds.value.slice(0, 5)))
}

const toggleFavoriteCommunity = (community) => {
  if (!community?.id || community.id === OFFICIAL_COMMUNITY_ID) return
  const current = favoriteCommunityIds.value.filter(id => id !== OFFICIAL_COMMUNITY_ID)

  if (current.includes(community.id)) {
    favoriteCommunityIds.value = current.filter(id => id !== community.id)
  } else if (current.length < 5) {
    favoriteCommunityIds.value = [...current, community.id]
  } else {
    favoriteCommunityIds.value = [...current.slice(1), community.id]
  }

  saveFavoriteCommunities()
}

const loadCommunities = async () => {
  const snap = await getDocs(collection(db, 'communities')).catch(() => ({ docs: [] }))
  const savedCommunities = snap.docs.map(item => ({ id: item.id, membersCount: 0, ...item.data() }))
  const savedOfficial = savedCommunities.find(item => item.id === OFFICIAL_COMMUNITY_ID)
  communities.value = [
    {
      id: OFFICIAL_COMMUNITY_ID,
      name: 'Galaxia Nintendera Oficial',
      iconUrl: '/src/iconos/logo.png',
      isOfficial: true,
      membersCount: 0,
      ...savedOfficial
    },
    ...savedCommunities.filter(item => item.id !== OFFICIAL_COMMUNITY_ID)
  ]
}

const openCommunity = (community) => {
  if (!community?.id) return
  router.push(`/comunidad?id=${encodeURIComponent(community.id)}`)
}

const openExplore = () => {
  const query = route.path === '/comunidad' && route.query.id
    ? { id: route.query.id, explore: '1' }
    : { explore: '1' }
  router.push({ path: '/comunidad', query })
}

const ensureOfficialCommunityRoute = () => {
  if (route.path !== '/comunidad' || route.query.id) return
  router.replace({
    path: '/comunidad',
    query: {
      ...route.query,
      id: OFFICIAL_COMMUNITY_ID
    }
  })
}

onMounted(() => {
  loadFavoriteCommunities()
  loadCommunities()
  ensureOfficialCommunityRoute()
})

watch(() => [route.path, route.query.id], ensureOfficialCommunityRoute)
</script>

<template>
  <div
    class="public-layout-shell"
    :class="{ 'workspace-layout': isWorkspace }"
    :style="layoutStyle"
  >
    <PublicNavbar />
    <router-view v-slot="{ Component }">
      <KeepAlive include="CommunityPage">
        <component :is="Component" />
      </KeepAlive>
    </router-view>
    <GlobalLiveBubble />
    <MusicBubble />
    <CommunityFloatingAccess
      v-if="showCommunityAccess"
      :official-community="officialCommunity"
      :favorite-communities="favoriteCommunities"
      :suggested-communities="suggestedCommunities"
      :all-communities="communities"
      :active-community-id="activeCommunityId"
      @open-community="openCommunity"
      @toggle-favorite="toggleFavoriteCommunity"
      @open-explore="openExplore"
    />
    <DirectChatBubble />
  </div>
</template>

<style scoped>
:global(body) {
  --galaxy-dock-bottom: 22px;
  --galaxy-dock-chat-right: 22px;
  --galaxy-dock-music-right: 84px;
  --galaxy-dock-community-right: 146px;
  --galaxy-dock-panel-bottom: 88px;
}

:global(body.direct-chat-available) {
  --galaxy-dock-music-right: 84px;
  --galaxy-dock-community-right: 146px;
}

@media (max-width: 859px) {
  :global(body) {
    --galaxy-dock-bottom: calc(76px + env(safe-area-inset-bottom));
    --galaxy-dock-chat-right: 16px;
    --galaxy-dock-music-right: 78px;
    --galaxy-dock-community-right: 140px;
    --galaxy-dock-panel-bottom: calc(146px + env(safe-area-inset-bottom));
  }

  :global(body.direct-chat-available) {
    --galaxy-dock-music-right: 78px;
    --galaxy-dock-community-right: 140px;
  }
}

.public-layout-shell {
  background: #050816;
  min-height: 100vh;
  min-height: 100dvh;
}

.public-layout-shell.workspace-layout {
  background: #f8fafc;
}

@media (max-width: 680px) {
  .public-layout-shell {
    --public-nav-offset: 64px;
  }
}
</style>
