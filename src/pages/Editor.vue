<template>
  <div class="h-screen flex bg-[#0F172A] text-white pt-16">

    <!-- TOP BAR -->
    <div class="absolute top-0 left-0 right-0 h-16 bg-[#0B1220] border-b border-gray-800 flex items-center justify-between px-6 z-50">
      <div class="flex items-center gap-4">
        <button @click="$router.push('/')" class="text-gray-400 hover:text-white text-sm">
          Volver
        </button>

        <input
          v-model="overlayName"
          class="bg-transparent border border-gray-700 rounded px-3 py-1 text-sm"
        />
      </div>

      <div class="flex gap-3">
        <button @click="saveOverlay" class="bg-green-500 px-4 py-2 rounded-lg">Guardar</button>
        <button @click="openOverlay" class="bg-purple-500 px-4 py-2 rounded-lg">Visualizar</button>
        <button @click="copyLink" class="bg-gray-700 px-4 py-2 rounded-lg">Copiar</button>
      </div>
    </div>

    <!-- SIDEBAR -->
    <div class="w-64 bg-[#111827] p-4 border-r border-gray-800">
      <h2 class="mb-4 font-bold">Widgets</h2>

      <button class="w-full bg-purple-500 p-2 mb-2 rounded" @click="addGoalWidget">
        + Meta
      </button>

      <button class="w-full bg-blue-500 p-2 rounded" @click="addTodoWidget">
        + Misiones
      </button>
    </div>

    <!-- CANVAS PRO (TIKTOK) -->
    <div class="flex-1 flex items-center justify-center bg-[#020617]">

      <div class="relative" :style="scaledCanvas">

        <!-- CANVAS REAL -->
        <div
          class="absolute inset-0 bg-black overflow-hidden"
          style="width:1080px; height:1920px;"
        >

          <div
            v-for="widget in widgets"
            :key="widget.id + '-' + widget.type"
            class="absolute cursor-move group"
            :style="{ top: widget.y + 'px', left: widget.x + 'px' }"
            @mousedown="startDrag(widget, $event)"
            @click.stop="selected = widget"
          >

            <!-- DELETE -->
            <button
              @click.stop="removeWidget(widget.id)"
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition z-50"
            >
              ×
            </button>

            <WidgetRenderer :widget="widget" />

          </div>

        </div>

      </div>

    </div>

    <!-- PANEL DERECHO -->
    <div class="w-72 bg-[#111827] p-4 border-l border-gray-800">

      <h2 class="text-lg font-bold mb-4">Propiedades</h2>

      <div v-if="selected">
        <WidgetEditor :widget="selected" />
      </div>

      <div v-else class="text-gray-500 text-sm">
        Selecciona un widget
      </div>

    </div>

    <!-- TOAST -->
    <div v-if="toast.show" class="fixed bottom-4 right-4 bg-black px-4 py-2 rounded">
      {{ toast.message }}
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db, auth } from "../firebase"

import WidgetRenderer from '../components/WidgetRenderer.vue'
import WidgetEditor from '../components/WidgetEditor.vue'

const route = useRoute()
const overlayId = route.query.id

const widgets = ref([])
const selected = ref(null)
const overlayName = ref('Mi Overlay')

const toast = ref({ show: false, message: '' })

const showToast = (msg) => {
  toast.value = { show: true, message: msg }
  setTimeout(() => toast.value.show = false, 2000)
}

/* 🔥 ESCALA TIKTOK */
const scale = ref(1)

const updateScale = () => {
  const scaleX = window.innerWidth / 1080
  const scaleY = window.innerHeight / 1920
  scale.value = Math.min(scaleX, scaleY) * 0.9
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})

const scaledCanvas = computed(() => ({
  width: '1080px',
  height: '1920px',
  transform: `scale(${scale.value})`,
  transformOrigin: 'center center'
}))

/* 🔗 LINK OVERLAY */
const overlayLink = computed(() => {
  const user = auth.currentUser
  if (!user) return ''
  return `${window.location.origin}/overlay/${user.uid}_${overlayId}`
})

const openOverlay = () => window.open(overlayLink.value, '_blank')

const copyLink = async () => {
  await navigator.clipboard.writeText(overlayLink.value)
  showToast('Copiado')
}

/* 💾 SAVE */
const saveOverlay = async () => {
  const user = auth.currentUser
  if (!user) return

  await setDoc(doc(db, "overlays", user.uid, "items", overlayId), {
    widgets: widgets.value,
    name: overlayName.value
  })

  showToast('Guardado')
}

/* 🎯 WIDGETS */
const addGoalWidget = () => {
  widgets.value.push({
    id: Date.now(),
    type: 'goal',
    x: 100,
    y: 100,
    data: {
      current: 1200,
      goal: 2000,
      title: 'Meta'
    }
  })
}

const addTodoWidget = () => {
  widgets.value.push({
    id: Date.now(),
    type: 'todo',
    x: 150,
    y: 150,
    data: {
      tasks: [{ text: 'Nueva misión' }],
      currentIndex: 0
    }
  })
}

/* ❌ DELETE */
const removeWidget = (id) => {
  widgets.value = widgets.value.filter(w => w.id !== id)
}

/* 🖱 DRAG */
let dragging = null
let offsetX = 0
let offsetY = 0

const startDrag = (widget, e) => {
  dragging = widget
  offsetX = e.clientX - widget.x
  offsetY = e.clientY - widget.y

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!dragging) return
  dragging.x = e.clientX - offsetX
  dragging.y = e.clientY - offsetY
}

const stopDrag = () => {
  dragging = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

/* LOAD */
onMounted(async () => {
  const user = auth.currentUser
  if (!user) return

  const snap = await getDoc(doc(db, "overlays", user.uid, "items", overlayId))

  if (snap.exists()) {
    widgets.value = snap.data().widgets || []
    overlayName.value = snap.data().name || ''
  }
})
</script>