<script setup>
import { computed, nextTick, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
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
const sourceType = computed(() => route.query.type === 'event' ? 'event' : 'post')

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
  '--logo-bottom': selectedFormat.value === 'square' ? '26px' : '34px',
  '--logo-width': selectedFormat.value === 'square' ? '280px' : '320px'
}))
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

onBeforeUpdate(() => {
  cardRefs.value = []
})

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
    await waitForImages(target)
    const dataUrl = await toPng(target, {
      cacheBust: true,
      includeQueryParams: true,
      pixelRatio: 1,
      width: exportSize.value.width,
      height: exportSize.value.height,
      backgroundColor: '#050816',
      imagePlaceholder: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'
    })

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

    for (const [index, target] of cardRefs.value.entries()) {
      if (!target) continue
      exportProgress.value = {
        current: index + 1,
        total: carouselSlides.value.length,
        label: `Generando imagen ${index + 1} de ${carouselSlides.value.length}`
      }
      await waitForImages(target)
      const dataUrl = await toPng(target, {
        cacheBust: true,
        includeQueryParams: true,
        pixelRatio: 1,
        width: exportSize.value.width,
        height: exportSize.value.height,
        backgroundColor: '#050816',
        imagePlaceholder: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'
      })

      triggerDownload(dataUrl, fileName(index))
      await wait(650)
    }
  } catch (err) {
    error.value = 'No se pudo generar el carrusel. Revisa que las imagenes permitan exportacion.'
  } finally {
    isDownloading.value = false
    exportProgress.value = { current: 0, total: 0, label: '' }
  }
}

function fileName(index = 0) {
  const slide = carouselSlides.value[index]
  return `${String(index + 1).padStart(2, '0')}-${slugify(slide?.title || title.value)}-${selectedFormat.value}.png`
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

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
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
        <button type="button" class="share-primary" :disabled="!post || isDownloading" @click="downloadCarousel">
          <i :class="isDownloading ? 'fas fa-circle-notch fa-spin' : 'fas fa-download'"></i>
          {{ isDownloading ? `Descargando ${exportProgress.current || 1}/${exportProgress.total || carouselSlides.length}` : 'Descargar carrusel' }}
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
        >
          <div class="share-card-viewport" :style="previewStyle">
            <div class="share-card-scale" :style="previewScaleStyle">
              <article
                :ref="(el) => setCardRef(el, index)"
                class="social-card"
                :class="{ analysis: isAnalysisPost }"
                :style="cardStyle"
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

                <div class="social-card-top">
                  <div class="social-author">
                    <span class="social-author-icon">
                      <img v-if="authorIcon" :src="authorIcon" alt="" />
                      <b v-else>{{ author.charAt(0).toUpperCase() }}</b>
                    </span>
                    <div>
                      <strong>{{ author }}</strong>
                      <small>{{ createdAtLabel }}</small>
                    </div>
                  </div>

                  <div v-if="slide.showScore" class="social-score">
                    <strong>{{ slide.score }}</strong>
                    <span>Nota</span>
                  </div>
                </div>

                <div class="social-card-copy">
                  <span class="social-category">
                    <i class="fas fa-gamepad"></i>
                    {{ slide.eyebrow }}
                  </span>
                  <h2>{{ slide.title }}</h2>
                  <p>{{ slide.description }}</p>
                </div>

                <div v-if="!slide.isLast" class="social-next-cue">
                  <span>Siguiente</span>
                  <i class="fas fa-arrow-right"></i>
                </div>

                <div class="social-card-footer">
                  <span class="social-cta">Leela en la web</span>
                  <strong>{{ slide.number }} / {{ slide.total }}</strong>
                </div>

                <img class="social-brand-logo" :src="galaxyLogo" alt="Galaxia Nintendera" />
              </article>
            </div>
          </div>

          <button type="button" class="slide-download-btn" :disabled="isDownloading" @click="downloadPng(index)">
            <i class="fas fa-download"></i>
            Descargar PNG
          </button>
        </div>
      </div>
    </section>
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
  justify-content: center;
  max-height: calc(100vh - 210px);
  overflow: auto;
  padding: 28px;
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

.share-card-scale {
  left: 0;
  position: absolute;
  top: 0;
  transform-origin: top left;
}

.slide-download-btn {
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
}

.slide-download-btn:disabled {
  cursor: wait;
  opacity: 0.55;
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
  background:
    linear-gradient(180deg, rgba(5, 8, 22, 0.28) 0%, rgba(5, 8, 22, 0.04) 34%, rgba(5, 8, 22, 0.48) 58%, rgba(5, 8, 22, 0.9) 100%),
    linear-gradient(90deg, rgba(88, 28, 135, 0.22), rgba(236, 72, 153, 0.08), rgba(5, 8, 22, 0.22));
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
  padding: 86px 82px 0;
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
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.16);
  border-radius: 16px;
  box-shadow: 0 22px 48px rgba(88, 28, 135, 0.3);
  display: inline-flex;
  font-size: 25px;
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
  color: #ffffff;
  font-size: var(--copy-title-size);
  font-weight: 950;
  line-height: 1.04;
  margin: 0;
  max-height: var(--copy-title-max);
  overflow: hidden;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.social-card-copy p {
  color: #f8fafc;
  font-size: var(--copy-text-size);
  font-weight: 850;
  line-height: 1.22;
  margin: 34px 0 0;
  max-height: var(--copy-text-max);
  max-width: 820px;
  overflow: hidden;
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.48);
}

.social-next-cue {
  align-items: center;
  background: rgba(15, 23, 42, 0.72);
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34);
  color: #ffffff;
  display: inline-flex;
  font-size: 24px;
  font-weight: 950;
  gap: 0;
  height: 76px;
  justify-content: center;
  padding: 0;
  position: absolute;
  right: 40px;
  top: var(--next-top);
  transform: translateY(-50%);
  text-transform: uppercase;
  width: 76px;
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
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  display: flex;
  height: 56px;
  justify-content: center;
  width: 56px;
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
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border: 3px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  box-shadow: 0 22px 60px rgba(249, 115, 22, 0.32);
  color: #ffffff;
  display: inline-flex;
  font-size: 29px;
  font-weight: 950;
  max-width: 650px;
  padding: 25px 34px;
}

.social-card-footer strong {
  color: rgba(255, 255, 255, 0.72);
  font-size: 30px;
  font-weight: 950;
  text-transform: uppercase;
}

.social-brand-logo {
  bottom: var(--logo-bottom);
  background: rgba(5, 8, 22, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  box-sizing: content-box;
  height: 90px;
  left: 50%;
  object-fit: contain;
  padding: 12px 24px;
  position: absolute;
  transform: translateX(-50%);
  width: var(--logo-width);
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
