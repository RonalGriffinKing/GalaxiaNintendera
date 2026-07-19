<script setup>
import { computed, nextTick, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { resolveProfileIcon } from '@/services/profileProgress'
import fallbackCover from '@/iconos/Banner.png'
import galaxyLogo from '@/iconos/logo.png'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

const route = useRoute()
const router = useRouter()
const post = ref(null)
const authorProfile = ref(null)
const isLoading = ref(true)
const isDownloading = ref(false)
const error = ref('')
const cardRefs = ref([])
const selectedFormat = ref('story')
const brokenImages = ref({})
const imageCacheNonce = ref(Date.now())
const exportProgress = ref({ current: 0, total: 0, label: '' })
const editorOpen = ref(false)
const selectedSlideIndex = ref(0)
const applyScope = ref('all')
const selectedTemplate = ref('official')
const activeDrawerSection = ref('logo')
const sourceType = computed(() => route.query.type === 'event' ? 'event' : 'post')

const fontOptions = [
  { label: 'Galaxia', value: 'Inter, system-ui, sans-serif' },
  { label: 'Impacto', value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { label: 'Editorial', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Compacta', value: '"Arial Narrow", Arial, sans-serif' }
]

const arrowIcons = [
  { label: 'Flecha', value: 'fa-arrow-right' },
  { label: 'Chevron', value: 'fa-chevron-right' },
  { label: 'Plus', value: 'fa-plus' }
]

const defaultTemplateSettings = {
  logo: { visible: true, size: 120, x: 50, y: 34, opacity: 1 },
  author: { visible: true, avatar: true, name: true, date: true, size: 100, x: 82, y: 86, opacity: 1 },
  arrow: { visible: true, icon: 'fa-arrow-right', size: 96, color: '#9333ea', x: 34, y: 56, opacity: 1 },
  part: { visible: true, color: '#8b5cf6', text: '', size: 25, radius: 16 },
  title: { size: 82, weight: 950, color: '#ffffff', width: 820, line: 1.04, spacing: 34 },
  subtitle: { visible: false, size: 25, color: '#ffffff', lines: 1 },
  description: { size: 40, color: '#f8fafc', lines: 3 },
  button: { visible: true, text: 'Leela en la web', color: '#f97316', radius: 999, y: 126 },
  number: { visible: true, color: '#ffffff', size: 30 },
  overlay: { color: '#050816', intensity: 0.9, height: 100, gradient: true },
  typography: { family: 'Inter, system-ui, sans-serif' }
}

const templatePresets = {
  official: {
    label: 'Galaxia Oficial',
    settings: defaultTemplateSettings
  },
  minimal: {
    label: 'Minimal',
    settings: {
      ...defaultTemplateSettings,
      author: { ...defaultTemplateSettings.author, visible: false },
      arrow: { ...defaultTemplateSettings.arrow, visible: false },
      part: { ...defaultTemplateSettings.part, color: '#111827', size: 22 },
      title: { ...defaultTemplateSettings.title, size: 72, width: 760, spacing: 24 },
      description: { ...defaultTemplateSettings.description, size: 32, lines: 2 },
      button: { ...defaultTemplateSettings.button, visible: false },
      overlay: { ...defaultTemplateSettings.overlay, intensity: 0.78 }
    }
  },
  instagram: {
    label: 'Instagram',
    settings: {
      ...defaultTemplateSettings,
      logo: { ...defaultTemplateSettings.logo, size: 132 },
      arrow: { ...defaultTemplateSettings.arrow, size: 104, color: '#ec4899' },
      part: { ...defaultTemplateSettings.part, color: '#ec4899', radius: 999 },
      title: { ...defaultTemplateSettings.title, size: 78, line: 1.02 },
      button: { ...defaultTemplateSettings.button, color: '#ec4899' }
    }
  },
  tiktok: {
    label: 'TikTok',
    settings: {
      ...defaultTemplateSettings,
      logo: { ...defaultTemplateSettings.logo, x: 88, y: 46, size: 112 },
      author: { ...defaultTemplateSettings.author, x: 58, y: 58, size: 90 },
      arrow: { ...defaultTemplateSettings.arrow, color: '#22d3ee', size: 108 },
      part: { ...defaultTemplateSettings.part, color: '#22d3ee', radius: 999 },
      title: { ...defaultTemplateSettings.title, size: 76, width: 780 },
      button: { ...defaultTemplateSettings.button, color: '#22d3ee' }
    }
  }
}

const globalTemplateSettings = ref(loadStoredTemplate() || cloneSettings(defaultTemplateSettings))
const slideTemplateOverrides = ref({})

const formats = {
  story: {
    label: 'Vertical 9:16',
    detail: '1080 x 1920',
    width: 1080,
    height: 1920,
    scale: 0.28
  },
  portrait: {
    label: 'Feed 3:4',
    detail: '1080 x 1440',
    width: 1080,
    height: 1440,
    scale: 0.34
  },
  square: {
    label: 'Cuadrado 1:1',
    detail: '1080 x 1080',
    width: 1080,
    height: 1080,
    scale: 0.43
  }
}

const coverImage = computed(() => post.value?.coverImage || post.value?.image || fallbackCover)
const category = computed(() => post.value?.category || 'Nintendo')
const author = computed(() => post.value?.author || post.value?.authorName || 'Redaccion Galaxia')
const authorIcon = computed(() => authorProfile.value ? resolveProfileIcon(authorProfile.value) : '')
const title = computed(() => post.value?.title || 'Post sin titulo')
const description = computed(() => {
  const source = post.value?.subtitle || post.value?.description || post.value?.excerpt || post.value?.content || ''
  return trimText(stripHtml(source), 145)
})
const score = computed(() => post.value?.score ?? post.value?.analysis?.score ?? null)
const hasScore = computed(() => {
  const normalizedCategory = normalize(category.value)
  return score.value !== null && (normalizedCategory.includes('analisis') || normalizedCategory.includes('review'))
})
const isAnalysisPost = computed(() => Boolean(post.value?.analysis) || normalize(category.value).includes('analisis'))
const createdAtLabel = computed(() => formatDate(post.value?.createdAt))
const activeFormat = computed(() => formats[selectedFormat.value] || formats.story)
const exportSize = computed(() => ({ width: activeFormat.value.width, height: activeFormat.value.height }))
const cardStyle = computed(() => ({
  width: `${exportSize.value.width}px`,
  height: `${exportSize.value.height}px`,
  '--card-height': `${exportSize.value.height}px`,
  '--safe-bottom': selectedFormat.value === 'square' ? '104px' : '126px',
  '--copy-bottom': selectedFormat.value === 'square' ? '210px' : '310px',
  '--copy-title-size': selectedFormat.value === 'square' ? '58px' : '82px',
  '--copy-title-max': selectedFormat.value === 'square' ? '300px' : '520px',
  '--copy-text-size': selectedFormat.value === 'square' ? '28px' : '40px',
  '--copy-text-max': selectedFormat.value === 'square' ? '132px' : '250px',
  '--next-top': selectedFormat.value === 'square' ? '52%' : '56%',
  '--logo-bottom': selectedFormat.value === 'square' ? '26px' : '34px'
}))
const selectedSlide = computed(() => carouselSlides.value[selectedSlideIndex.value] || carouselSlides.value[0])
const previewStyle = computed(() => ({
  width: `${exportSize.value.width * activeFormat.value.scale}px`,
  height: `${exportSize.value.height * activeFormat.value.scale}px`
}))
const previewScaleStyle = computed(() => ({
  transform: `scale(${activeFormat.value.scale})`
}))
const imageIssueMessage = computed(() => {
  const failed = Object.values(brokenImages.value).filter(Boolean)
  if (!failed.length) return ''
  return `Hay ${failed.length} imagen${failed.length === 1 ? '' : 'es'} que no se pueden usar como fondo. Sube esas imagenes a Firebase/tu servidor o usa URLs directas con permisos CORS.`
})
const carouselSlides = computed(() => {
  if (!post.value) return []

  const baseSlide = {
    id: 'resumen',
    eyebrow: category.value,
    title: title.value,
    subtitle: post.value?.subtitle || category.value,
    description: description.value,
    image: coverImage.value,
    score: score.value,
    showScore: hasScore.value
  }

  const sectionSlides = Array.isArray(post.value.sections)
    ? post.value.sections
        .filter(section => section?.title || section?.content || section?.image)
        .map((section, index) => ({
          id: `seccion-${index + 1}`,
          eyebrow: `Parte ${index + 1}`,
          title: section.title || title.value,
          subtitle: section.subtitle || section.category || category.value,
          description: trimText(stripHtml(section.content || description.value), 230),
          image: section.image || coverImage.value,
          score: null,
          showScore: false
        }))
    : []

  return [baseSlide, ...sectionSlides].map((slide, index, slides) => ({
    ...slide,
    index,
    number: index + 1,
    total: slides.length,
    isLast: index === slides.length - 1
  }))
})

onMounted(loadPost)
watch([() => route.params.id, () => route.query.type], loadPost)
watch(() => carouselSlides.value.length, (length) => {
  if (!length) {
    selectedSlideIndex.value = 0
    return
  }
  selectedSlideIndex.value = Math.min(selectedSlideIndex.value, length - 1)
})

onBeforeUpdate(() => {
  cardRefs.value = []
})

function selectSlide(index) {
  selectedSlideIndex.value = index
}

function settingsForSlide(index) {
  return mergeSettings(globalTemplateSettings.value, slideTemplateOverrides.value[index] || {})
}

function activeEditSettings() {
  if (applyScope.value === 'all') return globalTemplateSettings.value

  const index = selectedSlideIndex.value
  if (!slideTemplateOverrides.value[index]) {
    slideTemplateOverrides.value = {
      ...slideTemplateOverrides.value,
      [index]: cloneSettings(globalTemplateSettings.value)
    }
  }
  return slideTemplateOverrides.value[index]
}

function settingValue(path) {
  return getByPath(applyScope.value === 'all'
    ? globalTemplateSettings.value
    : settingsForSlide(selectedSlideIndex.value), path)
}

function setSetting(path, value) {
  const target = activeEditSettings()
  setByPath(target, path, value)
  if (applyScope.value === 'all') {
    globalTemplateSettings.value = { ...target }
  } else {
    slideTemplateOverrides.value = {
      ...slideTemplateOverrides.value,
      [selectedSlideIndex.value]: { ...target }
    }
  }
}

function applyPreset(key) {
  selectedTemplate.value = key
  if (key === 'custom') {
    const custom = loadStoredTemplate()
    if (custom) globalTemplateSettings.value = custom
    return
  }

  const preset = templatePresets[key]
  if (!preset) return
  globalTemplateSettings.value = cloneSettings(preset.settings)
}

function saveCustomTemplate() {
  localStorage.setItem('galaxia-social-template', JSON.stringify(globalTemplateSettings.value))
  selectedTemplate.value = 'custom'
}

function resetTemplate() {
  selectedTemplate.value = 'official'
  globalTemplateSettings.value = cloneSettings(defaultTemplateSettings)
  slideTemplateOverrides.value = {}
}

function toggleDrawerSection(section) {
  activeDrawerSection.value = activeDrawerSection.value === section ? '' : section
}

function cardStyleFor(index) {
  const settings = settingsForSlide(index)
  return {
    ...cardStyle.value,
    '--template-font-family': settings.typography.family,
    '--author-x': `${settings.author.x}px`,
    '--author-y': `${settings.author.y}px`,
    '--author-scale': settings.author.size / 100,
    '--author-opacity': settings.author.opacity,
    '--arrow-x': `${settings.arrow.x}px`,
    '--arrow-y': `${settings.arrow.y}%`,
    '--arrow-size': `${settings.arrow.size}px`,
    '--arrow-inner-size': `${Math.round(settings.arrow.size * 0.77)}px`,
    '--arrow-color': settings.arrow.color,
    '--arrow-opacity': settings.arrow.opacity,
    '--part-color': settings.part.color,
    '--part-size': `${settings.part.size}px`,
    '--part-radius': `${settings.part.radius}px`,
    '--copy-title-size': `${settings.title.size}px`,
    '--copy-title-weight': settings.title.weight,
    '--copy-title-color': settings.title.color,
    '--copy-title-width': `${settings.title.width}px`,
    '--copy-title-line': settings.title.line,
    '--subtitle-size': `${settings.subtitle.size}px`,
    '--subtitle-color': settings.subtitle.color,
    '--subtitle-lines': settings.subtitle.lines,
    '--copy-text-size': `${settings.description.size}px`,
    '--copy-text-color': settings.description.color,
    '--copy-text-lines': settings.description.lines,
    '--copy-text-margin': `${settings.title.spacing}px`,
    '--button-color': settings.button.color,
    '--button-radius': `${settings.button.radius}px`,
    '--safe-bottom': `${settings.button.y}px`,
    '--number-color': settings.number.color,
    '--number-size': `${settings.number.size}px`,
    '--overlay-opacity': settings.overlay.intensity,
    '--overlay-height': `${settings.overlay.height}%`,
    '--overlay-gradient': overlayGradient(settings.overlay),
    '--logo-bottom': `${settings.logo.y}px`,
    '--logo-left': `${settings.logo.x}%`,
    '--logo-size': `${settings.logo.size}px`,
    '--logo-opacity': settings.logo.opacity
  }
}

function labelForPart(slide, index) {
  const text = settingsForSlide(index).part.text
  if (!text) return slide.eyebrow
  return text
    .replace('{n}', slide.number)
    .replace('{total}', slide.total)
}

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings))
}

