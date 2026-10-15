<script setup>
import { publicName, publicText } from '@/utils/publicIdentity'
import { computed, ref } from 'vue'
import PublicNavigationLink from './PublicNavigationLink.vue'
import { usePublicPanelFocus } from '@/composables/usePublicPanelFocus'
import { defaultLogoUrl, resolveAssetUrl } from '@/constants/assets'
import { postCategoryLabels } from '@/services/postCategories'
import { resolveProfileIcon } from '@/services/profileProgress'

const query = defineModel('query', {
  type: String,
  default: ''
})

const activeFilter = defineModel('filter', {
  type: String,
  default: 'all'
})

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  results: {
    type: Object,
    default: () => ({ posts: [], communities: [], users: [] })
  },
  suggestions: {
    type: Object,
    default: () => ({ posts: [], communities: [], users: [] })
  },
  followingIds: {
    type: Object,
    default: () => new Set()
  },
  currentUserId: {
    type: String,
    default: ''
  },
  recentSearches: {
    type: Array,
    default: () => []
  },
  expanded: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  mobileVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit', 'open-result', 'open-section', 'open-all', 'recent', 'follow-user'])

const panel = ref(null)
usePublicPanelFocus(() => props.open, panel, () => emit('close'), { initial: 'input' })

const filters = [
  { id: 'all', label: 'Todo' },
  { id: 'posts', label: 'Noticias' },
  { id: 'communities', label: 'Comunidades' },
  { id: 'users', label: 'Usuarios' }
]

const hasQuery = computed(() => query.value.trim().length > 0)
const sections = computed(() => hasQuery.value ? props.results : props.suggestions)
const hasAnyResult = computed(() => (
  sections.value.posts.length ||
  sections.value.communities.length ||
  sections.value.users.length
))
const sectionButtonLabel = (type) => props.expanded && activeFilter.value === type ? 'Ver menos' : 'Ver mas'

const categoryLabel = (post) => postCategoryLabels(post)[0] || post.category || 'General'

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  const time = typeof value === 'number' ? value : value?.toDate?.().getTime?.() || new Date(value).getTime()
  const days = Math.floor((Date.now() - time) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} dias`
}

const formatMembers = (value = 0) => {
  const count = Number(value || 0)
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K miembros`
  return `${count} miembros`
}

const communityCategory = (community) => community.category || community.threadTopics?.[0] || (community.isOfficial ? 'Oficial' : 'Comunidad')
const communityAvatar = (community) => community.iconUrl || community.imageUrl || defaultLogoUrl
const userAvatar = (user) => resolveProfileIcon(user) || user.imageUrl || user.photoURL || ''
const userHandle = (user) => publicText(user.username) ? `@${user.username}` : `@${publicName(user.name, user.displayName, 'usuario').toLowerCase().replace(/\s+/g, '')}`
const isFollowing = (user) => props.followingIds?.has?.(user.id)
const canFollow = (user) => props.currentUserId && user.id !== props.currentUserId && !isFollowing(user)

const openPost = (post) => emit('open-result', { type: 'post', id: post.slug || post.id })
const openCommunity = (community) => emit('open-result', { type: 'community', id: community.id })
const openUser = (user) => emit('open-result', { type: 'user', id: user.id })
</script>

