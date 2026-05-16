<template>
  <div class="w-screen h-screen bg-transparent overflow-hidden">

    <div
      v-for="widget in widgets"
      :key="widget.id + '-' + widget.type"
      class="absolute"
      :style="{ top: widget.y + 'px', left: widget.x + 'px' }"
    >

      <!-- 🎯 META PRO (AGRANDADO) -->
      <div
        v-if="widget.type === 'goal'"
        class="relative shadow-xl overflow-hidden"
        :style="goalStyle(widget)"
      >

        <!-- 👑 ICONO COMPLETADO -->
        <div
          v-if="isComplete(widget)"
          class="absolute top-3 right-3 text-2xl animate-bounce"
          :style="{ color: widget.data.completeIconColor || '#facc15' }"
        >
          <i
            :class="[
              widget.data.completeIconStyle || 'fa-solid',
              widget.data.completeIcon || 'fa-crown'
            ]"
          ></i>
        </div>

        <!-- TEXTO -->
        <p class="text-lg opacity-80 mb-2">
          {{ widget.data.title }}
        </p>

        <!-- NUMEROS -->
        <div class="flex justify-between text-lg font-medium mt-2">
          <span>{{ widget.data.current }}</span>
          <span>{{ widget.data.goal }}</span>
        </div>

        <!-- BARRA (MÁS GRUESA) -->
        <div
          class="bg-gray-200 rounded-full mt-4 overflow-hidden"
          :style="{ height: (widget.data.barHeight || 18) + 'px' }"
        >
          <div
            class="h-full transition-all duration-500"
            :style="goalBarStyle(widget)"
          ></div>
        </div>

      </div>

      <!-- 📝 MISIONES PRO (AGRANDADAS) -->
      <div
        v-if="widget.type === 'todo' && widget.isActive !== false"
        class="relative shadow-xl overflow-hidden"
        :style="cardStyle(widget)"
      >

        <!-- 🎉 ANIMACIÓN -->
        <div
          v-if="completedAnimations[widget.id]"
          class="absolute inset-0 flex flex-col items-center justify-center z-20"
          :style="cardStyle(widget)"
        >
          <p class="text-2xl font-bold text-green-500 animate-bounce">
            COMPLETADO
          </p>

          <div class="stars">
            ✨ ✨ ✨
          </div>
        </div>

        <!-- CONTENIDO -->
        <div v-else class="w-full h-full flex items-center px-8 py-6">

          <!-- IZQUIERDA -->
          <div class="flex items-center gap-4 flex-1">

            <i
              v-if="currentTaskData(widget)?.icon"
              :class="[
                currentTaskData(widget)?.style || 'fa-solid',
                currentTaskData(widget)?.icon
              ]"
              :style="{
                color: currentTaskData(widget)?.color || '#000',
                fontSize: '28px'
              }"
            ></i>

            <p class="font-semibold text-lg truncate">
              {{ currentTaskData(widget)?.text || 'Sin misión' }}
            </p>

          </div>

          <!-- ✔ -->
          <button
            @click="completeTask(widget)"
            class="ml-4 text-3xl opacity-80 hover:opacity-100 transition shrink-0"
          >
            ✔
          </button>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

const route = useRoute()
const widgets = ref([])
const completedAnimations = reactive({})

// 📊 progreso
const progress = (widget) => {
  return (widget.data.current / widget.data.goal) * 100
}

// 🎯 ESTILO META (AGRANDADO)
const goalStyle = (widget) => ({
  width: (widget.data.width || 500) + 'px',
  height: (widget.data.height || 180) + 'px',

  backgroundColor: widget.data.bgColorRaw || '#ffffff',
  color: widget.data.textColorRaw || '#000000',

  border: widget.data.borderColor
    ? `3px solid ${widget.data.borderColor}`
    : 'none',

  borderRadius: widget.data.rounded ? '18px' : '0px',

  padding: '24px'
})

// 🎯 BARRA META
const goalBarStyle = (widget) => ({
  width: progress(widget) + '%',
  backgroundColor: widget.data.barColor || '#a855f7'
})

// ✅ COMPLETADO META
const isComplete = (widget) => {
  return widget.data.current >= widget.data.goal
}

// 🎨 ESTILO TODO (AGRANDADO)
const cardStyle = (widget) => ({
  width: (widget.data.width || 500) + 'px',
  height: (widget.data.height || 160) + 'px',

  minWidth: '300px',
  maxWidth: '700px',

  minHeight: '120px',
  maxHeight: '250px',

  backgroundColor: widget.data.bgColorRaw || '#ffffff',
  color: widget.data.textColorRaw || '#000000',

  border: widget.data.borderColor
    ? `3px solid ${widget.data.borderColor}`
    : 'none',

  borderRadius: widget.data.rounded ? '18px' : '0px'
})

// 🧠 MISIÓN
const currentTaskData = (widget) => {
  const tasks = widget.data.tasks || []
  const index = widget.data.currentIndex || 0
  return tasks[index] || null
}

// ✅ COMPLETAR MISIÓN
const completeTask = async (widget) => {
  const fullId = route.params.id || ''
  const [userId, overlayId] = fullId.split('_')
  if (!userId || !overlayId) return

  completedAnimations[widget.id] = true

  setTimeout(async () => {

    const tasks = widget.data.tasks || []
    let index = widget.data.currentIndex || 0

    const updatedWidgets = widgets.value.map(w => {
      if (w.id !== widget.id) return w

      if (index >= tasks.length - 1) {
        return { ...w, isActive: false }
      }

      return {
        ...w,
        data: {
          ...w.data,
          currentIndex: index + 1
        }
      }
    })

    widgets.value = updatedWidgets

    await updateDoc(
      doc(db, "overlays", userId, "items", overlayId),
      { widgets: updatedWidgets }
    )

    completedAnimations[widget.id] = false

  }, 800)
}

// 🔄 realtime
onMounted(() => {
  const fullId = route.params.id || ''
  const [userId, overlayId] = fullId.split('_')
  if (!userId || !overlayId) return

  onSnapshot(
    doc(db, "overlays", userId, "items", overlayId),
    (snap) => {
      if (snap.exists()) {
        widgets.value = snap.data().widgets || []
      }
    }
  )
})
</script>

<style>
.stars {
  margin-top: 8px;
  font-size: 22px;
  animation: floatStars 1s ease infinite alternate;
}

@keyframes floatStars {
  from { transform: translateY(0); }
  to { transform: translateY(-6px); }
}
</style>