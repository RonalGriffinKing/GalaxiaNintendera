<script setup>
const props = defineProps({
  favorites: {
    type: Array,
    default: () => []
  },
  expanded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:expanded', 'open-post'])
</script>

<template>
  <section v-if="favorites.length" class="favorite-preview-section">
    <div class="section-head compact-head">
      <div>
        <span>Favoritos</span>
        <h2>Lecturas guardadas</h2>
      </div>
      <button
        v-if="favorites.length > 4"
        type="button"
        @click="emit('update:expanded', !expanded)"
      >
        {{ expanded ? 'Ver menos' : 'Ver todos' }}
      </button>
    </div>

    <div class="favorite-chip-list">
      <button
        v-for="item in (expanded ? favorites : favorites.slice(0, 4))"
        :key="item.id"
        @click="emit('open-post', item.postId || item.id)"
      >
        <i class="fas fa-bookmark"></i>
        <span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.category || 'General' }}</small>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.favorite-preview-section {
  background: rgba(11, 16, 32, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  color: #f8fafc;
  display: grid;
  gap: 12px;
  margin: 18px auto 0;
  max-width: var(--profile-content-width, 1120px);
  padding: 20px;
}

.section-head {
  align-items: end;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 4px;
}

.section-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.section-head h2 {
  color: #ffffff;
  font-size: 18px;
  font-weight: 950;
  margin-top: 3px;
}

.section-head button {
  color: #c084fc;
  font-size: 12px;
  font-weight: 900;
}

.favorite-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.favorite-chip-list button {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #ffffff;
  display: inline-grid;
  gap: 9px;
  grid-template-columns: 34px minmax(0, 1fr);
  max-width: 280px;
  min-height: 46px;
  padding: 6px 12px 6px 6px;
  text-align: left;
}

.favorite-chip-list i {
  align-items: center;
  background: rgba(168, 85, 247, 0.22);
  border-radius: 999px;
  color: #c084fc;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.favorite-chip-list span {
  min-width: 0;
}

.favorite-chip-list strong,
.favorite-chip-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-chip-list strong {
  font-size: 12px;
  font-weight: 950;
}

.favorite-chip-list small {
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 900;
}

@media (max-width: 760px) {
  .favorite-preview-section {
    max-width: 100%;
    overflow: hidden;
    padding: 16px;
  }

  .section-head {
    align-items: start;
    gap: 10px;
  }

  .favorite-chip-list {
    flex-wrap: nowrap;
    margin: 0 -16px;
    overflow-x: auto;
    padding: 0 16px 2px;
    scrollbar-width: none;
  }

  .favorite-chip-list::-webkit-scrollbar {
    display: none;
  }

  .favorite-chip-list button {
    flex: 0 0 220px;
  }
}
</style>
