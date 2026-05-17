<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  },
  createOptions: {
    type: Array,
    default: () => []
  },
  manageOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'select'])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="mobile-create-layer">
        <button class="mobile-create-backdrop" type="button" aria-label="Cerrar crear" @click="emit('close')"></button>
        <section class="mobile-create-sheet">
          <div class="mobile-create-head">
            <strong>Crear</strong>
            <button type="button" aria-label="Cerrar crear" @click="emit('close')">
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <button
            v-for="item in createOptions"
            :key="item.label"
            type="button"
            class="mobile-create-option"
            @click="emit('select', item)"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
            <i class="fas fa-chevron-right"></i>
          </button>

          <template v-if="manageOptions.length">
            <div class="mobile-create-subtitle">Gestionar</div>
            <button
              v-for="item in manageOptions"
              :key="`manage-${item.label}`"
              type="button"
              class="mobile-create-option secondary"
              @click="emit('select', item)"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
              <i class="fas fa-chevron-right"></i>
            </button>
          </template>
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

.mobile-create-layer {
  inset: 0;
  position: fixed;
  z-index: 1700;
}

.mobile-create-backdrop {
  background: rgba(15, 23, 42, 0.42);
  border: 0;
  inset: 0;
  position: absolute;
}

.mobile-create-sheet {
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  bottom: 0;
  box-shadow: 0 -20px 60px rgba(15, 23, 42, 0.2);
  color: #111827;
  display: grid;
  gap: 10px;
  left: 0;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  position: absolute;
  right: 0;
}

.mobile-create-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 0 2px 8px;
}

.mobile-create-head strong {
  font-size: 18px;
  font-weight: 950;
}

.mobile-create-head button {
  align-items: center;
  background: #f1f5f9;
  border-radius: 999px;
  color: #64748b;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.mobile-create-option {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  color: #111827;
  display: grid;
  font-weight: 950;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  min-height: 56px;
  padding: 10px 12px;
  text-align: left;
}

.mobile-create-option i:first-child {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.mobile-create-subtitle {
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  padding: 8px 2px 0;
  text-transform: uppercase;
}

.mobile-create-option.secondary i:first-child {
  background: #eef2ff;
  color: #4f46e5;
}
</style>
