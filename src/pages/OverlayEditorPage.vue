<template>
  <div class="h-screen flex bg-gray-100 text-gray-900 overflow-hidden">
    <div class="absolute inset-0 -z-10">
      <div class="absolute top-[-120px] left-[-100px] w-[500px] h-[500px] bg-pink-300 opacity-30 blur-[120px] rounded-full"></div>
      <div class="absolute bottom-[-120px] right-[-100px] w-[500px] h-[500px] bg-purple-300 opacity-30 blur-[120px] rounded-full"></div>
    </div>

    <div class="editor-header absolute top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur border-b flex items-center justify-between px-6 z-50">
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

      <div class="format-switch" aria-label="Formato del overlay">
        <button v-for="preset in formatPresets" :key="preset.id" :class="{ active: format === preset.id }" @click="setFormat(preset)">
          <i :class="preset.icon"></i><span>{{ preset.label }}</span><small>{{ preset.width }} x {{ preset.height }}</small>
        </button>
      </div>

      <div class="flex gap-3 header-actions">
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

      <button class="btn-widget timer-button" @click="addTimerWidget">
        <i class="fas fa-stopwatch"></i> Temporizador
      </button>

      <div class="format-summary">
        <i :class="format === 'horizontal' ? 'fas fa-display' : 'fas fa-mobile-screen-button'"></i>
        <div><strong>{{ format === 'horizontal' ? 'PC / OBS' : 'Vertical / TikTok' }}</strong><span>{{ canvasWidth }} x {{ canvasHeight }} px</span></div>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center pt-16">
      <div class="relative" :style="scaledCanvas">
        <div
          ref="canvasElement"
          class="canvas absolute inset-0 bg-black rounded-xl overflow-hidden shadow-2xl"
          :style="canvasStyle"
        >
          <div
            v-for="widget in widgets"
            :key="widget.id"
            class="absolute cursor-move group"
            :style="{ top: widget.y + 'px', left: widget.x + 'px' }"
            @pointerdown="startDrag(widget, $event)"
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

    <div class="properties-panel w-80 bg-white/80 backdrop-blur border-l p-5 pt-20 overflow-y-auto">
      <h2 class="section-title mb-4">Propiedades</h2>

      <div v-if="selected">
        <div class="align-panel">
          <div class="align-heading"><span>Alinear en el lienzo</span><small>Posicion exacta</small></div>
          <div class="align-grid">
            <button v-for="position in alignPositions" :key="position.id" :title="position.label" @click="alignWidget(position.horizontal, position.vertical)">
              <i :class="position.icon" :style="position.rotation ? { transform: `rotate(${position.rotation}deg)` } : null"></i>
            </button>
          </div>
          <div class="axis-actions">
            <button @click="alignAxis('horizontal')"><i class="fas fa-arrows-left-right-to-line"></i> Centrar horizontal</button>
            <button @click="alignAxis('vertical')"><i class="fas fa-arrows-up-down-to-line"></i> Centrar vertical</button>
          </div>
        </div>
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

import WidgetRenderer from '@/components/widgets/WidgetRenderer.vue'
import WidgetEditor from '@/components/widgets/WidgetEditor.vue'

const route = useRoute()
const overlayId = route.query.id

const widgets = ref([])
const selected = ref(null)
const overlayName = ref('Mi Overlay')
const toast = ref({ show: false, message: '' })
const scale = ref(1)
const overlayVersion = ref(Date.now())
const canvasElement = ref(null)
const format = ref('vertical')
const canvasWidth = ref(1080)
const canvasHeight = ref(1920)
const formatPresets = [
  { id: 'horizontal', label: 'Horizontal', width: 1920, height: 1080, icon: 'fas fa-display' },
  { id: 'vertical', label: 'Vertical', width: 1080, height: 1920, icon: 'fas fa-mobile-screen-button' }
]
const alignPositions = [
  { id: 'top-left', label: 'Arriba izquierda', horizontal: 'left', vertical: 'top', icon: 'fas fa-arrow-up', rotation: -45 },
  { id: 'top-center', label: 'Centrar arriba', horizontal: 'center', vertical: 'top', icon: 'fas fa-arrow-up' },
  { id: 'top-right', label: 'Arriba derecha', horizontal: 'right', vertical: 'top', icon: 'fas fa-arrow-up', rotation: 45 },
  { id: 'middle-left', label: 'Centro izquierda', horizontal: 'left', vertical: 'middle', icon: 'fas fa-arrow-left' },
  { id: 'center', label: 'Centro absoluto', horizontal: 'center', vertical: 'middle', icon: 'fas fa-crosshairs' },
  { id: 'middle-right', label: 'Centro derecha', horizontal: 'right', vertical: 'middle', icon: 'fas fa-arrow-right' },
  { id: 'bottom-left', label: 'Abajo izquierda', horizontal: 'left', vertical: 'bottom', icon: 'fas fa-arrow-up', rotation: -135 },
  { id: 'bottom-center', label: 'Centrar abajo', horizontal: 'center', vertical: 'bottom', icon: 'fas fa-arrow-down' },
  { id: 'bottom-right', label: 'Abajo derecha', horizontal: 'right', vertical: 'bottom', icon: 'fas fa-arrow-up', rotation: 135 }
]

