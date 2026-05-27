<script setup>
import { computed } from 'vue'
import { defaultBannerUrl, defaultLogoUrl, resolveAssetUrl } from '@/constants/assets'

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

const officialFallback = {
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera',
  iconUrl: defaultLogoUrl,
  isOfficial: true
}

const officialItem = computed(() => ({
  ...officialFallback,
  ...(props.officialCommunity || {})
}))

const secondaryItems = computed(() => {
  const seen = new Set([OFFICIAL_COMMUNITY_ID])
  const ordered = [
    ...props.favoriteCommunities,
    ...props.joinedCommunities,
    ...props.suggestedCommunities,
    ...props.allCommunities
  ]

  return ordered.filter((community) => {
      if (!community?.id || community.id === OFFICIAL_COMMUNITY_ID) return false
      if (seen.has(community.id)) return false
      seen.add(community.id)
      return true
    })
})

const quickItems = computed(() => [officialItem.value, ...secondaryItems.value])

const shortName = (name = '') => {
  const clean = String(name || 'Comunidad').replace(/Galaxia|Nintendera|Oficial/gi, '').trim()
  return clean || 'Galaxia'
}

const initials = (name = '') => String(name || 'C')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0])
  .join('')
  .toUpperCase()

const isOfficial = (community) => community?.id === OFFICIAL_COMMUNITY_ID || community?.isOfficial
const isFavorite = (community) => isOfficial(community) || props.favoriteCommunities.some(item => item.id === community?.id)
const communityBanner = (community) => resolveAssetUrl(community?.bannerUrl || community?.backgroundUrl || community?.imageUrl, defaultBannerUrl)
const communityDescription = (community) => community?.description || (isOfficial(community) ? 'Comunidad oficial' : 'Un lugar para fans de la galaxia')
const activeCount = (community) => Number(community?.activeCount || community?.onlineCount || community?.activeUsers || 0)
const conversationCount = (community) => Number(community?.threadCount || community?.threadsCount || community?.conversationsCount || 0)

const toggleFavorite = (community) => {
  if (isOfficial(community)) return
  emit('toggle-favorite', community)
}
</script>

<template>
  <nav class="community-quick-nav" aria-label="Navegacion rapida de comunidades">
    <div class="quick-nav-head">
      <span>Comunidades</span>
      <button type="button" @click="emit('open-explore')">Explorar</button>
    </div>

    <div class="quick-nav-body">
      <div class="quick-nav-scroll">
        <div class="quick-nav-list">
          <article
            v-for="community in quickItems"
            :key="community.id"
            class="quick-community"
            :class="{ active: community.id === activeCommunityId, official: isOfficial(community) }"
            :style="{ '--community-banner': `url(${communityBanner(community)})` }"
          >
            <button type="button" class="quick-community-main" @click="emit('open-community', community)">
              <span class="quick-community-icon">
                <img v-if="community.iconUrl" :src="resolveAssetUrl(community.iconUrl)" alt="" />
                <b v-else>{{ initials(community.name) }}</b>
              </span>
              <span class="quick-community-copy">
                <strong>{{ community.name || shortName(community.name) }}</strong>
                <small>{{ communityDescription(community) }}</small>
                <span class="quick-community-stats">
                  <em><i class="fas fa-users"></i>{{ Number(community.membersCount || 0) }}</em>
                  <em><i class="fas fa-signal"></i>{{ activeCount(community) }}</em>
                  <em><i class="far fa-comment-dots"></i>{{ conversationCount(community) }}</em>
                </span>
              </span>
            </button>

            <button
              type="button"
              class="quick-favorite"
              :class="{ active: isFavorite(community), locked: isOfficial(community) }"
              :aria-label="isOfficial(community) ? 'Galaxia fijada' : 'Cambiar favorito'"
              @click="toggleFavorite(community)"
            >
              <i :class="isFavorite(community) ? 'fas fa-star' : 'far fa-star'"></i>
            </button>
          </article>
        </div>
      </div>

      <button type="button" class="quick-explore" aria-label="Explorar comunidades" @click="emit('open-explore')">
        <span><i class="fas fa-compass"></i></span>
        <strong>Explorar</strong>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.community-quick-nav {
  background:
    radial-gradient(circle at 20% 0%, rgba(168, 85, 247, 0.28), transparent 34%),
    linear-gradient(180deg, rgba(8, 10, 28, 0.96), rgba(10, 5, 24, 0.94));
  border: 1px solid rgba(168, 85, 247, 0.24);
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  color: #ffffff;
  padding: 16px;
}

