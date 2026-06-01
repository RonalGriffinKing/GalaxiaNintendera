<script setup>
import { ref } from 'vue'
import CommunityEmptyState from '@/components/community/CommunityEmptyState.vue'
import PostEditCard from '@/components/community/PostEditCard.vue'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import ThreadComposer from '@/components/community/ThreadComposer.vue'
import ContextMenu from '@/components/shared/ContextMenu.vue'

const replyDraft = defineModel('replyDraft', {
  type: String,
  default: ''
})

const {
  backgroundStyle,
  canCreate,
  initialCommunityId,
  userRole,
  isOfficial,
  topicFilters,
  selectedTopic,
  isLoading,
  threads,
  openThreadId,
  currentUserId,
  hasBackground,
  community,
  avatarInitial,
  formatAgo,
  hasLiked,
  canPinThread,
  canDeleteThread,
  canDeleteComment,
  canEditComment
} = defineProps({
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
  currentUserId: {
    type: String,
    default: ''
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
  },
  canEditComment: {
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
  'edit-comment',
  'pin-thread',
  'home-thread',
  'open-profile',
  'update-filter'
])

const editingCommentId = ref('')
const editingCommentBody = ref('')
const openCommentMenuId = ref('')
const openThreadActionMenuId = ref('')
const expandedCommentThreads = ref(new Set())
const INITIAL_VISIBLE_COMMENTS = 12

const visibleThreadComments = (thread) => {
  const comments = thread.comments || []
  if (expandedCommentThreads.value.has(thread.id)) return comments
  return comments.slice(-INITIAL_VISIBLE_COMMENTS)
}

const hiddenCommentCount = (thread) => Math.max(0, (thread.comments?.length || 0) - INITIAL_VISIBLE_COMMENTS)

const showAllComments = (thread) => {
  expandedCommentThreads.value = new Set([...expandedCommentThreads.value, thread.id])
}

const toggleCommentMenu = (comment) => {
  openCommentMenuId.value = openCommentMenuId.value === comment.id ? '' : comment.id
}

const hasThreadMenuActions = (thread) => canPinThread(thread) || canDeleteThread(thread)

const normalizeCopy = (value = '') => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const visibleThreadTitle = (thread) => {
  const title = String(thread.title || '').trim()
  if (!title) return ''
  return normalizeCopy(title) === normalizeCopy(thread.body) ? '' : title
}

const displayAuthorName = (item = {}) => {
  if (item.authorId && currentUserId && item.authorId === currentUserId) return 'Yo'
  const savedHandle = String(item.handle || '').trim()
  if (savedHandle && savedHandle !== '@tu_usuario') return savedHandle.startsWith('@') ? savedHandle : `@${savedHandle}`
  const cleanName = String(item.author || item.name || 'usuario')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
  return `@${cleanName || 'usuario'}`
}

const threadTypeLabel = (thread = {}) => {
  if (thread.pollOpen || thread.poll) return 'Encuesta'
  if (thread.topic) return thread.topic
  return 'Posts'
}

const toggleThreadActionMenu = (thread) => {
  openThreadActionMenuId.value = openThreadActionMenuId.value === thread.id ? '' : thread.id
}

const emitThreadAction = (event, thread) => {
  openThreadActionMenuId.value = ''
  emit(event, thread)
}

const startEditComment = (comment) => {
  openCommentMenuId.value = ''
  editingCommentId.value = comment.id
  editingCommentBody.value = comment.body || ''
}

const cancelEditComment = () => {
  editingCommentId.value = ''
  editingCommentBody.value = ''
}

const saveEditComment = (thread, comment) => {
  const body = editingCommentBody.value.trim()
  if (!body || body === comment.body) {
    cancelEditComment()
    return
  }
  emit('edit-comment', thread, comment, body)
  cancelEditComment()
}

const deleteComment = (thread, comment) => {
  openCommentMenuId.value = ''
  emit('delete-comment', thread, comment)
}
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
      <header class="thread-card-header">
        <button
          class="thread-avatar profile-trigger"
          type="button"
          @click="emit('open-profile', thread)"
        >
          <ProfileAvatar
            :src="thread.authorImage"
            :alt="thread.author"
            :label="thread.author"
            :effect="thread.authorIconEffect"
          />
        </button>

        <div class="thread-meta">
          <button type="button" @click="emit('open-profile', thread)">
            <strong>{{ displayAuthorName(thread) }}</strong>
          </button>
          <span aria-hidden="true">·</span>
          <span>{{ formatAgo(thread.createdAt) }}</span>
        </div>

        <span class="thread-topic-pill">{{ threadTypeLabel(thread) }}</span>
      </header>

      <div class="thread-main">
        <h2 v-if="visibleThreadTitle(thread)">{{ visibleThreadTitle(thread) }}</h2>
        <small v-if="thread.spoiler" class="spoiler-badge"><i class="fas fa-eye-slash"></i> Spoiler</small>
        <p v-if="thread.body">{{ thread.body }}</p>
        <figure v-if="thread.imageUrl" class="thread-image" :class="{ 'is-gif': thread.mediaType === 'gif' || thread.gif?.url }">
          <img :src="thread.imageUrl" alt="" />
        </figure>

        <div class="thread-footer">
          <div class="thread-interactions">
            <button
              type="button"
              class="like-thread"
              :class="{ active: hasLiked(thread) }"
              @click="emit('like-thread', thread)"
            >
              <i :class="hasLiked(thread) ? 'fas fa-heart' : 'far fa-heart'"></i>
              {{ thread.likes }}
            </button>
            <button type="button" class="thread-primary-action" @click="emit('open-thread', thread)">
              <i class="far fa-comment"></i>
              {{ thread.replies }}
            </button>
          </div>

          <div v-if="hasThreadMenuActions(thread)" class="thread-more-actions">
            <button
              type="button"
              class="thread-more-button"
              :aria-expanded="openThreadActionMenuId === thread.id"
              aria-label="Mas acciones del hilo"
              @click.stop="toggleThreadActionMenu(thread)"
            >
              <i class="fas fa-ellipsis"></i>
            </button>
            <div v-if="openThreadActionMenuId === thread.id" class="thread-more-menu">
              <button
                v-if="canPinThread(thread)"
                type="button"
                :class="{ active: thread.pinnedCommunity }"
                @click="emitThreadAction('pin-thread', thread)"
              >
                <i class="fas fa-thumbtack"></i>
                {{ thread.pinnedCommunity ? 'Quitar fijado' : 'Fijar' }}
              </button>
              <button
                v-if="canPinThread(thread)"
                type="button"
                :class="{ active: thread.showOnHome || thread.pinnedHome }"
                @click="emitThreadAction('home-thread', thread)"
              >
                <i class="fas fa-home"></i>
                {{ (thread.showOnHome || thread.pinnedHome) ? 'Quitar de Home' : 'Mostrar en Home' }}
              </button>
              <button
                v-if="canDeleteThread(thread)"
                type="button"
                class="danger"
                @click="emitThreadAction('delete-thread', thread)"
              >
                <i class="fas fa-trash"></i>
                Borrar
              </button>
            </div>
          </div>
        </div>

        <section v-if="openThreadId === thread.id" class="thread-chat">
          <div class="chat-title">
            <strong>Conversacion</strong>
            <small>{{ thread.comments?.length || 0 }} mensajes</small>
          </div>

          <div v-if="thread.comments?.length" class="comment-list">
            <button
              v-if="hiddenCommentCount(thread) && !expandedCommentThreads.has(thread.id)"
              type="button"
              class="load-older-comments"
              @click="showAllComments(thread)"
            >
              <i class="fas fa-clock-rotate-left"></i>
              Ver {{ hiddenCommentCount(thread) }} mensajes anteriores
            </button>

            <div v-for="comment in visibleThreadComments(thread)" :key="comment.id" class="comment-row">
              <button
                class="comment-avatar profile-trigger"
                type="button"
                @click="emit('open-profile', comment)"
              >
                <ProfileAvatar
                  :src="comment.authorImage"
                  :alt="comment.author"
                  :label="comment.author"
                  :effect="comment.authorIconEffect"
                />
              </button>
              <div class="comment-body">
                <div class="comment-meta">
                  <button type="button" @click="emit('open-profile', comment)">
                    <strong>{{ displayAuthorName(comment) }}</strong>
                  </button>
                  <span>{{ formatAgo(comment.createdAt) }}</span>
                  <span v-if="comment.editedAt">Editado</span>
                </div>
                <template v-if="editingCommentId === comment.id">
                  <PostEditCard
                    v-model="editingCommentBody"
                    :disabled="!editingCommentBody.trim()"
                    @cancel="cancelEditComment"
                    @save="saveEditComment(thread, comment)"
                  />
                </template>
                <p v-else>{{ comment.body }}</p>
              </div>
              <ContextMenu
                v-if="canDeleteComment(comment) || canEditComment(comment)"
                :open="openCommentMenuId === comment.id && editingCommentId !== comment.id"
                :can-edit="canEditComment(comment)"
                :can-delete="canDeleteComment(comment)"
                @toggle="toggleCommentMenu(comment)"
                @edit="startEditComment(comment)"
                @delete="deleteComment(thread, comment)"
              />
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
  width: 100%;
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
  background:
    radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.18), transparent 36%),
    rgba(8, 11, 28, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 20px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.2);
  display: block;
  margin: 0 0 14px;
  max-width: none;
  padding: 18px;
  width: 100%;
}

