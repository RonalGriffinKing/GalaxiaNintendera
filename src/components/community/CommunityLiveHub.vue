<script setup>
import { ref } from 'vue'

defineProps({
  youtubeVideosLoading: Boolean,
  youtubeStageEmbedUrl: { type: String, default: '' },
  currentLiveGoal: { type: Object, default: null },
  featuredVideoIsLive: Boolean,
  featuredYoutubeVideo: { type: Object, default: null },
  youtubeStageTitle: { type: String, default: '' },
  youtubeStageDescription: { type: String, default: '' },
  featuredVideoActionIcon: { type: String, default: '' },
  featuredVideoActionLabel: { type: String, default: '' },
  youtubeVideosUrl: { type: String, default: '' },
  videoDiscussionTitle: { type: String, default: '' },
  videoDiscussionSubtitle: { type: String, default: '' },
  activeVideoSecond: { type: Number, default: 0 },
  visibleVideoChatMessages: { type: Array, default: () => [] },
  videoDiscussionPlaceholder: { type: String, default: '' },
  filteredOfficialVideos: { type: Array, default: () => [] },
  youtubeChannelUrl: { type: String, default: '' },
  officialVideoLibrary: { type: Array, default: () => [] },
  officialVideoFilters: { type: Array, default: () => [] },
  officialVideoFilter: { type: String, default: 'all' },
  officialVideoPage: { type: Number, default: 0 },
  pagedOfficialVideos: { type: Array, default: () => [] },
  officialVideoPageCount: { type: Number, default: 1 },
  youtubeVideosError: { type: String, default: '' },
  youtubeApiKey: { type: String, default: '' },
  youtubeUploadsUrl: { type: String, default: '' },
  formatVideoChatTime: { type: Function, required: true },
  avatarInitial: { type: Function, required: true },
  hasLikedVideoMessage: { type: Function, required: true },
  canDeleteVideoMessage: { type: Function, required: true },
  formatVideoDate: { type: Function, required: true }
})

const videoChatDraft = defineModel('videoChatDraft', {
  type: String,
  default: ''
})
const videoReplyDrafts = defineModel('videoReplyDrafts', {
  type: Object,
  default: () => ({})
})

const liveStageEl = ref(null)

defineExpose({
  getBoundingClientRect: () => liveStageEl.value?.getBoundingClientRect()
})

const emit = defineEmits([
  'refresh-live',
  'toggle-live-goal',
  'featured-video-action',
  'open-theater',
  'like-message',
  'delete-message',
  'send-reply',
  'send-message',
  'update-video-filter',
  'update-video-page',
  'play-video'
])

const openReplyDraft = (message) => {
  videoReplyDrafts.value = {
    ...videoReplyDrafts.value,
    [message.id]: videoReplyDrafts.value[message.id] ?? ''
  }
}
</script>

