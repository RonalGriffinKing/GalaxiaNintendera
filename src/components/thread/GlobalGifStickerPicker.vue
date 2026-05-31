<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchGiphyItems, hasGiphyKey } from '@/services/giphy'

const props = defineProps({
  open: Boolean
})

const emit = defineEmits(['close', 'select', 'search-focus-change'])

const query = ref('')
const category = ref('trending')
const items = ref([])
const isLoading = ref(false)
const loadError = ref('')
let searchTimer = 0

const localStickers = [
  { id: 'local-hype', type: 'sticker', title: 'Hype', text: 'HYPE', accent: '#a855f7' },
  { id: 'local-gg', type: 'sticker', title: 'GG', text: 'GG', accent: '#22c55e' },
  { id: 'local-lol', type: 'sticker', title: 'LOL', text: 'LOL', accent: '#f97316' },
  { id: 'local-wow', type: 'sticker', title: 'WOW', text: 'WOW', accent: '#38bdf8' },
  { id: 'local-nice', type: 'sticker', title: 'Nice', text: 'NICE', accent: '#ec4899' },
  { id: 'local-fire', type: 'sticker', title: 'Fire', text: 'FIRE', accent: '#ef4444' },
  { id: 'local-win', type: 'sticker', title: 'Win', text: 'WIN', accent: '#eab308' },
  { id: 'local-ready', type: 'sticker', title: 'Ready', text: 'READY', accent: '#14b8a6' }
]

const categories = [
  { id: 'trending', label: 'Tendencia', query: '' },
  { id: 'nintendo', label: 'Nintendo', query: 'nintendo' },
  { id: 'gaming', label: 'Gaming', query: 'gaming' },
  { id: 'reaction', label: 'Reaccion', query: 'reaction' }
]

const canUseGiphy = computed(() => hasGiphyKey())
const visibleItems = computed(() => items.value.length ? items.value : localStickers)

const loadItems = async () => {
  loadError.value = ''
  if (!canUseGiphy.value) {
    items.value = []
    return
  }

  const activeCategory = categories.find(item => item.id === category.value)
  const search = query.value.trim() || activeCategory?.query || ''
  isLoading.value = true
  try {
    items.value = await fetchGiphyItems({ query: search, limit: 18 })
  } catch (error) {
    console.error(error)
    loadError.value = 'No se pudo cargar GIPHY ahora mismo.'
    items.value = []
  } finally {
    isLoading.value = false
  }
}

const scheduleLoad = () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadItems, 260)
}

const selectItem = (item) => {
  if (item.type === 'sticker') {
    emit('select', {
      id: item.id,
      type: 'emoji',
      title: item.title,
      text: ` ${item.text} `
    })
    return
  }
  emit('select', item)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) loadItems()
})

watch(query, scheduleLoad)
watch(category, loadItems)

onMounted(() => {
  if (props.open) loadItems()
})
</script>

<template>
  <section v-if="open" class="global-gif-picker">
    <header class="global-gif-head">
      <div>
        <strong>GIFs y stickers</strong>
        <span v-if="!canUseGiphy">Configura VITE_GIPHY_API_KEY para activar busqueda real</span>
      </div>
      <button type="button" aria-label="Cerrar GIFs" @click="emit('close')">
        <i class="fas fa-xmark"></i>
      </button>
    </header>

    <label class="global-gif-search">
      <i class="fas fa-magnifying-glass"></i>
      <input
        v-model="query"
        type="search"
        placeholder="Buscar reaccion, juego o momento"
        @focus="emit('search-focus-change', true)"
        @blur="emit('search-focus-change', false)"
      />
    </label>

    <div class="global-gif-tabs" role="tablist" aria-label="Categorias GIF">
      <button
        v-for="item in categories"
        :key="item.id"
        type="button"
        :class="{ active: category === item.id }"
        @click="category = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <p v-if="loadError" class="global-gif-message">{{ loadError }}</p>
    <p v-else-if="isLoading" class="global-gif-message">Cargando GIFs...</p>

    <div class="global-gif-grid">
      <button
        v-for="item in visibleItems"
        :key="item.id || item.url"
        type="button"
        class="global-gif-item"
        :class="{ sticker: item.type === 'sticker' }"
        @click="selectItem(item)"
      >
        <img v-if="item.previewUrl || item.url" :src="item.previewUrl || item.url" :alt="item.title || 'GIF'" />
        <span v-else :style="{ '--sticker-accent': item.accent }">{{ item.text }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.global-gif-picker {
  background: rgba(8, 9, 28, 0.98);
  border: 1px solid rgba(168, 85, 247, 0.26);
  border-radius: 22px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
  display: grid;
  gap: 12px;
  grid-template-rows: auto auto auto auto minmax(0, 1fr);
  height: 100%;
  max-height: none;
  min-height: 0;
  overflow: hidden;
  padding: 14px;
}

.global-gif-head,
.global-gif-search,
.global-gif-tabs {
  align-items: center;
  display: flex;
}

.global-gif-head {
  justify-content: space-between;
  gap: 12px;
}

.global-gif-head div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.global-gif-head strong {
  color: #fff;
  font-size: 14px;
  font-weight: 950;
}

.global-gif-head span,
.global-gif-message {
  color: #a7adc4;
  font-size: 11px;
  font-weight: 800;
  margin: 0;
}

.global-gif-head button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.global-gif-search {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #c4b5fd;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
}

.global-gif-search input {
  background: transparent;
  border: 0;
  color: #fff;
  flex: 1;
  font-size: 13px;
  font-weight: 800;
  min-width: 0;
  outline: none;
}

.global-gif-search input::placeholder {
  color: #7f86a3;
}

.global-gif-tabs {
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.global-gif-tabs button {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #cbd5e1;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 900;
  min-height: 32px;
  padding: 0 12px;
}

.global-gif-tabs button.active {
  background: rgba(168, 85, 247, 0.24);
  border-color: rgba(216, 180, 254, 0.4);
  color: #fff;
}

.global-gif-grid {
  --gif-card-size: clamp(128px, 16vw, 208px);
  align-content: start;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-row: 5;
  grid-auto-rows: var(--gif-card-size);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.global-gif-item {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 0;
  border-radius: 18px;
  display: grid;
  height: var(--gif-card-size);
  min-height: 0;
  overflow: hidden;
  padding: 0;
  place-items: stretch;
  position: relative;
  width: 100%;
}

.global-gif-item img {
  grid-area: 1 / 1;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.global-gif-item span {
  align-items: center;
  background:
    radial-gradient(circle at 25% 20%, color-mix(in srgb, var(--sticker-accent), white 18%), transparent 38%),
    linear-gradient(135deg, color-mix(in srgb, var(--sticker-accent), #020617 18%), #09091f);
  color: #fff;
  display: flex;
  font-size: clamp(15px, 4vw, 24px);
  font-weight: 950;
  grid-area: 1 / 1;
  height: 100%;
  justify-content: center;
  line-height: 1;
  min-height: 0;
  width: 100%;
}

@media (max-width: 768px) {
  .global-gif-picker {
    border-radius: 18px;
    max-height: none;
  }

  .global-gif-grid {
    --gif-card-size: clamp(112px, 29vw, 156px);
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  }
}
</style>
