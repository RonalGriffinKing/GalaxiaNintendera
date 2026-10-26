<script setup>
import ContentLoading from "@/components/shared/ContentLoading.vue"
import { computed, nextTick, onBeforeUpdate, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFontEmbedCSS, toPng } from 'html-to-image'
import JSZip from 'jszip'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { mergeSocialSettings, updateSocialSetting } from '@/services/socialTemplateState'
import { normalizeSocialContent, titleRuns } from '@/services/socialContent'
import PublicationAnimationModal from '@/components/posts/PublicationAnimationModal.vue'
import AnalysisCrown from '@/components/shared/AnalysisCrown.vue'
import SocialVisualInspector from '@/components/posts/SocialVisualInspector.vue'
import { resolveProfileIcon } from '@/services/profileProgress'

import fallbackCover from '@/iconos/Banner.png'
import galaxyLogo from '@/iconos/logo.png'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'
import { imageDragOffset, imagePanLimits, constrainImagePan } from '@/services/socialImageDrag'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { pngWithThemeMetadata } from '@/services/visualThemePng'
import SeasonalThemeDecor from '@/components/posts/SeasonalThemeDecor.vue'
import { themeDecoration, DEFAULT_VISUAL_THEME, isLegacyTheme, socialThemeSettings, socialThemeCss, visualThemeExportManifest } from '@/services/visualThemes'

const route = useRoute()
const router = useRouter()
const animationOpen = ref(false)
const animationElement = () => cardRefs.value[selectedSlideIndex.value]
const post = ref(null)
const {theme:assignedTheme,enabled:themeEnabled}=useVisualThemes(()=>post.value)
const renderedTheme=ref(DEFAULT_VISUAL_THEME)
const authorProfile = ref(null)
const isLoading = ref(true)
const isDownloading = ref(false)
const error = ref('')
const cardRefs = ref([])
const sharePreview = ref(null)
const renderedCards = () => [...(sharePreview.value?.querySelectorAll('.social-card') || [])]
const selectedFormat = ref('story')
const socialMargins = ref(true)
const brokenImages = ref({})
const imageDimensions=ref({})
function recordImageSize(event,slide){const img=event.target;if(img.naturalWidth)imageDimensions.value[slide.id]={naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}}
function panLimitsFor(index){
 const settings=settingsForSlide(index),slide=carouselSlides.value[index]
 const img=sharePreview.value?.querySelectorAll('.social-card')[index]?.querySelector('.social-card-bg')
 const dimensions=img?.naturalWidth?{naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}:imageDimensions.value[slide?.id]
 return imagePanLimits({...exportSize.value,...dimensions,scale:settings.image.scale,cropX:settings.image.x})
}

const imageCacheNonce = ref(Date.now())
const exportProgress = ref({ current: 0, total: 0, label: '' })
const editorViewport = ref({ width: window.innerWidth, height: window.innerHeight })
const updateEditorViewport = () => { editorViewport.value = { width: window.innerWidth, height: window.innerHeight } }
const editorOpen = ref(false)
const selectedElement = ref('title')
const selectionHandle = ref(null)
const textWidthHandles = ref(null)
const textOverflow = ref(false)
const centerGuide = ref(false)
const savedTemplates = ref([])
const templateNotice = ref('')
const undoStack = ref([])
const redoStack = ref([])
let visualDrag = null
let exportFontCache = null
const stylePickerOpen = ref(false)
const selectedSlideIndex = ref(0)
const applyScope = ref('single')
const selectedStyle = ref('editorial')
const selectedTemplate = ref('official')
const activeDrawerSection = ref('image')
const globalImageOverride = ref('')
const slideImageOverrides = ref({})
const slideTextOverrides = ref({})
const slideHighlightOverrides = ref({})
const slideCtaOverrides = ref({})
const slideDescriptionOverrides = ref({})
const slidePointsOverrides = ref({})
const fitNotice = ref('')
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
  image: { visible: true, brightness: 100, contrast: 100, saturation: 100, blur: 0, scale: 100, x: 50, y: 0 },
  logo: { visible: false, size: 120, x: 50, y: 34, opacity: 1 },
  gameLogo: { visible: false, url: '', size: 220, x: 50, y: 150, opacity: 1 },
  coverGameLogo: { size: 450, x: 50, y: 120 },
  author: { visible: false, avatar: true, name: true, date: true, size: 100, x: 82, y: 86, opacity: 1 },
  arrow: { visible: true, icon: 'fa-arrow-right', foregroundColor: '#ffffff', size: 96, color: '#f5e9ff', endColor: '#ec4899', gradient: true, x: 34, y: 56, opacity: 1 },
  part: { visible: true, foregroundColor: null, color: '#8b5cf6', endColor: '#5b21cf', gradient: true, text: '', size: 30, radius: 999 },
  title: { visible: true, highlightColor: '#facc15', size: 88, weight: 950, color: '#ffffff', width: 916, line: 1.08, spacing: 26 },
  subtitle: { visible: false, size: 25, color: '#ffffff', lines: 1 },
  brand: { visible: true, size: 32 },
  cta: { visible: true, size: 40, color: '#ffc02b' },
  progress: { visible: true, color: '#facc15', endColor: '#fb7185', gradient: true },
  points: { visible: true, size: 36, gap: 22, weight: 500, line: 1.25 },
  description: { visible: true, size: 42, color: '#ede9fe', lines: 6 },
  button: { visible: false, foregroundColor: '#ffffff', text: 'Leela en la web', color: '#f97316', endColor: '#f59e0b', gradient: true, radius: 999, y: 126 },
  number: { visible: true, color: '#ffffff', size: 30 },
  score: { visible: true, size: 100 },
  overlay: { color: '#050816', endColor: '#050816', intensity: 0.9, darkness: 0, height: 100, gradient: true },
  typography: { family: 'Inter, system-ui, sans-serif' }
}

const impactTemplateSettings = mergeSettings(defaultTemplateSettings, {
  image: { y: 50 },
  logo: { visible: false, size: 112, x: 50, y: 48, opacity: 1 },
  gameLogo: { visible: false, url: '', size: 250, x: 50, y: 150, opacity: 1 },
  coverGameLogo: { size: 450, x: 50, y: 120 },
  author: { visible: false },
  arrow: { visible: true, icon: 'fa-chevron-right', size: 132, color: '#ffffff', x: 44, y: 84, opacity: 1 },
  part: { visible: false },
  title: { size: 76, weight: 950, color: '#ffffff', width: 900, line: 1.12, spacing: 0 },
  subtitle: { visible: false },
  description: { visible: true, size: 34, color: '#ffffff', lines: 2 },
  button: { visible: false },
  number: { visible: false },
  overlay: { color: '#080604', intensity: 0.52, height: 100, gradient: false },
  typography: { family: 'Inter, system-ui, sans-serif' }
})