<template>
  <section class="official-media-hub">
    <article ref="liveStageEl" class="official-live-stage">
      <div class="official-section-title">
        <span><i class="fas fa-circle"></i> En vivo ahora</span>
        <button type="button" class="live-refresh-btn" :disabled="youtubeVideosLoading" @click="emit('refresh-live')">
          <i class="fas fa-rotate-right"></i>
          {{ youtubeVideosLoading ? 'Buscando...' : 'Buscar live' }}
        </button>
      </div>

      <div class="official-live-layout">
        <div class="official-live-video-column">
          <div class="official-live-frame">
            <iframe
              v-if="youtubeStageEmbedUrl"
              :src="youtubeStageEmbedUrl"
              title="Directo o video destacado de Galaxia Nintendera"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            ></iframe>
            <div v-else class="live-waiting-state">
              <span><i class="fas fa-satellite-dish"></i></span>
              <h3>No hay transmision en vivo</h3>
              <p>La sala esta esperando senal galactica. Revisa los horarios o elige un video de la biblioteca para verlo aqui.</p>
              <button type="button" :disabled="youtubeVideosLoading" @click="emit('refresh-live')">
                <i class="fas fa-rotate-right"></i>
                {{ youtubeVideosLoading ? 'Buscando live...' : 'Comprobar ahora' }}
              </button>
            </div>
          </div>

          <button
            v-if="currentLiveGoal"
            type="button"
            class="official-live-goal-overlay"
            @click="emit('toggle-live-goal', currentLiveGoal)"
          >
            <span>
              <i :class="currentLiveGoal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
            </span>
            <strong>{{ currentLiveGoal.title }}</strong>
            <em>{{ currentLiveGoal.current }} / {{ currentLiveGoal.target }} {{ currentLiveGoal.type === 'mission' ? 'pasos' : 'likes' }}</em>
            <i :style="{ width: currentLiveGoal.progress + '%' }"></i>
          </button>

          <div class="official-live-copy">
            <span>{{ featuredVideoIsLive ? 'En vivo' : (featuredYoutubeVideo ? 'Video destacado' : 'Esperando live') }}</span>
            <h2>{{ youtubeStageTitle }}</h2>
            <p>{{ youtubeStageDescription }}</p>
            <div class="official-live-actions">
              <button v-if="featuredYoutubeVideo" type="button" @click="emit('featured-video-action')">
                <i :class="featuredVideoActionIcon"></i>
                <span>{{ featuredVideoActionLabel }}</span>
              </button>
              <button v-if="featuredYoutubeVideo" type="button" class="mobile-theater-btn" @click="emit('open-theater')">
                <i class="fas fa-up-right-and-down-left-from-center"></i>
                <span>Ver en grande</span>
              </button>
              <a :href="featuredYoutubeVideo?.url || youtubeVideosUrl" target="_blank" rel="noreferrer">
                <i class="fab fa-youtube"></i>
                <span>Ver en YouTube</span>
              </a>
            </div>
          </div>
        </div>

        <aside class="video-chat-panel">
          <header>
            <div>
              <strong>{{ videoDiscussionTitle }}</strong>
              <span>{{ videoDiscussionSubtitle }}</span>
            </div>
            <small>{{ formatVideoChatTime(activeVideoSecond) }}</small>
          </header>

          <div class="video-chat-list">
            <article v-for="message in visibleVideoChatMessages" :key="message.id">
              <img v-if="message.authorImage" :src="message.authorImage" alt="" />
              <span v-else>{{ avatarInitial(message.author) }}</span>
              <div>
                <p><strong>{{ message.author }}</strong> <em>{{ formatVideoChatTime(message.videoSecond) }}</em></p>
                <b>{{ message.body }}</b>
                <div v-if="!featuredVideoIsLive" class="video-comment-actions">
                  <button type="button" :class="{ active: hasLikedVideoMessage(message) }" @click="emit('like-message', message)">
                    <i :class="hasLikedVideoMessage(message) ? 'fas fa-heart' : 'far fa-heart'"></i>
                    {{ message.likes || message.likedBy?.length || 0 }}
                  </button>
                  <button type="button" @click="openReplyDraft(message)">
                    <i class="far fa-comment"></i>
                    Responder
                  </button>
                  <button v-if="canDeleteVideoMessage(message)" type="button" class="danger" @click="emit('delete-message', message)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <div v-if="!featuredVideoIsLive && message.replies?.length" class="video-comment-replies">
                  <article v-for="reply in message.replies" :key="reply.id">
                    <img v-if="reply.authorImage" :src="reply.authorImage" alt="" />
                    <span v-else>{{ avatarInitial(reply.author) }}</span>
                    <div>
                      <p><strong>{{ reply.author }}</strong></p>
                      <b>{{ reply.body }}</b>
                    </div>
                  </article>
                </div>
                <form
                  v-if="!featuredVideoIsLive && Object.prototype.hasOwnProperty.call(videoReplyDrafts, message.id)"
                  class="video-reply-form"
                  @submit.prevent="emit('send-reply', message)"
                >
                  <input v-model="videoReplyDrafts[message.id]" maxlength="220" placeholder="Responder comentario..." />
                  <button type="submit" :disabled="!videoReplyDrafts[message.id]?.trim()">
                    <i class="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </article>
            <div v-if="!visibleVideoChatMessages.length" class="video-chat-empty">
              {{ !featuredYoutubeVideo ? 'El chat se abrira cuando el live este en vivo.' : (featuredVideoIsLive ? 'Aun no hay mensajes para este momento.' : 'Aun no hay comentarios en este video.') }}
            </div>
          </div>

          <form class="video-chat-form" @submit.prevent="emit('send-message')">
            <input
              v-model="videoChatDraft"
              maxlength="280"
              :disabled="!featuredYoutubeVideo"
              :placeholder="videoDiscussionPlaceholder"
            />
            <button type="submit" :disabled="!featuredYoutubeVideo || !videoChatDraft.trim()">
              <i class="fas fa-paper-plane"></i>
            </button>
          </form>
        </aside>
      </div>
    </article>

    <section class="official-video-shelf">
      <div class="official-video-head">
        <div>
          <strong><i class="fas fa-layer-group"></i> Biblioteca del canal</strong>
          <span>{{ filteredOfficialVideos.length }} videos</span>
        </div>
        <a :href="youtubeChannelUrl" target="_blank" rel="noreferrer">Ver canal</a>
      </div>

      <div v-if="officialVideoLibrary.length" class="official-video-browser">
        <div class="official-video-filters" aria-label="Filtrar videos">
          <button
            v-for="filter in officialVideoFilters"
            :key="filter.id"
            type="button"
            :class="{ active: officialVideoFilter === filter.id }"
            @click="emit('update-video-filter', filter.id)"
          >
            <i :class="filter.icon"></i>
            {{ filter.label }}
            <span>{{ filter.count }}</span>
          </button>
        </div>

        <div class="official-video-grid">
          <button
            v-for="video in pagedOfficialVideos"
            :key="video.id"
            type="button"
            class="official-video-card"
            @click="emit('play-video', video)"
          >
            <span>
              <img :src="video.thumbnail" alt="" />
              <em v-if="video.duration">{{ video.duration }}</em>
              <b v-else-if="video.streamKind === 'past-live'">Directo</b>
            </span>
            <strong>{{ video.title }}</strong>
            <small>{{ formatVideoDate(video.publishedAt) }}</small>
          </button>
        </div>

        <div
          v-if="officialVideoPageCount > 1"
          class="official-video-dots"
          aria-label="Paginas de videos"
        >
          <button
            v-for="page in officialVideoPageCount"
            :key="`video-page-${page}`"
            type="button"
            :aria-label="`Pagina ${page}`"
            :class="{ active: officialVideoPage === page - 1 }"
            @click="emit('update-video-page', page - 1)"
          ></button>
        </div>
      </div>

      <div v-else class="official-video-empty">
        <p v-if="youtubeVideosLoading">Cargando videos del canal...</p>
        <p v-else-if="youtubeVideosError">{{ youtubeVideosError }}</p>
        <p v-else-if="!youtubeApiKey">Agrega tu YouTube API key para traer directos antiguos y videos recientes.</p>
        <p v-else>Aun no encontramos videos recientes.</p>

        <div v-if="youtubeUploadsUrl" class="official-uploads-fallback">
          <iframe
            :src="youtubeUploadsUrl"
            title="Videos de Galaxia Nintendera"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          ></iframe>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.official-media-hub {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.official-live-stage,
.official-video-shelf {
  background:
    linear-gradient(135deg, rgba(12, 16, 38, 0.94), rgba(22, 15, 48, 0.88));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.24);
  color: #f8fafc;
  min-width: 0;
  overflow: hidden;
  padding: 14px;
}

