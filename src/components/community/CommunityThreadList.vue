<script setup>
import CommunityEmptyState from '@/components/community/CommunityEmptyState.vue'
import ThreadComposer from '@/components/community/ThreadComposer.vue'

const replyDraft = defineModel('replyDraft', {
  type: String,
  default: ''
})

defineProps({
  backgroundStyle: {
    type: Object,
    default: () => ({})
  },
  canCreate: {
    type: Boolean,
    default: false
  },
  initialCommunityId: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: 'user'
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  topicFilters: {
    type: Array,
    default: () => []
  },
  selectedTopic: {
    type: String,
    default: 'Inicio'
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  threads: {
    type: Array,
    default: () => []
  },
  openThreadId: {
    type: String,
    default: null
  },
  hasBackground: {
    type: Boolean,
    default: false
  },
  community: {
    type: Object,
    default: null
  },
  avatarInitial: {
    type: Function,
    default: () => ''
  },
  formatAgo: {
    type: Function,
    default: () => ''
  },
  hasLiked: {
    type: Function,
    default: () => false
  },
  canPinThread: {
    type: Function,
    default: () => false
  },
  canDeleteThread: {
    type: Function,
    default: () => false
  },
  canDeleteComment: {
    type: Function,
    default: () => false
  }
})

const emit = defineEmits([
  'open-thread',
  'create-thread',
  'like-thread',
  'delete-thread',
  'comment-thread',
  'delete-comment',
  'pin-thread',
  'open-profile',
  'update-filter'
])
</script>

<template>
  <main class="community-feed" :style="backgroundStyle">
    <ThreadComposer
      v-if="canCreate"
      class="community-thread-composer"
      variant="inline"
      :initial-community-id="initialCommunityId"
      :user-role="userRole"
    />

    <div v-else-if="isOfficial" class="official-readonly-note">
      <i class="fas fa-bullhorn"></i>
      Esta comunidad es oficial: solo admin y publicadores crean comunicados. Todos pueden comentar.
    </div>

    <div class="topic-tabs">
      <button
        v-for="topic in topicFilters"
        :key="topic.value"
        :class="{ active: selectedTopic === topic.value }"
        @click="emit('update-filter', topic.value)"
      >
        <i :class="topic.icon"></i>
        {{ topic.label }}
      </button>
      <button class="filter-button" type="button"><i class="fas fa-sliders"></i> Filtros</button>
    </div>

    <div v-if="isLoading" class="community-empty">
      Cargando hilos de la comunidad...
    </div>

    <CommunityEmptyState
      v-else-if="!threads.length"
      :is-official="isOfficial"
      :can-create="canCreate"
      :has-background="hasBackground"
      :community="community"
      @create="emit('create-thread')"
    />

    <article v-for="thread in threads" v-else :key="thread.id" class="thread-card">
      <button class="thread-avatar profile-trigger" type="button" @click="emit('open-profile', thread)">
        <img v-if="thread.authorImage" :src="thread.authorImage" alt="" />
        <span v-else>{{ avatarInitial(thread.author) }}</span>
      </button>

      <div class="thread-main">
        <div class="thread-meta">
          <button type="button" @click="emit('open-profile', thread)">
            <strong>{{ thread.author }}</strong>
          </button>
          <span>{{ thread.handle }}</span>
          <span>{{ formatAgo(thread.createdAt) }}</span>
        </div>

        <h2>{{ thread.title }}</h2>
        <small v-if="thread.spoiler" class="spoiler-badge"><i class="fas fa-eye-slash"></i> Spoiler</small>
        <p>{{ thread.body }}</p>
        <figure v-if="thread.imageUrl" class="thread-image">
          <img :src="thread.imageUrl" alt="" />
        </figure>

        <div class="thread-footer">
          <button @click="emit('open-thread', thread)">
            <i class="far fa-comment"></i>
            {{ thread.replies }}
          </button>
          <button
            class="like-thread"
            :class="{ active: hasLiked(thread) }"
            @click="emit('like-thread', thread)"
          >
            <i :class="hasLiked(thread) ? 'fas fa-heart' : 'far fa-heart'"></i>
            {{ thread.likes }}
          </button>
          <button
            v-if="canPinThread(thread)"
            class="pin-thread"
            :class="{ active: thread.pinnedHome }"
            title="Fijar en home"
            @click="emit('pin-thread', thread)"
          >
            <i class="fas fa-thumbtack"></i>
            {{ thread.pinnedHome ? 'Fijado' : 'Fijar' }}
          </button>
          <button
            v-if="canDeleteThread(thread)"
            class="delete-thread"
            title="Borrar hilo"
            @click="emit('delete-thread', thread)"
          >
            <i class="fas fa-trash"></i>
            Borrar
          </button>
          <span>{{ thread.topic }}</span>
        </div>

        <section v-if="openThreadId === thread.id" class="thread-chat">
          <div class="chat-title">
            <strong>Conversacion</strong>
            <small>{{ thread.comments?.length || 0 }} mensajes</small>
          </div>

          <div v-if="thread.comments?.length" class="comment-list">
            <div v-for="comment in thread.comments" :key="comment.id" class="comment-row">
              <button class="comment-avatar profile-trigger" type="button" @click="emit('open-profile', comment)">
                <img v-if="comment.authorImage" :src="comment.authorImage" alt="" />
                <span v-else>{{ avatarInitial(comment.author) }}</span>
              </button>
              <div>
                <div class="comment-meta">
                  <button type="button" @click="emit('open-profile', comment)">
                    <strong>{{ comment.author }}</strong>
                  </button>
                  <span>{{ comment.handle }}</span>
                  <span>{{ formatAgo(comment.createdAt) }}</span>
                </div>
                <p>{{ comment.body }}</p>
              </div>
              <button
                v-if="canDeleteComment(comment)"
                class="delete-comment"
                title="Borrar mensaje"
                @click="emit('delete-comment', thread, comment)"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div v-else class="empty-chat">
            Se el primero en seguir hablando dentro de este hilo.
          </div>

          <div class="reply-box">
            <input
              v-model="replyDraft"
              maxlength="180"
              placeholder="Responder dentro del hilo..."
              @keyup.enter="emit('comment-thread', thread)"
            />
            <button @click="emit('comment-thread', thread)" :disabled="!replyDraft.trim()">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </section>
      </div>
    </article>
  </main>
</template>

<style scoped>
.community-feed {
  background-position: center;
  background-size: cover;
  border-radius: 18px;
  display: block;
  min-width: 0;
  padding: 0;
}

.community-thread-composer {
  margin: 30px 0 30px;
}

.official-readonly-note {
  align-items: center;
  background: rgba(124, 58, 237, 0.18);
  border: 1px solid rgba(216, 180, 254, 0.24);
  border-radius: 14px;
  color: #e9d5ff;
  display: flex;
  font-size: 13px;
  font-weight: 850;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
}

.topic-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 18px;
}

