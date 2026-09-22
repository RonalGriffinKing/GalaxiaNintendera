<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { defaultRuzafaProducts } from '@/data/ruzafaProducts'
import { getRuzafaProducts, saveRuzafaProduct, saveRuzafaProducts } from '@/services/ruzafaProducts'

const products = ref([])
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const mode = ref('home')
const printTitle = ref('')
const queue = ref([])
const search = ref('')
const category = ref('Todos')
const editing = reactive({})
const pendingProductIds = ref(new Set())

const categories = ['Todos', 'Congelados', 'Refrigerados', 'Elaborados', 'Secos']

const normalizeProduct = product => ({
  audit: true,
  daily: false,
  bar: false,
  active: true,
  storage: 'Refrigeracion (+)',
  state: 'Abierto',
  ...product,
})

onMounted(async () => {
  try {
    products.value = (await getRuzafaProducts()).map(normalizeProduct)
  } catch (error) {
    products.value = defaultRuzafaProducts.map(normalizeProduct)
    message.value = 'Catalogo local cargado. Firebase no esta disponible en este momento.'
  } finally {
    loading.value = false
  }
})

const filteredProducts = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  return products.value.filter(product => {
    const matchesCategory = category.value === 'Todos' || product.category === category.value
    const matchesTerm = !term || product.name.toLocaleLowerCase('es').includes(term)
    return matchesCategory && matchesTerm
  })
})

const pendingCount = computed(() => pendingProductIds.value.size)

const formatDate = date => new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(date)

const formatTime = date => new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(date)

const addShelfLife = (date, shelfLife) => {
  const expiry = new Date(date)
  const normalized = String(shelfLife || '').toLowerCase()
  const amount = Number.parseInt(normalized, 10)
  if (!Number.isFinite(amount) || normalized.includes('primaria')) return null

  if (normalized.includes('hora')) {
    expiry.setHours(expiry.getHours() + amount)
  } else if (normalized.includes('mes')) {
    expiry.setMonth(expiry.getMonth() + amount)
    expiry.setHours(23, 59, 0, 0)
  } else {
    expiry.setDate(expiry.getDate() + amount)
    expiry.setHours(23, 59, 0, 0)
  }
  return expiry
}

const makeLot = (date, index) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const suffix = String(index + 1).padStart(3, '0')
  return `${day}${month}${suffix}`
}

