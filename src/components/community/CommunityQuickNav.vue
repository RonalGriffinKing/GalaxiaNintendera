<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import CommunityRailNav from '@/components/community/CommunityRailNav.vue'

const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'

const router = useRouter()
const route = useRoute()
const communities = ref([])
const upcomingItems = ref([])
const trendThreads = ref([])
const eventsOpen = ref(false)

const items = computed(() => communities.value.slice(0, 6))
const selectedId = computed(() => route.path === '/comunidad' ? String(route.query.id || '') : '')
const previewItems = computed(() => upcomingItems.value.slice(0, 2))
const previewThreads = computed(() => trendThreads.value.slice(0, 3))
const featuredUpcoming = computed(() => upcomingItems.value[0] || null)
const currentMonth = computed(() => {
  const first = featuredUpcoming.value
  const time = first ? getTime(first.startsAt) : Date.now()
  return new Date(time || Date.now())
})
const monthLabel = computed(() => new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric'
}).format(currentMonth.value))
const eventDays = computed(() => new Set(upcomingItems.value.map(item => new Date(getTime(item.startsAt)).getDate()).filter(Boolean)))
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  return [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ id: `blank-${index}`, blank: true })),
    ...Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1
      return {
        id: `day-${day}`,
        day,
        active: day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(),
        marked: eventDays.value.has(day)
      }
    })
  ]
})

const officialFallback = {
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera Oficial',
  description: 'Comunicados, videos, lives y eventos oficiales.',
  iconUrl: '/src/iconos/logo.png',
  isOfficial: true
}

const getTime = (timestamp) => {
  if (!timestamp) return 0
  return timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()
}

const formatDate = (timestamp) => {
  const time = getTime(timestamp)
  if (!time) return 'Fecha pendiente'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const loadSidebarData = async () => {
  try {
    const [communitySnap, eventSnap, postSnap, threadSnap] = await Promise.all([
      getDocs(collection(db, 'communities')),
      getDocs(collection(db, 'galaxyEvents')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'posts')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'communityThreads')).catch(() => ({ docs: [] }))
    ])
    const saved = communitySnap.docs.map(item => ({ id: item.id, ...item.data() }))
    const official = saved.find(item => item.id === OFFICIAL_COMMUNITY_ID)

    communities.value = [
      { ...officialFallback, ...official },
      ...saved.filter(item => item.id !== OFFICIAL_COMMUNITY_ID)
    ]

    const eventItems = eventSnap.docs.map(item => {
      const data = item.data()
      return {
        id: `event-${item.id}`,
        label: data.type || 'Evento',
        title: data.title || 'Evento programado',
        startsAt: data.startsAt,
        description: data.description || 'Actividad programada para la comunidad.',
        image: data.image || data.imageUrl || ''
      }
    })

    const postItems = postSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(post => post.status === 'approved' && getTime(post.releaseAt || post.scheduledAt) > Date.now() && post.teaserVisible !== false)
      .map(post => ({
        id: `post-${post.id}`,
        label: 'Proximamente',
        title: post.title || post.headline || 'Nuevo post',
        startsAt: post.releaseAt || post.scheduledAt,
        description: post.content || 'Nuevo contenido preparado para la comunidad.',
        image: post.image || ''
      }))

    upcomingItems.value = [...eventItems, ...postItems]
      .filter(item => getTime(item.startsAt) >= Date.now())
      .sort((a, b) => getTime(a.startsAt) - getTime(b.startsAt))
      .slice(0, 8)

    trendThreads.value = threadSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const scoreA = Number(a.likes || 0) + Number(a.replies || a.comments?.length || 0)
        const scoreB = Number(b.likes || 0) + Number(b.replies || b.comments?.length || 0)
        return scoreB - scoreA || getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt)
      })
      .slice(0, 6)
  } catch (error) {
    communities.value = [officialFallback]
  }
}

const openUpcomingHub = () => {
  eventsOpen.value = true
}

