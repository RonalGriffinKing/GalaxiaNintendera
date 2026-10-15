<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  help: { type: String, default: '' },
  error: { type: String, default: '' },
  success: { type: String, default: '' }
})
const id = `admin-field-${useId()}`
const describedBy = computed(() => [props.help && `${id}-help`, props.error && `${id}-error`, !props.error && props.success && `${id}-success`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="admin-field" :data-state="error ? 'error' : success ? 'success' : undefined">
    <label :for="id" class="admin-field-label">{{ label }}</label>
    <slot :id="id" :described-by="describedBy" :invalid="error ? 'true' : undefined"></slot>
    <p v-if="help" :id="`${id}-help`" class="admin-field-help">{{ help }}</p>
    <p v-if="error" :id="`${id}-error`" class="admin-field-message admin-field-message--error" role="alert">{{ error }}</p>
    <p v-else-if="success" :id="`${id}-success`" class="admin-field-message admin-field-message--success" role="status">{{ success }}</p>
  </div>
</template>
