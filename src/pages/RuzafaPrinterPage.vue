<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { defaultRuzafaProducts } from '@/data/ruzafaProducts'
import { getRuzafaProducts, saveRuzafaPrintHistory, saveRuzafaProduct, saveRuzafaProducts } from '@/services/ruzafaProducts'

const products = ref([])
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const mode = ref('home')
const printTitle = ref('')
const printType = ref('standard')
const queue = ref([])
const search = ref('')
const homeSearch = ref('')
const selectedProduct = ref(null)
const expandedQueueId = ref(null)
const searchQueue = ref([])
const showPrinterReminder = ref(false)
const category = ref('Todos')
const editing = reactive({})
const editReturnMode = ref('manage')
const pendingProductIds = ref(new Set())
const creativeCanvas = ref(null)
const creativeElements = ref([])
const selectedCreativeId = ref(null)
const creativeFileInput = ref(null)
const creativeSymbols = ['★', '✓', '!', '+', '♥', '●', '▲', '☕']
let creativeCounter = 0
let draggingCreativeId = null

const categories = ['Todos', 'Congelados', 'Refrigerados', 'Elaborados', 'Secos']
const shelfLifeOptions = [
  { label: 'Caducidad primaria del envase', value: 'primaria' },
  ...[24, 48, 72, 96, 120, 144, 168].map(hours => ({ label: `${hours} horas`, value: `${hours} horas` })),
  ...[1, 2, 3, 4, 5, 6, 7, 10, 14, 15, 20, 30, 40, 60].map(days => ({ label: `${days} ${days === 1 ? 'día' : 'días'}`, value: `${days} ${days === 1 ? 'dia' : 'dias'}` })),
  ...[1, 2, 3, 6, 12].map(months => ({ label: `${months} ${months === 1 ? 'mes' : 'meses'}`, value: `${months} ${months === 1 ? 'mes' : 'meses'}` })),
]

const dateFromValue = value => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value)
  const text = String(value).trim()
  const spanishDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parts = spanishDate
    ? [spanishDate[3], spanishDate[2], spanishDate[1]]
    : isoDate
      ? [isoDate[1], isoDate[2], isoDate[3]]
      : null
  if (!parts) return null
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12)
  const isValid = date.getFullYear() === Number(parts[0])
    && date.getMonth() === Number(parts[1]) - 1
    && date.getDate() === Number(parts[2])
  return !Number.isNaN(date.getTime()) && isValid ? date : null
}

