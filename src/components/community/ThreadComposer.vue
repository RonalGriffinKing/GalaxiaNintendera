<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { playPublishSound } from '@/services/uiSounds'
import officialLogo from '@/iconos/logo.png'

const props = defineProps({
  variant: {
    type: String,
    default: 'inline'
  },
  initialCommunityId: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: 'user'
  },
  autofocus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'published'])

const router = useRouter()
const isLoading = ref(false)
const isPublishing = ref(false)
const communities = ref([])
const joinedCommunityIds = ref([])
const currentProfile = ref({})
const selectedCommunityId = ref('')
const selectedTopic = ref('')
const body = ref('')
const imageUrl = ref('')
const spoiler = ref(false)
const pollOpen = ref(false)
const communityPickerOpen = ref(false)
const textAreaRef = ref(null)
const sheetDragY = ref(0)
const sheetDragging = ref(false)
const sheetStartY = ref(0)

const defaultTopics = ['Posts', 'Fanarts', 'Guias', 'Trucos', 'Preguntas', 'Clips', 'Eventos']
const officialFallback = {
  id: 'galaxia-oficial',
  name: 'Galaxia Nintendera',
  description: 'Noticias, eventos, analisis y todo lo relacionado con Nintendo.',
  iconUrl: officialLogo,
  isOfficial: true,
  threadTopics: defaultTopics
}
const topicIcons = {
  Posts: 'far fa-comment',
  Fanarts: 'fas fa-wand-magic-sparkles',
  Guias: 'fas fa-book-open',
  Trucos: 'far fa-lightbulb',
  Preguntas: 'far fa-circle-question',
  Clips: 'fas fa-clapperboard',
  Eventos: 'far fa-calendar',
  Torneos: 'fas fa-trophy'
}

const canManageOfficial = computed(() => ['admin', 'publisher'].includes(props.userRole))
const user = computed(() => auth.currentUser)
const currentProfileIcon = computed(() => resolveProfileIcon({
  ...currentProfile.value,
  imageUrl: currentProfile.value.imageUrl || user.value?.photoURL || ''
}))
const currentProfileIconMeta = computed(() => resolveProfileIconMeta({
  ...currentProfile.value,
  imageUrl: currentProfile.value.imageUrl || user.value?.photoURL || ''
}))
const displayName = computed(() => currentProfile.value?.name || user.value?.displayName || user.value?.email || 'Usuario')
const userInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const selectedCommunity = computed(() => allowedCommunities.value.find(item => item.id === selectedCommunityId.value) || allowedCommunities.value[0] || null)
const topics = computed(() => normalizeTopics(selectedCommunity.value?.threadTopics || defaultTopics))
const selectedTopicMeta = computed(() => ({
  label: selectedTopic.value || topics.value[0] || 'Posts',
  displayLabel: getTopicLabel(selectedTopic.value || topics.value[0] || 'Posts'),
  icon: getTopicIcon(selectedTopic.value || topics.value[0] || 'Posts')
}))
const allowedCommunities = computed(() => {
  const joined = new Set(joinedCommunityIds.value)
  return communities.value.filter((community) => {
    if (community.isOfficial || community.id === officialFallback.id) return canManageOfficial.value
    return joined.has(community.id)
  })
})
const canPublish = computed(() => Boolean(user.value && selectedCommunity.value && body.value.trim() && !isPublishing.value))
const placeholder = computed(() => {
  const topic = selectedTopicMeta.value.label
  const community = selectedCommunity.value?.name || 'esta comunidad'
  if (topic === 'Preguntas') return `Haz una pregunta a la comunidad ${community}...`
  if (topic === 'Fanarts') return 'Sube tu fanart y cuentanos que lo inspiro...'
  if (topic === 'Eventos') return 'Comparte un evento, quedada o partida con fecha...'
  return `Comparte una idea o abre conversacion con ${community}...`
})
const title = computed(() => 'Que quieres compartir?')

