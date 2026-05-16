<template>
  <div>
    <div
      v-if="isMinimized"
      class="relative flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
      :style="bubbleStyle"
      @click="toggle"
    >
      <svg class="absolute inset-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke="#ffffff20" stroke-width="8" fill="none"/>

        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#fff"
          stroke-width="8"
          fill="none"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
          transform="rotate(-90 50 50)"
          class="transition-all duration-500"
        />
      </svg>

      <i
        :class="bubbleIcon"
        class="z-10 transition-all duration-300"
        :style="{ fontSize: iconSize + 'px' }"
      ></i>
    </div>

    <transition name="panel">
      <div
        v-if="!isMinimized"
        class="rounded-2xl shadow-2xl p-5 space-y-3 backdrop-blur-md"
        :style="cardStyle"
      >
        <div class="flex justify-between items-center mb-2">
          <h3 :style="{ fontSize: fontSize + 'px' }">
            Misiones
          </h3>

          <button
            @click="toggle"
            class="text-sm opacity-60 hover:opacity-100 transition"
          >
            x
          </button>
        </div>

        <transition-group name="task">
          <div
            v-for="(task, index) in widget.data.tasks"
            :key="index"
            class="flex gap-3 items-start"
          >
            <div
              @click="toggleTask(index)"
              class="w-5 h-5 mt-1 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300"
              :style="checkStyle(task)"
            >
              <span v-if="task.done" class="animate-pop">OK</span>
            </div>

            <p
              class="break-words leading-tight transition-all duration-300"
              :style="textStyle(task)"
            >
              {{ task.text }}
            </p>
          </div>
        </transition-group>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({ widget: Object })
const isMinimized = ref(true)

onMounted(() => {
  const d = props.widget.data

  d.tasks ??= [{ text: 'Nueva mision', done: false }]
  d.bgColor ??= '#1f2937'
  d.textColor ??= '#ffffff'
  d.fontSize ??= 16
  d.bubbleColor ??= '#9333ea'
  d.bubbleSize ??= 70
  d.icon ??= 'fa-solid fa-star'
})

const toggle = () => {
  isMinimized.value = !isMinimized.value
}

const toggleTask = (index) => {
  const task = props.widget.data.tasks[index]
  task.done = !task.done
}

const total = computed(() => props.widget.data.tasks.length)
const done = computed(() =>
  props.widget.data.tasks.filter(t => t.done).length
)

const progress = computed(() =>
  total.value ? done.value / total.value : 0
)

watch(progress, (val) => {
  if (val === 1) {
    setTimeout(() => {
      isMinimized.value = true
    }, 1200)
  }
})

const circumference = 2 * Math.PI * 45
const progressOffset = computed(() =>
  circumference * (1 - progress.value)
)

const fontSize = computed(() => props.widget.data.fontSize)
const iconSize = computed(() =>
  props.widget.data.fontSize * 1.2
)

const bubbleStyle = computed(() => ({
  width: props.widget.data.bubbleSize + 'px',
  height: props.widget.data.bubbleSize + 'px',
  borderRadius: '50%',
  background: props.widget.data.bubbleColor,
  color: '#fff',
  boxShadow: `0 0 20px ${props.widget.data.bubbleColor}80`
}))

const cardStyle = computed(() => ({
  background: props.widget.data.bgColor + 'dd',
  color: props.widget.data.textColor,
  width: '300px'
}))

const textStyle = (task) => ({
  fontSize: fontSize.value + 'px',
  textDecoration: task.done ? 'line-through' : 'none',
  opacity: task.done ? 0.5 : 1
})

const checkStyle = (task) => ({
  borderColor: props.widget.data.textColor,
  background: task.done ? props.widget.data.textColor : 'transparent',
  color: task.done ? props.widget.data.bgColor : 'transparent',
  fontSize: '8px',
  fontWeight: 900
})

const bubbleIcon = computed(() => {
  if (progress.value === 1) return 'fa-solid fa-crown'
  if (progress.value > 0.5) return 'fa-solid fa-fire'
  return props.widget.data.icon
})
</script>

<style>
.panel-enter-active {
  transition: all 0.3s ease;
}

.panel-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.task-enter-active {
  transition: all 0.3s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.animate-pop {
  animation: pop 0.25s ease;
}

@keyframes pop {
  0% { transform: scale(0.5); }
  100% { transform: scale(1); }
}
</style>
