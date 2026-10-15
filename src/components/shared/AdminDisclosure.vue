<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { disclosureDismissal } from './disclosureDismissal'

const props = defineProps({ modelValue: Boolean, label: { type: String, required: true }, disabled: Boolean, align: { type: String, default: 'start', validator: value => ['start', 'end'].includes(value) } })
const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const trigger = ref(null)
const panel = ref(null)
const id = `admin-disclosure-${useId()}`
function close(restore = false) {
  emit('update:modelValue', false)
  if (restore) trigger.value?.focus()
}
function dismiss(event) {
  const result = disclosureDismissal(event, root.value, props.modelValue)
  if (result) {
    if (event.type === 'keydown') event.preventDefault()
    close(result === 'restore')
  }
}
async function focusFirst() {
  if (props.disabled) return
  emit('update:modelValue', true)
  await nextTick()
  panel.value?.querySelector('button:not(:disabled), a[href], input:not(:disabled)')?.focus()
}
function leave(event) {
  if (!root.value?.contains(event.relatedTarget)) close()
}
watch(() => props.disabled, value => { if (value && props.modelValue) close() })
watch(() => props.modelValue, (value, previous) => {
  // An option can open a modal. Restore its visible trigger before the modal
  // captures the return target; never leave focus in the now-hidden panel.
  if (!value && previous && panel.value?.contains(document.activeElement)) trigger.value?.focus()
})
onMounted(() => {
  document.addEventListener('pointerdown', dismiss)
  document.addEventListener('keydown', dismiss)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', dismiss)
  document.removeEventListener('keydown', dismiss)
})
</script>

<template>
  <div ref="root" class="admin-disclosure" @focusout="leave">
    <button ref="trigger" class="admin-action admin-disclosure-trigger" type="button" :disabled="disabled" :aria-expanded="modelValue" :aria-controls="id" @click="emit('update:modelValue', !modelValue)" @keydown.down.prevent="focusFirst">
      <slot name="icon" />{{ label }}<i class="fas fa-chevron-down" aria-hidden="true"></i>
    </button>
    <div v-show="modelValue" :id="id" ref="panel" class="admin-disclosure-panel" :class="{ 'admin-disclosure-panel--end': align === 'end' }"><slot /></div>
  </div>
</template>