<template>
  <div v-if="open" ref="panel" tabindex="-1" class="public-search-panel" :class="{ expanded }">
    <form role="search" aria-label="Búsqueda global" class="public-search-box" @submit.prevent="emit('submit')">
      <i class="fas fa-search"></i>
      <input
        v-model="query"
        type="search"
        aria-label="Buscar noticias, comunidades o usuarios"
        placeholder="Buscar noticias, comunidades o usuarios..."
      />
      <button type="button" aria-label="Cerrar busqueda" @click="emit('close')">
        <i class="fas fa-xmark"></i>
      </button>
    </form>

    <div class="search-filter-row" aria-label="Filtros de busqueda">
      <button
        v-for="filter in filters"
        :key="filter.id"
        type="button"
        :class="{ active: activeFilter === filter.id }" :aria-pressed="activeFilter === filter.id"
        @click="activeFilter = filter.id"
      >
        {{ filter.label }}
      </button>
    </div>

    <div v-if="!hasQuery && recentSearches.length" class="recent-searches">
      <span>Busquedas recientes</span>
      <button v-for="item in recentSearches" :key="item" type="button" @click="emit('recent', item)">
        {{ item }}
      </button>
    </div>

    <div class="public-search-results">
      <p v-if="loading" class="search-state">
        <i class="fas fa-circle-notch fa-spin"></i>
        Buscando...
      </p>

      <template v-else>
        <section v-if="sections.posts.length" class="search-section">
          <header>
            <strong><i class="far fa-newspaper"></i>{{ hasQuery ? 'Noticias' : 'Noticias destacadas' }}</strong>
            <button type="button" @click="emit('open-section', 'posts')">{{ sectionButtonLabel('posts') }}</button>
          </header>

          <button v-for="post in sections.posts" :key="post.id" type="button" class="search-result-row post-row" @click="openPost(post)">
            <img v-if="post.image" :src="resolveAssetUrl(post.image)" alt="" />
            <span v-else class="result-fallback"><i class="far fa-image"></i></span>
            <span>
              <strong>{{ post.title || 'Sin titulo' }}</strong>
              <small>{{ formatDate(post.updatedAt || post.createdAt) }} - {{ categoryLabel(post) }}</small>
            </span>
          </button>
        </section>

        <section v-if="sections.communities.length" class="search-section">
          <header>
            <strong><i class="fas fa-users"></i>{{ hasQuery ? 'Comunidades' : 'Comunidades populares' }}</strong>
            <button type="button" @click="emit('open-section', 'communities')">{{ sectionButtonLabel('communities') }}</button>
          </header>

          <button v-for="community in sections.communities" :key="community.id" type="button" class="search-result-row" @click="openCommunity(community)">
            <img :src="communityAvatar(community)" alt="" />
            <span>
              <strong>{{ community.name || 'Comunidad' }}</strong>
              <small>{{ formatMembers(community.membersCount) }} - {{ communityCategory(community) }}</small>
            </span>
          </button>
        </section>

        <section v-if="sections.users.length" class="search-section">
          <header>
            <strong><i class="far fa-user"></i>{{ hasQuery ? 'Usuarios' : 'Usuarios recomendados' }}</strong>
            <button type="button" @click="emit('open-section', 'users')">{{ sectionButtonLabel('users') }}</button>
          </header>

          <article
            v-for="user in sections.users"
            :key="user.id"
            class="search-result-row user-row"
          >
            <PublicNavigationLink class="search-user-profile" :to="`/perfil/${user.id}`" @navigate="openUser(user)">
              <span class="user-avatar">
                <img v-if="userAvatar(user)" :src="userAvatar(user)" alt="" />
                <i v-else class="far fa-user"></i>
              </span>
              <span>
                <strong>
                  {{ publicName(user.name, user.displayName, user.username) }}
                  <i v-if="user.emailVerified" class="fas fa-circle-check verified-mark"></i>
                </strong>
                <small>{{ userHandle(user) }}</small>
              </span>
              </PublicNavigationLink>
            <em v-if="isFollowing(user)">Siguiendo</em>
            <em v-else-if="!currentUserId || user.id === currentUserId">Perfil</em>
            <button v-else-if="canFollow(user)" type="button" class="follow-mini" @click.stop="emit('follow-user', user)">Seguir</button>
          </article>
        </section>

        <p v-if="hasQuery && !hasAnyResult" class="search-state">
          No hay resultados para esa busqueda.
        </p>
      </template>
    </div>

  </div>
</template>

<style scoped>
.public-search-panel {
  animation: searchPanelIn 0.18s ease both;
  background: rgba(255, 255, 255, 0.96);
  border: var(--border-width) solid var(--notice-light-border);
  border-radius: var(--public-menu-radius);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
  color: #111827;
  left: 50%;
  max-width: 760px;
  padding: 14px 24px 18px;
  position: fixed;
  top: calc(var(--public-nav-offset, 72px) - 1px);
  transform: translateX(-50%);
  transform-origin: top center;
  width: calc(100vw - 28px);
  z-index: 1200;
  max-height: calc(100dvh - var(--public-nav-offset, 72px) - var(--space-4));
  overflow-y: auto;
}

.public-search-box {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-control);
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: var(--public-control-height);
  padding: 0 12px;
}

.public-search-box > i {
  color: #7c3aed;
  font-size: var(--public-icon-size);
}

.public-search-box input {
  min-height: var(--public-control-height);
  background: transparent;
  border: 0;
  color: #111827;
  font-size: var(--font-body);
  font-weight: var(--weight-body);
  min-width: 0;
  outline: none;
}

.public-search-box input::placeholder {
  color: var(--public-menu-light-muted);
}

.public-search-box button {
  color: #64748b;
  height: var(--public-control-height);
  width: var(--public-control-height);
}

.search-filter-row,
.recent-searches {
  align-items: center;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 0;
}

.search-filter-row button,
.recent-searches button {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: var(--public-menu-light-muted);
  flex: 0 0 auto;
  font-size: var(--font-button);
  font-weight: var(--weight-label);
  min-height: var(--public-control-height);
  padding: 0 12px;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.search-filter-row button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(168, 85, 247, 0.18);
}

.recent-searches {
  border-bottom: 0;
  padding-bottom: 0;
}