const styleDefinitions = {
  editorial: {
    label: 'Editorial Galaxia',
    description: 'El carrusel actual con autor, etiquetas, resumen y numeracion.',
    icon: 'fa-layer-group',
    className: 'style-editorial',
    settings: defaultTemplateSettings
  },
  impact: {
    label: 'Impacto visual',
    description: 'Imagen completa, titular grande, logos opcionales y flecha circular.',
    icon: 'fa-bolt',
    className: 'style-impact',
    settings: impactTemplateSettings
  }
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

const styleSettingsStore = ref({
  editorial: cloneSettings(defaultTemplateSettings),
  impact: cloneSettings(impactTemplateSettings)
})
const styleOverridesStore = ref({ editorial: {}, impact: {} })
const globalTemplateSettings = ref(cloneSettings(styleSettingsStore.value.editorial))
const slideTemplateOverrides = ref({})
let themeBaseline=null
let previousThemePatch={}
let appliedThemeKey=''
watch([assignedTheme,()=>themeEnabled.value.social,selectedStyle,isDownloading],()=>{
  if(isDownloading.value) return
  const nextKey=JSON.stringify([assignedTheme.value,themeEnabled.value.social,selectedStyle.value])
  if(nextKey===appliedThemeKey) return
  appliedThemeKey=nextKey
  // Restore only painted values; positions, typography and editor options stay intact.
  let settings=cloneSettings(globalTemplateSettings.value)
  if(themeBaseline) {
    for(const [group,values] of Object.entries(previousThemePatch)) for(const key of Object.keys(values)) {
      if(settings[group]?.[key]===values[key]) settings[group][key]=themeBaseline[group]?.[key]
    }
  }
  themeBaseline=cloneSettings(settings)
  renderedTheme.value=themeEnabled.value.social?assignedTheme.value:DEFAULT_VISUAL_THEME
  previousThemePatch=socialThemeSettings(renderedTheme.value)
  if(Object.keys(previousThemePatch).length) settings=mergeSettings(settings,previousThemePatch)
  globalTemplateSettings.value=settings
},{immediate:true})

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
  const source = post.value?.subtitle || post.value?.summary || post.value?.description || post.value?.excerpt || post.value?.content || ''
  return stripHtml(source)
})
const socialContent = computed(() => post.value?.social || post.value?.shortVersion || post.value?.versionCorta || post.value?.version_corta || {})
const score = computed(() => post.value?.score ?? post.value?.analysis?.score ?? null)
const hasScore = computed(() => {
  const normalizedCategory = normalize(category.value)
  return score.value !== null && (normalizedCategory.includes('analisis') || normalizedCategory.includes('review'))
})
const isAnalysisPost = computed(() => ['analisis','review'].some(label => normalize(category.value).includes(label)))
const createdAtLabel = computed(() => formatDate(post.value?.createdAt))
const activeFormat = computed(() => formats[selectedFormat.value] || formats.story)
const activeStyle = computed(() => styleDefinitions[selectedStyle.value] || styleDefinitions.editorial)
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
const editingScale = computed(() => {
 if (!editorOpen.value) return activeFormat.value.scale
 const mobile = editorViewport.value.width <= 800
 const desktop = editorViewport.value.width >= 1100
 const width = Math.max(200, editorViewport.value.width - (mobile ? 50 : desktop ? 720 : 420))
 const height = Math.max(120, editorViewport.value.height - (mobile ? Math.min(350, editorViewport.value.height * .45) + 200 : 430))
 return Math.min(.5, width / exportSize.value.width, height / exportSize.value.height)
})
const previewStyle = computed(() => ({
  width: `${exportSize.value.width * editingScale.value}px`,
  height: `${exportSize.value.height * editingScale.value}px`
}))
const previewScaleStyle = computed(() => ({
  transform: `scale(${editingScale.value})`
}))
const imageIssueMessage = computed(() => {
  const failed = Object.values(brokenImages.value).filter(Boolean)
  if (!failed.length) return ''
  return `Hay ${failed.length} imagen${failed.length === 1 ? '' : 'es'} que no se pueden usar como fondo. Sube esas imagenes a Firebase/tu servidor o usa URLs directas con permisos CORS.`
})
const carouselSlides = computed(() => {
  if (!post.value) return []

  const social = normalizeSocialContent(socialContent.value)
  const socialSlides = Array.isArray(social?.slides)
    ? social.slides
    : (Array.isArray(social?.diapositivas)
        ? social.diapositivas
        : (Array.isArray(social?.sections) ? social.sections : (Array.isArray(social?.secciones) ? social.secciones : [])))

  const baseSlide = {
    id: 'resumen',
    type: 'cover',
    titleHighlights: social.titleHighlights,
    accent: social.accent,
    eyebrow: social.eyebrow || category.value,
    title: stripHtml(social.title || social.titulo || title.value),
    subtitle: social.subtitle || social.subtitulo || post.value?.subtitle || category.value,
    description: stripHtml(social.summary || social.resumen || social.content || social.contenido || social.description || description.value),
    image: social.image || social.imagen || coverImage.value,
    score: score.value,
    showScore: hasScore.value
  }

  const sections = Array.isArray(post.value.sections) ? post.value.sections : []
  const sectionSlides = socialSlides.length
    ? socialSlides.map((socialSlide, index) => {
        const indexes = Array.isArray(socialSlide.sectionIndexes) && socialSlide.sectionIndexes.length
          ? socialSlide.sectionIndexes
          : [index]
        const referencedSections = indexes
          .map(sectionIndex => sections[Number(sectionIndex)])
          .filter(section => section && section.hidden !== true)
        const primarySection = referencedSections[0] || sections[index] || {}
        const inheritedImage = referencedSections.find(section => section.image)?.image || primarySection.image || coverImage.value

        return {
          id: `social-${index + 1}`,
          type: socialSlide.type,
          titleHighlights: socialSlide.titleHighlights,
          accent: socialSlide.accent,
          cta: socialSlide.cta,
          eyebrow: socialSlide.eyebrow || primarySection.label || category.value,
          title: stripHtml(socialSlide.title || socialSlide.titulo || primarySection.title || title.value),
          subtitle: socialSlide.subtitle || socialSlide.subtitulo || primarySection.subtitle || primarySection.label || category.value,
          description: socialSlide.type === 'closing' ? stripHtml(socialSlide.content) : stripHtml(socialSlide.content || socialSlide.contenido || socialSlide.summary || socialSlide.resumen || socialSlide.description || primarySection.content || description.value),
          points: (Array.isArray(socialSlide.points) ? socialSlide.points : (Array.isArray(socialSlide.puntos) ? socialSlide.puntos : (Array.isArray(socialSlide.highlights) ? socialSlide.highlights : [])))
            .map(point => stripHtml(point))
            .filter(Boolean),
          image: socialSlide.image || socialSlide.imagen || inheritedImage,
          score: null,
          showScore: false
        }
      })
    : sections
        .filter(section => section?.hidden !== true && (section?.title || section?.content || section?.image))
        .map((section, index) => ({
          id: `seccion-${index + 1}`,
          type: 'content',
          titleHighlights: [],
          accent: 'violet',
          eyebrow: section.label || category.value,
          title: stripHtml(section.title || title.value),
          subtitle: section.subtitle || section.label || category.value,
          description: stripHtml(section.content || description.value),
          points: [],
          image: section.image || coverImage.value,
          score: null,
          showScore: false
        }))

  return [baseSlide, ...sectionSlides].map((slide, index, slides) => ({
    ...slide,
    index,
    number: index + 1,
    total: slides.length,
    isLast: index === slides.length - 1
  }))
})

onMounted(() => { loadPost(); loadTemplateLibrary(); window.addEventListener('resize', updateEditorViewport) })
onUnmounted(() => window.removeEventListener('resize', updateEditorViewport))
watch([() => route.params.id, () => route.query.type, () => route.query.ids], loadPost)
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


