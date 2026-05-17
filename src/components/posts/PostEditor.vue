<template>
  <div class="post-editor-modal">
    <div class="post-editor-panel" :class="{ 'hero-editor-panel': isHeroMode, 'preview-collapsed': previewCollapsed }">
      <header class="editor-topbar">
        <button type="button" class="back-btn" @click="emit('close')">
          <i class="fas fa-arrow-left"></i>
          Volver a gestion
        </button>

        <div class="editor-title-block">
          <h2>{{ editorTitle }} <i class="fas fa-wand-magic-sparkles"></i></h2>
          <p>{{ editorSubtitle }}</p>
        </div>

        <div class="editor-actions-top">
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="pasteJsonIntoPost">
            <i class="fas fa-code"></i>
            Pegar JSON
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="openImagePicker('cover')">
            <i class="far fa-images"></i>
            Imagenes IGDB
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="previewCollapsed = !previewCollapsed">
            <i :class="previewCollapsed ? 'far fa-eye' : 'far fa-eye-slash'"></i>
            {{ previewCollapsed ? 'Visualizar' : 'Esconder preview' }}
          </button>
          <button v-if="!isHeroMode" type="button" class="draft-btn" @click="savePost('draft')" :disabled="loading">
            <i class="far fa-clipboard"></i>
            Guardar borrador
          </button>
          <button type="button" class="publish-top-btn" @click="savePost('pending')" :disabled="loading">
            <i class="far fa-paper-plane"></i>
            {{ loading ? 'Guardando...' : 'Publicar' }}
          </button>
          <button class="panel-close-btn" type="button" @click="emit('close')">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </header>

      <div v-if="!isHeroMode" class="mobile-stepper">
        <button type="button" :class="{ active: mobileStep === 'info' }" @click="mobileStep = 'info'">
          <span>1</span>
          Informacion
        </button>
        <button type="button" :class="{ active: mobileStep === 'sections' }" @click="mobileStep = 'sections'">
          <span>2</span>
          Secciones
        </button>
        <button type="button" :class="{ active: mobileStep === 'preview' }" @click="mobileStep = 'preview'">
          <span>3</span>
          Vista previa
        </button>
      </div>

      <main class="editor-layout" :class="{ 'hero-editor-layout': isHeroMode }">
        <section class="editor-column info-column" :class="{ 'mobile-hidden': !isHeroMode && mobileStep !== 'info' }">
          <div class="column-heading">
            <span>1. Informacion del post</span>
            <p>Define titulo, categorias, portada y resumen.</p>
          </div>

          <label class="field-group">
            <span>Titulo del post</span>
            <div class="input-shell">
              <input v-model="post.title" :maxlength="100" :placeholder="isHeroMode ? 'Ej: Oferta especial de hoy' : 'Ej: Analisis de Dream Kart World'" />
              <small>{{ post.title.length }}/100</small>
            </div>
          </label>

          <label v-if="!isHeroMode" class="field-group">
            <span>Subtitulo opcional</span>
            <div class="input-shell">
              <input v-model="post.subtitle" :maxlength="120" placeholder="Ej: El competidor que quiere revolucionar las carreras" />
              <small>{{ post.subtitle.length }}/120</small>
            </div>
          </label>

          <div class="field-group">
            <div class="field-row">
              <span>{{ isHeroMode ? 'Categoria principal' : 'Categorias (max. 3)' }}</span>
              <small>{{ selectedCategories.length }}/{{ isHeroMode ? 1 : 3 }}</small>
            </div>
            <div class="category-pills">
              <button
                v-for="category in availableCategoryOptions"
                :key="category"
                type="button"
                class="category-pill"
                :class="{ active: selectedCategories.includes(category) }"
                @click="toggleCategory(category)"
              >
                <i :class="selectedCategories.includes(category) ? 'fas fa-xmark' : 'fas fa-tag'"></i>
                {{ category }}
              </button>
            </div>
            <p class="field-help">
              Si eliges Analisis en cualquier posicion se activa la nota del juego.
            </p>
          </div>

          <div class="cover-tool">
            <div class="field-row">
              <span>Portada del post</span>
              <small>{{ post.image ? 'Asignada' : 'Pendiente' }}</small>
            </div>
            <div class="cover-preview-card" :class="{ empty: !post.image }">
              <img v-if="post.image" :src="post.image" alt="Portada del post" />
              <span v-else><i class="far fa-image"></i></span>
              <button v-if="!isHeroMode" type="button" @click="openImagePicker('cover')">
                <i class="fas fa-images"></i>
                Cambiar imagen
              </button>
            </div>
            <div class="cover-actions">
              <button v-if="!isHeroMode" type="button" @click="openImagePicker('cover')">
                <i class="far fa-images"></i>
                Buscar en IGDB
              </button>
              <label>
                <input v-model="post.image" placeholder="Pegar URL" />
              </label>
            </div>
          </div>

          <label class="field-group">
            <span>{{ isHeroMode ? 'Mensaje principal' : 'Resumen / Intro' }}</span>
            <div class="input-shell textarea-shell">
              <textarea v-model="post.content" :maxlength="220" :placeholder="isHeroMode ? 'Escribe el saludo, oferta o aviso que se vera al entrar a la web...' : 'Cuenta la promesa del post en dos o tres lineas...'" />
              <small>{{ post.content.length }}/220</small>
            </div>
          </label>

          <section v-if="!isHeroMode" class="release-editor">
            <div class="column-heading">
              <span>Programacion</span>
              <p>Agenda el lanzamiento y decide si se vera como proximamente.</p>
            </div>

            <label class="field-group">
              <span>Fecha y hora de lanzamiento</span>
              <div class="input-shell">
                <input v-model="releaseAtInput" type="datetime-local" />
              </div>
            </label>

            <label class="release-toggle">
              <input v-model="post.teaserVisible" type="checkbox" />
              <span></span>
              Mostrar teaser "proximamente" antes de la fecha
            </label>
          </section>

          <div v-if="jsonPasteError" class="json-paste-error">
            <i class="fas fa-triangle-exclamation"></i>
            {{ jsonPasteError }}
          </div>

          <section v-if="!isHeroMode && isAnalysisPost" class="analysis-editor">
            <div class="analysis-editor-head">
              <div>
                <span>Score del juego</span>
                <h3>Nota del analisis</h3>
              </div>
              <label class="score-toggle">
                Mostrar score
                <input v-model="post.analysis.showScore" type="checkbox" />
              </label>
            </div>

            <div class="score-editor-row">
              <label class="score-circle">
                <input v-model.number="post.analysis.score" type="number" min="0" max="100" />
              </label>
              <div>
                <strong>{{ scoreLabel }}</strong>
                <div class="score-stars">
                  <i v-for="star in 5" :key="star" :class="star <= previewStars ? 'fas fa-star' : 'far fa-star'"></i>
                </div>
              </div>
            </div>

            <label class="analysis-wide">
              Titulo HYPE
              <input v-model="post.analysis.hypeTitle" placeholder="Ej: El regreso que todos esperaban" />
            </label>

            <div class="analysis-criteria-grid">
              <label v-for="item in post.analysis.criteria" :key="item.key">
                {{ item.label }}
                <input v-model.number="item.score" type="number" min="0" max="10" step="0.5" />
              </label>
            </div>

            <div class="analysis-pros-cons">
              <label>
                Lo mejor
                <textarea v-model="post.analysis.prosText" placeholder="Un punto por linea" />
              </label>
              <label>
                Lo peor
                <textarea v-model="post.analysis.consText" placeholder="Un punto por linea" />
              </label>
            </div>
          </section>
        </section>

        <section v-if="!isHeroMode" class="editor-column content-column" :class="{ 'mobile-hidden': mobileStep !== 'sections' }">
          <div class="section-editor-head">
            <div class="column-heading">
              <span>2. Secciones del post</span>
              <p>Organiza el contenido y sus imagenes.</p>
            </div>
            <button type="button" @click="addSection">
              <i class="fas fa-plus"></i>
              Crear seccion
            </button>
          </div>

          <div class="section-stack">
            <article
              v-for="(section, index) in post.sections"
              :key="index"
              class="post-section-card"
              :class="{ active: activeSectionIndex === index, disabled: section.hidden }"
              @click="activeSectionIndex = index"
            >
              <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
              <span class="section-number">{{ index + 1 }}</span>

              <div class="section-copy">
                <div class="section-card-head">
                  <small>{{ section.label || sectionTypeLabel(index) }}</small>
                  <label
                    class="section-visible-toggle"
                    :class="{ hidden: section.hidden }"
                    :title="section.hidden ? 'Activar seccion' : 'Desactivar seccion'"
                    @click.stop
                  >
                    <input v-model="section.hidden" type="checkbox" />
                    <em>{{ section.hidden ? 'Oculta' : 'Activa' }}</em>
                    <span></span>
                  </label>
                </div>

                <template v-if="activeSectionIndex === index">
                  <input v-model="section.title" placeholder="Subtitulo de la seccion" />
                  <textarea v-model="section.content" placeholder="Contenido de esta seccion..."></textarea>
                  <div class="section-image-row">
                    <input v-model="section.image" placeholder="URL de imagen de la seccion" />
                    <button type="button" @click.stop="openImagePicker(`section-${index}`)">
                      <i class="far fa-image"></i>
                    </button>
                  </div>
                </template>

                <template v-else>
                  <strong>{{ section.title || 'Sin subtitulo todavia' }}</strong>
                  <p>{{ section.content || 'Sin contenido todavia' }}</p>
                </template>
              </div>

              <img v-if="section.image" :src="section.image" :alt="section.title || `Seccion ${index + 1}`" />
              <span v-else class="section-placeholder"><i class="fas fa-font"></i></span>

              <div class="section-card-actions">
                <button type="button" :disabled="index === 0" title="Subir" @click.stop="moveSection(index, -1)">
                  <i class="fas fa-arrow-up"></i>
                </button>
                <button type="button" :disabled="index === post.sections.length - 1" title="Bajar" @click.stop="moveSection(index, 1)">
                  <i class="fas fa-arrow-down"></i>
                </button>
                <button type="button" title="Editar" @click.stop="activeSectionIndex = index">
                  <i class="fas fa-pen"></i>
                </button>
                <button type="button" title="Duplicar" @click.stop="duplicateSection(index)">
                  <i class="far fa-copy"></i>
                </button>
                <button v-if="post.sections.length > 1" type="button" class="danger" title="Eliminar" @click.stop="removeSection(index)">
                  <i class="far fa-trash-can"></i>
                </button>
              </div>
            </article>
          </div>

        </section>

        <aside v-if="!isHeroMode && !previewCollapsed" class="editor-column preview-column" :class="{ 'mobile-hidden': mobileStep !== 'preview' }">
          <div class="preview-head">
            <div class="column-heading">
              <span>3. Vista previa del post</span>
              <p>Revisa como va quedando antes de publicar.</p>
            </div>
            <button type="button" class="utility-btn" @click="previewCollapsed = true">
              <i class="far fa-eye-slash"></i>
              Esconder
            </button>
          </div>

          <article class="post-live-preview" :class="{ analysis: isAnalysisPost }">
            <span class="preview-category">{{ post.category || 'Categoria' }}</span>
            <h1>{{ post.title || 'Titulo de la publicacion' }}</h1>
            <p v-if="post.subtitle" class="preview-subtitle">{{ post.subtitle }}</p>
            <p class="preview-summary">{{ post.content || 'El resumen del post aparecera aqui para comprobar ritmo, longitud y contexto.' }}</p>
            <div class="preview-meta">
              <span><i class="fas fa-user-circle"></i> Galaxia Nintendera</span>
              <span><i class="far fa-calendar"></i> Hoy</span>
              <span v-if="isAnalysisPost"><i class="far fa-star"></i> {{ post.analysis.score }}</span>
            </div>
            <img v-if="post.image" class="preview-cover" :src="post.image" alt="Preview portada" />
            <div v-else class="preview-cover placeholder"><i class="far fa-image"></i></div>

            <section v-for="(section, index) in visibleSections" :key="index" class="preview-section">
              <h2>{{ section.title || `Seccion ${index + 1}` }}</h2>
              <img v-if="section.image" :src="section.image" :alt="section.title || `Seccion ${index + 1}`" />
              <p>{{ section.content || 'El contenido de esta seccion se vera aqui cuando lo escribas.' }}</p>
            </section>

            <div v-if="isAnalysisPost && post.analysis.showScore" class="preview-score-card">
              <strong>{{ post.analysis.score }}</strong>
              <span>{{ scoreLabel }}</span>
              <div>
                <small v-for="item in post.analysis.criteria" :key="item.key">
                  {{ item.label }}
                  <b>{{ item.score }}</b>
                </small>
              </div>
            </div>
          </article>
        </aside>
      </main>

      <Transition name="toast">
        <div v-if="toast.show" class="app-toast">
          <span :class="['app-toast-icon', toast.type]">
            <i :class="toast.type === 'delete' ? 'fas fa-triangle-exclamation' : 'fas fa-check'"></i>
          </span>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="loading" class="editor-loading-cover">
          <GalaxyLoader compact title="Guardando" text="Publicando con la pantalla de carga de la galaxia..." />
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="imagePickerOpen" class="image-picker-modal">
          <button class="image-picker-backdrop" type="button" @click="imagePickerOpen = false"></button>
          <section class="image-picker-panel">
            <header>
              <div>
                <span>IGDB</span>
                <h2>Escoger imagenes del juego</h2>
                <p>Busca el juego, revisa portadas, screenshots y artes; luego asigna cada imagen a portada o secciones.</p>
              </div>
              <button type="button" @click="imagePickerOpen = false"><i class="fas fa-xmark"></i></button>
            </header>

            <form class="igdb-search-row" @submit.prevent="searchIgdbImages">
              <input v-model="igdbQuery" placeholder="Nombre del juego, ej: Mario Kart World" />
              <button type="submit" :disabled="igdbLoading || !igdbQuery.trim()">
                <i :class="igdbLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-search'"></i>
                Buscar
              </button>
            </form>

            <div class="target-strip">
              <button
                v-for="target in imageTargets"
                :key="target.id"
                type="button"
                :class="{ active: imageTargetId === target.id, filled: target.url }"
                @click="imageTargetId = target.id"
              >
                <span>{{ target.label }}</span>
                <small>{{ target.url ? 'Asignada' : 'Sin imagen' }}</small>
              </button>
            </div>

            <div v-if="igdbImages.length" class="igdb-filter-tabs">
              <button
                v-for="filter in igdbTypeFilters"
                :key="filter.id"
                type="button"
                :class="{ active: igdbTypeFilter === filter.id }"
                @click="igdbTypeFilter = filter.id"
              >
                {{ filter.label }}
                <span>{{ filter.count }}</span>
              </button>
            </div>

            <div v-if="igdbError" class="json-paste-error">{{ igdbError }}</div>
            <div v-if="!igdbImages.length && !igdbLoading" class="igdb-empty">
              Busca un juego para cargar imagenes.
            </div>
            <div v-if="igdbLoading" class="igdb-empty">
              Buscando imagenes...
            </div>

            <div v-if="filteredIgdbImages.length" class="igdb-gallery">
              <article v-for="image in filteredIgdbImages" :key="image.id" :class="{ selected: assignedLabel(image.url) }">
                <img :src="image.url" :alt="image.typeLabel" />
                <div>
                  <span>{{ image.typeLabel }}</span>
                  <strong v-if="assignedLabel(image.url)">{{ assignedLabel(image.url) }}</strong>
                </div>
                <button type="button" @click="assignIgdbImage(image)">
                  Asignar a {{ activeImageTarget?.label || 'destino' }}
                </button>
              </article>
            </div>
            <div v-else-if="igdbImages.length && !igdbLoading" class="igdb-empty">
              No hay imagenes en esta categoria.
            </div>
          </section>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { addDoc, collection, deleteField, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { playPublishSound } from '@/services/uiSounds'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

const props = defineProps({
  editData: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'post'
  },
  categoryOptions: {
    type: Array,
    default: () => []
  },
  pasteJsonOnOpen: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['close', 'created'])

const loading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
const activeSectionIndex = ref(0)
const mobileStep = ref('info')
const previewCollapsed = ref(false)
const jsonPasteError = ref('')
const imagePickerOpen = ref(false)
const imageTargetId = ref('cover')
const igdbQuery = ref('')
const igdbImages = ref([])
const igdbTypeFilter = ref('all')
const igdbLoading = ref(false)
const igdbError = ref('')
const releaseAtInput = ref('')

const defaultAnalysisCriteria = [
  { key: 'historia', label: 'Historia', score: 8.5 },
  { key: 'gameplay', label: 'Gameplay', score: 9 },
  { key: 'graficos', label: 'Graficos', score: 8.5 },
  { key: 'musica', label: 'Musica', score: 8 },
  { key: 'duracion', label: 'Duracion', score: 8.5 }
]
const fallbackCategoryOptions = ['Nintendo Switch', 'Super Mario', 'Zelda', 'Pokemon', 'Rumores', 'Analisis', 'Guias']

const post = ref({
  title: '',
  subtitle: '',
  content: '',
  category: '',
  image: '',
  releaseAt: 0,
  teaserVisible: true,
  mediaGameName: '',
  sections: [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }],
  analysis: {
    showScore: true,
    score: 88,
    hypeTitle: '',
    criteria: JSON.parse(JSON.stringify(defaultAnalysisCriteria)),
    prosText: '',
    consText: ''
  }
})
const selectedCategories = ref([])

