<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DirectChatBubble from '@/features/chat/components/DirectChatBubble.vue'
import MascotBubble from '@/features/chat/components/MascotBubble.vue'
import MusicBubble from '@/features/chat/components/MusicBubble.vue'
import CommunityQuickNav from '@/features/public/components/CommunityQuickNav.vue'
import GlobalLiveBubble from '@/features/public/components/GlobalLiveBubble.vue'
import PublicNavbar from '@/features/public/components/PublicNavbar.vue'

const route = useRoute()
const isWorkspace = computed(() => Boolean(route.meta.workspace))
const isCreationRoute = computed(() => Boolean(route.query.create || route.query.mode === 'register'))
const showCommunityQuickNav = false
const layoutStyle = computed(() => ({
  '--public-nav-offset': '72px',
  '--public-page-top': '88px',
  '--public-page-top-mobile': '76px',
  '--public-page-bottom-mobile': 'calc(92px + env(safe-area-inset-bottom))',
  '--public-page-gutter': '18px'
}))
</script>

<template>
  <div class="public-layout-shell" :class="{ 'workspace-layout': isWorkspace }" :style="layoutStyle">
    <PublicNavbar />
    <CommunityQuickNav v-if="showCommunityQuickNav && !isWorkspace && !isCreationRoute" />
    <router-view />
    <GlobalLiveBubble />
    <MusicBubble />
    <MascotBubble />
    <DirectChatBubble />
  </div>
</template>

<style scoped>
:global(body) {
  --galaxy-dock-bottom: 22px;
  --galaxy-dock-chat-right: 22px;
  --galaxy-dock-music-right: 22px;
  --galaxy-dock-mascot-right: 84px;
  --galaxy-dock-pill-right: -74px;
  --galaxy-dock-panel-bottom: 88px;
}

:global(body.direct-chat-available) {
  --galaxy-dock-music-right: 84px;
  --galaxy-dock-mascot-right: 146px;
  --galaxy-dock-pill-right: -136px;
}

@media (max-width: 859px) {
  :global(body) {
    --galaxy-dock-bottom: calc(76px + env(safe-area-inset-bottom));
    --galaxy-dock-chat-right: 16px;
    --galaxy-dock-music-right: 16px;
    --galaxy-dock-mascot-right: 78px;
    --galaxy-dock-panel-bottom: calc(146px + env(safe-area-inset-bottom));
  }

  :global(body.direct-chat-available) {
    --galaxy-dock-music-right: 78px;
    --galaxy-dock-mascot-right: 140px;
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
</style>
