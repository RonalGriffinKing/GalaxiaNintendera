<script setup>
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
  liveGoalCards: {
    type: Array,
    default: () => []
  },
  canManageOfficialContent: {
    type: Boolean,
    default: false
  },
  expandedLiveGoalId: {
    type: String,
    default: ''
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
  'open-live-goal-manager',
  'toggle-live-goal',
  'add-live-goal-like',
  'toggle-live-mission-item',
  'delete-live-goal',
  'open-profile'
])
</script>

<template>
  <aside class="community-side">
    <div v-if="youtubeLiveUrl && !isOfficial" class="side-box live-box">
      <span class="live-pill">
        <i class="fas fa-circle"></i>
        En vivo ahora
      </span>
      <div class="side-live-frame">
        <iframe
          :src="youtubeLiveUrl"
          title="Directo de YouTube de GalaxiaNintendera"
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        ></iframe>
      </div>
      <a :href="youtubeChannelUrl" target="_blank" rel="noreferrer">Ver en YouTube</a>
    </div>

    <div v-else-if="isAdmin && !isOfficial" class="side-box live-box setup-only">
      <span class="live-pill"><i class="fas fa-circle"></i> YouTube</span>
      <h2>Falta configurar Channel ID</h2>
      <p>Este aviso solo se muestra para admin. Agrega VITE_YOUTUBE_CHANNEL_ID en tus variables de entorno para activar el live.</p>
    </div>

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
          :style="{ '--event-bg': `url(${event.backgroundUrl || event.imageUrl || '/src/iconos/Banner.png'})` }"
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

    <div v-if="canManageOfficialContent" class="side-box live-goals-box">
      <div class="side-box-head">
        <div>
          <h2>Metas del live</h2>
          <span>{{ liveGoalCards.length }} activos</span>
        </div>
        <button type="button" class="event-manager-btn" @click="emit('open-live-goal-manager')">
          <i class="fas fa-trophy"></i>
          Crear
        </button>
      </div>

      <div v-if="liveGoalCards.length" class="live-goal-stack">
        <article
          v-for="goal in liveGoalCards"
          :key="goal.id"
          class="live-goal-card"
          :class="{ mission: goal.type === 'mission', complete: goal.progress >= 100 }"
        >
          <button class="live-goal-summary" type="button" @click="emit('toggle-live-goal', goal)">
            <span class="live-goal-orb">
              <i :class="goal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
            </span>
            <span>
              <em>{{ goal.type === 'mission' ? 'Mision' : 'Meta de likes' }}</em>
              <strong>{{ goal.title }}</strong>
              <small>{{ goal.current }} / {{ goal.target }} {{ goal.type === 'mission' ? 'pasos' : 'likes' }}</small>
            </span>
            <i class="fas fa-chevron-down"></i>
          </button>

          <div class="live-goal-progress">
            <i :style="{ width: goal.progress + '%' }"></i>
          </div>

          <p v-if="goal.description">{{ goal.description }}</p>

          <div v-if="goal.type !== 'mission'" class="live-goal-like-row">
            <button type="button" class="live-goal-like-btn" @click="emit('add-live-goal-like', goal)">
              <i class="fas fa-heart"></i>
              Dar like
            </button>
            <div v-if="goal.ranking.length" class="live-goal-avatars">
              <button
                v-for="user in goal.ranking.slice(0, 4)"
                :key="user.uid"
                type="button"
                :title="`${user.name}: ${user.count}`"
                @click="emit('toggle-live-goal', goal)"
              >
                <img v-if="user.imageUrl" :src="user.imageUrl" alt="" />
                <span v-else>{{ avatarInitial(user.name) }}</span>
              </button>
            </div>
          </div>

          <div v-if="expandedLiveGoalId === goal.id" class="live-goal-detail">
            <div v-if="goal.type === 'mission'" class="live-mission-list">
              <button
                v-for="item in goal.checklist"
                :key="item.id"
                type="button"
                :class="{ done: item.done }"
                :disabled="!canManageOfficialContent"
                @click="emit('toggle-live-mission-item', goal, item)"
              >
                <i :class="item.done ? 'fas fa-check' : 'far fa-circle'"></i>
                {{ item.label }}
              </button>
            </div>

            <div v-else class="live-like-ranking">
              <strong>Ranking de likes</strong>
              <button
                v-for="user in goal.ranking"
                :key="`rank-${goal.id}-${user.uid}`"
                type="button"
                @click="emit('open-profile', { uid: user.uid, name: user.name, imageUrl: user.imageUrl })"
              >
                <img v-if="user.imageUrl" :src="user.imageUrl" alt="" />
                <span v-else>{{ avatarInitial(user.name) }}</span>
                <em>{{ user.name }}</em>
                <small>{{ user.count }}</small>
              </button>
              <p v-if="!goal.ranking.length">Todavia nadie ha dado like.</p>
            </div>

            <button v-if="canManageOfficialContent" class="live-goal-delete" type="button" @click="emit('delete-live-goal', goal)">
              <i class="fas fa-trash"></i>
              Eliminar
            </button>
          </div>
        </article>
      </div>

      <p v-else>Crea metas de likes o misiones para el proximo directo.</p>
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
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  color: #f8fafc;
  display: grid;
  gap: 5px;
  min-height: 112px;
  overflow: hidden;
  padding: 12px 54px 12px 12px;
  position: relative;
  text-align: left;
}