function mergeSettings(base, override) {
  const merged = cloneSettings(base)
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...(merged[key] || {}), ...value }
    } else {
      merged[key] = value
    }
  })
  return merged
}

function getByPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source)
}

function setByPath(source, path, value) {
  const keys = path.split('.')
  const last = keys.pop()
  const target = keys.reduce((node, key) => {
    node[key] = { ...(node[key] || {}) }
    return node[key]
  }, source)
  target[last] = value
}

function loadStoredTemplate() {
  try {
    const stored = localStorage.getItem('galaxia-social-template')
    return stored ? mergeSettings(defaultTemplateSettings, JSON.parse(stored)) : null
  } catch (err) {
    return null
  }
}

function overlayGradient(overlay) {
  const color = overlay.color || '#050816'
  if (!overlay.gradient) return color
  return `linear-gradient(180deg, ${hexToRgba(color, 0.22)} 0%, ${hexToRgba(color, 0.04)} ${100 - overlay.height}%, ${hexToRgba(color, overlay.intensity)} 100%), linear-gradient(90deg, rgba(88, 28, 135, 0.22), rgba(236, 72, 153, 0.08), rgba(5, 8, 22, 0.22))`
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '#050816').replace('#', '')
  const value = clean.length === 3
    ? clean.split('').map(char => char + char).join('')
    : clean.padEnd(6, '0').slice(0, 6)
  const number = Number.parseInt(value, 16)
  const red = (number >> 16) & 255
  const green = (number >> 8) & 255
  const blue = number & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

