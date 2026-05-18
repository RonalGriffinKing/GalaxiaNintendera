<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  },
  canEdit: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle', 'edit', 'delete'])
</script>

<template>
  <div class="context-menu-wrap">
    <button class="context-menu-trigger" type="button" title="Opciones" @click.stop="emit('toggle')">
      <i class="fas fa-ellipsis-h"></i>
    </button>

    <Transition name="context-menu">
      <div v-if="open" class="context-menu-panel" @click.stop>
        <button v-if="canEdit" type="button" @click="emit('edit')">
          <i class="far fa-pen-to-square"></i>
          Editar
        </button>
        <button v-if="canDelete" type="button" class="danger" @click="emit('delete')">
          <i class="fas fa-trash"></i>
          Borrar
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.context-menu-wrap {
  justify-self: end;
  position: relative;
}

.context-menu-trigger {
  align-items: center;
  border-radius: 999px;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  height: 32px;
  justify-content: center;
  transition: background 0.18s ease, color 0.18s ease;
  width: 32px;
}

.context-menu-trigger:hover,
.context-menu-wrap:has(.context-menu-panel) .context-menu-trigger {
  background: rgba(168, 85, 247, 0.16);
  color: #f0abfc;
}

.context-menu-panel {
  background: rgba(10, 12, 30, 0.98);
  border: 1px solid rgba(216, 180, 254, 0.2);
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  display: grid;
  gap: 4px;
  min-width: 140px;
  padding: 6px;
  position: absolute;
  right: 0;
  top: 38px;
  z-index: 120;
}

.context-menu-panel button {
  align-items: center;
  border-radius: 10px;
  color: #e2e8f0;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  text-align: left;
  width: 100%;
}

.context-menu-panel button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.context-menu-panel .danger {
  color: #fca5a5;
}

.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@media (max-width: 620px) {
  .context-menu-panel {
    right: -2px;
    top: 36px;
  }
}
</style>
