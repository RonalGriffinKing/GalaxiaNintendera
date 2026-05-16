<template>
  <div class="h-screen flex bg-gray-100 text-gray-900 overflow-hidden">
    <div class="absolute inset-0 -z-10">
      <div class="absolute top-[-120px] left-[-100px] w-[500px] h-[500px] bg-pink-300 opacity-30 blur-[120px] rounded-full"></div>
      <div class="absolute bottom-[-120px] right-[-100px] w-[500px] h-[500px] bg-purple-300 opacity-30 blur-[120px] rounded-full"></div>
    </div>

    <div class="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur border-b flex items-center justify-between px-6 z-50">
      <div class="flex items-center gap-4">
        <button
          @click="$router.push('/dashboard')"
          class="text-sm font-bold text-gray-500 hover:text-gray-900"
        >
          Volver
        </button>

        <input
          v-model="overlayName"
          class="app-input max-w-64 bg-gray-100 py-1"
        />
      </div>

      <div class="flex gap-3">
        <button @click="saveOverlay" class="btn-primary-galaxy-xs">
          Guardar
        </button>

        <button @click="openOverlay" class="btn-secondary">
          Visualizar
        </button>

        <button @click="copyLink" class="btn-ghost">
          Copiar
        </button>
      </div>
    </div>

    <div class="w-64 bg-white/80 backdrop-blur border-r p-4 pt-20">
      <h2 class="section-title mb-4">Widgets</h2>

      <button class="btn-widget bg-purple-500" @click="addGoalWidget">
        + Meta
      </button>

      <button class="btn-widget bg-blue-500" @click="addTodoWidget">
        + Misiones
      </button>

      <button class="btn-widget bg-green-500" @click="addChatWidget">
        + Chat
      </button>
    </div>

    <div class="flex-1 flex items-center justify-center pt-16">
      <div class="relative" :style="scaledCanvas">
        <div
          class="absolute inset-0 bg-black rounded-xl overflow-hidden shadow-2xl"
          style="width:1080px; height:1920px;"
        >
          <div
            v-for="widget in widgets"
            :key="widget.id"
            class="absolute cursor-move group"
            :style="{ top: widget.y + 'px', left: widget.x + 'px' }"
            @mousedown="startDrag(widget, $event)"
            @click.stop="selected = widget"
          >
            <button
              @click.stop="removeWidget(widget.id)"
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition"
            >
              x
            </button>

            <WidgetRenderer :widget="widget" />
          </div>
        </div>
      </div>
    </div>

    <div class="w-80 bg-white/80 backdrop-blur border-l p-5 pt-20">
      <h2 class="section-title mb-4">Propiedades</h2>

      <div v-if="selected">
        <WidgetEditor :widget="selected" />
      </div>

      <div v-else class="text-gray-400 text-sm">
        Selecciona un widget
      </div>
    </div>

    <div
      v-if="toast.show"
      class="app-toast"
    >
      <span class="app-toast-icon success">
        <i class="fas fa-check"></i>
      </span>
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

import WidgetRenderer from '@/features/widgets/components/WidgetRenderer.vue'
import WidgetEditor from '@/features/widgets/components/WidgetEditor.vue'

const route = useRoute()
const overlayId = route.query.id

const widgets = ref([])
const selected = ref(null)
const overlayName = ref('Mi Overlay')
const toast = ref({ show: false, message: '' })
const scale = ref(1)

const showToast = (msg) => {
  toast.value = { show: true, message: msg }
  setTimeout(() => toast.value.show = false, 2000)
}

const updateScale = () => {
  const scaleX = window.innerWidth / 1080
  const scaleY = window.innerHeight / 1920
  scale.value = Math.min(scaleX, scaleY) * 0.9
}

const scaledCanvas = computed(() => ({
  width: '1080px',
  height: '1920px',
  transform: `scale(${scale.value})`,
  transformOrigin: 'center center'
}))

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

const saveOverlay = async () => {
  const user = auth.currentUser
  if (!user) return

  await setDoc(doc(db, 'overlays', user.uid, 'items', overlayId), {
    widgets: widgets.value,
    name: overlayName.value
  })

  showToast('Guardado')
}

const addGoalWidget = () => {
  widgets.value.push({
    id: Date.now(),
    type: 'goal',
    x: 100,
    y: 100,
    data: { current: 1000, goal: 2000, title: 'Meta' }
  })
}

const addTodoWidget = () => {
  widgets.value.push({
    id: Date.now(),
    type: 'todo',
    x: 150,
    y: 150,
    data: { tasks: [{ text: 'Nueva mision' }], currentIndex: 0 }
  })
}

const addChatWidget = () => {
  const widgetWidth = 400

  widgets.value.push({
    id: Date.now(),
    type: 'chat',
    x: (1080 - widgetWidth) / 2,
    y: 1920 / 2,
    data: {
      channel: 'ibai',
      tiktokUser: '',
      bgColor: '#1f2937',
      textColor: '#ffffff',
      fontSize: 18,
      width: widgetWidth,
      rounded: true,
      borderColor: '#ffffff',
      borderWidth: 2
    }
  })
}

const removeWidget = (id) => {
  widgets.value = widgets.value.filter(w => w.id !== id)
}

let dragging = null
let offsetX = 0
let offsetY = 0

const startDrag = (widget, e) => {
  dragging = widget
  offsetX = e.clientX - widget.x * scale.value
  offsetY = e.clientY - widget.y * scale.value

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!dragging) return
  dragging.x = (e.clientX - offsetX) / scale.value
  dragging.y = (e.clientY - offsetY) / scale.value
}

const stopDrag = () => {
  dragging = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

onMounted(async () => {
  updateScale()
  window.addEventListener('resize', updateScale)

  const user = auth.currentUser
  if (!user) return

  const snap = await getDoc(doc(db, 'overlays', user.uid, 'items', overlayId))

  if (snap.exists()) {
    widgets.value = snap.data().widgets || []
    overlayName.value = snap.data().name || ''
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<style>
.btn-secondary {
  background: #6366f1;
  color: white;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.btn-ghost {
  background: #e5e7eb;
  padding: 8px 14px;
  border-radius: 10px;
  color: #374151;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.btn-widget {
  width: 100%;
  color: white;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
</style>