async function loadPost() {
  isLoading.value = true
  error.value = ''

  try {
    const snap = await getDoc(doc(db, sourceType.value === 'event' ? 'galaxyEvents' : 'posts', route.params.id))
    if (!snap.exists()) {
      error.value = sourceType.value === 'event' ? 'No se encontro el evento.' : 'No se encontro el post.'
      return
    }

    post.value = normalizeShareSource({ id: snap.id, ...snap.data() })
    brokenImages.value = {}
    imageCacheNonce.value = Date.now()
    await loadAuthorProfile()
  } catch (err) {
    error.value = sourceType.value === 'event' ? 'No se pudo cargar el evento.' : 'No se pudo cargar el post.'
  } finally {
    isLoading.value = false
  }
}

function normalizeShareSource(data) {
  if (sourceType.value !== 'event') return data

  const startsAt = getTime(data.startsAt)
  const dateLabel = startsAt
    ? new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(startsAt))
    : ''

  return {
    ...data,
    category: data.type || 'Evento',
    image: data.backgroundUrl || data.imageUrl || fallbackCover,
    coverImage: data.backgroundUrl || data.imageUrl || fallbackCover,
    subtitle: dateLabel ? `${dateLabel} | Galaxia Nintendera` : 'Evento de Galaxia Nintendera',
    content: data.description || 'No te pierdas este evento de Galaxia Nintendera.',
    author: 'Galaxia Nintendera'
  }
}

async function loadAuthorProfile() {
  if (!post.value?.authorId) return

  const snap = await getDoc(doc(db, 'users', post.value.authorId)).catch(() => null)
  if (snap?.exists()) {
    authorProfile.value = { id: snap.id, ...snap.data() }
  }
}

function setCardRef(el, index) {
  if (el) cardRefs.value[index] = el
}

function markImageBroken(slide) {
  brokenImages.value = {
    ...brokenImages.value,
    [slide.id]: slide.image
  }
}

function slideImage(slide) {
  return brokenImages.value[slide.id] ? fallbackCover : proxiedImageUrl(slide.image)
}

function proxiedImageUrl(value) {
  if (!value || typeof window === 'undefined') return value || fallbackCover
  if (isLocalOrInlineImage(value)) return value

  return `/.netlify/functions/image-proxy?url=${encodeURIComponent(value)}&cb=${imageCacheNonce.value}`
}

function isLocalOrInlineImage(value) {
  const source = String(value)
  if (source.startsWith('data:') || source.startsWith('blob:')) return true
  if (source.startsWith('/')) return true

  try {
    const url = new URL(source, window.location.origin)
    return url.origin === window.location.origin
  } catch (error) {
    return true
  }
}

async function downloadPng(index = 0) {
  const target = cardRefs.value[index]
  if (!target || isDownloading.value) return

  isDownloading.value = true
  try {
    await nextTick()
    await document.fonts?.ready
    const dataUrl = await renderSlidePng(target)
    triggerDownload(dataUrl, fileName(index))
  } catch (err) {
    error.value = 'No se pudo generar el PNG. Revisa que la imagen de portada permita exportacion.'
  } finally {
    isDownloading.value = false
  }
}

