<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const router = useRouter()
const open = ref(false)
const loading = ref(false)
const posts = ref([])
const communities = ref([])
const threads = ref([])
const liveSettings = ref({
  youtubeChannelId: import.meta.env.VITE_YOUTUBE_CHANNEL_ID || '',
  youtubeHandle: import.meta.env.VITE_YOUTUBE_HANDLE || 'GalaxiaNintendera',
  twitchChannel: import.meta.env.VITE_TWITCH_CHANNEL || '',
  tiktokUser: import.meta.env.VITE_TIKTOK_USER || ''
})
const botConfig = ref({
  greetings: ['Hola, bienvenido a la galaxia.', 'Tenemos novedades para ti.', 'Toca la mascota para ver que brilla hoy.'],
  reactions: {
    postCreated: ['Que gran post acaba de nacer.', 'Nueva publicacion en la galaxia.', 'Esto va a brillar fuerte.']
  }
})
const currentRole = ref('user')
const configOpen = ref(false)
const configJson = ref('')
const configError = ref('')
const configSaving = ref(false)
const showTip = ref(false)
const activeTipIndex = ref(0)
const customTip = ref('')
let tipInterval = null
let tipTimeout = null
let unsubscribeAuth = null

const latestPosts = computed(() => posts.value.slice(0, 3))
const latestCommunities = computed(() => communities.value.slice(0, 3))
const topThreads = computed(() => [...threads.value]
  .sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
  .slice(0, 3))
const nextLiveHint = computed(() => {
  if (liveSettings.value.youtubeChannelId) return `YouTube: @${liveSettings.value.youtubeHandle || 'GalaxiaNintendera'}`
  if (liveSettings.value.twitchChannel) return `Twitch: ${liveSettings.value.twitchChannel}`
  if (liveSettings.value.tiktokUser) return `TikTok: ${liveSettings.value.tiktokUser}`
  return 'Pronto anunciaremos el siguiente directo.'
})
const isAdmin = computed(() => currentRole.value === 'admin')
const mascotTips = computed(() => {
  const tips = [...(botConfig.value.greetings || [])]
  if (latestPosts.value[0]) tips.push(`Nueva noticia: ${latestPosts.value[0].title}`)
  if (topThreads.value[0]) tips.push(`Hilo destacado con ${Number(topThreads.value[0].likes || 0)} likes.`)
  if (latestCommunities.value[0]) tips.push(`Nueva comunidad: ${latestCommunities.value[0].name}`)
  if (liveSettings.value.youtubeChannelId || liveSettings.value.twitchChannel || liveSettings.value.tiktokUser) tips.push(`Live configurado: ${nextLiveHint.value}`)
  return tips
})
const activeTip = computed(() => customTip.value || mascotTips.value[activeTipIndex.value % mascotTips.value.length])

const getMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.toMillis) return value.toMillis()
  if (value?.seconds) return value.seconds * 1000
  return Number(new Date(value)) || 0
}

const formatDate = (value) => {
  const millis = getMillis(value)
  if (!millis) return 'Nuevo'
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' }).format(new Date(millis))
}

const loadMascotFeed = async () => {
  loading.value = true
  try {
    const [postsSnap, communitiesSnap, threadsSnap, configSnap] = await Promise.all([
      getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(8))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'communities'), orderBy('createdAt', 'desc'), limit(8))).catch(() => ({ docs: [] })),
      getDocs(query(collection(db, 'communityThreads'), orderBy('updatedAt', 'desc'), limit(20))).catch(() => ({ docs: [] })),
      getDoc(doc(db, 'siteConfig', 'mascotBot')).catch(() => null)
    ])

    posts.value = postsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    communities.value = communitiesSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    threads.value = threadsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    if (configSnap?.exists?.()) {
      botConfig.value = {
        ...botConfig.value,
        ...configSnap.data()
      }
    }
    configJson.value = JSON.stringify(botConfig.value, null, 2)
  } finally {
    loading.value = false
  }
}

const toggleMascot = async () => {
  open.value = !open.value
  showTip.value = false
  window.clearTimeout(tipTimeout)
  if (open.value && !posts.value.length && !communities.value.length && !threads.value.length) {
    await loadMascotFeed()
  }
}