const normalizeTopics = (items = []) => {
  const seen = new Set()
  const normalized = items
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .map(item => item.slice(0, 24))
    .filter((item) => {
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)

  return normalized.length ? normalized : ['Posts']
}

const getTopicIcon = (topic) => topicIcons[topic] || 'fas fa-hashtag'
const getTopicLabel = (topic) => (topic === 'Posts' ? 'Hilos' : topic)

const loadContext = async () => {
  const activeUser = user.value
  if (!activeUser) return
  isLoading.value = true

  try {
    const [communitySnap, joinedSnap, userSnap] = await Promise.all([
      getDocs(collection(db, 'communities')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'users', activeUser.uid, 'communities')).catch(() => ({ docs: [] })),
      getDoc(doc(db, 'users', activeUser.uid)).catch(() => null)
    ])

    const savedCommunities = communitySnap.docs.map(item => ({ id: item.id, ...item.data() }))
    const official = savedCommunities.find(item => item.id === officialFallback.id)
    communities.value = [
      { ...officialFallback, ...official },
      ...savedCommunities.filter(item => item.id !== officialFallback.id)
    ]
    joinedCommunityIds.value = joinedSnap.docs.map(item => item.id)
    currentProfile.value = userSnap?.exists?.() ? userSnap.data() : {}
    pickInitialCommunity()
  } finally {
    isLoading.value = false
  }
}

const pickInitialCommunity = () => {
  const initial = props.initialCommunityId && allowedCommunities.value.find(item => item.id === props.initialCommunityId)
  selectedCommunityId.value = initial?.id || allowedCommunities.value[0]?.id || ''
  selectedTopic.value = normalizeTopics(selectedCommunity.value?.threadTopics || defaultTopics)[0]
}

const selectCommunity = (community) => {
  selectedCommunityId.value = community.id
  selectedTopic.value = normalizeTopics(community.threadTopics || defaultTopics)[0]
  communityPickerOpen.value = false
}

const pasteImageUrl = async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim()
    if (!/^https?:\/\/\S+$/i.test(text)) return
    imageUrl.value = text
  } catch (error) {
    console.error(error)
  }
}

const addSticker = () => {
  body.value = `${body.value}${body.value ? ' ' : ''}⭐`.slice(0, 240)
}

const togglePoll = () => {
  pollOpen.value = !pollOpen.value
  if (pollOpen.value && !body.value.includes('Encuesta:')) {
    body.value = `${body.value.trim()}${body.value.trim() ? '\n' : ''}Encuesta: opcion A / opcion B`.slice(0, 240)
  }
}

const resizeTextarea = () => {
  const textarea = textAreaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
}

const handleComposerInput = () => {
  resizeTextarea()
}

const openImageTool = () => {
  pasteImageUrl()
}

const chooseQuestionType = () => {
  const questionTopic = topics.value.find(topic => topic.toLowerCase() === 'preguntas')
  selectedTopic.value = questionTopic || selectedTopic.value
}

