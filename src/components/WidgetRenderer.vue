<template>
  <component
    v-if="component"
    :is="component"
    :widget="widget"
    :key="widget.id + '-' + widget.type"
  />

  <!-- fallback por si falla -->
  <div v-else class="text-red-500 text-xs">
    Widget no soportado: {{ widget?.type }}
  </div>
</template>

<script setup>
import { computed } from 'vue'

// 🔥 IMPORTS CORRECTOS (RESPETAR MAYÚSCULAS)
import GoalWidget from '@/components/widgets/GoalWidget.vue'
import TodoWidget from '@/components/widgets/TodoWidget.vue'

// props
const props = defineProps({
  widget: {
    type: Object,
    required: true
  }
})

// 🔥 MAPA DE WIDGETS
const map = {
  goal: GoalWidget,
  todo: TodoWidget
}

// 🔥 COMPONENTE DINÁMICO SEGURO
const component = computed(() => {
  if (!props.widget) return null
  return map[props.widget.type] || null
})
</script>