function designSnapshot() { return cloneSettings({ global: globalTemplateSettings.value, overrides: slideTemplateOverrides.value, texts: slideTextOverrides.value, highlights: slideHighlightOverrides.value, ctas: slideCtaOverrides.value, descriptions: slideDescriptionOverrides.value, points: slidePointsOverrides.value, images: slideImageOverrides.value, globalImage: globalImageOverride.value, format: selectedFormat.value, socialMargins: socialMargins.value, style: selectedStyle.value }) }
function rememberDesign() { undoStack.value = [...undoStack.value.slice(-49), designSnapshot()]; redoStack.value = [] }
function restoreHistory(redo) {
 const from = redo ? redoStack : undoStack; const to = redo ? undoStack : redoStack
 if (!from.value.length) return
 to.value.push(designSnapshot()); const state = from.value.pop()
 socialMargins.value = state.socialMargins !== false; selectedStyle.value = state.style || selectedStyle.value; globalTemplateSettings.value = state.global; slideTemplateOverrides.value = state.overrides; slideTextOverrides.value = state.texts; slideHighlightOverrides.value = state.highlights || {}; slideCtaOverrides.value = state.ctas || {}; slideDescriptionOverrides.value = state.descriptions || {}; slidePointsOverrides.value = state.points || {}; slideImageOverrides.value = state.images || {}; globalImageOverride.value = state.globalImage || ''; selectedFormat.value = state.format || selectedFormat.value
}
function resetSingleDesign() { rememberDesign(); const next = { ...slideTemplateOverrides.value }; delete next[selectedSlideIndex.value]; slideTemplateOverrides.value = next }
function visualElementStyle(index, key) {
 const settings = settingsForSlide(index); const savedLayout = settings['visual_' + key] || {}; const layout=key==='image'?{x:0,y:0}:savedLayout; const typography = settings[key] || {}
 return { translate: ((layout.x || 0) * exportSize.value.width / 100) + 'px ' + ((layout.y || 0) * exportSize.value.height / 100) + 'px', textAlign: typography.align || undefined, width: ['title','description','points'].includes(key) && typography.customWidth ? typography.width + 'px' : undefined, maxWidth: ['title','description','points'].includes(key) && typography.customWidth ? 'none' : undefined, scale: ['button','score'].includes(key) && typography.size ? typography.size / 100 : undefined, fontWeight: typography.weight || undefined, fontFamily: typography.family || undefined, lineHeight: typography.line || undefined, WebkitLineClamp: key === 'title' && typography.lines > 0 ? String(typography.lines) : undefined, display: key === 'title' && typography.lines > 0 ? '-webkit-box' : undefined, WebkitBoxOrient: key === 'title' && typography.lines > 0 ? 'vertical' : undefined, overflow: key === 'title' && typography.lines > 0 ? 'hidden' : undefined, color: ['title','description','points','number'].includes(key) ? typography.color || undefined : undefined, outline: editorOpen.value && !isDownloading.value && selectedSlideIndex.value === index && selectedElement.value === key ? 'var(--selection-outline, 4px solid #c084fc)' : undefined, outlineOffset: '6px', position: key === 'title' ? 'relative' : undefined }
}
function startVisualDrag(event, index, resize = false) {
 if (isDownloading.value || event.button !== 0) return
 selectedSlideIndex.value = index
 editorOpen.value = true
 const cardElement = cardRefs.value[index]
 let element = resize ? cardElement?.querySelector('[data-edit="' + selectedElement.value + '"]') : event.target.closest('[data-edit]')
 if (!element || element.dataset.edit === 'image') element = cardElement?.querySelector('.social-card-bg')
 if (!element) { selectedSlideIndex.value = index; selectedElement.value = 'overlay'; return }
 event.preventDefault(); selectedSlideIndex.value = index; selectedElement.value = element.dataset.edit || 'image'; rememberDesign()
 const card = cardElement.getBoundingClientRect(); const box = element.getBoundingClientRect(); const layout = selectedElement.value==='image'?{x:settingsForSlide(index).image.panX||0,y:0}:settingsForSlide(index)['visual_' + selectedElement.value] || {}
 visualDrag = { pointerId:event.pointerId, panLimits:panLimitsFor(index), key: selectedElement.value, startX: event.clientX, startY: event.clientY, x: selectedElement.value==='image'?constrainImagePan(layout.x,panLimitsFor(index)):layout.x || 0, y: layout.y || 0, card, box, resize, size: selectedElement.value === 'gameLogo' && selectedStyle.value === 'impact' && index === 0 ? settingsForSlide(index).coverGameLogo.size : settingsForSlide(index)[selectedElement.value]?.size || 100, width: box.width * exportSize.value.width / card.width }
 event.currentTarget.setPointerCapture(event.pointerId)
}
function moveVisualDrag(event) {
 if (!visualDrag || event.pointerId !== visualDrag.pointerId) return
 const d = visualDrag; const dx = event.clientX - d.startX; const dy = event.clientY - d.startY
 if (d.key === 'image') { const offset=imageDragOffset(d,dx,d.card,d.panLimits); setSetting('image.panX',offset.x); return }
 if (d.resize === 'width-right' || d.resize === 'width-left') {
  const left = d.resize === 'width-left'
  const width = Math.max(180, Math.min(1000, d.width + (left ? -dx : dx) * exportSize.value.width / d.card.width))
  setSetting(d.key + '.width', width)
  if (left) setSetting('visual_' + d.key + '.x', d.x + (d.width - width) / exportSize.value.width * 100)
  return
 }
 if (d.resize && ['title','description','points'].includes(d.key)) {
  const ratio = Math.max(.2, 1 + dx / Math.max(20, d.box.width))
  setSetting(d.key + '.size', Math.max(12, Math.min(150, d.size * ratio)))
  return
 }
 if (d.resize && d.key !== 'title') {
  const ratio = Math.max(0.2, 1 + dx / Math.max(20, d.box.width))
  setVisualInspectorSetting({ path: d.key + '.size', value: Math.max(16, Math.min(760, d.size * ratio)) })
  return
 }

 let x = Math.max(d.card.left - d.box.left, Math.min(d.card.right - d.box.right, dx)); let y = Math.max(d.card.top - d.box.top, Math.min(d.card.bottom - d.box.bottom, dy))
 const center = d.card.left + d.card.width / 2 - (d.box.left + d.box.width / 2); centerGuide.value = Math.abs(x - center) < 8; if (centerGuide.value) x = center
 setSetting('visual_' + d.key + '.x', d.x + x / d.card.width * 100); setSetting('visual_' + d.key + '.y', d.y + y / d.card.height * 100)
}
function stopVisualDrag() { visualDrag = null; centerGuide.value = false }
watch([globalTemplateSettings, slideTemplateOverrides, slideTextOverrides, slideHighlightOverrides, slideCtaOverrides, slideDescriptionOverrides, slidePointsOverrides, selectedSlideIndex, selectedElement, selectedFormat, socialMargins, editorOpen, editorViewport], async () => {
 await nextTick()
 const card = cardRefs.value[selectedSlideIndex.value]; const element = card?.querySelector('[data-edit="' + selectedElement.value + '"]'); const viewport = card?.closest('.share-card-viewport')
 const copy = card?.querySelector('.social-card-copy')
 const author = card?.querySelector('.social-card-top')
 const header = card?.querySelector('.network-header')
 const reservedTop = Math.max(author ? author.offsetTop + author.offsetHeight + 24 : 0, header ? header.offsetTop + header.offsetHeight + 40 : 40)
 const copyTooHigh = Boolean(copy && copy.offsetTop < reservedTop)
 const textClipped = [...(copy?.querySelectorAll('h2,p,.social-subtitle') || [])].some(node => node.scrollHeight > node.clientHeight + 2)
 textOverflow.value = copyTooHigh || textClipped
 textWidthHandles.value = null
 if (!element || !viewport || ['image','progress'].includes(selectedElement.value)) { selectionHandle.value = null; return }
 const box = element.getBoundingClientRect(); const area = viewport.getBoundingClientRect()
 if (['title','description','points'].includes(selectedElement.value)) textWidthHandles.value = { left: { left: (box.left - area.left - 6) + 'px', top: (box.top + box.height / 2 - area.top - 16) + 'px' }, right: { left: (box.right - area.left - 6) + 'px', top: (box.top + box.height / 2 - area.top - 16) + 'px' } }
 selectionHandle.value = { left: Math.max(0, Math.min(area.width - 24, box.right - area.left - 12)) + 'px', top: Math.max(0, Math.min(area.height - 24, box.bottom - area.top - 12)) + 'px' }
}, { deep: true, flush: 'post' })
function setVisualInspectorSetting({ path, value }) {
 if (path === 'gameLogo.size' && selectedStyle.value === 'impact' && selectedSlideIndex.value === 0) {
  if (applyScope.value === 'all') {
   const ratio = value / globalTemplateSettings.value.coverGameLogo.size
   setSetting('gameLogo.size', globalTemplateSettings.value.gameLogo.size * ratio)
  }
  setSetting('coverGameLogo.size', value)
 } else setSetting(path, value)
}
function resetVisualElement() {
 rememberDesign()
 const key = selectedElement.value
 const defaults = activeStyle.value.settings
 const resetKeys = [key, 'visual_' + key]
 if (key === 'gameLogo') resetKeys.push('coverGameLogo')
 const reset = target => {
  const next = cloneSettings(target)
  for (const name of resetKeys) { next[name] = defaults[name] ? cloneSettings(defaults[name]) : name.startsWith('visual_') ? { x: 0, y: 0 } : {} }
  next[key] = { ...next[key], customPaint: false }
  if (['title','description','points'].includes(key)) next[key].customWidth = false
  if (key === 'title') Object.assign(next[key], { customWidth: false, lines: 0, align: 'left', family: defaults.typography.family })
  return next
 }
 if (applyScope.value === 'all') {
  globalTemplateSettings.value = reset(globalTemplateSettings.value)
  slideTemplateOverrides.value = Object.fromEntries(Object.entries(slideTemplateOverrides.value).map(([index, value]) => { const next = cloneSettings(value); resetKeys.forEach(name => delete next[name]); return [index, next] }))
 }
 else {
  const next = { ...slideTemplateOverrides.value }
  next[selectedSlideIndex.value] = reset(next[selectedSlideIndex.value] || {})
  slideTemplateOverrides.value = next
 }
}
function elementPaint(settings, key, slide) {
 const value = settings[key]
 if (key === 'part' && slide?.accent === 'gold' && !value.customPaint) return 'linear-gradient(90deg,#ffe879,#ffb329)'
 return value.gradient === false ? value.color : 'linear-gradient(110deg,' + value.color + ',' + (value.endColor || value.color) + ')'
}
function centerVisualElement() {
 const card = cardRefs.value[selectedSlideIndex.value]; const element = card?.querySelector('[data-edit="' + selectedElement.value + '"]'); if (!element) return
 const c = card.getBoundingClientRect(); const e = element.getBoundingClientRect(); const layout = settingsForSlide(selectedSlideIndex.value)['visual_' + selectedElement.value] || {}
 setSetting('visual_' + selectedElement.value + '.x', (layout.x || 0) + (c.left + c.width / 2 - e.left - e.width / 2) / c.width * 100)
}
async function loadTemplateLibrary() {
 try { savedTemplates.value = JSON.parse(localStorage.getItem('galaxia-social-library') || '[]'); if (auth.currentUser) { const result = await getDocs(collection(db, 'users', auth.currentUser.uid, 'socialTemplates')); const merged = new Map(savedTemplates.value.map(item => [item.id, item])); result.docs.forEach(item => merged.set(item.id, { ...item.data(), id: item.id })); savedTemplates.value = [...merged.values()] } } catch { templateNotice.value = 'Plantillas disponibles en este navegador.' }
}
async function saveNamedTemplate(name) {
 if (!name.trim()) return
 const item = { id: 'template-' + Date.now(), name: name.trim(), style: selectedStyle.value, format: selectedFormat.value, socialMargins: socialMargins.value, settings: cloneSettings(globalTemplateSettings.value), overrides: cloneSettings(slideTemplateOverrides.value) }
 try { localStorage.setItem('galaxia-social-library', JSON.stringify([...savedTemplates.value, item])); savedTemplates.value.push(item); templateNotice.value = 'Plantilla guardada en este navegador.' } catch { templateNotice.value = 'No hay espacio para guardar la plantilla.'; return }
 if (auth.currentUser) { try { await setDoc(doc(db, 'users', auth.currentUser.uid, 'socialTemplates', item.id), item); templateNotice.value = 'Plantilla guardada en tu cuenta.' } catch { templateNotice.value = 'Guardada en este navegador; la cuenta no permite sincronizarla.' } }
}
function loadNamedTemplate(id) {
 const item = savedTemplates.value.find(template => template.id === id); if (!item || !styleDefinitions[item.style] || !formats[item.format]) return
 rememberDesign(); socialMargins.value = item.socialMargins !== false; selectedStyle.value = item.style; selectedFormat.value = item.format; globalTemplateSettings.value = mergeSettings(styleDefinitions[item.style].settings, item.settings); slideTemplateOverrides.value = cloneSettings(item.overrides || {})
 templateNotice.value = 'Plantilla aplicada: colores, posiciones y ajustes restaurados.'
}
function selectSlide(index) {
  selectedSlideIndex.value = index
}

function switchStyle(key) {
  if (!styleDefinitions[key] || key === selectedStyle.value) {
    stylePickerOpen.value = false
    return
  }

  styleSettingsStore.value = {
    ...styleSettingsStore.value,
    [selectedStyle.value]: cloneSettings(globalTemplateSettings.value)
  }
  styleOverridesStore.value = {
    ...styleOverridesStore.value,
    [selectedStyle.value]: cloneSettings(slideTemplateOverrides.value)
  }

  selectedStyle.value = key
  undoStack.value = []; redoStack.value = []; visualDrag = null
  globalTemplateSettings.value = cloneSettings(styleSettingsStore.value[key] || styleDefinitions[key].settings)
  slideTemplateOverrides.value = cloneSettings(styleOverridesStore.value[key] || {})
  selectedTemplate.value = key === 'editorial' ? 'official' : 'custom'
  stylePickerOpen.value = false
}

function settingsForSlide(index) {
  return mergeSettings(globalTemplateSettings.value, slideTemplateOverrides.value[index] || {})
}

function settingValue(path) {
  return getByPath(applyScope.value === 'all'
    ? globalTemplateSettings.value
    : settingsForSlide(selectedSlideIndex.value), path)
}

function setSetting(path, value) {
  if (!visualDrag) rememberDesign()
  let next = updateSocialSetting(globalTemplateSettings.value, slideTemplateOverrides.value, selectedSlideIndex.value, applyScope.value, path, value)
  if (/^(part|arrow|button|progress)\.(color|endColor|gradient)$/.test(path)) next = updateSocialSetting(next.global, next.overrides, selectedSlideIndex.value, applyScope.value, path.split('.')[0] + '.customPaint', true)
  if (/^(title|description|points)\.width$/.test(path)) next = updateSocialSetting(next.global, next.overrides, selectedSlideIndex.value, applyScope.value, path.split('.')[0] + '.customWidth', true)
  globalTemplateSettings.value = next.global
  slideTemplateOverrides.value = next.overrides
}

