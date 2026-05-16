<template>
  <MainLayout>

    <!-- 🔝 HEADER -->
    <div class="flex justify-between items-center mb-10">
      <div>
        <h1 class="text-2xl font-bold">Mis Overlays</h1>
        <p class="text-gray-500 text-sm">
          Administra tus overlays en tiempo real
        </p>
      </div>
    </div>

    <!-- 📊 STATS -->
    <div class="grid grid-cols-2 gap-6 mb-10">

      <div class="bg-white p-6 rounded-2xl shadow-sm">
        <p class="text-gray-400 text-sm mb-1">Overlays</p>
        <p class="text-3xl font-bold">{{ overlays.length }}</p>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-sm">
        <p class="text-gray-400 text-sm mb-1">Widgets</p>
        <p class="text-3xl font-bold">{{ totalWidgets }}</p>
      </div>

    </div>

    <!-- 🎴 GRID -->
    <div class="grid grid-cols-3 gap-6">

      <div
        v-for="overlay in overlays"
        :key="overlay.id"
        class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition"
      >

        <!-- GRADIENT HEADER -->
        <div class="h-32 bg-gradient-to-r from-purple-500 to-pink-500"></div>

        <!-- CONTENIDO -->
        <div class="p-4 flex justify-between items-start">

          <div>
            <h3 class="font-semibold">
              {{ overlay.name || 'Sin nombre' }}
            </h3>

            <p class="text-gray-400 text-sm">
              {{ overlay.widgets?.length || 0 }} widgets
            </p>
          </div>

          <!-- ICONOS -->
          <div class="flex gap-2">

            <!-- EDITAR -->
            <button
              @click="goToEditor(overlay.id)"
              class="p-2 rounded hover:bg-gray-100 transition"
            >
              ✏️
            </button>

            <!-- ELIMINAR -->
            <button
              @click="deleteOverlay(overlay.id)"
              class="p-2 rounded hover:bg-gray-100 transition"
            >
              🗑️
            </button>

          </div>

        </div>

      </div>

    </div>

    <!-- 🔥 MODAL ELIMINAR -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
    >

      <div class="bg-white rounded-2xl p-6 w-[400px] shadow-xl animate-fade">

        <h2 class="text-lg font-semibold mb-2">
          Eliminar overlay
        </h2>

        <p class="text-gray-500 text-sm mb-6">
          Esta acción no se puede deshacer.
        </p>

        <div class="flex justify-end gap-3">

          <button
            @click="showDeleteModal = false"
            class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Cancelar
          </button>

          <button
            @click="confirmDelete"
            class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
          >
            Eliminar
          </button>

        </div>

      </div>

    </div>

  </MainLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore"
import { db, auth } from "../firebase"
import MainLayout from '../layouts/MainLayout.vue'

const router = useRouter()

const overlays = ref([])

// 🔥 MODAL
const showDeleteModal = ref(false)
const overlayToDelete = ref(null)

// 🔢 TOTAL WIDGETS
const totalWidgets = computed(() => {
  return overlays.value.reduce((acc, o) => {
    return acc + (o.widgets?.length || 0)
  }, 0)
})

// 🔥 CARGAR OVERLAYS
onMounted(async () => {
  const user = auth.currentUser
  if (!user) return

  const snapshot = await getDocs(
    collection(db, "overlays", user.uid, "items")
  )

  overlays.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
})

// ✏️ EDITAR
const goToEditor = (id) => {
  router.push(`/editor?id=${id}`)
}

// 🗑️ ABRIR MODAL
const deleteOverlay = (id) => {
  overlayToDelete.value = id
  showDeleteModal.value = true
}

// 🔥 CONFIRMAR ELIMINACIÓN
const confirmDelete = async () => {
  const user = auth.currentUser
  if (!user) return

  await deleteDoc(
    doc(db, "overlays", user.uid, "items", overlayToDelete.value)
  )

  overlays.value = overlays.value.filter(
    o => o.id !== overlayToDelete.value
  )

  showDeleteModal.value = false
  overlayToDelete.value = null
}
</script>

<style>
@keyframes fade {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade {
  animation: fade 0.2s ease;
}
</style>