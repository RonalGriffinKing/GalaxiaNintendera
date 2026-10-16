<script setup>
const videoChatDraft = defineModel('videoChatDraft', {
  type: String,
  default: ''
})

defineProps({
  open: {
    type: Boolean,
    default: false
  },
  youtubeStageTitle: {
    type: String,
    default: ''
  },
  youtubeStageEmbedUrl: {
    type: String,
    default: ''
  },
  currentLiveGoal: {
    type: Object,
    default: null
  },
  videoDiscussionTitle: {
    type: String,
    default: ''
  },
  videoDiscussionSubtitle: {
    type: String,
    default: ''
  },
  activeVideoSecond: {
    type: Number,
    default: 0
  },
  visibleVideoChatMessages: {
    type: Array,
    default: () => []
  },
  featuredYoutubeVideo: {
    type: Object,
    default: null
  },
  featuredVideoIsLive: {
    type: Boolean,
    default: false
  },
  videoDiscussionPlaceholder: {
    type: String,
    default: ''
  },
  formatVideoChatTime: {
    type: Function,
    default: (value) => value
  },
  avatarInitial: {
    type: Function,
    default: () => ''
  },
  hasLikedVideoMessage: {
    type: Function,
    default: () => false
  },
  canDeleteVideoMessage: {
    type: Function,
    default: () => false
  }
})

const emit = defineEmits([
  'close',
  'like-message',
  'delete-message',
  'send-message',
  'send-reply',
  'toggle-live-goal'
])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <section v-if="open" class="media-theater">
        <header>
          <strong>{{ youtubeStageTitle }}</strong>
          <button type="button" aria-label="Cerrar vista grande" @click="emit('close')">
            <i class="fas fa-xmark"></i>
          </button>
        </header>

        <div class="media-theater-body">
          <div class="media-theater-player">
            <iframe
              v-if="youtubeStageEmbedUrl"
              :src="youtubeStageEmbedUrl"
              title="Video de Galaxia Nintendera"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            ></iframe>
            <button
              v-if="currentLiveGoal"
              type="button"
              class="official-live-goal-overlay theater-goal-overlay"
              @click="emit('toggle-live-goal', currentLiveGoal)"
            >
              <span>
                <i :class="currentLiveGoal.type === 'mission' ? 'fas fa-list-check' : 'fas fa-heart'"></i>
              </span>
              <strong>{{ currentLiveGoal.title }}</strong>
              <em>{{ currentLiveGoal.current }} / {{ currentLiveGoal.target }} {{ currentLiveGoal.type === 'mission' ? 'pasos' : 'likes' }}</em>
              <i :style="{ width: currentLiveGoal.progress + '%' }"></i>
            </button>
          </div>

          <aside class="video-chat-panel media-theater-chat">
            <header>
              <div>
                <strong>{{ videoDiscussionTitle }}</strong>
                <span>{{ videoDiscussionSubtitle }}</span>
              </div>
              <small>{{ formatVideoChatTime(activeVideoSecond) }}</small>
            </header>

            <div class="video-chat-list">
              <article v-for="message in visibleVideoChatMessages" :key="`theater-${message.id}`">
                <img v-if="message.authorImage" :src="message.authorImage" alt="" />
                <span v-else>{{ avatarInitial(message.author) }}</span>
                <div>
                  <p><strong>{{ message.author }}</strong> <em>{{ formatVideoChatTime(message.videoSecond) }}</em></p>
                  <b>{{ message.body }}</b>
                  <img
                    v-if="message.gif?.url"
                    class="video-message-gif"
                    :src="message.gif.url"
                    :alt="message.gif.title || 'GIF'"
                    loading="lazy"
                  />
                  <div v-if="!featuredVideoIsLive" class="video-comment-actions">
                    <button type="button" :class="{ active: hasLikedVideoMessage(message) }" @click="emit('like-message', message)">
                      <i :class="hasLikedVideoMessage(message) ? 'fas fa-heart' : 'far fa-heart'"></i>
                      {{ message.likes || message.likedBy?.length || 0 }}
                    </button>
                    <button v-if="canDeleteVideoMessage(message)" type="button" class="danger" @click="emit('delete-message', message)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
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
                <span>Enviar</span>
              </button>
            </form>
          </aside>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.media-theater {
  background: #050816;
  box-sizing: border-box;
  color: #ffffff;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100dvh;
  inset: 0;
  overflow: hidden;
  padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
  position: fixed;
  max-width: 100dvw;
  width: 100dvw;
  z-index: 7000;
}

