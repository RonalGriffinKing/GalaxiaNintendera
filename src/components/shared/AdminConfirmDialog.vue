<script setup>
import { computed, ref, watch } from 'vue'
import AdminDialog from './AdminDialog.vue'
import { usePendingAction } from '@/composables/usePendingAction'

const props = defineProps({
  open: Boolean,
  busy: Boolean,
  title: { type: String, required: true },
  description: { type: String, required: true },
  confirmAction: { type: Function, default: null },
  confirmLabel: { type: String, default: 'Confirmar' },
  pendingLabel: { type: String, default: 'Procesando...' },
  variant: { type: String, default: 'danger', validator: v => ['danger', 'success', 'primary'].includes(v) },
  theme: { type: String, default: 'dark' },
  error: { type: String, default: '' }
})
const emit = defineEmits(['close', 'error'])
const { pending, run } = usePendingAction()
const busy = computed(() => props.busy || pending.value)
const localError = ref('')
watch(() => props.open, value => { if (value) localError.value = '' })
async function confirm() {
  if (!props.open || busy.value || !props.confirmAction) return
  localError.value = ''
  try { await run(props.confirmAction) } catch (error) {
    localError.value = 'No se pudo completar la acción. Inténtalo de nuevo.'
    emit('error', error)
  }
}
</script>

<template>
  <AdminDialog :open="open" :busy="busy" :title="title" :description="description" :theme="theme" @close="!busy && emit('close')">
    <p v-if="error || localError" class="admin-field-message admin-field-message--error" role="alert">{{ error || localError }}</p>
    <template #footer>
      <button class="admin-action" type="button" data-dialog-autofocus :disabled="busy" @click="!busy && emit('close')">Cancelar</button>
      <button class="admin-action" :class="`admin-action--${variant}`" type="button" :disabled="busy || !confirmAction" :aria-busy="busy" @click="confirm">{{ busy ? pendingLabel : confirmLabel }}</button>
    </template>
  </AdminDialog>
</template>