.topic-tabs button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  min-height: 32px;
  padding: 0 13px;
}

.topic-tabs button.active,
.topic-tabs button:hover {
  background: #f3e8ff;
  border-color: #d8b4fe;
  color: #7c3aed;
}

.filter-button {
  margin-left: auto;
}

.community-empty {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  padding: 28px 18px;
  text-align: center;
}

.thread-card {
  align-items: start;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  display: grid;
  gap: 16px;
  grid-template-columns: 58px minmax(0, 1fr);
  margin-bottom: 12px;
  padding: 16px;
}

.thread-main {
  min-width: 0;
}

.thread-avatar,
.comment-avatar {
  overflow: hidden;
}

.thread-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 18px;
  color: #ffffff;
  display: flex;
  font-weight: 900;
  height: 58px;
  justify-content: center;
  width: 58px;
}

.profile-trigger {
  border: 0;
  cursor: pointer;
  padding: 0;
}

.thread-avatar img,
.comment-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.thread-avatar span,
.comment-avatar span {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  width: 100%;
}

.thread-meta {
  align-items: center;
  color: #94a3b8;
  display: flex;
  flex-wrap: wrap;
  font-size: 11px;
  font-weight: 800;
  gap: 8px;
}

.thread-meta button,
.comment-meta button {
  text-align: left;
}

.thread-meta button:hover strong,
.comment-meta button:hover strong {
  color: #7c3aed;
}

.thread-meta strong {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.thread-card h2 {
  color: #111827;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 10px;
  overflow-wrap: anywhere;
}

.thread-card p {
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.55;
  margin-top: 8px;
}

.spoiler-badge {
  align-items: center;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 999px;
  color: #92400e;
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  gap: 6px;
  margin: 6px 0 0;
  padding: 5px 9px;
}

.thread-image {
  margin: 0 0 0 66px;
  overflow: hidden;
  position: relative;
}

.thread-image img {
  aspect-ratio: 16 / 8;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  object-fit: cover;
  width: min(420px, 100%);
}

.thread-footer {
  align-items: center;
  display: flex;
  gap: 16px;
  margin-top: 14px;
}

.thread-footer button {
  align-items: center;
  color: #64748b;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 7px;
}

.thread-footer .delete-thread {
  color: #ef4444;
}

.thread-footer .like-thread.active {
  color: #ec4899;
}

.thread-footer .pin-thread {
  color: #facc15;
}

.thread-footer .pin-thread.active {
  background: rgba(250, 204, 21, 0.14);
  border-radius: 999px;
  color: #fde68a;
  padding: 5px 8px;
}

.thread-footer .delete-thread:hover {
  color: #dc2626;
}

.thread-footer span {
  background: #eef2ff;
  border-radius: 999px;
  color: #4f46e5;
  font-size: 10px;
  font-weight: 900;
  margin-left: auto;
  padding: 5px 8px;
  text-transform: uppercase;
}

.thread-chat {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-top: 16px;
  padding: 14px;
}

.chat-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chat-title strong {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.chat-title small {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 900;
}

.comment-list {
  display: grid;
  gap: 10px;
}

.comment-row {
  align-items: start;
  background: #ffffff;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 32px minmax(0, 1fr) 24px;
  padding: 10px;
}

.comment-avatar {
  align-items: center;
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  display: flex;
  font-size: 11px;
  font-weight: 900;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.comment-meta {
  align-items: center;
  color: #94a3b8;
  display: flex;
  flex-wrap: wrap;
  font-size: 10px;
  font-weight: 800;
  gap: 7px;
}

.comment-meta strong {
  color: #111827;
  font-size: 12px;
  font-weight: 900;
}

.comment-row p {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  margin-top: 5px;
}

.delete-comment {
  align-items: center;
  color: #ef4444;
  display: flex;
  font-size: 11px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.empty-chat {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  padding: 14px;
  text-align: center;
}

.reply-box {
  align-items: center;
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 42px;
  margin-top: 12px;
  padding: 8px;
}

.reply-box input {
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 13px;
  font-weight: 850;
  min-height: 42px;
  min-width: 0;
  outline: none;
  padding: 0 4px 0 8px;
}

.reply-box input::placeholder {
  color: #94a3b8;
}

.reply-box button {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 10px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
}

.reply-box button:disabled {
  opacity: 0.45;
}

@media (max-width: 780px) {
  .community-thread-composer {
    display: none;
  }
}

@media (max-width: 620px) {
  .thread-card {
    grid-template-columns: 1fr;
  }

  .thread-image {
    margin-left: 0;
  }
}
</style>
