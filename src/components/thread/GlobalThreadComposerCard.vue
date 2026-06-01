<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, doc, getDoc, getDocs, increment, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { DEFAULT_THREAD_TOPICS, CONTENT_TAB_ICONS, OFFICIAL_COMMUNITY_ID } from '@/constants/community'
import { defaultLogoUrl, resolveAssetUrl } from '@/constants/assets'
import { resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { playPublishSound } from '@/services/uiSounds'
import GlobalGifStickerPicker from '@/components/thread/GlobalGifStickerPicker.vue'

const props = defineProps({
  userRole: { type: String, default: 'user' },
  initialCommunityId: { type: String, default: '' }
})

const emit = defineEmits(['close', 'published'])

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
const mode = ref('compose')
const communitySearch = ref('')
const isSearchFocused = ref(false)
const isMobile = ref(false)
const isMobileKeyboardOpen = ref(false)
const textAreaRef = ref(null)
const caretIndex = ref(0)

const defaultTopics = [...DEFAULT_THREAD_TOPICS]
const topicIcons = { ...CONTENT_TAB_ICONS, Torneos: 'fas fa-trophy' }
const officialFallback = {
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera',
  description: 'Noticias, eventos y conversaciones de Galaxia Nintendera.',
  iconUrl: defaultLogoUrl,
  isOfficial: true,
  threadTopics: defaultTopics
}

const user = computed(() => auth.currentUser)
const canManageOfficial = computed(() => ['admin', 'publisher'].includes(props.userRole))
const isCurrentUserBlocked = computed(() => Boolean(currentProfile.value?.isBlocked))
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
const communityChoices = computed(() => {
  if (isCurrentUserBlocked.value) return []
  return communities.value.filter((community) => {
    if (community.isOfficial || community.id === officialFallback.id) return canManageOfficial.value
    return true
  })
})
const selectedCommunity = computed(() => allowedCommunities.value.find(item => item.id === selectedCommunityId.value) || allowedCommunities.value[0] || null)
const topics = computed(() => normalizeTopics(selectedCommunity.value?.threadTopics || defaultTopics))
const selectedTopicMeta = computed(() => topicMeta(selectedTopic.value || topics.value[0] || 'Posts'))
const activeHashtags = computed(() => extractHashtags(body.value))
const mediaPreview = computed(() => selectedGif.value?.url || imageUrl.value)
const canPublish = computed(() => Boolean(!isCurrentUserBlocked.value && user.value && selectedCommunity.value && (body.value.trim() || selectedGif.value || imageUrl.value.trim()) && !isPublishing.value))
const placeholder = computed(() => `Escribe una idea para ${selectedCommunity.value?.name || 'Galaxia Nintendera'}... usa # para etiquetar`)
const filteredCommunities = computed(() => {
  const query = normalizeSearch(communitySearch.value)
  if (!query) return communityChoices.value
  return communityChoices.value.filter((community) => {
    const tags = Array.isArray(community.tags) ? community.tags.join(' ') : ''
    const text = normalizeSearch(`${community.name || ''} ${community.description || ''} ${community.category || ''} ${tags}`)
    return text.includes(query)
  })
})
const shouldHideComposerFooter = computed(() => Boolean(
  isMobile.value
  && (mode.value === 'communityPicker' || mode.value === 'gifPicker')
  && (isSearchFocused.value || isMobileKeyboardOpen.value)
))
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

const normalizeSearch = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

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

const focusComposer = () => nextTick(() => textAreaRef.value?.focus())

const updateMobileViewportState = () => {
  if (typeof window === 'undefined') return
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
  const viewportHeight = window.visualViewport?.height || window.innerHeight
  isMobileKeyboardOpen.value = isMobile.value && (window.innerHeight - viewportHeight) > 120
}

const handleComposerInput = (event) => {
  syncCaret(event)
  selectedTopic.value = deriveTopicFromText(body.value)
  resizeTextarea()
}

const selectCommunity = (community) => {
  if (!isJoinedCommunity(community)) return
  selectedCommunityId.value = community.id
  selectedTopic.value = normalizeTopics(community.threadTopics || defaultTopics)[0]
  mode.value = 'compose'
  focusComposer()
}

const isJoinedCommunity = (community) => {
  if (!community?.id) return false
  if (community.isOfficial || community.id === officialFallback.id) return canManageOfficial.value
  return joinedCommunityIds.value.includes(community.id)
}

const joinCommunity = async (community) => {
  const activeUser = user.value
  if (!activeUser || !community?.id || isJoinedCommunity(community) || isPublishing.value) return
  isPublishing.value = true
  try {
    const now = Date.now()
    await Promise.all([
      setDoc(doc(db, 'users', activeUser.uid, 'communities', community.id), {
        communityId: community.id,
        name: community.name || '',
        description: community.description || '',
        bannerUrl: community.bannerUrl || '',
        iconUrl: community.iconUrl || '',
        role: 'Miembro',
        joinedAt: now,
        updatedAt: now
      }, { merge: true }),
      setDoc(doc(db, 'communities', community.id, 'members', activeUser.uid), {
        uid: activeUser.uid,
        name: displayName.value,
        imageUrl: currentProfileIcon.value || '',
        joinedAt: now,
        updatedAt: now
      }, { merge: true }),
      updateDoc(doc(db, 'communities', community.id), {
        membersCount: increment(1),
        updatedAt: now
      }).catch(() => {})
    ])
    joinedCommunityIds.value = [...new Set([...joinedCommunityIds.value, community.id])]
    selectCommunity(community)
  } finally {
    isPublishing.value = false
  }
}

const insertTextAtCaret = (text) => {
  const start = Number(textAreaRef.value?.selectionStart ?? body.value.length)
  const end = Number(textAreaRef.value?.selectionEnd ?? start)
  body.value = `${body.value.slice(0, start)}${text}${body.value.slice(end)}`.slice(0, 240)
  caretIndex.value = Math.min(start + text.length, body.value.length)
  nextTick(() => {
    textAreaRef.value?.focus()
    textAreaRef.value?.setSelectionRange(caretIndex.value, caretIndex.value)
    resizeTextarea()
  })
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
  focusComposer()
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

const togglePoll = () => {
  pollOpen.value = !pollOpen.value
  if (pollOpen.value && !activeHashtags.value.includes('encuesta')) {
    body.value = `${body.value.trim()}${body.value.trim() ? ' ' : ''}#Encuesta`.slice(0, 240)
  }
  focusComposer()
}

const chooseQuestionType = () => {
  const questionTopic = topics.value.find(topic => normalizeKey(topic) === 'preguntas')
  insertHashtag(questionTopic || 'Preguntas')
}

const handleGifSelect = (item) => {
  if (item.type === 'emoji') {
    insertTextAtCaret(item.text)
    mode.value = 'compose'
    return
  }
  selectedGif.value = item
  imageUrl.value = ''
  mode.value = 'compose'
  focusComposer()
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
    playPublishSound()
    emit('published')
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
watch(mode, () => {
  isSearchFocused.value = false
  updateMobileViewportState()
})

onMounted(async () => {
  updateMobileViewportState()
  window.addEventListener('resize', updateMobileViewportState)
  window.addEventListener('orientationchange', updateMobileViewportState)
  window.visualViewport?.addEventListener('resize', updateMobileViewportState)
  window.visualViewport?.addEventListener('scroll', updateMobileViewportState)
  await loadContext()
  await nextTick()
  resizeTextarea()
  textAreaRef.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileViewportState)
  window.removeEventListener('orientationchange', updateMobileViewportState)
  window.visualViewport?.removeEventListener('resize', updateMobileViewportState)
  window.visualViewport?.removeEventListener('scroll', updateMobileViewportState)
})
</script>

<template>
  <article class="global-thread-card" role="dialog" aria-modal="true" aria-labelledby="global-thread-title">
    <header class="global-thread-header">
      <button class="global-thread-community" type="button" @click="mode = mode === 'communityPicker' ? 'compose' : 'communityPicker'">
        <span>
          <img v-if="selectedCommunity?.iconUrl" :src="resolveAssetUrl(selectedCommunity.iconUrl)" alt="" />
          <b v-else>{{ selectedCommunity?.name?.slice(0, 2).toUpperCase() || 'GN' }}</b>
        </span>
        <strong>{{ selectedCommunity?.name || 'Galaxia Nintendera' }}</strong>
        <i class="fas fa-chevron-down"></i>
      </button>

      <h2 id="global-thread-title">Crear hilo</h2>

      <button class="global-thread-close" type="button" aria-label="Cerrar Crear hilo" @click="emit('close')">
        <i class="fas fa-xmark"></i>
      </button>
    </header>

    <div class="global-thread-content">
      <div v-if="isLoading" class="global-thread-state">Preparando comunidades...</div>

      <div v-else-if="isCurrentUserBlocked" class="global-thread-state">
        <strong>Tu cuenta esta bloqueada</strong>
        <span>No puedes crear hilos por ahora.</span>
      </div>

      <div v-else-if="!allowedCommunities.length" class="global-thread-state">
        <strong>No tienes comunidades disponibles</strong>
        <span>Unete a una comunidad para poder publicar hilos.</span>
        <button type="button" @click="exploreCommunities">Explorar comunidades</button>
      </div>

      <Transition v-else name="global-thread-mode" mode="out-in">
        <section v-if="mode === 'communityPicker'" key="community" class="global-thread-mode-panel">
          <div class="global-thread-mode-head">
            <div>
              <strong>Elegir comunidad</strong>
              <span>{{ filteredCommunities.length }} disponibles</span>
            </div>
            <button type="button" @click="mode = 'compose'"><i class="fas fa-arrow-left"></i></button>
          </div>

          <label class="global-thread-search">
            <i class="fas fa-magnifying-glass"></i>
            <input
              v-model="communitySearch"
              type="search"
              placeholder="Buscar comunidad..."
              @focus="isSearchFocused = true"
              @blur="isSearchFocused = false"
            />
          </label>

          <div class="global-thread-community-list">
            <button
              v-for="community in filteredCommunities"
              :key="community.id"
              type="button"
              :class="{ active: community.id === selectedCommunityId, locked: !isJoinedCommunity(community) }"
              @click="selectCommunity(community)"
            >
              <span>
                <img v-if="community.iconUrl" :src="resolveAssetUrl(community.iconUrl)" alt="" />
                <b v-else>{{ community.name?.slice(0, 2).toUpperCase() }}</b>
              </span>
              <div>
                <strong class="community-picker-title">{{ community.name }}</strong>
                <small class="community-picker-description">{{ community.description || 'Comunidad' }}</small>
                <em>{{ community.isOfficial ? 'Oficial' : isJoinedCommunity(community) ? 'Miembro' : 'Disponible' }}</em>
              </div>
              <i v-if="isJoinedCommunity(community)" class="fas fa-check"></i>
              <span v-else class="community-join-pill" @click.stop="joinCommunity(community)">Unirte</span>
            </button>

            <p v-if="!filteredCommunities.length" class="global-thread-empty-list">No encontramos comunidades con ese nombre</p>
          </div>
        </section>

        <section v-else-if="mode === 'gifPicker'" key="gif" class="global-thread-mode-panel gif-mode">
          <GlobalGifStickerPicker
            open
            @close="mode = 'compose'"
            @select="handleGifSelect"
            @search-focus-change="isSearchFocused = $event"
          />
        </section>

        <section v-else key="compose" class="global-thread-compose">
          <div class="global-thread-prompt">
            <div class="global-thread-prompt-head">
              <strong>Que quieres compartir?</strong>
              <div class="global-thread-mobile-tools" aria-label="Herramientas rapidas">
                <button type="button" title="Imagen" @click="pasteImageUrl"><i class="far fa-image"></i></button>
                <button type="button" :class="{ active: spoiler }" title="Spoiler" @click="spoiler = !spoiler"><i class="fas fa-eye-slash"></i></button>
                <button type="button" :class="{ active: mode === 'gifPicker' }" title="GIF / stickers" @click="mode = mode === 'gifPicker' ? 'compose' : 'gifPicker'"><i class="far fa-face-smile"></i></button>
              </div>
            </div>
            <div class="global-thread-topic-row">
              <button
                v-for="topic in topics.map(topicMeta).slice(0, 5)"
                :key="topic.label"
                type="button"
                :class="{ active: selectedTopic === topic.label }"
                @click="insertHashtag(topic.label)"
              >
                <i :class="topic.icon"></i>
                <span>{{ topic.displayLabel }}</span>
              </button>
            </div>
          </div>

          <div class="global-thread-editor">
            <div class="global-thread-avatar" :class="{ special: currentProfileIconMeta.special }" :style="currentProfileIcon ? { backgroundImage: `url(${currentProfileIcon})` } : null">
              <span v-if="!currentProfileIcon">{{ userInitial }}</span>
            </div>
            <label>
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

          <div v-if="showHashtagSuggestions" class="global-thread-suggestions">
            <button v-for="topic in hashtagSuggestions" :key="topic.label" type="button" @pointerdown.prevent="insertHashtag(topic.label)">
              <i :class="topic.icon"></i>
              #{{ topic.hashtag }}
            </button>
          </div>

          <figure v-if="mediaPreview" class="global-thread-media" :class="{ 'is-gif': selectedGif }">
            <img :src="mediaPreview" alt="" />
            <figcaption v-if="selectedGif">{{ selectedGif.title }}</figcaption>
            <button type="button" aria-label="Quitar media" @click="imageUrl = ''; selectedGif = null">
              <i class="fas fa-xmark"></i>
            </button>
          </figure>

        </section>
      </Transition>
    </div>

    <footer class="global-thread-footer" :class="{ 'is-hidden': shouldHideComposerFooter }">
      <div class="global-thread-tools">
        <button type="button" title="Imagen" @click="pasteImageUrl"><i class="far fa-image"></i></button>
        <button type="button" :class="{ active: spoiler }" title="Spoiler" @click="spoiler = !spoiler"><i class="fas fa-eye-slash"></i></button>
        <button type="button" :class="{ active: pollOpen }" title="Encuesta" @click="togglePoll"><i class="fas fa-chart-simple"></i></button>
        <button type="button" title="Pregunta" @click="chooseQuestionType"><i class="far fa-circle-question"></i></button>
        <button type="button" :class="{ active: mode === 'gifPicker' }" title="GIF / stickers" @click="mode = mode === 'gifPicker' ? 'compose' : 'gifPicker'"><i class="far fa-face-smile"></i></button>
      </div>

      <span class="global-thread-chip"><i :class="selectedTopicMeta.icon"></i>#{{ selectedTopicMeta.hashtag }}</span>

      <button class="global-thread-publish" type="button" :disabled="!canPublish" @click="publish">
        <i class="fas fa-paper-plane"></i>
        <span>{{ isPublishing ? 'Publicando...' : 'Publicar' }}</span>
      </button>
    </footer>
  </article>
</template>

<style scoped>
.global-thread-card {
  background:
    radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.28), transparent 34%),
    radial-gradient(circle at 90% 8%, rgba(236, 72, 153, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(10, 10, 34, 0.98), rgba(5, 7, 22, 0.99));
  border: 1px solid rgba(168, 85, 247, 0.42);
  border-radius: 28px;
  box-shadow:
    0 28px 90px rgba(0, 0, 0, 0.48),
    0 0 48px rgba(168, 85, 247, 0.18);
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  height: min(680px, calc(var(--global-thread-vvh, 100dvh) - 64px));
  max-height: min(760px, calc(var(--global-thread-vvh, 100dvh) - 64px));
  overflow: hidden;
  position: relative;
  width: min(720px, 92vw);
}

.global-thread-header,
.global-thread-footer,
.global-thread-tools,
.global-thread-topic-row,
.global-thread-community,
.global-thread-editor,
.global-thread-publish,
.global-thread-chip {
  align-items: center;
  display: flex;
}

.global-thread-header {
  gap: 12px;
  justify-content: space-between;
  padding: 16px 18px 8px;
}

.global-thread-header h2 {
  color: #fff;
  font-size: 14px;
  font-weight: 950;
  margin: 0;
}

.global-thread-community {
  background: rgba(5, 8, 22, 0.78);
  border: 1px solid rgba(168, 85, 247, 0.46);
  border-radius: 999px;
  color: #fff;
  gap: 10px;
  min-height: 44px;
  min-width: 0;
  padding: 4px 14px 4px 4px;
  max-width: min(360px, 72vw);
}

.global-thread-community span,
.global-thread-community-list button > span,
.global-thread-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #fff;
  display: flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  height: 36px;
  justify-content: center;
  overflow: hidden;
  width: 36px;
}