.official-section-title {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
}

.official-section-title span,
.live-refresh-btn {
  align-items: center;
  background: rgba(239, 68, 68, 0.16);
  border-radius: 999px;
  color: #fecaca;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 8px;
  padding: 8px 12px;
  text-transform: uppercase;
}

.live-refresh-btn {
  background: rgba(168, 85, 247, 0.16);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #e9d5ff;
  cursor: pointer;
}

.live-refresh-btn:disabled {
  cursor: wait;
  opacity: 0.68;
}

.official-section-title i {
  color: #ef4444;
  font-size: 8px;
}

.live-refresh-btn i {
  color: #c084fc;
  font-size: 11px;
}

.official-live-layout {
  display: grid;
  align-items: stretch;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  margin-top: 12px;
  position: relative;
}

.official-live-video-column {
  min-width: 0;
  position: relative;
}

.official-live-frame {
  aspect-ratio: 16 / 9;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  width: 100%;
}

.official-live-frame iframe,
.official-live-frame img {
  border: 0;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.live-waiting-state {
  align-items: center;
  background:
    radial-gradient(circle at 50% 32%, rgba(168, 85, 247, 0.22), transparent 36%),
    linear-gradient(135deg, rgba(2, 6, 23, 0.98), rgba(18, 12, 42, 0.96)),
    var(--community-banner);
  background-position: center;
  background-size: cover;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  justify-content: center;
  padding: 24px;
  position: relative;
  text-align: center;
}

.live-waiting-state::before {
  background: rgba(2, 6, 23, 0.7);
  content: "";
  inset: 0;
  position: absolute;
}

.live-waiting-state > * {
  position: relative;
  z-index: 1;
}

.live-waiting-state > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  box-shadow: 0 18px 40px rgba(236, 72, 153, 0.28);
  display: inline-flex;
  height: 58px;
  justify-content: center;
  width: 58px;
}

.live-waiting-state h3 {
  font-size: clamp(20px, 3vw, 34px);
  font-weight: 950;
  line-height: 1;
}

