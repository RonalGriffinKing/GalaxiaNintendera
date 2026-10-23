<template>
  <component
    v-if="component"
    :is="component"
    :widget="widget"
    v-bind="widget.type === 'nowPlaying' ? { persist } : {}"
  />
</template>

<script setup>
import { computed } from 'vue'
import GoalEditor from '@/components/widgets/editors/GoalEditor.vue'
import TodoEditor from '@/components/widgets/editors/TodoEditor.vue'
import ChatEditor from '@/components/widgets/editors/ChatEditor.vue'
import TimerEditor from '@/components/widgets/editors/TimerEditor.vue'
import NowPlayingEditor from '@/components/widgets/editors/NowPlayingEditor.vue'

const props = defineProps({
  widget: Object,
  persist: Function
})

const map = {
  goal: GoalEditor,
  todo: TodoEditor,
  chat: ChatEditor,
  timer: TimerEditor,
  nowPlaying: NowPlayingEditor
}

const component = computed(() => map[props.widget?.type] || null)
</script>
