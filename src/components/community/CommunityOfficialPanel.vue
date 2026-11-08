<script setup>
import { defaultBannerUrl, resolveAssetUrl } from '@/constants/assets'

defineProps({
  youtubeLiveUrl: {
    type: String,
    default: ''
  },
  youtubeChannelUrl: {
    type: String,
    default: ''
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  upcomingEvents: {
    type: Array,
    default: () => []
  },
  canManageOfficialContent: {
    type: Boolean,
    default: false
  },
  activeUsers: {
    type: Array,
    default: () => []
  },
  trendingTopics: {
    type: Array,
    default: () => []
  },
  formatEventDate: {
    type: Function,
    default: () => ''
  },
  isEventNotified: {
    type: Function,
    default: () => false
  },
  avatarInitial: {
    type: Function,
    default: () => ''
  }
})

const emit = defineEmits([
  'open-events',
  'open-event',
  'toggle-event-notify',
  'open-profile'
])
</script>

<template>
  <aside class="community-side">
    <div class="side-box galaxy-calendar-box">
      <div class="side-box-head">
        <div>
          <h2>Calendario global</h2>
          <span>{{ upcomingEvents.length }} proximos</span>
        </div>
        <button type="button" class="event-manager-btn" @click="emit('open-events')">
          <i class="far fa-calendar"></i>
          Ver eventos
        </button>
      </div>

      <div v-if="upcomingEvents.length" class="event-stack">
        <button
          v-for="event in upcomingEvents"
          :key="event.id"
          class="event-mini-card"
          type="button"
          :style="{ '--event-bg': `url(${resolveAssetUrl(event.backgroundUrl || event.imageUrl, defaultBannerUrl)})` }"
          @click="emit('open-event', event)"
        >
          <span>{{ event.type || 'Evento' }}</span>
          <strong>{{ event.title }}</strong>
          <small><i class="far fa-calendar"></i> {{ formatEventDate(event.startsAt) }}</small>
          <p v-if="event.description">{{ event.description }}</p>
          <em
            class="event-notify-mini"
            :class="{ active: isEventNotified(event) }"
            role="button"
            tabindex="0"
            @click.stop="emit('toggle-event-notify', event)"
            @keydown.enter.stop.prevent="emit('toggle-event-notify', event)"
            @keydown.space.stop.prevent="emit('toggle-event-notify', event)"
          >
            <i :class="isEventNotified(event) ? 'fas fa-bell' : 'far fa-bell'"></i>
          </em>
        </button>
      </div>

      <p v-else>No hay eventos programados todavia.</p>
    </div>

    <div class="side-box">
      <h2>Usuarios activos</h2>

      <div v-if="activeUsers.length">
        <div v-for="user in activeUsers" :key="user.id || user.name" class="user-row">
          <button class="user-row-avatar profile-trigger" type="button" @click="emit('open-profile', user)">
            <img v-if="user.imageUrl" :src="user.imageUrl" alt="" />
            <span v-else>{{ user.name.slice(0, 2).toUpperCase() }}</span>
          </button>
          <div>
            <button type="button" @click="emit('open-profile', user)">
              <strong>{{ user.name }}</strong>
            </button>
            <p>{{ user.action }}</p>
          </div>
        </div>
      </div>

      <p v-else>Apareceran aqui cuando la comunidad empiece a publicar y responder.</p>
    </div>

    <div class="side-box trend-box">
      <h2>Temas en tendencia</h2>
      <button v-for="[topic, count] in trendingTopics" :key="topic" type="button">
        #{{ topic }}
        <span>{{ count }} posts</span>
      </button>
      <p v-if="!trendingTopics.length">Apareceran cuando existan hilos reales.</p>
    </div>

    <div class="side-box rules-box">
      <h2>Reglas de la comunidad</h2>
      <ol>
        <li>Se respetuoso con todos los miembros.</li>
        <li>No spam ni contenido sin relacion.</li>
        <li>No spoilers sin etiqueta.</li>
        <li>Nada de contenido ofensivo.</li>
      </ol>
    </div>
  </aside>
</template>

<style scoped>
.community-side {
  display: grid;
  gap: 14px;
  min-width: 0;
  position: sticky;
  top: 0;
}

.side-box {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  padding: 18px;
}

.side-box h2 {
  color: #111827;
  font-size: 15px;
  font-weight: 900;
}

.side-box p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
  margin-top: 8px;
}

.live-box {
  background: #ffffff;
  color: #111827;
}

.live-box h2,
.live-box p {
  color: #111827;
}