const closeUpcomingHub = () => {
  eventsOpen.value = false
}

const goCommunity = (community) => {
  if (!community?.id) return
  router.push(`/comunidad?id=${encodeURIComponent(community.id)}`)
}

const goCreate = () => {
  router.push('/comunidad?create=community')
}

const goExplore = () => {
  router.push('/comunidad?explore=1')
}

onMounted(() => {
  document.body.classList.add('community-quick-nav-active')
  loadSidebarData()
})

onUnmounted(() => {
  document.body.classList.remove('community-quick-nav-active')
})
</script>

<template>
  <aside v-if="items.length" class="community-quick-shell">
    <button
      type="button"
      class="community-quick-peek"
      aria-label="Abrir panel de comunidades"
      @click="openUpcomingHub"
    >
      <i class="fas fa-chevron-up"></i>
    </button>

    <CommunityRailNav
      :communities="items"
      :selected-id="selectedId"
      can-create
      @select="goCommunity"
      @create="goCreate"
      @explore="goExplore"
    />

    <section class="community-upcoming-card">
      <div class="upcoming-head">
        <span>
          <i class="fas fa-cloud"></i>
          Proximamente
        </span>
      </div>

      <div v-if="previewItems.length" class="upcoming-clouds">
        <button
          v-for="item in previewItems"
          :key="item.id"
          type="button"
          @click="router.push('/comunidad')"
        >
          <small>{{ item.label }}</small>
          <strong>{{ item.title }}</strong>
          <span>{{ formatDate(item.startsAt) }}</span>
        </button>
      </div>

      <p v-else>No hay eventos programados.</p>

      <button type="button" class="upcoming-expand-btn" @click="openUpcomingHub">
        <span>
          <i class="far fa-calendar"></i>
          Ver grande
        </span>
        <i class="fas fa-up-right-and-down-left-from-center"></i>
      </button>
    </section>

    <section class="community-trending-card">
      <div class="trending-head">
        <span>
          <i class="fas fa-fire"></i>
          Hilos en tendencia
        </span>
      </div>

      <div v-if="previewThreads.length" class="trending-bubbles">
        <button
          v-for="thread in previewThreads"
          :key="thread.id"
          type="button"
          @click="router.push('/comunidad')"
        >
          <span>
            <img v-if="thread.authorImage" :src="thread.authorImage" alt="" />
            <b v-else>{{ (thread.author || thread.title || 'H').slice(0, 1).toUpperCase() }}</b>
          </span>
          <div>
            <strong>{{ thread.title || 'Hilo destacado' }}</strong>
            <small>{{ Number(thread.likes || 0) }} likes - {{ Number(thread.replies || thread.comments?.length || 0) }} respuestas</small>
          </div>
        </button>
      </div>

      <p v-else>Aun no hay hilos destacados.</p>
    </section>

    <Teleport to="body">
      <Transition name="upcoming-hub">
        <section v-if="eventsOpen" class="upcoming-hub-modal" aria-label="Calendario de proximos eventos">
          <button type="button" class="upcoming-hub-backdrop" aria-label="Cerrar calendario" @click="closeUpcomingHub"></button>
          <div class="upcoming-hub-card">
            <header class="upcoming-hub-head">
              <div>
                <span><i class="fas fa-cloud"></i> Proximamente</span>
                <h2>Lo proximo en la galaxia</h2>
              </div>
              <button type="button" class="upcoming-close-btn" aria-label="Cerrar calendario" @click="closeUpcomingHub">
                <i class="fas fa-xmark"></i>
              </button>
            </header>

            <div class="upcoming-hub-layout">
              <section class="upcoming-community-list" aria-label="Comunidades">
                <div class="upcoming-panel-title">
                  <span><i class="fas fa-users"></i> Comunidades</span>
                  <strong>{{ items.length }} activas</strong>
                </div>
                <button
                  v-for="community in items"
                  :key="community.id"
                  type="button"
                  :class="{ active: community.id === selectedId }"
                  @click="goCommunity(community); closeUpcomingHub()"
                >
                  <span>
                    <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
                    <b v-else>{{ (community.name || 'C').slice(0, 2).toUpperCase() }}</b>
                  </span>
                  <div>
                    <strong>{{ community.name }}</strong>
                    <small>{{ community.description || 'Comunidad de la galaxia' }}</small>
                  </div>
                </button>
              </section>

              <article class="upcoming-spotlight">
                <img v-if="featuredUpcoming?.image" :src="featuredUpcoming.image" alt="" />
                <div>
                  <span>{{ featuredUpcoming?.label || 'Agenda' }}</span>
                  <h3>{{ featuredUpcoming?.title || 'Sin eventos programados' }}</h3>
                  <p>{{ featuredUpcoming?.description || 'Aqui apareceran lanzamientos, directos y actividades importantes.' }}</p>
                  <strong v-if="featuredUpcoming"><i class="far fa-calendar"></i> {{ formatDate(featuredUpcoming.startsAt) }}</strong>
                </div>
              </article>

              <section class="upcoming-event-list">
                <div class="upcoming-panel-title">
                  <span><i class="fas fa-cloud"></i> Proximamente</span>
                  <strong>{{ upcomingItems.length }} eventos</strong>
                </div>
                <button
                  v-for="item in upcomingItems"
                  :key="item.id"
                  type="button"
                  @click="router.push('/comunidad')"
                >
                  <span>
                    <img v-if="item.image" :src="item.image" alt="" />
                    <i v-else :class="item.id.startsWith('event-') ? 'far fa-calendar' : 'fas fa-newspaper'"></i>
                  </span>
                  <div>
                    <small>{{ item.label }}</small>
                    <strong>{{ item.title }}</strong>
                    <em><i class="far fa-calendar"></i> {{ formatDate(item.startsAt) }}</em>
                  </div>
                </button>
                <p v-if="!upcomingItems.length">No hay eventos programados por ahora.</p>
              </section>

              <section class="upcoming-thread-list" aria-label="Hilos en tendencia">
                <div class="upcoming-panel-title">
                  <span><i class="fas fa-fire"></i> Hilos</span>
                  <strong>{{ trendThreads.length }} tendencia</strong>
                </div>
                <button
                  v-for="thread in trendThreads"
                  :key="thread.id"
                  type="button"
                  @click="router.push('/comunidad'); closeUpcomingHub()"
                >
                  <span>
                    <img v-if="thread.authorImage" :src="thread.authorImage" alt="" />
                    <b v-else>{{ (thread.author || thread.title || 'H').slice(0, 1).toUpperCase() }}</b>
                  </span>
                  <div>
                    <strong>{{ thread.title || 'Hilo destacado' }}</strong>
                    <small>{{ Number(thread.likes || 0) }} likes - {{ Number(thread.replies || thread.comments?.length || 0) }} respuestas</small>
                  </div>
                </button>
                <p v-if="!trendThreads.length">Aun no hay hilos destacados.</p>
              </section>

              <aside class="upcoming-calendar-card">
                <div class="upcoming-calendar-head">
                  <strong>Calendario</strong>
                  <span>{{ monthLabel }}</span>
                </div>
                <div class="upcoming-calendar-grid">
                  <b v-for="day in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="day">{{ day }}</b>
                  <span
                    v-for="day in calendarDays"
                    :key="day.id"
                    :class="{ blank: day.blank, active: day.active, marked: day.marked }"
                  >
                    {{ day.day || '' }}
                  </span>
                </div>
                <button type="button" @click="router.push('/comunidad')">
                  <i class="far fa-calendar-check"></i>
                  Ver calendario completo
                </button>
              </aside>
            </div>
          </div>
        </section>
      </Transition>
    </Teleport>
  </aside>
