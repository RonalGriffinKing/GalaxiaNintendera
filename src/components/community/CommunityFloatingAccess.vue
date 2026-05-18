<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'

const props = defineProps({
  officialCommunity: {
    type: Object,
    default: null
  },
  favoriteCommunities: {
    type: Array,
    default: () => []
  },
  joinedCommunities: {
    type: Array,
    default: () => []
  },
  suggestedCommunities: {
    type: Array,
    default: () => []
  },
  allCommunities: {
    type: Array,
    default: () => []
  },
  activeCommunityId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['open-community', 'toggle-favorite', 'open-explore'])

const open = ref(false)
const rootRef = ref(null)
let previousBodyOverflow = ''
let previousBodyOverscroll = ''
let previousHtmlOverflow = ''

const officialFallback = {
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera',
  iconUrl: '/src/iconos/logo.png',
  isOfficial: true
}

const officialItem = computed(() => ({
  ...officialFallback,
  ...(props.officialCommunity || {})
}))

const communityItems = computed(() => {
  const seen = new Set([OFFICIAL_COMMUNITY_ID])
  const ordered = [
    ...props.favoriteCommunities,
    ...props.joinedCommunities,
    ...props.suggestedCommunities,
    ...props.allCommunities
  ]

  return [
    officialItem.value,
    ...ordered.filter((community) => {
      if (!community?.id || community.id === OFFICIAL_COMMUNITY_ID) return false
      if (seen.has(community.id)) return false
      seen.add(community.id)
      return true
    })
  ]
})

const activeCommunity = computed(() => {
  return communityItems.value.find(community => community.id === props.activeCommunityId)
    || officialItem.value
})

const isOfficial = (community) => community?.id === OFFICIAL_COMMUNITY_ID || community?.isOfficial
const isFavorite = (community) => isOfficial(community) || props.favoriteCommunities.some(item => item.id === community?.id)

const initials = (name = '') => String(name || 'C')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0])
  .join('')
  .toUpperCase()

const togglePopup = () => {
  open.value = !open.value
}

const openCommunity = (community) => {
  open.value = false
  emit('open-community', community)
}

const openExplore = () => {
  open.value = false
  emit('open-explore')
}

const toggleFavorite = (community) => {
  if (isOfficial(community)) return
  emit('toggle-favorite', community)
}

const closeFromOutside = (event) => {
  if (!open.value || rootRef.value?.contains(event.target)) return
  open.value = false
}

const closeOnEscape = (event) => {
  if (event.key === 'Escape') open.value = false
}

const handleExternalPanelOpen = (event) => {
  if (event.detail?.source !== 'community') {
    open.value = false
  }
}

const lockPageScroll = () => {
  previousBodyOverflow = document.body.style.overflow
  previousBodyOverscroll = document.body.style.overscrollBehavior
  previousHtmlOverflow = document.documentElement.style.overflow
  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  document.documentElement.style.overflow = 'hidden'
}

const unlockPageScroll = () => {
  document.body.style.overflow = previousBodyOverflow
  document.body.style.overscrollBehavior = previousBodyOverscroll
  document.documentElement.style.overflow = previousHtmlOverflow
}

watch(open, (isOpen) => {
  if (!isOpen) {
    unlockPageScroll()
    return
  }
  window.dispatchEvent(new CustomEvent('floating-panel-opened', {
    detail: { source: 'community' }
  }))
  lockPageScroll()
})

onMounted(() => {
  document.addEventListener('pointerdown', closeFromOutside, true)
  document.addEventListener('keydown', closeOnEscape)
  window.addEventListener('floating-panel-opened', handleExternalPanelOpen)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', closeFromOutside, true)
  document.removeEventListener('keydown', closeOnEscape)
  window.removeEventListener('floating-panel-opened', handleExternalPanelOpen)
  if (open.value) unlockPageScroll()
})
</script>

<template>
  <div ref="rootRef" class="community-floating-access" :class="{ open }">
    <button
      class="community-floating-button"
      :class="{ open }"
      type="button"
      :aria-expanded="open"
      aria-label="Abrir comunidades"
      @click="togglePopup"
    >
      <span class="community-current-icon">
        <img v-if="activeCommunity.iconUrl" :src="activeCommunity.iconUrl" alt="" />
        <b v-else>{{ initials(activeCommunity.name) }}</b>
      </span>
    </button>

    <Transition name="community-pop">
      <section v-if="open" class="community-popup" aria-label="Comunidades">
        <header class="community-popup-head">
          <div>
            <span>Comunidades</span>
            <h2>{{ activeCommunity.name || 'Galaxia Nintendera' }}</h2>
          </div>
          <button type="button" aria-label="Cerrar comunidades" @click="open = false">
            <i class="fas fa-xmark"></i>
          </button>
        </header>

        <div class="community-popup-list">
          <article
            v-for="community in communityItems"
            :key="community.id"
            class="community-popup-card"
            :class="{ active: community.id === activeCommunity.id, official: isOfficial(community) }"
          >
            <button class="community-card-main" type="button" @click="openCommunity(community)">
              <span class="community-card-icon">
                <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
                <b v-else>{{ initials(community.name) }}</b>
              </span>
              <strong>{{ community.name || 'Comunidad' }}</strong>
            </button>

            <button
              class="community-card-favorite"
              :class="{ active: isFavorite(community), locked: isOfficial(community) }"
              type="button"
              :aria-label="isOfficial(community) ? 'Galaxia fijada' : 'Cambiar favorito'"
              @click="toggleFavorite(community)"
            >
              <i :class="isFavorite(community) ? 'fas fa-star' : 'far fa-star'"></i>
            </button>
          </article>
        </div>

        <button class="community-explore-button" type="button" @click="openExplore">
          <i class="fas fa-compass"></i>
          <span>Explorar comunidades</span>
        </button>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.community-floating-access {
  bottom: var(--galaxy-dock-bottom, 22px);
  position: fixed;
  right: var(--galaxy-dock-community-right, 84px);
  z-index: 264;
}

