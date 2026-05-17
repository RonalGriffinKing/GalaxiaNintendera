<script setup>
import { ref } from 'vue'

defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['calendar', 'share', 'details', 'edit', 'feature', 'delete'])
const open = ref(false)

const run = (eventName) => {
  open.value = false
  emit(eventName)
}
</script>

<template>
  <div class="event-actions-menu">
    <button type="button" class="event-menu-trigger" aria-label="Mas opciones" @click.stop="open = !open">
      <i class="fas fa-ellipsis"></i>
    </button>

    <Transition name="event-menu">
      <div v-if="open" class="event-menu-panel" @click.stop>
        <button type="button" @click="run('calendar')">
          <i class="far fa-calendar-plus"></i>
          Agregar a mi calendario
        </button>
        <button type="button" @click="run('share')">
          <i class="fas fa-share-nodes"></i>
          Compartir evento
        </button>
        <button type="button" @click="run('details')">
          <i class="far fa-circle-info"></i>
          Ver detalles
        </button>

        <template v-if="isAdmin">
          <span></span>
          <button type="button" @click="run('edit')">
            <i class="fas fa-pen"></i>
            Editar evento
          </button>
          <button type="button" @click="run('feature')">
            <i :class="featured ? 'fas fa-star' : 'far fa-star'"></i>
            {{ featured ? 'Quitar destacado' : 'Destacar evento' }}
          </button>
          <button type="button" class="danger" @click="run('delete')">
            <i class="fas fa-trash"></i>
            Eliminar evento
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.event-actions-menu {
  position: relative;
}

.event-menu-trigger {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.event-menu-panel {
  background: #0b1024;
  border: 1px solid rgba(168, 85, 247, 0.26);
  border-radius: 14px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.42);
  display: grid;
  gap: 2px;
  min-width: 220px;
  padding: 8px;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 12;
}

.event-menu-panel button {
  align-items: center;
  border-radius: 10px;
  color: #e5e7eb;
  display: grid;
  font-size: 12px;
  font-weight: 850;
  gap: 10px;
  grid-template-columns: 18px minmax(0, 1fr);
  min-height: 36px;
  padding: 0 10px;
  text-align: left;
}

.event-menu-panel button:hover {
  background: rgba(124, 58, 237, 0.18);
}

.event-menu-panel span {
  background: rgba(148, 163, 184, 0.14);
  display: block;
  height: 1px;
  margin: 6px 4px;
}

.event-menu-panel .danger {
  color: #fecaca;
}

.event-menu-enter-active,
.event-menu-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.event-menu-enter-from,
.event-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 680px) {
  .event-menu-panel {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }

  .event-menu-enter-from,
  .event-menu-leave-to {
    transform: translateX(-50%) translateY(-4px);
  }
}
</style>
