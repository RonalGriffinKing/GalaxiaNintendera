<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/firebase'
import EventEditorModal from '@/features/public/components/EventEditorModal.vue'
import EventDetailModal from '@/features/public/components/events/EventDetailModal.vue'
import EventPremiumCard from '@/features/public/components/events/EventPremiumCard.vue'
import EventsCalendar from '@/features/public/components/events/EventsCalendar.vue'
import EventsHero from '@/features/public/components/events/EventsHero.vue'
import EventsSidebar from '@/features/public/components/events/EventsSidebar.vue'
import EventsTabs from '@/features/public/components/events/EventsTabs.vue'

const route = useRoute()
const router = useRouter()

const events = ref([])
const communities = ref([])
const currentUser = ref(auth.currentUser)
const currentRole = ref('user')
const activeTab = ref('calendar')
const detailEvent = ref(null)
const editorOpen = ref(false)
const editingEvent = ref(null)

let unsubscribeEvents = null
let unsubscribeCommunities = null
let unsubscribeAuth = null

const isAdmin = computed(() => currentRole.value === 'admin')
const upcomingEvents = computed(() => events.value.filter(event => event.startsAt >= Date.now()).slice(0, 20))
const visibleEvents = computed(() => {
  if (activeTab.value === 'featured') return upcomingEvents.value.filter(event => event.featured || ['Live', 'Direct', 'Torneo'].includes(event.type))
  return upcomingEvents.value
})
const reminders = computed(() => events.value.filter(isNotified))
const relatedCommunities = computed(() => {
  const ids = new Set(events.value.flatMap(event => event.communityIds || (event.communityId ? [event.communityId] : [])))
  return communities.value.filter(community => ids.has(community.id)).slice(0, 8)
})

const getMillis = (value) => typeof value === 'number' ? value : value?.toDate?.().getTime?.() || new Date(value || '').getTime() || 0
const eventCommunities = (event) => {
  const ids = new Set(event?.communityIds || (event?.communityId ? [event.communityId] : []))
  const matched = communities.value.filter(community => ids.has(community.id))
  if (matched.length) return matched
  return (event?.communityNames || []).map((name, index) => ({ id: `${event.id}-community-${index}`, name, iconUrl: '' }))
}
const isNotified = (event) => Boolean(currentUser.value?.uid && Array.isArray(event.notifyBy) && event.notifyBy.includes(currentUser.value.uid))
const googleCalendarUrl = (event) => {
  const start = new Date(event.startsAt).toISOString().replace(/[-:]|\.\d{3}/g, '')
  const end = new Date(event.startsAt + Number(event.durationMinutes || 60) * 60000).toISOString().replace(/[-:]|\.\d{3}/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Evento Galaxia Nintendera',
    dates: `${start}/${end}`,
    details: `${event.description || ''}\n${event.url || ''}`
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const openEditor = (event = null) => {
  if (!isAdmin.value) return
  editingEvent.value = event
  editorOpen.value = true
}

const closeEditor = () => {
  editingEvent.value = null
  editorOpen.value = false
  if (route.query.create === 'event') router.replace({ path: route.path, query: { ...route.query, create: undefined } })
}

const openDetails = (event) => {
  detailEvent.value = event
  router.replace({ path: route.path, query: { ...route.query, id: event.id } })
}

const closeDetails = () => {
  detailEvent.value = null
  if (route.query.id) router.replace({ path: route.path, query: { ...route.query, id: undefined } })
}

const toggleNotify = async (event) => {
  if (!currentUser.value) {
    router.push('/login?mode=login')
    return
  }
  await updateDoc(doc(db, 'galaxyEvents', event.id), {
    notifyBy: isNotified(event) ? arrayRemove(currentUser.value.uid) : arrayUnion(currentUser.value.uid)
  })
}

const toggleFeatured = async (event) => {
  if (!isAdmin.value) return
  await updateDoc(doc(db, 'galaxyEvents', event.id), {
    featured: !event.featured,
    updatedAt: Date.now()
  })
}

const deleteEvent = async (event) => {
  if (!isAdmin.value || !event?.id) return
  await deleteDoc(doc(db, 'galaxyEvents', event.id))
  if (detailEvent.value?.id === event.id) closeDetails()
}

const openCalendar = (event) => {
  window.open(googleCalendarUrl(event), '_blank', 'noreferrer')
}

const shareEvent = async (event) => {
  const url = `${window.location.origin}/eventos?id=${event.id}`
  if (navigator.share) {
    await navigator.share({ title: event.title, text: event.description || 'Evento de Galaxia Nintendera', url }).catch(() => {})
    return
  }
  await navigator.clipboard?.writeText(url)
}

const openSocialImage = (event) => {
  if (!isAdmin.value || !event?.id) return
  router.push(`/admin/post-share/${event.id}?type=event`)
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    currentRole.value = 'user'
    if (user) {
      const snap = await getDoc(doc(db, 'users', user.uid)).catch(() => null)
      currentRole.value = snap?.data()?.role || 'user'
    }
  })

  unsubscribeEvents = onSnapshot(query(collection(db, 'galaxyEvents'), orderBy('startsAt', 'asc')), (snap) => {
    events.value = snap.docs.map(item => ({ id: item.id, notifyBy: [], ...item.data(), startsAt: getMillis(item.data().startsAt) }))
    if (route.query.id) {
      const found = events.value.find(event => event.id === route.query.id)
      if (found) detailEvent.value = found
    }
  })

  unsubscribeCommunities = onSnapshot(query(collection(db, 'communities'), orderBy('createdAt', 'asc')), (snap) => {
    communities.value = snap.docs.map(item => ({ id: item.id, ...item.data() }))
  })
})

