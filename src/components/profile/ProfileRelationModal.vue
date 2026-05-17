<script setup>
import { fallbackProfileIcon } from '@/services/profileProgress'

defineProps({
  title: {
    type: String,
    required: true
  },
  users: {
    type: Array,
    default: () => []
  },
  canUseDirectChat: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'open-profile', 'open-chat'])
</script>

<template>
  <Teleport to="body">
    <div class="profile-relation-modal">
      <button class="relation-backdrop" type="button" aria-label="Cerrar" @click="emit('close')"></button>
      <section class="relation-card">
        <div class="relation-head">
          <div>
            <span>Comunidad</span>
            <h2>{{ title }}</h2>
          </div>
          <button type="button" aria-label="Cerrar" @click="emit('close')">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div v-if="users.length" class="relation-list">
          <article v-for="user in users" :key="user.id">
            <button type="button" class="relation-profile" @click="emit('open-profile', user)">
              <img :src="user.imageUrl || fallbackProfileIcon" alt="" class="profile-icon-img" />
              <span>
                <strong>{{ user.name }}</strong>
                <small>{{ user.username ? `@${user.username}` : user.role }}</small>
              </span>
            </button>
            <button type="button" class="relation-talk" @click="canUseDirectChat ? emit('open-chat', user) : emit('open-profile', user)">
              <i :class="canUseDirectChat ? 'fas fa-comment-dots' : 'fas fa-user'"></i>
              {{ canUseDirectChat ? 'Enviar mensaje' : 'Ver perfil' }}
            </button>
          </article>
        </div>

        <p v-else class="relation-empty">
          Todavia no hay usuarios en esta lista.
        </p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.profile-relation-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 2000;
}

.relation-backdrop {
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(16px);
  border: 0;
  inset: 0;
  position: absolute;
}

.relation-card {
  background: #0b1020;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
  color: #f8fafc;
  max-height: min(680px, calc(100dvh - 40px));
  overflow: hidden;
  padding: 20px;
  position: relative;
  width: min(520px, calc(100vw - 28px));
}

.relation-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.relation-head span {
  color: #8b5cf6;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.relation-head h2 {
  font-size: 24px;
  margin-top: 3px;
}

.relation-head button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.relation-list {
  display: grid;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
}

.relation-list article {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  overflow: hidden;
  padding: 10px;
}

.relation-profile {
  align-items: center;
  color: inherit;
  display: grid;
  gap: 10px;
  grid-template-columns: 44px minmax(0, 1fr);
  min-width: 0;
  overflow: hidden;
  text-align: left;
}

.relation-profile img {
  border-radius: 13px;
  height: 44px;
  object-fit: cover;
  transform: none;
  width: 48px;
}

.relation-profile .profile-icon-img {
  transform: none;
  width: 44px;
}

.relation-profile strong,
.relation-profile small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-profile small {
  color: #a78bfa;
  font-size: 12px;
  font-weight: 900;
}

.relation-talk {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

.relation-empty {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  color: #94a3b8;
  font-weight: 900;
  padding: 18px;
}

@media (max-width: 520px) {
  .profile-relation-modal {
    align-items: center;
    padding: 16px;
  }

  .relation-card {
    border-radius: 18px;
    max-height: calc(100svh - 32px);
    padding: 16px;
  }

  .relation-list article {
    grid-template-columns: 1fr;
  }

  .relation-talk {
    justify-content: center;
    width: 100%;
  }
}
</style>
