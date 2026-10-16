<script setup>
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

defineProps({
  communityOpen: {
    type: Boolean,
    default: false
  },
  userOpen: {
    type: Boolean,
    default: false
  },
  saving: {
    type: Boolean,
    default: false
  },
  getTopicIcon: {
    type: Function,
    required: true
  }
})

const communityDraft = defineModel('communityDraft', {
  type: Object,
  required: true
})
const userDraft = defineModel('userDraft', {
  type: Object,
  required: true
})

const emit = defineEmits([
  'close-community',
  'close-user',
  'save-community',
  'save-user',
  'update-topic',
  'remove-topic',
  'add-topic'
])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="communityOpen" class="quick-create-modal">
        <button class="quick-create-backdrop" type="button" @click="emit('close-community')"></button>
        <section class="quick-create-card community-create-card">
          <div class="quick-create-head">
            <strong>Crear comunidad</strong>
            <button type="button" @click="emit('close-community')">
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <label>
            Nombre
            <input v-model="communityDraft.name" placeholder="Ej: Zelda Fans" />
          </label>
          <label>
            Descripcion
            <textarea v-model="communityDraft.description" rows="3" placeholder="De que trata esta comunidad"></textarea>
          </label>
          <label>
            Banner (URL)
            <input v-model="communityDraft.bannerUrl" placeholder="https://..." />
          </label>
          <label>
            Icono (URL)
            <input v-model="communityDraft.iconUrl" placeholder="https://..." />
          </label>
          <label>
            Fondo cuando no hay publicaciones
            <input v-model="communityDraft.threadBackgroundUrl" placeholder="https://..." />
          </label>
          <label>
            Playlist (URL)
            <input v-model="communityDraft.musicPlaylistUrl" placeholder="https://..." />
          </label>
          <label>
            Volumen
            <input v-model.number="communityDraft.musicVolume" type="number" min="0" max="100" />
          </label>
          <div class="quick-topic-editor">
            <div class="quick-topic-head">
              <strong>Categorias de hilos</strong>
              <span>{{ communityDraft.threadTopics.length }}/8</span>
            </div>
            <label
              v-for="(topic, index) in communityDraft.threadTopics"
              :key="`quick-topic-${index}`"
              class="quick-topic-row"
            >
              <i :class="getTopicIcon(topic)"></i>
              <input
                :value="topic"
                placeholder="Categoria"
                @input="emit('update-topic', index, $event.target.value)"
              />
              <button
                type="button"
                :disabled="communityDraft.threadTopics.length <= 1"
                aria-label="Eliminar categoria"
                @click="emit('remove-topic', index)"
              >
                <i class="fas fa-trash"></i>
              </button>
            </label>
            <div class="quick-topic-add">
              <input
                v-model="communityDraft.newTopic"
                maxlength="24"
                placeholder="Nueva categoria"
                @keydown.enter.prevent="emit('add-topic')"
              />
              <button
                type="button"
                :disabled="!communityDraft.newTopic.trim() || communityDraft.threadTopics.length >= 8"
                @click="emit('add-topic')"
              >
                <i class="fas fa-plus"></i>
                Agregar
              </button>
            </div>
          </div>

          <div class="quick-community-preview">
            <figure class="quick-community-banner">
              <img v-if="communityDraft.bannerUrl" :src="communityDraft.bannerUrl" alt="" />
              <span v-else>Banner</span>
            </figure>
            <figure class="quick-community-icon">
              <img v-if="communityDraft.iconUrl" :src="communityDraft.iconUrl" alt="" />
              <span v-else>{{ communityDraft.name.slice(0, 2).toUpperCase() || 'GN' }}</span>
            </figure>
            <strong>{{ communityDraft.name || 'Nueva comunidad' }}</strong>
            <p>{{ communityDraft.description || 'Descripcion corta para presentar el espacio.' }}</p>
            <small v-if="communityDraft.threadBackgroundUrl">Fondo de hilos configurado</small>
            <small v-if="communityDraft.musicPlaylistUrl">Playlist vinculada</small>
            <small>Volumen: {{ Number(communityDraft.musicVolume || 35) }}%</small>
            <div>
              <span v-for="topic in communityDraft.threadTopics" :key="topic">
                <i :class="getTopicIcon(topic)"></i>
                {{ topic }}
              </span>
            </div>
          </div>

          <button
            class="quick-create-submit"
            type="button"
            :disabled="saving || !communityDraft.name.trim() || !communityDraft.description.trim()"
            @click="emit('save-community')"
          >
            {{ saving ? 'Guardando...' : 'Crear comunidad' }}
          </button>

          <Transition name="fade">
            <div v-if="saving" class="quick-loading-cover">
              <GalaxyLoader compact title="Creando comunidad" text="Guardando la nueva ventana con estilo unificado..." />
            </div>
          </Transition>
        </section>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="userOpen" class="quick-create-modal">
        <button class="quick-create-backdrop" type="button" @click="emit('close-user')"></button>
        <section class="quick-create-card">
          <div class="quick-create-head">
            <strong>Crear usuario</strong>
            <button type="button" @click="emit('close-user')">
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <label>
            Nombre
            <input v-model="userDraft.name" placeholder="Ej: Marta" />
          </label>
          <label>
            Email
            <input v-model="userDraft.email" type="email" placeholder="persona@email.com" />
          </label>
          <label>
            Password temporal
            <input v-model="userDraft.password" type="password" placeholder="Minimo 6 caracteres" />
          </label>
          <label>
            Descripcion
            <textarea v-model="userDraft.description" rows="3" placeholder="Rol o presentacion"></textarea>
          </label>
          <label>
            Icono (URL)
            <input v-model="userDraft.imageUrl" placeholder="https://..." />
          </label>
          <label>
            Rol
            <select v-model="userDraft.role">
              <option value="user">Usuario</option>
              <option value="publisher">Publicador</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label class="quick-create-check">
            <input v-model="userDraft.canChat" type="checkbox" />
            Permitir chat
          </label>

          <button
            class="quick-create-submit"
            type="button"
            :disabled="saving || !userDraft.name.trim() || !userDraft.email.trim() || !userDraft.password"
            @click="emit('save-user')"
          >
            {{ saving ? 'Guardando...' : 'Crear usuario' }}
          </button>

          <Transition name="fade">
            <div v-if="saving" class="quick-loading-cover">
              <GalaxyLoader compact title="Creando usuario" text="Preparando el perfil antes de cerrar..." />
            </div>
          </Transition>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.quick-create-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 28px;
  position: fixed;
  z-index: 4300;
}