const availableCategoryOptions = computed(() => {
  const source = props.categoryOptions.length ? props.categoryOptions : fallbackCategoryOptions
  return [...new Set([...source, ...selectedCategories.value].filter(Boolean))]
})
const isHeroMode = computed(() => props.mode === 'hero' || post.value.placement === 'hero')
const editorTitle = computed(() => {
  if (props.editData) return isHeroMode.value ? 'Editar principal' : 'Editar publicacion'
  return isHeroMode.value ? 'Crear principal de inicio' : 'Crear nueva publicacion'
})
const editorSubtitle = computed(() => (
  isHeroMode.value
    ? 'Completa el mensaje que se mostrara primero al entrar a la web.'
    : 'Construye tu post. Guarda en borrador o publicalo cuando este listo.'
))
const submitLabel = computed(() => {
  if (props.editData) return 'Guardar cambios'
  return isHeroMode.value ? 'Enviar principal a revision' : 'Publicar en la galaxia'
})
const successLabel = computed(() => (isHeroMode.value ? 'Principal enviado con exito' : 'Post publicado con exito'))
const isAnalysisPost = computed(() => selectedCategories.value.some(item => normalizeText(item) === 'analisis'))
const visibleSections = computed(() => post.value.sections.filter(section => !section.hidden))
const previewStars = computed(() => {
  const score = Number(post.value.analysis?.score || 0)
  const percentScore = score <= 10 ? score * 10 : score
  return Math.max(0, Math.min(5, Math.round(percentScore / 20)))
})
const scoreLabel = computed(() => {
  const score = Number(post.value.analysis?.score || 0)
  const percentScore = score <= 10 ? score * 10 : score
  if (percentScore >= 90) return 'Excelente'
  if (percentScore >= 80) return 'Muy bueno'
  if (percentScore >= 70) return 'Bueno'
  if (percentScore >= 60) return 'Correcto'
  return 'Mejorable'
})
const imageTargets = computed(() => [
  { id: 'cover', label: 'Portada', url: post.value.image },
  ...post.value.sections.map((section, index) => ({
    id: `section-${index}`,
    label: section.title?.trim() || `Seccion ${index + 1}`,
    url: section.image
  }))
])
const activeImageTarget = computed(() => imageTargets.value.find(target => target.id === imageTargetId.value) || imageTargets.value[0])
const igdbTypeFilters = computed(() => {
  const definitions = [
    { id: 'all', label: 'Todo' },
    { id: 'cover', label: 'Caratulas' },
    { id: 'screenshot', label: 'Gameplay' },
    { id: 'artwork', label: 'Arte' }
  ]
  return definitions.map(filter => ({
    ...filter,
    count: filter.id === 'all'
      ? igdbImages.value.length
      : igdbImages.value.filter(image => image.type === filter.id).length
  }))
})
const filteredIgdbImages = computed(() => {
  if (igdbTypeFilter.value === 'all') return igdbImages.value
  return igdbImages.value.filter(image => image.type === igdbTypeFilter.value)
})