.quick-nav-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.quick-nav-head span {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.quick-nav-head button {
  background: rgba(124, 58, 237, 0.18);
  border: 1px solid rgba(192, 132, 252, 0.18);
  border-radius: 999px;
  color: #f0abfc;
  font-size: 11px;
  font-weight: 950;
  min-height: 30px;
  padding: 0 10px;
}

.quick-nav-body,
.quick-nav-list {
  display: grid;
  gap: 14px;
}

.quick-community {
  align-items: center;
  background:
    linear-gradient(135deg, rgba(8, 10, 28, 0.8), rgba(15, 10, 38, 0.84));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 22px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 104px;
  overflow: hidden;
  padding: 14px;
  position: relative;
  transition: opacity 0.32s ease, filter 0.32s ease, transform 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease;
}

.quick-community::before {
  background-image: var(--community-banner);
  background-position: center;
  background-size: cover;
  content: '';
  inset: 0;
  opacity: 0.58;
  position: absolute;
  transform: scale(1.02);
  transition: opacity 0.32s ease, transform 0.42s ease;
}

.quick-community::after {
  background:
    linear-gradient(90deg, rgba(5, 8, 22, 0.94), rgba(5, 8, 22, 0.68)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.46));
  content: '';
  inset: 0;
  position: absolute;
}

.quick-community.active,
.quick-community.official {
  background: rgba(9, 7, 26, 0.95);
}

.quick-community.active {
  border-color: rgba(147, 197, 253, 0.72);
  box-shadow:
    0 0 0 1px rgba(216, 180, 254, 0.22),
    0 20px 58px rgba(124, 58, 237, 0.34);
  transform: scale(1.012);
}

.quick-community.active::before {
  opacity: 0.76;
}

.quick-nav-list:has(.quick-community.active) .quick-community:not(.active) {
  filter: saturate(0.72);
  opacity: 0.66;
}

.quick-community:hover,
.quick-community:focus-within {
  border-color: rgba(216, 180, 254, 0.68);
  box-shadow: 0 22px 58px rgba(124, 58, 237, 0.26);
  opacity: 1 !important;
  transform: translateY(-3px);
}

.quick-community:hover::before,
.quick-community:focus-within::before {
  opacity: 0.78;
  transform: scale(1.06);
}

.quick-community-main {
  align-items: center;
  color: inherit;
  display: grid;
  gap: 12px;
  grid-template-columns: 64px minmax(0, 1fr);
  min-width: 0;
  position: relative;
  text-align: left;
  z-index: 1;
}

.quick-community-icon,
.quick-explore span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  display: grid;
  height: 64px;
  overflow: hidden;
  place-items: center;
  width: 64px;
}

.quick-community-icon {
  border: 2px solid rgba(244, 214, 255, 0.42);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
}

.quick-community-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.quick-community-icon b {
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
}

.quick-community-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.quick-community-copy strong,
.quick-explore strong {
  color: #ffffff;
  font-size: 15px;
  font-weight: 950;
  line-height: 1.08;
}

