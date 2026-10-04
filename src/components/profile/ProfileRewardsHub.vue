<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import ProfileRewardDialog from './ProfileRewardDialog.vue'
import ProfileAvatar from './ProfileAvatar.vue'

const props = defineProps({
  tab: { type: String, default: 'achievements' },
  profile: { type: Object, required: true },
  icons: { type: Array, default: () => [] },
  unlocked: { type: Array, default: () => [] },
  stars: { type: Number, default: 0 },
  own: Boolean,
  admin: Boolean,
  busy: Boolean,
  simulated: Boolean,
  selectionReset: Number,
  cost: { type: Function, required: true },
  saga: { type: Function, required: true }
})
const emit = defineEmits(['tab', 'back', 'equip', 'redeem', 'manage-icon', 'toggle-simulation', 'add-stars', 'reset-simulation'])
const category = ref('all')
const rarity = ref('all')
const ownership = ref('all')
const page = ref(1)
const pageSize = 20
const catalogHeading = ref(null)
const changePage = async delta => {
  page.value = Math.max(1, Math.min(pageCount.value, page.value + delta))
  selectedId.value = ''
  await nextTick()
  catalogHeading.value?.focus()
  catalogHeading.value?.scrollIntoView({ block: 'start' })
}
const rarityLabels = { normal: 'Normal', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' }
const iconRarity = icon => Object.hasOwn(rarityLabels, icon.rarity) ? icon.rarity : icon.special ? 'epic' : 'normal'
const selectedId = ref('')
const showHelp = ref(false)
const showSagaProgress = ref(false)
const rarityOptions = computed(() => Object.entries(rarityLabels).filter(([id]) => catalog.value.some(icon => iconRarity(icon) === id)))
const categories = computed(() => [...new Set(props.icons.map(props.saga))].sort())
const filtered = computed(() => props.icons.filter(icon => {
  const owned = props.unlocked.includes(icon.id)
  if (ownership.value === 'owned' && !owned) return false
  if (ownership.value === 'missing' && owned) return false
  if (ownership.value === 'available' && (owned || props.cost(icon) > props.stars)) return false
  if (ownership.value === 'locked' && (owned || props.cost(icon) <= props.stars)) return false
  if (rarity.value !== 'all' && iconRarity(icon) !== rarity.value) return false
  if (props.tab !== 'manage' && (icon.archived || icon.visible === false) && !owned) return false
  return (category.value === 'all' || props.saga(icon) === category.value)
}))
const selected = computed(() => props.icons.find(icon => icon.id === selectedId.value))
const selectIcon = icon => {
  if (props.busy) return
  if (props.tab === 'manage') { emit('manage-icon', icon); return }
  if (props.own && !props.unlocked.includes(icon.id)) { emit('redeem', icon); return }
  selectedId.value = icon.id
}
const equipSelected = () => { emit('equip', selected.value.id); selectedId.value = '' }
const catalog = computed(() => props.icons.filter(icon => (!icon.archived && icon.visible !== false) || props.unlocked.includes(icon.id)))
const collectionCount = computed(() => catalog.value.filter(icon => props.unlocked.includes(icon.id)).length)
const collectionPercent = computed(() => catalog.value.length ? Math.round(collectionCount.value / catalog.value.length * 100) : 0)
const sagaProgress = computed(() => categories.value.map(name => {
  const items = catalog.value.filter(icon => props.saga(icon) === name)
  const owned = items.filter(icon => props.unlocked.includes(icon.id))
  return { name, total: items.length, count: owned.length, icon: (owned[0] || items[0]), percent: items.length ? Math.round(owned.length / items.length * 100) : 0 }
}).filter(item => item.total))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pagedIcons = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const tabs = computed(() => [
  { id: 'achievements', label: 'Logros', icon: 'fas fa-trophy' },
  { id: 'collection', label: 'Colección', icon: 'fas fa-layer-group' },
  ...(props.own ? [{ id: 'redeem', label: 'Tienda', icon: 'fas fa-star' }] : []),
  ...(props.admin ? [{ id: 'manage', label: 'Administrar', icon: 'fas fa-gear' }] : [])
])
const resetFilters = () => { selectedId.value = ''; category.value = 'all'; rarity.value = 'all'; ownership.value = props.tab === 'collection' ? 'owned' : 'all'; page.value = 1; showSagaProgress.value = false }
watch(() => props.tab, resetFilters, { immediate: true })
watch([category, rarity, ownership], () => { selectedId.value = ''; page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
watch(() => props.selectionReset, resetFilters)
</script>

<template>
  <section class="rewards-hub">
    <button type="button" class="back-link" @click="emit('back')">← Volver al perfil</button>
    <header class="hub-head">
      <div><span class="eyebrow">{{ profile.name || 'Perfil' }}</span><h1>Logros y recompensas</h1></div>
      <div v-if="own" class="wallet"><strong><i class="fas fa-star" aria-hidden="true"></i> {{ stars }} estrellas</strong><button type="button" :aria-expanded="showHelp" @click="showHelp = !showHelp">Cómo ganar estrellas</button></div>
    </header>
    <aside v-if="showHelp && own" class="hub-help">Gana estrellas leyendo noticias que ofrecen recompensa. Cada noticia se recompensa una sola vez, tras el tiempo de lectura requerido. Los logros reflejan tu progreso; no implican un canje ni una recompensa de estrellas adicional.</aside>
    <nav class="hub-tabs" aria-label="Secciones de logros y recompensas">
      <button v-for="item in tabs" :key="item.id" type="button" :aria-current="tab === item.id ? 'page' : undefined" :class="{ active: tab === item.id }" @click="emit('tab', item.id)"><i :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span></button>
    </nav>
    <aside v-if="simulated" class="hub-help simulation" role="status">
      <strong>Simulación activa · {{ stars }} estrellas de prueba</strong>
      
      <button type="button" @click="emit('add-stars')">+100 estrellas</button>
      <button type="button" @click="emit('toggle-simulation')">Salir de simulación</button>
    </aside>
    <slot v-if="tab === 'achievements'" name="achievements" />
    <template v-else>
      <template v-if="tab === 'collection'">
        <section class="collection-summary">
          <i class="fas fa-layer-group" aria-hidden="true"></i>
          <div><h2>{{ own ? 'Tu colección de iconos' : 'Colección de iconos' }}</h2><p>{{ collectionCount }} de {{ catalog.length }} iconos conseguidos</p><progress :value="collectionCount" :max="catalog.length || 1" aria-label="Progreso de la colección"></progress></div><strong>{{ collectionPercent }}%</strong>
        </section>
        <button type="button" class="saga-disclosure" :aria-expanded="showSagaProgress" @click="showSagaProgress = !showSagaProgress">Progreso por saga <i :class="showSagaProgress ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" aria-hidden="true"></i></button>
        <div v-if="showSagaProgress" class="saga-progress">
          <button v-for="item in sagaProgress" :key="item.name" type="button" :aria-pressed="category === item.name" @click="category = category === item.name ? 'all' : item.name">
            <ProfileAvatar :src="item.icon.src" :alt="''" decorative :effect="item.icon" />
            <div><strong>{{ item.name }}</strong><small>{{ item.count }} / {{ item.total }}</small><progress :value="item.count" :max="item.total" :aria-label="`Colección de ${item.name}`"></progress></div><small>{{ item.percent }}%</small>
          </button>
        </div>
      </template>
      <template v-if="tab === 'manage'">
        <aside class="hub-help simulation">
          
          
          <button type="button" @click="emit('toggle-simulation')">{{ simulated ? 'Desactivar simulación' : 'Simular canjes' }}</button>
          <button v-if="simulated" type="button" @click="emit('reset-simulation')">Reiniciar prueba</button>
        </aside>
        <h2>Gestión de logros</h2><slot name="management" /><h2>Gestión de iconos</h2>
        
      </template>
      <header ref="catalogHeading" class="catalog-head" tabindex="-1">
        <div><h2>{{ tab === 'collection' ? 'Colección de iconos' : tab === 'manage' ? 'Catálogo administrable' : 'Canjear estrellas' }}</h2></div>
        <span>{{ filtered.length }} iconos · Página {{ page }} de {{ pageCount }}</span>
      </header>
      <div v-if="tab !== 'collection'" class="catalog-controls">
        <div class="filter-row" role="group" aria-label="Filtrar por saga"><button type="button" :aria-pressed="category === 'all'" @click="category = 'all'">Todas las sagas</button><button v-for="item in categories" :key="item" type="button" :aria-pressed="category === item" @click="category = item">{{ item }}</button></div>
        <div class="filter-row rarity-filters" role="group" aria-label="Filtrar por rareza"><button type="button" :aria-pressed="rarity === 'all'" @click="rarity = 'all'">Todas las rarezas</button><button v-for="[id, label] in rarityOptions" :key="id" type="button" :class="`filter-${id}`" :aria-pressed="rarity === id" @click="rarity = id">{{ label }}</button></div>
        <div class="filter-row" role="group" aria-label="Filtrar por disponibilidad"><button type="button" :aria-pressed="ownership === 'all'" @click="ownership = 'all'">Todos</button><button type="button" :aria-pressed="ownership === 'missing'" @click="ownership = 'missing'">Por conseguir</button><button v-if="own" type="button" :aria-pressed="ownership === 'available'" @click="ownership = 'available'">Puedo canjear</button></div>
      </div>
      <div class="catalog-layout" >
        <div>
          <div v-if="filtered.length" class="rewards-icons">
            <button v-for="icon in pagedIcons" :key="icon.id" type="button" :class="[`rarity-${iconRarity(icon)}`, { owned: unlocked.includes(icon.id) }]" :aria-pressed="selectedId === icon.id" @click="selectIcon(icon)">
              <span class="rarity-label">{{ rarityLabels[iconRarity(icon)] }}</span>
              <ProfileAvatar :src="icon.src" :alt="icon.name" :effect="icon" />
              <strong>{{ icon.name }}</strong><small>{{ saga(icon) }}</small>
              <span>{{ profile.selectedIcon === icon.id ? 'En uso' : unlocked.includes(icon.id) ? 'Obtenido' : `${cost(icon)} estrellas` }}</span>
              <small v-if="tab === 'manage' && (icon.archived || icon.visible === false)">Oculto en el catálogo</small>
            </button>
          </div>
          <div v-else class="catalog-empty"><h3>{{ category !== 'all' ? 'No hay coincidencias' : tab === 'collection' ? 'Tu colección empieza aquí' : 'No hay iconos disponibles con estos filtros' }}</h3><p v-if="tab !== 'collection'">Prueba otra saga o rareza.</p><button v-if="own && tab === 'collection'" type="button" @click="emit('tab', 'redeem')">Explorar iconos para canjear</button></div>
          <nav v-if="pageCount > 1" class="catalog-pagination" aria-label="Páginas de iconos">
            <button type="button" :disabled="page === 1" @click="changePage(-1)">← Anterior</button><span aria-live="polite">Página {{ page }} de {{ pageCount }}</span><button type="button" :disabled="page === pageCount" @click="changePage(1)">Siguiente →</button>
          </nav>
        </div>

      </div>
    </template>
    <ProfileRewardDialog v-if="selected" :result="{ icon: selected }" inspect :own="own" :equipped="profile.selectedIcon === selected.id" :saving="busy" :stars="stars" :cost="cost" :simulated="simulated" @close="selectedId = ''" @use="equipSelected" @another="selectedId = ''" />
  </section>
</template>

<style scoped>
.rewards-hub { max-width: var(--content-max, 1280px); margin: 0 auto; color: var(--text-primary); }
.back-link, .wallet button { color: var(--accent-hover); min-height: 44px; text-align: left; }
.hub-head, .catalog-head { display: flex; gap: 24px; align-items: start; justify-content: space-between; margin: 18px 0; }
h1 { font-size: clamp(26px, 4vw, 38px); line-height: 1.2; margin: 6px 0 10px; } h2 { font-size: 22px; margin: 20px 0 8px; } h3 { font-size: 18px; }
p, .muted { color: var(--text-secondary); line-height: 1.6; }
.eyebrow { color: var(--accent-hover); font-size: 13px; }
.wallet { display: grid; gap: 4px; flex-shrink: 0; } .wallet i { color: #facc15; }
.hub-help { background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 14px; padding: 16px; line-height: 1.6; }
.simulation { margin: 16px 0; border-color: #b39439; }.simulation button { min-height: 44px; padding: 10px 16px; margin: 8px 8px 0 0; background: var(--surface); color: var(--text-primary); border-radius: 10px; }
.hub-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
.hub-tabs button { min-height: 44px; padding: 8px 18px; color: var(--text-secondary); border-radius: 10px; background: var(--surface); } .hub-tabs .active { background: var(--accent); color: white; }
.catalog-head h2 { margin-top: 0; } .catalog-head > span { white-space: nowrap; color: var(--text-muted); }
.catalog-controls { display: flex; align-items: end; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.catalog-controls label { display: grid; gap: 8px; font-size: 13px; flex: 1 1 200px; } .catalog-controls .check-label { display: flex; align-items: center; min-height: 44px; }
input, select { width: 100%; background-color: var(--surface-elevated); border: 1px solid var(--border); color: var(--text-primary); border-radius: 10px; min-height: 44px; padding: 10px 14px; } input[type=checkbox] { min-height: 0; width: 18px; height: 18px; accent-color: var(--accent); }
.catalog-layout { display: grid; gap: 24px; align-items: start; }
.rewards-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.rewards-icons button { display: grid; gap: 9px; justify-items: center; align-content: start; padding: 18px 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); text-align: center; overflow-wrap: anywhere; }
.rewards-icons button[aria-pressed=true] { border-color: var(--accent-hover); background: var(--surface-elevated); } .rewards-icons small { color: var(--text-muted); } .rewards-icons span { font-size: 13px; color: var(--accent-hover); } .primary, .catalog-empty button { min-height: 44px; padding: 10px 16px; background: var(--accent); color: white; border-radius: 10px; width: 100%; } button:disabled { opacity: .55; cursor: default; }
.catalog-empty { padding: 30px 16px; border: 1px dashed var(--border); border-radius: 14px; } .catalog-empty button { width: auto; margin-top: 16px; }
@media (max-width: 900px) { }
@media (max-width: 600px) { .hub-head { flex-direction: column; gap: 12px; } .rewards-icons { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hub-tabs { gap: 6px; } .hub-tabs button { flex: 1 1 auto; padding: 8px 12px; } }


.hub-head { padding: 24px; border: 1px solid #a855f733; border-radius: 20px; background: linear-gradient(120deg, #a855f715, #0b102166); }
.hub-head h1 { letter-spacing: -.035em; }.wallet { padding: 14px 18px; border-radius: 14px; background: #080b1bb3; border: 1px solid #ffffff14; }.wallet strong { font-size: 20px; }
.hub-tabs { gap: 10px; }.hub-tabs button { border: 1px solid #ffffff12; }.hub-tabs .active { background: linear-gradient(135deg, #7137ec, #9b4dff); box-shadow: 0 6px 24px #7c3aed30; }
.collection-summary { display: flex; align-items: center; gap: 20px; padding: 24px; border-radius: 18px; border: 1px solid #a855f750; background: linear-gradient(110deg, #6d28d933, #101426); }.collection-summary > i { font-size: 32px; color: #c084fc; padding: 18px; background: #8b5cf633; border-radius: 16px; }.collection-summary > div { flex: 1; min-width: 0; }.collection-summary h2 { margin: 0; }.collection-summary p { margin: 6px 0 10px; }
progress { display: block; width: 100%; height: 8px; border: 0; border-radius: 20px; overflow: hidden; background: #ffffff15; }progress::-webkit-progress-bar { background: #ffffff15; }progress::-webkit-progress-value { background: linear-gradient(90deg, #a855f7, #6584ff); border-radius: 20px; }progress::-moz-progress-bar { background: #a855f7; }
.saga-progress { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0 28px; }.saga-progress button { display: flex; align-items: center; gap: 12px; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; color: var(--text-primary); }.saga-progress button[aria-pressed=true] { border-color: #a855f7; }.saga-progress button > div { flex: 1; }.saga-progress small { display: block; color: var(--text-secondary); font-size: 12px; margin: 5px 0; }.saga-progress :deep(.profile-avatar-ui) { --avatar-size: 46px; }
.catalog-controls { padding: 16px; border-radius: 14px; background: #11152888; border: 1px solid var(--border); }.catalog-controls label { flex-basis: 180px; }.catalog-controls label:first-child { flex-grow: 2; }
.rewards-icons { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }.rewards-icons button { --rarity-color: #64748b; padding: 14px 10px 18px; background: linear-gradient(160deg, #ffffff05, #080c1b); border-color: color-mix(in srgb, var(--rarity-color) 45%, transparent); border-radius: 16px; gap: 10px; transition: border-color .15s, transform .15s; }.rewards-icons button:hover { transform: translateY(-3px); border-color: var(--rarity-color); }.rewards-icons button[aria-pressed=true] { outline: 2px solid #c084fc; outline-offset: 3px; }
.rewards-icons :deep(.profile-avatar-ui) { --avatar-size: clamp(72px, 7vw, 100px); }.rewards-icons .rarity-label { font-size: 10px; text-transform: uppercase; letter-spacing: .07em; color: #eef2ff; background: color-mix(in srgb, var(--rarity-color) 35%, #101428); padding: 4px 14px; border-radius: 20px; }.rewards-icons .rarity-rare { --rarity-color: #3b82f6; }.rewards-icons .rarity-epic { --rarity-color: #c026d3; }.rewards-icons .rarity-legendary { --rarity-color: #f59e0b; }.rewards-icons strong { font-size: 14px; line-height: 1.4; }.rewards-icons small { font-size: 12px; }.rewards-icons .owned > span:last-of-type { color: #6ee7b7; }
.catalog-pagination { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px; margin: 24px 0; }.catalog-pagination button { min-height: 44px; padding: 10px 16px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); border-radius: 10px; }.catalog-pagination span { color: var(--text-secondary); font-size: 13px; }
@media(max-width:1100px) { .rewards-icons { grid-template-columns: repeat(4, minmax(0,1fr)); } }
@media(max-width:900px) {.rewards-icons { grid-template-columns: repeat(3,minmax(0,1fr)); } }
@media(max-width:600px) { .hub-head { padding: 18px; }.wallet { width: 100%; }.collection-summary { padding: 16px; gap: 12px; }.collection-summary > i { font-size: 22px; padding: 12px; }.collection-summary h2 { font-size: 18px; }.collection-summary p { font-size: 13px; }.rewards-icons { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }.rewards-icons :deep(.profile-avatar-ui) { --avatar-size: 86px; }.saga-progress { grid-template-columns: repeat(2,minmax(0,1fr)); }.saga-progress button { padding: 10px; gap: 8px; flex-wrap: wrap; }.saga-progress button > small { display: none; }.saga-progress :deep(.profile-avatar-ui) { --avatar-size: 34px; }.catalog-controls { gap: 12px; }.catalog-head { flex-direction: column; gap: 8px; }.catalog-head > span { white-space: normal; } }
@media(prefers-reduced-motion:reduce) { .rewards-icons button { transition: none; }.rewards-icons button:hover { transform: none; } }


.catalog-head { scroll-margin-top: calc(var(--public-nav-offset,72px) + 20px); outline: none; }.rewards-hub button:focus-visible,.rewards-hub select:focus-visible,.rewards-hub input:focus-visible { outline: 2px solid #c084fc; outline-offset: 4px; }

.hub-head { padding: 12px 16px; margin: 8px 0; align-items: center; gap: 12px; }
.hub-head h1 { font-size: clamp(21px,3vw,28px); margin: 4px 0 0; }
.wallet { display: flex; align-items: center; gap: 12px; padding: 8px 12px; }
.wallet strong { font-size: 16px; white-space: nowrap; }
.wallet button { font-size: 12px; min-height: 36px; }
.hub-tabs { margin: 12px 0; gap: 6px; flex-wrap: nowrap; overflow-x: auto; }
.hub-tabs button { flex: 1 0 auto; padding: 8px 12px; font-size: 13px; }
.collection-summary { padding: 12px 16px; gap: 12px; }
.collection-summary > i { font-size: 20px; padding: 10px; }
.collection-summary h2 { font-size: 16px; }
.collection-summary p { font-size: 12px; margin: 4px 0 8px; }
.saga-disclosure { min-height: 44px; display: flex; align-items: center; gap: 12px; color: #c084fc; font-size: 13px; }
.catalog-head { margin: 8px 0 12px; gap: 6px; }
.catalog-head h2 { font-size: 18px; margin: 0; }
.catalog-head > span { font-size: 12px; }
.catalog-controls { display: grid; grid-template-columns: minmax(0,1fr) minmax(140px,220px); padding: 10px; gap: 8px; margin-bottom: 12px; }
.catalog-controls > label:first-child { grid-column: 1; grid-row: 1; }
.catalog-controls > label:last-child { grid-column: 2; grid-row: 1; }
.catalog-controls label { font-size: 12px; gap: 4px; }
.filter-row { grid-column: 1/-1; display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 4px; }
.filter-row button { flex: 0 0 auto; min-height: 40px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-primary); font-size: 12px; }
.filter-row button[aria-pressed=true] { background: #7c3aed; border-color: #c084fc; color: white; }
.rarity-filters .filter-rare { border-color: #3b82f6; }
.rarity-filters .filter-epic { border-color: #c026d3; }
.rarity-filters .filter-legendary { border-color: #f59e0b; }
.simulation { padding: 8px 12px; margin: 8px 0; }
.simulation strong { font-size: 13px; }
.simulation button { margin: 4px 6px 0 0; font-size: 12px; }
@media(max-width:600px) { .hub-head { flex-direction: row; flex-wrap: wrap; padding: 10px 12px; }.wallet { width: auto; padding: 0; border: 0; background: transparent; }.hub-tabs button { flex: 1 0 auto; padding: 8px; font-size: 12px; }.catalog-controls { grid-template-columns: minmax(0,1fr) 135px; }.rewards-icons button { gap: 6px; padding: 12px 8px; }.rewards-icons :deep(.profile-avatar-ui) { --avatar-size: 76px; } }
.hub-head { padding: 0; border: 0; background: transparent; border-radius: 0; }
.hub-head .eyebrow { display: none; }
.hub-head h1 { font-size: 22px; }
.wallet { padding: 0; border: 0; background: transparent; }
.catalog-controls { display: flex; flex-direction: column; align-items: stretch; padding: 0; background: transparent; border: 0; }
.filter-row { width: 100%; min-width: 0; scrollbar-width: thin; scrollbar-color: #7c3aed transparent; }
.filter-row button { border-radius: 999px; font-weight: 600; min-height: 44px; padding: 8px 16px; }
.collection-summary { padding: 8px 12px; }
.collection-summary > i { display: none; }
@media(max-width:600px) { .hub-head { padding: 0; gap: 8px; }.hub-head h1 { font-size: 20px; }.wallet strong { font-size: 14px; }.wallet button { font-size: 11px; }.filter-row button { font-size: 12px; padding: 8px 14px; } }
/* A single scrollable filter strip keeps the catalog close to the tabs. */
.catalog-controls { flex-direction: row; align-items: center; overflow-x: auto; gap: 12px; padding: 3px 2px 8px; scrollbar-width: thin; scrollbar-color: #7c3aed transparent; }
.catalog-controls .filter-row { flex: 0 0 auto; width: auto; overflow: visible; padding: 0; gap: 6px; }
.catalog-controls .filter-row + .filter-row { border-left: 1px solid #a78bfa40; padding-left: 12px; }
.catalog-controls .filter-row button { min-height: 40px; padding: 8px 14px; font-size: 12px; }
@media(max-width:600px) {
  .hub-head { flex-direction: column; align-items: flex-start; gap: 4px; }
  .wallet { gap: 10px; }
  .hub-tabs { margin: 8px 0; padding-bottom: 8px; }
  .catalog-head { flex-direction: row; align-items: center; flex-wrap: wrap; margin: 8px 0; }
  .catalog-head h2 { font-size: 17px; }
  .catalog-controls { margin-bottom: 8px; }
}
.hub-tabs button { display: flex; justify-content: center; align-items: center; gap: 8px; }
.hub-tabs button i { font-size: 14px; flex-shrink: 0; }
@media(max-width:600px) {
  .hub-tabs { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); overflow: visible; gap: 6px; }
  .hub-tabs button { flex-direction: column; min-width: 0; gap: 5px; min-height: 54px; padding: 8px 4px; font-size: 11px; }
  .hub-tabs:has(button:nth-child(3):last-child) { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .hub-tabs:has(button:nth-child(2):last-child) { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .catalog-controls { display: flex; flex-direction: column; gap: 8px; overflow: hidden; padding: 2px 0; }
  .catalog-controls .filter-row { width: 100%; overflow-x: auto; padding: 2px 2px 4px; scrollbar-width: thin; }
  .catalog-controls .filter-row + .filter-row { border-left: 0; padding-left: 2px; }
  .catalog-controls .filter-row button { min-height: 40px; padding: 8px 12px; }
}
</style>
