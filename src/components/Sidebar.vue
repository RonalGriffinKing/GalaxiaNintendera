<template>
  <div class="w-64 bg-white p-6 flex flex-col justify-between shadow-sm">

    <div>
      <h1 class="text-xl font-bold mb-8 flex items-center gap-2">
        ✨ Widget Dreams
      </h1>

      <nav class="space-y-2">

        <div class="p-3 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 font-medium">
          Inicio
        </div>

        <div class="p-3 rounded-xl hover:bg-gray-100 cursor-pointer">
          Mis Overlays
        </div>

        <div class="p-3 rounded-xl hover:bg-gray-100 cursor-pointer">
          Mis Widgets
        </div>

        <div class="p-3 rounded-xl hover:bg-gray-100 cursor-pointer">
          Ajustes
        </div>

      </nav>
    </div>
    <button
  @click="createOverlay"
  class="bg-gradient-to-r from-pink-400 to-purple-500 text-white p-3 rounded-xl font-semibold hover:opacity-90 transition"
>
  + Crear nuevo
</button>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const createOverlay = () => {
  const newId = Date.now().toString()
  router.push(`/editor?id=${newId}`)
}
</script>