.global-thread-community img,
.global-thread-community-list img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.global-thread-community strong {
  font-size: 13px;
  font-weight: 950;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-thread-close {
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.global-thread-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: 8px 18px 14px;
  position: relative;
  touch-action: pan-y;
}

.global-thread-state {
  align-content: center;
  color: #a7adc4;
  display: grid;
  gap: 10px;
  min-height: 260px;
  justify-items: center;
  text-align: center;
}

.global-thread-state strong {
  color: #fff;
}

.global-thread-state button {
  background: #8b5cf6;
  border-radius: 999px;
  color: #fff;
  font-weight: 900;
  min-height: 40px;
  padding: 0 16px;
}

.global-thread-mode-panel,
.global-thread-compose {
  display: grid;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.global-thread-mode-panel {
  grid-template-rows: auto auto minmax(0, 1fr);
}

.global-thread-mode-panel.gif-mode {
  grid-template-rows: minmax(0, 1fr);
}

.global-thread-compose {
  align-content: start;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.global-thread-mode-head,
.global-thread-search {
  align-items: center;
  display: flex;
}

.global-thread-mode-head {
  gap: 12px;
  justify-content: space-between;
}

.global-thread-mode-head div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.global-thread-mode-head strong {
  color: #fff;
  font-size: 18px;
  font-weight: 950;
}

.global-thread-mode-head span {
  color: #a7adc4;
  font-size: 11px;
  font-weight: 850;
}

.global-thread-mode-head button {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  height: 36px;
  justify-content: center;
  order: -1;
  width: 36px;
}

.global-thread-search {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #c4b5fd;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
}

.global-thread-search input {
  background: transparent;
  border: 0;
  color: #fff;
  flex: 1;
  font-size: 13px;
  font-weight: 850;
  min-width: 0;
  outline: none;
}

.global-thread-community-list {
  align-content: flex-start;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-start;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 8px;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.global-thread-community-list button {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #fff;
  display: grid;
  gap: 12px;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  height: auto;
  max-height: 92px;
  min-height: 76px;
  padding: 12px 14px;
  text-align: left;
}

.global-thread-community-list button > span {
  height: 52px;
  width: 52px;
}

.global-thread-community-list div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.community-picker-title,
.community-picker-description,
.global-thread-community-list em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-thread-community-list small {
  color: #9ca3af;
  font-size: 11px;
  font-weight: 800;
}

.global-thread-community-list em {
  color: #c084fc;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}

.global-thread-community-list button > i {
  align-items: center;
  background: rgba(168, 85, 247, 0.18);
  border-radius: 999px;
  color: #a855f7;
  display: inline-flex;
  height: 28px;
  justify-content: center;
  opacity: 0;
  width: 28px;
}

.community-join-pill {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  width: auto;
}

.global-thread-community-list button.locked {
  cursor: default;
}

.global-thread-community-list button.active {
  border-color: rgba(216, 180, 254, 0.42);
  background: rgba(168, 85, 247, 0.18);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.08);
}

.global-thread-community-list button.active > i {
  opacity: 1;
}

.global-thread-empty-list {
  color: #a7adc4;
  font-size: 13px;
  font-weight: 850;
  margin: 22px 0;
  text-align: center;
}

.global-thread-prompt {
  display: grid;
  gap: 10px;
}

.global-thread-prompt-head {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
}

.global-thread-prompt-head > strong,
.global-thread-prompt > strong {
  color: #fff;
  font-size: 20px;
  font-weight: 950;
}

.global-thread-mobile-tools {
  display: none;
}

.global-thread-topic-row {
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.global-thread-topic-row button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
}

.global-thread-topic-row button.active,
.global-thread-tools button.active,
.global-thread-mobile-tools button.active {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #fff;
}

.global-thread-editor {
  align-items: start;
  background: rgba(4, 6, 22, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  gap: 12px;
  padding: 14px;
  min-height: 0;
}

.global-thread-avatar {
  background-size: cover;
  height: 42px;
  width: 42px;
}

.global-thread-avatar.special {
  box-shadow: 0 0 0 2px rgba(216, 180, 254, 0.2), 0 0 20px rgba(168, 85, 247, 0.32);
}

.global-thread-editor label {
  display: grid;
  flex: 1;
  gap: 8px;
  min-width: 0;
}

.global-thread-editor textarea {
  background: transparent;
  border: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.45;
  min-height: 118px;
  outline: none;
  resize: none;
  width: 100%;
}

.global-thread-editor textarea::placeholder {
  color: #8e96b3;
}

.global-thread-editor small {
  color: #a7adc4;
  font-size: 12px;
  font-weight: 900;
  justify-self: end;
}

.global-thread-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.global-thread-suggestions button,
.global-thread-chip {
  background: rgba(168, 85, 247, 0.18);
  border-radius: 999px;
  color: #e9d5ff;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
}

.global-thread-media {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  margin: 0;
  max-width: min(360px, 100%);
  overflow: hidden;
  position: relative;
}

.global-thread-media img {
  background: #050816;
  display: block;
  max-height: 220px;
  object-fit: contain;
  width: 100%;
}

.global-thread-media:not(.is-gif) {
  max-width: 100%;
}

.global-thread-media:not(.is-gif) img {
  aspect-ratio: 16 / 8;
  object-fit: cover;
}

.global-thread-media figcaption {
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.7));
  bottom: 0;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  left: 0;
  padding: 24px 12px 10px;
  position: absolute;
  right: 0;
}

.global-thread-media button {
  align-items: center;
  background: rgba(0, 0, 0, 0.52);
  border-radius: 999px;
  color: #fff;
  display: flex;
  height: 34px;
  justify-content: center;
  position: absolute;
  right: 10px;
  top: 10px;
  width: 34px;
}

.global-thread-footer {
  background: rgba(5, 7, 22, 0.94);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
  padding: 14px 18px 16px;
  flex-shrink: 0;
  max-height: 140px;
  opacity: 1;
  overflow: hidden;
  transform: translateY(0);
  transition:
    opacity 0.2s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    max-height 0.22s ease,
    padding 0.22s ease,
    border-color 0.2s ease;
}

.global-thread-footer.is-hidden {
  border-top-color: transparent;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding-bottom: 0;
  padding-top: 0;
  pointer-events: none;
  transform: translateY(120%);
}

.global-thread-tools {
  gap: 8px;
  min-width: 0;
}

.global-thread-tools button {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #d8dcef;
  display: inline-flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.global-thread-mobile-tools button {
  align-items: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #d8dcef;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.global-thread-chip {
  margin-left: auto;
  white-space: nowrap;
}

.global-thread-publish {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #fff;
  gap: 8px;
  font-size: 12px;
  font-weight: 950;
  justify-content: center;
  min-height: 42px;
  min-width: 118px;
  padding: 0 18px;
}

.global-thread-publish:disabled {
  cursor: not-allowed;
  filter: grayscale(0.25);
  opacity: 0.55;
}

.global-thread-mode-enter-active,
.global-thread-mode-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.global-thread-mode-enter-from,
.global-thread-mode-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 768px) {
  .global-thread-card {
    border: 0;
    border-radius: 0;
    height: var(--global-thread-vvh, 100dvh);
    max-height: var(--global-thread-vvh, 100dvh);
    width: 100vw;
  }

  .global-thread-header {
    align-items: center;
    gap: 10px;
    justify-content: space-between;
    padding: calc(12px + env(safe-area-inset-top, 0px)) 14px 8px;
  }

  .global-thread-header h2 {
    display: none;
  }

  .global-thread-community {
    flex: 0 1 auto;
    max-width: calc(100vw - 88px);
    width: fit-content;
  }

  .global-thread-close {
    flex: 0 0 auto;
  }

  .global-thread-content {
    padding: 8px 14px;
  }

  .global-thread-prompt {
    gap: 8px;
  }

  .global-thread-prompt-head > strong,
  .global-thread-prompt > strong {
    font-size: 18px;
  }

  .global-thread-prompt-head {
    gap: 8px;
  }

  .global-thread-mobile-tools {
    display: inline-flex;
    flex: 0 0 auto;
    gap: 6px;
    margin-left: auto;
  }

  .global-thread-mobile-tools button {
    height: 32px;
    width: 32px;
  }

  .global-thread-topic-row {
    display: none;
  }

  .global-thread-editor {
    gap: 10px;
    padding: 12px;
  }

  .global-thread-editor textarea {
    font-size: 15px;
    min-height: min(30dvh, 210px);
  }

  .global-thread-community-list button {
    grid-template-columns: 48px minmax(0, 1fr) auto;
    max-height: 86px;
    min-height: 72px;
    padding: 10px 12px;
  }

  .global-thread-community-list button > span {
    height: 48px;
    width: 48px;
  }

  .community-join-pill {
    font-size: 10px;
    min-height: 28px;
    padding: 0 10px;
  }

  .global-thread-footer {
    display: flex;
    justify-content: flex-end;
    padding: 8px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .global-thread-tools {
    display: none;
  }

  .global-thread-chip {
    display: none;
  }

  .global-thread-publish {
    height: 50px;
    min-width: 46px;
    padding: 0 14px;
  }

  .global-thread-publish span {
    display: none;
  }
}
</style>
