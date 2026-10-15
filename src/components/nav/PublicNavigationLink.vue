<script setup>
import { isPlainNavigationClick } from './publicNavigation'
const props = defineProps({ to: { type: String, required: true }, active: Boolean })
const emit = defineEmits(['navigate'])
function navigate(event) {
  if (!isPlainNavigationClick(event)) return
  event.preventDefault()
  emit('navigate', props.to)
}
</script>

<template>
  <a :href="to" :class="{ active }" :aria-current="active ? 'page' : undefined" @click="navigate"><slot /></a>
</template>
