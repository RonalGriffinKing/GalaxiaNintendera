<script setup>
import EventCountdown from './EventCountdown.vue'
import { defaultBannerUrl, defaultLogoUrl, resolveAssetUrl } from '@/constants/assets'

defineProps({
  event: {
    type: Object,
    required: true
  },
  communities: {
    type: Array,
    default: () => []
  },
  notified: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'notify', 'calendar', 'edit', 'delete'])

const formatDate = (value) => new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

const typeClass = (type = '') => String(type || 'evento').toLowerCase()
</script>

<template>
  <Teleport to="body">
    <Transition name="event-detail">
      <div class="event-detail-modal">
        <button class="event-detail-backdrop" type="button" aria-label="Cerrar detalle" @click="emit('close')"></button>
        <section class="event-detail-card">
          <button class="event-detail-close" type="button" aria-label="Cerrar" @click="emit('close')">
            <i class="fas fa-xmark"></i>
          </button>

          <div class="event-detail-cover">
            <img :src="resolveAssetUrl(event.backgroundUrl || event.imageUrl, defaultBannerUrl)" alt="" />
            <span :class="typeClass(event.type)">{{ event.type || 'Evento' }}</span>
          </div>

          <div class="event-detail-copy">
            <h2>{{ event.title }}</h2>
            <p>{{ event.description || 'Evento de Galaxia Nintendera para toda la comunidad.' }}</p>

            <div class="event-detail-meta">
              <span><i class="far fa-calendar"></i> {{ formatDate(event.startsAt) }}</span>
              <span><i class="far fa-clock"></i> {{ event.durationMinutes || 60 }} min</span>
            </div>

            <div v-if="communities.length" class="event-detail-communities">
              <strong>Comunidades relacionadas</strong>
              <span v-for="community in communities" :key="community.id">
                <img :src="resolveAssetUrl(community.iconUrl, defaultLogoUrl)" alt="" />
                {{ community.name }}
              </span>
            </div>

            <EventCountdown :starts-at="event.startsAt" />

            <div class="event-detail-actions">
              <a v-if="event.url" :href="event.url" target="_blank" rel="noreferrer">Abrir link</a>
              <button type="button" @click="emit('calendar')">Agregar calendario</button>
              <button type="button" @click="emit('notify')">
                <i :class="notified ? 'fas fa-bell' : 'far fa-bell'"></i>
                {{ notified ? 'Notificando' : 'Notificarme' }}
              </button>
              <button v-if="isAdmin" type="button" @click="emit('edit')">Editar</button>
              <button v-if="isAdmin" type="button" class="danger" @click="emit('delete')">Borrar</button>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.event-detail-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: max(22px, env(safe-area-inset-top)) 22px max(22px, env(safe-area-inset-bottom));
  position: fixed;
  z-index: 4300;
}

.event-detail-backdrop {
  background: rgba(2, 6, 23, 0.74);
  backdrop-filter: blur(14px);
  inset: 0;
  position: absolute;
}

.event-detail-card {
  background:
    radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.18), transparent 36%),
    linear-gradient(135deg, #080c1e, #100a2a);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 22px;
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.52);
  color: #ffffff;
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr);
  max-height: min(88dvh, 860px);
  max-width: 1120px;
  overflow: auto;
  overscroll-behavior: contain;
  position: relative;
  width: min(1120px, 100%);
}

.event-detail-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  display: flex;
  height: 42px;
  justify-content: center;
  position: absolute;
  right: 16px;
  top: 16px;
  width: 42px;
  z-index: 3;
}

.event-detail-cover {
  min-height: 520px;
  overflow: hidden;
  position: relative;
}

.event-detail-cover::after {
  background: linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.45));
  content: "";
  inset: 0;
  position: absolute;
}

.event-detail-cover img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.event-detail-cover span {
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  left: 18px;
  padding: 8px 12px;
  position: absolute;
  text-transform: uppercase;
  top: 18px;
  z-index: 1;
}

