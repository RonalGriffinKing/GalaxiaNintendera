<template>
  <div>
    <h3 class="section-title mb-3">Misiones</h3>

    <div
      v-for="(task, index) in localTasks"
      :key="index"
      class="mb-3 bg-gray-900/40 p-2 rounded"
    >
      <div class="flex gap-2 mb-2">
        <input
          v-model="task.text"
          placeholder="Escribe una mision..."
          class="app-input flex-1 bg-gray-800 text-white"
        />

        <button
          @click="removeTask(index)"
          class="text-red-400 hover:text-red-600 text-sm"
        >
          x
        </button>
      </div>
    </div>

    <button
      @click="addTask"
      :disabled="localTasks.length >= 5"
      class="w-full p-2 rounded mb-2 text-xs font-black uppercase transition"
      :class="localTasks.length >= 5
        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
        : 'bg-gray-700 hover:bg-gray-600'"
    >
      + Anadir mision
    </button>

    <p class="section-caption mb-4">
      {{ localTasks.length }}/5 misiones
    </p>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="app-label">Fondo</label>
        <input type="color" v-model="widget.data.bgColor" class="w-10 h-8" />
      </div>

      <div class="flex items-center justify-between">
        <label class="app-label">Texto</label>
        <input type="color" v-model="widget.data.textColor" class="w-10 h-8" />
      </div>

      <div class="flex items-center justify-between">
        <label class="app-label">Color burbuja</label>
        <input type="color" v-model="widget.data.bubbleColor" class="w-10 h-8" />
      </div>
    </div>

    <label class="app-label mt-4 block">
      Tamano texto
    </label>

    <input
      type="range"
      min="12"
      max="40"
      v-model="widget.data.fontSize"
      class="w-full"
    />

    <p class="section-caption mb-3">
      {{ widget.data.fontSize || 16 }} px
    </p>

    <label class="app-label block">
      Tamano burbuja
    </label>

    <input
      type="range"
      min="40"
      max="120"
      v-model="widget.data.bubbleSize"
      class="w-full"
    />

    <p class="section-caption mb-3">
      {{ widget.data.bubbleSize || 70 }} px
    </p>

    <label class="app-label block">
      Icono burbuja
    </label>

    <select
      v-model="widget.data.icon"
      class="app-input bg-gray-800 text-white"
    >
      <option value="fa-solid fa-star">Star</option>
      <option value="fa-solid fa-heart">Heart</option>
      <option value="fa-solid fa-crown">Crown</option>
      <option value="fa-solid fa-fire">Fire</option>
      <option value="fa-solid fa-bolt">Bolt</option>
    </select>

    <button
      @click="saveAndActivate"
      class="w-full bg-green-500 hover:bg-green-600 p-2 rounded text-xs font-black uppercase mt-5"
    >
      {{ widget.isActive === false ? 'Guardar y activar' : 'Guardar misiones' }}
    </button>

    <p class="section-caption mt-2">
      Vista en tiempo real
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  widget: Object
})

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

const localTasks = ref(
  (props.widget.data.tasks || []).map(task => ({
    text: task.text || '',
    done: task.done || false
  }))
)

const addTask = () => {
  if (localTasks.value.length >= 5) return

  localTasks.value.push({
    text: '',
    done: false
  })
}

const removeTask = (index) => {
  localTasks.value.splice(index, 1)
}

watch(localTasks, (val) => {
  props.widget.data.tasks = val
}, { deep: true })

const saveAndActivate = () => {
  props.widget.data.tasks = localTasks.value

  if (props.widget.isActive === false) {
    props.widget.isActive = true
  }
}
</script>
