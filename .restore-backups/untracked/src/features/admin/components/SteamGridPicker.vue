<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  displayMode: {
    type: String,
    default: 'panel'
  },
  targets: {
    type: Array,
    default: () => []
  },
  activeTargetId: {
    type: String,
    default: ''
  },
  showReset: {
    type: Boolean,
    default: false
  },
  initialQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['assign-target', 'set-active-target', 'reset-picks', 'done', 'game-selected'])

const query = ref('')
const games = ref([])
const selectedGame = ref(null)
const images = ref([])
const imageFilter = ref('all')
const loadingGames = ref(false)
const loadingImages = ref(false)
const error = ref('')
let searchTimer = null
let searchToken = 0

const hasResults = computed(() => games.value.length > 0)
const normalizedTargets = computed(() => props.targets.map((target, index) => ({
  id: target.id || `target-${index}`,
  label: target.label || `Destino ${index + 1}`,
  url: target.url || '',
  hint: target.hint || '',
  preferredType: target.preferredType || ''
})))
const assignedCount = computed(() => normalizedTargets.value.filter(target => target.url).length)
const totalTargets = computed(() => normalizedTargets.value.length)
const searchHint = computed(() => selectedGame.value ? `Buscando imagenes de ${selectedGame.value.name}` : 'Busca primero el juego en IGDB')
const activeTarget = computed(() => (
  normalizedTargets.value.find(target => target.id === props.activeTargetId)
  || normalizedTargets.value.find(target => !target.url)
  || normalizedTargets.value[0]
  || null
))
const imageFilters = [
  { value: 'all', label: 'Todo' },
  { value: 'hero', label: 'Fondos' },
  { value: 'banner', label: 'Capturas' },
  { value: 'icon', label: 'Caratulas' }
]
const filteredImages = computed(() => (
  imageFilter.value === 'all'
    ? images.value
    : images.value.filter(image => image.type === imageFilter.value)
))

const imageAssignments = computed(() => {
  const assignments = new Map()
  normalizedTargets.value.forEach(target => {
    if (!target.url) return
    const current = assignments.get(target.url) || []
    current.push(target.label)
    assignments.set(target.url, current)
  })
  return assignments
})

const searchGames = async ({ silent = false } = {}) => {
  const term = query.value.trim()
  if (term.length < 2) {
    games.value = []
    selectedGame.value = null
    images.value = []
    error.value = ''
    return
  }

  const currentToken = ++searchToken
  loadingGames.value = true
  if (!silent) error.value = ''
  games.value = []
  selectedGame.value = null
  images.value = []

  try {
    const response = await fetch(`/.netlify/functions/igdb?action=search&query=${encodeURIComponent(term)}`)
    const data = await response.json().catch(() => ({}))
    if (currentToken !== searchToken) return
    if (!response.ok) throw new Error(data?.error || 'No se pudo buscar el juego.')
    games.value = data.games || []
    if (!games.value.length && !silent) error.value = 'No encontre juegos con ese nombre.'
  } catch (searchError) {
    if (currentToken === searchToken) error.value = searchError.message || 'No se pudo buscar el juego.'
  } finally {
    if (currentToken === searchToken) loadingGames.value = false
  }
}

