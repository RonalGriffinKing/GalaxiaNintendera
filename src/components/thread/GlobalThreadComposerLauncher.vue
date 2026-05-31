<script setup>
import { ref } from 'vue'
import GlobalThreadComposerOverlay from '@/components/thread/GlobalThreadComposerOverlay.vue'

defineProps({
  userRole: { type: String, default: 'user' },
  initialCommunityId: { type: String, default: '' }
})

const emit = defineEmits(['published'])
const isOpen = ref(false)

const openGlobalThreadComposer = () => {
  isOpen.value = true
}

const closeGlobalThreadComposer = () => {
  isOpen.value = false
}

const handlePublished = () => {
  isOpen.value = false
  emit('published')
}

defineExpose({
  openGlobalThreadComposer,
  closeGlobalThreadComposer
})
</script>

<template>
  <GlobalThreadComposerOverlay
    :open="isOpen"
    :user-role="userRole"
    :initial-community-id="initialCommunityId"
    @close="closeGlobalThreadComposer"
    @published="handlePublished"
  />
</template>
