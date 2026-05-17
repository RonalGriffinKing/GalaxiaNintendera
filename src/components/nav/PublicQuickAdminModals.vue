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
        <section class="quick-create-card">
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
  padding: 20px;
  position: fixed;
  z-index: 1800;
}

.quick-create-backdrop {
  background:
    radial-gradient(circle at 20% 10%, rgba(147, 51, 234, 0.3), transparent 28%),
    rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(16px);
  border: 0;
  inset: 0;
  position: absolute;
}

.quick-create-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 26px 80px rgba(15, 23, 42, 0.28);
  color: #111827;
  display: grid;
  gap: 12px;
  max-height: min(720px, calc(100dvh - 28px));
  overflow-y: auto;
  padding: 20px;
  position: relative;
  width: min(560px, calc(100vw - 28px));
  z-index: 1;
}

.quick-create-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.quick-create-head strong {
  font-size: 20px;
  font-weight: 950;
}

.quick-create-head button {
  align-items: center;
  background: #f1f5f9;
  border-radius: 999px;
  color: #64748b;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.quick-create-card label {
  color: #475569;
  display: grid;
  font-size: 12px;
  font-weight: 900;
  gap: 6px;
}

.quick-create-card input,
.quick-create-card textarea,
.quick-create-card select {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #111827;
  outline: none;
  padding: 11px 12px;
  resize: vertical;
}

.quick-create-card input:focus,
.quick-create-card textarea:focus,
.quick-create-card select:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.16);
}

.quick-topic-editor {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
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
  color: #111827;
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
    align-items: flex-end;
    padding: 0;
  }

  .quick-create-card {
    border-radius: 22px 22px 0 0;
    max-height: calc(100dvh - 20px);
    width: 100%;
  }
}
</style>