.quick-create-backdrop {
  background:
    radial-gradient(circle at 20% 10%, rgba(147, 51, 234, 0.24), transparent 30%),
    rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(14px);
  border: 0;
  inset: 0;
  position: absolute;
}

.quick-create-card {
  background:
    radial-gradient(circle at 78% 8%, rgba(168, 85, 247, 0.2), transparent 34%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(18, 12, 42, 0.98));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 22px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
  color: #ffffff;
  display: grid;
  gap: 12px;
  max-height: min(88dvh, 820px);
  max-width: min(560px, calc(100vw - 56px));
  overflow-y: auto;
  padding: 24px;
  position: relative;
  width: min(560px, 100%);
  z-index: 1;
}

.community-create-card {
  max-width: min(980px, calc(100vw - 56px));
  width: min(980px, calc(100vw - 56px));
}

.quick-create-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.quick-create-head strong {
  color: #ffffff;
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 950;
  line-height: 1;
}

.quick-create-head button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.quick-create-card label {
  color: #cbd5e1;
  display: grid;
  font-size: 12px;
  font-weight: 900;
  gap: 6px;
}

.quick-community-preview {
  align-content: start;
  background: #0b1020;
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  overflow: hidden;
  padding: 12px;
}

.quick-community-banner {
  aspect-ratio: 16 / 7;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  margin: 0;
  overflow: hidden;
}

