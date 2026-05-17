<template>
  <div class="w-screen h-screen bg-transparent overflow-hidden">
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
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import WidgetRenderer from '@/components/widgets/WidgetRenderer.vue'

const route = useRoute()
const widgets = ref([])

onMounted(() => {
  const fullId = route.params.id || ''
  const [userId, overlayId] = fullId.split('_')

  if (!userId || !overlayId) return

  onSnapshot(
    doc(db, 'overlays', userId, 'items', overlayId),
    (snap) => {
      if (snap.exists()) {
        widgets.value = snap.data().widgets || []
      }
    }
  )
})
</script>