.event-detail-cover .live { background: #e11d48; }
.event-detail-cover .direct { background: rgba(124, 58, 237, 0.86); }
.event-detail-cover .torneo { background: #ca8a04; }
.event-detail-cover .anuncio { background: rgba(14, 165, 233, 0.78); }

.event-detail-copy {
  align-content: center;
  display: grid;
  gap: 18px;
  padding: 34px;
}

.event-detail-copy h2 {
  font-size: clamp(34px, 5vw, 60px);
  font-weight: 950;
  line-height: 0.95;
}

.event-detail-copy p {
  color: #cbd5e1;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.55;
}

.event-detail-meta,
.event-detail-actions,
.event-detail-communities {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.event-detail-meta span,
.event-detail-communities span {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  color: #e5e7eb;
  display: inline-flex;
  font-size: 12px;
  font-weight: 850;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
}

.event-detail-communities strong {
  color: #cbd5e1;
  flex: 0 0 100%;
  font-size: 12px;
  font-weight: 950;
}

.event-detail-communities img {
  border-radius: 999px;
  height: 24px;
  object-fit: cover;
  width: 24px;
}

.event-detail-actions a,
.event-detail-actions button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
}

.event-detail-actions .danger {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.event-detail-enter-active,
.event-detail-leave-active {
  transition: opacity 0.2s ease;
}

.event-detail-enter-active .event-detail-card,
.event-detail-leave-active .event-detail-card {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.22s ease;
}

.event-detail-enter-from,
.event-detail-leave-to {
  opacity: 0;
}

.event-detail-enter-from .event-detail-card,
.event-detail-leave-to .event-detail-card {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

@media (max-width: 820px) {
  .event-detail-modal {
    align-items: center;
    overflow: hidden;
    padding:
      max(22px, calc(env(safe-area-inset-top) + 16px))
      0
      max(22px, calc(env(safe-area-inset-bottom) + 16px));
  }

  .event-detail-card {
    border-radius: 24px;
    grid-template-columns: 1fr;
    max-height: 88dvh;
    width: min(92vw, 520px);
  }

  .event-detail-cover {
    min-height: 150px;
    max-height: 190px;
  }

  .event-detail-cover::after {
    background: linear-gradient(180deg, rgba(2, 6, 23, 0.02), rgba(2, 6, 23, 0.68));
  }

  .event-detail-cover span {
    font-size: 10px;
    left: 12px;
    padding: 6px 9px;
    top: 12px;
  }

  .event-detail-close {
    height: 36px;
    right: 12px;
    top: 12px;
    width: 36px;
  }

  .event-detail-copy {
    align-content: start;
    gap: 12px;
    padding: 16px 14px calc(18px + env(safe-area-inset-bottom));
  }

  .event-detail-copy h2 {
    font-size: clamp(22px, 7vw, 32px);
    line-height: 1.05;
  }

  .event-detail-copy p {
    display: -webkit-box;
    font-size: 12px;
    line-height: 1.45;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .event-detail-meta {
    gap: 7px;
  }

  .event-detail-meta span {
    flex: 1 1 150px;
    font-size: 11px;
    gap: 6px;
    min-height: 30px;
    padding: 0 9px;
  }

  .event-detail-communities {
    flex-wrap: nowrap;
    gap: 7px;
    margin-left: -12px;
    margin-right: -12px;
    overflow-x: auto;
    padding: 0 12px 3px;
    scrollbar-width: none;
  }

  .event-detail-communities::-webkit-scrollbar {
    display: none;
  }

  .event-detail-communities strong {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 10px;
    min-height: 30px;
  }

  .event-detail-communities span {
    flex: 0 0 auto;
    font-size: 11px;
    gap: 6px;
    min-height: 30px;
    padding: 0 9px;
  }

  .event-detail-communities img {
    height: 20px;
    width: 20px;
  }

  .event-detail-copy :deep(.event-countdown) {
    gap: 6px;
  }

  .event-detail-copy :deep(.event-countdown span) {
    border-radius: 9px;
    padding: 7px 5px;
  }

  .event-detail-copy :deep(.event-countdown strong) {
    font-size: 18px;
  }

  .event-detail-copy :deep(.event-countdown small) {
    font-size: 8px;
  }

  .event-detail-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .event-detail-actions a,
  .event-detail-actions button {
    border-radius: 11px;
    justify-content: center;
    min-height: 38px;
    padding: 0 12px;
  }
}
</style>
