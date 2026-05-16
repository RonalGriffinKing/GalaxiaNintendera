<template>
  <div class="flex h-screen bg-[#F8FAFC] relative overflow-hidden">

    <!-- Glow fondo -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-pink-300 opacity-20 blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-300 opacity-20 blur-3xl pointer-events-none"></div>

    <!-- Sidebar -->
    <Sidebar />

    <!-- Contenido -->
    <div class="flex-1 flex flex-col relative z-10">

      <Topbar />

      <main class="p-6 overflow-y-auto">
        <slot />
      </main>

    </div>

  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import Topbar from '../components/Topbar.vue'
</script>