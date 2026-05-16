<template>
  <component
    v-if="component"
    :is="component"
    :widget="widget"
    :key="widget.id + '-' + widget.type"
  />

  <div v-else class="text-red-500 text-xs">
    Widget no soportado: {{ widget?.type }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GoalWidget from '@/features/widgets/widgets/GoalWidget.vue'
import TodoWidget from '@/features/widgets/widgets/TodoWidget.vue'
import ChatWidget from '@/features/widgets/widgets/ChatWidget.vue'

const props = defineProps({
  widget: {
    type: Object,
    required: true
  }
})

const map = {
  goal: GoalWidget,
  todo: TodoWidget,
  chat: ChatWidget
}

const component = computed(() => {
  if (!props.widget) return null
  return map[props.widget.type] || null
})
</script>
