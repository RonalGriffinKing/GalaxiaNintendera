<template>
  <div :style="cardStyle" class="relative shadow-xl overflow-hidden px-8 py-6">

    <!-- ICONO COMPLETADO -->
    <div
      v-if="isComplete"
      class="absolute top-3 right-3 text-2xl animate-bounce"
      :style="{ color: widget.data.completeIconColor || '#facc15' }"
    >
      <i :class="[widget.data.completeIconStyle || 'fa-solid', widget.data.completeIcon || 'fa-crown']"></i>
    </div>

    <!-- TEXTO -->
    <p class="text-base opacity-80 mb-2">
      {{ widget.data.title }}
    </p>

    <!-- NUMEROS -->
    <div class="flex justify-between text-base font-medium">
      <span>{{ widget.data.current }}</span>
      <span>{{ widget.data.goal }}</span>
    </div>

    <!-- BARRA -->
    <div
      class="rounded-full mt-4 overflow-hidden"
      :style="{
        height: (widget.data.barHeight || 16) + 'px',
        background: '#e5e7eb'
      }"
    >
      <div
        class="h-full transition-all duration-500"
        :style="{
          width: progress + '%',
          backgroundColor: widget.data.barColor || '#a855f7'
        }"
      ></div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ widget: Object })

const progress = computed(() => {
  return (props.widget.data.current / props.widget.data.goal) * 100
})

const isComplete = computed(() => {
  return props.widget.data.current >= props.widget.data.goal
})

const cardStyle = computed(() => ({
  width: (props.widget.data.width || 500) + 'px',
  height: (props.widget.data.height || 180) + 'px',

  backgroundColor: props.widget.data.bgColorRaw || '#ffffff',
  color: props.widget.data.textColorRaw || '#000000',

  border: props.widget.data.borderColor
    ? `3px solid ${props.widget.data.borderColor}`
    : 'none',

  borderRadius: props.widget.data.rounded ? '18px' : '0px'
}))
</script>