.live-waiting-state p {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.45;
  max-width: 560px;
}

.live-waiting-state button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
}

.live-waiting-state button:disabled {
  opacity: 0.68;
}

.official-live-goal-overlay {
  align-items: center;
  background: rgba(8, 12, 30, 0.86);
  border: 1px solid rgba(216, 180, 254, 0.28);
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
  color: #ffffff;
  display: grid;
  gap: 9px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  left: 14px;
  max-width: min(520px, calc(100% - 28px));
  min-height: 42px;
  overflow: hidden;
  padding: 7px 12px 7px 7px;
  position: absolute;
  right: auto;
  text-align: left;
  top: 14px;
  z-index: 3;
}

.official-live-goal-overlay span {
  align-items: center;
  background: linear-gradient(135deg, #ec4899, #f59e0b);
  border-radius: 999px;
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.official-live-goal-overlay strong {
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.official-live-goal-overlay em {
  color: #fde68a;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  white-space: nowrap;
}

.official-live-goal-overlay > i:last-child {
  background: linear-gradient(90deg, #9333ea, #ec4899, #f59e0b);
  bottom: 0;
  display: block;
  height: 3px;
  left: 0;
  position: absolute;
  transition: width 0.35s ease;
}

.official-live-copy {
  background:
    radial-gradient(circle at 8% 0%, rgba(168, 85, 247, 0.18), transparent 32%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(22, 15, 48, 0.96));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0 0 16px 16px;
  border-top: 0;
  display: grid;
  gap: 10px;
  padding: 16px 18px 18px;
  position: static;
}

.official-live-copy span {
  align-items: center;
  background: rgba(239, 68, 68, 0.18);
  border-radius: 999px;
  color: #fecaca;
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  justify-self: start;
  padding: 6px 9px;
  text-transform: uppercase;
}

.official-live-copy h2 {
  color: #ffffff;
  font-size: clamp(17px, 1.8vw, 24px);
  font-weight: 950;
  line-height: 1.05;
  max-width: 980px;
  overflow-wrap: anywhere;
}

.official-live-copy p {
  color: #b8c1d8;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 860px;
}

.official-live-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mobile-theater-btn {
  display: none;
}

.official-live-actions button,
.official-live-actions a {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  width: auto;
}

.official-live-actions a {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.video-chat-panel {
  background:
    radial-gradient(circle at 16% 0%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(8, 12, 30, 0.98), rgba(18, 12, 42, 0.96));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  color: #f8fafc;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  width: 100%;
}

.video-chat-panel header {
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
  padding: 14px;
}

.video-chat-panel header > div {
  min-width: 0;
}

.video-chat-panel header strong {
  color: #ffffff;
  display: block;
  font-size: 16px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-chat-panel header span {
  color: #aeb8d3;
  display: block;
  font-size: 11px;
  font-weight: 850;
  margin-top: 3px;
}

.video-chat-panel header small {
  background: rgba(124, 58, 237, 0.24);
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 999px;
  color: #e9d5ff;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  padding: 6px 9px;
}

.video-chat-list {
  align-content: start;
  display: grid;
  gap: 10px;
  max-width: 100%;
  min-height: 240px;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
}

.video-chat-list article {
  display: grid;
  gap: 9px;
  grid-template-columns: 34px minmax(0, 1fr);
}

.video-chat-list img,
.video-chat-list article > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  height: 34px;
  justify-content: center;
  object-fit: cover;
  width: 34px;
}

.video-chat-list p {
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 800;
  margin: 0 0 3px;
}

.video-chat-list p strong {
  color: #ffffff;
  font-weight: 950;
}

.video-chat-list p em {
  color: #c084fc;
  font-style: normal;
  font-weight: 950;
}

.video-chat-list b {
  color: #e5e7eb;
  display: block;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.35;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.video-comment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.video-comment-actions button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
}

.video-comment-actions button.active {
  color: #f9a8d4;
}

.video-comment-actions button.danger {
  color: #fecaca;
}

.video-comment-replies {
  border-left: 2px solid rgba(168, 85, 247, 0.3);
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding-left: 10px;
}

.video-comment-replies article {
  grid-template-columns: 28px minmax(0, 1fr);
}

.video-comment-replies img,
.video-comment-replies article > span {
  height: 28px;
  width: 28px;
}

.video-reply-form {
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 36px;
  margin-top: 10px;
}

.video-reply-form input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  color: #ffffff;
  min-height: 36px;
  padding: 0 10px;
}

.video-reply-form button {
  background: rgba(168, 85, 247, 0.26);
  border-radius: 12px;
  color: #ffffff;
}

.video-chat-empty {
  align-self: center;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 850;
  justify-self: center;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 0 8px;
  text-align: center;
}

.video-chat-form {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 44px;
  min-width: 0;
  padding: 12px;
}

.video-chat-form input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  color: #ffffff;
  font-weight: 850;
  min-height: 44px;
  min-width: 0;
  padding: 0 14px;
}

.video-chat-form button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  justify-content: center;
}

.video-chat-form button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.official-video-head {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.official-video-head > div {
  display: grid;
  gap: 3px;
}

.official-video-head strong,
.official-video-head a {
  align-items: center;
  display: inline-flex;
  gap: 8px;
}

.official-video-head strong {
  color: #e9d5ff;
  font-size: 15px;
  font-weight: 950;
}

.official-video-head a {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
}

.official-video-head span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.official-video-browser {
  display: grid;
  gap: 14px;
}

.official-video-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.official-video-filters button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #cbd5e1;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 11px;
}

.official-video-filters button.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(236, 72, 153, 0.72));
  border-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.official-video-filters span {
  background: rgba(2, 6, 23, 0.36);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  min-width: 20px;
  padding: 3px 6px;
  text-align: center;
}

.official-video-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.official-video-card {
  appearance: none;
  background: transparent;
  border: 0;
  color: #ffffff;
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 0;
  text-align: left;
}

.official-video-card > span {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 12px;
  display: block;
  overflow: hidden;
  position: relative;
}

.official-video-card img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.official-video-card em {
  background: rgba(2, 6, 23, 0.82);
  border-radius: 6px;
  bottom: 7px;
  color: #ffffff;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  padding: 3px 6px;
  position: absolute;
  right: 7px;
}

.official-video-card b {
  background: linear-gradient(135deg, #ef4444, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 950;
  left: 7px;
  padding: 4px 7px;
  position: absolute;
  text-transform: uppercase;
  top: 7px;
}

.official-video-card strong {
  color: #ffffff;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.official-video-card small,
.official-video-empty {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 850;
}

.official-video-dots {
  align-items: center;
  display: flex;
  gap: 7px;
  justify-content: center;
}

.official-video-dots button {
  background: rgba(203, 213, 225, 0.32);
  border-radius: 999px;
  height: 9px;
  transition: background 0.2s ease, transform 0.2s ease, width 0.2s ease;
  width: 9px;
}

.official-video-dots button.active {
  background: linear-gradient(135deg, #c084fc, #ec4899);
  box-shadow: 0 0 16px rgba(192, 132, 252, 0.42);
  width: 24px;
}

.official-video-empty {
  background: rgba(8, 12, 30, 0.72);
  border: 1px dashed rgba(168, 85, 247, 0.28);
  border-radius: 14px;
  display: grid;
  gap: 12px;
  padding: 16px;
  text-align: center;
}

.official-uploads-fallback {
  aspect-ratio: 16 / 9;
  background: #020617;
  border-radius: 14px;
  overflow: hidden;
}

.official-uploads-fallback iframe {
  border: 0;
  height: 100%;
  width: 100%;
}

@media (max-width: 1180px) {
  .official-live-stage,
  .official-video-shelf {
    border-radius: 16px;
  }

  .official-live-layout {
    grid-template-columns: 1fr;
  }

  .video-chat-panel {
    min-height: 420px;
  }
}

@media (max-width: 720px) {
  .official-live-stage,
  .official-video-shelf {
    margin-left: calc(-1 * var(--community-mobile-bleed, 0px));
    margin-right: calc(-1 * var(--community-mobile-bleed, 0px));
  }

  .official-live-layout {
    gap: 10px;
  }

  .video-chat-panel {
    min-height: 380px;
  }

  .official-live-copy {
    padding: 14px;
  }

  .official-live-goal-overlay {
    border-radius: 18px;
    grid-template-columns: 28px minmax(0, 1fr);
    max-width: calc(100% - 24px);
    padding-right: 10px;
  }

  .official-live-goal-overlay em {
    grid-column: 2;
  }

  .official-live-copy p {
    -webkit-line-clamp: 3;
  }

  .official-live-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .official-live-actions button,
  .official-live-actions a {
    width: 100%;
  }

  .mobile-theater-btn {
    display: inline-flex;
  }

  .official-video-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .official-video-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .official-video-filters {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 2px;
  }

  .official-video-filters button {
    flex: 0 0 auto;
  }
}
</style>
