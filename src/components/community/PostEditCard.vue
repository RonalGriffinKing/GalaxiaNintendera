<script setup>
const model = defineModel({
  type: String,
  default: ''
})

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'save'])
</script>

<template>
  <form class="post-edit-card" @submit.prevent="emit('save')">
    <textarea v-model="model" maxlength="280" rows="3" autofocus></textarea>
    <footer>
      <button type="button" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="save" :disabled="disabled">
        Guardar
      </button>
    </footer>
  </form>
</template>

<style scoped>
.post-edit-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 10px;
  margin-top: 10px;
  max-width: 100%;
  overflow: hidden;
  padding: 10px;
}

.post-edit-card textarea {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  color: #111827;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
  min-height: 92px;
  outline: none;
  padding: 11px 12px;
  resize: vertical;
  width: 100%;
}

.post-edit-card textarea:focus {
  border-color: rgba(236, 72, 153, 0.62);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.12);
}

.post-edit-card footer {
  align-items: center;
  border-top: 1px solid #eef2f7;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 10px;
}

.post-edit-card button {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  justify-content: center;
  min-height: 36px;
  min-width: 102px;
  padding: 0 14px;
}

.post-edit-card .save {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: transparent;
  color: #ffffff;
}

.post-edit-card button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 620px) {
  .post-edit-card {
    border-radius: 15px;
    padding: 9px;
  }

  .post-edit-card footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .post-edit-card button {
    min-width: 0;
    width: 100%;
  }
}
</style>
