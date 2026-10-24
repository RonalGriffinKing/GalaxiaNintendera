<script setup>
import ContentLoading from "@/components/shared/ContentLoading.vue"
import ScrollTabRail from "@/components/shared/ScrollTabRail.vue"
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
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

const panel=ref(null),searchInput=ref(null),viewportStyle=ref({})
let returnFocus
function updateViewport(){if(props.open){const viewport=window.visualViewport;viewportStyle.value={'--search-height':(viewport?.height||window.innerHeight)+'px','--search-top':(viewport?.offsetTop||0)+'px'}}}
function dialogKeys(event){
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();emit('close');return}
 if(event.key!=='Tab')return
 const controls=[...panel.value.querySelectorAll('button:not(:disabled),input,[tabindex="0"]')].filter(node=>node.offsetParent)
 const first=controls[0],last=controls.at(-1)
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
}
watch(()=>props.open,async open=>{
 if(open){returnFocus=document.activeElement;updateViewport();await nextTick();searchInput.value?.focus({preventScroll:true})}
 else{await nextTick();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true})}
})
onMounted(()=>{window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);window.addEventListener('resize',updateViewport)})
onBeforeUnmount(()=>{window.visualViewport?.removeEventListener('resize',updateViewport);window.visualViewport?.removeEventListener('scroll',updateViewport);window.removeEventListener('resize',updateViewport)})
const emit = defineEmits(['close', 'submit', 'open-result', 'open-section', 'open-all', 'recent', 'follow-user'])

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
const userHandle = (user) => user.username ? `@${user.username}` : user.email ? `@${String(user.email).split('@')[0]}` : `@${String(user.name || 'usuario').toLowerCase().replace(/\s+/g, '')}`
const isFollowing = (user) => props.followingIds?.has?.(user.id)
const canFollow = (user) => props.currentUserId && user.id !== props.currentUserId && !isFollowing(user)

const openPost = (post) => emit('open-result', { type: 'post', id: post.slug || post.id })
const openCommunity = (community) => emit('open-result', { type: 'community', id: community.id })
const openUser = (user) => emit('open-result', { type: 'user', id: user.id })
</script>

<template>
  <Teleport to="body"><Transition name="search-overlay"><div v-if="open" class="search-overlay" :style="viewportStyle" @click.self="emit('close')"><section ref="panel" class="public-search-panel" :class="{ expanded }" role="dialog" aria-modal="true" aria-label="Buscar en Galaxia Nintendera" @keydown="dialogKeys">
    <form class="public-search-box" @submit.prevent="emit('submit')">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
      <input
        ref="searchInput"
        v-model="query"
        aria-label="Buscar noticias, comunidades o usuarios"
        placeholder="Buscar noticias, comunidades o usuarios..."
      />
      <button type="button" aria-label="Cerrar busqueda" @click="emit('close')">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>
    </form>

    <ScrollTabRail class="search-filter-rail"><div class="search-filter-row" aria-label="Filtros de busqueda">
      <button
        v-for="filter in filters"
        :key="filter.id"
        type="button"
        :class="{ active: activeFilter === filter.id }"
        @click="activeFilter = filter.id"
      >
        {{ filter.label }}
      </button>
    </div></ScrollTabRail>

    <div v-if="!hasQuery && recentSearches.length" class="recent-searches">
      <span>Busquedas recientes</span>
      <button v-for="item in recentSearches" :key="item" type="button" @click="emit('recent', item)">
        {{ item }}
      </button>
    </div>

    <div class="public-search-results">
      <ContentLoading v-if="loading" variant="inline" />

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
            role="button"
            tabindex="0"
            @click="openUser(user)"
            @keydown.enter.prevent="openUser(user)"
          >
            <span class="user-avatar">
              <img v-if="userAvatar(user)" :src="userAvatar(user)" alt="" />
              <i v-else class="far fa-user"></i>
            </span>
            <span>
              <strong>
                {{ user.name || user.displayName || user.email || 'Usuario' }}
                <i v-if="user.emailVerified" class="fas fa-circle-check verified-mark"></i>
              </strong>
              <small>{{ userHandle(user) }}</small>
            </span>
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

  </section></div></Transition></Teleport>
</template>

