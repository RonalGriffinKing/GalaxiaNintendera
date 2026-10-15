<script setup>
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { createModalLifecycle } from '@/composables/modalLifecycle'

const props = defineProps({
  open: Boolean,
  busy: Boolean,
  title: { type: String, required: true },
  description: { type: String, default: '' },
  theme: { type: String, default: 'dark', validator: v => ['dark', 'light'].includes(v) },
  size: { type: String, default: 'normal', validator: v => ['normal', 'wide'].includes(v) }
})
const emit = defineEmits(['close'])
const element = ref(null)
const id = `admin-dialog-${useId()}`
let lifecycle
onMounted(() => {
  lifecycle = createModalLifecycle(element.value, { isBusy: () => props.busy, requestClose: () => emit('close') })
  if (props.open) lifecycle.open()
})
watch(() => props.open, value => {
  if (lifecycle) value ? lifecycle.open() : lifecycle.close()
}, { flush: 'post' })
onBeforeUnmount(() => lifecycle?.dispose())
function requestClose() { if (!props.busy) emit('close') }
</script>

<template>
  <dialog ref="element" tabindex="-1" class="admin-dialog" :class="{ 'admin-dialog--wide': size === 'wide' }" :data-ui-theme="theme" :aria-labelledby="`${id}-title`" :aria-describedby="description ? `${id}-description` : undefined" :aria-busy="busy" @cancel="lifecycle?.cancel($event)" @click="lifecycle?.backdrop($event)" @keydown="lifecycle?.keydown($event)">
    <header class="admin-dialog-head">
      <div>
        <h2 :id="`${id}-title`">{{ title }}</h2>
        <p v-if="description" :id="`${id}-description`">{{ description }}</p>
      </div>
      <button class="admin-action admin-action--sm admin-action--icon admin-action--ghost" type="button" aria-label="Cerrar diálogo" :disabled="busy" @click="requestClose">×</button>
    </header>
    <div class="admin-dialog-body"><slot></slot></div>
    <footer v-if="$slots.footer" class="admin-dialog-footer"><slot name="footer"></slot></footer>
  </dialog>
</template>
