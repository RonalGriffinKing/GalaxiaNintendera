<template>
  <div
    class="shadow-xl overflow-hidden px-5 py-4"
    :style="cardStyle"
  >
    <p
      class="opacity-80 mb-2"
      :style="{ fontSize: widget.data.titleSize + 'px' }"
    >
      {{ widget.data.title }}
    </p>

    <div
      class="flex justify-between font-medium mt-2"
      :style="{ fontSize: widget.data.numberSize + 'px' }"
    >
      <span>{{ widget.data.current }}</span>
      <span>{{ widget.data.goal }}</span>
    </div>

    <div class="bg-gray-200 rounded-full mt-3 overflow-hidden">
      <div
        class="transition-all duration-500"
        :style="barStyle"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'

const props = defineProps({
  widget: Object
})

onMounted(() => {
  const d = props.widget.data

  d.title ??= 'Meta'
  d.current ??= 1000
  d.goal ??= 2000
  d.barColor ??= '#a855f7'
  d.titleSize ??= 16
  d.numberSize ??= 18
  d.width ??= 400
  d.height ??= 120
})

const progress = computed(() => {
  return (props.widget.data.current / props.widget.data.goal) * 100
})

const cardStyle = computed(() => ({
  width: props.widget.data.width + 'px',
  height: props.widget.data.height + 'px',
  background: '#ffffff',
  color: '#000',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
}))

const barStyle = computed(() => ({
  width: progress.value + '%',
  height: '10px',
  background: props.widget.data.barColor
}))
</script>
