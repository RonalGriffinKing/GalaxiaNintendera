<template>
  <div :style="cardStyle" class="relative shadow-xl overflow-hidden">

    <!-- CONTENIDO -->
    <div class="w-full h-full flex items-center justify-between px-8 py-6">

      <!-- IZQUIERDA -->
      <div class="flex items-center gap-4 flex-1">

        <i
          v-if="currentTask?.icon"
          :class="[currentTask.style || 'fa-solid', currentTask.icon]"
          :style="{ color: currentTask.color || '#000', fontSize: '28px' }"
        ></i>

        <p class="font-semibold text-lg leading-tight">
          {{ currentTask?.text || 'Sin misión' }}
        </p>

      </div>

      <!-- ✔ -->
      <button
        @click="complete"
        class="text-3xl opacity-80 hover:opacity-100 transition"
      >
        ✔
      </button>

    </div>

    <!-- 🎉 ANIMACIÓN -->
    <div
      v-if="showComplete"
      class="absolute inset-0 flex items-center justify-center z-20"
      :style="cardStyle"
    >
      <p class="text-2xl font-bold text-green-500 animate-bounce">
        COMPLETADO
      </p>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ widget: Object })

const showComplete = ref(false)

const cardStyle = computed(() => ({
  width: (props.widget.data.width || 500) + 'px',
  height: (props.widget.data.height || 160) + 'px',

  backgroundColor: props.widget.data.bgColorRaw || '#ffffff',
  color: props.widget.data.textColorRaw || '#000000',

  border: props.widget.data.borderColor
    ? `3px solid ${props.widget.data.borderColor}`
    : 'none',

  borderRadius: props.widget.data.rounded ? '18px' : '0px'
}))

const currentTask = computed(() => {
  const tasks = props.widget.data.tasks || []
  const index = props.widget.data.currentIndex || 0
  return tasks[index] || null
})

const complete = () => {
  showComplete.value = true

  setTimeout(() => {
    showComplete.value = false

    const tasks = props.widget.data.tasks || []
    let index = props.widget.data.currentIndex || 0

    if (index < tasks.length - 1) {
      props.widget.data.currentIndex++
    } else {
      props.widget.isActive = false
    }
  }, 800)
}
</script>