<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import DirectChatBubble from '@/components/widgets/chat/DirectChatBubble.vue'
import GalaxiaHub from '@/components/shared/GalaxiaHub.vue'
import PublicNavbar from '@/components/nav/PublicNavbar.vue'
import { defaultLogoUrl } from '@/constants/assets'

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
      iconUrl: defaultLogoUrl,
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
    <router-view v-slot="{ Component, route: viewRoute }">
      <Transition name="page-soft" mode="out-in">
        <KeepAlive include="CommunityPage">
          <component :is="Component" :key="viewRoute.name || viewRoute.path" />
        </KeepAlive>
      </Transition>
    </router-view>
    <GalaxiaHub
      :official-community="officialCommunity"
      :favorite-communities="favoriteCommunities"
      :suggested-communities="suggestedCommunities"
      :all-communities="communities"
      :active-community-id="activeCommunityId"
      :show-community-access="showCommunityAccess"
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

:global(.direct-chat-fab) {
  display: none !important;
}

@media (max-width: 859px) {
  :global(body) {
    --galaxy-dock-bottom: calc(104px + env(safe-area-inset-bottom));
    --galaxy-dock-chat-right: max(18px, env(safe-area-inset-right));
    --galaxy-dock-music-right: calc(max(18px, env(safe-area-inset-right)) + 68px);
    --galaxy-dock-community-right: calc(max(18px, env(safe-area-inset-right)) + 136px);
    --galaxy-dock-panel-bottom: calc(174px + env(safe-area-inset-bottom));
  }

  :global(body.direct-chat-available) {
    --galaxy-dock-music-right: calc(max(18px, env(safe-area-inset-right)) + 68px);
    --galaxy-dock-community-right: calc(max(18px, env(safe-area-inset-right)) + 136px);
  }
}

@media (max-width: 390px) {
  :global(body) {
    --galaxy-dock-bottom: calc(108px + env(safe-area-inset-bottom));
    --galaxy-dock-chat-right: max(14px, env(safe-area-inset-right));
    --galaxy-dock-music-right: calc(max(14px, env(safe-area-inset-right)) + 62px);
    --galaxy-dock-community-right: calc(max(14px, env(safe-area-inset-right)) + 124px);
  }
}

.public-layout-shell {
  background: var(--app-bg, #050816);
  min-height: 100vh;
  min-height: 100dvh;
}

.public-layout-shell.workspace-layout {
  background: #f8fafc;
}

.page-soft-enter-active,
.page-soft-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 0.22s ease;
}

.page-soft-enter-from {
  filter: blur(4px);
  opacity: 0;
  transform: translateY(8px);
}

.page-soft-leave-to {
  filter: blur(2px);
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 680px) {
  .public-layout-shell {
    --public-nav-offset: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-soft-enter-active,
  .page-soft-leave-active {
    transition: none;
  }
}
</style>