</template>

<style scoped>
.community-quick-shell {
  bottom: var(--galaxy-dock-bottom, 22px);
  display: flex;
  gap: 6px;
  left: 50%;
  position: fixed;
  transform: translateX(-50%);
  z-index: 80;
}

.community-quick-peek {
  align-items: center;
  backdrop-filter: blur(18px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(168, 85, 247, 0.14));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px 999px 10px 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.86);
  display: flex;
  flex: 0 0 auto;
  height: 22px;
  justify-content: center;
  left: 50%;
  position: absolute;
  top: -18px;
  transform: translateX(-50%);
  width: 58px;
  z-index: 0;
}

.community-quick-peek i {
  animation: community-peek-bob 1.6s ease-in-out infinite;
  font-size: 11px;
}

@keyframes community-peek-bob {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

.community-upcoming-card,
.community-trending-card {
  display: none;
}

@media (max-width: 859px) {
  .community-quick-shell {
    bottom: var(--galaxy-dock-bottom, calc(76px + env(safe-area-inset-bottom)));
  }
}

@media (max-width: 1779px) {
  .community-quick-shell {
    align-items: center;
    backdrop-filter: blur(18px);
    background: rgba(8, 12, 30, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 999px;
    bottom: var(--galaxy-dock-bottom, 22px);
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.32);
    gap: 6px;
    left: 10px;
    max-width: calc(100vw - 20px);
    padding: 6px;
    transform: none;
  }

  .community-quick-shell :deep(.community-rail-nav) {
    background: transparent;
    border: 0;
    box-shadow: none;
    max-width: calc(100vw - 76px);
    padding: 0;
    position: relative;
    z-index: 1;
  }

}

@media (min-width: 1780px) {
  .community-quick-shell {
    bottom: auto;
    display: grid;
    gap: 12px;
    left: max(18px, calc((100vw - 1500px) / 2 - 238px));
    top: var(--public-page-top, 88px);
    transform: none;
    width: 220px;
  }

  .community-quick-peek {
    display: none;
  }

  .community-upcoming-card,
  .community-trending-card {
    backdrop-filter: blur(18px);
    background: rgba(8, 12, 30, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 24px;
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.26);
    display: grid;
    gap: 8px;
    padding: 10px;
  }

  .upcoming-head,
  .trending-head {
    align-items: center;
    color: #ffffff;
    display: flex;
    font-size: 12px;
    font-weight: 950;
    justify-content: space-between;
    min-height: 34px;
  }

  .upcoming-head span,
  .trending-head span {
    align-items: center;
    display: inline-flex;
    gap: 7px;
  }

  .upcoming-head i,
  .trending-head i {
    color: #c084fc;
  }

  .upcoming-clouds {
    display: grid;
    gap: 7px;
  }

  .upcoming-clouds button {
    background: rgba(124, 58, 237, 0.16);
    border: 1px solid rgba(192, 132, 252, 0.18);
    border-radius: 16px;
    color: #ffffff;
    display: grid;
    gap: 3px;
    padding: 10px;
    text-align: left;
  }

  .upcoming-clouds small {
    color: #f0abfc;
    font-size: 9px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .upcoming-clouds strong {
    display: -webkit-box;
    font-size: 12px;
    font-weight: 950;
    line-height: 1.2;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .upcoming-clouds span,
  .community-upcoming-card p {
    color: #cbd5e1;
    font-size: 10px;
    font-weight: 850;
  }

  .upcoming-expand-btn {
    align-items: center;
    background:
      linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(236, 72, 153, 0.82));
    border: 1px solid rgba(244, 214, 255, 0.34);
    border-radius: 16px;
    box-shadow: 0 16px 34px rgba(168, 85, 247, 0.28);
    color: #ffffff;
    display: flex;
    font-size: 11px;
    font-weight: 950;
    justify-content: space-between;
    min-height: 42px;
    padding: 0 12px;
    text-transform: uppercase;
    width: 100%;
  }

  .upcoming-expand-btn span {
    align-items: center;
    display: inline-flex;
    gap: 8px;
  }

  .upcoming-expand-btn:hover,
  .upcoming-expand-btn:focus-visible {
    transform: translateY(-1px);
  }

  .community-trending-card {
    gap: 9px;
  }

  .trending-bubbles {
    display: grid;
    gap: 7px;
  }

  .trending-bubbles button {
    align-items: center;
    background: rgba(124, 58, 237, 0.13);
    border: 1px solid rgba(192, 132, 252, 0.16);
    border-radius: 16px;
    color: #ffffff;
    display: grid;
    gap: 9px;
    grid-template-columns: 34px minmax(0, 1fr);
    min-height: 54px;
    padding: 8px;
    text-align: left;
  }

  .trending-bubbles button > span {
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    border-radius: 999px;
    display: grid;
    height: 34px;
    overflow: hidden;
    place-items: center;
    width: 34px;
  }

  .trending-bubbles img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .trending-bubbles b {
    color: #ffffff;
    font-size: 12px;
    font-weight: 950;
  }

  .trending-bubbles strong {
    display: block;
    font-size: 11px;
    font-weight: 950;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trending-bubbles small,
  .community-trending-card p {
    color: #cbd5e1;
    display: block;
    font-size: 9px;
    font-weight: 850;
    margin-top: 2px;
  }
}

.upcoming-hub-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: fixed;
  z-index: 1200;
}

.upcoming-hub-backdrop {
  background: rgba(4, 6, 18, 0.74);
  backdrop-filter: blur(18px);
  inset: 0;
  position: absolute;
}

.upcoming-hub-card {
  background:
    radial-gradient(circle at 18% 0%, rgba(124, 58, 237, 0.24), transparent 34%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.97), rgba(14, 12, 36, 0.96));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 28px;
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.46);
  color: #ffffff;
  max-height: min(760px, calc(100dvh - 48px));
  max-width: 1120px;
  overflow: hidden;
  padding: 22px;
  position: relative;
  width: min(1120px, calc(100vw - 48px));
}

