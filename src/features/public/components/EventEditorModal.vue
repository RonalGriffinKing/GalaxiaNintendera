<script setup>
import { computed, ref, watch } from 'vue'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const props = defineProps({
  event: {
    type: Object,
    default: null
  },
  communities: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'saved'])

const emptyForm = () => ({
  title: '',
  description: '',
  type: 'Direct',
  startsAt: '',
  durationMinutes: 60,
  url: '',
  backgroundUrl: '',
  communityIds: []
})

const form = ref(emptyForm())
const isSaving = ref(false)

const eventTypes = ['Direct', 'Live', 'Torneo', 'Anuncio', 'Comunidad', 'Podcast']
const isEditing = computed(() => Boolean(props.event?.id))

const toInputDateTime = (value) => {
  const time = typeof value === 'number' ? value : value?.toDate?.().getTime?.() || new Date(value || '').getTime()
  if (!Number.isFinite(time) || !time) return ''
  const date = new Date(time)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

watch(() => props.event, (event) => {
  form.value = event ? {
    title: event.title || '',
    description: event.description || '',
    type: event.type || 'Direct',
    startsAt: toInputDateTime(event.startsAt),
    durationMinutes: Number(event.durationMinutes || 60),
    url: event.url || '',
    backgroundUrl: event.backgroundUrl || event.imageUrl || '',
    communityIds: Array.isArray(event.communityIds)
      ? [...event.communityIds]
      : event.communityId
        ? [event.communityId]
        : []
  } : emptyForm()
}, { immediate: true })

const saveEvent = async () => {
  const title = form.value.title.trim()
  const startsAt = new Date(form.value.startsAt).getTime()
  if (!title || !Number.isFinite(startsAt)) return

  isSaving.value = true
  const selectedCommunities = props.communities.filter(community => form.value.communityIds.includes(community.id))
  const now = Date.now()
  const payload = {
    title,
    description: form.value.description.trim(),
    type: form.value.type || 'Evento',
    startsAt,
    durationMinutes: Math.max(0, Number(form.value.durationMinutes || 0)),
    url: form.value.url.trim(),
    backgroundUrl: form.value.backgroundUrl.trim(),
    communityIds: [...form.value.communityIds],
    communityNames: selectedCommunities.map(community => community.name),
    communityId: form.value.communityIds[0] || '',
    communityName: selectedCommunities[0]?.name || '',
    updatedAt: now
  }

  try {
    if (isEditing.value) {
      await updateDoc(doc(db, 'galaxyEvents', props.event.id), payload)
    } else {
      await addDoc(collection(db, 'galaxyEvents'), {
        ...payload,
        createdAt: now,
        createdBy: auth.currentUser?.uid || ''
      })
    }
    emit('saved')
    emit('close')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="event-editor">
      <div class="event-editor-modal">
        <button class="event-editor-backdrop" type="button" aria-label="Cerrar" @click="emit('close')"></button>
        <section class="event-editor-card">
          <header>
            <span><i class="far fa-calendar-plus"></i> Eventos</span>
            <h2>{{ isEditing ? 'Editar evento' : 'Crear evento' }}</h2>
            <button type="button" aria-label="Cerrar" @click="emit('close')">
              <i class="fas fa-xmark"></i>
            </button>
          </header>

          <form @submit.prevent="saveEvent">
            <label>
              <span>Titulo</span>
              <input v-model="form.title" placeholder="Nintendo Direct, torneo, live privado..." />
            </label>

            <div class="event-editor-grid">
              <label>
                <span>Tipo</span>
                <select v-model="form.type">
                  <option v-for="type in eventTypes" :key="type">{{ type }}</option>
                </select>
              </label>
              <label>
                <span>Fecha y hora</span>
                <input v-model="form.startsAt" type="datetime-local" />
              </label>
              <label>
                <span>Duracion</span>
                <input v-model.number="form.durationMinutes" min="0" step="5" type="number" />
              </label>
            </div>

            <label>
              <span>Descripcion</span>
              <textarea v-model="form.description" rows="4" placeholder="Cuenta que pasara y por que la comunidad debe estar pendiente."></textarea>
            </label>

            <label>
              <span>Link opcional</span>
              <input v-model="form.url" placeholder="YouTube, Twitch, sala privada, Discord..." />
            </label>

            <label>
              <span>Fondo del evento</span>
              <input v-model="form.backgroundUrl" placeholder="URL de imagen para el banner" />
            </label>

            <div class="event-community-picker">
              <span>Comunidades relacionadas</span>
              <div>
                <button
                  v-for="community in communities"
                  :key="community.id"
                  type="button"
                  :class="{ active: form.communityIds.includes(community.id) }"
                  @click="form.communityIds = form.communityIds.includes(community.id)
                    ? form.communityIds.filter(id => id !== community.id)
                    : [...form.communityIds, community.id]"
                >
                  <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
                  <i v-else class="fas fa-users"></i>
                  {{ community.name }}
                </button>
              </div>
            </div>

            <footer>
              <button type="button" class="secondary" @click="emit('close')">Cancelar</button>
              <button type="submit" :disabled="isSaving || !form.title.trim() || !form.startsAt">
                <i class="fas fa-check"></i>
                {{ isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear evento' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.event-editor-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 4300;
}

.event-editor-backdrop {
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(14px);
  inset: 0;
  position: absolute;
}

.event-editor-card {
  background:
    radial-gradient(circle at 78% 8%, rgba(168, 85, 247, 0.2), transparent 34%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(18, 12, 42, 0.98));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 22px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
  color: #ffffff;
  max-height: min(86dvh, 820px);
  max-width: 760px;
  overflow: auto;
  padding: 20px;
  position: relative;
  width: min(760px, 100%);
}

.event-editor-card header {
  align-items: start;
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) 42px;
  margin-bottom: 18px;
}

.event-editor-card header span {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.event-editor-card h2 {
  font-size: clamp(24px, 5vw, 38px);
  font-weight: 950;
  line-height: 1;
}

.event-editor-card header button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.event-editor-card form,
.event-editor-card label {
  display: grid;
  gap: 9px;
}

.event-editor-card form {
  gap: 14px;
}

.event-editor-card label span,
.event-community-picker > span {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 900;
}

.event-editor-card input,
.event-editor-card textarea,
.event-editor-card select {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #ffffff;
  font-weight: 850;
  min-height: 46px;
  padding: 0 14px;
}

.event-editor-card textarea {
  padding: 12px 14px;
  resize: vertical;
}

.event-editor-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1.2fr 0.8fr;
}

.event-community-picker {
  display: grid;
  gap: 10px;
}

.event-community-picker > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-community-picker button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  color: #e5e7eb;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px 0 6px;
}

.event-community-picker button.active {
  background: rgba(124, 58, 237, 0.45);
  border-color: rgba(216, 180, 254, 0.45);
}

.event-community-picker img,
.event-community-picker i {
  border-radius: 999px;
  height: 28px;
  object-fit: cover;
  width: 28px;
}

.event-editor-card footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 6px;
}

.event-editor-card footer button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  color: #ffffff;
  display: inline-flex;
  font-weight: 950;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
}

.event-editor-card footer .secondary {
  background: rgba(255, 255, 255, 0.08);
}

.event-editor-card footer button:disabled {
  opacity: 0.5;
}

.event-editor-enter-active,
.event-editor-leave-active {
  transition: opacity 0.2s ease;
}

.event-editor-enter-from,
.event-editor-leave-to {
  opacity: 0;
}

@media (max-width: 680px) {
  .event-editor-modal {
    align-items: stretch;
    padding: 0;
  }

  .event-editor-card {
    border-radius: 0;
    max-height: 100dvh;
    padding: calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
  }

  .event-editor-grid {
    grid-template-columns: 1fr;
  }

  .event-editor-card footer {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
