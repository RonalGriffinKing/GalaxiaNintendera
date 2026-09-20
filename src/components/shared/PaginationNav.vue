<script setup>
defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  startItem: { type: Number, required: true },
  endItem: { type: Number, required: true },
  pageTokens: { type: Array, default: () => [] },
  itemLabel: { type: String, default: 'elementos' }
})

const emit = defineEmits(['page'])
</script>

<template>
  <nav v-if="totalItems" class="pagination-nav" aria-label="Paginación">
    <p>Mostrando {{ startItem }}-{{ endItem }} de {{ totalItems }} {{ itemLabel }}</p>

    <div class="pagination-desktop">
      <button type="button" :disabled="currentPage <= 1" @click="emit('page', currentPage - 1)">
        <i class="fas fa-chevron-left"></i>
        Anterior
      </button>
      <template v-for="(token, index) in pageTokens" :key="`${token}-${index}`">
        <span v-if="token === 'ellipsis'">...</span>
        <button
          v-else
          type="button"
          :class="{ active: token === currentPage }"
          :aria-current="token === currentPage ? 'page' : undefined"
          @click="emit('page', token)"
        >
          {{ token }}
        </button>
      </template>
      <button type="button" :disabled="currentPage >= totalPages" @click="emit('page', currentPage + 1)">
        Siguiente
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <div class="pagination-mobile">
      <button type="button" :disabled="currentPage <= 1" @click="emit('page', currentPage - 1)">
        <i class="fas fa-chevron-left"></i>
        Anterior
      </button>
      <strong>{{ currentPage }} / {{ totalPages }}</strong>
      <button type="button" :disabled="currentPage >= totalPages" @click="emit('page', currentPage + 1)">
        Siguiente
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pagination-nav {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-top: 14px;
}

.pagination-nav p {
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.pagination-desktop,
.pagination-mobile {
  align-items: center;
  display: flex;
  gap: 6px;
}

.pagination-mobile {
  display: none;
}

.pagination-nav button,
.pagination-nav strong,
.pagination-nav span {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #64748b;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 7px;
  justify-content: center;
  min-height: 36px;
  min-width: 36px;
  padding: 0 11px;
}

.pagination-nav span {
  background: transparent;
  border-color: transparent;
  min-width: 24px;
  padding: 0 4px;
}

.pagination-nav button.active {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(147, 51, 234, 0.16);
}

.pagination-nav button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 760px) {
  .pagination-nav {
    align-items: stretch;
    display: grid;
  }

  .pagination-desktop {
    display: none;
  }

  .pagination-mobile {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  }
}
</style>