.media-theater,
.media-theater * {
  box-sizing: border-box;
}

.media-theater > header {
  align-items: center;
  background: #050816;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  max-width: 100%;
  min-height: 52px;
  min-width: 0;
  position: relative;
  width: 100%;
  z-index: 2;
}

.media-theater > header strong {
  flex: 1 1 auto;
  font-size: 15px;
  font-weight: 950;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-theater > header button {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #ffffff;
  flex: 0 0 auto;
  height: 40px;
  width: 40px;
}

.media-theater-body {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  width: 100%;
}

.media-theater-player {
  align-self: start;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 18px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.media-theater-player iframe {
  border: 0;
  display: block;
  height: 100%;
  width: 100%;
}

.media-theater-chat {
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
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

.theater-goal-overlay {
  left: 12px;
  max-width: min(420px, calc(100% - 24px));
  top: 12px;
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

.video-chat-list .video-message-gif {
  background: transparent;
  border-radius: 12px;
  display: block;
  height: auto;
  margin-top: 7px;
  max-height: 180px;
  max-width: min(280px, 100%);
  object-fit: cover;
  width: auto;
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
  gap: 8px;
  justify-content: center;
}

.video-chat-form button span {
  display: none;
}

.video-chat-form button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

@media (min-width: 900px) {
  .media-theater-body {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
  }
}

@media (max-width: 780px) {
  .media-theater {
    grid-template-rows: auto minmax(0, 1fr);
    height: 100svh;
    left: 0;
    max-width: 100dvw;
    padding: max(8px, env(safe-area-inset-top)) 8px max(10px, env(safe-area-inset-bottom));
    right: 0;
    width: 100dvw;
  }

  .media-theater > header {
    min-height: 44px;
  }

  .media-theater > header strong {
    font-size: 13px;
  }

  .media-theater > header button {
    height: 38px;
    width: 38px;
  }

  .media-theater-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    overflow-x: hidden;
    overflow-y: hidden;
    padding-bottom: 4px;
  }

  .media-theater-player {
    border-radius: 14px;
    max-height: none;
    max-width: 100%;
  }

  .media-theater-chat {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    max-height: none;
    max-width: 100%;
    min-height: 0;
    width: 100%;
  }

  .media-theater-chat .video-chat-list {
    min-height: 0;
    overscroll-behavior: contain;
    width: 100%;
  }

  .media-theater-chat .video-chat-form {
    background: rgba(8, 12, 30, 0.98);
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    position: relative;
  }

  .media-theater-chat .video-chat-form button {
    min-height: 42px;
    padding: 0 14px;
  }

  .media-theater-chat .video-chat-form button span {
    display: inline;
    font-size: 12px;
    font-weight: 950;
  }

  .official-live-goal-overlay {
    border-radius: 14px;
    gap: 6px 8px;
    grid-template-columns: 24px minmax(0, 1fr);
    left: 8px;
    max-width: min(260px, calc(100% - 16px));
    min-height: 34px;
    padding: 5px 9px 6px 5px;
    right: auto;
    top: 8px;
  }

  .official-live-goal-overlay span {
    height: 24px;
    width: 24px;
  }

  .official-live-goal-overlay strong {
    font-size: 11px;
  }

  .official-live-goal-overlay em {
    font-size: 10px;
  }

  .official-live-goal-overlay em {
    grid-column: 2;
  }
}

@media (max-width: 420px) {
  .theater-goal-overlay {
    position: static;
    margin: 8px;
    max-width: calc(100% - 16px);
  }

  .media-theater-player {
    aspect-ratio: auto;
    background: transparent;
    display: grid;
    overflow: visible;
  }

  .media-theater-player iframe {
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: 14px;
    height: auto;
  }
}
</style>