const startSheetDrag = (event) => {
  if (props.variant !== 'modal' || event.pointerType === 'mouse') return
  sheetDragging.value = true
  sheetStartY.value = event.clientY
  sheetDragY.value = 0
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

const moveSheetDrag = (event) => {
  if (!sheetDragging.value) return
  sheetDragY.value = Math.max(0, event.clientY - sheetStartY.value)
}

const endSheetDrag = (event) => {
  if (!sheetDragging.value) return
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  const shouldClose = sheetDragY.value > 86
  sheetDragging.value = false
  sheetDragY.value = 0
  if (shouldClose) emit('close')
}

const publish = async () => {
  const activeUser = user.value
  const community = selectedCommunity.value
  const text = body.value.trim()
  if (!activeUser || !community || !text || isPublishing.value) return

  isPublishing.value = true
  try {
    const now = Date.now()
    await addDoc(collection(db, 'communityThreads'), {
      communityId: community.id,
      communityName: community.name || '',
      authorId: activeUser.uid,
      author: displayName.value,
      authorImage: currentProfileIcon.value || '',
      authorIconEffect: {
        special: Boolean(currentProfileIconMeta.value.special),
        effectColor: currentProfileIconMeta.value.effectColor,
        saga: currentProfileIconMeta.value.saga
      },
      handle: '@tu_usuario',
      topic: topics.value.includes(selectedTopic.value) ? selectedTopic.value : topics.value[0],
      title: text.length > 72 ? `${text.slice(0, 72)}...` : text,
      body: text,
      imageUrl: imageUrl.value.trim(),
      spoiler: spoiler.value,
      isOfficial: community.isOfficial || community.id === officialFallback.id,
      lockedThread: community.isOfficial || community.id === officialFallback.id,
      replies: 0,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: now,
      updatedAt: now
    })

    body.value = ''
    imageUrl.value = ''
    spoiler.value = false
    pollOpen.value = false
    playPublishSound()
    emit('published')
    if (props.variant === 'modal') emit('close')
  } finally {
    isPublishing.value = false
  }
}

const exploreCommunities = () => {
  emit('close')
  router.push('/comunidad?explore=1')
}

watch(() => props.initialCommunityId, pickInitialCommunity)
watch(allowedCommunities, () => {
  if (!selectedCommunityId.value && allowedCommunities.value.length) pickInitialCommunity()
})
watch(topics, (next) => {
  if (!next.includes(selectedTopic.value)) selectedTopic.value = next[0] || 'Posts'
})
watch(body, () => nextTick(resizeTextarea))

onMounted(async () => {
  await loadContext()
  await nextTick()
  resizeTextarea()
  const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 859px)').matches
  if (props.autofocus && !isMobileViewport) textAreaRef.value?.focus()
})
</script>