function applyPreset(key) {
  selectedTemplate.value = key
  if (key === 'custom') {
    const custom = loadStoredTemplate(selectedStyle.value)
    if (custom) globalTemplateSettings.value = custom
    return
  }

  const preset = templatePresets[key]
  if (!preset) return
  globalTemplateSettings.value = cloneSettings(preset.settings)
}

function saveCustomTemplate() {
  localStorage.setItem(`galaxia-social-template-${selectedStyle.value}`, JSON.stringify(globalTemplateSettings.value))
  selectedTemplate.value = 'custom'
}

function resetTemplate() {
  selectedTemplate.value = selectedStyle.value === 'editorial' ? 'official' : 'custom'
  globalTemplateSettings.value = cloneSettings(activeStyle.value.settings)
  slideTemplateOverrides.value = {}
}

function resetImageFilters() {
  const defaults = activeStyle.value.settings.image
  setSetting('image.brightness', defaults.brightness)
  setSetting('image.contrast', defaults.contrast)
  setSetting('image.saturation', defaults.saturation)
  setSetting('image.blur', defaults.blur)
  setSetting('image.scale', defaults.scale)
  setSetting('image.x', defaults.x)
  setSetting('image.y', defaults.y)
  setSetting('image.panX', 0)
}

function resetLogoLayout(group) {
  const defaults = activeStyle.value.settings[group]
  if (!defaults) return
  ;['size', 'x', 'y', 'opacity'].forEach((key) => {
    if (defaults[key] !== undefined) setSetting(`${group}.${key}`, defaults[key])
  })
}

function coverLogoValue(key) { return settingValue('coverGameLogo.' + key) }
function setCoverLogoSetting(key, value) { setSetting('coverGameLogo.' + key, value) }
function resetCoverLogoLayout() {
  for (const key of ['size', 'x', 'y']) setCoverLogoSetting(key, activeStyle.value.settings.coverGameLogo[key])
}

function resetPositions() {
  const defaults = activeStyle.value.settings
  const paths = [
    'image.x', 'image.y', 'image.panX',
    'logo.x', 'logo.y',
    'gameLogo.x', 'gameLogo.y',
    'author.x', 'author.y',
    'arrow.x', 'arrow.y',
    'button.y'
  ]
  paths.forEach(path => setSetting(path, getByPath(defaults, path) ?? 0))
  for (const key of ['title', 'description', 'logo', 'gameLogo', 'author', 'part', 'arrow', 'button', 'number', 'score']) { setSetting('visual_' + key + '.x', 0); setSetting('visual_' + key + '.y', 0) }
  setCoverLogoSetting('x', defaults.coverGameLogo.x)
  setCoverLogoSetting('y', defaults.coverGameLogo.y)
}

function displaySlideCta(slide) { return slideCtaOverrides.value[slide.id] ?? (slide.cta || 'Dejalo en los comentarios') }
function setSlideCta(value) { if (selectedSlide.value) { rememberDesign(); slideCtaOverrides.value = { ...slideCtaOverrides.value, [selectedSlide.value.id]: value } } }
function displayTitleHighlights(slide) { return slideHighlightOverrides.value[slide.id] ?? slide.titleHighlights ?? [] }
function setTitleHighlights(value) {
 if (!selectedSlide.value) return
 rememberDesign()
 slideHighlightOverrides.value = { ...slideHighlightOverrides.value, [selectedSlide.value.id]: value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) }
}
function displaySlideTitle(slide) {
  return slideTextOverrides.value[slide.id] ?? slide.title
}

function displaySlidePoints(slide) { return slidePointsOverrides.value[slide.id] ?? slide.points ?? [] }
function setSlidePoints(value) {
 const slide = selectedSlide.value
 if (!slide) return
 slidePointsOverrides.value = { ...slidePointsOverrides.value, [slide.id]: value.split(/\r?\n/) }
}
function updateTextContent(key, value) {
 rememberDesign()
 if (key === 'title') setSlideTitle(value)
 else if (key === 'points') setSlidePoints(value)
 else setSlideDescription(value)
 fitNotice.value = ''
}
async function fitSlideText() {
 rememberDesign()
 const index = selectedSlideIndex.value
 const update = (path, value) => {
  const next = updateSocialSetting(globalTemplateSettings.value, slideTemplateOverrides.value, index, 'single', path, value)
  slideTemplateOverrides.value = next.overrides
 }
 update('description.lines', 30)
 await nextTick()
 const card = cardRefs.value[index]
 const copy = card?.querySelector('.social-card-copy')
 if (!card || !copy) return
 // Reserve space below the author and above the footer/logos.
 const author = card.querySelector('.social-card-top')
 const header = card.querySelector('.network-header')
 const top = Math.max(author ? author.offsetTop + author.offsetHeight + 36 : 0, header ? header.offsetTop + header.offsetHeight + 48 : 90)
 let attempts = 0
 while (copy.offsetTop < top && attempts++ < 80) {
  const settings = settingsForSlide(index)
  const sizes = [['title',22], ['description',14], ['points',12]]
  let changed = false
  for (const [key,min] of sizes) {
   const size = settings[key]?.size || 30
   if (size > min) { update(key + '.size', Math.max(min, size - 2)); changed = true }
  }
  if (!changed) break
  await nextTick()
 }
 fitNotice.value = copy.offsetTop < top ? 'Hay demasiado texto para este formato. Acorta el contenido o elige un formato mas alto.' : 'Tamano ajustado solo en esta imagen. No se ha eliminado texto.'
}
function displaySlideDescription(slide) { return slideDescriptionOverrides.value[slide.id] ?? slide.description }
function setSlideDescription(value) { const slide = selectedSlide.value; if (slide) slideDescriptionOverrides.value = { ...slideDescriptionOverrides.value, [slide.id]: value } }
function setSlideTitle(value) {
  const slide = selectedSlide.value
  if (!slide) return
  slideTextOverrides.value = {
    ...slideTextOverrides.value,
    [slide.id]: value
  }
}

function setTemporaryImage(value) {
  rememberDesign()
  if (applyScope.value === 'all') {
    globalImageOverride.value = value
    return
  }

  slideImageOverrides.value = {
    ...slideImageOverrides.value,
    [selectedSlideIndex.value]: value
  }
}

function selectedTemporaryImage() {
  if (applyScope.value === 'all') return globalImageOverride.value
  return slideImageOverrides.value[selectedSlideIndex.value] || globalImageOverride.value || ''
}

async function handleTemporaryImageUpload(event) {
 const file = event.target.files?.[0]
 if (!file) return
 if (!file.type.startsWith('image/')) { error.value = 'Selecciona un archivo de imagen.'; return }
 try {
  const value = await new Promise((resolve,reject) => {
   const reader = new FileReader()
   reader.onload = () => resolve(reader.result)
   reader.onerror = reject
   reader.readAsDataURL(file)
  })
  setTemporaryImage(value)
  error.value = ''
 } catch { error.value = 'No se pudo cargar la imagen temporal.' }
 event.target.value = ''
}

function handleTemporaryImageUrl(event) {
  setTemporaryImage(event.target.value.trim())
}

function clearTemporaryImage() {
  rememberDesign()
  if (applyScope.value === 'all') {
    globalImageOverride.value = ''
    slideImageOverrides.value = {}
    return
  }

  const next = { ...slideImageOverrides.value }
  delete next[selectedSlideIndex.value]
  slideImageOverrides.value = next
}

function toggleDrawerSection(section) {
  activeDrawerSection.value = activeDrawerSection.value === section ? '' : section
}

function cardStyleFor(index) {
  const settings = settingsForSlide(index)
  return {
    ...cardStyle.value,
    ...socialThemeCss(renderedTheme.value),
    ...(!isLegacyTheme(renderedTheme.value) ? {
      '--theme-arrow-bg':elementPaint(settings,'arrow'),
      ...(settings.progress.customPaint ? {'--theme-progress-active':elementPaint(settings,'progress')} : {})
    } : {}),
    '--template-font-family': settings.typography.family,
    '--image-filter': `brightness(${settings.image.brightness}%) contrast(${settings.image.contrast}%) saturate(${settings.image.saturation}%) blur(${settings.image.blur}px)`,
    '--image-scale': settings.image.scale / 100,
    '--image-position-x': `calc(${settings.image.x}% + ${constrainImagePan(settings.image.panX,panLimitsFor(index))*exportSize.value.width/100/Math.max(1,settings.image.scale/100)}px)`,
    '--image-position-y': `${settings.image.y}%`,
    '--author-x': `${settings.author.x}px`,
    '--author-y': `${settings.author.y}px`,
    '--author-scale': settings.author.size / 100,
    '--author-opacity': settings.author.opacity,
    '--arrow-x': `${settings.arrow.x}px`,
    '--arrow-y': `${settings.arrow.y}%`,
    '--arrow-size': `${settings.arrow.size}px`,
    '--arrow-inner-size': `${Math.round(settings.arrow.size * 0.77)}px`,
    '--arrow-color': settings.arrow.foregroundColor || '#ffffff',
    '--button-text-color': settings.button.foregroundColor || '#ffffff',
    '--part-text-color': settings.part.foregroundColor || (carouselSlides.value[index]?.accent === 'gold' ? '#18120a' : '#ffffff'),
    '--arrow-opacity': settings.arrow.opacity,
    '--part-paint': elementPaint(settings, 'part', carouselSlides.value[index]),
    '--arrow-paint': elementPaint(settings, 'arrow'),
    '--button-paint': elementPaint(settings, 'button'),
    '--progress-paint': elementPaint(settings, 'progress'),
    '--part-color': settings.part.color,
    '--part-size': `${settings.part.size}px`,
    '--part-radius': `${settings.part.radius}px`,
    '--copy-title-size': `${settings.title.size}px`,
    '--copy-title-weight': settings.title.weight,
    '--copy-title-color': settings.title.color,
    '--title-highlight-color': settings.title.highlightColor || '#facc15',
    '--brand-size': `${settings.brand?.size || 32}px`,
    '--closing-cta-size': `${settings.cta?.size || 40}px`,
    '--closing-cta-color': settings.cta?.color || '#ffc02b',
    '--progress-color': settings.progress?.color || '#facc15',
    '--copy-title-width': `${settings.title.width}px`,
    '--copy-title-line': settings.title.line,
    '--subtitle-size': `${settings.subtitle.size}px`,
    '--subtitle-color': settings.subtitle.color,
    '--subtitle-lines': settings.subtitle.lines,
    '--copy-text-size': `${settings.description.size}px`,
    '--copy-text-color': settings.description.color,
    '--copy-text-lines': settings.description.lines,
    '--copy-text-margin': `${settings.title.spacing}px`,
    '--points-size': `${settings.points?.size || 30}px`,
    '--points-gap': `${settings.points?.gap ?? 18}px`,
    '--points-color': settings.points?.color || settings.description.color,
    '--points-weight': settings.points?.weight || 850,
    '--points-line': settings.points?.line || 1.18,
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
    '--logo-opacity': settings.logo.opacity,
    '--game-logo-bottom': `${settings.gameLogo.y}px`,
    '--game-logo-left': `${settings.gameLogo.x}%`,
    '--game-logo-size': `${settings.gameLogo.size}px`,
    '--game-logo-opacity': settings.gameLogo.opacity,
    '--cover-game-logo-top': `${settings.coverGameLogo.y}px`,
    '--cover-game-logo-left': `${settings.coverGameLogo.x}%`,
    '--cover-game-logo-size': `${settings.coverGameLogo.size}px`
  }
}

