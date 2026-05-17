<script setup>
const query = defineModel('query', {
  type: String,
  default: ''
})

defineProps({
  open: {
    type: Boolean,
    default: false
  },
  posts: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  mobileVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit', 'open-post'])
</script>

<template>
  <div v-if="open && (query || mobileVisible)" class="public-search-panel">
    <form class="public-search-box" @submit.prevent="emit('submit')">
      <i class="fas fa-search"></i>
      <input
        v-model="query"
        autofocus
        placeholder="Buscar noticias, guias o rumores..."
      />
      <button type="button" @click="emit('close')">
        <i class="fas fa-xmark"></i>
      </button>
    </form>

    <div v-if="query" class="public-search-results">
      <button
        v-for="post in posts"
        :key="post.id"
        @click="emit('open-post', post.id)"
      >
        <span>{{ post.category || 'General' }}</span>
        <strong>{{ post.title }}</strong>
      </button>

      <p v-if="!posts.length && !loading">
        No hay resultados para esa busqueda.
      </p>

      <p v-if="loading">
        Buscando...
      </p>
    </div>
  </div>
</template>

<style scoped>
.public-search-panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0 0 22px 22px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
  color: #111827;
  left: 50%;
  max-width: 760px;
  padding: 14px;
  position: fixed;
  top: 72px;
  transform: translateX(-50%);
  width: calc(100vw - 28px);
  z-index: 1200;
}

.public-search-box {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 10px 12px;
}

.public-search-box input {
  background: transparent;
  border: 0;
  color: #111827;
  outline: none;
}

.public-search-box button {
  color: #64748b;
}

.public-search-results {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.public-search-results button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #111827;
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  text-align: left;
}

.public-search-results span {
  color: #8b5cf6;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.public-search-results strong {
  font-size: 13px;
  font-weight: 900;
}

.public-search-results p {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  padding: 10px;
}
</style>