const handleExternalPanelOpen = (event) => {
  if (['music', 'chat'].includes(event.detail?.source)) {
    open.value = false
    showTip.value = false
    customTip.value = ''
    window.clearTimeout(tipTimeout)
  }
}

const goTo = (to) => {
  open.value = false
  router.push(to)
}

const loadCurrentRole = async (user) => {
  currentRole.value = 'user'
  if (!user) return
  const snap = await getDoc(doc(db, 'users', user.uid)).catch(() => null)
  currentRole.value = snap?.data?.()?.role || 'user'
}

const openConfig = () => {
  configError.value = ''
  configJson.value = JSON.stringify(botConfig.value, null, 2)
  configOpen.value = !configOpen.value
}

const saveConfig = async () => {
  if (!isAdmin.value) return
  configSaving.value = true
  configError.value = ''
  try {
    const parsed = JSON.parse(configJson.value || '{}')
    const nextConfig = {
      greetings: Array.isArray(parsed.greetings) ? parsed.greetings.map(item => String(item).trim()).filter(Boolean) : botConfig.value.greetings,
      reactions: typeof parsed.reactions === 'object' && parsed.reactions ? parsed.reactions : botConfig.value.reactions,
      updatedAt: Date.now()
    }
    await setDoc(doc(db, 'siteConfig', 'mascotBot'), nextConfig, { merge: true })
    botConfig.value = { ...botConfig.value, ...nextConfig }
    configJson.value = JSON.stringify(botConfig.value, null, 2)
    configOpen.value = false
    showMascotMessage('Configuracion de la mascota guardada.')
  } catch (error) {
    configError.value = error.message || 'JSON invalido.'
  } finally {
    configSaving.value = false
  }
}

const showMascotMessage = (message) => {
  customTip.value = message
  showTip.value = true
  window.clearTimeout(tipTimeout)
  tipTimeout = window.setTimeout(() => {
    showTip.value = false
    customTip.value = ''
  }, 5200)
}

const handleMascotReaction = (event) => {
  const type = event.detail?.type || ''
  const messages = botConfig.value.reactions?.[type] || []
  const message = messages[Math.floor(Math.random() * messages.length)] || event.detail?.message
  if (message) showMascotMessage(message)
}

const pulseTip = () => {
  if (open.value || !mascotTips.value.length) return
  customTip.value = ''
  activeTipIndex.value = (activeTipIndex.value + 1) % mascotTips.value.length
  showTip.value = true
  window.clearTimeout(tipTimeout)
  tipTimeout = window.setTimeout(() => {
    showTip.value = false
  }, 5200)
}

onMounted(() => {
  window.setTimeout(loadMascotFeed, 800)
  unsubscribeAuth = onAuthStateChanged(auth, loadCurrentRole)
  window.addEventListener('mascot-reaction', handleMascotReaction)
  window.addEventListener('floating-panel-opened', handleExternalPanelOpen)
  tipTimeout = window.setTimeout(pulseTip, 1800)
  tipInterval = window.setInterval(pulseTip, 18000)
})

onUnmounted(() => {
  unsubscribeAuth?.()
  window.removeEventListener('mascot-reaction', handleMascotReaction)
  window.removeEventListener('floating-panel-opened', handleExternalPanelOpen)
  window.clearInterval(tipInterval)
  window.clearTimeout(tipTimeout)
})

watch(open, (isOpen) => {
  if (!isOpen) return
  window.dispatchEvent(new CustomEvent('floating-panel-opened', {
    detail: { source: 'mascot' }
  }))
})
</script>