.thread-card-header {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 50px minmax(0, 1fr) auto;
  min-width: 0;
}

.thread-main {
  margin-left: 0;
  min-width: 0;
  padding-left: 60px;
}

.thread-avatar,
.comment-avatar {
  overflow: visible;
}

.thread-avatar {
  align-items: center;
  display: flex;
  height: 50px;
  justify-content: center;
  width: 50px;
}

.profile-trigger {
  border: 0;
  cursor: pointer;
  padding: 0;
}

.thread-avatar :deep(.profile-avatar-ui) {
  --avatar-size: 50px;
  --avatar-border: 2px;
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
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.thread-card h2 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 10px;
  overflow-wrap: anywhere;
}

.thread-card p {
  color: #dbeafe;
  font-size: 15px;
  font-weight: 720;
  line-height: 1.55;
  margin-top: 8px;
  overflow-wrap: anywhere;
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
  margin: 12px 0 0;
  max-width: min(680px, 100%);
  overflow: hidden;
  position: relative;
}

.thread-image img {
  background: rgba(226, 232, 240, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.48);
  border-radius: 14px;
  display: block;
  max-height: 360px;
  object-fit: contain;
  width: 100%;
}

.thread-image:not(.is-gif) {
  max-width: min(680px, 100%);
}

.thread-image:not(.is-gif) img {
  object-fit: contain;
}