.galaxy-calendar-box {
  padding: 16px;
}

.galaxy-calendar-box .event-stack {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
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

.live-goals-box {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(145deg, rgba(11, 16, 38, 0.98), rgba(24, 16, 50, 0.96));
  border-color: rgba(216, 180, 254, 0.22);
  color: #f8fafc;
}

.live-goals-box h2 {
  color: #ffffff;
}

.live-goals-box > p {
  color: #b8c1d8;
}

.live-goal-stack {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.live-goal-card {
  background: rgba(248, 250, 252, 0.94);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 16px;
  color: #111827;
  display: grid;
  gap: 10px;
  overflow: hidden;
  padding: 12px;
}

.live-goal-card.complete {
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.94));
  border-color: rgba(245, 158, 11, 0.52);
}

.live-goal-summary {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) 20px;
  text-align: left;
}

.live-goal-orb {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.live-goal-card.mission .live-goal-orb {
  background: linear-gradient(135deg, #2563eb, #06b6d4);
}

.live-goal-summary em {
  color: #7c3aed;
  display: block;
  font-size: 9px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}

.live-goal-summary strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.live-goal-summary small {
  color: #64748b;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-top: 2px;
}

.live-goal-progress {
  background: #e2e8f0;
  border-radius: 999px;
  height: 9px;
  overflow: hidden;
}

.live-goal-progress i {
  background: linear-gradient(90deg, #9333ea, #ec4899, #f59e0b);
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 0.42s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.live-goal-card > p {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
  margin: 0;
}

.live-goal-like-row {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.live-goal-like-btn {
  align-items: center;
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(236, 72, 153, 0.24);
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
}

.live-goal-like-btn:active {
  transform: scale(0.96);
}

.live-goal-avatars {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.live-goal-avatars button {
  border: 2px solid #ffffff;
  border-radius: 999px;
  height: 30px;
  margin-left: -8px;
  overflow: hidden;
  width: 30px;
}

.live-goal-avatars img,
.live-goal-avatars span,
.live-like-ranking img,
.live-like-ranking > button > span {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.live-goal-avatars span,
.live-like-ranking > button > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-size: 10px;
  font-weight: 950;
  justify-content: center;
}

.live-goal-detail {
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  display: grid;
  gap: 8px;
  padding: 10px;
}

.live-mission-list,
.live-like-ranking {
  display: grid;
  gap: 7px;
}

.live-mission-list button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #475569;
  display: flex;
  font-size: 11px;
  font-weight: 850;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  text-align: left;
}

.live-mission-list button.done {
  background: #ecfdf5;
  border-color: #86efac;
  color: #15803d;
}

.live-mission-list button:disabled {
  cursor: default;
  opacity: 1;
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

.live-goal-delete {
  align-items: center;
  background: #fff1f2;
  border-radius: 10px;
  color: #e11d48;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 34px;
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