.upcoming-hub-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.upcoming-hub-head span {
  color: #c084fc;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.upcoming-hub-head h2 {
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 950;
  line-height: 1.05;
  margin-top: 4px;
}

.upcoming-close-btn {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.upcoming-hub-layout {
  display: grid;
  gap: 16px;
  grid-template-areas:
    "communities spotlight calendar"
    "communities events calendar"
    "threads events calendar";
  grid-template-columns: minmax(230px, 0.82fr) minmax(0, 1.08fr) minmax(300px, 0.82fr);
  grid-template-rows: 250px minmax(180px, 1fr) minmax(160px, 0.78fr);
  max-height: calc(100dvh - 160px);
  min-height: 0;
}

.upcoming-spotlight,
.upcoming-event-list,
.upcoming-community-list,
.upcoming-thread-list,
.upcoming-calendar-card {
  background: rgba(7, 10, 22, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  overflow: hidden;
}

.upcoming-community-list,
.upcoming-thread-list {
  display: grid;
  grid-auto-rows: min-content;
  min-height: 0;
  overflow-y: auto;
}

.upcoming-community-list {
  grid-area: communities;
}

.upcoming-thread-list {
  grid-area: threads;
}

.upcoming-panel-title {
  align-items: center;
  background: rgba(7, 10, 22, 0.88);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 14px;
  position: sticky;
  top: 0;
  z-index: 2;
}

.upcoming-panel-title span {
  align-items: center;
  color: #f0abfc;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  gap: 7px;
  text-transform: uppercase;
}

.upcoming-panel-title strong {
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 950;
}

.upcoming-spotlight {
  display: grid;
  grid-area: spotlight;
  min-height: 0;
  position: relative;
}

.upcoming-spotlight img {
  height: 100%;
  inset: 0;
  object-fit: cover;
  opacity: 0.72;
  position: absolute;
  width: 100%;
}

.upcoming-spotlight::after {
  background: linear-gradient(90deg, rgba(5, 7, 18, 0.94), rgba(5, 7, 18, 0.4));
  content: '';
  inset: 0;
  position: absolute;
}

.upcoming-spotlight > div {
  align-self: end;
  display: grid;
  gap: 8px;
  max-width: 560px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.upcoming-spotlight span,
.upcoming-event-list small {
  color: #f0abfc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.upcoming-spotlight h3 {
  font-size: clamp(24px, 3vw, 40px);
  font-weight: 950;
  line-height: 1.05;
}

.upcoming-spotlight p {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
}

.upcoming-spotlight strong {
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
}

.upcoming-event-list {
  display: grid;
  grid-area: events;
  grid-auto-rows: min-content;
  min-height: 0;
  overflow-y: auto;
}

.upcoming-event-list button,
.upcoming-community-list button,
.upcoming-thread-list button {
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  color: #ffffff;
  display: grid;
  gap: 14px;
  grid-template-columns: 64px minmax(0, 1fr);
  min-height: 78px;
  padding: 12px 16px;
  text-align: left;
}

.upcoming-event-list button:hover,
.upcoming-community-list button:hover,
.upcoming-community-list button.active,
.upcoming-thread-list button:hover {
  background: rgba(124, 58, 237, 0.16);
}

.upcoming-event-list button > span,
.upcoming-community-list button > span,
.upcoming-thread-list button > span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  display: grid;
  height: 58px;
  overflow: hidden;
  place-items: center;
  width: 58px;
}

.upcoming-event-list img,
.upcoming-community-list img,
.upcoming-thread-list img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.upcoming-community-list b,
.upcoming-thread-list b {
  color: #ffffff;
  font-size: 13px;
  font-weight: 950;
}

.upcoming-event-list strong,
.upcoming-community-list strong,
.upcoming-thread-list strong {
  display: block;
  font-size: 15px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-event-list em,
.upcoming-community-list small,
.upcoming-thread-list small {
  color: #cbd5e1;
  display: block;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
  margin-top: 4px;
}

.upcoming-event-list p,
.upcoming-thread-list p {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 850;
  padding: 18px;
}

.upcoming-calendar-card {
  display: grid;
  grid-area: calendar;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: 22px;
}

.upcoming-calendar-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.upcoming-calendar-head strong {
  font-size: 18px;
  font-weight: 950;
}

.upcoming-calendar-head span {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.upcoming-calendar-grid {
  align-content: center;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.upcoming-calendar-grid b,
.upcoming-calendar-grid span {
  align-items: center;
  border-radius: 999px;
  display: flex;
  font-size: 13px;
  font-weight: 950;
  height: 34px;
  justify-content: center;
}

.upcoming-calendar-grid b {
  color: #94a3b8;
}

.upcoming-calendar-grid span {
  color: #e5e7eb;
}

.upcoming-calendar-grid span.blank {
  opacity: 0;
}

.upcoming-calendar-grid span.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
}

.upcoming-calendar-grid span.marked:not(.active) {
  border: 1px solid rgba(168, 85, 247, 0.72);
  color: #ffffff;
}

.upcoming-calendar-card > button {
  align-items: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(88, 28, 135, 0.9));
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  gap: 9px;
  justify-content: center;
  min-height: 48px;
}

.upcoming-hub-enter-active,
.upcoming-hub-leave-active {
  transition: opacity 0.2s ease;
}

.upcoming-hub-enter-from,
.upcoming-hub-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .upcoming-hub-modal {
    padding: 12px;
  }

  .upcoming-hub-card {
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    padding: 16px;
    width: calc(100vw - 24px);
  }

  .upcoming-hub-layout {
    grid-template-areas:
      "communities"
      "spotlight"
      "events"
      "threads"
      "calendar";
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    max-height: none;
  }

  .upcoming-spotlight {
    min-height: 240px;
  }

  .upcoming-calendar-card {
    min-height: 420px;
  }
}
</style>
