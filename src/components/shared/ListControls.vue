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
        :placeholder="searchPlaceholder"
        @input="emit('update:search', $event.target.value)"
      />
    </label>

    <slot name="filters"></slot>

    <select v-if="sortOptions.length" :value="sort" @change="emit('update:sort', $event.target.value)">
      <option v-for="option in sortOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <select :value="pageSize" @change="emit('update:pageSize', Number($event.target.value))">
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
  gap: 10px;
  justify-content: flex-end;
}

.list-search {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #94a3b8;
  display: flex;
  gap: 9px;
  min-height: 42px;
  min-width: min(300px, 100%);
  padding: 0 12px;
}

.list-search input {
  background: transparent;
  border: 0;
  color: #334155;
  flex: 1;
  font-size: 12px;
  font-weight: 800;
  min-width: 0;
  outline: none;
}

.list-search input::placeholder {
  color: #94a3b8;
}

.list-controls select {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  height: 42px;
  padding: 0 36px 0 14px;
}

@media (max-width: 760px) {
  .list-controls {
    align-items: stretch;
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;
    justify-content: stretch;
  }

  .list-search {
    min-height: 50px;
    min-width: 0;
    padding: 0 16px;
    width: 100%;
  }

  .list-controls select {
    height: 50px;
    padding-left: 16px;
    width: 100%;
  }
}
</style>