<template>
  <button
    class="mascot-bubble-fab"
    :class="{ open }"
    type="button"
    aria-label="Abrir novedades de Galaxia"
    @click="toggleMascot"
  >
    <span class="mascot-orbit"></span>
    <span class="mascot-face" aria-hidden="true">
      <span class="mascot-eye left"></span>
      <span class="mascot-eye right"></span>
    </span>
  </button>

  <Transition name="mascot-tip">
    <button v-if="showTip && !open" class="mascot-tip-cloud" type="button" @click="toggleMascot">
      <span>{{ activeTip }}</span>
    </button>
  </Transition>

  <Transition name="mascot-pop">
    <section v-if="open" class="mascot-panel">
      <header class="mascot-head">
        <div>
          <span>Tu guia galactica</span>
          <h2>Novedades de la galaxia</h2>
          <p>Noticias, comunidades, hilos destacados y proximos directos.</p>
        </div>
        <div class="mascot-head-actions">
          <button v-if="isAdmin" type="button" aria-label="Configurar mascota" @click="openConfig">
            <i class="fas fa-code"></i>
          </button>
          <button type="button" aria-label="Cerrar mascota" @click="open = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </header>

      <section v-if="configOpen && isAdmin" class="mascot-config-card">
        <div>
          <strong>JSON de la mascota</strong>
          <small>Agrega saludos y reacciones. Ej: reactions.postCreated.</small>
        </div>
        <textarea v-model="configJson" spellcheck="false"></textarea>
        <p v-if="configError">{{ configError }}</p>
        <button type="button" :disabled="configSaving" @click="saveConfig">
          {{ configSaving ? 'Guardando...' : 'Guardar JSON' }}
        </button>
      </section>

      <div v-if="loading" class="mascot-loading">Cargando novedades...</div>

      <div v-else class="mascot-grid">
        <article class="mascot-card wide">
          <span><i class="fas fa-newspaper"></i> Ultimas noticias</span>
          <button
            v-for="post in latestPosts"
            :key="post.id"
            type="button"
            @click="goTo(`/post/${post.id}`)"
          >
            <strong>{{ post.title || 'Publicacion sin titulo' }}</strong>
            <small>{{ post.category || post.categories?.[0] || 'Noticia' }} - {{ formatDate(post.createdAt || post.updatedAt) }}</small>
          </button>
        </article>

        <article class="mascot-card">
          <span><i class="fas fa-users"></i> Comunidades nuevas</span>
          <button
            v-for="community in latestCommunities"
            :key="community.id"
            type="button"
            @click="goTo(`/comunidad?id=${community.id}`)"
          >
            <strong>{{ community.name || 'Comunidad' }}</strong>
            <small>{{ community.description || 'Nueva zona de reunion' }}</small>
          </button>
        </article>

        <article class="mascot-card">
          <span><i class="fas fa-fire"></i> Hilos con mas brillo</span>
          <button
            v-for="thread in topThreads"
            :key="thread.id"
            type="button"
            @click="goTo(`/comunidad?id=${thread.communityId || ''}`)"
          >
            <strong>{{ thread.title || thread.text || 'Hilo destacado' }}</strong>
            <small>{{ Number(thread.likes || 0) }} likes - {{ thread.communityName || 'Comunidad' }}</small>
          </button>
        </article>

        <article class="mascot-card live">
          <span><i class="far fa-calendar"></i> Calendario live</span>
          <h3>{{ nextLiveHint }}</h3>
          <p>La mascota te avisara cuando haya directo o evento activo.</p>
          <button type="button" @click="goTo('/comunidad')">Ver comunidades</button>
        </article>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.mascot-bubble-fab {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 999px;
  box-shadow: none;
  display: grid;
  height: 54px;
  isolation: isolate;
  overflow: visible;
  place-items: center;
  position: fixed;
  right: var(--galaxy-dock-mascot-right, 84px);
  bottom: var(--galaxy-dock-bottom, 22px);
  width: 54px;
  z-index: 264;
}

.mascot-bubble-fab::before {
  background:
    linear-gradient(135deg, rgba(8, 12, 30, 0.94), rgba(12, 16, 36, 0.92));
  backdrop-filter: blur(18px);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: inherit;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.32);
  content: "";
  inset: -7px var(--galaxy-dock-pill-right, -74px) -7px -10px;
  opacity: 1;
  pointer-events: none;
  position: absolute;
  z-index: -3;
}

.mascot-bubble-fab::after {
  animation: mascot-outer-pulse 2.8s ease-in-out infinite;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.24), rgba(168, 85, 247, 0.14) 46%, transparent 70%);
  border-radius: inherit;
  content: "";
  inset: -5px;
  pointer-events: none;
  position: absolute;
  z-index: -3;
}