const showToast = (msg) => {
  toast.value = { show: true, message: msg }
  setTimeout(() => toast.value.show = false, 2000)
}

const updateScale = () => {
  const availableWidth = Math.max(320, window.innerWidth - 640)
  const availableHeight = Math.max(320, window.innerHeight - 105)
  scale.value = Math.min(availableWidth / canvasWidth.value, availableHeight / canvasHeight.value) * 0.94
}

const scaledCanvas = computed(() => ({
  width: `${canvasWidth.value * scale.value}px`,
  height: `${canvasHeight.value * scale.value}px`
}))
const canvasStyle = computed(() => ({ width: `${canvasWidth.value}px`, height: `${canvasHeight.value}px`, transform: `scale(${scale.value})`, transformOrigin: 'top left' }))

const overlayLink = computed(() => {
  const user = auth.currentUser
  if (!user) return ''
  return `${window.location.origin}/overlay/${user.uid}_${overlayId}?v=${overlayVersion.value}`
})

const openOverlay = () => window.open(overlayLink.value, '_blank')

const copyLink = async () => {
  await navigator.clipboard.writeText(overlayLink.value)
  showToast('Copiado')
}

const setFormat = (preset) => {
  if (format.value === preset.id) return
  const oldWidth = canvasWidth.value
  const oldHeight = canvasHeight.value
  widgets.value.forEach(widget => {
    widget.x = Math.round((Number(widget.x) || 0) / oldWidth * preset.width)
    widget.y = Math.round((Number(widget.y) || 0) / oldHeight * preset.height)
  })
  format.value = preset.id
  canvasWidth.value = preset.width
  canvasHeight.value = preset.height
  updateScale()
}

const widgetSize = (widget) => {
  const data = widget?.data || {}
  if (widget?.type === 'todo' && data.minimized) return { width: Number(data.bubbleSize) || 70, height: Number(data.bubbleSize) || 70 }
  const defaults = { goal: [430, 170], todo: [340, 230], chat: [400, 115], timer: [420, 190] }
  const fallback = defaults[widget?.type] || [200, 100]
  return { width: Number(data.width) || fallback[0], height: Number(data.height) || fallback[1] }
}

const positionForAxis = (axis, placement, size, padding = 40) => {
  if (placement === 'left' || placement === 'top') return padding
  if (placement === 'right' || placement === 'bottom') return axis - size - padding
  return (axis - size) / 2
}

const alignWidget = (horizontal, vertical) => {
  if (!selected.value) return
  const size = widgetSize(selected.value)
  selected.value.x = Math.round(positionForAxis(canvasWidth.value, horizontal, size.width))
  selected.value.y = Math.round(positionForAxis(canvasHeight.value, vertical, size.height))
}

const alignAxis = axis => {
  if (!selected.value) return
  const size = widgetSize(selected.value)
  if (axis === 'horizontal') selected.value.x = Math.round((canvasWidth.value - size.width) / 2)
  else selected.value.y = Math.round((canvasHeight.value - size.height) / 2)
}

const saveOverlay = async () => {
  const user = auth.currentUser
  if (!user) return

  const updatedAt = Date.now()
  await setDoc(doc(db, 'overlays', user.uid, 'items', overlayId), {
    widgets: widgets.value,
    name: overlayName.value,
    format: format.value,
    width: canvasWidth.value,
    height: canvasHeight.value,
    updatedAt
  })

  overlayVersion.value = updatedAt

  showToast('Guardado')
}

const addGoalWidget = () => {
  widgets.value.push({
    id: Date.now(),
    type: 'goal',
    x: 100,
    y: 100,
    data: { current: 1000, goal: 2000, title: 'Meta de la comunidad', layout: 'card', theme: 'galaxy', bgColor: '#17102f', textColor: '#ffffff', barColor: '#d946ef', sparkles: true, titleSize: 20, numberSize: 22, width: 430, height: 170 }
  })
}

const addTodoWidget = () => {
  widgets.value.push({
    id: Date.now(),
    type: 'todo',
    x: 150,
    y: 150,
    data: { tasks: [{ text: 'Nueva mision', done: false }], currentIndex: 0, bgColor: '#17102f', textColor: '#ffffff', bubbleColor: '#a855f7', fontSize: 16, bubbleSize: 70, width: 340, minimized: false, icon: 'fa-solid fa-star' }
  })
}