const toLocalDateTimeInput = (value) => {
  const time = typeof value === 'number' ? value : (value?.toDate?.().getTime?.() || new Date(value || '').getTime())
  if (!Number.isFinite(time) || !time) return ''
  const date = new Date(time)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

onMounted(() => {
  if (props.editData) {
    post.value = {
      ...post.value,
      ...JSON.parse(JSON.stringify(props.editData))
    }
    post.value.subtitle = post.value.subtitle || ''
    releaseAtInput.value = toLocalDateTimeInput(post.value.releaseAt || post.value.scheduledAt)
    post.value.teaserVisible = post.value.teaserVisible !== false
    post.value.sections = normalizeSections(post.value.sections?.length ? post.value.sections : post.value.sections)
    ensureAnalysisData()
    const savedCategories = Array.isArray(post.value.categories) && post.value.categories.length
      ? post.value.categories
      : (post.value.category ? [post.value.category] : [])
    selectedCategories.value = savedCategories.filter(Boolean).slice(0, 3)
  } else {
    post.value.teaserVisible = true
    selectedCategories.value = props.mode === 'hero' ? [availableCategoryOptions.value[0] || 'Nintendo Switch'] : []
    if (props.pasteJsonOnOpen && !isHeroMode.value) {
      nextTick(() => pasteJsonIntoPost())
    }
  }
})

watch(selectedCategories, (categories) => {
  post.value.categories = categories
  post.value.category = categories[0] || ''
  if (isAnalysisPost.value) ensureAnalysisData()
}, { deep: true, immediate: true })

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const ensureAnalysisData = () => {
  post.value.analysis = {
    showScore: post.value.analysis?.showScore !== false,
    score: Number(post.value.analysis?.score ?? 88),
    hypeTitle: post.value.analysis?.hypeTitle || '',
    criteria: post.value.analysis?.criteria?.length
      ? post.value.analysis.criteria.map((item, index) => ({
          key: item.key || defaultAnalysisCriteria[index]?.key || `criteria-${index}`,
          label: item.label || defaultAnalysisCriteria[index]?.label || 'Criterio',
          score: Number(item.score ?? defaultAnalysisCriteria[index]?.score ?? 8)
        }))
      : JSON.parse(JSON.stringify(defaultAnalysisCriteria)),
    prosText: post.value.analysis?.prosText || (post.value.analysis?.pros || []).join('\n'),
    consText: post.value.analysis?.consText || (post.value.analysis?.cons || []).join('\n')
  }
}

const toggleCategory = (category) => {
  const hasCategory = selectedCategories.value.includes(category)
  if (isHeroMode.value) {
    selectedCategories.value = hasCategory ? [] : [category]
    return
  }
  if (hasCategory) {
    selectedCategories.value = selectedCategories.value.filter(item => item !== category)
    return
  }
  if (selectedCategories.value.length >= 3) return
  selectedCategories.value = [...selectedCategories.value, category]
}

const sectionTypeLabel = (index) => {
  const labels = ['Introduccion', 'Historia', 'Gameplay', 'Aspectos destacados', 'Conclusion']
  return labels[index] || `Seccion ${index + 1}`
}

const addSection = async () => {
  post.value.sections.push({ title: '', label: sectionTypeLabel(post.value.sections.length), image: '', content: '', hidden: false })
  activeSectionIndex.value = post.value.sections.length - 1
  await nextTick()
}

const removeSection = (index) => {
  if (post.value.sections.length <= 1) return
  post.value.sections.splice(index, 1)
  activeSectionIndex.value = Math.min(activeSectionIndex.value, post.value.sections.length - 1)
}

const duplicateSection = (index) => {
  const source = post.value.sections[index]
  post.value.sections.splice(index + 1, 0, { ...JSON.parse(JSON.stringify(source)), title: `${source.title || 'Seccion'} copia` })
  activeSectionIndex.value = index + 1
}

const moveSection = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= post.value.sections.length) return
  const [section] = post.value.sections.splice(index, 1)
  post.value.sections.splice(targetIndex, 0, section)
  activeSectionIndex.value = targetIndex
}

const showEditorToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 2500)
}

const normalizeSections = (sections = [], { dropEmpty = false } = {}) => {
  const normalized = sections.map((section, index) => ({
    title: section?.title || section?.subtitulo || '',
    label: section?.label || section?.type || sectionTypeLabel(index),
    image: section?.image || section?.imagen || '',
    content: section?.content || section?.contenido || '',
    hidden: Boolean(section?.hidden)
  }))
  const filtered = dropEmpty
    ? normalized.filter(section => section.title.trim() || section.image.trim() || section.content.trim())
    : normalized
  return filtered.length ? filtered : [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }]
}

const parseAiJsonPost = (value) => {
  const data = JSON.parse(value || '{}')
  const title = String(data?.title || data?.titulo || '').trim()
  const subtitle = String(data?.subtitle || data?.subtitulo || '').trim()
  const summary = String(data?.summary ?? data?.resumen ?? data?.content ?? '').trim()
  const categories = Array.isArray(data?.categories)
    ? data.categories.map(item => String(item || '').trim()).filter(Boolean)
    : []
  const category = String(data?.category || data?.categoria || categories[0] || '').trim()

  if (!title) throw new Error('El JSON no tiene title/titulo.')
  if (!summary) throw new Error('El JSON no tiene summary/resumen.')
  if (!category && !categories.length) throw new Error('El JSON no tiene category/categoria o categories.')

  const sectionsSource = Array.isArray(data?.sections)
    ? data.sections
    : (Array.isArray(data?.secciones) ? data.secciones : [])
  const mergedCategories = [...new Set([category, ...categories].filter(Boolean))]

  return {
    title,
    subtitle,
    content: summary,
    image: String(data?.image || data?.imagen || '').trim(),
    categories: mergedCategories,
    sections: normalizeSections(sectionsSource),
    analysis: data?.analysis || data?.analisis || {},
    score: Number(data?.score || data?.nota || data?.analysis?.score || data?.analisis?.score || 0),
    pros: Array.isArray(data?.pros) ? data.pros : [],
    cons: Array.isArray(data?.cons) ? data.cons : []
  }
}