<style scoped>
.search-overlay{position:fixed;top:var(--search-top,0px);left:0;right:0;height:var(--search-height,100dvh);z-index:1800;display:flex;align-items:flex-start;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));box-sizing:border-box;background:#040612d9;backdrop-filter:blur(8px)}
.public-search-panel{display:flex;flex-direction:column;gap:12px;width:min(760px,100%);height:min(760px,100%);min-height:0;max-height:100%;padding:16px;box-sizing:border-box;overflow:hidden;border:1px solid #a78bfa44;border-radius:22px;background:#101324;box-shadow:0 24px 70px #0006;color:#edf0fa}
.public-search-box{display:grid;grid-template-columns:20px minmax(0,1fr) 44px;align-items:center;gap:9px;min-height:52px;flex:none;padding:0 4px 0 12px;border:1px solid #a78bfa44;border-radius:14px;background:#080c1c;color:#c084fc}
.public-search-box input{width:100%;min-width:0;padding:8px 0;border:0;outline:none;background:transparent;color:#f1f5f9;font-size:16px;font-weight:400}
.public-search-box input::placeholder{color:#8e9ab6;font-size:13px}
.public-search-box button{display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:10px;background:transparent;color:#cbd5e1;cursor:pointer}
.public-search-box:focus-within{border-color:#c084fc88;box-shadow:0 0 0 2px #a855f714}
.search-filter-rail{flex:none}
.search-filter-row{display:flex;gap:6px}
.recent-searches{display:flex;align-items:center;gap:7px;flex:none;overflow-x:auto;min-width:0;max-width:100%;scrollbar-width:none;padding:1px 0 4px}.recent-searches::-webkit-scrollbar{display:none}
.recent-searches>span{flex:none;font-size:9px;font-weight:600;text-transform:uppercase;color:#a6afc7}
.recent-searches button{flex:none;min-height:30px;padding:5px 10px;border:1px solid #a78bfa22;border-radius:999px;background:#ffffff06;color:#cbd5e1;font-size:11px;cursor:pointer}
.public-search-results{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:18px;padding:0 6px 4px 0;scrollbar-width:thin;scrollbar-color:#a78bfa66 transparent}
.public-search-results::-webkit-scrollbar{width:4px;height:4px}.public-search-results::-webkit-scrollbar-track{background:transparent}.public-search-results::-webkit-scrollbar-thumb{background:#a78bfa66;border-radius:999px}.public-search-results::-webkit-scrollbar-button{display:none;width:0;height:0}
.search-section{display:grid;gap:8px;flex:none;padding-bottom:14px;border-bottom:1px solid #a78bfa1c}
.search-section header{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px}.search-section header strong{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#e2e8f0}.search-section header i{color:#c084fc}
.search-section header button{padding:6px 3px;border:0;background:transparent;color:#c4b5fd;font-size:11px;cursor:pointer}
.search-result-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-width:0;min-height:64px;padding:10px;border:1px solid #a78bfa20;border-radius:14px;background:#191e33;color:#f1f5f9;text-align:left;cursor:pointer;box-sizing:border-box;transition:background .18s,border-color .18s}
.search-result-row:hover{background:#24223e;border-color:#a78bfa66}.search-result-row span{min-width:0}.search-result-row img,.result-fallback,.user-avatar{width:42px;height:42px;object-fit:cover;border-radius:11px;background:#a78bfa14;flex:none;overflow:hidden}
.post-row{grid-template-columns:58px minmax(0,1fr)}.post-row img,.post-row .result-fallback{width:58px;height:44px}
.result-fallback,.user-avatar{display:grid;place-items:center;color:#c084fc}.user-avatar img{width:100%;height:100%;border-radius:inherit}
.search-result-row strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;font-weight:600;line-height:1.4;color:#edf0fa;overflow-wrap:anywhere}.search-result-row small{display:block;margin-top:4px;font-size:10px;color:#a5b1cb;line-height:1.4;overflow-wrap:anywhere}
.verified-mark{color:#38bdf8;font-size:11px}.user-row em{font-size:10px;font-style:normal;color:#c4b5fd}.follow-mini{min-height:32px;padding:5px 10px;border:1px solid #a78bfa44;border-radius:999px;background:#7c3aed33;color:#ede9fe;font-size:10px;cursor:pointer}
.search-state{padding:20px;text-align:center;font-size:13px;color:#b9c3da}
.public-search-panel button:focus-visible,.user-row:focus-visible{outline:2px solid #d8b4fe;outline-offset:-2px}
.search-overlay-enter-active,.search-overlay-leave-active{transition:opacity .2s ease}.search-overlay-enter-from,.search-overlay-leave-to{opacity:0}
@media(max-width:859px){.search-overlay{padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}.public-search-panel{height:100%;padding:12px;gap:10px;border-radius:20px}}
@media(prefers-reduced-motion:reduce){.search-overlay-enter-active,.search-overlay-leave-active,.search-result-row{transition:none}}
</style>