.mascot-face {
  align-items: center;
  animation: mascot-float 3.2s ease-in-out infinite;
  background:
    linear-gradient(#050816, #050816) padding-box,
    conic-gradient(from 205deg, #ec4899, #a855f7, #22d3ee, #facc15, #ec4899) border-box;
  border: 2px solid transparent;
  border-radius: 999px;
  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.07), 0 0 14px rgba(236, 72, 153, 0.42);
  display: flex;
  gap: 10px;
  height: 54px;
  justify-content: center;
  position: relative;
  width: 54px;
}

.mascot-face::before {
  display: none;
}

.mascot-face::after {
  display: none;
}

.mascot-eye {
  animation: mascot-blink 5.6s infinite;
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.82);
  height: 19px;
  transform-origin: center;
  width: 9px;
}

.mascot-bubble-fab:hover .mascot-eye {
  border-radius: 999px 999px 4px 4px;
  height: 10px;
  transform: translateY(1px);
}

.mascot-bubble-fab.open .mascot-eye {
  animation: none;
  height: 10px;
  transform: translateY(-1px) rotate(8deg);
}

.mascot-orbit {
  border: 1px solid rgba(34, 211, 238, 0.42);
  border-radius: 999px;
  inset: 0;
  opacity: 0;
  position: absolute;
  transform: scale(0.72);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.mascot-bubble-fab:hover .mascot-orbit,
.mascot-bubble-fab.open .mascot-orbit {
  opacity: 1;
  transform: scale(1);
}

.mascot-tip-cloud {
  background:
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) padding-box,
    linear-gradient(135deg, #facc15, #ec4899, #a855f7, #22d3ee) border-box;
  border: 2px solid transparent;
  border-radius: 18px;
  bottom: calc(var(--galaxy-dock-bottom, 22px) + 76px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.78),
    0 0 24px rgba(34, 211, 238, 0.24),
    0 0 38px rgba(236, 72, 153, 0.24),
    0 20px 52px rgba(15, 23, 42, 0.3);
  color: #111827;
  font-size: 12px;
  font-weight: 950;
  isolation: isolate;
  line-height: 1.25;
  max-width: min(340px, calc(100vw - 28px));
  min-width: min(260px, calc(100vw - 28px));
  padding: 13px 15px;
  position: fixed;
  right: max(14px, calc(var(--galaxy-dock-mascot-right, 84px) - 42px));
  text-align: left;
  z-index: 263;
}

.mascot-tip-cloud::after {
  background: #ffffff;
  border-bottom: 2px solid rgba(236, 72, 153, 0.55);
  border-right: 2px solid rgba(34, 211, 238, 0.45);
  bottom: -8px;
  box-shadow: 6px 6px 18px rgba(168, 85, 247, 0.2);
  content: "";
  height: 14px;
  position: absolute;
  right: 48px;
  transform: rotate(45deg);
  width: 14px;
  z-index: -1;
}

:global(body.direct-chat-available) .mascot-tip-cloud {
  right: max(14px, calc(var(--galaxy-dock-mascot-right, 146px) - 42px));
}

.mascot-tip-cloud span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mascot-panel {
  background: linear-gradient(145deg, rgba(8, 13, 43, 0.98), rgba(18, 7, 38, 0.98));
  border: 1px solid rgba(168, 85, 247, 0.36);
  border-radius: 22px;
  bottom: 92px;
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.14), 0 28px 90px rgba(0, 0, 0, 0.46);
  color: #ffffff;
  overflow: hidden;
  padding: 18px;
  position: fixed;
  right: 22px;
  width: min(760px, calc(100vw - 28px));
  z-index: 275;
}

.mascot-panel::before {
  background: linear-gradient(90deg, #ec4899, #a855f7, #22d3ee, #facc15, #ec4899);
  content: "";
  height: 3px;
  inset: 0 0 auto;
  position: absolute;
  animation: mascot-border-slide 4s linear infinite;
}

.mascot-head {
  align-items: start;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}

.mascot-head span,
.mascot-card > span {
  color: #c084fc;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.mascot-head h2 {
  font-size: 24px;
  font-weight: 950;
  line-height: 1.05;
  margin-top: 4px;
}

.mascot-head p,
.mascot-card small,
.mascot-card p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
}

.mascot-head-actions {
  display: flex;
  gap: 8px;
}

.mascot-head-actions button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #ffffff;
  height: 38px;
  width: 38px;
}

.mascot-config-card {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(168, 85, 247, 0.24);
  border-radius: 16px;
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 14px;
}

