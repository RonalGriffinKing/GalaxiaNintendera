<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import './NotificationDropdown.css'
import { notificationPosition } from './notificationPosition'
import { usePublicPanelFocus } from '@/composables/usePublicPanelFocus'

const props = defineProps({
  panelId: { type: String, default: undefined },
  open: {
    type: Boolean,
    default: false
  },
  anchorEl: {
    type: Object,
    default: null
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

const emit = defineEmits(['clear', 'open-notification', 'close'])

const panel = ref(null)
usePublicPanelFocus(() => props.open, panel, () => emit('close'), { trap: () => true, initial: '.notification-dropdown-close' })

const position = ref({
  top: '78px',
  left: 'auto',
  right: '18px',
  width: '360px',
  maxHeight: 'calc(100dvh - 110px)',
  align: 'right'
})

const panelStyle = computed(() => ({
  '--notification-dropdown-top': position.value.top,
  '--notification-dropdown-left': position.value.left,
  '--notification-dropdown-right': position.value.right,
  '--notification-dropdown-width': position.value.width,
  '--notification-dropdown-max-height': position.value.maxHeight
}))

const updatePosition = () => {
  if (typeof window === 'undefined') return

  const tokens = window.getComputedStyle(document.documentElement)
  position.value = notificationPosition(window.innerWidth, window.innerHeight, props.anchorEl?.getBoundingClientRect?.(), {
    margin: parseFloat(tokens.getPropertyValue('--space-4')) || 16,
    gap: parseFloat(tokens.getPropertyValue('--space-2')) || 8,
    controlHeight: parseFloat(tokens.getPropertyValue('--public-control-height')) || 44
  })
}

watch(() => props.open, async (open) => {
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('notification-dropdown-open', open)
    document.documentElement.classList.toggle('notification-dropdown-open', open)
  }
  if (!open) return
  await nextTick()
  updatePosition()
})

onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, { passive: true })
})

onUnmounted(() => {
  document.body.classList.remove('notification-dropdown-open')
  document.documentElement.classList.remove('notification-dropdown-open')
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="notification-dropdown">
      <div v-if="open" class="notification-dropdown-layer">
        <button class="notification-dropdown-backdrop" type="button" aria-label="Cerrar notificaciones" @click="emit('close')"></button>

        <section
          ref="panel" :id="panelId" tabindex="-1" role="region" aria-label="Notificaciones"
          class="notification-dropdown-card"
          :data-align="position.align"
          :style="panelStyle"
          @click.stop
        >
          <div class="notification-dropdown-head">
            <strong>Notificaciones</strong>
            <div class="notification-dropdown-actions">
              <button
                v-if="notifications.length"
                type="button"
                :disabled="clearing"
                @click="emit('clear')"
              >
                {{ clearing ? 'Limpiando...' : 'Limpiar' }}
              </button>
              <span>{{ unreadCount }} nuevas</span>
              <button
                class="notification-dropdown-close"
                type="button"
                aria-label="Cerrar notificaciones"
                title="Cerrar"
                @click="emit('close')"
              >
                <i class="fas fa-xmark"></i>
              </button>
            </div>
          </div>

          <div v-if="notifications.length" class="notification-dropdown-list">
            <button
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-dropdown-row"
              :aria-label="`${notification.read ? 'Leída' : 'No leída'}: ${notification.title || ''}. ${notification.message || ''}. ${formatDate(notification.createdAt)}`"
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

          <p v-else class="notification-dropdown-empty">
            No tienes notificaciones nuevas.
          </p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