<template>
  <section
    class="thread-composer"
    :class="[`is-${variant}`, { 'picker-open': communityPickerOpen, dragging: sheetDragging }]"
    :style="{ '--sheet-drag-y': `${sheetDragY}px` }"
  >
    <button
      v-if="variant === 'modal'"
      class="composer-drag-handle"
      type="button"
      aria-label="Cerrar deslizando"
      @pointerdown="startSheetDrag"
      @pointermove="moveSheetDrag"
      @pointerup="endSheetDrag"
      @pointercancel="endSheetDrag"
    >
      <span></span>
    </button>
    <button v-if="variant === 'modal'" class="composer-close" type="button" aria-label="Cerrar" @click="$emit('close')">
      <i class="fas fa-xmark"></i>
    </button>

    <div v-if="isLoading" class="composer-loading">
      Preparando comunidades...
    </div>

    <template v-else-if="allowedCommunities.length">
      <div class="composer-main">
        <div class="composer-steps">
          <div class="composer-step community-step">
            <small>1. Elige la comunidad</small>
            <button class="community-select" type="button" @click="communityPickerOpen = true">
              <span>
                <img v-if="selectedCommunity?.iconUrl" :src="selectedCommunity.iconUrl" alt="" />
                <b v-else>{{ selectedCommunity?.name?.slice(0, 2).toUpperCase() }}</b>
              </span>
              <strong>{{ selectedCommunity?.name }}</strong>
              <i class="fas fa-chevron-down"></i>
            </button>
            <p>Elige donde quieres publicar tu contenido.</p>
          </div>

          <div class="composer-step type-step">
            <small>2. Elige el tipo de publicacion</small>
            <div class="topic-row">
              <button
                v-for="topic in topics"
                :key="topic"
                type="button"
                :class="{ active: selectedTopic === topic }"
                @click="selectedTopic = topic"
              >
                <i :class="getTopicIcon(topic)"></i>
                {{ getTopicLabel(topic) }}
              </button>
            </div>
          </div>
        </div>

        <h2>{{ title }}</h2>

        <div class="mobile-composer-type-row" aria-label="Tipo de publicacion">
          <button type="button" :class="{ active: selectedTopicMeta.label === 'Posts' }" @click="selectedTopic = topics.includes('Posts') ? 'Posts' : topics[0]">
            <i class="far fa-comment"></i>
            Hilo
          </button>
          <button type="button" :class="{ active: pollOpen }" @click="togglePoll">
            <i class="fas fa-chart-simple"></i>
            Encuesta
          </button>
          <button type="button" @click="openImageTool">
            <i class="far fa-image"></i>
            Imagen
          </button>
          <button type="button" :class="{ active: spoiler }" @click="spoiler = !spoiler">
            <i class="fas fa-eye-slash"></i>
            Spoiler
          </button>
          <button type="button" :class="{ active: selectedTopicMeta.label === 'Preguntas' }" @click="chooseQuestionType">
            <i class="far fa-circle-question"></i>
            Pregunta
          </button>
        </div>

        <label class="composer-textarea">
          <textarea ref="textAreaRef" v-model="body" maxlength="240" :placeholder="placeholder" @input="handleComposerInput"></textarea>
          <span>{{ body.length }}/240</span>
        </label>

        <figure v-if="imageUrl" class="composer-image">
          <img :src="imageUrl" alt="" />
          <button type="button" aria-label="Quitar imagen" @click="imageUrl = ''">
            <i class="fas fa-xmark"></i>
          </button>
        </figure>

        <div class="composer-footer">
          <div class="tool-row">
            <button type="button" @click="pasteImageUrl"><i class="far fa-image"></i><span>Imagen</span></button>
            <button type="button" :class="{ active: spoiler }" @click="spoiler = !spoiler"><i class="fas fa-eye-slash"></i><span>Spoiler</span></button>
            <button type="button" :class="{ active: pollOpen }" @click="togglePoll"><i class="fas fa-chart-simple"></i><span>Encuesta</span></button>
            <button type="button" @click="addSticker"><i class="far fa-face-smile"></i><span>Sticker</span></button>
          </div>

          <button class="publish-btn" type="button" :disabled="!canPublish" @click="publish">
            <i class="fas fa-paper-plane"></i>
            {{ isPublishing ? 'Publicando...' : 'Publicar' }}
          </button>
        </div>
      </div>

      <aside class="community-picker-panel">
        <div class="picker-head">
          <strong>Elige la comunidad</strong>
          <button type="button" aria-label="Cerrar comunidades" @click="communityPickerOpen = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="community-list">
          <button
            v-for="community in allowedCommunities"
            :key="community.id"
            type="button"
            :class="{ active: community.id === selectedCommunityId }"
            @click="selectCommunity(community)"
          >
            <span>
              <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
              <b v-else>{{ community.name.slice(0, 2).toUpperCase() }}</b>
            </span>
            <div>
              <strong>{{ community.name }}</strong>
              <small>{{ community.description || 'Comunidad de Galaxia Nintendera.' }}</small>
            </div>
            <i class="fas fa-circle-check"></i>
          </button>
        </div>
        <button class="explore-btn" type="button" @click="exploreCommunities">
          <i class="fas fa-search"></i>
          Explorar comunidades
        </button>
      </aside>
    </template>

    <div v-else class="composer-empty">
      <strong>No tienes comunidades disponibles</strong>
      <p>Unete a una comunidad para publicar hilos. Los comunicados oficiales solo pueden crearlos admins o publicadores.</p>
      <button type="button" @click="exploreCommunities">Explorar comunidades</button>
    </div>
  </section>
</template>

<style scoped>
.thread-composer {
  background:
    radial-gradient(circle at 76% 0%, rgba(168, 85, 247, 0.22), transparent 34%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(12, 10, 32, 0.96));
  border: 1px solid rgba(168, 85, 247, 0.26);
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
  color: #f8fafc;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  padding: 22px;
  position: relative;
}

.thread-composer.is-modal {
  max-height: min(760px, calc(100dvh - 48px));
  overflow-y: auto;
  width: min(1180px, calc(100vw - 36px));
}

.composer-close {
  align-items: center;
  color: #cbd5e1;
  display: none;
  font-size: 22px;
  height: 40px;
  justify-content: center;
  position: absolute;
  right: 16px;
  top: 14px;
  width: 40px;
  z-index: 4;
}