.community-floating-access.open {
  z-index: 2200;
}

.community-floating-button {
  align-items: center;
  background:
    linear-gradient(145deg, rgba(9, 13, 31, 0.98), rgba(22, 15, 42, 0.96)) padding-box,
    linear-gradient(135deg, rgba(236, 72, 153, 0.82), rgba(168, 85, 247, 0.82), rgba(34, 211, 238, 0.72)) border-box;
  border: 1px solid transparent;
  border-radius: 999px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), 0 0 24px rgba(168, 85, 247, 0.26);
  display: grid;
  height: 54px;
  place-items: center;
  transition: box-shadow 0.22s ease, transform 0.22s ease;
  width: 54px;
}

.community-floating-button:hover,
.community-floating-button.open {
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.42), 0 0 30px rgba(236, 72, 153, 0.34);
  transform: translateY(-2px) scale(1.05);
}

.community-current-icon,
.community-card-icon {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  display: grid;
  overflow: hidden;
  place-items: center;
}

.community-current-icon {
  border: 2px solid rgba(244, 214, 255, 0.58);
  height: 46px;
  width: 46px;
}

.community-current-icon img,
.community-card-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-current-icon b,
.community-card-icon b {
  color: #ffffff;
  font-size: 11px;
  font-weight: 950;
}

.community-popup {
  background:
    radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.3), transparent 34%),
    linear-gradient(145deg, rgba(8, 12, 32, 0.98), rgba(18, 7, 38, 0.98));
  backdrop-filter: blur(18px);
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 24px;
  bottom: 72px;
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.12), 0 28px 90px rgba(0, 0, 0, 0.48);
  color: #ffffff;
  padding: 16px;
  position: absolute;
  right: 0;
  width: min(360px, calc(100vw - 28px));
}

.community-popup::before {
  background: linear-gradient(90deg, #ec4899, #a855f7, #22d3ee, #ec4899);
  border-radius: 999px;
  content: "";
  height: 3px;
  inset: 0 18px auto;
  position: absolute;
}

.community-popup-head {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-top: 4px;
}

.community-popup-head span {
  color: #c084fc;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.community-popup-head h2 {
  color: #ffffff;
  font-size: 18px;
  font-weight: 950;
  line-height: 1.1;
  margin-top: 3px;
}

.community-popup-head button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #ffffff;
  height: 36px;
  width: 36px;
}

.community-popup-list {
  display: grid;
  gap: 10px;
  max-height: min(430px, calc(100dvh - 230px));
  overflow-y: auto;
  padding: 2px 2px 4px;
}

.community-popup-card {
  align-items: center;
  background: rgba(255, 255, 255, 0.065);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 36px;
  min-height: 70px;
  padding: 10px;
  transition: background 0.26s ease, border-color 0.26s ease, box-shadow 0.26s ease, opacity 0.26s ease, transform 0.26s ease;
}

.community-popup-card.active {
  background: rgba(9, 7, 26, 0.92);
  border-color: rgba(147, 197, 253, 0.68);
  box-shadow: 0 0 0 1px rgba(216, 180, 254, 0.18), 0 16px 42px rgba(124, 58, 237, 0.3);
}

.community-popup-list:has(.community-popup-card.active) .community-popup-card:not(.active) {
  opacity: 0.78;
}

.community-popup-card:hover,
.community-popup-card:focus-within {
  border-color: rgba(216, 180, 254, 0.56);
  box-shadow: 0 16px 42px rgba(124, 58, 237, 0.22);
  opacity: 1 !important;
  transform: translateY(-2px);
}

.community-card-main {
  align-items: center;
  color: #ffffff;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px minmax(0, 1fr);
  min-width: 0;
  text-align: left;
}

.community-card-icon {
  border: 2px solid rgba(244, 214, 255, 0.4);
  height: 48px;
  width: 48px;
}

.community-card-main strong {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.15;
}

.community-card-favorite {
  align-items: center;
  background: rgba(5, 8, 22, 0.72);
  border-radius: 999px;
  color: #aeb8d3;
  display: flex;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.community-card-favorite.active {
  color: #facc15;
}

.community-card-favorite.locked {
  cursor: default;
}

.community-explore-button {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(236, 72, 153, 0.82));
  border: 1px solid rgba(244, 214, 255, 0.24);
  border-radius: 16px;
  color: #ffffff;
  display: flex;
  font-size: 13px;
  font-weight: 950;
  gap: 10px;
  justify-content: center;
  margin-top: 12px;
  min-height: 46px;
  width: 100%;
}

.community-pop-enter-active,
.community-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.community-pop-enter-from,
.community-pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 859px) {
  .community-floating-access {
    right: var(--galaxy-dock-community-right, 78px);
  }

  .community-popup {
    border: 0;
    border-radius: 0;
    bottom: 0;
    left: 0;
    height: 100dvh;
    max-height: none;
    overflow: hidden;
    padding: calc(16px + env(safe-area-inset-top)) 14px calc(16px + env(safe-area-inset-bottom));
    position: fixed;
    right: auto;
    width: 100vw;
    z-index: 2201;
  }

  .community-popup-list {
    max-height: calc(100dvh - 142px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }
}

@media (max-width: 420px) {
  .community-floating-button {
    height: 52px;
    width: 52px;
  }

  .community-current-icon {
    height: 44px;
    width: 44px;
  }
}
</style>