.quick-community-icon {
  align-items: center;
  background: #ffffff;
  border: 3px solid #0b1020;
  border-radius: 18px;
  display: flex;
  height: 74px;
  justify-content: center;
  margin: -42px 0 0 14px;
  overflow: hidden;
  width: 74px;
}

.quick-community-banner img,
.quick-community-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.quick-community-banner span,
.quick-community-icon span {
  align-items: center;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  height: 100%;
  justify-content: center;
  text-transform: uppercase;
}

.quick-community-icon span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  width: 100%;
}

.quick-community-preview strong {
  color: #ffffff;
  font-size: 18px;
  font-weight: 950;
}

.quick-community-preview p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.quick-community-preview small {
  color: #c084fc;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.quick-community-preview > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 4px;
}

.quick-community-preview > div span {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #e9d5ff;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  gap: 6px;
  min-height: 28px;
  padding: 0 9px;
}

.quick-create-card input,
.quick-create-card textarea,
.quick-create-card select {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #ffffff;
  font-weight: 850;
  min-height: 46px;
  outline: none;
  padding: 0 14px;
  resize: vertical;
}

.quick-create-card textarea {
  min-height: 118px;
  padding: 12px 14px;
}

.quick-create-card input:focus,
.quick-create-card textarea:focus,
.quick-create-card select:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.16);
}

.quick-topic-editor {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.quick-topic-head,
.quick-topic-row,
.quick-topic-add {
  align-items: center;
  display: grid;
  gap: 8px;
}

.quick-topic-head {
  grid-template-columns: minmax(0, 1fr) auto;
}

.quick-topic-head strong {
  color: #ffffff;
  font-size: 13px;
  font-weight: 950;
}

.quick-topic-head span {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
}

.quick-topic-row {
  grid-template-columns: 24px minmax(0, 1fr) 34px;
}

.quick-topic-row i {
  color: #8b5cf6;
  text-align: center;
}

.quick-topic-row button,
.quick-topic-add button {
  align-items: center;
  background: #eef2ff;
  border-radius: 10px;
  color: #4f46e5;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  gap: 6px;
  justify-content: center;
  min-height: 34px;
}

.quick-topic-row button:disabled,
.quick-topic-add button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.quick-topic-add {
  grid-template-columns: minmax(0, 1fr) auto;
}

.quick-create-check {
  align-items: center;
  display: flex !important;
  flex-direction: row;
}

.quick-create-check input {
  width: auto;
}

.quick-create-submit {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  font-weight: 950;
  justify-content: center;
  min-height: 48px;
}

.quick-create-submit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.quick-loading-cover {
  align-items: center;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(12px);
  border-radius: inherit;
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
  z-index: 3;
}

@media (max-width: 560px) {
  .quick-create-modal {
    align-items: center;
    padding: 16px 0;
  }

  .quick-create-card {
    border-radius: 22px;
    max-height: calc(100dvh - 32px);
    padding: calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
    width: min(92vw, 520px);
  }
}

@media (min-width: 760px) {
  .community-create-card {
    align-items: start;
    display: grid;
    gap: 14px 16px;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
    max-height: min(88dvh, 820px);
    padding: 24px;
  }

  .community-create-card .quick-create-head,
  .community-create-card label:nth-of-type(1),
  .community-create-card label:nth-of-type(2),
  .community-create-card .quick-create-submit,
  .community-create-card .quick-loading-cover {
    grid-column: 1 / -1;
  }

  .community-create-card label:nth-of-type(2) textarea {
    min-height: 94px;
  }

  .community-create-card .quick-topic-editor {
    grid-column: 2;
    grid-row: 4 / span 4;
    max-height: 280px;
    overflow-y: auto;
  }

  .community-create-card .quick-community-preview {
    grid-column: 2;
    grid-row: 8 / span 2;
  }

  .community-create-card .quick-create-submit {
    justify-self: end;
    min-width: 220px;
    padding: 0 22px;
  }
}
</style>
