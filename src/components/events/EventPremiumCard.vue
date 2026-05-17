<script setup>
import { ref } from 'vue'
import EventCountdown from './EventCountdown.vue'

const props = defineProps({
  event: {
    type: Object,
    required: true
  },
  communities: {
    type: Array,
    default: () => []
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  notified: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['notify', 'details', 'calendar', 'share', 'social', 'edit', 'feature', 'delete'])
const optionsOpen = ref(false)

const typeClass = (type = '') => String(type || 'evento').toLowerCase()
const month = (value) => new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(value)).replace('.', '')
const day = (value) => new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(new Date(value))
const time = (value) => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

const run = (eventName) => {
  optionsOpen.value = false
  emit(eventName)
}
</script>

<template>
  <article class="event-news-card" :class="{ options: optionsOpen }">
    <img :src="event.backgroundUrl || event.imageUrl || '/src/iconos/Banner.png'" alt="" />
    <div class="event-news-shade"></div>

    <div class="event-news-front">
      <header>
        <span :class="['event-type-badge', typeClass(event.type)]">{{ event.type || 'Evento' }}</span>
        <time>
          <strong>{{ day(event.startsAt) }}</strong>
          <small>{{ month(event.startsAt) }}</small>
          <em>{{ time(event.startsAt) }}</em>
        </time>
      </header>

      <section>
        <h2>{{ event.title }}</h2>
        <p>{{ event.description || 'Evento de Galaxia Nintendera para toda la comunidad.' }}</p>
      </section>

      <footer>
        <div class="event-community-stack">
          <span v-for="community in communities.slice(0, 3)" :key="community.id">
            <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
            <i v-else class="fas fa-users"></i>
          </span>
          <em v-if="communities.length > 3">+{{ communities.length - 3 }}</em>
        </div>

        <div class="event-news-actions">
          <button type="button" class="notify" :class="{ active: notified }" aria-label="Notificarme" @click="emit('notify')">
            <i :class="notified ? 'fas fa-bell' : 'far fa-bell'"></i>
          </button>
          <button type="button" aria-label="Opciones" @click="optionsOpen = true">
            <i class="fas fa-ellipsis"></i>
          </button>
        </div>
      </footer>
    </div>

    <Transition name="event-card-options">
      <div v-if="optionsOpen" class="event-card-options">
        <button class="event-options-close" type="button" aria-label="Volver" @click="optionsOpen = false">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div>
          <h3>{{ event.title }}</h3>
          <EventCountdown :starts-at="event.startsAt" compact />
        </div>

        <nav>
          <button type="button" @click="run('details')">
            <i class="far fa-circle-info"></i>
            Ver detalles
          </button>
          <button type="button" @click="run('calendar')">
            <i class="far fa-calendar-plus"></i>
            Agregar calendario
          </button>
          <button type="button" @click="run('share')">
            <i class="fas fa-share-nodes"></i>
            Compartir
          </button>
          <button v-if="isAdmin" type="button" title="Generar imagen social" aria-label="Generar imagen social" @click="run('social')">
            <i class="far fa-images"></i>
          </button>
          <button v-if="isAdmin" type="button" @click="run('edit')">
            <i class="fas fa-pen"></i>
            Editar
          </button>
          <button v-if="isAdmin" type="button" @click="run('feature')">
            <i :class="event.featured ? 'fas fa-star' : 'far fa-star'"></i>
            {{ event.featured ? 'Quitar destacado' : 'Destacar' }}
          </button>
          <button v-if="isAdmin" type="button" class="danger" @click="run('delete')">
            <i class="fas fa-trash"></i>
            Eliminar
          </button>
        </nav>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
.event-news-card {
  aspect-ratio: 16 / 11 !important;
  background: #080c1e !important;
  border: 1px solid rgba(168, 85, 247, 0.38) !important;
  border-radius: 18px !important;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.26);
  color: #ffffff;
  display: block !important;
  isolation: isolate;
  min-height: 360px !important;
  overflow: hidden !important;
  position: relative !important;
  width: 100% !important;
}

.event-news-card > img {
  display: block !important;
  height: 100% !important;
  inset: 0 !important;
  max-width: none !important;
  object-fit: cover !important;
  position: absolute !important;
  width: 100% !important;
  z-index: 0 !important;
}