function gameLogoSource(index) {
  const value = settingsForSlide(index).gameLogo.url
  return value ? proxiedImageUrl(value) : ''
}

function labelForPart(slide, index) {
  const text = settingsForSlide(index).part.text
  if (!text) return slide.eyebrow
  return text
    .replace('{n}', slide.number)
    .replace('{total}', slide.total)
}

function cloneSettings(settings) {
  // Retire the abandoned free-moving image layer from loaded/saved templates.
  return JSON.parse(JSON.stringify(settings, (key,value) => key === 'visual_image' ? undefined : value))
}

function mergeSettings(base, override) { const settings=mergeSocialSettings(base, override);delete settings.visual_image;return settings }

function getByPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source)
}

function loadStoredTemplate(style = 'editorial') {
  try {
    const stored = localStorage.getItem(`galaxia-social-template-${style}`)
      || (style === 'editorial' ? localStorage.getItem('galaxia-social-template') : '')
    return stored ? mergeSettings(defaultTemplateSettings, JSON.parse(stored)) : null
  } catch (err) {
    return null
  }
}

function overlayGradient(overlay) {
  const color = overlay.color || '#050816'
  const end = overlay.endColor || color
  const darkness=Math.max(0,Math.min(1,Number(overlay.darkness)||0))
  const shade=hexToRgba('#000000',darkness)
  const background=overlay.gradient ? `linear-gradient(180deg, ${hexToRgba(color, 0)} 4%, ${hexToRgba(color, 0.06)} 23%, ${hexToRgba(color, overlay.intensity * .5)} 43%, ${hexToRgba(color, overlay.intensity)} 72%, ${hexToRgba(end, 1)} 100%)` : `linear-gradient(${hexToRgba(color,overlay.intensity)},${hexToRgba(color,overlay.intensity)})`
  return darkness ? `linear-gradient(${shade},${shade}),${background}` : background
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
  if(['event','events'].includes(route.query.type)){
    await router.replace({path:'/admin/event-share/'+route.params.id,query:route.query.ids?{ids:route.query.ids}:{}})
    return
  }
  isLoading.value = true
  error.value = ''

  try {
    const snap = await getDoc(doc(db, 'posts', route.params.id))
    if (!snap.exists()) {
      error.value = 'No se encontro el post.'
      return
    }

    post.value = { id: snap.id, ...snap.data() }
    brokenImages.value = {}
    imageCacheNonce.value = Date.now()
    await loadAuthorProfile()
  } catch (err) {
    error.value = 'No se pudo cargar el post.'
  } finally {
    isLoading.value = false
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
  const override = slideImageOverrides.value[slide.index] || globalImageOverride.value
  if (override) return isLocalOrInlineImage(override) ? override : proxiedImageUrl(override)
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

function exportThemeManifest() {
  return {...visualThemeExportManifest(renderedTheme.value,themeEnabled.value.social),
    requestedVisualThemeId:post.value?.visualThemeId||null,
    postId:post.value?.id,format:selectedFormat.value,style:selectedStyle.value,
    design:designSnapshot()}
}
async function downloadPng(index = 0) {
  const target = renderedCards()[index]
  if (!target || isDownloading.value) return
  const themeManifest=exportThemeManifest()
  isDownloading.value = true
  try {
    await nextTick()
    await document.fonts?.ready
    const dataUrl = await renderSlidePng(target)
    triggerDownload(pngWithThemeMetadata(dataUrl,themeManifest), fileName(index))
  } catch (err) {
    error.value = 'No se pudo generar el PNG. Revisa que la imagen de portada permita exportacion.'
  } finally {
    isDownloading.value = false
  }
}

async function downloadCarousel() {
  const targets = renderedCards()
  if (!targets.length || isDownloading.value) return
  const themeManifest=exportThemeManifest()
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
    zip.file('visual-theme.json', JSON.stringify(themeManifest,null,2))

    for (const [index, target] of targets.entries()) {
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

async function exportFontCSS(target) {
  const text = [...new Set(renderedCards().map(card => card?.textContent || '').join(''))].join('')
  if (exportFontCache?.text === text) return exportFontCache.css
  // Embed the exact faces used by the preview, including its icon font.
  // Fetching another weight range here changes text metrics only in the PNG.
  const css = await getFontEmbedCSS(target)
  exportFontCache = { text, css }
  return exportFontCache.css
}

async function renderSlidePng(target) {
  await waitForImages(target)
  return toPng(target, {
    // Hidden template controls must not reappear in the serialized SVG/PNG.
    filter: node => {
      if (node.hasAttribute?.('data-editor-ui')) return false
      if (node.nodeType !== 1) return true
      const style = getComputedStyle(node)
      return style.display !== 'none' && style.visibility !== 'hidden'
    },
    style: { '--selection-outline': 'none' },
    fontEmbedCSS: await exportFontCSS(target),
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
  <main class="post-share-page" :class="{ 'visual-editing': editorOpen }">
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

      <div class="share-toolbar-actions"><button type="button" class="share-secondary" :disabled="!post || isDownloading" @click="animationOpen=true">✦ Animar publicación</button>
        <button type="button" class="share-secondary" @click="router.push('/admin/dashboard?view=posts')">
          <i class="fas fa-arrow-left"></i>
          Volver
        </button>
        <button type="button" class="share-secondary" :disabled="!post" @click="editorOpen = true">
          <i class="fas fa-sliders"></i>
          Editar imagen
        </button>
        <button type="button" class="share-primary" :disabled="!post || !carouselSlides.length || isDownloading" @click="downloadCarousel">
          <i :class="isDownloading ? 'fas fa-circle-notch fa-spin' : 'fas fa-download'"></i>
          {{ isDownloading ? `Generando ${exportProgress.current || 1}/${exportProgress.total || carouselSlides.length}` : `Descargar ZIP (${carouselSlides.length} imagenes)` }}
        </button>
      </div>
    </header>

    <ContentLoading v-if="isLoading" variant="inline" />

    <section v-else-if="error && !post" class="share-state">
      <i class="fas fa-triangle-exclamation"></i>
      <strong>{{ error }}</strong>
    </section>

    <section v-else class="share-workbench">
<div class="social-margin-picker" role="group" aria-label="Márgenes de publicación"><strong>Márgenes</strong><button type="button" :aria-pressed="socialMargins" :disabled="isDownloading" @click="rememberDesign(); socialMargins=true">Con márgenes · TikTok</button><button type="button" :aria-pressed="!socialMargins" :disabled="isDownloading" @click="rememberDesign(); socialMargins=false">Sin márgenes</button><small>{{ socialMargins ? 'Reserva espacio para el buscador, las reacciones y la descripción.' : 'El contenido aprovecha toda la composición.' }}</small></div>
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

      <div ref="sharePreview" class="share-preview">
        <div
          v-for="(slide, index) in carouselSlides"
          :key="`${post?.id || 'post'}-${selectedStyle}-${selectedFormat}-${slide.id}-${slide.image}`"
          class="share-slide-shell" v-show="isDownloading || !editorOpen || selectedSlideIndex === index"
          :class="{ active: selectedSlideIndex === index }"
        >
          <div class="share-card-viewport" :style="previewStyle">
            <div class="share-card-scale" :style="previewScaleStyle">
              <article
                :ref="(el) => setCardRef(el, index)"
                class="social-card social-network-layout" :data-social-margins="socialMargins ? 'true' : null" :data-visual-themed="!isLegacyTheme(renderedTheme) ? 'true' : null" :data-slide-type="slide.type" :data-accent="slide.accent" :data-format="selectedFormat" @pointerdown="startVisualDrag($event, index)" @pointermove="moveVisualDrag" @pointerup="stopVisualDrag" @pointercancel="stopVisualDrag" @lostpointercapture="stopVisualDrag"
                :class="[activeStyle.className, {
                  analysis: isAnalysisPost,
                  'impact-cover': selectedStyle === 'impact' && index === 0,
                  'impact-detail': selectedStyle === 'impact' && index > 0
                }]"
                :style="cardStyleFor(index)"
              >
                <div class="network-header">
                  <strong v-if="settingsForSlide(index).brand?.visible !== false" class="network-brand" data-edit="brand" :style="visualElementStyle(index, 'brand')">GALAXIA<br />NINTENDERA</strong>
                  <div v-if="settingsForSlide(index).progress?.visible !== false" class="network-progress" data-edit="progress" :style="visualElementStyle(index, 'progress')" :aria-label="'Imagen ' + slide.number + ' de ' + slide.total"><span v-for="step in slide.total" :key="step" :class="{ filled: step <= slide.number }"></span></div>
                  <strong v-if="settingsForSlide(index).number.visible" class="network-count" data-edit="number" :style="visualElementStyle(index, 'number')">{{ slide.number }}/{{ slide.total }}</strong>
                </div>
                <img
                  v-if="settingsForSlide(index).image.visible"
                  :key="`${slide.id}-${slideImage(slide)}`"
                  class="social-card-bg" data-edit="image" :style="visualElementStyle(index, 'image')"
                  :src="slideImage(slide)"
                  crossorigin="anonymous"
                  alt=""
                  @load="recordImageSize($event,slide)"
                  @error="markImageBroken(slide)"
                />
                <div class="social-card-scrim" data-edit="image"></div>
                <div class="social-card-glow" data-edit="image"></div>
                <SeasonalThemeDecor :season="themeDecoration(renderedTheme)" />
                <div v-if="isAnalysisPost" class="analysis-gold-pattern" aria-hidden="true">
                  <span v-for="tile in 24" :key="tile">GOLD</span>
                </div>

                <div v-if="settingsForSlide(index).author.visible" class="social-card-top" data-edit="author" :style="visualElementStyle(index, 'author')">
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


                </div>

                <div v-if="slide.showScore && settingsForSlide(index).score?.visible !== false" class="social-score social-score-independent" data-edit="score" :style="visualElementStyle(index, 'score')"><AnalysisCrown class="social-score-crown" /><strong>{{ slide.score }}</strong><span>Nota / 100</span></div>

                <div class="social-card-copy" :class="{ 'has-points': displaySlidePoints(slide).filter(point => point.trim()).length }">
                  <span v-if="settingsForSlide(index).part.visible" class="social-category" data-edit="part" :style="visualElementStyle(index, 'part')">
                    <i class="fas fa-gamepad"></i>
                    <span class="social-category-label">{{ labelForPart(slide, index) }}</span>
                  </span>
                  <h2 v-if="settingsForSlide(index).title.visible !== false" data-edit="title" :style="visualElementStyle(index, 'title')"><span v-for="(run,runIndex) in titleRuns(displaySlideTitle(slide), displayTitleHighlights(slide))" :key="runIndex" :class="{ 'title-highlight': run.highlighted }">{{ run.text }}</span></h2>
                  <p data-edit="description" :style="visualElementStyle(index, 'description')" v-if="settingsForSlide(index).description.visible">{{ displaySlideDescription(slide) }}</p>
                  <ul v-if="displaySlidePoints(slide).filter(point => point.trim()).length && settingsForSlide(index).points?.visible !== false" class="social-points" data-edit="points" :style="visualElementStyle(index, 'points')">
                    <li v-for="(point, pointIndex) in displaySlidePoints(slide).filter(point => point.trim())" :key="`${slide.id}-point-${pointIndex}`">
                      <span>{{ slide.type === 'closing' ? '✦' : pointIndex + 1 }}</span>
                      <strong>{{ point }}</strong>
                    </li>
                  </ul>
                </div>

                <div v-if="!slide.isLast && settingsForSlide(index).arrow.visible" class="social-next-cue" data-edit="arrow" :style="visualElementStyle(index, 'arrow')">
                  <span>Desliza</span>
                  <svg class="network-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="settingsForSlide(index).arrow.icon === 'fa-plus' ? 'M12 5v14M5 12h14' : settingsForSlide(index).arrow.icon === 'fa-chevron-right' ? 'm9 5 7 7-7 7' : 'M4 12h16m-7-7 7 7-7 7'" /></svg>
                </div>

                <div v-if="slide.type === 'closing' && settingsForSlide(index).cta?.visible !== false" class="network-closing-cta" data-edit="cta" :style="visualElementStyle(index, 'cta')">{{ displaySlideCta(slide) }}</div>
                <div class="social-card-footer">
                  <span v-if="settingsForSlide(index).button.visible" class="social-cta" data-edit="button" :style="visualElementStyle(index, 'button')">{{ settingsForSlide(index).button.text }}</span>

                </div>

                <img v-if="settingsForSlide(index).logo.visible" class="social-brand-logo" data-edit="logo" :style="visualElementStyle(index, 'logo')" :src="galaxyLogo" alt="Galaxia Nintendera" />
                <img
                  v-if="settingsForSlide(index).gameLogo.visible && gameLogoSource(index)"
                  class="social-game-logo" data-edit="gameLogo" :style="visualElementStyle(index, 'gameLogo')"
                  :src="gameLogoSource(index)"
                  crossorigin="anonymous"
                  alt="Logo del juego"
                />
              </article>
            </div>
            <div v-if="editorOpen && centerGuide" class="visual-center-guide" data-editor-ui></div>
            <template v-if="editorOpen && !isDownloading && selectedSlideIndex === index && textWidthHandles"><button v-for="side in ['left','right']" :key="side" data-editor-ui class="visual-width-handle" :style="textWidthHandles[side]" :aria-label="side === 'left' ? 'Cambiar ancho desde la izquierda' : 'Cambiar ancho desde la derecha'" title="Arrastra para cambiar el ancho del texto" @pointerdown.stop="startVisualDrag($event, index, 'width-' + side)" @pointermove="moveVisualDrag" @pointerup="stopVisualDrag" @pointercancel="stopVisualDrag" @lostpointercapture="stopVisualDrag"></button></template>
            <button v-if="editorOpen && !isDownloading && selectedSlideIndex === index && selectionHandle" data-editor-ui class="visual-selection-handle" :style="selectionHandle" :aria-label="['title','description','points'].includes(selectedElement) ? 'Cambiar tama?o de letra' : 'Redimensionar elemento'" @pointerdown.stop="startVisualDrag($event, index, true)" @pointermove="moveVisualDrag" @pointerup="stopVisualDrag" @pointercancel="stopVisualDrag" @lostpointercapture="stopVisualDrag"></button>
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

    <PublicationAnimationModal v-if="animationOpen" :get-element="animationElement" :get-elements="() => cardRefs.filter(Boolean)" :initial-index="selectedSlideIndex" :name="title" @close="animationOpen=false"/>
    <SocialVisualInspector v-if="editorOpen" :templates="savedTemplates" :template-notice="templateNotice" @save-template="saveNamedTemplate" @load-template="loadNamedTemplate" @reset="resetVisualElement" :image-pan-limits="panLimitsFor(selectedSlideIndex)" :element="selectedElement" :scope="applyScope" :number="selectedSlide?.number || 1" :settings="settingsForSlide(selectedSlideIndex)" :title="selectedSlide ? displaySlideTitle(selectedSlide) : ''" :description="selectedSlide ? displaySlideDescription(selectedSlide) : ''" :has-score="Boolean(selectedSlide?.showScore)" :slide-type="selectedSlide?.type" :slide-accent="selectedSlide?.accent" :cta="selectedSlide ? displaySlideCta(selectedSlide) : ''" :title-highlights="selectedSlide ? displayTitleHighlights(selectedSlide) : []" :points="selectedSlide ? displaySlidePoints(selectedSlide) : []" :image="selectedSlide ? slideImage(selectedSlide) : fallbackCover" :image-url="selectedTemporaryImage()" :fonts="fontOptions" :overflow="textOverflow" :notice="fitNotice" :inert="isDownloading" :can-undo="undoStack.length > 0" :can-redo="redoStack.length > 0" @select="selectedElement = $event" @scope="applyScope = $event" @setting="setVisualInspectorSetting" @cta="setSlideCta" @title-highlights="setTitleHighlights" @title="updateTextContent('title', $event)" @description="updateTextContent('subtitle', $event)" @points="updateTextContent('points', $event)" @undo="restoreHistory(false)" @redo="restoreHistory(true)" @fit="fitSlideText" @download="downloadCarousel" @center="centerVisualElement" @image-url="handleTemporaryImageUrl" @upload="handleTemporaryImageUpload" @original="clearTemporaryImage" @close="editorOpen = false" />
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

.active-style-bar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.active-style-bar > span {
  align-items: center;
  color: #e9d5ff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
}

.active-style-bar button {
  color: #f0abfc;
  font-size: 11px;
  font-weight: 950;
}

.style-picker {
  background: rgba(7, 10, 26, 0.94);
  border: 1px solid rgba(216, 180, 254, 0.28);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 14px;
  padding: 12px;
}

.style-picker > button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #ffffff;
  display: grid;
  gap: 12px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  min-height: 74px;
  padding: 12px;
  text-align: left;
}

.style-picker > button.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.38), rgba(236, 72, 153, 0.22));
  border-color: #d946ef;
  box-shadow: inset 0 0 0 1px rgba(217, 70, 239, 0.34);
}

.style-picker > button > i:first-child {
  align-items: center;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 8px;
  color: #e879f9;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.style-picker strong,
.style-picker small {
  display: block;
}

.style-picker strong {
  font-size: 13px;
  font-weight: 950;
}

.style-picker small {
  color: rgba(255, 255, 255, 0.58);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.35;
  margin-top: 4px;
}

.style-selected-icon {
  color: #4ade80;
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
  filter: var(--image-filter);
  height: 100%;
  inset: 0;
  object-fit: cover;
  object-position: var(--image-position-x) var(--image-position-y);
  opacity: 0.98;
  position: absolute;
  transform: scale(var(--image-scale));
  transform-origin: center;
  width: 100%;
}

.social-card-scrim {
  background: var(--overlay-gradient);
  inset: 0;
  position: absolute;
}

.social-card.analysis .social-card-scrim {
  background: var(--overlay-gradient);
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
.social-brand-logo,
.social-game-logo {
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
  right: auto;
  width: max-content;
  max-width: calc(100% - var(--author-x) - 32px);
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
  white-space: nowrap;
  flex-wrap: nowrap;
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
  max-height: none;
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

.social-card-copy.has-points p {
  font-size: var(--copy-text-size);
  -webkit-line-clamp: var(--copy-text-lines);
}

.social-points {
  display: grid;
  gap: var(--points-gap);
  list-style: none;
  margin: 26px 0 0;
  max-width: 840px;
  padding: 0;
}

.social-points li {
  align-items: start;
  display: grid;
  gap: 16px;
  grid-template-columns: 38px minmax(0, 1fr);
}

.social-points li > span {
  align-items: center;
  background: linear-gradient(135deg, var(--part-color), #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(88, 28, 135, 0.28);
  color: #fff;
  display: inline-flex;
  font-size: 20px;
  font-weight: 950;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.social-points li > strong {
  color: var(--points-color);
  font-size: var(--points-size);
  font-weight: var(--points-weight);
  line-height: var(--points-line);
  text-shadow: 0 8px 28px rgba(0, 0, 0, 0.56);
}

.social-card.analysis .social-points li > span {
  background: linear-gradient(135deg, #a16207, #facc15);
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

.social-game-logo {
  bottom: var(--game-logo-bottom);
  height: var(--game-logo-size);
  left: var(--game-logo-left);
  object-fit: contain;
  opacity: var(--game-logo-opacity);
  position: absolute;
  transform: translateX(-50%);
  width: min(var(--game-logo-size), 72%);
}

.social-card.style-impact .social-card-scrim,
.social-card.style-impact.analysis .social-card-scrim {
  background: var(--overlay-gradient);
}

.social-card.style-impact .social-card-glow,
.social-card.style-impact.analysis .social-card-glow,
.social-card.style-impact .analysis-gold-pattern {
  display: none;
}

.social-card.style-impact .social-card-copy {
  bottom: auto;
  left: 58px;
  max-width: calc(100% - 116px);
  right: 58px;
  top: 25%;
}

.social-card.style-impact.impact-cover .social-card-copy {
  bottom: 210px;
  top: auto;
}

.social-card.style-impact.impact-cover .social-card-copy h2 {
  max-width: 850px;
}

.social-card.style-impact.impact-cover .social-game-logo {
  bottom: auto;
  height: var(--cover-game-logo-size);
  left: var(--cover-game-logo-left);
  max-height: 30%;
  top: var(--cover-game-logo-top);
  width: min(calc(var(--cover-game-logo-size) * 1.8), 82%);
}

.social-card.style-impact.impact-detail .social-card-copy {
  max-width: 820px;
  right: 170px;
  top: 17%;
}

.social-card.style-impact.impact-detail .social-card-copy h2 {
  font-size: calc(var(--copy-title-size) * 0.78);
  line-height: 1.08;
  max-height: none;
}

.social-card.style-impact.impact-detail .social-card-copy p {
  display: -webkit-box;
  font-size: calc(var(--copy-text-size) * 0.82);
  line-height: 1.25;
  margin-top: 28px;
  max-width: 780px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--copy-text-lines);
}

.social-card.style-impact.impact-detail .social-points {
  gap: var(--points-gap);
  margin-top: 24px;
  max-width: 780px;
}

.social-card.style-impact.impact-detail .social-points li {
  gap: 12px;
  grid-template-columns: 32px minmax(0, 1fr);
}

.social-card.style-impact.impact-detail .social-points li > span {
  background: rgba(255, 255, 255, 0.94);
  border: 0;
  border-radius: 999px;
  color: #18181b;
  font-size: 17px;
  height: 32px;
  width: 32px;
}

.social-card.style-impact.impact-detail .social-points li > strong {
  font-size: var(--points-size);
  line-height: 1.2;
}

.social-card.style-impact .social-card-copy h2 {
  font-size: var(--copy-title-size);
  letter-spacing: 0;
  max-height: none;
  max-width: var(--copy-title-width);
  overflow-wrap: anywhere;
  text-shadow: 0 5px 2px rgba(0, 0, 0, 0.72), 0 14px 34px rgba(0, 0, 0, 0.62);
  text-transform: uppercase;
}

.social-card.style-impact .social-card-copy p {
  max-width: var(--copy-title-width);
}

.social-card.style-impact .social-next-cue {
  background: #ffffff;
  border: 0;
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.34);
  color: #171717;
}

.social-card.style-impact .social-next-cue i,
.social-card.style-impact.analysis .social-next-cue i {
  background: transparent;
  color: #292524;
  font-size: calc(var(--arrow-size) * 0.52);
}

.social-card.style-impact .social-brand-logo {
  filter: drop-shadow(0 7px 18px rgba(0, 0, 0, 0.55));
}

.social-card.style-impact .social-game-logo {
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.62));
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
.drawer-sections input:not([type="checkbox"]):not([type="range"]):not([type="color"]),
.drawer-sections textarea {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  color: #ffffff;
  min-height: 38px;
  padding: 0 10px;
}

.drawer-sections textarea {
  font: inherit;
  line-height: 1.35;
  min-height: 92px;
  padding: 10px;
  resize: vertical;
}

.drawer-style-switch {
  display: grid;
  gap: 7px;
  grid-template-columns: 1fr 1fr;
}

.drawer-style-switch button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.72);
  display: flex;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  justify-content: center;
  min-height: 40px;
  padding: 6px 8px;
}

.drawer-style-switch button.active {
  background: linear-gradient(135deg, #7c3aed, #db2777);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.drawer-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}

.drawer-actions .drawer-reset-positions {
  grid-column: 1 / -1;
}

.drawer-subtitle {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #e9d5ff;
  display: block;
  font-size: 11px;
  font-weight: 950;
  padding: 4px 0 8px;
  text-transform: uppercase;
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

.image-override-preview {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 58px 1fr;
  padding: 9px;
}

.image-override-preview img {
  border-radius: 9px;
  height: 72px;
  object-fit: cover;
  width: 58px;
}

.image-override-preview strong {
  display: block;
  font-size: 12px;
  font-weight: 950;
}

.image-override-preview small {
  color: rgba(255, 255, 255, 0.58);
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 3px;
}

.file-control {
  background: rgba(192, 38, 211, 0.14);
  border: 1px dashed rgba(216, 180, 254, 0.42);
  border-radius: 12px;
  color: #f5d0fe;
  cursor: pointer;
  padding: 12px;
  text-align: center;
}

.file-control input {
  display: none;
}

.drawer-ghost-action {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 38px;
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

  .style-picker {
    grid-template-columns: 1fr;
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

.visual-editing { padding-right: 340px; }
.visual-editing .share-preview { justify-content: center; }
.visual-editing .share-toolbar { gap: 10px; }
.visual-editing .social-card [data-edit] { cursor: grab; touch-action: none; }
.visual-center-guide { position: absolute; left: 50%; top: 0; bottom: 0; border-left: 1px solid #22d3ee; pointer-events: none; z-index: 9; }
.visual-width-handle{z-index:11;position:absolute;width:12px;height:32px;padding:0;border:2px solid white;border-radius:999px;background:#9333ea;cursor:ew-resize;touch-action:none}
.visual-selection-handle { z-index: 10; position: absolute; width: 24px; height: 24px; border: 2px solid white; border-radius: 5px; background: #9333ea; cursor: nwse-resize; touch-action: none; }

@media (max-width: 800px) { .visual-editing { padding-right: 12px; padding-bottom: 390px; } .visual-editing .share-preview { padding: 8px; } .visual-editing .share-toolbar h1 { font-size: 18px; } .visual-editing .format-switcher { margin: 8px 0; } }

@media (max-width: 800px) {
 .visual-editing .share-toolbar, .visual-editing .active-style-bar { display: none; }
 .visual-editing .share-workbench { position: fixed; top: 72px; left: 10px; right: 10px; bottom: min(350px, 45dvh); display: flex; flex-direction: column; gap: 8px; overflow: auto; }
 .visual-editing .format-switcher { flex: 0 0 auto; margin: 0; }
 .visual-editing .format-switcher button { min-height: 40px; padding: 6px 10px; }
 .visual-editing .format-switcher button span { display: none; }
 .visual-editing .share-preview { flex: 1; min-height: 0; align-items: center; margin: 0; }
 .visual-editing .share-filmstrip { flex: 0 0 auto; padding: 4px; margin: 0; }
 .visual-editing .share-filmstrip button { width: 38px; height: 46px; }
 :global(body:has(.visual-editing) .public-bottom-nav) { display: none; }
}

.social-card-copy h2,.social-card-copy p { white-space:pre-wrap; }

.social-author{max-width:100%;box-sizing:border-box}.social-author>div{min-width:0}.social-author strong{overflow-wrap:anywhere}
.social-score-independent{position:absolute;top:var(--author-y);right:82px;z-index:2}
@media(min-width:1100px){
 .visual-editing{padding-left:264px;padding-right:364px;box-sizing:border-box}
 .visual-editing .share-toolbar,.visual-editing .share-workbench{width:100%;max-width:none}
 .visual-editing .share-toolbar{flex-wrap:wrap}
}

/* Social carousel: shared geometry for preview and exported images. */
.social-network-layout .network-header{position:absolute;top:58px;left:58px;right:58px;display:grid;grid-template-columns:230px minmax(0,1fr) 92px;gap:28px;align-items:start;z-index:4;color:white}
.social-network-layout .network-brand{font-family:Inter,Arial,sans-serif;font-size:var(--brand-size);line-height:1.02;font-weight:800;letter-spacing:-.8px;text-shadow:0 2px 10px #0009}
.network-progress{display:flex;gap:8px;padding:12px 0;min-width:0}.network-progress span{height:16px;min-width:0;flex:1;border-radius:999px;background:#9a9dbb70}.network-progress span.filled{background:linear-gradient(90deg,var(--progress-color),#ffad47,#fb7185)}
.social-network-layout .network-count{font-size:var(--number-size);line-height:1.1;text-align:right;white-space:nowrap;padding-top:2px}
.social-network-layout .social-card-scrim{background:var(--overlay-gradient)}
.social-network-layout .social-card-glow{opacity:.22}.social-network-layout .analysis-gold-pattern{display:none}
.social-network-layout .social-card-copy{left:64px;right:64px;bottom:214px;max-width:none}
.social-network-layout .social-card-copy h2{max-width:var(--copy-title-width);line-height:var(--copy-title-line);letter-spacing:-2px;font-weight:var(--copy-title-weight);text-shadow:0 4px 24px #0008}
.social-network-layout .title-highlight{color:var(--title-highlight-color)}
.social-network-layout .social-category{margin-bottom:28px;padding:12px 24px;font-size:var(--part-size);line-height:1.1;border-radius:var(--part-radius);box-shadow:none;border:0;background:linear-gradient(100deg,var(--part-color),#5b21cf)}
.social-network-layout[data-accent=gold] .social-category{background:linear-gradient(90deg,#ffe879,#ffb329);color:#18120a}
.social-network-layout .social-category i{display:none}
.social-network-layout .social-card-copy p{font-size:var(--copy-text-size);font-weight:500;line-height:1.33;color:var(--copy-text-color);max-width:916px;margin-top:26px;text-shadow:0 2px 14px #0006}
.social-network-layout .social-points{padding:30px;border:2px solid #ffffff16;background:linear-gradient(130deg,#252230b8,#17141e8c);border-radius:30px;max-width:none;gap:var(--points-gap);margin-top:32px}
.social-network-layout .social-points li{grid-template-columns:64px minmax(0,1fr);gap:24px;align-items:start}
.social-network-layout .social-points li>span{height:64px;width:64px;border-radius:18px;font-size:38px;background:linear-gradient(140deg,#8b38f5,#e346db);border:2px solid #ffffff35;box-shadow:inset 0 0 20px #ffffff16}
.social-network-layout .social-points li>strong{font-size:var(--points-size);font-weight:var(--points-weight,500);line-height:var(--points-line,1.25);color:var(--points-color)}
.social-network-layout .social-next-cue{top:auto;bottom:70px;right:64px;transform:none;height:88px;width:88px;border:3px solid #b65ddd;box-shadow:none;background:#20152e85}
.social-network-layout .social-next-cue i{background:transparent;width:100%;height:100%;font-size:46px}
.social-network-layout .social-next-cue>span{clip:auto;clip-path:none;height:auto;width:auto;right:204px;white-space:nowrap;position:absolute;overflow:visible;font-size:30px;font-weight:500;text-transform:none}
.social-network-layout .social-next-cue>span::after{content:'';position:absolute;left:calc(100% + 20px);top:50%;width:96px;height:3px;background:#e9d5ff}
.social-network-layout .social-card-top{top:160px}.social-network-layout .social-card-footer{bottom:64px}
.network-closing-cta{position:absolute;bottom:86px;left:64px;right:64px;text-align:right;color:var(--closing-cta-color);font-size:var(--closing-cta-size);font-weight:700;font-style:italic;z-index:3}
.social-network-layout[data-slide-type=closing] .social-points{padding:0;border:0;background:none;gap:14px}
.social-network-layout[data-slide-type=closing] .social-points li{padding:22px 26px;border:2px solid #c084fc4a;border-radius:24px;background:#171520b3;align-items:center}
.social-network-layout[data-slide-type=closing] .social-points li>span{background:none;border:0;box-shadow:none;color:#dc8cff;height:52px;font-size:42px}
.social-network-layout[data-format=square] .network-header{top:38px}
.social-network-layout[data-format=square] .social-card-copy{bottom:160px}
.social-network-layout[data-format=square] .social-next-cue{bottom:38px}
.social-network-layout[data-format=square] .network-closing-cta{bottom:40px}

.social-network-layout{--network-scale:1}
.social-network-layout[data-format=portrait]{--network-scale:.85}
.social-network-layout[data-format=square]{--network-scale:.68}
.social-network-layout .social-card-copy h2{font-size:calc(var(--copy-title-size) * var(--network-scale))}
.social-network-layout .social-card-copy p{font-size:calc(var(--copy-text-size) * var(--network-scale))}
.social-network-layout .social-points{padding:calc(30px * var(--network-scale));gap:calc(var(--points-gap) * var(--network-scale))}
.social-network-layout .social-points li{grid-template-columns:calc(64px * var(--network-scale)) minmax(0,1fr);gap:calc(24px * var(--network-scale))}
.social-network-layout .social-points li>strong{font-size:calc(var(--points-size) * var(--network-scale))}
.social-network-layout .social-points li>span{width:calc(64px * var(--network-scale));height:calc(64px * var(--network-scale));font-size:calc(38px * var(--network-scale))}
.social-network-layout[data-slide-type=closing] .social-points{padding:0}
.social-network-layout .social-score-independent{top:170px;right:64px}
.social-network-layout .network-arrow-icon{width:48px;height:48px;color:var(--arrow-color);flex:0 0 auto}
.network-brand{grid-column:1;grid-row:1}.network-progress{grid-column:2;grid-row:1}.network-count{grid-column:3;grid-row:1}

.visual-editing .social-card{touch-action:none;user-select:none;cursor:grab}.visual-editing .social-card:active{cursor:grabbing}.visual-editing .social-card-bg,.visual-editing .social-card-scrim,.visual-editing .social-card-glow{pointer-events:none}.visual-editing .social-card-copy,.visual-editing .network-header,.visual-editing .social-card-footer{pointer-events:none}.visual-editing .social-card [data-edit]:not(.social-card-bg):not(.social-card-scrim):not(.social-card-glow){pointer-events:auto}
</style>

<style scoped>
.social-network-layout .social-category,.social-network-layout[data-accent=gold] .social-category{background:var(--part-paint)}
.social-network-layout .network-progress span.filled{background:var(--progress-paint)}
.social-network-layout .social-next-cue{background:var(--arrow-paint)}
.social-network-layout .social-cta{background:var(--button-paint);color:var(--button-text-color)}
.social-network-layout .social-category,.social-network-layout[data-accent=gold] .social-category{color:var(--part-text-color)}
</style>

<style scoped>
.social-network-layout[data-visual-themed=true] .network-progress span{background:var(--theme-progress-inactive)}
.social-network-layout[data-visual-themed=true] .network-progress span.filled{background:var(--theme-progress-active)}
.social-network-layout[data-visual-themed=true] .social-category{background:var(--part-paint);color:var(--part-text-color)}
.social-network-layout[data-visual-themed=true] .social-points{background:var(--theme-card-bg);border-color:var(--theme-card-border)}
.social-network-layout[data-visual-themed=true] .social-points li>span{background:var(--theme-number-bg);color:var(--theme-number-text)}
.social-network-layout[data-visual-themed=true][data-slide-type=closing] .social-points{background:none}
.social-network-layout[data-visual-themed=true][data-slide-type=closing] .social-points li{background:var(--theme-card-bg);border-color:var(--theme-card-border)}
.social-network-layout[data-visual-themed=true] .social-next-cue{background:var(--theme-arrow-bg);border-color:var(--theme-arrow-border)}
.social-network-layout[data-visual-themed=true] .social-card-glow{opacity:var(--theme-glow-opacity)}
</style>

<style scoped>
/* Keep essential content away from search, reactions and captions in social apps.
   Values are deliberately conservative; platform overlays vary by device. */
.social-network-layout[data-social-margins=true]{--social-left:120px;--social-right:180px;--social-top:140px;--social-bottom:180px}
.social-network-layout[data-social-margins=true][data-format=story]{--social-top:240px;--social-bottom:360px}
.social-network-layout[data-social-margins=true][data-format=square]{--social-top:110px;--social-bottom:150px}
.social-network-layout[data-social-margins=true] .network-header{top:var(--social-top);left:var(--social-left);right:var(--social-right);grid-template-columns:210px minmax(0,1fr) 80px;gap:20px}
.social-network-layout[data-social-margins=true] .social-card-top{top:calc(var(--social-top) + 100px);left:var(--social-left);right:var(--social-right)}
.social-network-layout[data-social-margins=true] .social-card-copy{left:var(--social-left);right:var(--social-right);bottom:calc(var(--social-bottom) + 150px)}
.social-network-layout[data-social-margins=true] .social-card-copy h2,.social-network-layout[data-social-margins=true] .social-card-copy p,.social-network-layout[data-social-margins=true] .social-points{max-width:100%;overflow-wrap:anywhere}
.social-network-layout[data-social-margins=true] .social-next-cue{right:var(--social-right);bottom:var(--social-bottom)}
.social-network-layout[data-social-margins=true] .social-card-footer{left:var(--social-left);right:var(--social-right);bottom:var(--social-bottom)}
.social-network-layout[data-social-margins=true] .network-closing-cta{left:var(--social-left);right:var(--social-right);bottom:var(--social-bottom)}
.social-network-layout[data-social-margins=true] .social-brand-logo{left:calc(100% - var(--social-right) - var(--logo-size)/2);bottom:calc(var(--social-bottom) + 120px)}
.social-network-layout[data-social-margins=true] .social-game-logo{left:46%;bottom:calc(var(--social-bottom) + 120px);max-width:calc(100% - var(--social-left) - var(--social-right))}
.social-network-layout[data-social-margins=true] .social-score-independent{top:calc(var(--social-top) + 100px);right:var(--social-right)}

</style>

<style scoped>
.social-margin-picker{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px;margin-bottom:16px;border:1px solid #a78bfa44;border-radius:14px;background:#12182b;color:#f1f5f9}.social-margin-picker button{border:1px solid #ffffff30;border-radius:10px;padding:10px 14px;background:#20263b;color:#f1f5f9;cursor:pointer;font-weight:700}.social-margin-picker button[aria-pressed=true]{background:#6d28d9;border-color:#c4b5fd;box-shadow:0 0 0 2px #a78bfa33}.social-margin-picker small{flex-basis:100%;color:#bdc6db;line-height:1.5}
</style>

<style scoped>
.social-score-crown{position:absolute;top:-38px;left:50%;transform:translateX(-50%);width:70px;height:54px;color:#ffdf66;filter:drop-shadow(0 3px 8px #0008)}
.social-card.analysis .social-score{border:3px solid #ffe58c;background:radial-gradient(ellipse at 50% 0,#674708,#1b1307 80%);box-shadow:0 0 0 7px #e4b44122,0 12px 36px #0007,inset 0 0 20px #ffd44b22;padding-top:12px;box-sizing:border-box}
.social-card.analysis .social-score strong{color:#ffe17a;text-shadow:0 2px 12px #eab30844}
.social-card.analysis .social-score span{font-size:18px;letter-spacing:1.5px}
</style>