.thread-footer {
  align-items: center;
  display: flex;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  gap: 16px;
  justify-content: space-between;
  margin-top: 16px;
  min-width: 0;
  padding-top: 12px;
  position: relative;
}

.thread-interactions {
  align-items: center;
  display: inline-flex;
  gap: 18px;
  min-width: 0;
}

.thread-footer button,
.thread-interactions button {
  align-items: center;
  color: #a9b4ca;
  display: inline-flex;
  font-size: 13px;
  font-weight: 900;
  gap: 7px;
}

.thread-footer .like-thread.active {
  color: #ec4899;
}

.thread-topic-pill {
  background: rgba(124, 58, 237, 0.26);
  border: 1px solid rgba(168, 85, 247, 0.32);
  border-radius: 999px;
  color: #e9d5ff;
  flex: 0 1 auto;
  font-size: 11px;
  font-weight: 900;
  max-width: 112px;
  overflow: hidden;
  padding: 6px 10px;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.thread-more-actions {
  margin-left: auto;
  position: relative;
}

.thread-more-button {
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  color: #cbd5e1;
  height: 34px;
  justify-content: center;
  padding: 0;
  width: 34px;
}

.thread-more-menu {
  background: rgba(8, 10, 26, 0.98);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 14px;
  bottom: calc(100% + 8px);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.36);
  display: grid;
  gap: 4px;
  min-width: 190px;
  padding: 8px;
  position: absolute;
  right: 0;
  z-index: 5;
}

