<template>
  <div class="relative min-h-full">
    <div class="panel-header">
      <div>
        <h1 class="panel-title">Gestion de Overlays</h1>
        <p class="panel-subtitle">Administra tus escenas</p>
      </div>

      <button @click="openCreate" class="btn-primary-galaxy-xs flex items-center gap-2">
        <i class="fas fa-plus"></i>
        Crear overlay
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      <div
        v-for="overlay in overlays"
        :key="overlay.id"
        class="overlay-card group"
      >
        <div class="preview-box">
          <div class="preview-canvas">
            <div
              v-for="widget in overlay.widgets || []"
              :key="widget.id"
              class="preview-widget"
              :style="{ top: widget.y + 'px', left: widget.x + 'px' }"
            >
              <WidgetRenderer :widget="widget" />
            </div>
          </div>

          <div class="preview-overlay"></div>

          <div class="preview-count">
            {{ overlay.widgets?.length || 0 }} widgets
          </div>
        </div>

        <div class="p-3">
          <h3 class="font-bold text-xs text-gray-800 truncate">
            {{ overlay.name || 'Sin nombre' }}
          </h3>

          <div class="flex gap-1.5 border-t border-gray-100 pt-2 mt-2">
            <button
              @click="goToEditor(overlay.id)"
              class="mini-btn-xs btn-success"
              title="Editar escena"
            >
              <i class="fas fa-paint-brush"></i>
            </button>

            <button
              @click="openEdit(overlay)"
              class="mini-btn-xs btn-edit"
              title="Renombrar"
            >
              <i class="fas fa-pen"></i>
            </button>

            <button
              @click="triggerDelete(overlay.id)"
              class="mini-btn-xs btn-danger"
              title="Eliminar"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div
        v-if="showPanel"
        class="side-panel-backdrop"
        @click="closePanel"
      ></div>
    </Transition>

    <Transition name="slide">
      <div v-if="showPanel" class="panel">
        <div class="p-6 flex justify-between items-center border-b">
          <h2 class="font-black text-sm uppercase">
            {{ isEditing ? 'Editar overlay' : 'Nuevo overlay' }}
          </h2>

          <button
            @click="closePanel"
            :disabled="isSaving"
            class="panel-close-btn"
          >
            x
          </button>
        </div>

        <div class="p-6 space-y-4 flex-1">
          <input
            v-model="form.name"
            placeholder="Nombre del overlay"
            class="app-input"
            :disabled="isSaving"
            @keyup.enter="saveOverlay"
          />
        </div>

        <div class="p-6 border-t">
          <button
            @click="saveOverlay"
            :disabled="isSaving || !form.name"
            class="btn-primary-galaxy w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ isSaving ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar cambios' : 'Crear overlay') }}
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="confirmDialog.show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm"
          @click="!isDeleting && (confirmDialog.show = false)"
        ></div>

        <div class="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl text-center">
          <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg bg-red-100 text-red-600">
            <i class="fas fa-trash-alt"></i>
          </div>

          <h2 class="text-lg font-black text-gray-800 mb-1">
            {{ confirmDialog.title }}
          </h2>

          <p class="text-gray-500 mb-6 text-xs">
            {{ confirmDialog.message }}
          </p>

          <div class="flex gap-2">
            <button
              @click="confirmDialog.show = false"
              :disabled="isDeleting"
              class="flex-1 py-2 text-xs rounded-xl font-bold bg-gray-100 text-gray-500 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              @click="confirmDialog.action"
              :disabled="isDeleting"
              class="flex-1 py-2 text-xs rounded-xl font-bold text-white shadow-lg transition-all bg-red-500 shadow-red-100 disabled:opacity-60"
            >
              {{ isDeleting ? 'Eliminando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show" class="app-toast">
          <div :class="['app-toast-icon', toast.type]">
            <i :class="toast.type === 'delete' ? 'fas fa-trash-alt' : 'fas fa-check'"></i>
          </div>

          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/firebase"
import WidgetRenderer from '@/components/widgets/WidgetRenderer.vue'

const router = useRouter()

const overlays = ref([])
const showPanel = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)

const form = ref({ id: null, name: '' })
const toast = ref({ show: false, message: '', type: 'success' })
const confirmDialog = ref({ show: false, id: null, title: '', message: '', action: null })

const loadOverlays = async () => {
  const user = auth.currentUser
  if (!user) return

  const snap = await getDocs(collection(db, "overlays", user.uid, "items"))
  overlays.value = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }))
}