const pasteJsonIntoPost = async () => {
  jsonPasteError.value = ''
  try {
    const text = await navigator.clipboard.readText()
    const parsed = parseAiJsonPost(text)
    post.value.title = parsed.title
    post.value.subtitle = parsed.subtitle
    post.value.content = parsed.content
    post.value.image = parsed.image
    post.value.sections = parsed.sections
    selectedCategories.value = parsed.categories.slice(0, 3)
    activeSectionIndex.value = 0

    if (isAnalysisPost.value) {
      ensureAnalysisData()
      post.value.analysis.score = parsed.score || post.value.analysis.score
      post.value.analysis.hypeTitle = parsed.analysis?.hypeTitle || parsed.analysis?.titulo || parsed.title
      post.value.analysis.prosText = parsed.pros.join('\n') || post.value.analysis.prosText
      post.value.analysis.consText = parsed.cons.join('\n') || post.value.analysis.consText
    }
    showEditorToast('JSON pegado en el editor')
  } catch (error) {
    console.error(error)
    jsonPasteError.value = error.message || 'No pude pegar el JSON. Copialo otra vez y reintenta.'
  }
}

const openImagePicker = (targetId = 'cover') => {
  imageTargetId.value = targetId
  imagePickerOpen.value = true
  igdbError.value = ''
  igdbQuery.value = post.value.mediaGameName || post.value.title || ''
}

