<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import './NotificationDropdown.css'

const props = defineProps({
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

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isMobile = viewportWidth <= 859
  const anchorRect = props.anchorEl?.getBoundingClientRect?.()
  const top = Math.max(isMobile ? 88 : 72, (anchorRect?.bottom || 64) + 12)
  const safeBottom = isMobile ? 106 : 18

  if (isMobile) {
    position.value = {
      top: `${top}px`,
      left: '50%',
      right: 'auto',
      width: '92vw',
      maxHeight: `${Math.max(180, viewportHeight - top - safeBottom - 18)}px`,
      align: 'left'
    }
    return
  }

  const width = 360
  const margin = 18
  const anchorRight = anchorRect ? viewportWidth - anchorRect.right : margin
  const right = Math.max(margin, anchorRight)
  const leftIfRightAligned = viewportWidth - right - width

  position.value = {
    top: `${top}px`,
    left: leftIfRightAligned < margin ? `${margin}px` : 'auto',
    right: leftIfRightAligned < margin ? 'auto' : `${right}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(220, viewportHeight - top - safeBottom)}px`,
    align: leftIfRightAligned < margin ? 'left' : 'right'
  }
}

watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  updatePosition()
})

onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, { passive: true })
})

onUnmounted(() => {
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
            </div>
          </div>

          <div v-if="notifications.length" class="notification-dropdown-list">
            <button
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-dropdown-row"
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