.live-pill {
  align-items: center;
  background: #fee2e2;
  border-radius: 999px;
  color: #dc2626;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  margin-bottom: 12px;
  padding: 6px 10px;
  text-transform: uppercase;
}

.live-pill i {
  color: #ef4444;
  font-size: 8px;
}

.side-live-frame {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 14px;
  margin: 12px 0;
  overflow: hidden;
}

.side-live-frame iframe {
  border: 0;
  height: 100%;
  width: 100%;
}

.live-box a {
  align-items: center;
  background: linear-gradient(to right, #7c3aed, #c026d3);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  justify-content: center;
  min-height: 40px;
}

.side-box-head {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.side-box-head > div {
  min-width: 0;
}

.side-box-head span {
  color: #c084fc;
  display: block;
  font-size: 10px;
  font-weight: 950;
  margin-top: 2px;
  text-transform: uppercase;
}

.event-manager-btn {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
}

.event-stack {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.event-mini-card {
  background:
    linear-gradient(180deg, rgba(8, 12, 30, 0.22), rgba(8, 12, 30, 0.9)),
    var(--event-bg, none) center / cover,
    rgba(8, 12, 30, 0.72);
  border: 0;
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
  color: #f8fafc;
  display: grid;
  gap: 5px;
  min-height: 112px;
  overflow: hidden;
  isolation: isolate;
  padding: 12px 54px 12px 12px;
  position: relative;
  text-align: left;
}

.event-mini-card::after {
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(216, 180, 254, 0.12);
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 1;
}

.event-mini-card > * {
  position: relative;
  z-index: 2;
}

.galaxy-calendar-box {
  padding: 16px;
}

.galaxy-calendar-box .event-stack {
  max-height: 220px;
  overflow-y: auto;
  padding: 0 2px 1px 0;
}

.event-mini-card span {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.event-mini-card strong {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
}

.event-mini-card small,
.event-mini-card p {
  color: #b8c1d8;
  font-size: 11px;
  font-weight: 800;
}

.event-mini-card p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-notify-mini {
  align-items: center;
  background: rgba(5, 8, 22, 0.72);
  border: 1px solid rgba(216, 180, 254, 0.28);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-style: normal;
  height: 36px;
  justify-content: center;
  position: absolute;
  right: 12px;
  top: 12px;
  width: 36px;
}

.event-notify-mini.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  box-shadow: 0 0 18px rgba(236, 72, 153, 0.32);
}

.live-like-ranking img,
.live-like-ranking > button > span {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.live-like-ranking > button > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-size: 10px;
  font-weight: 950;
  justify-content: center;
}

.live-like-ranking {
  display: grid;
  gap: 7px;
}

.live-like-ranking > strong {
  color: #111827;
  font-size: 11px;
  font-weight: 950;
}

.live-like-ranking > button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 8px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  min-height: 38px;
  padding: 5px 8px;
  text-align: left;
}

.live-like-ranking img,
.live-like-ranking > button > span {
  border-radius: 999px;
  height: 28px;
  overflow: hidden;
  width: 28px;
}

.live-like-ranking em {
  color: #111827;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-like-ranking small {
  background: #f3e8ff;
  border-radius: 999px;
  color: #7c3aed;
  font-size: 10px;
  font-weight: 950;
  padding: 4px 7px;
}

.live-like-ranking p {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
  margin: 0;
}

.user-row {
  align-items: center;
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
}

.user-row-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 11px;
  font-weight: 900;
  height: 34px;
  justify-content: center;
  overflow: hidden;
  width: 34px;
}

.profile-trigger {
  border: 0;
  cursor: pointer;
  padding: 0;
}

.user-row-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.user-row-avatar span {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  width: 100%;
}

.user-row button:not(.user-row-avatar) {
  text-align: left;
}

.user-row button:not(.user-row-avatar):hover strong {
  color: #7c3aed;
}

.user-row strong {
  color: #111827;
  display: block;
  font-size: 12px;
  font-weight: 900;
}

.user-row p {
  font-size: 11px;
  margin-top: 2px;
}

.trend-box,
.rules-box {
  display: grid;
  gap: 10px;
}

.trend-box button {
  color: #4f46e5;
  display: grid;
  font-size: 13px;
  font-weight: 900;
  text-align: left;
}

.trend-box span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  margin-top: 2px;
}

.rules-box ol {
  color: #64748b;
  display: grid;
  font-size: 12px;
  font-weight: 750;
  gap: 9px;
  list-style-position: inside;
}

@media (max-width: 980px) {
  .community-side {
    position: static;
  }
}
</style>
