<template>
  <div class="overlay-stage bg-transparent overflow-hidden" :style="stageStyle">
    <div
      v-for="widget in widgets"
      :key="widget.id + '-' + widget.type"
      class="absolute"
      :style="{ top: widget.y + 'px', left: widget.x + 'px' }"
    >
      <WidgetRenderer :widget="widget" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import WidgetRenderer from '@/components/widgets/WidgetRenderer.vue'

const route = useRoute()
const widgets = ref([])
const width = ref(1080)
const height = ref(1920)
let unsubscribe
const stageStyle = computed(() => ({ width: `${width.value}px`, height: `${height.value}px` }))

onMounted(() => {
  document.documentElement.classList.add('overlay-render-mode')
  document.body.classList.add('overlay-render-mode')
  document.getElementById('app')?.classList.add('overlay-render-mode')
  const fullId = route.params.id || ''
  const [userId, overlayId] = fullId.split('_')

  if (!userId || !overlayId) return

  unsubscribe = onSnapshot(
    doc(db, 'overlays', userId, 'items', overlayId),
    (snap) => {
      if (snap.exists()) {
        const overlay = snap.data()
        widgets.value = overlay.widgets || []
        width.value = overlay.width || 1080
        height.value = overlay.height || 1920
      }
    }
  )
})

onUnmounted(() => {
  unsubscribe?.()
  document.documentElement.classList.remove('overlay-render-mode')
  document.body.classList.remove('overlay-render-mode')
  document.getElementById('app')?.classList.remove('overlay-render-mode')
})
</script>

<style>
html.overlay-render-mode,
body.overlay-render-mode,
#app.overlay-render-mode {
  background: transparent !important;
  background-color: transparent !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

body.overlay-render-mode {
  margin: 0 !important;
  padding: 0 !important;
}

.overlay-stage { position: relative; }
</style>
