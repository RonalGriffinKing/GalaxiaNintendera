<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import GiphyPicker from '@/components/shared/GiphyPicker.vue'
import { DEFAULT_THREAD_TOPICS, CONTENT_TAB_ICONS, OFFICIAL_COMMUNITY_ID } from '@/constants/community'
import { resolveAssetUrl } from '@/constants/assets'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { playPublishSound } from '@/services/uiSounds'
import officialLogo from '@/iconos/logo.png'

const props = defineProps({
  variant: { type: String, default: 'inline' },
  initialCommunityId: { type: String, default: '' },
  userRole: { type: String, default: 'user' },
  autofocus: Boolean
})

const emit = defineEmits(['published'])

const router = useRouter()
const isLoading = ref(false)
const isPublishing = ref(false)
const communities = ref([])
const joinedCommunityIds = ref([])
const currentProfile = ref({})
const selectedCommunityId = ref('')
const selectedTopic = ref('Posts')
const body = ref('')
const imageUrl = ref('')
const selectedGif = ref(null)
const spoiler = ref(false)
const pollOpen = ref(false)
const communityPickerOpen = ref(false)
const giphyOpen = ref(false)
const textAreaRef = ref(null)
const caretIndex = ref(0)

const defaultTopics = [...DEFAULT_THREAD_TOPICS]
const topicIcons = { ...CONTENT_TAB_ICONS, Torneos: 'fas fa-trophy' }
const officialFallback = {
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera',
  description: 'Noticias, eventos, analisis y todo lo relacionado con Nintendo.',
  iconUrl: officialLogo,
  isOfficial: true,
  threadTopics: defaultTopics
}

const canManageOfficial = computed(() => ['admin', 'publisher'].includes(props.userRole))
const isCurrentUserBlocked = computed(() => Boolean(currentProfile.value?.isBlocked))
const user = computed(() => auth.currentUser)
const displayName = computed(() => currentProfile.value?.name || user.value?.displayName || user.value?.email || 'Usuario')
const userInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const currentProfileIcon = computed(() => resolveProfileIcon({
  ...currentProfile.value,
  imageUrl: currentProfile.value.imageUrl || user.value?.photoURL || ''
}))
const currentProfileIconMeta = computed(() => resolveProfileIconMeta({
  ...currentProfile.value,
  imageUrl: currentProfile.value.imageUrl || user.value?.photoURL || ''
}))