.recent-searches span {
  color: var(--public-menu-light-muted);
  flex: 0 0 auto;
  font-size: var(--font-label);
  font-weight: var(--weight-label);
  text-transform: uppercase;
}

.public-search-results {
  display: grid;
  gap: 12px;
  max-height: min(560px, calc(100dvh - 205px));
  overflow-y: auto;
  padding-top: 12px;
}

.public-search-panel.expanded .public-search-results {
  max-height: min(680px, calc(100dvh - 190px));
}

.search-section {
  border-bottom: 1px solid #eef2f7;
  display: grid;
  gap: 8px;
  padding-bottom: 12px;
}

.search-section header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.search-section header strong {
  align-items: center;
  color: #111827;
  display: inline-flex;
  font-size: var(--font-label);
  font-weight: var(--weight-label);
  gap: 8px;
}

.search-section header i {
  color: #7c3aed;
}

.search-section header button {
  color: var(--action-message-text);
  font-size: var(--font-button);
  font-weight: var(--weight-label);
  min-height: var(--public-control-height);
}

.search-result-row {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-control);
  color: #111827;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  min-height: 58px;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  width: 100%;
}

.search-result-row:hover {
  background: #f8fafc;
  border-color: #ddd6fe;
  transform: translateY(-1px);
}

.search-result-row img,
.result-fallback,
.user-avatar {
  background: #ede9fe;
  border-radius: 12px;
  height: 42px;
  object-fit: cover;
  overflow: hidden;
  width: 42px;
}

.post-row img,
.post-row .result-fallback {
  aspect-ratio: 16 / 10;
  width: 58px;
}

.post-row {
  grid-template-columns: 58px minmax(0, 1fr);
}

.result-fallback,
.user-avatar {
  align-items: center;
  color: #8b5cf6;
  display: flex;
  justify-content: center;
}

.user-avatar img {
  border-radius: inherit;
  height: 100%;
  width: 100%;
}

.search-result-row span {
  min-width: 0;
}

.search-result-row strong {
  align-items: center;
  color: #111827;
  display: flex;
  font-size: var(--font-body);
  font-weight: var(--weight-label);
  gap: 5px;
  line-height: var(--line-body);
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-row small {
  color: var(--public-menu-light-muted);
  display: block;
  font-size: var(--font-caption);
  font-weight: var(--weight-body);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: var(--line-body);
}

.verified-mark {
  color: #0ea5e9;
  flex: 0 0 auto;
  font-size: 12px;
}

.user-row em,
.follow-mini {
  border-radius: 999px;
  font-size: var(--font-caption);
  font-style: normal;
  font-weight: var(--weight-label);
  min-height: var(--badge-height);
  padding: 0 10px;
}

.user-row em {
  align-items: center;
  background: #f1f5f9;
  color: #64748b;
  display: inline-flex;
}

.follow-mini {
  background: var(--public-action-background);
  color: #ffffff;
  min-height: var(--public-control-height);
}

.search-state {
  align-items: center;
  background: #f8fafc;
  border: 1px dashed #ddd6fe;
  border-radius: var(--radius-control);
  color: var(--public-menu-light-muted);
  display: flex;
  font-size: var(--font-caption);
  font-weight: var(--weight-body);
  gap: 8px;
  justify-content: center;
  min-height: 70px;
  padding: 14px;
  line-height: var(--line-body);
}

.search-state i {
  color: #8b5cf6;
}

@keyframes searchPanelIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@media (max-width: 680px) {
  .public-search-panel {
    max-width: none;
    padding: 12px 16px 16px;
    top: calc(var(--public-nav-offset, 64px) - 1px);
    width: calc(100vw - 28px);
    border-radius: var(--public-menu-radius);
    max-height: calc(100dvh - var(--public-nav-offset, 72px) - var(--space-4));
    overflow-y: auto;
  }

  .public-search-results {
    max-height: min(620px, calc(100dvh - 194px));
  }
}

@media (max-width: 420px) {
  .public-search-panel {
    padding: 12px 14px 14px;
    border-radius: var(--public-menu-radius);
    max-height: calc(100dvh - var(--public-nav-offset, 72px) - var(--space-4));
    overflow-y: auto;
  }

  .search-result-row {
    grid-template-columns: 38px minmax(0, 1fr) auto;
    border-radius: var(--radius-control);
  }

  .post-row {
    grid-template-columns: 54px minmax(0, 1fr);
  }

  .search-result-row img,
  .result-fallback,
  .user-avatar {
    height: 38px;
    width: 38px;
  }

  .post-row img,
  .post-row .result-fallback {
    width: 54px;
  }
}
.search-user-profile { grid-column: 1 / 3; display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: var(--space-2); min-width: 0; min-height: var(--public-control-height); color: inherit; text-decoration: none; }
@media (prefers-reduced-motion: reduce) { .public-search-panel { animation: none; } .search-result-row { transition: none; } }
</style>
