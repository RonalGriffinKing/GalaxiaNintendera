<template>
  <div v-if="component && widget.type==='goal' && interactive && widget.data?.clickToToggle!==false" class="interactive-goal" role="button" tabindex="0" :aria-label="goalHidden?'Mostrar meta de seguidores':'Ocultar meta de seguidores'" :aria-pressed="!goalHidden" @click="goalHidden=!goalHidden" @keydown.enter.prevent="goalHidden=!goalHidden" @keydown.space.prevent="goalHidden=!goalHidden">
    <component :is="component" :widget="widget" :style="{visibility:goalHidden?'hidden':undefined,pointerEvents:'none'}" />
  </div>
  <component
    v-else-if="component"
    :is="component"
    :widget="widget"
    v-bind="widget.type === 'nowPlaying' ? { ownerId, preview, interactive } : widget.type === 'timer' ? { interactive } : {}"
    :key="widget.id + '-' + widget.type"
  />

  <div v-else class="text-red-500 text-xs">
    Widget no soportado: {{ widget?.type }}
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import GoalWidget from '@/components/widgets/types/GoalWidget.vue'
import TodoWidget from '@/components/widgets/types/TodoWidget.vue'
import ChatWidget from '@/components/widgets/types/ChatWidget.vue'
import TimerWidget from '@/components/widgets/types/TimerWidget.vue'
import NowPlayingWidget from '@/components/widgets/types/NowPlayingWidget.vue'
import CameraFrameWidget from '@/components/widgets/types/CameraFrameWidget.vue'

const props = defineProps({
  ownerId: String,
  preview: Boolean,
  interactive: Boolean,
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
  nowPlaying: NowPlayingWidget,
  cameraFrame: CameraFrameWidget
}

const component = computed(() => {
  if (!props.widget) return null
  return map[props.widget.type] || null
})
const goalHidden = ref(false)
</script>
<style scoped>
.interactive-goal{position:relative;display:inline-block;vertical-align:top;cursor:pointer}.interactive-goal:focus-visible{outline:2px solid #e8bd55;outline-offset:4px}
</style>
