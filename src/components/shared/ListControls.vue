<script setup>
defineProps({
  search: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Buscar...' },
  sort: { type: String, default: '' },
  sortOptions: { type: Array, default: () => [] },
  pageSize: { type: Number, default: 20 },
  pageSizeOptions: { type: Array, default: () => [10, 20, 25] }
})

const emit = defineEmits(['update:search', 'update:sort', 'update:pageSize'])
</script>

<template>
  <div class="list-controls">
    <label class="list-search">
      <i class="fas fa-magnifying-glass"></i>
      <input
        :value="search"
        type="search"
        :aria-label="searchPlaceholder"
        :placeholder="searchPlaceholder"
        @input="emit('update:search', $event.target.value)"
      />
    </label>

    <slot name="filters"></slot>

    <select v-if="sortOptions.length" aria-label="Ordenar resultados" :value="sort" @change="emit('update:sort', $event.target.value)">
      <option v-for="option in sortOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <select aria-label="Resultados por página" :value="pageSize" @change="emit('update:pageSize', Number($event.target.value))">
      <option v-for="option in pageSizeOptions" :key="option" :value="option">
        {{ option }} por página
      </option>
    </select>
  </div>
</template>

<style scoped>
.list-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  min-width: 0;
  justify-content: flex-end;
}

.list-search {
  align-items: center;
  background: var(--control-surface, #ffffff);
  border: var(--control-border-width) solid var(--control-border, #e5e7eb);
  border-radius: var(--radius-control);
  color: var(--control-muted, #64748b);
  display: flex;
  gap: var(--control-gap);
  min-height: var(--button-height-md);
  min-width: 0;
  flex: 1 1 240px;
  padding: 0 var(--control-padding-inline);
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}

.list-search:focus-within { border-color: var(--accent-hover); box-shadow: var(--control-focus-shadow); }

.list-search input {
  background: transparent;
  border: 0;
  color: var(--control-text, #334155);
  flex: 1;
  font-size: var(--font-caption);
  font-weight: var(--weight-label);
  line-height: var(--line-body);
  min-width: 0;
  outline: none;
}

.list-search input::placeholder {
  color: var(--control-muted, #64748b);
}

.list-controls :deep(select) {
  background-color: var(--control-surface, #ffffff);
  border: var(--control-border-width) solid var(--control-border, #e5e7eb);
  border-radius: var(--radius-control);
  color: var(--control-text, #334155);
  font-size: var(--font-caption);
  font-weight: var(--weight-label);
  line-height: var(--line-body);
  min-height: var(--button-height-md);
  height: auto;
  min-width: 0;
  max-width: 100%;
  padding: var(--space-2) 36px var(--space-2) var(--control-padding-inline);
}

.list-controls :deep(select:focus-visible) { outline: var(--focus-ring); outline-offset: 3px; }
.list-controls :deep(select:disabled) { cursor: not-allowed; opacity: var(--control-disabled-opacity); }

@media (max-width: 760px) {
  .list-controls {
    align-items: stretch;
    display: grid;
    gap: var(--space-3);
    grid-template-columns: 1fr;
    justify-content: stretch;
  }

  .list-search {
    min-height: var(--control-height-touch);
    min-width: 0;
    padding: 0 var(--control-padding-inline);
    width: 100%;
  }

  .list-controls :deep(select) {
    min-height: var(--control-height-touch);
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) { .list-search { transition: none; } }
</style>