.composer-drag-handle,
.mobile-composer-type-row {
  display: none;
}

.community-select span,
.community-list button > span {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  display: grid;
  overflow: hidden;
  place-items: center;
}

.community-select img,
.community-list img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-select b,
.community-list b {
  color: #ffffff;
  font-size: 13px;
  font-weight: 950;
}

.composer-main {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.composer-main h2 {
  font-size: clamp(24px, 2.6vw, 34px);
  font-weight: 950;
  line-height: 1.05;
  order: -1;
}

.composer-steps {
  display: grid;
  gap: 18px;
}

.composer-step {
  display: grid;
  gap: 10px;
}

.composer-step small {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 900;
}

.community-step {
  align-items: center;
  grid-template-columns: minmax(260px, 330px) minmax(160px, 1fr);
}

.community-step small {
  grid-column: 1 / -1;
}

.community-step p {
  color: #aeb8d3;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
}

.community-select {
  align-items: center;
  background: rgba(124, 58, 237, 0.16);
  border: 1px solid rgba(192, 132, 252, 0.54);
  border-radius: 18px;
  box-shadow: 0 0 28px rgba(168, 85, 247, 0.18);
  color: #ffffff;
  display: grid;
  gap: 12px;
  grid-template-columns: 40px minmax(0, 1fr) 20px;
  min-height: 58px;
  padding: 8px 14px 8px 8px;
  text-align: left;
}

.community-select span {
  height: 40px;
  width: 40px;
}

.community-select strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.topic-row button,
.tool-row button {
  align-items: center;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 13px;
  font-weight: 900;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
}

.topic-row button.active,
.topic-row button:hover,
.tool-row button.active,
.tool-row button:hover {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-color: rgba(216, 180, 254, 0.46);
  color: #ffffff;
}

.composer-textarea {
  background: rgba(5, 8, 22, 0.56);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  display: grid;
  min-height: 132px;
  padding: 16px;
}

.composer-textarea textarea {
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 18px;
  font-weight: 800;
  min-height: 86px;
  outline: 0;
  resize: none;
}

.composer-textarea textarea::placeholder {
  color: #8c96ad;
}

.composer-textarea span {
  align-self: end;
  color: #aeb8d3;
  font-size: 12px;
  font-weight: 900;
  justify-self: end;
}

.composer-image {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  margin: 0;
  overflow: hidden;
  position: relative;
}

.composer-image img {
  aspect-ratio: 16 / 7;
  object-fit: cover;
  width: 100%;
}

.composer-image button {
  background: rgba(8, 12, 30, 0.86);
  border-radius: 999px;
  color: #ffffff;
  height: 34px;
  position: absolute;
  right: 10px;
  top: 10px;
  width: 34px;
}

.composer-footer {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.tool-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.publish-btn {
  align-items: center;
  background: linear-gradient(135deg, #5b21e8, #ec4899);
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(236, 72, 153, 0.24);
  color: #ffffff;
  display: inline-flex;
  font-size: 16px;
  font-weight: 950;
  gap: 10px;
  justify-content: center;
  min-height: 54px;
  min-width: 170px;
  padding: 0 26px;
}

.publish-btn:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.community-picker-panel {
  background:
    radial-gradient(circle at 24% 0%, rgba(168, 85, 247, 0.18), transparent 32%),
    rgba(8, 12, 30, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
  display: grid;
  gap: 12px;
  max-height: min(560px, calc(100dvh - 80px));
  min-width: 0;
  opacity: 0;
  padding: 16px;
  pointer-events: none;
  position: absolute;
  right: 18px;
  top: 18px;
  transform: translateY(8px) scale(0.98);
  transition: opacity 0.18s ease, transform 0.18s ease;
  width: min(520px, calc(100% - 36px));
  z-index: 5;
}

.thread-composer.picker-open .community-picker-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.picker-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.picker-head strong {
  font-size: 18px;
  font-weight: 950;
}

.picker-head button {
  color: #cbd5e1;
  font-size: 18px;
  height: 34px;
  width: 34px;
}

.community-list {
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.community-list button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 46px minmax(0, 1fr) 22px;
  min-height: 66px;
  padding: 8px;
  text-align: left;
}

.community-list button > span {
  height: 46px;
  width: 46px;
}

.community-list strong,
.community-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.community-list strong {
  font-size: 13px;
  font-weight: 950;
  white-space: nowrap;
}

.community-list small {
  color: #aeb8d3;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.25;
  max-height: 2.5em;
}

.community-list button > i {
  color: #a78bfa;
  opacity: 0;
}

.community-list button.active {
  background: rgba(124, 58, 237, 0.22);
  border-color: rgba(192, 132, 252, 0.54);
}

.community-list button.active > i {
  opacity: 1;
}

.explore-btn,
.composer-empty button {
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #e9d5ff;
  display: inline-flex;
  font-size: 13px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 42px;
}

.composer-loading,
.composer-empty {
  grid-column: 1 / -1;
}

.composer-loading,
.composer-empty {
  color: #cbd5e1;
  font-weight: 900;
  padding: 26px;
  text-align: center;
}

.composer-empty {
  display: grid;
  gap: 10px;
  justify-items: center;
}

.composer-empty strong {
  color: #ffffff;
  font-size: 18px;
}

.composer-empty p {
  max-width: 460px;
}

@media (max-width: 980px) {
  .thread-composer {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px;
  }

  .community-picker-panel {
    background: #080c1e;
    border-radius: 0;
    bottom: 0;
    box-shadow: -18px 0 60px rgba(0, 0, 0, 0.42);
    max-height: none;
    opacity: 0;
    padding: 20px;
    pointer-events: none;
    position: fixed;
    right: 0;
    top: 0;
    transform: translateX(100%);
    transition: opacity 0.2s ease, transform 0.2s ease;
    width: min(420px, 88vw);
    z-index: 2200;
  }

  .thread-composer.picker-open .community-picker-panel {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
  }

  .community-step {
    grid-template-columns: 1fr;
  }

  .community-step p {
    display: none;
  }

  .composer-footer {
    grid-template-columns: 1fr auto;
  }

  .tool-row button span {
    display: none;
  }

  .tool-row button {
    height: 42px;
    justify-content: center;
    padding: 0;
    width: 42px;
  }
}

@media (max-width: 859px) {
  .thread-composer.is-modal {
    border-radius: 26px;
    grid-template-columns: minmax(0, 1fr);
    min-height: auto;
    max-height: min(78dvh, calc(100dvh - 28px));
    overflow-y: auto;
    padding: 16px;
    transform: none;
    transition:
      border-radius 0.22s ease,
      box-shadow 0.22s ease;
    width: 100%;
  }

  .thread-composer.is-modal {
    background:
      radial-gradient(circle at 82% 0%, rgba(236, 72, 153, 0.2), transparent 34%),
      radial-gradient(circle at 14% 4%, rgba(124, 58, 237, 0.28), transparent 36%),
      linear-gradient(145deg, rgba(6, 9, 24, 0.98), rgba(17, 12, 42, 0.97));
    border-color: rgba(192, 132, 252, 0.42);
    box-shadow:
      0 -18px 68px rgba(0, 0, 0, 0.42),
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 0 36px rgba(168, 85, 247, 0.2);
  }

  .thread-composer.dragging {
    transition: none;
  }

  .composer-drag-handle {
    display: none;
  }

  .composer-drag-handle span {
    background: rgba(216, 180, 254, 0.5);
    border-radius: 999px;
    box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
    display: block;
    height: 4px;
    width: 42px;
  }

  .composer-close {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    display: inline-flex;
    font-size: 16px;
    height: 34px;
    right: 16px;
    top: 21px;
    width: 34px;
  }

  .composer-main {
    gap: 12px;
    padding-top: 2px;
  }

  .composer-main h2 {
    font-size: 18px;
    order: 0;
    padding-right: 38px;
  }

  .composer-steps {
    gap: 0;
  }

  .composer-step small,
  .community-step p,
  .type-step {
    display: none;
  }

  .community-step {
    grid-template-columns: 1fr;
  }

  .community-select {
    background: rgba(8, 12, 30, 0.72);
    border-color: rgba(168, 85, 247, 0.52);
    border-radius: 999px;
    box-shadow:
      0 14px 34px rgba(0, 0, 0, 0.24),
      0 0 26px rgba(168, 85, 247, 0.18);
    gap: 9px;
    grid-template-columns: 30px minmax(0, 1fr) 20px;
    min-height: 44px;
    padding: 6px 16px 6px 6px;
    width: min(330px, calc(100% - 48px));
  }

  .community-select > i {
    justify-self: center;
  }

  .community-select span {
    height: 30px;
    width: 30px;
  }

  .community-select strong {
    font-size: 14px;
  }

  .mobile-composer-type-row {
    display: flex;
    gap: 7px;
    margin-right: -16px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .mobile-composer-type-row::-webkit-scrollbar {
    display: none;
  }

  .mobile-composer-type-row button {
    align-items: center;
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 999px;
    color: #cbd5e1;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 900;
    gap: 6px;
    min-height: 32px;
    padding: 0 10px;
  }

  .mobile-composer-type-row button.active {
    background: linear-gradient(135deg, #7c3aed, #c026d3);
    border-color: rgba(216, 180, 254, 0.48);
    color: #ffffff;
    box-shadow: 0 0 18px rgba(168, 85, 247, 0.18);
  }

  .community-picker-panel {
    background:
      radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.18), transparent 34%),
      linear-gradient(145deg, rgba(6, 9, 24, 0.99), rgba(13, 10, 34, 0.99));
    border-color: rgba(192, 132, 252, 0.24);
    border-radius: inherit;
    bottom: 0;
    box-shadow: 0 22px 52px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    left: 0;
    max-height: none;
    min-height: 100%;
    padding: 18px;
    position: absolute;
    right: 0;
    top: 0;
    transform: translateY(10px) scale(0.98);
    width: auto;
    z-index: 12;
  }

  .thread-composer.picker-open .community-picker-panel {
    transform: translateY(0) scale(1);
  }

  .community-list {
    gap: 6px;
    flex: 1;
    max-height: none;
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
  }

  .picker-head {
    margin-bottom: 8px;
  }

  .picker-head strong {
    font-size: 15px;
  }

  .picker-head button {
    height: 32px;
    width: 32px;
  }

  .community-list button {
    border-radius: 14px;
    gap: 9px;
    grid-template-columns: 42px minmax(0, 1fr) 18px;
    min-height: 56px;
    padding: 6px;
  }

  .community-list button > span {
    height: 42px;
    width: 42px;
  }

  .community-list strong {
    font-size: 12px;
  }

  .community-list small {
    font-size: 10px;
    line-height: 1.2;
    max-height: 2.4em;
  }

  .explore-btn {
    border-radius: 13px;
    font-size: 12px;
    min-height: 38px;
    margin-top: 10px;
  }

  .topic-row {
    flex-wrap: nowrap;
    margin-right: -16px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .topic-row button {
    flex: 0 0 auto;
    min-height: 38px;
    padding: 0 12px;
  }

  .composer-textarea {
    background: rgba(5, 8, 22, 0.42);
    min-height: 112px;
    padding: 13px;
  }

  .composer-textarea textarea {
    font-size: 15px;
    line-height: 1.35;
    min-height: 68px;
  }

  .composer-footer {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .tool-row {
    flex-wrap: nowrap;
    gap: 8px;
  }

  .tool-row button {
    height: 36px;
    min-height: 36px;
    width: 36px;
  }

  .publish-btn {
    font-size: 13px;
    min-height: 40px;
    min-width: 104px;
    padding: 0 14px;
  }
}

</style>
