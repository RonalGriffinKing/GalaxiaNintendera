<template>
  <div class="min-h-screen bg-[#0F172A] text-white relative overflow-hidden">

    <!-- 🌈 BACKGROUND DECOR -->
    <div class="absolute top-0 left-0 w-96 h-96 bg-purple-500 opacity-20 blur-3xl rounded-full"></div>
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-pink-500 opacity-20 blur-3xl rounded-full"></div>

    <!-- 🔝 NAVBAR -->
    <div class="flex justify-between items-center px-8 py-5 relative z-10">

      <div class="flex items-center gap-2 font-bold text-lg">
        <div class="w-6 h-6 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"></div>
        Widget Dreams
      </div>

      <div class="flex gap-3">
        <button
          @click="$router.push('/login')"
          class="px-4 py-2 text-sm text-gray-300 hover:text-white"
        >
          Iniciar sesión
        </button>

        <button
          @click="$router.push('/login')"
          class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium"
        >
          Registrarse
        </button>
      </div>

    </div>

    <!-- 🚀 HERO -->
    <div class="flex flex-col items-center text-center mt-24 px-6 relative z-10">

      <h1 class="text-4xl md:text-5xl font-bold leading-tight">
        Haz tus streams
        <span class="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
          interactivos
        </span>
      </h1>

      <p class="text-gray-400 mt-4 max-w-xl">
        Crea overlays dinámicos con misiones, metas y widgets en tiempo real para TikTok, Twitch y más.
      </p>

      <div class="flex gap-4 mt-6">
        <button
          @click="$router.push('/login')"
          class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold"
        >
          Crear overlay
        </button>

        <button
          @click="scrollToDemo"
          class="px-6 py-3 border border-gray-600 rounded-lg"
        >
          Ver demo
        </button>
      </div>

    </div>

    <!-- 🎥 DEMO VISUAL -->
    <div ref="demo" class="mt-20 flex justify-center relative z-10">

      <div class="bg-[#020617] border border-gray-800 rounded-2xl p-6 shadow-2xl">

        <!-- SIMULACIÓN -->
        <div class="space-y-6">

          <!-- META -->
          <div class="bg-white text-black px-5 py-4 rounded-xl w-72 shadow">
            <p class="text-sm text-gray-500">Meta de follows</p>

            <div class="flex justify-between text-sm mt-2">
              <span>1200</span>
              <span>2000</span>
            </div>

            <div class="h-3 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-pink-400 to-purple-500 w-2/3"></div>
            </div>
          </div>

          <!-- MISIÓN -->
          <div class="bg-white text-black px-5 py-4 rounded-xl w-72 shadow flex justify-between items-center">
            <div class="flex items-center gap-2">
              ⭐
              <p class="font-semibold text-sm">Consigue 5 likes</p>
            </div>

            ✔
          </div>

        </div>

      </div>

    </div>

    <!-- ⚡ FEATURES -->
    <div class="mt-24 px-8 grid md:grid-cols-4 gap-6 relative z-10">

      <div class="bg-[#020617] border border-gray-800 p-5 rounded-xl">
        🎯
        <h3 class="mt-2 font-semibold">Metas dinámicas</h3>
        <p class="text-gray-400 text-sm">Actualización en tiempo real</p>
      </div>

      <div class="bg-[#020617] border border-gray-800 p-5 rounded-xl">
        📝
        <h3 class="mt-2 font-semibold">Misiones</h3>
        <p class="text-gray-400 text-sm">Interacción con tu chat</p>
      </div>

      <div class="bg-[#020617] border border-gray-800 p-5 rounded-xl">
        🎨
        <h3 class="mt-2 font-semibold">Personalización</h3>
        <p class="text-gray-400 text-sm">Colores, tamaños, iconos</p>
      </div>

      <div class="bg-[#020617] border border-gray-800 p-5 rounded-xl">
        ⚡
        <h3 class="mt-2 font-semibold">Tiempo real</h3>
        <p class="text-gray-400 text-sm">Sin recargar</p>
      </div>

    </div>

    <!-- 💥 CTA FINAL -->
    <div class="mt-24 mb-20 text-center relative z-10">

      <h2 class="text-2xl font-bold">
        Empieza gratis en menos de 1 minuto
      </h2>

      <button
        @click="$router.push('/login')"
        class="mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold"
      >
        Crear mi overlay
      </button>

    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const demo = ref(null)

const scrollToDemo = () => {
  demo.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>