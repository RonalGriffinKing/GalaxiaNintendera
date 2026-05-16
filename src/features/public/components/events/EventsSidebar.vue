<script setup>
defineProps({
  events: {
    type: Array,
    default: () => []
  },
  reminders: {
    type: Array,
    default: () => []
  },
  communities: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select', 'community'])

const formatDate = (value) => new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

const typeClass = (type = '') => String(type || 'evento').toLowerCase()
</script>

<template>
  <aside class="events-sidebar-premium">
    <section>
      <header>
        <h3>Proximos eventos</h3>
        <button type="button">Ver todos <i class="fas fa-arrow-right"></i></button>
      </header>
      <button v-for="event in events.slice(0, 4)" :key="event.id" type="button" class="side-event" @click="emit('select', event)">
        <img :src="event.backgroundUrl || event.imageUrl || '/src/iconos/Banner.png'" alt="" />
        <span>
          <strong>{{ event.title }}</strong>
          <small>{{ formatDate(event.startsAt) }}</small>
        </span>
        <em :class="typeClass(event.type)">{{ event.type || 'Evento' }}</em>
      </button>
    </section>

    <section>
      <header>
        <h3><i class="fas fa-bell"></i> Recordatorios activos</h3>
        <button type="button">Ver todos <i class="fas fa-arrow-right"></i></button>
      </header>
      <button v-for="event in reminders.slice(0, 3)" :key="event.id" type="button" class="side-event reminder" @click="emit('select', event)">
        <i class="far fa-bell"></i>
        <span>
          <strong>{{ event.title }}</strong>
          <small>{{ formatDate(event.startsAt) }}</small>
        </span>
      </button>
      <p v-if="!reminders.length">Activa recordatorios para no perderte ningun evento importante.</p>
    </section>

    <section>
      <header>
        <h3>Comunidades relacionadas</h3>
        <button type="button">Ver todas <i class="fas fa-arrow-right"></i></button>
      </header>
      <button v-for="community in communities.slice(0, 5)" :key="community.id" type="button" class="side-community" @click="emit('community', community)">
        <img :src="community.iconUrl || '/src/iconos/logo.png'" alt="" />
        <span>
          <strong>{{ community.name }}</strong>
          <small>{{ community.membersCount || 0 }} miembros</small>
        </span>
        <i class="fas fa-plus"></i>
      </button>
    </section>

    <section>
      <h3>Tipos de eventos</h3>
      <div class="event-type-legend">
        <span class="live">Live</span>
        <span class="torneo">Torneo</span>
        <span class="direct">Directo</span>
        <span class="anuncio">Anuncio</span>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.events-sidebar-premium {
  display: grid;
  gap: 14px;
  position: sticky;
  top: calc(var(--public-nav-offset, 72px) + 14px);
}

.events-sidebar-premium section {
  background: rgba(8, 12, 30, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.events-sidebar-premium header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.events-sidebar-premium h3 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 950;
}

.events-sidebar-premium header button {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
}

.side-event,
.side-community {
  align-items: center;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  text-align: left;
}

.side-event img,
.side-community img {
  border-radius: 10px;
  height: 54px;
  object-fit: cover;
  width: 54px;
}

.side-event strong,
.side-community strong {
  display: block;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.2;
}

.side-event small,
.side-community small,
.events-sidebar-premium p {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.side-event em {
  border-radius: 999px;
  font-size: 9px;
  font-style: normal;
  font-weight: 950;
  padding: 5px 7px;
  text-transform: uppercase;
}

.side-event .live,
.event-type-legend .live { background: rgba(239, 68, 68, 0.22); color: #fecaca; }
.side-event .direct,
.event-type-legend .direct { background: rgba(124, 58, 237, 0.26); color: #d8b4fe; }
.side-event .torneo,
.event-type-legend .torneo { background: rgba(250, 204, 21, 0.18); color: #fde68a; }
.side-event .anuncio,
.event-type-legend .anuncio { background: rgba(56, 189, 248, 0.18); color: #bae6fd; }

.side-event.reminder {
  grid-template-columns: 44px minmax(0, 1fr);
}

.side-event.reminder > i,
.side-community > i {
  align-items: center;
  background: rgba(124, 58, 237, 0.22);
  border-radius: 12px;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.event-type-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-type-legend span {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 950;
  padding: 6px 8px;
  text-transform: uppercase;
}

@media (max-width: 1180px) {
  .events-sidebar-premium {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: static;
  }
}

@media (max-width: 680px) {
  .events-sidebar-premium {
    grid-template-columns: 1fr;
  }
}
</style>
