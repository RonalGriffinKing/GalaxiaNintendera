<template>
  <component
    v-if="component"
    :is="component"
    :widget="widget"
  />
</template>

<script setup>
import { computed } from 'vue'

// 🔥 RUTAS CORRECTAS
import GoalEditor from './editors/GoalEditor.vue'
import TodoEditor from './editors/TodoEditor.vue'

const props = defineProps({
  widget: Object
})

const map = {
  goal: GoalEditor,
  todo: TodoEditor
}

const component = computed(() => map[props.widget?.type] || null)
</script>