const createQueue = type => {
  const now = new Date()
  const source = products.value.filter(product => product.active && product[type])
  queue.value = source.map((product, index) => ({
    ...product,
    selected: true,
    quantity: 1,
    printedAt: now,
    expiry: addShelfLife(now, product.shelfLife),
    manualExpiry: '',
    lot: makeLot(now, index),
  }))
  const titles = {
    audit: 'Impresion para auditoria',
    daily: 'Impresion diaria',
    bar: 'Impresion para barra',
  }
  printTitle.value = titles[type] || 'Impresion de etiquetas'
  mode.value = 'preview'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const printableLabels = computed(() => queue.value.flatMap(item => {
  if (!item.selected) return []
  return Array.from({ length: Math.max(1, Number(item.quantity) || 1) }, () => item)
}))

const expiryText = item => {
  if (item.manualExpiry) return formatDate(new Date(`${item.manualExpiry}T12:00:00`))
  return item.expiry ? formatDate(item.expiry) : 'INDICAR FECHA'
}

const printLabels = () => {
  if (!printableLabels.value.length) {
    message.value = 'Selecciona al menos una etiqueta.'
    return
  }
  window.print()
}

const editProduct = product => {
  Object.assign(editing, JSON.parse(JSON.stringify(product)))
  mode.value = 'edit'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const saveProduct = async () => {
  saving.value = true
  message.value = ''
  try {
    await saveRuzafaProduct(editing)
    const index = products.value.findIndex(product => product.id === editing.id)
    if (index >= 0) products.value[index] = normalizeProduct({ ...editing })
    message.value = 'Producto actualizado para todos los dispositivos.'
    mode.value = 'manage'
  } catch (error) {
    message.value = 'No se pudo guardar. Revisa los permisos de Firebase.'
  } finally {
    saving.value = false
  }
}

const toggleProductActive = product => {
  const updated = { ...product, active: !product.active }
  const index = products.value.findIndex(item => item.id === product.id)
  if (index >= 0) products.value[index] = updated
  pendingProductIds.value = new Set(pendingProductIds.value).add(product.id)
  message.value = `${pendingProductIds.value.size} cambio(s) pendiente(s) de guardar.`
}

const togglePrintGroup = (product, field) => {
  if (!product.active || !['audit', 'daily', 'bar'].includes(field)) return
  const index = products.value.findIndex(item => item.id === product.id)
  if (index < 0) return
  products.value[index] = { ...product, [field]: !product[field] }
  pendingProductIds.value = new Set(pendingProductIds.value).add(product.id)
  message.value = `${pendingProductIds.value.size} cambio(s) pendiente(s) de guardar.`
}

const savePendingProducts = async () => {
  if (!pendingProductIds.value.size) {
    message.value = 'No hay cambios pendientes.'
    return
  }
  saving.value = true
  try {
    const changedProducts = products.value.filter(product => pendingProductIds.value.has(product.id))
    await saveRuzafaProducts(changedProducts)
    const savedCount = changedProducts.length
    pendingProductIds.value = new Set()
    message.value = `${savedCount} cambio(s) guardado(s) correctamente en Firebase.`
  } catch (error) {
    message.value = 'Firebase rechazo el guardado. Los cambios siguen pendientes para que puedas volver a intentarlo.'
  } finally {
    saving.value = false
  }
}

const goHome = () => {
  mode.value = 'home'
  message.value = ''
}
</script>

<template>
  <main class="rz-page">
    <header class="rz-header no-print">
      <button v-if="mode !== 'home'" class="back-button" type="button" aria-label="Volver" @click="goHome">
        <span aria-hidden="true">←</span>
      </button>
      <div>
        <p class="location">Ruzafa · Etiquetado interno</p>
        <h1>Impresora de etiquetas</h1>
      </div>
      <div class="printer-status"><span></span> Seleccionar TD-4550 al imprimir</div>
    </header>

    <p v-if="message" class="notice no-print">{{ message }}</p>

    <section v-if="loading" class="loading-state no-print">Cargando productos...</section>

    <section v-else-if="mode === 'home'" class="home-view no-print">
      <div class="intro">
        <p class="eyebrow">Selecciona una tarea</p>
        <h2>¿Qué etiquetas necesitas hoy?</h2>
        <p>Las fechas se calculan automáticamente usando la tabla de caducidades.</p>
      </div>

      <div class="primary-actions">
        <button class="action-button audit" type="button" @click="createQueue('audit')">
          <span class="action-icon" aria-hidden="true">A</span>
          <span><strong>Imprimir para auditoría</strong><small>Todos los productos activos</small></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
        <button class="action-button daily" type="button" @click="createQueue('daily')">
          <span class="action-icon" aria-hidden="true">D</span>
          <span><strong>Impresión diaria</strong><small>Solo los productos de uso diario</small></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
        <button class="action-button bar" type="button" @click="createQueue('bar')">
          <span class="action-icon" aria-hidden="true">B</span>
          <span><strong>Impresión para barra</strong><small>Bebidas, siropes y preparados de barra</small></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <button class="manage-button" type="button" @click="mode = 'manage'">
        Gestionar productos y caducidades
      </button>

      <div class="spec-strip">
        <span><strong>55 × 50 mm</strong> etiqueta</span>
        <span><strong>4 mm</strong> separación</span>
        <span><strong>{{ products.length }}</strong> productos</span>
      </div>
    </section>

    <section v-else-if="mode === 'preview'" class="preview-view">
      <div class="preview-heading no-print">
        <div>
          <p class="eyebrow">Revisar antes de imprimir</p>
          <h2>{{ printTitle }}</h2>
          <p>{{ printableLabels.length }} etiquetas preparadas</p>
        </div>
        <button class="print-button" type="button" @click="printLabels">Imprimir etiquetas</button>
      </div>

      <div class="queue-table no-print">
        <div v-for="item in queue" :key="item.id" class="queue-row">
          <input v-model="item.selected" type="checkbox" :aria-label="`Incluir ${item.name}`">
          <div class="queue-name"><strong>{{ item.name }}</strong><small>{{ item.shelfLife }}</small></div>
          <label>Caducidad
            <input v-if="!item.expiry" v-model="item.manualExpiry" type="date">
            <span v-else>{{ expiryText(item) }}</span>
          </label>
          <label>Lote<input v-model="item.lot" type="text" inputmode="numeric"></label>
          <label>Cantidad<input v-model.number="item.quantity" type="number" min="1" max="99"></label>
        </div>
      </div>

      <div class="print-sheet" aria-label="Etiquetas para imprimir">
        <article v-for="(item, index) in printableLabels" :key="`${item.id}-${index}`" class="thermal-label">
          <div class="label-product"><b>PRODUCTO</b><strong>{{ item.name }}</strong></div>
          <div class="label-rule"></div>
          <div class="label-grid">
            <span>Fecha<br>Impresión</span><b>{{ formatDate(item.printedAt) }}<br>{{ formatTime(item.printedAt) }}</b>
            <span>Caducidad<br>Primaria</span><b></b>
            <span>Caducidad</span><b>{{ expiryText(item) }}</b>
            <span>Almacenamiento</span><b>{{ item.storage }}</b>
          </div>
          <div class="label-rule"></div>
          <div class="label-grid label-bottom">
            <span>Lote</span><b>{{ item.lot }}</b>
            <span>Estado</span><b>{{ item.state }}</b>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="mode === 'manage'" class="manage-view no-print">
      <div class="manage-heading">
        <div><p class="eyebrow">Configuración compartida</p><h2>Productos y caducidades</h2></div>
        <button class="print-button save-manage-button" type="button" :disabled="saving || !pendingCount" @click="savePendingProducts">
          {{ saving ? 'Guardando...' : pendingCount ? `Guardar cambios (${pendingCount})` : 'Cambios guardados' }}
        </button>
      </div>
      <div class="filters">
        <input v-model="search" type="search" placeholder="Buscar producto..." aria-label="Buscar producto">
        <div class="category-tabs">
          <button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
        </div>
      </div>
      <div class="product-list">
        <div v-for="product in filteredProducts" :key="product.id" class="product-row" :class="{ inactive: !product.active, pending: pendingProductIds.has(product.id) }">
          <button class="product-main" type="button" @click="editProduct(product)">
            <span><strong>{{ product.name }}</strong><small>{{ product.active ? product.category : 'Desactivado' }}</small></span>
            <span class="life">{{ product.shelfLife }}</span>
            <span aria-hidden="true">→</span>
          </button>
          <span class="flags">
            <button
              type="button"
              :class="{ on: product.audit }"
              :disabled="!product.active"
              :title="product.audit ? 'Quitar de auditoria' : 'Incluir en auditoria'"
              @click="togglePrintGroup(product, 'audit')"
            >A</button>
            <button
              type="button"
              :class="{ on: product.daily }"
              :disabled="!product.active"
              :title="product.daily ? 'Quitar de impresion diaria' : 'Incluir en impresion diaria'"
              @click="togglePrintGroup(product, 'daily')"
            >D</button>
            <button
              type="button"
              :class="{ on: product.bar }"
              :disabled="!product.active"
              :title="product.bar ? 'Quitar de impresion para barra' : 'Incluir en impresion para barra'"
              @click="togglePrintGroup(product, 'bar')"
            >B</button>
          </span>
          <button
            class="active-button"
            :class="{ restore: !product.active }"
            type="button"
            :aria-label="product.active ? `Desactivar ${product.name}` : `Reactivar ${product.name}`"
            @click="toggleProductActive(product)"
          >
            {{ product.active ? 'Desactivar' : 'Reactivar' }}
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="mode === 'edit'" class="edit-view no-print">
      <p class="eyebrow">Editar producto</p>
      <h2>{{ editing.name }}</h2>
      <form @submit.prevent="saveProduct">
        <label>Nombre<input v-model.trim="editing.name" required></label>
        <div class="form-grid">
          <label>Caducidad secundaria<input v-model.trim="editing.shelfLife" placeholder="Ej.: 48 horas" required></label>
          <label>Categoría<select v-model="editing.category"><option v-for="item in categories.slice(1)" :key="item">{{ item }}</option></select></label>
          <label>Almacenamiento<input v-model.trim="editing.storage" required></label>
          <label>Estado<input v-model.trim="editing.state" required></label>
        </div>
        <div class="toggles">
          <label><input v-model="editing.active" type="checkbox"> Producto activo</label>
          <label><input v-model="editing.audit" type="checkbox"> Incluir en auditoría</label>
          <label><input v-model="editing.daily" type="checkbox"> Incluir en impresión diaria</label>
          <label><input v-model="editing.bar" type="checkbox"> Incluir en impresión para barra</label>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" @click="mode = 'manage'">Cancelar</button>
          <button class="print-button" type="submit" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar cambios' }}</button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
:global(body) { margin: 0; }
.rz-page { min-height: 100dvh; background: #f3f5f2; color: #152018; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
.rz-header { min-height: 82px; padding: 18px clamp(20px, 5vw, 72px); display: flex; align-items: center; gap: 18px; color: white; background: #173c2b; }
.rz-header h1 { margin: 2px 0 0; font-size: clamp(22px, 3vw, 31px); line-height: 1.1; }
.location, .eyebrow { margin: 0; text-transform: uppercase; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
.location { color: #b8d6c6; }
.printer-status { margin-left: auto; padding: 9px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; background: #244d3b; border: 1px solid #3b6954; border-radius: 6px; }
.printer-status span { width: 8px; height: 8px; border-radius: 50%; background: #f0c653; box-shadow: 0 0 0 3px rgba(240,198,83,.14); }
.back-button { width: 42px; height: 42px; color: white; border: 1px solid #547465; border-radius: 6px; background: transparent; font-size: 25px; cursor: pointer; }
.notice { max-width: 1080px; margin: 18px auto 0; padding: 12px 16px; color: #643f00; background: #fff4d5; border: 1px solid #ead18a; border-radius: 6px; }
.loading-state { padding: 15vh 20px; text-align: center; font-weight: 700; }
.home-view, .preview-view, .manage-view, .edit-view { width: min(1080px, calc(100% - 40px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0; }
.intro { max-width: 640px; }
.eyebrow { color: #35704f; }
h2 { margin: 8px 0 10px; font-size: clamp(28px, 4vw, 44px); line-height: 1.08; }
.intro > p:last-child, .preview-heading p { color: #5a675e; font-size: 17px; }
.primary-actions { margin-top: 38px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.action-button { min-height: 150px; padding: 24px; display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 18px; text-align: left; border: 0; border-radius: 8px; cursor: pointer; box-shadow: 0 10px 28px rgba(23,60,43,.11); transition: transform .18s ease, box-shadow .18s ease; }
.action-button:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(23,60,43,.16); }
.action-button.audit { color: white; background: #206644; }
.action-button.daily { color: #17211a; background: #f0c653; }
.action-button.bar { color: white; background: #285777; }
.action-icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 50%; font-size: 22px; font-weight: 900; background: rgba(255,255,255,.18); }
.action-button strong { display: block; font-size: clamp(18px, 2.2vw, 23px); }
.action-button small { display: block; margin-top: 7px; font-size: 14px; opacity: .8; }
.arrow { font-size: 28px; }
.manage-button { width: 100%; margin-top: 18px; padding: 17px; color: #274234; background: #fff; border: 1px solid #cbd4ce; border-radius: 7px; font-weight: 800; cursor: pointer; }
.spec-strip { margin-top: 30px; padding-top: 22px; display: flex; gap: 34px; color: #5d6b62; border-top: 1px solid #d7ddd9; font-size: 14px; }
.spec-strip strong { color: #1d2d23; }
.preview-heading, .manage-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 28px; }
.print-button, .secondary-button { min-height: 46px; padding: 0 20px; border-radius: 6px; font-weight: 800; cursor: pointer; }
.print-button { color: white; background: #176a43; border: 1px solid #176a43; }
.secondary-button { color: #274234; background: white; border: 1px solid #bdc9c1; }
.queue-table { overflow: hidden; background: white; border: 1px solid #d4dbd6; border-radius: 7px; }
.queue-row { min-height: 68px; padding: 10px 16px; display: grid; grid-template-columns: 28px minmax(180px, 1fr) 150px 118px 90px; align-items: center; gap: 14px; border-bottom: 1px solid #e5e9e6; }
.queue-row:last-child { border-bottom: 0; }
.queue-row input[type="checkbox"] { width: 19px; height: 19px; accent-color: #176a43; }
.queue-name small, .product-row small { display: block; margin-top: 4px; color: #77827b; }
.queue-row label { color: #738077; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.queue-row label span { display: block; margin-top: 5px; color: #17211a; font-size: 14px; }
.queue-row input[type="text"], .queue-row input[type="number"], .queue-row input[type="date"] { width: 100%; box-sizing: border-box; margin-top: 4px; padding: 8px; border: 1px solid #cbd4ce; border-radius: 4px; }
.print-sheet { display: none; }
.filters { margin-bottom: 20px; }
.filters > input { width: 100%; box-sizing: border-box; padding: 14px 16px; border: 1px solid #bec9c1; border-radius: 6px; font-size: 16px; }
.category-tabs { margin-top: 12px; display: flex; gap: 7px; overflow-x: auto; }
.category-tabs button { padding: 9px 13px; white-space: nowrap; color: #445149; background: transparent; border: 1px solid #c5cfc8; border-radius: 5px; cursor: pointer; }
.category-tabs button.active { color: white; background: #244d3b; border-color: #244d3b; }
.product-list { overflow: hidden; border: 1px solid #d5ddd7; border-radius: 7px; background: white; }
.product-row { width: 100%; min-height: 62px; padding: 0 12px 0 0; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; color: inherit; background: white; border-bottom: 1px solid #e7ebe8; }
.product-row:hover { background: #f7faf8; }
.product-row.inactive { background: #f0f2f0; }
.product-row.pending { box-shadow: inset 4px 0 #d39a16; }
.product-row.inactive .product-main { opacity: .56; }
.product-main { min-width: 0; min-height: 62px; padding: 10px 16px; display: grid; grid-template-columns: minmax(0, 1fr) 120px 20px; gap: 12px; align-items: center; text-align: left; color: inherit; background: transparent; border: 0; cursor: pointer; }
.active-button { min-width: 92px; padding: 9px 11px; color: #8b2f27; background: #fff7f5; border: 1px solid #e2b5b0; border-radius: 5px; font-weight: 800; cursor: pointer; }
.active-button.restore { color: #17603e; background: #eff9f3; border-color: #a8cfb7; }
.life { color: #3e5949; font-weight: 700; }
.flags { display: flex; gap: 5px; }
.flags button { width: 29px; height: 29px; padding: 0; display: grid; place-items: center; color: #667169; background: #edf0ee; border: 1px solid #d5dcd7; border-radius: 4px; font-size: 12px; font-weight: 900; cursor: pointer; }
.flags button.on { color: white; background: #347252; border-color: #347252; }
.flags button:disabled { color: #a8b0aa; background: #ecefed; border-color: transparent; }
.edit-view { max-width: 760px; }
.edit-view form { margin-top: 28px; padding: 28px; background: white; border: 1px solid #d4dcd6; border-radius: 8px; }
.edit-view label { display: grid; gap: 7px; color: #47564d; font-size: 13px; font-weight: 800; }
.edit-view input, .edit-view select { min-width: 0; box-sizing: border-box; padding: 12px; border: 1px solid #bdc8c0; border-radius: 5px; font: inherit; }
.form-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.toggles { margin-top: 24px; display: grid; gap: 12px; }
.toggles label { grid-template-columns: 20px 1fr; align-items: center; }
.toggles input { width: 18px; height: 18px; accent-color: #176a43; }
.form-actions { margin-top: 28px; display: flex; justify-content: flex-end; gap: 10px; }
button:disabled { opacity: .55; cursor: default; }

@media (max-width: 720px) {
  .rz-header { padding: 14px 18px; }
  .printer-status { display: none; }
  .home-view, .preview-view, .manage-view, .edit-view { width: min(100% - 28px, 1080px); padding: 36px 0; }
  .primary-actions { grid-template-columns: 1fr; }
  .action-button { min-height: 128px; }
  .spec-strip { gap: 12px; justify-content: space-between; font-size: 12px; }
  .preview-heading, .manage-heading { align-items: stretch; flex-direction: column; }
  .queue-row { grid-template-columns: 24px 1fr 76px; gap: 8px; }
  .queue-name { grid-column: 2 / 4; }
  .queue-row label { grid-row: 2; }
  .queue-row label:nth-of-type(1) { grid-column: 2; }
  .queue-row label:nth-of-type(2) { grid-column: 3; }
  .queue-row label:nth-of-type(3) { grid-column: 3; grid-row: 3; }
  .product-row { padding-right: 8px; }
  .product-main { grid-template-columns: minmax(0, 1fr) 75px 16px; padding-left: 12px; }
  .active-button { min-width: 78px; padding: 8px 7px; font-size: 12px; }
  .form-grid { grid-template-columns: 1fr; }
}

@media (min-width: 721px) and (max-width: 980px) {
  .primary-actions { grid-template-columns: 1fr; }
}

@page { size: 55mm 50mm; margin: 0; }
@media print {
  :global(html), :global(body), .rz-page { width: 55mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
  .no-print { display: none !important; }
  .preview-view { width: auto; margin: 0; padding: 0; }
  .print-sheet { display: block; }
  .thermal-label { width: 55mm; height: 50mm; box-sizing: border-box; padding: 2.1mm 2.2mm 1.7mm; overflow: hidden; color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; break-after: page; page-break-after: always; }
  .label-product { min-height: 10mm; display: grid; grid-template-columns: 21mm 1fr; align-items: start; gap: 1mm; }
  .label-product b { padding-top: .5mm; font-family: Georgia, serif; font-size: 9pt; }
  .label-product strong { text-align: center; font-family: Georgia, serif; font-size: 9.5pt; line-height: 1.02; overflow-wrap: anywhere; }
  .label-rule { border-top: .25mm dotted #777; }
  .label-grid { padding: 1.1mm 0 .8mm; display: grid; grid-template-columns: 24mm 1fr; row-gap: .3mm; align-items: center; font-size: 8pt; line-height: 1.02; }
  .label-grid span { text-align: center; }
  .label-grid b { text-align: center; font-size: 8.2pt; overflow-wrap: anywhere; }
  .label-bottom { padding-top: 1mm; row-gap: .7mm; font-size: 9pt; }
  .label-bottom b { font-size: 9pt; }
}
</style>