watch([() => route.query.create, isAdmin], ([create]) => {
  if (create === 'event' && isAdmin.value) openEditor()
}, { immediate: true })

watch(() => route.query.id, (id) => {
  if (!id) {
    detailEvent.value = null
    return
  }
  const found = events.value.find(event => event.id === id)
  if (found) detailEvent.value = found
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeEvents?.()
  unsubscribeCommunities?.()
})
</script>

<template>
  <main class="events-page-premium">
    <div class="events-page-inner">
      <EventsHero :can-create="isAdmin" @create="openEditor()" />
      <EventsTabs v-model="activeTab" />

      <section class="events-premium-layout">
        <EventsCalendar
          :events="upcomingEvents"
          :selected-id="detailEvent?.id || ''"
          @select="openDetails"
        />

        <section class="events-premium-feed">
          <EventPremiumCard
            v-for="event in visibleEvents"
            :key="event.id"
            :event="event"
            :communities="eventCommunities(event)"
            :is-admin="isAdmin"
            :notified="isNotified(event)"
            @notify="toggleNotify(event)"
            @details="openDetails(event)"
            @calendar="openCalendar(event)"
            @share="shareEvent(event)"
            @social="openSocialImage(event)"
            @edit="openEditor(event)"
            @feature="toggleFeatured(event)"
            @delete="deleteEvent(event)"
          />

          <div v-if="!visibleEvents.length" class="events-empty-state">
            <i class="far fa-calendar"></i>
            <strong>No hay eventos proximos.</strong>
            <p>Cuando la galaxia programe algo importante, aparecera aqui.</p>
          </div>
        </section>

        <EventsSidebar
          :events="upcomingEvents"
          :reminders="reminders"
          :communities="relatedCommunities"
          @select="openDetails"
          @community="community => router.push(`/comunidad?id=${community.id}`)"
        />
      </section>
    </div>

    <EventDetailModal
      v-if="detailEvent"
      :event="detailEvent"
      :communities="eventCommunities(detailEvent)"
      :notified="isNotified(detailEvent)"
      :is-admin="isAdmin"
      @close="closeDetails"
      @notify="toggleNotify(detailEvent)"
      @calendar="openCalendar(detailEvent)"
      @edit="openEditor(detailEvent)"
      @delete="deleteEvent(detailEvent)"
    />

    <EventEditorModal
      v-if="editorOpen"
      :event="editingEvent"
      :communities="communities"
      @close="closeEditor"
      @saved="editingEvent = null"
    />
  </main>
</template>