const allowedCommunities = computed(() => {
  if (isCurrentUserBlocked.value) return []
  const joined = new Set(joinedCommunityIds.value)
  return communities.value.filter((community) => {
    if (community.isOfficial || community.id === officialFallback.id) return canManageOfficial.value
    return joined.has(community.id)
  })
})
const selectedCommunity = computed(() => allowedCommunities.value.find(item => item.id === selectedCommunityId.value) || allowedCommunities.value[0] || null)
const topics = computed(() => normalizeTopics(selectedCommunity.value?.threadTopics || defaultTopics))
const selectedTopicMeta = computed(() => topicMeta(selectedTopic.value || 'Posts'))
const activeHashtags = computed(() => extractHashtags(body.value))
const hashtagRange = computed(() => {
  const beforeCaret = body.value.slice(0, caretIndex.value)
  const match = beforeCaret.match(/(^|\s)#([^\s#]*)$/)
  if (!match) return null
  return {
    start: beforeCaret.length - match[0].trimStart().length,
    end: caretIndex.value,
    query: normalizeKey(match[2] || '')
  }
})
const hashtagSuggestions = computed(() => {
  const query = hashtagRange.value?.query || ''
  return topics.value
    .map(topicMeta)
    .filter(topic => !query || topic.key.includes(query) || topic.hashtagKey.includes(query))
    .slice(0, 6)
})
const showHashtagSuggestions = computed(() => Boolean(hashtagRange.value && hashtagSuggestions.value.length))
const mediaPreview = computed(() => selectedGif.value?.url || imageUrl.value)
const canPublish = computed(() => Boolean(!isCurrentUserBlocked.value && user.value && selectedCommunity.value && (body.value.trim() || selectedGif.value || imageUrl.value.trim()) && !isPublishing.value))
const placeholder = computed(() => `Escribe una idea para ${selectedCommunity.value?.name || 'la comunidad'}... usa # para etiquetar`)

const normalizeTopics = (items = []) => {
  const seen = new Set()
  const normalized = items
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .map(item => item.slice(0, 24))
    .filter((item) => {
      const key = normalizeKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
  return normalized.length ? normalized : ['Posts']
}

const normalizeKey = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

const singularLabel = (topic) => ({
  Posts: 'Hilo',
  Fanarts: 'Fanart',
  Guias: 'Guia',
  Trucos: 'Truco',
  Preguntas: 'Pregunta',
  Clips: 'Clip',
  Eventos: 'Evento',
  Torneos: 'Torneo'
}[topic] || topic)

const getTopicLabel = (topic) => (topic === 'Posts' ? 'Hilos' : topic)
const getTopicIcon = (topic) => topicIcons[topic] || 'fas fa-hashtag'
const topicMeta = (topic) => ({
  label: topic,
  displayLabel: getTopicLabel(topic),
  hashtag: singularLabel(topic).replace(/\s+/g, ''),
  key: normalizeKey(topic),
  hashtagKey: normalizeKey(singularLabel(topic)),
  icon: getTopicIcon(topic)
})

const extractHashtags = (value = '') => {
  const tags = String(value).match(/#[\w-]+/g) || []
  return [...new Set(tags.map(tag => normalizeKey(tag.slice(1))).filter(Boolean))]
}

const deriveTopicFromText = (value = '') => {
  const tags = extractHashtags(value)
  const match = topics.value
    .map(topicMeta)
    .find(topic => tags.includes(topic.key) || tags.includes(topic.hashtagKey))
  return match?.label || selectedTopic.value || topics.value[0] || 'Posts'
}

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
  focusComposer()
}

const focusComposer = () => nextTick(() => textAreaRef.value?.focus())

const syncCaret = (event) => {
  const target = event?.target || textAreaRef.value
  caretIndex.value = Number(target?.selectionStart || body.value.length)
}

const resizeTextarea = () => {
  const textarea = textAreaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
}

const handleComposerInput = (event) => {
  syncCaret(event)
  if (body.value.endsWith('#')) caretIndex.value = body.value.length
  selectedTopic.value = deriveTopicFromText(body.value)
  resizeTextarea()
}

const insertHashtag = (topic) => {
  const meta = topicMeta(topic)
  const token = `#${meta.hashtag} `
  const range = hashtagRange.value
  if (!range) {
    body.value = `${body.value}${body.value && !body.value.endsWith(' ') ? ' ' : ''}${token}`.slice(0, 240)
  } else {
    body.value = `${body.value.slice(0, range.start)}${token}${body.value.slice(range.end)}`.slice(0, 240)
    caretIndex.value = range.start + token.length
  }
  selectedTopic.value = topic
  nextTick(() => {
    if (textAreaRef.value) {
      textAreaRef.value.focus()
      textAreaRef.value.setSelectionRange(caretIndex.value, caretIndex.value)
    }
    resizeTextarea()
  })
}

const quickTag = (topic) => {
  insertHashtag(topic)
}

const pasteImageUrl = async () => {
  try {
    const text = (await navigator.clipboard.readText()).trim()
    if (!/^https?:\/\/\S+$/i.test(text)) return
    imageUrl.value = text
    selectedGif.value = null
  } catch (error) {
    console.error(error)
  }
}

const insertTextAtCaret = (text) => {
  const start = Number(textAreaRef.value?.selectionStart ?? body.value.length)
  const end = Number(textAreaRef.value?.selectionEnd ?? start)
  const before = body.value.slice(0, start)
  const after = body.value.slice(end)
  body.value = `${before}${text}${after}`.slice(0, 240)
  caretIndex.value = Math.min(start + text.length, body.value.length)
  nextTick(() => {
    textAreaRef.value?.focus()
    textAreaRef.value?.setSelectionRange(caretIndex.value, caretIndex.value)
    resizeTextarea()
  })
}

const handleGiphySelect = (item) => {
  if (item.type === 'emoji') {
    insertTextAtCaret(item.text)
    giphyOpen.value = false
    return
  }
  selectedGif.value = item
  imageUrl.value = ''
  giphyOpen.value = false
  focusComposer()
}

const togglePoll = () => {
  pollOpen.value = !pollOpen.value
  if (pollOpen.value && !activeHashtags.value.includes('encuesta')) {
    body.value = `${body.value.trim()}${body.value.trim() ? ' ' : ''}#Encuesta`.slice(0, 240)
  }
  focusComposer()
}

const chooseQuestionType = () => {
  const questionTopic = topics.value.find(topic => normalizeKey(topic) === 'preguntas')
  quickTag(questionTopic || 'Preguntas')
}

const publish = async () => {
  const activeUser = user.value
  const community = selectedCommunity.value
  const text = body.value.trim()
  const gif = selectedGif.value
  const mediaUrl = imageUrl.value.trim() || gif?.url || ''
  if (!activeUser || !community || (!text && !mediaUrl) || isPublishing.value) return

  const threadTopic = deriveTopicFromText(text)
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
      topic: topics.value.includes(threadTopic) ? threadTopic : topics.value[0],
      hashtags: extractHashtags(text),
      title: text ? (text.length > 72 ? `${text.slice(0, 72)}...` : text) : (gif?.title || 'GIF compartido'),
      body: text || gif?.title || '',
      imageUrl: mediaUrl,
      mediaType: gif ? 'gif' : (mediaUrl ? 'image' : ''),
      gif: gif ? {
        provider: gif.provider || 'giphy',
        title: gif.title || '',
        url: gif.url || '',
        previewUrl: gif.previewUrl || ''
      } : null,
      spoiler: spoiler.value,
      poll: pollOpen.value ? { options: [], votes: {} } : null,
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
    selectedGif.value = null
    spoiler.value = false
    pollOpen.value = false
    giphyOpen.value = false
    playPublishSound()
    emit('published')
  } finally {
    isPublishing.value = false
  }
}

const exploreCommunities = () => {
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
  <section class="thread-composer" :class="[`is-${variant}`, { 'picker-open': communityPickerOpen, 'sticker-open': giphyOpen }]">
    <div v-if="isLoading" class="composer-loading">Preparando comunidades...</div>

    <template v-else-if="allowedCommunities.length">
      <div class="composer-shell">
        <button class="community-select" type="button" @click="communityPickerOpen = true">
          <span>
            <img v-if="selectedCommunity?.iconUrl" :src="resolveAssetUrl(selectedCommunity.iconUrl)" alt="" />
            <b v-else>{{ selectedCommunity?.name?.slice(0, 2).toUpperCase() }}</b>
          </span>
          <strong>{{ selectedCommunity?.name }}</strong>
          <i class="fas fa-chevron-down"></i>
        </button>

        <div class="composer-content">
        <div class="composer-row">
          <div class="composer-avatar" :style="currentProfileIcon ? { backgroundImage: `url(${currentProfileIcon})` } : null">
            <span v-if="!currentProfileIcon">{{ userInitial }}</span>
          </div>
          <label class="composer-textarea">
            <textarea
              ref="textAreaRef"
              v-model="body"
              maxlength="240"
              :placeholder="placeholder"
              @click="syncCaret"
              @keyup="syncCaret"
              @select="syncCaret"
              @input="handleComposerInput"
            ></textarea>
            <small>{{ body.length }}/240</small>
          </label>
        </div>

        <div v-if="showHashtagSuggestions" class="hashtag-suggestions">
          <button v-for="topic in hashtagSuggestions" :key="topic.label" type="button" @pointerdown.prevent="insertHashtag(topic.label)">
            <i :class="topic.icon"></i>
            <span>#{{ topic.hashtag }}</span>
            <small>{{ topic.displayLabel }}</small>
          </button>
        </div>

        <figure v-if="mediaPreview" class="composer-image">
          <img :src="mediaPreview" alt="" />
          <figcaption v-if="selectedGif">GIPHY · {{ selectedGif.title }}</figcaption>
          <button type="button" aria-label="Quitar imagen" @click="imageUrl = ''; selectedGif = null"><i class="fas fa-xmark"></i></button>
        </figure>

        <div class="active-tags" v-if="activeHashtags.length || spoiler || pollOpen">
          <span>
            <i :class="selectedTopicMeta.icon"></i>
            #{{ selectedTopicMeta.hashtag }}
          </span>
          <em v-if="spoiler"><i class="fas fa-eye-slash"></i> Spoiler</em>
          <em v-if="pollOpen"><i class="fas fa-chart-simple"></i> Encuesta</em>
        </div>

        <div class="composer-footer">
          <div class="tool-row">
            <button type="button" title="Imagen" @click="pasteImageUrl"><i class="far fa-image"></i></button>
            <button type="button" :class="{ active: pollOpen }" title="Encuesta" @click="togglePoll"><i class="fas fa-chart-simple"></i></button>
            <button type="button" :class="{ active: spoiler }" title="Spoiler" @click="spoiler = !spoiler"><i class="fas fa-eye-slash"></i></button>
            <button type="button" title="Pregunta" @click="chooseQuestionType"><i class="far fa-circle-question"></i></button>
            <button type="button" :class="{ active: giphyOpen }" title="GIF / stickers" @click="giphyOpen = !giphyOpen"><i class="far fa-face-smile"></i></button>
          </div>

          <button class="publish-btn" type="button" :disabled="!canPublish" @click="publish">
            <i class="fas fa-paper-plane"></i>
            <span>{{ isPublishing ? 'Publicando...' : 'Publicar' }}</span>
          </button>
        </div>

        <div class="quick-tags">
          <button v-for="topic in topics.map(topicMeta).slice(0, 6)" :key="topic.label" type="button" @click="quickTag(topic.label)">
            #{{ topic.hashtag }}
          </button>
        </div>
        </div>

        <div v-if="giphyOpen" class="composer-sticker-overlay">
          <GiphyPicker
            embedded
            :open="giphyOpen"
            title="GIFs y stickers"
            @close="giphyOpen = false"
            @select="handleGiphySelect"
          />
        </div>
      </div>

      <aside class="community-picker-panel">
        <div class="picker-head">
          <strong>Elige comunidad</strong>
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
              <img v-if="community.iconUrl" :src="resolveAssetUrl(community.iconUrl)" alt="" />
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
      <p>Unete a una comunidad para publicar hilos.</p>
      <button type="button" @click="exploreCommunities">Explorar comunidades</button>
    </div>
  </section>
</template>

<style scoped>
.thread-composer {
  color: #f8fafc;
  position: relative;
  width: 100%;
}

.composer-shell {
  background:
    radial-gradient(circle at 82% 0%, rgba(236, 72, 153, 0.24), transparent 34%),
    radial-gradient(circle at 12% 12%, rgba(124, 58, 237, 0.32), transparent 38%),
    linear-gradient(145deg, rgba(14, 18, 44, 0.98), rgba(22, 13, 48, 0.98));
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 34px;
  box-shadow: 0 24px 70px rgba(2, 6, 23, 0.32);
  color: #f8fafc;
  display: grid;
  gap: 12px;
  padding: 18px;
  position: relative;
  overflow: visible;
  z-index: 2;
}

.composer-sticker-overlay {
  background:
    radial-gradient(circle at 22% 0%, rgba(168, 85, 247, 0.22), transparent 36%),
    radial-gradient(circle at 84% 10%, rgba(236, 72, 153, 0.18), transparent 34%),
    rgba(8, 12, 30, 0.98);
  border-radius: inherit;
  display: grid;
  inset: 0;
  overflow: hidden;
  padding: 18px;
  position: absolute;
  z-index: 26;
}

.composer-sticker-overlay :deep(.giphy-picker.embedded) {
  display: grid;
  gap: 12px;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.composer-sticker-overlay :deep(.giphy-grid),
.composer-sticker-overlay :deep(.giphy-picker.embedded .giphy-grid) {
  max-height: none;
  min-height: 0;
}

.composer-sticker-overlay :deep(.giphy-fallback) {
  align-content: start;
  overflow-y: auto;
}

@media (min-width: 860px) {
  .thread-composer.sticker-open .composer-shell {
    min-height: min(560px, calc(100dvh - 132px));
  }

  .thread-composer.sticker-open .composer-sticker-overlay {
    padding: 20px;
  }

  .composer-sticker-overlay :deep(.giphy-picker.embedded) {
    gap: 14px;
  }

  .composer-sticker-overlay :deep(.giphy-grid),
  .composer-sticker-overlay :deep(.giphy-picker.embedded .giphy-grid) {
    gap: 12px;
    grid-auto-rows: minmax(126px, 1fr);
  }

  .composer-sticker-overlay :deep(.giphy-grid button) {
    aspect-ratio: 1 / 1;
    height: auto;
    min-height: 126px;
  }
}

.composer-content {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.community-select {
  align-items: center;
  background: rgba(5, 8, 22, 0.55);
  border: 1px solid rgba(168, 85, 247, 0.52);
  border-radius: 999px;
  color: #f8fafc;
  display: grid;
  gap: 9px;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  min-height: 42px;
  padding: 5px 14px 5px 5px;
  text-align: left;
  width: min(330px, 100%);
}

.community-select span,
.community-list button > span,
.composer-avatar {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  display: grid;
  overflow: hidden;
  place-items: center;
}

.community-select span {
  height: 34px;
  width: 34px;
}

.community-select img,
.community-list img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-select strong {
  font-size: 13px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-row {
  display: grid;
  gap: 12px;
  grid-template-columns: 48px minmax(0, 1fr);
}

.composer-avatar {
  background-color: rgba(124, 58, 237, 0.18);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff;
  flex: 0 0 auto;
  font-weight: 950;
  height: 48px;
  min-height: 48px;
  min-width: 48px;
  width: 48px;
}

.composer-textarea {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.composer-textarea textarea {
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 19px;
  font-weight: 750;
  line-height: 1.25;
  max-height: 150px;
  min-height: 72px;
  outline: 0;
  resize: none;
}

.composer-textarea textarea::placeholder {
  color: #9aa6bc;
  font-weight: 650;
}

.composer-textarea small {
  color: #aeb8d3;
  font-size: 11px;
  font-weight: 900;
  justify-self: end;
}

.hashtag-suggestions,
.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hashtag-suggestions {
  background: rgba(5, 8, 22, 0.92);
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 18px;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  padding: 8px;
}

.hashtag-suggestions button,
.quick-tags button,
.active-tags span,
.active-tags em {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
}

.hashtag-suggestions button {
  background: rgba(124, 58, 237, 0.18);
  color: #f8fafc;
  min-height: 34px;
  padding: 0 11px;
}

.hashtag-suggestions small {
  color: #aeb8d3;
  font-size: 10px;
}

.active-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.active-tags span,
.active-tags em,
.quick-tags button {
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  min-height: 30px;
  padding: 0 10px;
}

.active-tags span {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(236, 72, 153, 0.18));
  color: #fff;
}

.composer-image {
  border-radius: 18px;
  margin: 0;
  overflow: hidden;
  position: relative;
}

.composer-image img {
  aspect-ratio: 16 / 7;
  object-fit: cover;
  width: 100%;
}

.composer-image figcaption {
  background: linear-gradient(90deg, rgba(3, 6, 18, 0.72), transparent);
  bottom: 0;
  color: #e9d5ff;
  font-size: 11px;
  font-weight: 950;
  left: 0;
  margin: 0;
  padding: 10px 12px;
  position: absolute;
  right: 0;
}

.composer-image button {
  background: rgba(15, 23, 42, 0.72);
  border-radius: 999px;
  color: #fff;
  height: 34px;
  position: absolute;
  right: 10px;
  top: 10px;
  width: 34px;
}

.composer-footer {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.tool-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tool-row button {
  align-items: center;
  background: transparent;
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 20px;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.tool-row button.active,
.tool-row button:hover {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}

.publish-btn {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-size: 15px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 50px;
  min-width: 128px;
  padding: 0 22px;
}

.publish-btn:disabled {
  cursor: not-allowed;
  filter: grayscale(0.2);
  opacity: 0.45;
}

.community-picker-panel {
  background:
    radial-gradient(circle at 24% 0%, rgba(168, 85, 247, 0.18), transparent 32%),
    rgba(8, 12, 30, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
  display: grid;
  gap: 12px;
  max-height: min(560px, calc(100dvh - 80px));
  opacity: 0;
  padding: 16px;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
  transform: translateY(8px) scale(0.98);
  transition: opacity 0.18s ease, transform 0.18s ease;
  width: min(520px, 100%);
  z-index: 8;
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
  color: #fff;
  font-size: 18px;
  font-weight: 950;
}

.picker-head button {
  color: #cbd5e1;
  height: 34px;
  width: 34px;
}

.community-list {
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.community-list button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: 16px;
  color: #fff;
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
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #e9d5ff;
  font-size: 13px;
  font-weight: 950;
  min-height: 42px;
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
  color: #fff;
  font-size: 18px;
}

</style>
