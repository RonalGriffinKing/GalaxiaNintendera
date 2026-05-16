<template>
  <div>

    <h3 class="text-sm text-gray-400 mb-3">Misiones</h3>

    <!-- LISTA -->
    <div
      v-for="(task, index) in localTasks"
      :key="index"
      class="mb-3 bg-gray-900/40 p-2 rounded"
    >

      <!-- TEXTO -->
      <div class="flex gap-2 mb-2">
        <input
          v-model="task.text"
          placeholder="Escribe una misión..."
          class="flex-1 p-2 rounded bg-gray-800 text-white text-sm"
        />

        <button
          @click="removeTask(index)"
          class="text-red-400 hover:text-red-600 text-sm"
        >
          ×
        </button>
      </div>

      <!-- 🎨 ICONOS -->
      <div class="flex gap-2 items-center">

        <!-- ICONO -->
        <select
          v-model="task.icon"
          class="bg-gray-800 text-white text-xs p-2 rounded"
        >
          <option value="fa-star">⭐ Star</option>
          <option value="fa-crown">👑 Crown</option>
          <option value="fa-heart">❤️ Heart</option>
          <option value="fa-fire">🔥 Fire</option>
          <option value="fa-bolt">⚡ Bolt</option>
        </select>

        <!-- ESTILO -->
        <select
          v-model="task.style"
          class="bg-gray-800 text-white text-xs p-2 rounded"
        >
          <option value="fa-solid">Solid</option>
          <option value="fa-regular">Regular</option>
        </select>

        <!-- COLOR -->
        <input
          type="color"
          v-model="task.color"
          class="w-8 h-8 p-0 border-none cursor-pointer bg-transparent"
        />

      </div>

    </div>

    <!-- ➕ AÑADIR -->
    <button
      @click="addTask"
      :disabled="localTasks.length >= 3"
      class="w-full p-2 rounded mb-2 text-sm transition"
      :class="localTasks.length >= 3
        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
        : 'bg-gray-700 hover:bg-gray-600'"
    >
      + Añadir misión
    </button>

    <!-- CONTADOR -->
    <p class="text-xs text-gray-500 mb-4">
      {{ localTasks.length }}/3 misiones
    </p>

    <!-- 🎨 COLORES -->
    <div class="space-y-3">

      <div class="flex items-center justify-between">
        <label class="text-sm text-gray-400">Fondo</label>
        <input type="color" v-model="widget.data.bgColorRaw" class="w-10 h-8" />
      </div>

      <div class="flex items-center justify-between">
        <label class="text-sm text-gray-400">Texto</label>
        <input type="color" v-model="widget.data.textColorRaw" class="w-10 h-8" />
      </div>

      <div class="flex items-center justify-between">
        <label class="text-sm text-gray-400">Borde</label>
        <input type="color" v-model="widget.data.borderColor" class="w-10 h-8" />
      </div>

    </div>

    <!-- 🔧 TAMAÑO PRO -->

<label class="text-sm text-gray-400 mt-4 block mb-2">
  Ancho
</label>

<input
  type="range"
  min="250"
  max="1000"
  step="10"
  v-model="widget.data.width"
  class="w-full"
/>

<p class="text-xs text-gray-500 mb-3">
  {{ widget.data.width || 500 }} px
</p>


<label class="text-sm text-gray-400 block mb-2">
  Alto
</label>

<input
  type="range"
  min="120"
  max="500"
  step="10"
  v-model="widget.data.height"
  class="w-full"
/>

<p class="text-xs text-gray-500">
  {{ widget.data.height || 160 }} px
</p>

    <div class="flex gap-2 mb-4">
      <button
        @click="widget.data.rounded = true"
        class="flex-1 bg-gray-700 p-2 rounded-lg text-sm"
      >
        Redondeado
      </button>

      <button
        @click="widget.data.rounded = false"
        class="flex-1 bg-gray-700 p-2 text-sm"
      >
        Recto
      </button>
    </div>

    <!-- 💾 GUARDAR -->
    <button
      @click="saveAndActivate"
      class="w-full bg-green-500 hover:bg-green-600 p-2 rounded text-sm font-medium"
    >
      {{ widget.isActive === false ? 'Guardar y activar' : 'Guardar misiones' }}
    </button>

    <p class="text-xs text-gray-500 mt-2">
      Vista previa en tiempo real ⚡
    </p>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  widget: Object
})

const localTasks = ref(
  (props.widget.data.tasks || []).map(task => ({
    text: task.text || '',
    icon: task.icon || 'fa-star',
    style: task.style || 'fa-solid',
    color: task.color || '#facc15'
  }))
)

// ➕ añadir
const addTask = () => {
  if (localTasks.value.length >= 3) return

  localTasks.value.push({
    text: '',
    icon: 'fa-star',
    style: 'fa-solid',
    color: '#facc15'
  })
}

// ❌ eliminar
const removeTask = (index) => {
  localTasks.value.splice(index, 1)
}

// 🔄 sync en vivo
watch(localTasks, (val) => {
  props.widget.data.tasks = val
}, { deep: true })

// 💾 guardar
const saveAndActivate = () => {
  props.widget.data.tasks = localTasks.value

  if (props.widget.isActive === false) {
    props.widget.isActive = true
  }
}
</script>