.quick-community-copy small {
  color: #d8d9ee;
  display: -webkit-box;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.quick-community-stats {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.quick-community-stats em {
  align-items: center;
  color: #e5e7eb;
  display: inline-flex;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  gap: 4px;
  min-width: 0;
}

.quick-community-stats i {
  color: #c084fc;
  font-size: 9px;
}

.quick-favorite {
  align-items: center;
  background: rgba(5, 8, 22, 0.72);
  border-radius: 999px;
  color: #aeb8d3;
  display: inline-flex;
  height: 30px;
  justify-content: center;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 30px;
  z-index: 2;
}

.quick-favorite.active {
  color: #facc15;
}

.quick-favorite.locked {
  cursor: default;
}

.quick-explore {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(236, 72, 153, 0.82));
  border: 1px solid rgba(244, 214, 255, 0.25);
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: 12px;
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 58px;
  padding: 8px 14px;
  text-align: left;
}

.quick-explore span {
  height: 42px;
  width: 42px;
}

.quick-favorite:hover,
.quick-favorite:focus-visible {
  background: rgba(250, 204, 21, 0.16);
  color: #fde68a;
}

@media (min-width: 1180px) {
  .community-quick-nav {
    align-self: start;
    max-height: calc(100dvh - var(--public-page-top, 88px) - 22px);
    overflow: auto;
    position: sticky;
    top: 0;
    width: 100%;
    z-index: 2;
  }
}

@media (max-width: 1179px) {
  .community-quick-nav {
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    box-sizing: border-box;
    display: grid;
    height: 100%;
    align-items: center;
    padding: 4px 0;
    position: relative;
    top: auto;
    width: 100%;
    z-index: 5;
  }

  .quick-nav-head {
    display: none;
  }

  .quick-nav-body {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) 62px;
    min-height: 74px;
    position: relative;
  }

  .quick-nav-body::after {
    display: none;
  }

  .quick-nav-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px 0;
    scrollbar-width: none;
  }

  .quick-nav-scroll::-webkit-scrollbar {
    display: none;
  }

  .quick-nav-list {
    display: flex;
    gap: 10px;
    width: max-content;
  }

  .quick-community,
  .quick-explore {
    flex: 0 0 150px;
  }

  .quick-community::before,
  .quick-community::after {
    display: none;
  }

  .quick-community-stats {
    display: none;
  }
}

@media (max-width: 680px) {
  .community-quick-nav {
    padding: 0;
    z-index: 3;
  }

  .quick-nav-body {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 64px;
    min-height: 72px;
  }

  .quick-community {
    background: transparent;
    border: 0;
    box-shadow: none;
    display: grid;
    flex: 0 0 58px;
    grid-template-columns: 1fr;
    justify-items: center;
    min-height: 60px;
    padding: 0;
    position: relative;
  }

  .quick-community.active,
  .quick-community.official {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    transform: none;
  }

  .quick-community:hover {
    background: transparent;
    box-shadow: none;
    transform: none;
  }

  .quick-community-main {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    justify-items: center;
    min-height: 0;
    padding: 0;
    text-align: center;
  }

  .quick-community-icon,
  .quick-explore span {
    border: 2px solid rgba(244, 214, 255, 0.46);
    height: 48px;
    width: 48px;
  }

  .quick-community.active .quick-community-icon {
    box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.28), 0 0 24px rgba(236, 72, 153, 0.34);
  }

  .quick-community-copy strong,
  .quick-explore strong,
  .quick-community-copy small {
    display: none;
  }

  .quick-favorite {
    background: rgba(5, 8, 22, 0.92);
    display: inline-flex;
    height: 18px;
    position: absolute;
    right: 2px;
    top: 2px;
    width: 18px;
    z-index: 3;
  }

  .quick-favorite i {
    font-size: 9px;
  }

  .quick-explore {
    align-items: center;
    aspect-ratio: 1;
    align-self: start;
    background: transparent;
    border: 0;
    border-radius: 999px;
    display: grid;
    grid-template-columns: 1fr;
    height: 62px;
    min-height: 0;
    margin-top: 4px;
    padding: 0;
    place-items: center;
    width: 62px;
    justify-self: center;
  }

  .quick-explore span {
    align-items: center;
    box-shadow: 0 14px 28px rgba(236, 72, 153, 0.28);
    display: grid;
    height: 58px;
    justify-items: center;
    place-items: center;
    width: 58px;
  }
}
</style>
