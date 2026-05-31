<script setup>
import { computed, ref, watch } from 'vue'
import { fetchGiphyItems, hasGiphyKey } from '@/services/giphy'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: 'GIFs y stickers' },
  embedded: Boolean
})

const emit = defineEmits(['close', 'select'])

const query = ref('')
const items = ref([])
const isLoading = ref(false)
const error = ref('')

const fallbackItems = [
  { id: 'emoji-star', type: 'emoji', text: '\u2b50', title: 'Estrella' },
  { id: 'emoji-fire', type: 'emoji', text: '\ud83d\udd25', title: 'Fuego' },
  { id: 'emoji-game', type: 'emoji', text: '\ud83c\udfae', title: 'Gaming' },
  { id: 'emoji-party', type: 'emoji', text: '\ud83e\udd73', title: 'Fiesta' },
  { id: 'emoji-laugh', type: 'emoji', text: '\ud83d\ude02', title: 'Risa' },
  { id: 'emoji-wow', type: 'emoji', text: '\ud83e\udd2f', title: 'Wow' },
  { id: 'tag-gg', type: 'emoji', text: ' GG ', title: 'GG' },
  { id: 'tag-hype', type: 'emoji', text: ' HYPE ', title: 'Hype' }
]

const canUseGiphy = computed(() => hasGiphyKey())
const visibleFallback = computed(() => !canUseGiphy.value || error.value || (!isLoading.value && !items.value.length))

let searchTimer = null

const loadItems = async () => {
  if (!props.open || !canUseGiphy.value) return
  isLoading.value = true
  error.value = ''
  try {
    items.value = await fetchGiphyItems({ query: query.value })
  } catch (loadError) {
    console.error(loadError)
    error.value = 'GIPHY no respondio ahora.'
  } finally {
    isLoading.value = false
  }
}

const scheduleLoad = () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadItems, 260)
}

const selectItem = (item) => {
  emit('select', item)
}

watch(() => props.open, (open) => {
  if (open) loadItems()
})

watch(query, scheduleLoad)
</script>

<template>
  <div v-if="open" class="giphy-picker" :class="{ embedded }" role="dialog" aria-modal="false">
    <div class="giphy-picker-head">
      <strong>{{ title }}</strong>
      <button type="button" aria-label="Cerrar GIFs" @click="emit('close')">
        <i class="fas fa-xmark"></i>
      </button>
    </div>

    <label class="giphy-search">
      <i class="fas fa-magnifying-glass"></i>
      <input v-model="query" type="search" placeholder="Buscar en GIPHY..." />
    </label>

    <div v-if="canUseGiphy" class="giphy-grid" :class="{ loading: isLoading }">
      <button v-for="item in items" :key="item.id" type="button" @click="selectItem(item)">
        <img :src="item.previewUrl || item.url" :alt="item.title" loading="lazy" />
      </button>
      <span v-if="isLoading">Cargando...</span>
    </div>

    <div v-if="visibleFallback" class="giphy-fallback">
      <small>{{ canUseGiphy ? 'Prueba rapida' : 'Agrega VITE_GIPHY_API_KEY para activar GIPHY real' }}</small>
      <button v-for="item in fallbackItems" :key="item.id" type="button" @click="selectItem(item)">
        {{ item.text }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.giphy-picker {
  background:
    radial-gradient(circle at 20% 0%, rgba(168, 85, 247, 0.22), transparent 35%),
    rgba(8, 12, 30, 0.98);
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 20px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.44);
  color: #fff;
  display: grid;
  gap: 10px;
  max-height: min(420px, 62dvh);
  overflow: hidden;
  padding: 12px;
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  width: min(360px, calc(100vw - 28px));
  z-index: 30;
}

.giphy-picker.embedded {
  border: 0;
  box-shadow: none;
  max-height: none;
  padding: 0;
  position: static;
  width: 100%;
}

.giphy-picker.embedded .giphy-grid {
  max-height: min(310px, 42dvh);
}

.giphy-picker-head,
.giphy-search {
  align-items: center;
  display: flex;
  gap: 10px;
}

.giphy-picker-head {
  justify-content: space-between;
}

.giphy-picker-head strong {
  font-size: 14px;
  font-weight: 950;
}

.giphy-picker-head button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #fff;
  height: 34px;
  width: 34px;
}

.giphy-search {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #cbd5e1;
  min-height: 42px;
  padding: 0 12px;
}

.giphy-search input {
  background: transparent;
  border: 0;
  color: #fff;
  flex: 1;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  min-width: 0;
  outline: 0;
}

.giphy-search input::placeholder {
  color: #94a3b8;
}

.giphy-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-height: 260px;
  overflow-y: auto;
  padding-right: 2px;
}

.giphy-grid button {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  height: 86px;
  overflow: hidden;
}

.giphy-grid img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.giphy-grid > span {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 900;
  grid-column: 1 / -1;
  padding: 10px;
  text-align: center;
}

.giphy-fallback {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.giphy-fallback small {
  color: #aeb8d3;
  flex: 1 0 100%;
  font-size: 11px;
  font-weight: 850;
}

.giphy-fallback button {
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(192, 132, 252, 0.24);
  border-radius: 999px;
  color: #fff;
  font-size: 18px;
  font-weight: 950;
  min-height: 38px;
  min-width: 46px;
  padding: 0 12px;
}

@media (max-width: 859px) {
  .giphy-picker:not(.embedded) {
    bottom: calc(100% + 10px);
    left: 0;
    right: 0;
    top: auto;
    width: 100%;
  }

  .giphy-picker.embedded {
    max-height: min(390px, 58dvh);
  }

  .giphy-grid,
  .giphy-picker.embedded .giphy-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-height: min(246px, 36dvh);
  }

  .giphy-grid button {
    height: 74px;
  }
}
</style>