const addChatWidget = () => {
  const widgetWidth = 400

  widgets.value.push({
    id: Date.now(),
    type: 'chat',
    x: (canvasWidth.value - widgetWidth) / 2,
    y: canvasHeight.value / 2,
    data: {
      channel: 'ibai',
      tiktokUser: '',
      bgColor: '#17102f',
      textColor: '#ffffff',
      fontSize: 18,
      width: widgetWidth,
      rounded: true,
      borderColor: '#a855f7',
      borderWidth: 1
    }
  })
}

const addTimerWidget = () => {
  const width = 420
  const height = 190
  const timer = {
    id: Date.now(), type: 'timer',
    x: Math.round((canvasWidth.value - width) / 2),
    y: Math.round((canvasHeight.value - height) / 2),
    data: { mode: 'countdown', title: 'EN DIRECTO EN', durationSeconds: 1500, remainingSeconds: 1500, running: false, endAt: 0, theme: 'galaxy', width, height, showSeconds: true, showDate: true }
  }
  widgets.value.push(timer)
  selected.value = timer
}

const removeWidget = (id) => {
  widgets.value = widgets.value.filter(w => w.id !== id)
}

let dragging = null
let offsetX = 0
let offsetY = 0
let canvasRect = null

const startDrag = (widget, e) => {
  e.preventDefault()
  dragging = widget
  canvasRect = canvasElement.value?.getBoundingClientRect()
  if (!canvasRect) return
  offsetX = (e.clientX - canvasRect.left) / scale.value - widget.x
  offsetY = (e.clientY - canvasRect.top) / scale.value - widget.y

  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag)
}

const onDrag = (e) => {
  if (!dragging) return
  const width = Number(dragging.data?.width) || 100
  const height = Number(dragging.data?.height) || 100
  dragging.x = Math.max(0, Math.min(canvasWidth.value - width, (e.clientX - canvasRect.left) / scale.value - offsetX))
  dragging.y = Math.max(0, Math.min(canvasHeight.value - height, (e.clientY - canvasRect.top) / scale.value - offsetY))
}

const stopDrag = () => {
  dragging = null
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
}

onMounted(async () => {
  updateScale()
  window.addEventListener('resize', updateScale)

  const user = auth.currentUser
  if (!user) return

  const snap = await getDoc(doc(db, 'overlays', user.uid, 'items', overlayId))

  if (snap.exists()) {
    const overlay = snap.data()
    widgets.value = overlay.widgets || []
    overlayName.value = overlay.name || ''
    format.value = overlay.format || (overlay.width > overlay.height ? 'horizontal' : 'vertical')
    canvasWidth.value = overlay.width || 1080
    canvasHeight.value = overlay.height || 1920
    overlayVersion.value = overlay.updatedAt || Date.now()
    updateScale()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
})
</script>

<style scoped>
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

.timer-button { background: linear-gradient(135deg, #6d28d9, #db2777); box-shadow: 0 8px 20px rgba(126,34,206,.2); }
.format-switch { display: flex; gap: 4px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
.format-switch button { min-width: 112px; padding: 5px 9px; border-radius: 7px; color: #64748b; display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 6px; text-align: left; font-size: 11px; font-weight: 900; }
.format-switch button small { grid-column: 2; font-size: 8px; font-weight: 700; opacity: .68; }
.format-switch button.active { color: white; background: linear-gradient(135deg, #7c3aed, #db2777); }
.format-summary { margin-top: 18px; padding: 12px; border-radius: 10px; background: #f5f3ff; display: flex; gap: 10px; align-items: center; color: #7c3aed; }
.format-summary i { font-size: 20px; }.format-summary div { display: flex; flex-direction: column; }.format-summary strong { font-size: 11px; }.format-summary span { font-size: 9px; color: #64748b; }
.canvas { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.13) 1px, transparent 0); background-size: 40px 40px; }
.properties-panel { height: 100vh; overscroll-behavior: contain; scrollbar-gutter: stable; padding-bottom: 42px; }
.properties-panel::-webkit-scrollbar { width: 7px; }.properties-panel::-webkit-scrollbar-track { background: #f1f5f9; }.properties-panel::-webkit-scrollbar-thumb { background: linear-gradient(#8b5cf6,#d946ef); border-radius: 99px; }
.align-panel { margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid #e2e8f0; }
.align-heading { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 9px; }.align-heading span { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #334155; }.align-heading small { font-size: 9px; color: #94a3b8; }
.align-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }.align-grid button { height: 34px; border: 1px solid #e2e8f0; border-radius: 7px; color: #64748b; background: #f8fafc; transition: .18s; }.align-grid button:hover { color: white; border-color: #9333ea; background: linear-gradient(135deg,#7c3aed,#db2777); transform: translateY(-1px); }
.axis-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 7px; }.axis-actions button { min-height: 35px; padding: 5px; border-radius: 7px; background: #f5f3ff; color: #7e22ce; font-size: 9px; line-height: 1.2; font-weight: 900; }.axis-actions i { margin-right: 3px; }
</style>
