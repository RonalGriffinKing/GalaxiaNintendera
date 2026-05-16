<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'calendar'
  }
})

const emit = defineEmits(['update:modelValue'])

const tabs = [
  { id: 'calendar', label: 'Calendario', icon: 'far fa-calendar-days' },
  { id: 'list', label: 'Lista', icon: 'fas fa-list' },
  { id: 'featured', label: 'Destacados', icon: 'far fa-star' },
  { id: 'communities', label: 'Comunidades', icon: 'fas fa-people-group' }
]
</script>

<template>
  <nav class="events-tabs-premium" aria-label="Secciones de eventos">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      :class="{ active: modelValue === tab.id }"
      @click="emit('update:modelValue', tab.id)"
    >
      <i :class="tab.icon"></i>
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.events-tabs-premium {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 2px 0 4px;
}

.events-tabs-premium button {
  align-items: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  color: #e5e7eb;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 950;
  gap: 9px;
  min-height: 42px;
  padding: 0 18px;
}

.events-tabs-premium button:hover {
  border-color: rgba(168, 85, 247, 0.42);
  box-shadow: 0 0 22px rgba(168, 85, 247, 0.12);
}

.events-tabs-premium button.active {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}
</style>