const toDateInputValue = value => {
  const date = dateFromValue(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeProduct = product => {
  const normalized = {
    audit: true,
    daily: false,
    bar: false,
    active: true,
    primaryExpiry: '',
    currentLot: '',
    barDaily: false,
    barWeekly: false,
    workshopDaily: false,
    workshopManual: false,
    produce: false,
    book: false,
    productCode: '',
    storage: 'Refrigeracion (+)',
    state: 'Abierto',
    ...product,
  }
  const legacyPrimaryDate = dateFromValue(normalized.shelfLife)
  if (!normalized.primaryExpiry && legacyPrimaryDate) {
    normalized.primaryExpiry = toDateInputValue(normalized.shelfLife)
    normalized.shelfLife = 'primaria'
  }
  return normalized
}

onMounted(async () => {
  const reminderKey = 'ruzafa-printer-reminder-dismissed-at'
  const lastReminder = Number(window.localStorage.getItem(reminderKey) || 0)
  showPrinterReminder.value = Date.now() - lastReminder >= 6 * 60 * 60 * 1000
  try {
    creativeElements.value = JSON.parse(window.localStorage.getItem('ruzafa-creative-label') || '[]')
    creativeCounter = creativeElements.value.length
  } catch (error) {
    creativeElements.value = []
  }
  window.addEventListener('paste', handleCreativePaste)
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

const globalSearchResults = computed(() => {
  const term = homeSearch.value.trim().toLocaleLowerCase('es')
  if (!term) return []
  return products.value
    .filter(product => product.active && product.name.toLocaleLowerCase('es').includes(term))
    .slice(0, 8)
})

const pendingCount = computed(() => pendingProductIds.value.size)

const updateHomeSearch = event => {
  homeSearch.value = event.target.value
  selectedProduct.value = null
}

const updateManageSearch = event => {
  search.value = event.target.value
}

const dismissPrinterReminder = () => {
  window.localStorage.setItem('ruzafa-printer-reminder-dismissed-at', String(Date.now()))
  showPrinterReminder.value = false
}

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

const prepareQueue = (source, title, type = 'standard') => {
  const now = new Date()
  queue.value = source.map((product, index) => {
    const primaryDate = dateFromValue(product.primaryExpiry)
    return {
      ...product,
      selected: true,
      quantity: 1,
      printedAt: now,
      expiry: primaryDate || addShelfLife(now, product.shelfLife),
      manualExpiry: product.primaryExpiry || '',
      lot: product.currentLot || makeLot(now, index),
    }
  })
  printTitle.value = title
  printType.value = type
  mode.value = 'preview'
  selectedProduct.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const makeLot = (date, index) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const suffix = String(index + 1).padStart(3, '0')
  return `${day}${month}${suffix}`
}

const createQueue = type => {
  const source = products.value.filter(product => product.active && product[type])
  const titles = {
    audit: 'Impresion para auditoria',
    barDaily: 'Impresion diaria de barra',
    barWeekly: 'Impresion semanal de barra',
    workshopDaily: 'Impresion diaria de obrador',
    workshopManual: 'Impresion de obrador',
    produce: 'Recepcion de fruta y verdura',
    book: 'Etiquetas libro',
  }
  prepareQueue(source, titles[type] || 'Impresion de etiquetas', type)
}

const selectGlobalProduct = product => {
  if (!product) return
  selectedProduct.value = product
  homeSearch.value = product.name
}

const addSelectedToQueue = () => {
  const product = selectedProduct.value
  if (!product) return
  if (!searchQueue.value.some(item => item.id === product.id)) searchQueue.value.push(product)
  message.value = `${product.name} agregado a la cola.`
  selectedProduct.value = null
  homeSearch.value = ''
}

const removeFromSearchQueue = productId => {
  searchQueue.value = searchQueue.value.filter(product => product.id !== productId)
}

const openSearchQueue = () => {
  if (!searchQueue.value.length) return
  prepareQueue(searchQueue.value, 'Cola de impresion')
  searchQueue.value = []
}

const printableLabels = computed(() => queue.value.flatMap(item => {
  if (!item.selected) return []
  return Array.from({ length: Math.max(1, Number(item.quantity) || 1) }, () => item)
}))

const bookPages = computed(() => {
  if (printType.value !== 'book') return []
  const pages = []
  for (let index = 0; index < printableLabels.value.length; index += 2) {
    pages.push(printableLabels.value.slice(index, index + 2))
  }
  return pages
})

onUnmounted(() => window.removeEventListener('paste', handleCreativePaste))

watch(creativeElements, value => {
  try {
    window.localStorage.setItem('ruzafa-creative-label', JSON.stringify(value))
  } catch (error) {
    message.value = 'El diseño funciona, pero la imagen es demasiado grande para guardarla en este dispositivo.'
  }
}, { deep: true })

const selectedCreativeElement = computed(() => creativeElements.value.find(item => item.id === selectedCreativeId.value) || null)

const creativeElementStyle = item => ({
  left: `${item.x}%`,
  top: `${item.y}%`,
  width: item.type === 'image' ? `${item.width}%` : `${item.width || 90}%`,
  fontSize: item.type === 'text' ? `${item.fontSize}mm` : undefined,
  fontWeight: item.bold ? '800' : '400',
  textAlign: item.align || 'center',
})

const addCreativeText = () => {
  const item = { id: `creative-${++creativeCounter}`, type: 'text', text: 'Nuevo texto', x: 50, y: 30, width: 90, fontSize: 4, bold: false, align: 'center' }
  creativeElements.value.push(item)
  selectedCreativeId.value = item.id
}

const addCreativeSymbol = symbol => {
  const item = { id: `creative-${++creativeCounter}`, type: 'text', text: symbol, x: 50, y: 50, width: 30, fontSize: 8, bold: true, align: 'center' }
  creativeElements.value.push(item)
  selectedCreativeId.value = item.id
}

const addCreativeImage = source => {
  const item = { id: `creative-${++creativeCounter}`, type: 'image', source, x: 50, y: 50, width: 35 }
  creativeElements.value.push(item)
  selectedCreativeId.value = item.id
}

const readCreativeImage = file => {
  if (!file?.type?.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = event => addCreativeImage(event.target.result)
  reader.readAsDataURL(file)
}

const uploadCreativeImage = event => {
  readCreativeImage(event.target.files?.[0])
  event.target.value = ''
}

function handleCreativePaste(event) {
  if (mode.value !== 'creative') return
  const image = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))
  if (image) {
    event.preventDefault()
    readCreativeImage(image.getAsFile())
  }
}

const startCreativeDrag = (event, item) => {
  draggingCreativeId = item.id
  selectedCreativeId.value = item.id
  event.currentTarget.setPointerCapture?.(event.pointerId)
  moveCreativeElement(event)
}

const moveCreativeElement = event => {
  if (!draggingCreativeId || !creativeCanvas.value) return
  const item = creativeElements.value.find(candidate => candidate.id === draggingCreativeId)
  if (!item) return
  const rect = creativeCanvas.value.getBoundingClientRect()
  item.x = Math.min(98, Math.max(2, ((event.clientX - rect.left) / rect.width) * 100))
  item.y = Math.min(98, Math.max(2, ((event.clientY - rect.top) / rect.height) * 100))
}

const stopCreativeDrag = () => { draggingCreativeId = null }

const centerCreativeElement = () => {
  if (!selectedCreativeElement.value) return
  selectedCreativeElement.value.x = 50
  selectedCreativeElement.value.y = 50
}

const removeCreativeElement = () => {
  creativeElements.value = creativeElements.value.filter(item => item.id !== selectedCreativeId.value)
  selectedCreativeId.value = null
}

const clearCreativeCanvas = () => {
  creativeElements.value = []
  selectedCreativeId.value = null
}

const printCreativeLabel = () => {
  if (!creativeElements.value.length) {
    message.value = 'Agrega texto, un símbolo o una imagen antes de imprimir.'
    return
  }
  window.print()
}

const expiryText = item => {
  if (item.manualExpiry) return formatDate(new Date(`${item.manualExpiry}T12:00:00`))
  return item.expiry ? formatDate(item.expiry) : 'INDICAR FECHA'
}

const primaryExpiryText = item => {
  if (!isPrimaryProduct(item)) return ''
  const value = item.manualExpiry || item.primaryExpiry
  const date = dateFromValue(value)
  return date ? formatDate(date) : ''
}

const printLabels = async () => {
  if (!printableLabels.value.length) {
    message.value = 'Selecciona al menos una etiqueta.'
    return
  }
  const labels = printableLabels.value.map(item => ({
    productId: item.id,
    productName: item.name,
    lot: item.lot,
    expiry: item.manualExpiry || toDateInputValue(item.expiry),
    printedAt: new Date().toISOString(),
  }))
  try {
    await saveRuzafaPrintHistory(labels)
  } catch (error) {
    message.value = 'La etiqueta se imprimira, pero no se pudo guardar el historial.'
  }
  window.print()
}

const printedDateLabel = item => item.category === 'Congelados' ? 'Inicio Descong.' : 'Fecha Impresión'
const printedState = item => item.category === 'Congelados' ? 'Descongelación + uso' : item.state

const isPrimaryProduct = item => Boolean(item.primaryExpiry) || String(item.shelfLife).toLowerCase().includes('primaria')
const usesPrimaryExpiry = item => printType.value === 'book' || isPrimaryProduct(item)

const toggleQueueEditor = item => {
  if (expandedQueueId.value === item.id) {
    expandedQueueId.value = null
    return
  }
  if (!item.manualExpiry && item.expiry) item.manualExpiry = toDateInputValue(item.expiry)
  expandedQueueId.value = item.id
}

const saveQueueProduct = async item => {
  saving.value = true
  try {
    const product = products.value.find(candidate => candidate.id === item.id)
    if (!product) return
    const updated = normalizeProduct({
      ...product,
      currentLot: item.lot || '',
      productCode: item.productCode || '',
      primaryExpiry: usesPrimaryExpiry(item) ? item.manualExpiry || product.primaryExpiry || '' : product.primaryExpiry || '',
    })
    await saveRuzafaProduct(updated)
    products.value[products.value.findIndex(candidate => candidate.id === item.id)] = updated
    item.currentLot = updated.currentLot
    item.primaryExpiry = updated.primaryExpiry
    message.value = `${usesPrimaryExpiry(item) ? 'Lote y fecha' : 'Lote'} de ${item.name} guardado para todos.`
    expandedQueueId.value = null
  } catch (error) {
    message.value = 'No se pudo guardar en Firebase. Puedes imprimir usando estos datos solo esta vez.'
  } finally {
    saving.value = false
  }
}

const editProduct = product => {
  Object.keys(editing).forEach(key => delete editing[key])
  Object.assign(editing, JSON.parse(JSON.stringify(product)))
  editing._isNew = false
  editReturnMode.value = mode.value === 'home' ? 'home' : 'manage'
  mode.value = 'edit'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const applyCategoryDefaults = () => {
  editing.storage = editing.category === 'Secos' ? 'Temperatura ambiente' : 'Refrigeracion (+)'
  editing.state = editing.category === 'Elaborados' ? 'Preparacion' : 'Abierto'
}

const createProduct = () => {
  const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  Object.keys(editing).forEach(key => delete editing[key])
  Object.assign(editing, normalizeProduct({
    id: `rz-custom-${uniqueId}`,
    name: '',
    category: 'Refrigerados',
    shelfLife: '24 horas',
    storage: 'Refrigeracion (+)',
    state: 'Abierto',
    audit: true,
    active: true,
  }), { _isNew: true })
  editReturnMode.value = 'home'
  mode.value = 'edit'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const saveProduct = async () => {
  saving.value = true
  message.value = ''
  try {
    if (editing.primaryExpiry && dateFromValue(editing.shelfLife)) editing.shelfLife = 'primaria'
    const productToSave = { ...editing }
    const isNew = Boolean(productToSave._isNew)
    delete productToSave._isNew
    await saveRuzafaProduct(productToSave)
    const normalized = normalizeProduct(productToSave)
    const index = products.value.findIndex(product => product.id === normalized.id)
    if (index >= 0) products.value[index] = normalized
    else products.value.push(normalized)
    message.value = isNew ? 'Producto creado y guardado para todos los dispositivos.' : 'Producto actualizado para todos los dispositivos.'
    mode.value = editReturnMode.value
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
  if (!product.active || !['audit', 'barDaily', 'barWeekly', 'workshopDaily', 'workshopManual', 'produce', 'book'].includes(field)) return
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
  selectedProduct.value = null
}
</script>

<template>
  <main class="rz-page">
    <div v-if="showPrinterReminder" class="reminder-backdrop no-print" role="presentation">
      <section class="printer-reminder" role="dialog" aria-modal="true" aria-labelledby="printer-reminder-title">
        <span class="reminder-icon" aria-hidden="true">!</span>
        <div>
          <p class="eyebrow">Antes de imprimir</p>
          <h2 id="printer-reminder-title">Revisa que la impresora esté encendida</h2>
          <p>Comprueba la luz de encendido de la impresora antes de preparar las etiquetas. Así evitamos envíos fallidos y esperas innecesarias.</p>
        </div>
        <button class="print-button" type="button" autofocus @click="dismissPrinterReminder">La impresora está encendida</button>
      </section>
    </div>

    <header class="rz-header no-print">
      <button v-if="mode !== 'home'" class="back-button" type="button" aria-label="Volver" @click="goHome">
        <span aria-hidden="true">←</span>
      </button>
      <div>
        <p class="location">Ruzafa · Etiquetado interno</p>
        <h1>Impresora de etiquetas</h1>
      </div>
      <div class="header-actions">
        <button class="creative-entry-button" type="button" @click="mode = 'creative'">Impresión creativa</button>
        <div class="printer-status"><span></span> Seleccionar TD-4550 al imprimir</div>
      </div>
    </header>

    <p v-if="message" class="notice no-print">{{ message }}</p>

    <section v-if="loading" class="loading-state no-print">Cargando productos...</section>

    <section v-else-if="mode === 'home'" class="home-view no-print">
      <div class="intro">
        <p class="eyebrow">Selecciona una tarea</p>
        <h2>¿Qué etiquetas necesitas hoy?</h2>
        <p>Las fechas se calculan automáticamente usando la tabla de caducidades.</p>
      </div>

      <div class="global-product-search">
        <div class="search-title-row">
          <label for="rz-global-search">Buscar un producto</label>
          <button class="add-product-button" type="button" title="Agregar producto" aria-label="Agregar producto" @click="createProduct">+</button>
        </div>
        <div class="global-search-field">
          <input
            id="rz-global-search"
            v-model="homeSearch"
            type="text"
            inputmode="search"
            autocomplete="off"
            placeholder="Ej.: sirope de vainilla"
            @input="updateHomeSearch"
          >
          <button v-if="homeSearch" type="button" aria-label="Limpiar busqueda" @click="homeSearch = ''; selectedProduct = null">&times;</button>
        </div>
        <div v-if="globalSearchResults.length && !selectedProduct" class="global-results">
          <button v-for="product in globalSearchResults" :key="product.id" type="button" @click="selectGlobalProduct(product)">
            <span><strong>{{ product.name }}</strong><small>{{ product.category }}</small></span>
            <span>{{ product.primaryExpiry ? formatDate(dateFromValue(product.primaryExpiry)) : product.shelfLife }}</span>
          </button>
        </div>
        <p v-else-if="homeSearch.trim().length >= 1 && !selectedProduct" class="empty-search">No hay productos activos con ese nombre.</p>
        <div v-if="selectedProduct" class="quick-product-panel">
          <div>
            <strong>{{ selectedProduct.name }}</strong>
            <small>{{ selectedProduct.category }} · {{ selectedProduct.primaryExpiry ? `Caducidad primaria: ${formatDate(dateFromValue(selectedProduct.primaryExpiry))}` : selectedProduct.shelfLife }}</small>
          </div>
          <div class="quick-product-actions">
            <button class="print-button" type="button" @click="addSelectedToQueue">Agregar a la cola</button>
            <button class="secondary-button" type="button" @click="editProduct(selectedProduct)">Modificar producto</button>
          </div>
        </div>
      </div>

      <section v-if="searchQueue.length" class="search-queue">
        <div class="search-queue-heading">
          <div><p class="eyebrow">Cola manual</p><strong>{{ searchQueue.length }} producto(s) preparados</strong></div>
          <button class="print-button" type="button" @click="openSearchQueue">Revisar e imprimir cola</button>
        </div>
        <div class="search-queue-items">
          <span v-for="product in searchQueue" :key="product.id">
            {{ product.name }}
            <button type="button" :aria-label="`Quitar ${product.name}`" @click="removeFromSearchQueue(product.id)">&times;</button>
          </span>
        </div>
      </section>

      <div class="primary-actions">
        <button class="action-button audit" type="button" @click="createQueue('audit')">
          <span class="action-icon" aria-hidden="true">A</span>
          <span><strong>Imprimir para auditoría</strong><small>Todos los productos activos</small></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
        <button class="action-button daily" type="button" @click="createQueue('barDaily')">
          <span class="action-icon" aria-hidden="true">BD</span>
          <span><strong>Barra diaria</strong><small>Leches, bebidas y productos diarios</small></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
        <button class="action-button bar" type="button" @click="createQueue('barWeekly')">
          <span class="action-icon" aria-hidden="true">BS</span>
          <span><strong>Barra semanal</strong><small>Siropes, canela, cacao y toppings</small></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
        <button class="action-button workshop" type="button" @click="createQueue('workshopDaily')">
          <span class="action-icon" aria-hidden="true">OD</span>
          <span><strong>Obrador diario</strong><small>Elaboraciones que se renuevan cada dia</small></span>
          <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
        <button class="action-button workshop-manual" type="button" @click="createQueue('workshopManual')">
          <span class="action-icon" aria-hidden="true">OM</span>
          <span><strong>Obrador</strong><small>Productos que se etiquetan cuando se utilizan</small></span>
          <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
        <button class="action-button produce" type="button" @click="createQueue('produce')">
          <span class="action-icon" aria-hidden="true">FV</span>
          <span><strong>Fruta y verdura</strong><small>Etiquetas para recepcion de producto</small></span>
          <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
        <button class="action-button book" type="button" @click="createQueue('book')">
          <span class="action-icon" aria-hidden="true">L</span>
          <span><strong>Etiquetas libro</strong><small>Productos congelados del libro</small></span>
          <span class="arrow" aria-hidden="true">&rarr;</span>
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

    <section v-else-if="mode === 'creative'" class="creative-view">
      <div class="creative-heading no-print">
        <div>
          <p class="eyebrow">Diseño libre · 55 × 50 mm</p>
          <h2>Impresión creativa</h2>
          <p>Agrega elementos, tócalos y arrástralos directamente sobre la etiqueta.</p>
        </div>
        <button class="print-button" type="button" @click="printCreativeLabel">Imprimir diseño</button>
      </div>

      <div class="creative-workspace no-print">
        <aside class="creative-toolbar" aria-label="Herramientas del lienzo">
          <div class="creative-add-actions">
            <button type="button" @click="addCreativeText"><span aria-hidden="true">T</span> Texto</button>
            <button type="button" @click="creativeFileInput?.click()"><span aria-hidden="true">▧</span> Imagen</button>
            <input ref="creativeFileInput" class="visually-hidden" type="file" accept="image/*" @change="uploadCreativeImage">
          </div>

          <div class="creative-symbols">
            <p>Símbolos</p>
            <button v-for="symbol in creativeSymbols" :key="symbol" type="button" :title="`Agregar ${symbol}`" @click="addCreativeSymbol(symbol)">{{ symbol }}</button>
          </div>

          <div v-if="selectedCreativeElement" class="creative-properties">
            <p>Elemento seleccionado</p>
            <label v-if="selectedCreativeElement.type === 'text'">Texto
              <textarea v-model="selectedCreativeElement.text" rows="3"></textarea>
            </label>
            <label v-if="selectedCreativeElement.type === 'text'">Tamaño
              <input v-model.number="selectedCreativeElement.fontSize" type="range" min="2" max="12" step="0.5">
            </label>
            <label v-else>Ancho
              <input v-model.number="selectedCreativeElement.width" type="range" min="10" max="95" step="1">
            </label>
            <div v-if="selectedCreativeElement.type === 'text'" class="creative-format-actions">
              <button type="button" :class="{ active: selectedCreativeElement.bold }" title="Negrita" @click="selectedCreativeElement.bold = !selectedCreativeElement.bold"><b>B</b></button>
              <button type="button" title="Alinear a la izquierda" @click="selectedCreativeElement.align = 'left'">≡</button>
              <button type="button" title="Centrar texto" @click="selectedCreativeElement.align = 'center'">≣</button>
              <button type="button" title="Alinear a la derecha" @click="selectedCreativeElement.align = 'right'">≡</button>
            </div>
            <div class="creative-selection-actions">
              <button class="secondary-button" type="button" @click="centerCreativeElement">Centrar</button>
              <button class="danger-button" type="button" @click="removeCreativeElement">Eliminar</button>
            </div>
          </div>

          <div class="creative-help">
            También puedes copiar una imagen y pegarla aquí. El diseño se guarda automáticamente en este dispositivo.
          </div>
          <button class="clear-canvas-button" type="button" @click="clearCreativeCanvas">Limpiar lienzo</button>
        </aside>

        <div class="creative-stage">
          <div
            ref="creativeCanvas"
            class="creative-canvas"
            @pointermove="moveCreativeElement"
            @pointerup="stopCreativeDrag"
            @pointercancel="stopCreativeDrag"
            @pointerleave="stopCreativeDrag"
            @click.self="selectedCreativeId = null"
          >
            <div
              v-for="item in creativeElements"
              :key="item.id"
              class="creative-element"
              :class="[{ selected: selectedCreativeId === item.id }, `creative-${item.type}`]"
              :style="creativeElementStyle(item)"
              @pointerdown.prevent="startCreativeDrag($event, item)"
            >
              <span v-if="item.type === 'text'">{{ item.text }}</span>
              <img v-else :src="item.source" alt="">
            </div>
            <p v-if="!creativeElements.length" class="creative-empty">Agrega texto, símbolos o imágenes</p>
          </div>
          <div class="creative-ruler"><span>55 mm</span><span>50 mm de alto</span></div>
        </div>
      </div>

      <div class="creative-print-sheet" aria-label="Diseño creativo para imprimir">
        <div v-for="item in creativeElements" :key="`print-${item.id}`" class="creative-element" :class="`creative-${item.type}`" :style="creativeElementStyle(item)">
          <span v-if="item.type === 'text'">{{ item.text }}</span>
          <img v-else :src="item.source" alt="">
        </div>
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
        <p v-if="!queue.length" class="empty-queue">Todavía no hay productos en este grupo. Puedes asignarlos desde Gestionar productos.</p>
        <div v-for="item in queue" :key="item.id" class="queue-row" :class="{ 'book-queue-row': printType === 'book' }">
          <input v-model="item.selected" type="checkbox" :aria-label="`Incluir ${item.name}`">
          <button class="queue-name" type="button" @click="toggleQueueEditor(item)"><strong>{{ item.name }}</strong><small>{{ item.shelfLife }} · Tocar para editar</small></button>
          <label>Caducidad
            <input v-if="expandedQueueId === item.id || !item.expiry || usesPrimaryExpiry(item)" v-model="item.manualExpiry" type="date">
            <span v-else>{{ expiryText(item) }}</span>
          </label>
          <label>Lote<input v-model="item.lot" type="text" inputmode="numeric"></label>
          <label v-if="printType === 'book'">Código<input v-model.trim="item.productCode" type="text"></label>
          <label>Cantidad<input v-model.number="item.quantity" type="number" min="1" max="99"></label>
          <div v-if="expandedQueueId === item.id" class="queue-quick-edit">
            <p>Los datos de arriba sirven para esta impresion. Tambien puedes guardarlos para las proximas.</p>
            <button class="secondary-button" type="button" @click="expandedQueueId = null">Usar solo esta vez</button>
            <button class="print-button" type="button" :disabled="saving" @click="saveQueueProduct(item)">{{ saving ? 'Guardando...' : usesPrimaryExpiry(item) ? 'Guardar lote y fecha' : 'Guardar lote actual' }}</button>
          </div>
        </div>
      </div>

      <div class="print-sheet" aria-label="Etiquetas para imprimir">
        <template v-if="printType === 'book'">
          <article v-for="(page, pageIndex) in bookPages" :key="`book-${pageIndex}`" class="book-label-page">
            <section v-for="(item, itemIndex) in page" :key="`${item.id}-${itemIndex}`" class="book-label">
              <strong class="book-product">{{ item.name }}</strong>
              <div class="book-label-grid">
                <span>Código</span><b>{{ item.productCode || '—' }}</b>
                <span>Lote</span><b>{{ item.lot || '—' }}</b>
                <span>Caducidad primaria</span><b>{{ expiryText(item) }}</b>
                <span>Temperatura</span><b>{{ item.storage }}</b>
              </div>
            </section>
          </article>
        </template>
        <template v-else>
        <article v-for="(item, index) in printableLabels" :key="`${item.id}-${index}`" class="thermal-label">
          <div class="label-product"><b>PRODUCTO</b><strong>{{ item.name }}</strong></div>
          <div class="label-rule"></div>
          <div class="label-grid">
            <span>{{ printedDateLabel(item) }}</span><b>{{ formatDate(item.printedAt) }}<br>{{ formatTime(item.printedAt) }}</b>
            <span>Caducidad<br>Primaria</span><b>{{ primaryExpiryText(item) }}</b>
            <span>Caducidad</span><b>{{ expiryText(item) }}</b>
            <span>Almacenamiento</span><b>{{ item.storage }}</b>
          </div>
          <div class="label-rule"></div>
          <div class="label-grid label-bottom">
            <span>Lote</span><b>{{ item.lot }}</b>
            <span>Estado</span><b>{{ printedState(item) }}</b>
          </div>
        </article>
        </template>
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
        <input v-model="search" type="text" inputmode="search" placeholder="Buscar producto..." aria-label="Buscar producto" @input="updateManageSearch">
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
              :class="{ on: product.barDaily }"
              :disabled="!product.active"
              :title="product.barDaily ? 'Quitar de barra diaria' : 'Incluir en barra diaria'"
              @click="togglePrintGroup(product, 'barDaily')"
            >BD</button>
            <button
              type="button"
              :class="{ on: product.barWeekly }"
              :disabled="!product.active"
              :title="product.barWeekly ? 'Quitar de barra semanal' : 'Incluir en barra semanal'"
              @click="togglePrintGroup(product, 'barWeekly')"
            >BS</button>
            <button type="button" :class="{ on: product.workshopDaily }" :disabled="!product.active" title="Obrador diario" @click="togglePrintGroup(product, 'workshopDaily')">OD</button>
            <button type="button" :class="{ on: product.workshopManual }" :disabled="!product.active" title="Obrador manual" @click="togglePrintGroup(product, 'workshopManual')">OM</button>
            <button type="button" :class="{ on: product.produce }" :disabled="!product.active" title="Fruta y verdura" @click="togglePrintGroup(product, 'produce')">FV</button>
            <button type="button" :class="{ on: product.book }" :disabled="!product.active" title="Etiquetas libro" @click="togglePrintGroup(product, 'book')">L</button>
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
      <p class="eyebrow">{{ editing._isNew ? 'Nuevo producto' : 'Editar producto' }}</p>
      <h2>{{ editing._isNew ? 'Agregar producto' : editing.name }}</h2>
      <form @submit.prevent="saveProduct">
        <label>Nombre<input v-model.trim="editing.name" required></label>
        <div class="form-grid">
          <label>Caducidad
            <select v-model="editing.shelfLife" required>
              <option v-for="option in shelfLifeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label>Fecha de caducidad primaria<input v-model="editing.primaryExpiry" type="date"></label>
          <label>Código del producto (opcional)<input v-model.trim="editing.productCode"></label>
          <label>Lote actual (opcional)<input v-model.trim="editing.currentLot" placeholder="Se genera uno si se deja vacio"></label>
          <label>Categoría<select v-model="editing.category" @change="applyCategoryDefaults"><option v-for="item in categories.slice(1)" :key="item">{{ item }}</option></select></label>
          <label>Almacenamiento<input v-model.trim="editing.storage" required></label>
          <label>Estado<input v-model.trim="editing.state" required></label>
        </div>
        <div class="toggles">
          <label><input v-model="editing.active" type="checkbox"> Producto activo</label>
          <label><input v-model="editing.audit" type="checkbox"> Incluir en auditoría</label>
          <label><input v-model="editing.barDaily" type="checkbox"> Barra diaria</label>
          <label><input v-model="editing.barWeekly" type="checkbox"> Barra semanal</label>
          <label><input v-model="editing.workshopDaily" type="checkbox"> Obrador diario</label>
          <label><input v-model="editing.workshopManual" type="checkbox"> Obrador manual</label>
          <label><input v-model="editing.produce" type="checkbox"> Fruta y verdura</label>
          <label><input v-model="editing.book" type="checkbox"> Etiquetas libro</label>
        </div>
        <div class="form-actions">
          <button class="secondary-button" type="button" @click="mode = editReturnMode">Cancelar</button>
          <button class="print-button" type="submit" :disabled="saving">{{ saving ? 'Guardando...' : editing._isNew ? 'Crear producto' : 'Guardar cambios' }}</button>
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
.header-actions { margin-left: auto; display: flex; align-items: center; gap: 9px; }
.creative-entry-button { min-height: 38px; padding: 0 14px; color: #17382a; background: #fff; border: 1px solid #b8d2c3; border-radius: 6px; font-weight: 800; cursor: pointer; }
.printer-status { padding: 9px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; background: #244d3b; border: 1px solid #3b6954; border-radius: 6px; }
.printer-status span { width: 8px; height: 8px; border-radius: 50%; background: #f0c653; box-shadow: 0 0 0 3px rgba(240,198,83,.14); }
.back-button { width: 42px; height: 42px; color: white; border: 1px solid #547465; border-radius: 6px; background: transparent; font-size: 25px; cursor: pointer; }
.reminder-backdrop { position: fixed; z-index: 50; inset: 0; padding: 18px; display: grid; place-items: center; background: rgba(13, 26, 19, .58); backdrop-filter: blur(4px); }
.printer-reminder { width: min(520px, 100%); box-sizing: border-box; padding: 26px; display: grid; grid-template-columns: 54px 1fr; gap: 18px; color: #17211a; background: white; border: 1px solid #c9d4cc; border-radius: 8px; box-shadow: 0 24px 70px rgba(6, 24, 14, .3); }
.reminder-icon { width: 50px; height: 50px; display: grid; place-items: center; color: #382900; background: #f0c653; border-radius: 50%; font-size: 25px; font-weight: 900; }
.printer-reminder h2 { margin-top: 5px; font-size: 27px; }
.printer-reminder p:last-child { margin: 0; color: #59675e; line-height: 1.5; }
.printer-reminder > button { grid-column: 2; justify-self: start; }
.notice { max-width: 1080px; margin: 18px auto 0; padding: 12px 16px; color: #643f00; background: #fff4d5; border: 1px solid #ead18a; border-radius: 6px; }
.loading-state { padding: 15vh 20px; text-align: center; font-weight: 700; }
.home-view, .preview-view, .manage-view, .edit-view, .creative-view { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 30px 0; }
.intro { max-width: 640px; }
.eyebrow { color: #35704f; }
h2 { margin: 8px 0 10px; font-size: clamp(28px, 4vw, 44px); line-height: 1.08; }
.intro > p:last-child, .preview-heading p { color: #5a675e; font-size: 17px; }
.global-product-search { position: relative; margin-top: 20px; padding: 15px; background: white; border: 1px solid #cbd4ce; border-radius: 8px; }
.search-title-row { margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.search-title-row label { color: #315440; font-size: 13px; font-weight: 800; }
.add-product-button { width: 38px; height: 38px; display: grid; place-items: center; color: white; background: #176a43; border: 1px solid #176a43; border-radius: 6px; font-size: 26px; line-height: 1; cursor: pointer; }
.global-search-field { position: relative; }
.global-search-field input { width: 100%; box-sizing: border-box; padding: 14px 46px 14px 15px; border: 1px solid #aebdb3; border-radius: 6px; font: inherit; font-size: 16px; }
.global-search-field button { position: absolute; top: 50%; right: 7px; width: 34px; height: 34px; transform: translateY(-50%); color: #53635a; background: transparent; border: 0; font-size: 25px; cursor: pointer; }
.global-results { position: absolute; z-index: 4; top: calc(100% - 17px); right: 20px; left: 20px; overflow: hidden; background: white; border: 1px solid #bdc9c1; border-radius: 0 0 7px 7px; box-shadow: 0 12px 25px rgba(23,60,43,.15); }
.global-results button { width: 100%; min-height: 58px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 16px; color: inherit; text-align: left; background: white; border: 0; border-bottom: 1px solid #e5eae6; cursor: pointer; }
.global-results button:hover { background: #f3f8f5; }
.global-results button:last-child { border-bottom: 0; }
.global-results small, .quick-product-panel small { display: block; margin-top: 3px; color: #718078; }
.empty-search { margin: 10px 0 0; color: #6a756e; font-size: 14px; }
.quick-product-panel { margin-top: 14px; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; gap: 18px; border-top: 1px solid #e0e6e2; }
.quick-product-actions { display: flex; gap: 9px; }
.search-queue { margin-top: 14px; padding: 14px 15px; background: #eaf4ee; border: 1px solid #b8d1c1; border-radius: 8px; }
.search-queue-heading { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.search-queue-items { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 7px; }
.search-queue-items > span { min-width: 0; padding: 6px 6px 6px 10px; display: inline-flex; align-items: center; gap: 7px; color: #234331; background: white; border: 1px solid #c5d8ca; border-radius: 6px; font-size: 13px; }
.search-queue-items button { width: 25px; height: 25px; padding: 0; color: #6b3832; background: #fff2f0; border: 0; border-radius: 4px; font-size: 18px; cursor: pointer; }
.primary-actions { margin-top: 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.action-button { min-height: 104px; padding: 15px; display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 12px; text-align: left; border: 0; border-radius: 8px; cursor: pointer; box-shadow: 0 7px 20px rgba(23,60,43,.1); transition: transform .18s ease, box-shadow .18s ease; }
.action-button:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(23,60,43,.16); }
.action-button.audit { color: white; background: #206644; }
.action-button.daily { color: #17211a; background: #f0c653; }
.action-button.bar { color: white; background: #285777; }
.action-button.workshop { color: white; background: #7a4937; }
.action-button.workshop-manual { color: #17211a; background: #d9b98c; }
.action-button.produce { color: white; background: #52733d; }
.action-button.book { color: white; background: #5b477d; }
.action-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; font-size: 16px; font-weight: 900; background: rgba(255,255,255,.18); }
.action-button strong { display: block; font-size: 17px; line-height: 1.18; }
.action-button small { display: block; margin-top: 5px; font-size: 12px; line-height: 1.3; opacity: .82; }
.arrow { font-size: 21px; }
.manage-button { width: 100%; margin-top: 18px; padding: 17px; color: #274234; background: #fff; border: 1px solid #cbd4ce; border-radius: 7px; font-weight: 800; cursor: pointer; }
.spec-strip { margin-top: 30px; padding-top: 22px; display: flex; gap: 34px; color: #5d6b62; border-top: 1px solid #d7ddd9; font-size: 14px; }
.spec-strip strong { color: #1d2d23; }
.preview-heading, .manage-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 28px; }
.print-button, .secondary-button { min-height: 46px; padding: 0 20px; border-radius: 6px; font-weight: 800; cursor: pointer; }
.print-button { color: white; background: #176a43; border: 1px solid #176a43; }
.secondary-button { color: #274234; background: white; border: 1px solid #bdc9c1; }
.queue-table { overflow: hidden; background: white; border: 1px solid #d4dbd6; border-radius: 7px; }
.empty-queue { margin: 0; padding: 28px 18px; color: #66736b; text-align: center; }
.queue-row { min-height: 68px; padding: 10px 16px; display: grid; grid-template-columns: 28px minmax(180px, 1fr) 150px 118px 90px; align-items: center; gap: 14px; border-bottom: 1px solid #e5e9e6; }
.queue-row.book-queue-row { grid-template-columns: 28px minmax(180px, 1fr) 150px 118px 118px 90px; }
.queue-row:last-child { border-bottom: 0; }
.queue-row input[type="checkbox"] { width: 19px; height: 19px; accent-color: #176a43; }
.queue-name { padding: 6px 0; color: inherit; text-align: left; background: transparent; border: 0; cursor: pointer; }
.queue-name small, .product-row small { display: block; margin-top: 4px; color: #77827b; }
.queue-row label { color: #738077; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.queue-row label span { display: block; margin-top: 5px; color: #17211a; font-size: 14px; }
.queue-row input[type="text"], .queue-row input[type="number"], .queue-row input[type="date"] { width: 100%; box-sizing: border-box; margin-top: 4px; padding: 8px; border: 1px solid #cbd4ce; border-radius: 4px; }
.queue-quick-edit { grid-column: 2 / -1; padding: 12px; display: flex; align-items: center; justify-content: flex-end; gap: 9px; background: #f3f7f4; border-top: 1px solid #dfe7e1; }
.queue-quick-edit p { margin: 0 auto 0 0; color: #59675e; font-size: 13px; }
.print-sheet { display: none; }
.creative-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 22px; }
.creative-heading h2 { margin: 4px 0; font-size: 32px; }
.creative-heading p:last-child { margin: 0; color: #647168; }
.creative-workspace { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 24px; align-items: start; }
.creative-toolbar { padding: 16px; display: grid; gap: 18px; background: #fff; border: 1px solid #d1dad4; border-radius: 8px; }
.creative-add-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.creative-add-actions button, .creative-symbols button, .creative-format-actions button { min-height: 40px; color: #263b30; background: #f3f7f4; border: 1px solid #c8d4cc; border-radius: 5px; font-weight: 800; cursor: pointer; }
.creative-add-actions button { display: flex; align-items: center; justify-content: center; gap: 7px; }
.creative-add-actions span { font-size: 18px; }
.creative-symbols p, .creative-properties > p { margin: 0 0 8px; color: #405247; font-size: 12px; font-weight: 900; text-transform: uppercase; }
.creative-symbols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.creative-symbols p { grid-column: 1 / -1; }
.creative-symbols button { padding: 0; font-size: 18px; }
.creative-properties { padding-top: 15px; display: grid; gap: 12px; border-top: 1px solid #e0e6e2; }
.creative-properties label { display: grid; gap: 6px; color: #526259; font-size: 12px; font-weight: 800; }
.creative-properties textarea { box-sizing: border-box; width: 100%; padding: 9px; resize: vertical; border: 1px solid #bdc9c1; border-radius: 5px; font: inherit; }
.creative-properties input[type="range"] { width: 100%; accent-color: #176a43; }
.creative-format-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.creative-format-actions button.active { color: #fff; background: #176a43; border-color: #176a43; }
.creative-selection-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.creative-selection-actions button { min-height: 40px; padding: 0 8px; }
.danger-button, .clear-canvas-button { color: #8b2720; background: #fff3f1; border: 1px solid #e1aaa5; border-radius: 5px; font-weight: 800; cursor: pointer; }
.creative-help { padding: 11px; color: #526259; background: #f2f7f4; border-left: 3px solid #6b9d80; font-size: 12px; line-height: 1.45; }
.clear-canvas-button { min-height: 40px; }
.creative-stage { min-width: 0; display: grid; justify-items: center; }
.creative-canvas { position: relative; width: min(100%, 550px); aspect-ratio: 55 / 50; overflow: hidden; touch-action: none; background: #fff; border: 1px solid #9ca9a1; box-shadow: 0 14px 34px rgba(26, 49, 36, .16); }
.creative-element { position: absolute; z-index: 1; box-sizing: border-box; transform: translate(-50%, -50%); cursor: move; user-select: none; touch-action: none; }
.creative-element.selected { outline: 2px solid #19895a; outline-offset: 3px; }
.creative-text { min-height: 1em; line-height: 1.05; white-space: pre-wrap; overflow-wrap: anywhere; }
.creative-image img { display: block; width: 100%; height: auto; pointer-events: none; }
.creative-empty { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: #9ba69f; font-size: 14px; pointer-events: none; }
.creative-ruler { width: min(100%, 550px); padding-top: 8px; display: flex; justify-content: space-between; color: #69776e; font-size: 12px; }
.creative-print-sheet { display: none; }
.visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
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
.flags { flex-wrap: wrap; max-width: 145px; }
.flags button { width: 32px; height: 29px; padding: 0; display: grid; place-items: center; color: #667169; background: #edf0ee; border: 1px solid #d5dcd7; border-radius: 4px; font-size: 11px; font-weight: 900; cursor: pointer; }
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
  .printer-reminder { padding: 22px; grid-template-columns: 42px 1fr; gap: 13px; }
  .reminder-icon { width: 42px; height: 42px; }
  .printer-reminder h2 { font-size: 23px; }
  .printer-reminder > button { grid-column: 1 / -1; width: 100%; }
  .rz-header { padding: 14px 18px; }
  .printer-status { display: none; }
  .home-view, .preview-view, .manage-view, .edit-view, .creative-view { width: min(100% - 28px, 1080px); padding: 24px 0; }
  .primary-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .quick-product-panel { align-items: stretch; flex-direction: column; }
  .quick-product-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .action-button { min-height: 104px; padding: 13px; grid-template-columns: 38px 1fr; gap: 10px; }
  .action-button .arrow { display: none; }
  .action-icon { width: 38px; height: 38px; }
  .search-queue-heading { align-items: stretch; flex-direction: column; }
  .spec-strip { gap: 12px; justify-content: space-between; font-size: 12px; }
  .preview-heading, .manage-heading { align-items: stretch; flex-direction: column; }
  .queue-row { grid-template-columns: 24px 1fr 76px; gap: 8px; }
  .queue-row.book-queue-row { grid-template-columns: 24px 1fr 76px; }
  .queue-name { grid-column: 2 / 4; }
  .queue-row label { grid-row: 2; }
  .queue-row label:nth-of-type(1) { grid-column: 2; }
  .queue-row label:nth-of-type(2) { grid-column: 3; }
  .queue-row label:nth-of-type(3) { grid-column: 3; grid-row: 3; }
  .book-queue-row label:nth-of-type(3) { grid-column: 2; grid-row: 3; }
  .book-queue-row label:nth-of-type(4) { grid-column: 3; grid-row: 3; }
  .queue-quick-edit { grid-column: 1 / -1; align-items: stretch; flex-direction: column; }
  .product-row { padding: 0 8px 9px; grid-template-columns: minmax(0, 1fr) auto; }
  .product-main { grid-column: 1 / -1; grid-template-columns: minmax(0, 1fr) 75px 16px; padding: 9px 4px 4px; }
  .flags { max-width: none; }
  .active-button { min-width: 78px; padding: 8px 7px; font-size: 12px; }
  .form-grid { grid-template-columns: 1fr; }
  .creative-heading { align-items: stretch; flex-direction: column; }
  .creative-workspace { grid-template-columns: 1fr; }
  .creative-stage { grid-row: 1; }
}

@media (min-width: 721px) and (max-width: 1050px) {
  .primary-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 430px) {
  .primary-actions { grid-template-columns: 1fr; }
}

@page { size: 55mm 50mm; margin: 0; }
@media print {
  :global(html), :global(body), .rz-page { width: 55mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
  .no-print { display: none !important; }
  .preview-view { width: auto; margin: 0; padding: 0; }
  .print-sheet { display: block; }
  .creative-view { width: 55mm; margin: 0; padding: 0; }
  .creative-print-sheet { position: relative; display: block; width: 55mm; height: 50mm; overflow: hidden; color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; }
  .creative-print-sheet .creative-element { outline: 0; }
  .thermal-label { width: 55mm; height: 50mm; box-sizing: border-box; padding: 2.1mm 2.2mm 1.7mm; overflow: hidden; color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; break-after: page; page-break-after: always; }
  .thermal-label:last-child { break-after: auto; page-break-after: auto; }
  .book-label-page { width: 55mm; height: 50mm; box-sizing: border-box; overflow: hidden; color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; break-after: page; page-break-after: always; }
  .book-label-page:last-child { break-after: auto; page-break-after: auto; }
  .book-label { width: 55mm; height: 25mm; box-sizing: border-box; padding: 1.5mm 2mm 1.2mm; overflow: hidden; }
  .book-label + .book-label { border-top: .3mm dashed #555; }
  .book-product { display: block; padding-bottom: .7mm; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; font-size: 8.5pt; line-height: 1; }
  .book-label-grid { padding-top: .7mm; display: grid; grid-template-columns: 22mm 1fr; row-gap: .35mm; border-top: .2mm solid #777; font-size: 7pt; line-height: 1.05; }
  .book-label-grid span { text-align: left; }
  .book-label-grid b { overflow: hidden; text-align: right; text-overflow: ellipsis; white-space: nowrap; font-size: 7.2pt; }
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
