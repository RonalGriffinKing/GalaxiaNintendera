<template>
  <div>

    <h3 class="text-sm text-gray-400 mb-3">Meta</h3>

    <!-- TEXTO -->
    <label class="text-sm text-gray-400">Título</label>
    <input v-model="widget.data.title" class="input" />

    <!-- VALORES -->
    <label class="text-sm text-gray-400">Actual</label>
    <input type="number" v-model="widget.data.current" class="input" />

    <label class="text-sm text-gray-400">Meta</label>
    <input type="number" v-model="widget.data.goal" class="input" />

    <!-- 🎨 COLORES -->
    <div class="space-y-3 mt-3">

      <div class="flex justify-between items-center">
        <label class="text-sm text-gray-400">Fondo</label>
        <input type="color" v-model="widget.data.bgColorRaw" class="picker" />
      </div>

      <div class="flex justify-between items-center">
        <label class="text-sm text-gray-400">Texto</label>
        <input type="color" v-model="widget.data.textColorRaw" class="picker" />
      </div>

      <div class="flex justify-between items-center">
        <label class="text-sm text-gray-400">Barra</label>
        <input type="color" v-model="widget.data.barColor" class="picker" />
      </div>

      <div class="flex justify-between items-center">
        <label class="text-sm text-gray-400">Borde</label>
        <input type="color" v-model="widget.data.borderColor" class="picker" />
      </div>

    </div>

    <!-- 📏 TAMAÑO PRO -->
    <label class="text-sm text-gray-400 mt-4 block">Ancho</label>
    <input
      type="range"
      min="300"
      max="1000"
      step="10"
      v-model="widget.data.width"
      class="w-full"
    />
    <p class="text-xs text-gray-500 mb-2">
      {{ widget.data.width || 500 }} px
    </p>

    <label class="text-sm text-gray-400">Alto</label>
    <input
      type="range"
      min="140"
      max="500"
      step="10"
      v-model="widget.data.height"
      class="w-full"
    />
    <p class="text-xs text-gray-500">
      {{ widget.data.height || 180 }} px
    </p>

    <!-- 📊 ALTURA BARRA (MUCHO MÁS VISIBLE) -->
    <label class="text-sm text-gray-400 mt-4 block">
      Altura barra
    </label>

    <input
      type="range"
      min="6"
      max="50"
      step="1"
      v-model="widget.data.barHeight"
      class="w-full"
    />

    <p class="text-xs text-gray-500 mb-3">
      {{ widget.data.barHeight || 16 }} px
    </p>

    <!-- 🏆 ICONO COMPLETADO -->
    <label class="text-sm text-gray-400 mt-2 block">
      Icono completado
    </label>

    <div class="flex gap-2 items-center mt-2">

      <select
        v-model="widget.data.completeIcon"
        class="bg-gray-800 text-white text-xs p-2 rounded"
      >
        <option value="fa-crown">👑 Crown</option>
        <option value="fa-star">⭐ Star</option>
        <option value="fa-trophy">🏆 Trophy</option>
        <option value="fa-fire">🔥 Fire</option>
        <option value="fa-check">✔ Check</option>
      </select>

      <select
        v-model="widget.data.completeIconStyle"
        class="bg-gray-800 text-white text-xs p-2 rounded"
      >
        <option value="fa-solid">Solid</option>
        <option value="fa-regular">Regular</option>
      </select>

      <input
        type="color"
        v-model="widget.data.completeIconColor"
        class="w-8 h-8 cursor-pointer"
      />

    </div>

    <!-- 🔲 BORDES -->
    <label class="text-sm text-gray-400 mt-4 block mb-2">
      Bordes
    </label>

    <div class="flex gap-2">
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

  </div>
</template>

<script setup>
defineProps({ widget: Object })
</script>

<style>
.input {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: #1f2937;
  color: white;
}

.picker {
  width: 40px;
  height: 28px;
  border: none;
  cursor: pointer;
}
</style>