<style scoped>
.events-page-premium {
  background:
    radial-gradient(circle at 70% 8%, rgba(124, 58, 237, 0.22), transparent 28%),
    linear-gradient(180deg, #050816, #0b0620 58%, #050816);
  color: #ffffff;
  min-height: 100vh;
  padding: var(--public-page-top, 88px) 24px 42px;
}

.events-page-inner {
  display: grid;
  gap: 16px;
  margin: 0 auto;
  max-width: min(1500px, calc(100vw - 48px));
}

.events-premium-layout {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: 320px minmax(0, 1fr) 320px;
}

.events-premium-feed {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.events-premium-feed > * {
  min-width: 0;
}

.events-premium-feed :deep(.event-news-card) {
  aspect-ratio: 16 / 11;
  background: #080c1e;
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 18px;
  color: #ffffff;
  display: block;
  min-height: 340px;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.events-premium-feed :deep(.event-news-card > img) {
  display: block;
  height: 100%;
  inset: 0;
  object-fit: cover;
  position: absolute;
  width: 100%;
}

.events-premium-feed :deep(.event-news-shade) {
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.08) 0%, rgba(2, 6, 23, 0.58) 46%, rgba(2, 6, 23, 0.95) 100%),
    linear-gradient(90deg, rgba(2, 6, 23, 0.34), transparent 58%);
  inset: 0;
  position: absolute;
}

.events-premium-feed :deep(.event-news-front) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  inset: 0;
  padding: 16px;
  position: absolute;
  z-index: 1;
}

.events-premium-feed :deep(.event-news-front header),
.events-premium-feed :deep(.event-news-front footer) {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  min-width: 0;
}

.events-premium-feed :deep(.event-news-front section) {
  align-self: end;
  display: grid;
  gap: 7px;
  padding-bottom: 16px;
}

.events-premium-feed :deep(.event-news-front h2) {
  color: #ffffff;
  font-size: clamp(22px, 2.7vw, 31px);
  font-weight: 950;
  line-height: 1.02;
  margin: 0;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
}

.events-premium-feed :deep(.event-news-front p) {
  color: #e5e7eb;
  display: -webkit-box;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.events-premium-feed :deep(.event-type-badge) {
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  padding: 7px 10px;
  text-transform: uppercase;
}

.events-premium-feed :deep(.event-type-badge.live) { background: #e11d48; }
.events-premium-feed :deep(.event-type-badge.direct) { background: rgba(124, 58, 237, 0.9); }
.events-premium-feed :deep(.event-type-badge.torneo) { background: #ca8a04; }
.events-premium-feed :deep(.event-type-badge.anuncio) { background: rgba(14, 165, 233, 0.82); }

.events-premium-feed :deep(.event-news-front time) {
  align-items: center;
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  display: grid;
  justify-items: center;
  min-width: 54px;
  padding: 7px;
  text-transform: uppercase;
}

.events-premium-feed :deep(.event-news-front time strong) {
  font-size: 25px;
  font-weight: 950;
  line-height: 0.9;
}

.events-premium-feed :deep(.event-news-front time small),
.events-premium-feed :deep(.event-news-front time em) {
  color: #e5e7eb;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.events-premium-feed :deep(.event-community-stack),
.events-premium-feed :deep(.event-news-actions) {
  align-items: center;
  display: flex;
}

.events-premium-feed :deep(.event-news-actions) {
  gap: 9px;
}

.events-premium-feed :deep(.event-community-stack span),
.events-premium-feed :deep(.event-community-stack em) {
  align-items: center;
  background: rgba(124, 58, 237, 0.38);
  border: 2px solid rgba(8, 12, 30, 0.88);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
  height: 32px;
  justify-content: center;
  margin-right: -8px;
  overflow: hidden;
  width: 32px;
}

.events-premium-feed :deep(.event-community-stack img) {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.events-premium-feed :deep(.event-news-actions button) {
  align-items: center;
  background: rgba(5, 8, 22, 0.58);
  border: 1px solid rgba(168, 85, 247, 0.48);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.events-premium-feed :deep(.event-card-options) {
  background:
    radial-gradient(circle at 90% 0%, rgba(124, 58, 237, 0.18), transparent 38%),
    rgba(5, 8, 22, 0.98);
  display: grid;
  gap: 18px;
  grid-template-rows: auto minmax(0, 1fr);
  inset: 0;
  padding: 16px;
  position: absolute;
  z-index: 3;
}

.events-empty-state {
  align-items: center;
  background: rgba(8, 12, 30, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  color: #cbd5e1;
  display: grid;
  justify-items: center;
  min-height: 260px;
  padding: 28px;
  text-align: center;
  grid-column: 1 / -1;
}

.events-empty-state i {
  color: #c084fc;
  font-size: 34px;
}

.events-empty-state strong {
  color: #ffffff;
  font-size: 20px;
  font-weight: 950;
}

.events-empty-state p {
  font-weight: 800;
}

@media (max-width: 1180px) {
  .events-premium-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .events-premium-feed {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .events-page-premium {
    padding: var(--public-page-top-mobile, 76px) 10px calc(120px + env(safe-area-inset-bottom));
  }

  .events-page-inner {
    max-width: 100%;
  }
}
</style>
