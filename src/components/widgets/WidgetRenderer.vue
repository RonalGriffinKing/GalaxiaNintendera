<template>
  <component
    v-if="component"
    :is="component"
    :widget="widget"
    v-bind="widget.type === 'nowPlaying' ? { ownerId, preview } : {}"
    :key="widget.id + '-' + widget.type"
  />

  <div v-else class="text-red-500 text-xs">
    Widget no soportado: {{ widget?.type }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GoalWidget from '@/components/widgets/types/GoalWidget.vue'
import TodoWidget from '@/components/widgets/types/TodoWidget.vue'
import ChatWidget from '@/components/widgets/types/ChatWidget.vue'
import TimerWidget from '@/components/widgets/types/TimerWidget.vue'
import NowPlayingWidget from '@/components/widgets/types/NowPlayingWidget.vue'

const props = defineProps({
  ownerId: String,
  preview: Boolean,
  widget: {
    type: Object,
    required: true
  }
})

const map = {
  goal: GoalWidget,
  todo: TodoWidget,
  chat: ChatWidget,
  timer: TimerWidget,
  nowPlaying: NowPlayingWidget
}

const component = computed(() => {
  if (!props.widget) return null
  return map[props.widget.type] || null
})
</script>