const selectGame = async (game) => {
  selectedGame.value = game
  emit('game-selected', game)
  loadingImages.value = true
  error.value = ''
  images.value = []

  try {
    const response = await fetch(`/.netlify/functions/igdb?action=images&gameId=${encodeURIComponent(game.id)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || 'No se pudieron cargar imagenes.')
    images.value = data.images || []
    imageFilter.value = 'all'
    if (!images.value.length) error.value = 'No encontre imagenes para ese juego.'
  } catch (imageError) {
    error.value = imageError.message || 'No se pudieron cargar imagenes.'
  } finally {
    loadingImages.value = false
  }
}

const setActiveTarget = (targetId) => {
  emit('set-active-target', targetId)
}

const assignImage = (image) => {
  if (!activeTarget.value) return
  emit('assign-target', {
    targetId: activeTarget.value.id,
    url: image.url,
    image: {
      ...image,
      gameName: selectedGame.value?.name || query.value.trim()
    }
  })
}

watch(query, () => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    searchGames({ silent: true })
  }, 450)
})

onMounted(() => {
  const initial = props.initialQuery.trim()
  if (!initial) return
  query.value = initial
  searchGames({ silent: true })
})
</script>

<template>
  <section class="sgdb-picker" :class="`mode-${props.displayMode}`">
    <div class="sgdb-workspace">
      <div class="sgdb-main">
        <header class="sgdb-header">
          <div class="sgdb-title">
            <span>IGDB</span>
            <h3>Buscar y asignar imagenes</h3>
            <p>{{ searchHint }}</p>
          </div>
          <div class="sgdb-active-pill">
            <i class="fas fa-arrow-pointer"></i>
            <span>{{ activeTarget?.label || 'Destino' }}</span>
            <strong>{{ assignedCount }}/{{ totalTargets }}</strong>
          </div>
        </header>

        <div class="sgdb-search-panel">
          <div class="sgdb-step-label">
            <b>1</b>
            <div>
              <strong>Busca el juego</strong>
              <span>Ejemplo: Mario Kart World, Zelda, Pokemon</span>
            </div>
          </div>

          <form class="sgdb-search" @submit.prevent="searchGames()">
            <i class="fas fa-search"></i>
            <input v-model="query" type="search" placeholder="Nombre del juego en IGDB" />
            <button type="submit" :disabled="loadingGames || !query.trim()">
              <i :class="loadingGames ? 'fas fa-circle-notch fa-spin' : 'fas fa-arrow-right'"></i>
              Buscar
            </button>
          </form>

          <div v-if="hasResults" class="sgdb-games">
            <button
              v-for="game in games"
              :key="game.id"
              type="button"
              :class="{ active: selectedGame?.id === game.id }"
              @click="selectGame(game)"
            >
              <img v-if="game.cover" :src="game.cover" :alt="game.name" loading="lazy" />
              <span>{{ game.name }}</span>
              <small v-if="game.releaseDate">{{ game.releaseDate }}</small>
            </button>
          </div>
        </div>

        <p v-if="error" class="sgdb-error">{{ error }}</p>

        <div v-if="loadingImages" class="sgdb-loading">
          <i class="fas fa-circle-notch fa-spin"></i>
          Cargando imagenes...
        </div>

        <div v-if="images.length" class="sgdb-results-head">
          <div class="sgdb-step-label">
            <b>2</b>
            <div>
              <strong>Elige una imagen</strong>
              <span>Se asignara a {{ activeTarget?.label || 'el destino activo' }}</span>
            </div>
          </div>

          <div class="sgdb-filter-row">
            <button
              v-for="filter in imageFilters"
              :key="filter.value"
              type="button"
              :class="{ active: imageFilter === filter.value }"
              @click="imageFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div v-if="filteredImages.length" class="sgdb-grid">
          <button
            v-for="image in filteredImages"
            :key="image.id"
            type="button"
            class="sgdb-image-card"
            :class="{ selected: imageAssignments.has(image.url) }"
            @click="assignImage(image)"
          >
            <img :src="image.thumb || image.url" :alt="`${selectedGame?.name || 'Juego'} ${image.type}`" loading="lazy" />
            <span v-if="imageAssignments.has(image.url)" class="sgdb-image-check">
              <i class="fas fa-check"></i>
            </span>
            <div>
              <span>{{ image.width && image.height ? `${image.width}x${image.height}` : image.type }}</span>
              <strong>{{ imageAssignments.get(image.url)?.join(', ') || `Usar en ${activeTarget?.label || 'destino'}` }}</strong>
            </div>
          </button>
        </div>

        <p v-else-if="images.length" class="sgdb-error">No hay imagenes con ese filtro.</p>
      </div>

      <aside class="sgdb-targets">
        <div class="sgdb-target-scroll">
          <div class="sgdb-targets-head">
            <span>Destino activo</span>
            <strong>{{ assignedCount }} de {{ totalTargets }}</strong>
          </div>
          <p class="sgdb-target-help">Haz click en un destino y luego elige imagen.</p>

          <button
            v-for="target in normalizedTargets"
            :key="target.id"
            type="button"
            class="sgdb-target-card"
            :class="{ active: activeTarget?.id === target.id, done: target.url }"
            @click="setActiveTarget(target.id)"
          >
            <img v-if="target.url" :src="target.url" :alt="target.label" loading="lazy" />
            <span v-else class="sgdb-target-empty">
              <i class="far fa-image"></i>
            </span>
            <span class="sgdb-target-copy">
              <strong>{{ target.label }}</strong>
              <small>{{ target.url ? 'Asignada' : 'Pendiente' }}</small>
            </span>
            <i :class="target.url ? 'fas fa-check' : 'fas fa-chevron-right'"></i>
          </button>
        </div>

        <div class="sgdb-target-actions">
          <button type="button" class="sgdb-done-btn" @click="emit('done')">
            <i class="fas fa-check"></i>
            Guardar seleccion
          </button>
          <button v-if="props.showReset" type="button" class="sgdb-reset-inline" @click="emit('reset-picks')">
            Reiniciar
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.sgdb-picker {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.sgdb-picker.mode-modal {
  border: 0;
  border-radius: 0;
  min-height: 0;
  padding: 0;
}

.sgdb-workspace {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 320px;
  height: 100%;
  max-height: calc(100dvh - 170px);
  min-height: 0;
  overflow: hidden;
}

.sgdb-main {
  align-content: start;
  display: grid;
  gap: 16px;
  height: 100%;
  max-height: calc(100dvh - 170px);
  min-width: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.mode-modal .sgdb-workspace,
.mode-modal .sgdb-main {
  max-height: none;
}

.sgdb-header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.sgdb-title > span,
.sgdb-image-card div > span,
.sgdb-targets-head > span {
  color: #0f766e;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.sgdb-title {
  display: grid;
  gap: 3px;
}

.sgdb-picker h3 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.2;
}

.sgdb-title p,
.sgdb-target-help {
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.sgdb-active-pill {
  align-items: center;
  background: #ecfeff;
  border: 1px solid #99f6e4;
  border-radius: 999px;
  color: #0f766e;
  display: inline-flex;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
}

.sgdb-active-pill span,
.sgdb-active-pill strong {
  color: #0f766e;
  font-size: 12px;
  font-weight: 950;
}

.sgdb-search-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.sgdb-step-label {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
}

.sgdb-step-label b {
  align-items: center;
  background: #ccfbf1;
  border-radius: 999px;
  color: #0f766e;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.sgdb-step-label div {
  display: grid;
  gap: 2px;
}

.sgdb-step-label strong {
  color: #111827;
  font-size: 14px;
  font-weight: 950;
}

.sgdb-step-label span {
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.sgdb-search {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 52px;
  padding: 5px 5px 5px 14px;
}

.sgdb-search > i {
  color: #64748b;
}

.sgdb-search input {
  background: transparent;
  border: 0;
  color: #111827;
  font: inherit;
  font-size: 14px;
  font-weight: 850;
  min-height: 42px;
  outline: none;
  padding: 0;
  width: 100%;
}

.sgdb-search:focus-within {
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px #ccfbf1;
}

.sgdb-reset,
.sgdb-search button,
.sgdb-games button,
.sgdb-image-card strong {
  align-items: center;
  border-radius: 12px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 42px;
  padding: 0 14px;
}

.sgdb-reset {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #475569;
}

.sgdb-search button {
  background: #0f766e;
  color: #ffffff;
  min-height: 42px;
}

.sgdb-search button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.sgdb-games {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.sgdb-games button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #475569;
  justify-content: start;
  min-height: 54px;
  padding: 6px 10px 6px 6px;
}

.sgdb-games button.active {
  background: #ccfbf1;
  border-color: #5eead4;
  color: #0f766e;
}

.sgdb-games img {
  border-radius: 8px;
  height: 38px;
  object-fit: cover;
  width: 30px;
}

.sgdb-games small {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.sgdb-games button span {
  color: inherit;
  font-size: 12px;
  font-weight: 950;
  text-transform: none;
}

.sgdb-results-head {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
}

.sgdb-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sgdb-filter-row button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  font-size: 12px;
  font-weight: 950;
  min-height: 34px;
  padding: 0 14px;
}

.sgdb-filter-row button.active {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
}

.sgdb-error,
.sgdb-loading {
  border-radius: 12px;
  font-size: 13px;
  font-weight: 850;
  padding: 10px 12px;
}

.sgdb-error {
  background: #fef2f2;
  color: #b91c1c;
}

.sgdb-loading {
  background: #ecfeff;
  color: #0f766e;
}

.sgdb-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-height: none;
  overflow: visible;
  padding-right: 4px;
}

.mode-modal .sgdb-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-height: none;
}

.sgdb-image-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  cursor: pointer;
  display: grid;
  gap: 10px;
  overflow: hidden;
  padding: 8px;
  position: relative;
  text-align: left;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.sgdb-image-card:hover,
.sgdb-image-card.selected {
  border-color: #14b8a6;
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.12);
  transform: translateY(-1px);
}

.sgdb-image-card.selected {
  background: #f0fdfa;
}

.sgdb-image-card img {
  aspect-ratio: 16 / 9;
  background: #e5e7eb;
  border-radius: 10px;
  object-fit: cover;
  width: 100%;
}

.sgdb-image-check {
  align-items: center;
  background: #0f766e;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  height: 28px;
  justify-content: center;
  position: absolute;
  right: 14px;
  top: 14px;
  width: 28px;
}

.sgdb-image-card div {
  display: grid;
  gap: 8px;
}

.sgdb-image-card strong {
  background: #111827;
  color: #ffffff;
  min-height: 36px;
}

.sgdb-image-card.selected strong {
  background: #0f766e;
}

.sgdb-targets {
  align-content: start;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: grid;
  gap: 10px;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  max-height: calc(100dvh - 170px);
  min-height: 0;
  overflow: hidden;
  padding: 12px;
  position: sticky;
  top: 0;
}

.mode-modal .sgdb-targets {
  max-height: none;
}

.sgdb-target-scroll {
  align-content: start;
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 3px;
}

.sgdb-targets-head {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 2px 2px 6px;
}

.sgdb-target-help {
  margin: -4px 2px 4px;
}

.sgdb-targets-head strong {
  color: #111827;
  font-size: 12px;
  font-weight: 950;
}

.sgdb-target-card {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #334155;
  display: grid;
  gap: 10px;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  min-height: 74px;
  padding: 8px;
  text-align: left;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.sgdb-target-card.active {
  background: #ecfeff;
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px #ccfbf1;
}

.sgdb-target-card.done:not(.active) {
  background: #ffffff;
}

.sgdb-target-card img,
.sgdb-target-empty {
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  width: 72px;
}

.sgdb-target-card img {
  object-fit: cover;
}

.sgdb-target-empty {
  align-items: center;
  background: #f1f5f9;
  border: 1px dashed #cbd5e1;
  color: #94a3b8;
  display: inline-flex;
  justify-content: center;
}

.sgdb-target-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.sgdb-target-copy strong {
  color: #111827;
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sgdb-target-copy small {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.sgdb-target-card > i {
  color: #0f766e;
}

.sgdb-target-actions {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), #ffffff 35%);
  border-top: 1px solid #e5e7eb;
  display: grid;
  gap: 8px;
  margin: 2px -2px -2px;
  padding-top: 12px;
}

.sgdb-done-btn,
.sgdb-reset-inline {
  align-items: center;
  border-radius: 12px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 42px;
}

.sgdb-done-btn {
  background: linear-gradient(90deg, #0f766e, #14b8a6);
  color: #ffffff;
}

.sgdb-reset-inline {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #475569;
}

@media (max-width: 900px) {
  .sgdb-workspace {
    grid-template-columns: 1fr;
  }

  .sgdb-targets {
    max-height: none;
    position: static;
  }

  .sgdb-workspace,
  .sgdb-main {
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 760px) {
  .sgdb-grid,
  .mode-modal .sgdb-grid {
    grid-template-columns: 1fr;
  }

  .sgdb-header,
  .sgdb-results-head {
    align-items: stretch;
    display: grid;
  }

  .sgdb-games {
    grid-template-columns: 1fr;
  }

  .sgdb-search {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .sgdb-search button {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