.mascot-config-card strong {
  color: #ffffff;
  display: block;
  font-size: 13px;
  font-weight: 950;
}

.mascot-config-card small,
.mascot-config-card p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 750;
}

.mascot-config-card p {
  color: #fecaca;
}

.mascot-config-card textarea {
  background: rgba(3, 6, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #e5e7eb;
  font: 800 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  min-height: 170px;
  outline: none;
  padding: 12px;
  resize: vertical;
}

.mascot-config-card button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  min-height: 40px;
}

.mascot-loading {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  color: #dbeafe;
  font-weight: 850;
  padding: 24px;
  text-align: center;
}

.mascot-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mascot-card {
  background: rgba(255, 255, 255, 0.065);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: grid;
  gap: 10px;
  padding: 14px;
}

.mascot-card.wide {
  grid-row: span 2;
}

.mascot-card button {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid transparent;
  border-radius: 12px;
  color: #ffffff;
  display: grid;
  gap: 4px;
  padding: 11px;
  text-align: left;
}

.mascot-card button:hover {
  border-color: rgba(34, 211, 238, 0.45);
}

.mascot-card strong {
  display: -webkit-box;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mascot-card.live h3 {
  color: #fef3c7;
  font-size: 15px;
  font-weight: 950;
}

.mascot-card.live button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  justify-content: center;
  text-align: center;
}

.mascot-pop-enter-active,
.mascot-pop-leave-active,
.mascot-tip-enter-active,
.mascot-tip-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.mascot-pop-enter-from,
.mascot-pop-leave-to,
.mascot-tip-enter-from,
.mascot-tip-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@keyframes mascot-glow-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes mascot-border-slide {
  from {
    transform: translateX(-35%);
  }

  to {
    transform: translateX(35%);
  }
}

@keyframes mascot-float {
  0%, 100% {
    transform: translateY(1px);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes mascot-blink {
  0%, 92%, 100% {
    transform: scaleY(1);
  }

  95% {
    transform: scaleY(0.12);
  }
}

@keyframes mascot-outer-pulse {
  0%, 100% {
    opacity: 0.28;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.62;
    transform: scale(1.04);
  }
}

@keyframes mascot-inner-pulse {
  0%, 100% {
    opacity: 0.42;
    transform: scale(0.92);
  }

  50% {
    opacity: 0.86;
    transform: scale(1.05);
  }
}

@media (max-width: 859px) {
  .mascot-bubble-fab {
    height: 54px;
    width: 54px;
  }

  .mascot-bubble-fab::before {
    inset: -7px var(--galaxy-dock-pill-right, -74px) -7px -10px;
  }

  .mascot-face {
    height: 54px;
    width: 54px;
  }

  .mascot-tip-cloud {
    bottom: calc(var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom))) + 72px);
    left: auto;
    max-width: min(340px, calc(100vw - 24px));
    min-width: min(250px, calc(100vw - 24px));
    right: max(12px, calc(var(--galaxy-dock-mascot-right, 78px) - 52px));
  }

  :global(body.direct-chat-available) .mascot-tip-cloud {
    right: max(12px, calc(var(--galaxy-dock-mascot-right, 140px) - 52px));
  }

  :global(body.community-quick-nav-active) .mascot-tip-cloud {
    bottom: calc(var(--galaxy-dock-bottom, calc(84px + env(safe-area-inset-bottom))) + 132px);
    right: max(12px, calc(var(--galaxy-dock-mascot-right, 140px) - 52px));
  }

  .mascot-panel {
    bottom: calc(var(--mobile-bottom-nav-height, 82px) + 12px + env(safe-area-inset-bottom));
    border-radius: 20px;
    left: 10px;
    max-height: none;
    overflow-y: auto;
    right: 10px;
    top: calc(var(--public-nav-offset, 72px) + 10px);
    width: auto;
  }

  .mascot-head {
    background: linear-gradient(145deg, rgba(8, 13, 43, 0.98), rgba(18, 7, 38, 0.98));
    border-bottom: 1px solid rgba(168, 85, 247, 0.16);
    margin: -18px -18px 14px;
    padding: 18px 18px 12px;
    position: sticky;
    top: -18px;
  }

  .mascot-grid {
    grid-template-columns: 1fr;
  }

  .mascot-card.wide {
    grid-row: auto;
  }
}
</style>