.event-news-shade {
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.08) 0%, rgba(2, 6, 23, 0.56) 46%, rgba(2, 6, 23, 0.94) 100%),
    linear-gradient(90deg, rgba(2, 6, 23, 0.38), transparent 56%);
  inset: 0 !important;
  position: absolute !important;
  z-index: 1 !important;
}

.event-news-front {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100% !important;
  inset: 0 !important;
  padding: 18px;
  position: absolute !important;
  z-index: 2 !important;
}

.event-news-front header,
.event-news-front footer {
  align-items: start;
  display: flex;
  justify-content: space-between;
  min-width: 0;
}

.event-type-badge {
  border-radius: 999px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 950;
  padding: 7px 10px;
  text-transform: uppercase;
}

.event-type-badge.live { background: #e11d48; }
.event-type-badge.direct { background: rgba(124, 58, 237, 0.9); }
.event-type-badge.torneo { background: #ca8a04; }
.event-type-badge.anuncio { background: rgba(14, 165, 233, 0.82); }
.event-type-badge.comunidad { background: rgba(22, 163, 74, 0.82); }

.event-news-front time {
  align-items: center;
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  display: grid;
  justify-items: center;
  min-width: 58px;
  padding: 8px 8px 7px;
  text-transform: uppercase;
}

.event-news-front time strong {
  font-size: 28px;
  font-weight: 950;
  line-height: 0.9;
}

.event-news-front time small {
  color: #e5e7eb;
  font-size: 11px;
  font-weight: 950;
}

.event-news-front time em {
  color: #cbd5e1;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}

.event-news-front section {
  align-self: end;
  display: grid;
  gap: 7px;
  padding-bottom: 18px;
}

.event-news-front h2 {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 950;
  line-height: 1.02;
  margin: 0;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
}

.event-news-front p {
  color: #e5e7eb;
  display: -webkit-box;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.4;
  margin: 0;
  max-width: 540px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-community-stack {
  align-items: center;
  display: flex;
  min-width: 0;
}

.event-community-stack span,
.event-community-stack em {
  align-items: center;
  background: rgba(124, 58, 237, 0.38);
  border: 2px solid rgba(8, 12, 30, 0.88);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
  height: 34px;
  justify-content: center;
  margin-right: -8px;
  overflow: hidden;
  width: 34px;
}

.event-community-stack img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.event-news-actions {
  display: flex;
  gap: 10px;
}

.event-news-actions button {
  align-items: center;
  background: rgba(5, 8, 22, 0.58);
  border: 1px solid rgba(168, 85, 247, 0.48);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.event-news-actions .notify.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
}

.event-card-options {
  background:
    radial-gradient(circle at 90% 0%, rgba(124, 58, 237, 0.18), transparent 38%),
    rgba(5, 8, 22, 0.97);
  display: grid;
  gap: 12px;
  grid-template-rows: 36px minmax(0, 1fr) auto;
  inset: 0 !important;
  overflow: hidden;
  padding: 16px;
  position: absolute !important;
  z-index: 4 !important;
}

.event-options-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  display: flex;
  height: 36px;
  justify-content: center;
  justify-self: start;
  width: 36px;
}

.event-card-options > div {
  align-content: start;
  display: grid;
  gap: 14px;
  min-height: 0;
}

.event-card-options h3 {
  display: -webkit-box;
  font-size: clamp(20px, 2.7vw, 28px);
  font-weight: 950;
  line-height: 1.02;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.event-card-options .event-countdown {
  max-width: 100%;
  min-width: 0;
}

.event-card-options .event-countdown span {
  min-width: 0;
}

.event-card-options .event-countdown.compact strong {
  font-size: clamp(16px, 2.2vw, 19px);
}

.event-card-options .event-countdown.compact small {
  font-size: 8px;
}

.event-card-options nav {
  align-self: end;
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.event-card-options nav button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  justify-content: center;
  min-height: 36px;
  min-width: 0;
  padding: 0 9px;
  text-align: center;
}

.event-card-options nav .danger {
  color: #fecaca;
}

.event-card-options-enter-active,
.event-card-options-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.event-card-options-enter-from,
.event-card-options-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

@media (max-width: 680px) {
  .event-news-card {
    aspect-ratio: auto;
    min-height: 430px;
  }

  .event-card-options {
    grid-template-rows: 36px auto minmax(0, 1fr);
  }

  .event-card-options nav {
    grid-template-columns: 1fr;
  }
}
</style>