onMounted(loadOverlays)

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => {
    toast.value.show = false
  }, 2500)
}

const openCreate = () => {
  isEditing.value = false
  form.value = { id: null, name: '' }
  showPanel.value = true
}

const openEdit = (overlay) => {
  isEditing.value = true
  form.value = { ...overlay }
  showPanel.value = true
}

const closePanel = () => {
  if (isSaving.value) return
  showPanel.value = false
}

const saveOverlay = async () => {
  const user = auth.currentUser
  if (!user || !form.value.name || isSaving.value) return

  isSaving.value = true

  try {
    if (isEditing.value) {
      await updateDoc(doc(db, "overlays", user.uid, "items", form.value.id), {
        name: form.value.name
      })
      showToast('CAMBIOS GUARDADOS')
    } else {
      const id = Date.now().toString()
      await setDoc(doc(db, "overlays", user.uid, "items", id), {
        name: form.value.name,
        widgets: [],
        createdAt: Date.now()
      })
      showToast('OVERLAY CREADO')
    }

    await loadOverlays()
    showPanel.value = false
  } catch (error) {
    console.error(error)
    showToast('No se pudo guardar el overlay', 'delete')
  } finally {
    isSaving.value = false
  }
}

const triggerDelete = (id) => {
  confirmDialog.value = {
    show: true,
    id,
    title: 'Eliminar overlay?',
    message: 'Esta accion no se puede deshacer.',
    action: () => executeDelete(id)
  }
}

const executeDelete = async (id) => {
  const user = auth.currentUser
  if (!user || isDeleting.value) return

  isDeleting.value = true

  try {
    await deleteDoc(doc(db, "overlays", user.uid, "items", id))
    overlays.value = overlays.value.filter(o => o.id !== id)
    confirmDialog.value.show = false
    showToast('OVERLAY ELIMINADO', 'delete')
  } catch (error) {
    console.error(error)
    showToast('No se pudo eliminar el overlay', 'delete')
  } finally {
    isDeleting.value = false
  }
}

const goToEditor = (id) => {
  router.push(`/editor?id=${id}`)
}
</script>

<style scoped>
.preview-box {
  background: #000;
  border-radius: 12px 12px 0 0;
  height: 96px;
  overflow: hidden;
  position: relative;
}

.preview-canvas {
  height: 1920px;
  position: absolute;
  transform: scale(0.08);
  transform-origin: top left;
  width: 1080px;
}

.preview-widget {
  position: absolute;
}

.preview-overlay {
  background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
  inset: 0;
  position: absolute;
}

.preview-count {
  bottom: 4px;
  color: white;
  font-size: 9px;
  font-weight: 900;
  left: 6px;
  position: absolute;
}

.overlay-card {
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  transition: all 0.3s ease;
}

.overlay-card:hover {
  box-shadow: 0 8px 15px rgba(0,0,0,0.04);
  transform: translateY(-2px);
}

.side-panel-backdrop {
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(16px);
  inset: 0;
  position: fixed;
  z-index: 2000;
}

.panel {
  background: white;
  box-shadow: -10px 0 30px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  position: fixed;
  right: 0;
  top: 0;
  width: min(380px, 100vw);
  z-index: 2001;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: 0.3s;
}

.slide-enter-from {
  transform: translateX(100%);
}

@media (max-width: 760px) {
  .panel-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .panel-header button {
    justify-content: center;
    width: 100%;
  }

  .panel {
    border-radius: 0;
    width: 100vw;
  }

  .panel > div {
    padding: 18px;
  }
}

@media (max-width: 520px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