const searchIgdbImages = async () => {
  const query = igdbQuery.value.trim()
  if (!query) return
  igdbLoading.value = true
  igdbError.value = ''
  try {
    const response = await fetch('/.netlify/functions/igdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || 'No se pudieron buscar imagenes')
    igdbImages.value = data.images || []
    igdbTypeFilter.value = 'all'
    post.value.mediaGameName = data.game?.name || query
  } catch (error) {
    console.error(error)
    igdbError.value = error.message || 'No se pudieron buscar imagenes'
  } finally {
    igdbLoading.value = false
  }
}

const assignIgdbImage = (image) => {
  if (!image?.url) return
  if (imageTargetId.value === 'cover') {
    post.value.image = image.url
  } else if (imageTargetId.value.startsWith('section-')) {
    const index = Number(imageTargetId.value.replace('section-', ''))
    if (post.value.sections[index]) post.value.sections[index].image = image.url
  }
  showEditorToast(`Imagen asignada a ${activeImageTarget.value?.label || 'destino'}`)
}

const assignedLabel = (url) => {
  const target = imageTargets.value.find(item => item.url === url)
  return target?.label || ''
}

const savePost = async (targetStatus = 'pending') => {
  if (!post.value.title.trim()) return alert('El titulo es obligatorio')
  if (!selectedCategories.value.length) return alert('Selecciona al menos una categoria')

  loading.value = true
  try {
    const user = auth.currentUser
    const cleanPost = JSON.parse(JSON.stringify(post.value))
    delete cleanPost.stickers
    cleanPost.sections = normalizeSections(cleanPost.sections, { dropEmpty: !isHeroMode.value })
    cleanPost.categories = selectedCategories.value
    cleanPost.category = selectedCategories.value[0]
    cleanPost.placement = isHeroMode.value ? 'hero' : 'news'
    cleanPost.isMainEntry = isHeroMode.value
    const releaseAt = releaseAtInput.value ? new Date(releaseAtInput.value).getTime() : 0
    cleanPost.releaseAt = Number.isFinite(releaseAt) ? releaseAt : 0
    cleanPost.teaserVisible = cleanPost.teaserVisible !== false

    if (!isHeroMode.value && isAnalysisPost.value) {
      cleanPost.analysis = {
        ...cleanPost.analysis,
        score: Number(cleanPost.analysis?.score || 0),
        hypeTitle: String(cleanPost.analysis?.hypeTitle || '').trim(),
        pros: String(cleanPost.analysis?.prosText || '').split('\n').map(item => item.trim()).filter(Boolean),
        cons: String(cleanPost.analysis?.consText || '').split('\n').map(item => item.trim()).filter(Boolean)
      }
    } else {
      delete cleanPost.analysis
    }

    if (isHeroMode.value) cleanPost.sections = []

    if (props.editData) {
      await updateDoc(doc(db, 'posts', props.editData.id), {
        ...cleanPost,
        stickers: deleteField(),
        updatedAt: Date.now()
      })
    } else {
      await addDoc(collection(db, 'posts'), {
        ...cleanPost,
        authorId: user?.uid || 'anon',
        authorName: user?.displayName || 'Admin',
        status: targetStatus === 'draft' ? 'pending' : 'pending',
        createdAt: Date.now()
      })
    }

    showEditorToast(props.editData ? 'Cambios guardados' : successLabel.value)
    playPublishSound()
    if (!props.editData) {
      window.dispatchEvent(new CustomEvent('mascot-reaction', {
        detail: {
          type: isHeroMode.value ? 'heroCreated' : 'postCreated',
          message: isHeroMode.value ? 'Nuevo principal listo para brillar.' : 'Que gran post acaba de nacer.'
        }
      }))
    }
    setTimeout(() => {
      emit('created')
      emit('close')
    }, 900)
  } catch (error) {
    console.error(error)
    alert('Error al guardar')
    loading.value = false
  }
}
</script>

<style scoped>
.post-editor-modal {
  align-items: center;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(14px);
  display: flex;
  inset: 0;
  justify-content: center;
  overflow: hidden;
  padding: 14px;
  position: fixed;
  z-index: 2000;
}

.post-editor-panel {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 22px;
  box-shadow: 0 30px 100px rgba(15, 23, 42, 0.34);
  color: #111827;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: calc(100dvh - 28px);
  max-width: min(1640px, calc(100vw - 28px));
  overflow: hidden;
  width: min(1640px, calc(100vw - 28px));
}

.hero-editor-panel {
  max-width: min(820px, calc(100vw - 36px));
}

.editor-topbar {
  align-items: center;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #eef2f7;
  display: grid;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 14px 18px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.editor-title-block h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.15;
}

.editor-title-block i,
.column-heading span,
.score-stars {
  color: #a855f7;
}

.editor-title-block p,
.column-heading p,
.field-help {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
}

.editor-actions-top,
.cover-actions,
.field-row,
.preview-head,
.section-editor-head,
.section-card-head,
.score-editor-row {
  align-items: center;
  display: flex;
  gap: 10px;
}

.back-btn,
.utility-btn,
.draft-btn,
.publish-top-btn,
.panel-close-btn {
  align-items: center;
  border-radius: 12px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
}

.back-btn,
.utility-btn,
.draft-btn {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #475569;
}

.utility-btn:hover,
.draft-btn:hover,
.back-btn:hover {
  border-color: #c4b5fd;
  color: #7c3aed;
}

.publish-top-btn {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.panel-close-btn {
  background: #f8fafc;
  color: #94a3b8;
  height: 40px;
  padding: 0;
  width: 40px;
}

.mobile-stepper {
  display: none;
}

.editor-layout {
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(270px, 0.78fr) minmax(420px, 1.18fr) minmax(360px, 0.95fr);
  min-height: 0;
  overflow: hidden;
  padding: 22px;
}

.preview-collapsed .editor-layout {
  grid-template-columns: minmax(320px, 0.85fr) minmax(580px, 1.55fr);
}

.hero-editor-layout {
  grid-template-columns: 1fr;
}

.editor-column {
  align-content: start;
  display: grid;
  gap: 18px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.column-heading span {
  display: block;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-group > span,
.field-row span {
  color: #334155;
  font-size: 12px;
  font-weight: 950;
}

.field-row {
  justify-content: space-between;
}

.field-row small {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.input-shell {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
}

.input-shell:focus-within {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.input-shell input,
.input-shell textarea,
.cover-actions input,
.section-copy input,
.section-copy textarea,
.igdb-search-row input {
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  outline: none;
  width: 100%;
}

.input-shell small {
  color: #94a3b8;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
}

.textarea-shell {
  align-items: stretch;
  min-height: 104px;
  padding: 12px;
}

.textarea-shell textarea {
  resize: none;
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-pill {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
}

.category-pill.active {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-color: transparent;
  color: #ffffff;
}

.cover-tool {
  display: grid;
  gap: 10px;
}

.cover-preview-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  min-height: 150px;
  overflow: hidden;
  position: relative;
}

.cover-preview-card img {
  height: 100%;
  min-height: 150px;
  object-fit: cover;
  width: 100%;
}

.cover-preview-card.empty {
  display: grid;
  place-items: center;
}

.cover-preview-card > span {
  color: #a78bfa;
  font-size: 28px;
}

.cover-preview-card button {
  background: rgba(15, 23, 42, 0.72);
  border-radius: 10px;
  bottom: 10px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  left: 10px;
  padding: 8px 12px;
  position: absolute;
}

.cover-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.cover-actions button,
.cover-actions label {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #7c3aed;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  justify-content: center;
  padding: 0 12px;
}

.json-paste-error {
  align-items: center;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  color: #be123c;
  display: flex;
  font-size: 12px;
  font-weight: 850;
  gap: 8px;
  padding: 10px 12px;
}

.analysis-editor {
  background: linear-gradient(135deg, #faf5ff, #fff7ed);
  border: 1px solid #e9d5ff;
  border-radius: 18px;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.release-editor {
  background: linear-gradient(135deg, #f5f3ff, #eef2ff);
  border: 1px solid #ddd6fe;
  border-radius: 18px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.release-toggle {
  align-items: center;
  color: #475569;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 9px;
}

.release-toggle input {
  display: none;
}

.release-toggle span {
  background: #cbd5e1;
  border-radius: 999px;
  height: 20px;
  position: relative;
  width: 38px;
}

.release-toggle span::after {
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
  content: '';
  height: 16px;
  left: 2px;
  position: absolute;
  top: 2px;
  transition: transform 0.2s ease;
  width: 16px;
}

.release-toggle input:checked + span {
  background: #9333ea;
}

.release-toggle input:checked + span::after {
  transform: translateX(18px);
}

.analysis-editor-head {
  justify-content: space-between;
}

.analysis-editor-head span {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
}

.analysis-editor-head h3 {
  color: #111827;
  font-size: 16px;
  font-weight: 950;
}

.score-toggle {
  align-items: center;
  color: #64748b;
  display: flex;
  font-size: 11px;
  font-weight: 850;
  gap: 8px;
}

.score-editor-row {
  justify-content: start;
}

.score-circle {
  align-items: center;
  border: 4px solid #a855f7;
  border-radius: 999px;
  display: flex;
  height: 74px;
  justify-content: center;
  width: 74px;
}

.score-circle input {
  background: transparent;
  color: #111827;
  font-size: 24px;
  font-weight: 950;
  outline: none;
  text-align: center;
  width: 58px;
}

.score-editor-row strong {
  color: #9333ea;
  font-weight: 950;
}

.analysis-wide,
.analysis-criteria-grid label,
.analysis-pros-cons label {
  color: #475569;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
}

.analysis-wide input,
.analysis-criteria-grid input,
.analysis-pros-cons textarea {
  background: #ffffff;
  border: 1px solid #e9d5ff;
  border-radius: 10px;
  color: #111827;
  outline: none;
  padding: 9px 10px;
}

.analysis-criteria-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.analysis-pros-cons {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-pros-cons textarea {
  min-height: 76px;
  resize: vertical;
}

.section-editor-head {
  justify-content: space-between;
}

.section-editor-head > button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  min-height: 42px;
  padding: 0 16px;
}

.section-stack {
  display: grid;
  gap: 12px;
}

.post-section-card {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: auto 32px minmax(0, 1fr) minmax(110px, 160px) auto;
  min-height: 104px;
  padding: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.post-section-card.active {
  border-color: #c084fc;
  box-shadow: 0 16px 38px rgba(124, 58, 237, 0.1);
}

.post-section-card.disabled {
  opacity: 0.58;
}

.drag-handle {
  color: #94a3b8;
}

.section-number {
  align-items: center;
  background: #f3e8ff;
  border-radius: 999px;
  color: #a855f7;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.section-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.section-card-head {
  justify-content: space-between;
}

.section-card-head small {
  background: #f3e8ff;
  border-radius: 999px;
  color: #a855f7;
  font-size: 10px;
  font-weight: 950;
  padding: 4px 8px;
  text-transform: uppercase;
}

.section-visible-toggle input {
  display: none;
}

.section-visible-toggle {
  align-items: center;
  color: #16a34a;
  cursor: pointer;
  display: inline-flex;
  gap: 7px;
  min-width: 78px;
}

.section-visible-toggle em {
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}

.section-visible-toggle span {
  background: #22c55e;
  border-radius: 999px;
  display: block;
  height: 18px;
  width: 34px;
}

.section-visible-toggle.hidden {
  color: #94a3b8;
}

.section-visible-toggle input:checked + em + span {
  background: #cbd5e1;
}

.section-copy input,
.section-copy textarea,
.section-image-row {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 9px 10px;
}

.section-copy textarea {
  min-height: 78px;
  resize: vertical;
}

.section-copy strong {
  color: #111827;
  font-size: 15px;
  font-weight: 950;
}

.section-copy p {
  color: #64748b;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.section-image-row {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 38px;
}

.section-image-row button,
.section-card-actions button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #475569;
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.post-section-card > img {
  border-radius: 10px;
  height: 76px;
  object-fit: cover;
  width: 100%;
}

.section-placeholder {
  color: #64748b;
  display: grid;
  font-size: 28px;
  place-items: center;
}

.section-card-actions {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, 36px);
}

.section-card-actions .danger {
  color: #ef4444;
}

.preview-column {
  background: #ffffff;
  border-radius: 18px;
  padding: 0;
}

.preview-head {
  justify-content: space-between;
}

.post-live-preview {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 12px;
  padding: 16px;
}

.preview-category {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 950;
  justify-self: start;
  padding: 5px 8px;
  text-transform: uppercase;
}

.post-live-preview h1 {
  color: #111827;
  font-size: 24px;
  font-weight: 950;
  line-height: 1.12;
}

.preview-subtitle,
.preview-summary,
.preview-section p {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

.preview-meta {
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  font-size: 11px;
  font-weight: 850;
  gap: 12px;
}

.preview-cover,
.preview-section img {
  border-radius: 12px;
  max-height: 270px;
  object-fit: cover;
  width: 100%;
}

.preview-cover.placeholder {
  background: #f8fafc;
  color: #a78bfa;
  display: grid;
  min-height: 210px;
  place-items: center;
}

.preview-section {
  display: grid;
  gap: 8px;
}

.preview-section h2 {
  color: #111827;
  font-size: 16px;
  font-weight: 950;
}

.preview-score-card {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
  border-radius: 16px;
  display: grid;
  gap: 8px;
  padding: 14px;
}

.preview-score-card > strong {
  color: #7c3aed;
  font-size: 34px;
  font-weight: 950;
}

.preview-score-card > span {
  color: #9333ea;
  font-weight: 950;
}

.preview-score-card div {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.preview-score-card small {
  color: #64748b;
  display: grid;
  font-size: 10px;
  font-weight: 850;
  gap: 4px;
}

.preview-score-card b {
  color: #111827;
}

.image-picker-modal,
.editor-loading-cover {
  display: grid;
  inset: 0;
  place-items: center;
  position: fixed;
  z-index: 2200;
}

.image-picker-backdrop {
  background: rgba(15, 23, 42, 0.62);
  inset: 0;
  position: absolute;
}

.image-picker-panel {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.4);
  display: grid;
  gap: 16px;
  max-height: min(860px, calc(100dvh - 36px));
  max-width: min(1180px, calc(100vw - 36px));
  overflow: hidden;
  padding: 18px;
  position: relative;
  width: min(1180px, calc(100vw - 36px));
}

.image-picker-panel header {
  align-items: start;
  display: flex;
  justify-content: space-between;
}

.image-picker-panel header span {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
}

.image-picker-panel header h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
}

.image-picker-panel header p {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.image-picker-panel header button {
  background: #f8fafc;
  border-radius: 999px;
  color: #64748b;
  height: 38px;
  width: 38px;
}

.igdb-search-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.igdb-search-row input {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  min-height: 44px;
  padding: 0 14px;
}

.igdb-search-row button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  padding: 0 18px;
}

.target-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.target-strip button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #334155;
  display: grid;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  gap: 2px;
  min-width: 132px;
  padding: 9px 12px;
  text-align: left;
}

.target-strip button.active {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.target-strip small {
  color: #64748b;
  font-size: 10px;
}

.igdb-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.igdb-filter-tabs button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
}

.igdb-filter-tabs button.active {
  background: #f5f3ff;
  border-color: #a855f7;
  color: #7c3aed;
}

.igdb-filter-tabs span {
  background: rgba(124, 58, 237, 0.12);
  border-radius: 999px;
  color: inherit;
  font-size: 10px;
  min-width: 22px;
  padding: 3px 6px;
  text-align: center;
}

.igdb-empty {
  background: #f8fafc;
  border-radius: 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
  padding: 24px;
  text-align: center;
}

.igdb-gallery {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  overflow-y: auto;
  padding-right: 4px;
}

.igdb-gallery article {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 8px;
  overflow: hidden;
  padding: 8px;
}

.igdb-gallery article.selected {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.igdb-gallery img {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  object-fit: cover;
  width: 100%;
}

.igdb-gallery div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.igdb-gallery span,
.igdb-gallery strong {
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.igdb-gallery strong {
  color: #9333ea;
}

.igdb-gallery button {
  background: #f5f3ff;
  border-radius: 10px;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
  min-height: 34px;
}

.app-toast {
  align-items: center;
  background: #111827;
  border-radius: 999px;
  bottom: 32px;
  box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
  color: #ffffff;
  display: flex;
  gap: 12px;
  left: 50%;
  padding: 12px 18px;
  position: fixed;
  transform: translateX(-50%);
  z-index: 2400;
}

.app-toast-icon {
  align-items: center;
  background: #22c55e;
  border-radius: 999px;
  display: flex;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.app-toast-icon.delete {
  background: #ef4444;
}

.editor-loading-cover {
  background: rgba(255, 255, 255, 0.72);
}

@media (max-width: 1240px) {
  .editor-layout,
  .preview-collapsed .editor-layout {
    grid-template-columns: minmax(280px, 0.9fr) minmax(420px, 1.1fr);
  }

  .preview-column {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .post-editor-modal {
    padding: 0;
  }

  .post-editor-panel {
    border-radius: 0;
    height: 100dvh;
    max-width: 100vw;
    width: 100vw;
  }

  .editor-topbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 12px;
  }

  .editor-title-block h2 {
    font-size: 15px;
  }

  .editor-title-block p {
    font-size: 10px;
  }

  .back-btn {
    font-size: 0;
    height: 38px;
    padding: 0;
    width: 38px;
  }

  .back-btn i {
    font-size: 13px;
  }

  .editor-actions-top .utility-btn,
  .editor-actions-top .draft-btn,
  .publish-top-btn {
    display: none;
  }

  .mobile-stepper {
    background: #ffffff;
    border-bottom: 1px solid #eef2f7;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 10px 14px;
  }

  .mobile-stepper button {
    align-items: center;
    color: #64748b;
    display: grid;
    font-size: 10px;
    font-weight: 850;
    gap: 4px;
    justify-items: center;
  }

  .mobile-stepper span {
    align-items: center;
    background: #e2e8f0;
    border-radius: 999px;
    display: flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .mobile-stepper button.active {
    color: #9333ea;
  }

  .mobile-stepper button.active span {
    background: #9333ea;
    color: #ffffff;
  }

  .editor-layout,
  .preview-collapsed .editor-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
    padding: 16px;
  }

  .editor-column {
    overflow: visible;
    padding-right: 0;
  }

  .mobile-hidden {
    display: none;
  }

  .cover-actions,
  .analysis-criteria-grid,
  .analysis-pros-cons,
  .post-section-card {
    grid-template-columns: 1fr;
  }

  .post-section-card {
    align-items: stretch;
  }

  .post-section-card > img {
    height: 150px;
  }

  .section-card-actions {
    display: flex;
    flex-wrap: wrap;
    grid-template-columns: none;
  }

  .image-picker-panel {
    border-radius: 0;
    max-height: 100dvh;
    max-width: 100vw;
    width: 100vw;
  }

  .igdb-search-row {
    grid-template-columns: 1fr;
  }
}
</style>