.thread-more-menu button {
  border-radius: 10px;
  color: #dbeafe;
  justify-content: flex-start;
  min-height: 36px;
  padding: 0 10px;
  width: 100%;
}

.thread-more-menu button:hover,
.thread-more-menu button.active {
  background: rgba(168, 85, 247, 0.16);
  color: #ffffff;
}

.thread-more-menu .danger {
  color: #fecaca;
}

.thread-more-menu .danger:hover {
  background: rgba(239, 68, 68, 0.14);
  color: #ffffff;
}

.thread-chat {
  background:
    radial-gradient(circle at 14% 0%, rgba(124, 58, 237, 0.18), transparent 36%),
    rgba(5, 8, 22, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  margin-top: 16px;
  padding: 16px;
}

.chat-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chat-title strong {
  color: #ffffff;
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
  gap: 0;
}

.load-older-comments {
  align-items: center;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: #d8b4fe;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-self: start;
  margin-bottom: 6px;
  min-height: 34px;
  padding: 0 13px;
}

.load-older-comments:hover {
  border-color: rgba(216, 180, 254, 0.42);
  color: #ffffff;
}

.comment-row {
  align-items: start;
  background: transparent;
  border: 0;
  border-radius: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: 38px minmax(0, 1fr) 34px;
  padding: 13px 0;
  position: relative;
}

.comment-row:not(:last-child) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.comment-row::before {
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.5), rgba(148, 163, 184, 0.08));
  bottom: -6px;
  content: "";
  left: 18px;
  position: absolute;
  top: 52px;
  width: 2px;
}

.comment-row:last-child::before {
  display: none;
}

.comment-avatar {
  align-items: center;
  display: flex;
  height: 38px;
  justify-content: center;
  position: relative;
  width: 38px;
  z-index: 1;
}

.comment-avatar :deep(.profile-avatar-ui) {
  --avatar-size: 38px;
  --avatar-border: 2px;
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
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
}

.comment-body {
  min-width: 0;
}

.comment-row p {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  margin-top: 6px;
  overflow-wrap: anywhere;
}

.empty-chat {
  background: rgba(15, 23, 42, 0.5);
  border: 1px dashed rgba(148, 163, 184, 0.26);
  border-radius: 12px;
  color: #cbd5e1;
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
    border-radius: 18px;
    max-width: 100%;
    padding: 14px;
  }

  .thread-card-header {
    grid-template-columns: 46px minmax(0, 1fr) auto;
    gap: 9px;
  }

  .thread-avatar {
    height: 46px;
    width: 46px;
  }

  .thread-avatar :deep(.profile-avatar-ui) {
    --avatar-size: 46px;
    --avatar-border: 2px;
  }

  .thread-main {
    margin-left: 0;
    padding-left: 0;
  }

  .thread-meta {
    gap: 7px;
  }

  .thread-meta strong {
    font-size: 12px;
  }

  .thread-card h2 {
    margin-top: 12px;
  }

  .thread-image {
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }

  .thread-image img {
    max-height: 420px;
  }

  .thread-footer {
    flex-wrap: nowrap;
    gap: 10px;
  }

  .thread-footer button {
    flex: 0 0 auto;
  }

  .thread-primary-action,
  .thread-footer .like-thread {
    min-width: 34px;
  }

  .thread-topic-pill {
    max-width: 88px;
    padding-inline: 7px;
  }
}

@media (max-width: 390px) {
  .thread-topic-pill {
    display: none;
  }
}
</style>
