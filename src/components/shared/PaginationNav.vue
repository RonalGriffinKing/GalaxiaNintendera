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
      <button class="admin-action admin-action--sm" type="button" :disabled="currentPage <= 1" @click="emit('page', currentPage - 1)">
        <i class="fas fa-chevron-left"></i>
        Anterior
      </button>
      <template v-for="(token, index) in pageTokens" :key="`${token}-${index}`">
        <span v-if="token === 'ellipsis'">...</span>
        <button
          v-else
          type="button"
          class="admin-action admin-action--sm"
          :class="{ active: token === currentPage, 'is-selected': token === currentPage }"
          :aria-current="token === currentPage ? 'page' : undefined"
          @click="emit('page', token)"
        >
          {{ token }}
        </button>
      </template>
      <button class="admin-action admin-action--sm" type="button" :disabled="currentPage >= totalPages" @click="emit('page', currentPage + 1)">
        Siguiente
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <div class="pagination-mobile">
      <button class="admin-action admin-action--sm" type="button" :disabled="currentPage <= 1" @click="emit('page', currentPage - 1)">
        <i class="fas fa-chevron-left"></i>
        Anterior
      </button>
      <strong>{{ currentPage }} / {{ totalPages }}</strong>
      <button class="admin-action admin-action--sm" type="button" :disabled="currentPage >= totalPages" @click="emit('page', currentPage + 1)">
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
  gap: var(--space-3);
  flex-wrap: wrap;
  min-width: 0;
  justify-content: space-between;
  margin-top: 14px;
}

.pagination-nav p {
  color: var(--control-muted, #64748b);
  font-size: var(--font-caption);
  font-weight: var(--weight-label);
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

.pagination-nav strong,
.pagination-nav span {
  align-items: center;
  background: var(--control-surface, #ffffff);
  border: var(--control-border-width) solid var(--control-border, #e5e7eb);
  border-radius: var(--radius-control);
  color: var(--control-muted, #64748b);
  display: inline-flex;
  font-size: var(--font-button);
  font-weight: var(--weight-label);
  gap: 7px;
  justify-content: center;
  min-height: var(--button-height-sm);
  min-width: var(--button-height-sm);
  padding: 0 var(--space-3);
}

.pagination-nav span {
  background: transparent;
  border-color: transparent;
  min-width: 24px;
  padding: 0 4px;
}

.pagination-desktop { flex-wrap: wrap; }

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
  .pagination-mobile strong { min-height: var(--control-height-touch); }
}
</style>
