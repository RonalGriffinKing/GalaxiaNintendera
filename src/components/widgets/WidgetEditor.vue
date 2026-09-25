<template>
  <component
    v-if="component"
    :is="component"
    :widget="widget"
  />
</template>

<script setup>
import { computed } from 'vue'
import GoalEditor from '@/components/widgets/editors/GoalEditor.vue'
import TodoEditor from '@/components/widgets/editors/TodoEditor.vue'
import ChatEditor from '@/components/widgets/editors/ChatEditor.vue'
import TimerEditor from '@/components/widgets/editors/TimerEditor.vue'

const props = defineProps({
  widget: Object
})

const map = {
  goal: GoalEditor,
  todo: TodoEditor,
  chat: ChatEditor,
  timer: TimerEditor
}

const component = computed(() => map[props.widget?.type] || null)
</script>