async function downloadCarousel() {
  if (!cardRefs.value.length || isDownloading.value) return

  isDownloading.value = true
  error.value = ''
  exportProgress.value = {
    current: 0,
    total: carouselSlides.value.length,
    label: 'Preparando carrusel'
  }

  try {
    await nextTick()
    await document.fonts?.ready
    const zip = new JSZip()

    for (const [index, target] of cardRefs.value.entries()) {
      if (!target) continue
      exportProgress.value = {
        current: index + 1,
        total: carouselSlides.value.length,
        label: `Generando imagen ${index + 1} de ${carouselSlides.value.length}`
      }
      const dataUrl = await renderSlidePng(target)
      zip.file(zipSlideFileName(index), dataUrl.split(',')[1], { base64: true })
    }

    exportProgress.value = {
      current: carouselSlides.value.length,
      total: carouselSlides.value.length,
      label: 'Comprimiendo carrusel'
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipUrl = URL.createObjectURL(zipBlob)
    triggerDownload(zipUrl, zipFileName(), true)
  } catch (err) {
    error.value = 'No se pudo generar el carrusel. Revisa que las imagenes permitan exportacion.'
  } finally {
    isDownloading.value = false
    exportProgress.value = { current: 0, total: 0, label: '' }
  }
}

async function renderSlidePng(target) {
  await waitForImages(target)
  return toPng(target, {
    cacheBust: true,
    includeQueryParams: true,
    pixelRatio: 1,
    width: exportSize.value.width,
    height: exportSize.value.height,
    backgroundColor: '#050816',
    imagePlaceholder: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'
  })
}

function fileName(index = 0) {
  const slide = carouselSlides.value[index]
  return `${String(index + 1).padStart(2, '0')}-${slugify(slide?.title || title.value)}-${selectedFormat.value}.png`
}

function zipSlideFileName(index = 0) {
  return `slide-${String(index + 1).padStart(2, '0')}.png`
}

function zipFileName() {
  return `${slugify(title.value || 'galaxia-nintendera')}-${selectedFormat.value}-carrusel.zip`
}

function triggerDownload(href, download, revoke = false) {
  const link = document.createElement('a')
  link.download = download
  link.href = href
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  if (revoke) {
    window.setTimeout(() => URL.revokeObjectURL(href), 10000)
  }
}

async function waitForImages(root) {
  const images = [...root.querySelectorAll('img')]
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve()
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', resolve, { once: true })
      window.setTimeout(resolve, 4500)
    })
  }))
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function trimText(value, maxLength) {
  if (!value) return 'Toda la actualidad Nintendo, reviews y comunidad en un solo lugar.'
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trim()}...`
}

function formatDate(value) {
  const time = getTime(value)
  if (!time) return 'Reciente'

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(time))
}

function getTime(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  return value?.toDate?.().getTime?.() || new Date(value).getTime()
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'post'
}
</script>

<template>
  <main class="post-share-page">
    <GalaxyLoader
      v-if="isDownloading"
      class="share-export-loader"
      title="Generando carrusel"
      :text="exportProgress.label || 'Preparando imagenes sociales.'"
    />

    <header class="share-toolbar">
      <div>
        <span>Imagen social</span>
        <h1>Generar imagen social</h1>
      </div>

      <div class="share-toolbar-actions">
        <button type="button" class="share-secondary" @click="router.push('/admin/posts')">
          <i class="fas fa-arrow-left"></i>
          Volver
        </button>
        <button type="button" class="share-secondary" :disabled="!post" @click="editorOpen = true">
          <i class="fas fa-sliders"></i>
          Editar plantilla
        </button>
        <button type="button" class="share-primary" :disabled="!post || isDownloading" @click="downloadCarousel">
          <i :class="isDownloading ? 'fas fa-circle-notch fa-spin' : 'fas fa-download'"></i>
          {{ isDownloading ? `Generando ${exportProgress.current || 1}/${exportProgress.total || carouselSlides.length}` : `Descargar ZIP (${carouselSlides.length} imagenes)` }}
        </button>
      </div>
    </header>

    <section v-if="isLoading" class="share-state">
      <i class="fas fa-circle-notch fa-spin"></i>
      <strong>Cargando post...</strong>
    </section>

    <section v-else-if="error && !post" class="share-state">
      <i class="fas fa-triangle-exclamation"></i>
      <strong>{{ error }}</strong>
    </section>

    <section v-else class="share-workbench">
      <p v-if="error" class="share-error">{{ error }}</p>
      <p v-if="imageIssueMessage" class="share-warning">{{ imageIssueMessage }}</p>

      <div class="format-switcher" aria-label="Formato de exportacion">
        <button
          v-for="(format, key) in formats"
          :key="key"
          type="button"
          :class="{ active: selectedFormat === key }"
          @click="selectedFormat = key"
        >
          <strong>{{ format.label }}</strong>
          <span>{{ format.detail }}</span>
        </button>
      </div>

      <div class="share-preview">
        <div
          v-for="(slide, index) in carouselSlides"
          :key="`${post?.id || 'post'}-${selectedFormat}-${slide.id}-${slide.image}`"
          class="share-slide-shell"
          :class="{ active: selectedSlideIndex === index }"
        >
          <div class="share-card-viewport" :style="previewStyle">
            <div class="share-card-scale" :style="previewScaleStyle">
              <article
                :ref="(el) => setCardRef(el, index)"
                class="social-card"
                :class="{ analysis: isAnalysisPost }"
                :style="cardStyleFor(index)"
              >
                <img
                  :key="`${slide.id}-${slideImage(slide)}`"
                  class="social-card-bg"
                  :src="slideImage(slide)"
                  crossorigin="anonymous"
                  alt=""
                  @error="markImageBroken(slide)"
                />
                <div class="social-card-scrim"></div>
                <div class="social-card-glow"></div>
                <div v-if="isAnalysisPost" class="analysis-gold-pattern" aria-hidden="true">
                  <span v-for="tile in 24" :key="tile">GOLD</span>
                </div>

                <div v-if="settingsForSlide(index).author.visible" class="social-card-top">
                  <div class="social-author">
                    <span v-if="settingsForSlide(index).author.avatar" class="social-author-icon">
                      <img v-if="authorIcon" :src="authorIcon" alt="" />
                      <b v-else>{{ author.charAt(0).toUpperCase() }}</b>
                    </span>
                    <div>
                      <strong v-if="settingsForSlide(index).author.name">{{ author }}</strong>
                      <small v-if="settingsForSlide(index).author.date">{{ createdAtLabel }}</small>
                    </div>
                  </div>

                  <div v-if="slide.showScore" class="social-score">
                    <strong>{{ slide.score }}</strong>
                    <span>Nota</span>
                  </div>
                </div>

                <div class="social-card-copy">
                  <span v-if="settingsForSlide(index).part.visible" class="social-category">
                    <i class="fas fa-gamepad"></i>
                    {{ labelForPart(slide, index) }}
                  </span>
                  <h2>{{ slide.title }}</h2>
                  <small v-if="settingsForSlide(index).subtitle.visible" class="social-subtitle">{{ slide.subtitle }}</small>
                  <p>{{ slide.description }}</p>
                </div>

                <div v-if="!slide.isLast && settingsForSlide(index).arrow.visible" class="social-next-cue">
                  <span>Siguiente</span>
                  <i :class="['fas', settingsForSlide(index).arrow.icon]"></i>
                </div>

                <div class="social-card-footer">
                  <span v-if="settingsForSlide(index).button.visible" class="social-cta">{{ settingsForSlide(index).button.text }}</span>
                  <strong v-if="settingsForSlide(index).number.visible">{{ slide.number }} / {{ slide.total }}</strong>
                </div>

                <img v-if="settingsForSlide(index).logo.visible" class="social-brand-logo" :src="galaxyLogo" alt="Galaxia Nintendera" />
              </article>
            </div>
          </div>
        </div>
      </div>

      <div class="share-filmstrip" aria-label="Seleccion de diapositiva">
        <button
          v-for="(slide, index) in carouselSlides"
          :key="`thumb-${slide.id}`"
          type="button"
          :class="{ active: selectedSlideIndex === index }"
          @click="selectSlide(index)"
        >
          <img :src="slideImage(slide)" alt="" />
          <span>{{ index + 1 }}</span>
        </button>
      </div>
    </section>

    <aside v-if="editorOpen" class="template-drawer" aria-label="Editor de plantilla">
      <div class="drawer-head">
        <div>
          <span>Editor visual</span>
          <h2>Editar plantilla</h2>
        </div>
        <button type="button" @click="editorOpen = false">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="drawer-panel">
        <label class="drawer-label">Plantilla</label>
        <select :value="selectedTemplate" @change="applyPreset($event.target.value)">
          <option v-for="(preset, key) in templatePresets" :key="key" :value="key">{{ preset.label }}</option>
          <option value="custom">Personalizada</option>
        </select>
        <div class="drawer-actions">
          <button type="button" @click="saveCustomTemplate">Guardar personalizada</button>
          <button type="button" @click="resetTemplate">Restablecer</button>
        </div>
      </div>

      <div class="drawer-panel drawer-scope">
        <span class="drawer-label">Aplicar cambios a</span>
        <div class="scope-switch">
          <button type="button" :class="{ active: applyScope === 'all' }" @click="applyScope = 'all'">
            <i class="fas fa-layer-group"></i>
            Todas
            <small>{{ carouselSlides.length }} imagenes</small>
          </button>
          <button type="button" :class="{ active: applyScope === 'single' }" @click="applyScope = 'single'">
            <i class="fas fa-image"></i>
            Solo esta
            <small>Slide {{ selectedSlide?.number || 1 }}</small>
          </button>
        </div>
        <div class="editing-target" :class="{ single: applyScope === 'single' }">
          <img v-if="selectedSlide" :src="slideImage(selectedSlide)" alt="" />
          <div>
            <strong>{{ applyScope === 'all' ? 'Editando todo el carrusel' : `Editando slide ${selectedSlide?.number || 1}` }}</strong>
            <small>{{ applyScope === 'all' ? 'Los cambios afectan a todas las imagenes.' : 'Los cambios afectan solo a la miniatura seleccionada.' }}</small>
          </div>
        </div>
      </div>

      <div class="drawer-sections">
        <details :open="activeDrawerSection === 'logo'">
          <summary @click.prevent="toggleDrawerSection('logo')">Logo Galaxia</summary>
          <label><input type="checkbox" :checked="settingValue('logo.visible')" @change="setSetting('logo.visible', $event.target.checked)" /> Mostrar logo</label>
          <label>Tamano <input type="range" min="60" max="220" :value="settingValue('logo.size')" @input="setSetting('logo.size', Number($event.target.value))" /></label>
          <label>Posicion X <input type="range" min="5" max="95" :value="settingValue('logo.x')" @input="setSetting('logo.x', Number($event.target.value))" /></label>
          <label>Margen inferior <input type="range" min="0" max="180" :value="settingValue('logo.y')" @input="setSetting('logo.y', Number($event.target.value))" /></label>
          <label>Opacidad <input type="range" min="0" max="1" step="0.05" :value="settingValue('logo.opacity')" @input="setSetting('logo.opacity', Number($event.target.value))" /></label>
        </details>

        <details :open="activeDrawerSection === 'author'">
          <summary @click.prevent="toggleDrawerSection('author')">Autor</summary>
          <label><input type="checkbox" :checked="settingValue('author.visible')" @change="setSetting('author.visible', $event.target.checked)" /> Mostrar autor</label>
          <label><input type="checkbox" :checked="settingValue('author.avatar')" @change="setSetting('author.avatar', $event.target.checked)" /> Avatar</label>
          <label><input type="checkbox" :checked="settingValue('author.name')" @change="setSetting('author.name', $event.target.checked)" /> Nombre</label>
          <label><input type="checkbox" :checked="settingValue('author.date')" @change="setSetting('author.date', $event.target.checked)" /> Fecha</label>
          <label>Tamano <input type="range" min="60" max="140" :value="settingValue('author.size')" @input="setSetting('author.size', Number($event.target.value))" /></label>
          <label>Posicion X <input type="range" min="20" max="240" :value="settingValue('author.x')" @input="setSetting('author.x', Number($event.target.value))" /></label>
          <label>Posicion Y <input type="range" min="20" max="220" :value="settingValue('author.y')" @input="setSetting('author.y', Number($event.target.value))" /></label>
        </details>

        <details :open="activeDrawerSection === 'arrow'">
          <summary @click.prevent="toggleDrawerSection('arrow')">Flecha</summary>
          <label><input type="checkbox" :checked="settingValue('arrow.visible')" @change="setSetting('arrow.visible', $event.target.checked)" /> Mostrar flecha</label>
          <label>Icono <select :value="settingValue('arrow.icon')" @change="setSetting('arrow.icon', $event.target.value)"><option v-for="icon in arrowIcons" :key="icon.value" :value="icon.value">{{ icon.label }}</option></select></label>
          <label>Color <input type="color" :value="settingValue('arrow.color')" @input="setSetting('arrow.color', $event.target.value)" /></label>
          <label>Tamano <input type="range" min="56" max="150" :value="settingValue('arrow.size')" @input="setSetting('arrow.size', Number($event.target.value))" /></label>
          <label>Posicion <input type="range" min="25" max="75" :value="settingValue('arrow.y')" @input="setSetting('arrow.y', Number($event.target.value))" /></label>
        </details>

        <details :open="activeDrawerSection === 'part'">
          <summary @click.prevent="toggleDrawerSection('part')">Etiqueta Parte</summary>
          <label><input type="checkbox" :checked="settingValue('part.visible')" @change="setSetting('part.visible', $event.target.checked)" /> Mostrar etiqueta</label>
          <label>Texto <input :value="settingValue('part.text')" placeholder="{n}/{total}" @input="setSetting('part.text', $event.target.value)" /></label>
          <label>Color <input type="color" :value="settingValue('part.color')" @input="setSetting('part.color', $event.target.value)" /></label>
          <label>Tamano <input type="range" min="16" max="44" :value="settingValue('part.size')" @input="setSetting('part.size', Number($event.target.value))" /></label>
          <label>Bordes <input type="range" min="0" max="999" :value="settingValue('part.radius')" @input="setSetting('part.radius', Number($event.target.value))" /></label>
        </details>

        <details :open="activeDrawerSection === 'text'">
          <summary @click.prevent="toggleDrawerSection('text')">Texto</summary>
          <label>Fuente <select :value="settingValue('typography.family')" @change="setSetting('typography.family', $event.target.value)"><option v-for="font in fontOptions" :key="font.value" :value="font.value">{{ font.label }}</option></select></label>
          <label>Titulo tamano <input type="range" min="42" max="110" :value="settingValue('title.size')" @input="setSetting('title.size', Number($event.target.value))" /></label>
          <label>Titulo peso <input type="range" min="500" max="950" step="50" :value="settingValue('title.weight')" @input="setSetting('title.weight', Number($event.target.value))" /></label>
          <label>Titulo color <input type="color" :value="settingValue('title.color')" @input="setSetting('title.color', $event.target.value)" /></label>
          <label>Ancho maximo <input type="range" min="480" max="920" :value="settingValue('title.width')" @input="setSetting('title.width', Number($event.target.value))" /></label>
          <label>Interlineado <input type="range" min="0.9" max="1.35" step="0.01" :value="settingValue('title.line')" @input="setSetting('title.line', Number($event.target.value))" /></label>
          <label><input type="checkbox" :checked="settingValue('subtitle.visible')" @change="setSetting('subtitle.visible', $event.target.checked)" /> Mostrar subtitulo</label>
          <label>Subtitulo tamano <input type="range" min="16" max="44" :value="settingValue('subtitle.size')" @input="setSetting('subtitle.size', Number($event.target.value))" /></label>
          <label>Subtitulo color <input type="color" :value="settingValue('subtitle.color')" @input="setSetting('subtitle.color', $event.target.value)" /></label>
          <label>Subtitulo lineas <input type="range" min="1" max="3" :value="settingValue('subtitle.lines')" @input="setSetting('subtitle.lines', Number($event.target.value))" /></label>
          <label>Descripcion tamano <input type="range" min="22" max="54" :value="settingValue('description.size')" @input="setSetting('description.size', Number($event.target.value))" /></label>
          <label>Descripcion color <input type="color" :value="settingValue('description.color')" @input="setSetting('description.color', $event.target.value)" /></label>
          <label>Maximo lineas <input type="range" min="1" max="6" :value="settingValue('description.lines')" @input="setSetting('description.lines', Number($event.target.value))" /></label>
        </details>

        <details :open="activeDrawerSection === 'button'">
          <summary @click.prevent="toggleDrawerSection('button')">Boton y numeracion</summary>
          <label><input type="checkbox" :checked="settingValue('button.visible')" @change="setSetting('button.visible', $event.target.checked)" /> Mostrar boton</label>
          <label>Texto <input :value="settingValue('button.text')" @input="setSetting('button.text', $event.target.value)" /></label>
          <label>Color <input type="color" :value="settingValue('button.color')" @input="setSetting('button.color', $event.target.value)" /></label>
          <label>Radio <input type="range" min="0" max="999" :value="settingValue('button.radius')" @input="setSetting('button.radius', Number($event.target.value))" /></label>
          <label>Posicion inferior <input type="range" min="70" max="220" :value="settingValue('button.y')" @input="setSetting('button.y', Number($event.target.value))" /></label>
          <label><input type="checkbox" :checked="settingValue('number.visible')" @change="setSetting('number.visible', $event.target.checked)" /> Mostrar numeracion</label>
          <label>Color numeracion <input type="color" :value="settingValue('number.color')" @input="setSetting('number.color', $event.target.value)" /></label>
          <label>Tamano numeracion <input type="range" min="18" max="44" :value="settingValue('number.size')" @input="setSetting('number.size', Number($event.target.value))" /></label>
        </details>

        <details :open="activeDrawerSection === 'overlay'">
          <summary @click.prevent="toggleDrawerSection('overlay')">Overlay</summary>
          <label>Color <input type="color" :value="settingValue('overlay.color')" @input="setSetting('overlay.color', $event.target.value)" /></label>
          <label>Intensidad <input type="range" min="0" max="1" step="0.05" :value="settingValue('overlay.intensity')" @input="setSetting('overlay.intensity', Number($event.target.value))" /></label>
          <label>Altura <input type="range" min="35" max="100" :value="settingValue('overlay.height')" @input="setSetting('overlay.height', Number($event.target.value))" /></label>
          <label><input type="checkbox" :checked="settingValue('overlay.gradient')" @change="setSetting('overlay.gradient', $event.target.checked)" /> Degradado</label>
        </details>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.post-share-page {
  background:
    radial-gradient(circle at 15% 16%, rgba(147, 51, 234, 0.38), transparent 28%),
    radial-gradient(circle at 86% 12%, rgba(236, 72, 153, 0.3), transparent 26%),
    #050816;
  color: #ffffff;
  min-height: 100vh;
  padding: 108px 18px 42px;
}

.share-export-loader {
  inset: 0;
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: 120px;
  position: fixed;
  z-index: 5000;
}

.share-toolbar {
  align-items: center;
  display: flex;
  gap: 18px;
  justify-content: space-between;
  margin: 0 auto 24px;
  max-width: 1280px;
}

.share-toolbar span {
  color: #c4b5fd;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.share-toolbar h1 {
  color: #ffffff;
  font-size: 24px;
  font-weight: 950;
}

.share-toolbar-actions {
  display: flex;
  gap: 10px;
}

.share-primary,
.share-secondary {
  align-items: center;
  border-radius: 12px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
}

.share-primary {
  background: linear-gradient(to right, #9333ea, #ec4899);
  color: #ffffff;
}

.share-primary:disabled {
  cursor: wait;
  opacity: 0.68;
}

.share-secondary {
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.share-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.share-workbench {
  margin: 0 auto;
  max-width: 1280px;
}

.format-switcher {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  overflow-x: auto;
}

.format-switcher button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 2px;
  min-width: 150px;
  padding: 10px 12px;
  text-align: left;
}

.format-switcher button.active {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.95), rgba(236, 72, 153, 0.9));
  border-color: rgba(255, 255, 255, 0.2);
}

.format-switcher strong {
  font-size: 12px;
  font-weight: 950;
}

.format-switcher span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  font-weight: 850;
}

.share-preview {
  align-items: flex-start;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  display: flex;
  gap: 18px;
  justify-content: flex-start;
  max-height: calc(100vh - 210px);
  overflow: auto;
  padding: 28px;
  scroll-padding: 28px;
}

.share-filmstrip {
  background: rgba(7, 10, 26, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  gap: 10px;
  margin-top: 14px;
  overflow-x: auto;
  padding: 14px;
}

.share-filmstrip button {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  flex: 0 0 78px;
  height: 112px;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.share-filmstrip button.active {
  border-color: #c026d3;
  box-shadow: 0 0 0 2px rgba(192, 38, 211, 0.38);
}

.share-filmstrip img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.share-filmstrip span {
  align-items: center;
  background: rgba(15, 23, 42, 0.86);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  height: 24px;
  justify-content: center;
  left: 6px;
  position: absolute;
  top: 6px;
  width: 24px;
}

.share-slide-shell {
  display: grid;
  flex: 0 0 auto;
  gap: 12px;
  justify-items: center;
}

.share-card-viewport {
  overflow: hidden;
  position: relative;
}

.share-slide-shell.active .share-card-viewport {
  box-shadow: 0 0 0 3px #c026d3, 0 18px 54px rgba(192, 38, 211, 0.28);
}

.share-card-scale {
  left: 0;
  position: absolute;
  top: 0;
  transform-origin: top left;
}

.share-state {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 0 auto;
  max-width: 720px;
  min-height: 220px;
}

.share-error {
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 8px;
  color: #fecaca;
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 12px;
  padding: 12px 14px;
}

.share-warning {
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.34);
  border-radius: 8px;
  color: #fde68a;
  font-size: 13px;
  font-weight: 850;
  margin-bottom: 12px;
  padding: 12px 14px;
}

.social-card {
  background: #050816;
  color: #ffffff;
  flex: 0 0 auto;
  font-family: var(--template-font-family);
  overflow: hidden;
  position: relative;
}

.social-card-bg {
  height: 100%;
  inset: 0;
  object-fit: cover;
  object-position: center top;
  opacity: 0.98;
  position: absolute;
  width: 100%;
}

.social-card-scrim {
  background: var(--overlay-gradient);
  inset: 0;
  position: absolute;
}

.social-card.analysis .social-card-scrim {
  background:
    linear-gradient(180deg, rgba(22, 14, 3, 0.38) 0%, rgba(22, 14, 3, 0.06) 32%, rgba(43, 25, 5, 0.56) 58%, rgba(15, 10, 2, 0.94) 100%),
    linear-gradient(90deg, rgba(120, 72, 8, 0.34), rgba(250, 204, 21, 0.1), rgba(22, 14, 3, 0.32));
}

.social-card-glow {
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 213, 74, 0.08), transparent 22%),
    radial-gradient(circle at 78% 10%, rgba(168, 85, 247, 0.2), transparent 28%),
    radial-gradient(circle at 82% 80%, rgba(236, 72, 153, 0.22), transparent 24%);
  inset: 0;
  position: absolute;
}

.social-card.analysis .social-card-glow {
  background:
    radial-gradient(circle at 82% 10%, rgba(250, 204, 21, 0.44), transparent 32%),
    radial-gradient(circle at 12% 78%, rgba(180, 83, 9, 0.34), transparent 28%),
    radial-gradient(circle at 54% 52%, rgba(255, 213, 74, 0.12), transparent 34%);
}

.analysis-gold-pattern {
  color: rgba(255, 255, 255, 0.08);
  display: grid;
  font-size: 104px;
  font-weight: 950;
  gap: 40px;
  grid-template-columns: repeat(3, 1fr);
  inset: -60px;
  letter-spacing: 0;
  line-height: 0.9;
  overflow: hidden;
  position: absolute;
  text-transform: uppercase;
  transform: rotate(-18deg);
  z-index: 1;
}

.social-card-top,
.social-card-copy,
.social-card-footer,
.social-brand-logo {
  position: relative;
  z-index: 2;
}

.social-card-top {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  left: var(--author-x);
  opacity: var(--author-opacity);
  padding: 0;
  position: absolute;
  right: 82px;
  top: var(--author-y);
  transform: scale(var(--author-scale));
  transform-origin: top left;
}

.social-author {
  align-items: center;
  background: rgba(17, 24, 39, 0.76);
  border: 2px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  display: flex;
  gap: 18px;
  max-width: 640px;
  padding: 14px 28px 14px 14px;
}

.social-author-icon {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border: 5px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  display: flex;
  flex: 0 0 auto;
  font-size: 34px;
  font-weight: 950;
  height: 82px;
  justify-content: center;
  overflow: hidden;
  width: 82px;
}

.social-author-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.social-author-icon b {
  font-size: 34px;
  font-weight: 950;
}

.social-author strong {
  display: block;
  font-size: 28px;
  font-weight: 950;
  line-height: 1.1;
  text-transform: uppercase;
}

.social-author small {
  color: #e5e7eb;
  display: block;
  font-size: 21px;
  font-weight: 900;
  margin-top: 4px;
}

.social-score {
  align-items: center;
  background: rgba(10, 10, 18, 0.92);
  border: 2px solid rgba(250, 204, 21, 0.72);
  border-radius: 34px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
  color: #facc15;
  display: flex;
  flex-direction: column;
  height: 168px;
  justify-content: center;
  width: 168px;
}

.social-card.analysis .social-score {
  background: linear-gradient(180deg, rgba(70, 43, 5, 0.98), rgba(25, 18, 5, 0.94));
  border-color: rgba(250, 204, 21, 0.9);
  box-shadow: 0 28px 80px rgba(250, 204, 21, 0.18);
}

.social-score strong {
  font-size: 78px;
  font-weight: 950;
  line-height: 0.9;
}

.social-score span {
  color: #fff7ad;
  font-size: 21px;
  font-weight: 950;
  margin-top: 12px;
  text-transform: uppercase;
}

.social-card-copy {
  bottom: var(--copy-bottom);
  left: 82px;
  max-width: 880px;
  position: absolute;
}

.social-category {
  align-items: center;
  background: linear-gradient(135deg, var(--part-color), #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--part-radius);
  box-shadow: 0 22px 48px rgba(88, 28, 135, 0.3);
  display: inline-flex;
  font-size: var(--part-size);
  font-weight: 950;
  gap: 14px;
  margin-bottom: 32px;
  max-width: 760px;
  overflow-wrap: anywhere;
  padding: 18px 28px;
  text-transform: uppercase;
}

.social-card.analysis .social-category {
  background: linear-gradient(135deg, #a16207, #facc15);
  border-color: rgba(254, 240, 138, 0.4);
  box-shadow: 0 22px 48px rgba(250, 204, 21, 0.22);
  color: #ffffff;
}

.social-card-copy h2 {
  color: var(--copy-title-color);
  font-size: var(--copy-title-size);
  font-weight: var(--copy-title-weight);
  line-height: var(--copy-title-line);
  margin: 0;
  max-width: var(--copy-title-width);
  max-height: var(--copy-title-max);
  overflow: hidden;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.social-subtitle {
  color: var(--subtitle-color);
  display: -webkit-box;
  font-size: var(--subtitle-size);
  font-weight: 900;
  line-height: 1.16;
  margin-top: 18px;
  max-width: var(--copy-title-width);
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--subtitle-lines);
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.48);
}

.social-card-copy p {
  color: var(--copy-text-color);
  display: -webkit-box;
  font-size: var(--copy-text-size);
  font-weight: 850;
  line-height: 1.22;
  margin: var(--copy-text-margin) 0 0;
  max-width: 820px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--copy-text-lines);
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.48);
}

.social-next-cue {
  align-items: center;
  background: rgba(15, 23, 42, 0.82);
  border: 3px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  box-shadow: 0 28px 74px rgba(0, 0, 0, 0.46), 0 0 0 10px rgba(147, 51, 234, 0.18);
  color: #ffffff;
  display: inline-flex;
  font-size: calc(var(--arrow-size) * 0.34);
  font-weight: 950;
  gap: 0;
  height: var(--arrow-size);
  justify-content: center;
  padding: 0;
  position: absolute;
  opacity: var(--arrow-opacity);
  right: var(--arrow-x);
  top: var(--arrow-y);
  transform: translateY(-50%);
  text-transform: uppercase;
  width: var(--arrow-size);
  z-index: 2;
}

.social-next-cue span {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.social-next-cue i {
  align-items: center;
  background: linear-gradient(135deg, var(--arrow-color), #ec4899);
  border-radius: 999px;
  display: flex;
  height: var(--arrow-inner-size);
  justify-content: center;
  width: var(--arrow-inner-size);
}

.social-card.analysis .social-next-cue i,
.social-card.analysis .social-cta {
  background: linear-gradient(135deg, #a16207, #f59e0b);
}

.social-card-footer {
  align-items: center;
  bottom: var(--safe-bottom);
  display: flex;
  gap: 24px;
  justify-content: space-between;
  left: 82px;
  position: absolute;
  right: 82px;
}

.social-cta {
  background: linear-gradient(135deg, #f59e0b, var(--button-color));
  border: 3px solid rgba(255, 255, 255, 0.24);
  border-radius: var(--button-radius);
  box-shadow: 0 22px 60px rgba(249, 115, 22, 0.32);
  color: #ffffff;
  display: inline-flex;
  font-size: 29px;
  font-weight: 950;
  max-width: 650px;
  padding: 25px 34px;
}

.social-card-footer strong {
  color: var(--number-color);
  font-size: var(--number-size);
  font-weight: 950;
  text-transform: uppercase;
}

.social-brand-logo {
  bottom: var(--logo-bottom);
  height: var(--logo-size);
  left: var(--logo-left);
  object-fit: contain;
  opacity: var(--logo-opacity);
  position: absolute;
  transform: translateX(-50%);
  width: var(--logo-size);
}

.template-drawer {
  background: rgba(7, 10, 26, 0.96);
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  bottom: 0;
  box-shadow: -28px 0 80px rgba(0, 0, 0, 0.42);
  color: #ffffff;
  display: grid;
  gap: 14px;
  grid-template-rows: auto auto auto 1fr;
  padding: 22px;
  position: fixed;
  right: 0;
  top: 0;
  width: min(420px, 100vw);
  z-index: 5100;
}

.drawer-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.drawer-head span,
.drawer-label {
  color: #c4b5fd;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.drawer-head h2 {
  font-size: 22px;
  font-weight: 950;
  margin: 4px 0 0;
}

.drawer-head button,
.drawer-actions button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  font-weight: 900;
  min-height: 36px;
  padding: 0 12px;
}

.drawer-panel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.drawer-panel select,
.drawer-sections select,
.drawer-sections input:not([type="checkbox"]):not([type="range"]):not([type="color"]) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  color: #ffffff;
  min-height: 38px;
  padding: 0 10px;
}

.drawer-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}

.drawer-sections label {
  align-items: start;
  color: rgba(255, 255, 255, 0.86);
  display: grid;
  font-size: 12px;
  font-weight: 850;
  gap: 7px;
  line-height: 1.2;
}

.drawer-sections label:has(input[type="checkbox"]) {
  align-items: center;
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.drawer-sections label:has(input[type="color"]) {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.drawer-scope {
  border-color: rgba(192, 38, 211, 0.34);
}

.scope-switch {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: grid;
  gap: 6px;
  grid-template-columns: 1fr 1fr;
  padding: 5px;
}

.scope-switch button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.68);
  display: grid;
  font-size: 12px;
  font-weight: 950;
  gap: 4px;
  justify-items: center;
  min-height: 66px;
  padding: 8px;
}

.scope-switch button.active {
  background: linear-gradient(135deg, #7c3aed, #d946ef);
  color: #ffffff;
  box-shadow: 0 12px 34px rgba(192, 38, 211, 0.28);
}

.scope-switch small {
  color: inherit;
  font-size: 10px;
  opacity: 0.72;
}

.editing-target {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 44px 1fr;
  padding: 9px;
}

.editing-target.single {
  border-color: rgba(192, 38, 211, 0.42);
  box-shadow: inset 3px 0 0 #c026d3;
}

.editing-target img {
  border-radius: 8px;
  height: 58px;
  object-fit: cover;
  width: 44px;
}

.editing-target strong {
  display: block;
  font-size: 12px;
  font-weight: 950;
}

.editing-target small {
  color: rgba(255, 255, 255, 0.58);
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 3px;
}

.drawer-panel small {
  color: rgba(255, 255, 255, 0.54);
  font-size: 11px;
  font-weight: 800;
}

.drawer-sections {
  align-content: start;
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding: 0 4px 22px 0;
}

.drawer-sections details {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: visible;
  padding: 0;
}

.drawer-sections summary {
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 48px;
  letter-spacing: 0;
  padding: 0 12px;
  text-transform: uppercase;
}

.drawer-sections details[open] {
  display: grid;
  gap: 14px;
  padding: 0 12px 18px;
}

.drawer-sections details[open] summary {
  margin: 0 -12px;
}

.drawer-sections input[type="range"] {
  accent-color: #c026d3;
  cursor: pointer;
  height: 22px;
  width: 100%;
}

.drawer-sections input[type="color"] {
  background: transparent;
  border: 0;
  cursor: pointer;
  height: 30px;
  padding: 0;
  width: 46px;
}

.drawer-sections input[type="checkbox"] {
  accent-color: #c026d3;
  height: 16px;
  width: 16px;
}

@media (max-width: 760px) {
  .post-share-page {
    padding: 92px 10px 28px;
  }

  .share-toolbar {
    align-items: stretch;
    display: grid;
  }

  .share-toolbar-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .share-primary,
  .share-secondary {
    justify-content: center;
    padding: 0 12px;
  }

  .share-preview {
    justify-content: flex-start;
    max-height: calc(100vh - 230px);
    padding: 12px;
  }
}
</style>
