<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  },
  notifications: {
    type: Array,
    default: () => []
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  clearing: {
    type: Boolean,
    default: false
  },
  formatDate: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['clear', 'open-notification'])
</script>

<template>
  <div v-if="open" class="public-notifications-panel">
    <div class="public-notifications-card">
      <div class="public-notifications-head">
        <strong>Notificaciones</strong>
        <div class="public-notifications-actions">
          <button
            v-if="notifications.length"
            type="button"
            :disabled="clearing"
            @click="emit('clear')"
          >
            {{ clearing ? 'Limpiando...' : 'Limpiar' }}
          </button>
          <span>{{ unreadCount }} nuevas</span>
        </div>
      </div>

      <div v-if="notifications.length" class="public-notifications-list">
        <button
          v-for="notification in notifications"
          :key="notification.id"
          class="public-notification-row"
          :class="{ unread: !notification.read }"
          @click="emit('open-notification', notification)"
        >
          <span></span>
          <div>
            <strong>{{ notification.title }}</strong>
            <p>{{ notification.message }}</p>
            <small>{{ formatDate(notification.createdAt) }}</small>
          </div>
        </button>
      </div>

      <p v-else class="public-notifications-empty">
        No tienes notificaciones nuevas.
      </p>
    </div>
  </div>
</template>

<style scoped>
.public-notifications-panel {
  position: fixed;
  right: 18px;
  top: 72px;
  z-index: 1300;
}

.public-notifications-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
  color: #111827;
  overflow: hidden;
  width: min(380px, calc(100vw - 28px));
}

.public-notifications-head {
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
}

.public-notifications-head strong {
  font-weight: 950;
}

.public-notifications-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.public-notifications-actions button,
.public-notifications-actions span {
  color: #8b5cf6;
  font-size: 11px;
  font-weight: 950;
}

.public-notifications-list {
  display: grid;
  max-height: 360px;
  overflow-y: auto;
}

.public-notification-row {
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  color: #111827;
  display: grid;
  gap: 10px;
  grid-template-columns: 8px minmax(0, 1fr);
  padding: 12px 16px;
  text-align: left;
}

.public-notification-row > span {
  background: #cbd5e1;
  border-radius: 999px;
  height: 8px;
  margin-top: 6px;
  width: 8px;
}

.public-notification-row.unread > span {
  background: #ec4899;
}

.public-notification-row strong {
  display: block;
  font-size: 13px;
}

.public-notification-row p,
.public-notification-row small,
.public-notifications-empty {
  color: #64748b;
  font-size: 12px;
}

.public-notifications-empty {
  font-weight: 800;
  padding: 18px;
}
</style>
