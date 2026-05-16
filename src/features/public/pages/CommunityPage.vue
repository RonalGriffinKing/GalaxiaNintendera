<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import CommunityPanel from '@/features/admin/components/dashboard/CommunityPanel.vue'
import CommunityGuestLanding from '@/features/public/components/CommunityGuestLanding.vue'

const router = useRouter()
const route = useRoute()
const selectedCommunityId = computed(() => route.query.id || '')
const activeLive = ref('Directo Nintendo')
const currentUser = ref(auth.currentUser)
const currentRole = ref('user')
const isCheckingAuth = ref(true)
let unsubscribeAuth = null

const lives = [
  { title: 'Directo Nintendo', host: 'Galaxia Live', viewers: '1.8k', topic: 'Reaccionando al ultimo trailer y rumores de Switch.', accent: '#ef4444' },
  { title: 'Mesa Zelda', host: 'Hyrule Club', viewers: '642', topic: 'Teorias, builds y secretos encontrados por la comunidad.', accent: '#16a34a' },
  { title: 'Charlas Pokemon', host: 'Ruta 01', viewers: '914', topic: 'Opiniones en vivo sobre eventos, competitivo y coleccion.', accent: '#f59e0b' }
]

const chatMessages = [
  { name: 'Marta', text: 'El directo esta buenisimo, ese anuncio me sorprendio.' },
  { name: 'Neo', text: 'Yo quiero un hilo solo para teorias de Zelda.' },
  { name: 'Luna', text: 'Que alguien comparta clips del live despues.' },
  { name: 'Alex', text: 'Esto en el dashboard seria perfecto para seguir conversaciones.' }
]

const communityThreads = [
  { title: 'Que juego deberia tener remake este ano?', author: 'PixelFan', replies: 48, tag: 'Debate' },
  { title: 'Comparte tu setup para streams de Nintendo', author: 'StreamKit', replies: 23, tag: 'Lives' },
  { title: 'Hilo de opiniones del ultimo Indie World', author: 'NaviNews', replies: 71, tag: 'Opinion' }
]

const loadRole = async (user) => {
  currentRole.value = 'user'
  if (!user) return

  const snap = await getDoc(doc(db, 'users', user.uid))
  currentRole.value = snap.data()?.role || 'user'
}

const goJoin = () => {
  router.push(currentUser.value ? '/dashboard' : '/login?mode=register&redirect=%2Fcomunidad')
}

onMounted(() => {
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: true } }))
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    isCheckingAuth.value = true
    currentUser.value = user
    await loadRole(user)
    isCheckingAuth.value = false
  })
})

onUnmounted(() => {
  unsubscribeAuth?.()
  window.dispatchEvent(new CustomEvent('music-page-context', { detail: { inCommunity: false } }))
})
</script>

<template>
  <div>
    <Transition name="community-content" appear>
      <main v-if="!isCheckingAuth && currentUser" class="community-member-page">
        <CommunityPanel :user-role="currentRole" :initial-community-id="selectedCommunityId" :show-rail="false" />
      </main>
    </Transition>

    <Transition name="community-content" appear>
      <CommunityGuestLanding
        v-if="!isCheckingAuth && !currentUser"
        v-model:active-live="activeLive"
        :lives="lives"
        :chat-messages="chatMessages"
        :community-threads="communityThreads"
        @join="goJoin"
      />
    </Transition>
  </div>
</template>

<style scoped>
.community-member-page {
  background:
    radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.24), transparent 32%),
    radial-gradient(circle at 86% 8%, rgba(217, 70, 239, 0.16), transparent 28%),
    linear-gradient(180deg, #070817 0%, #100927 46%, #060814 100%);
  color: #f8fafc;
  overflow-x: hidden;
  padding: var(--public-page-top, 88px) 18px 56px;
}

.community-member-page::before {
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
    radial-gradient(circle, rgba(168, 85, 247, 0.2) 1px, transparent 1px);
  background-position: 0 0, 32px 24px;
  background-size: 92px 92px, 128px 128px;
  content: '';
  inset: 0;
  opacity: 0.22;
  pointer-events: none;
  position: fixed;
}

.community-member-page :deep(.community-panel) {
  background: transparent !important;
  margin-left: auto;
  margin-right: auto;
  max-width: 1500px;
  position: relative;
  width: min(1500px, calc(100vw - 48px));
  z-index: 1;
}

.community-member-page :deep(.community-main-column),
.community-member-page :deep(.community-feed),
.community-member-page :deep(.community-side),
.community-member-page :deep(.community-switcher-shell) {
  background: transparent !important;
}

.community-member-page :deep(.community-admin-toolbar),
.community-member-page :deep(.composer),
.community-member-page :deep(.thread-card),
.community-member-page :deep(.side-box),
.community-member-page :deep(.community-empty) {
  background:
    linear-gradient(135deg, rgba(12, 16, 38, 0.9), rgba(22, 15, 48, 0.82)) !important;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.26);
  color: #f8fafc;
}

.community-member-page :deep(.community-admin-toolbar),
.community-member-page :deep(.side-box) {
  backdrop-filter: blur(18px);
}

.community-member-page :deep(.community-admin-toolbar span),
.community-member-page :deep(.community-rail-head h2),
.community-member-page :deep(.discover-more-btn),
.community-member-page :deep(.galaxy-copy span),
.community-member-page :deep(.side-box h2),
.community-member-page :deep(.trend-box button) {
  color: #c084fc;
}

.community-member-page :deep(.community-admin-toolbar h2),
.community-member-page :deep(.threads-title h2),
.community-member-page :deep(.thread-card h2),
.community-member-page :deep(.thread-meta strong),
.community-member-page :deep(.comment-meta strong),
.community-member-page :deep(.user-row strong),
.community-member-page :deep(.galaxy-copy h1),
.community-member-page :deep(.discover-head h2) {
  color: #ffffff;
}

.community-member-page :deep(.community-admin-toolbar p),
.community-member-page :deep(.threads-title p),
.community-member-page :deep(.thread-card p),
.community-member-page :deep(.thread-meta),
.community-member-page :deep(.thread-footer button),
.community-member-page :deep(.user-row p),
.community-member-page :deep(.side-box p),
.community-member-page :deep(.rules-box ol),
.community-member-page :deep(.trend-box span),
.community-member-page :deep(.community-empty) {
  color: #b8c1d8;
}

.community-member-page :deep(.community-stage) {
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  margin: 0 auto;
  width: 100%;
}

.community-member-page :deep(.community-thread-composer) {
  margin: 34px 0 32px;
}

.community-member-page :deep(.thread-composer) {
  border-color: rgba(168, 85, 247, 0.34);
}

.community-member-page :deep(.topic-tabs) {
  margin-top: 4px;
}

.community-member-page :deep(.community-switcher-shell) {
  bottom: auto;
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
  left: var(--community-rail-edge);
  margin: 0;
  position: fixed;
  top: calc(var(--public-nav-offset, 72px) + 20px);
  transform: none;
  width: 220px;
  z-index: 64;
}

.community-member-page :deep(.community-rail-card) {
  align-items: stretch;
  backdrop-filter: blur(18px);
  background: rgba(8, 12, 30, 0.9) !important;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.26);
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
  max-width: 100%;
  padding: 10px;
  width: 100%;
}

.community-member-page :deep(.community-switcher button),
.community-member-page :deep(.topic-tabs button),
.community-member-page :deep(.miiverse-composer .composer-actions button),
.community-member-page :deep(.composer-image-field),
.community-member-page :deep(.composer-body textarea),
.community-member-page :deep(.thread-chat),
.community-member-page :deep(.reply-box) {
  background: rgba(8, 12, 30, 0.86) !important;
  border-color: rgba(148, 163, 184, 0.18);
  color: #e5e7eb;
}

.community-member-page :deep(.reply-box input) {
  background: transparent !important;
  border: 0 !important;
  color: #f8fafc;
}

.community-member-page :deep(.empty-chat) {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: rgba(148, 163, 184, 0.18);
  color: #b8c1d8;
}

.community-member-page :deep(.miiverse-composer) {
  background:
    linear-gradient(135deg, rgba(12, 16, 38, 0.94), rgba(22, 15, 48, 0.88)) !important;
  border-color: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.community-member-page :deep(.miiverse-composer .composer-body textarea) {
  background: transparent !important;
  border: 0;
  color: #f8fafc;
  font-size: 18px;
  min-height: 102px;
  padding: 8px 0 14px;
}

.community-member-page :deep(.miiverse-composer .composer-body textarea::placeholder) {
  color: #aeb8cf;
}

.community-member-page :deep(.community-empty-threads) {
  background:
    radial-gradient(circle at 50% 18%, rgba(168, 85, 247, 0.2), transparent 30%),
    linear-gradient(135deg, rgba(12, 16, 38, 0.94), rgba(22, 15, 48, 0.9)) !important;
}

.community-member-page :deep(.community-empty-threads.with-background) {
  background: transparent !important;
}

.community-member-page :deep(.community-switcher) {
  flex-direction: column;
  max-height: calc(100dvh - 300px);
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

.community-member-page :deep(.rail-create-btn) {
  background: rgba(8, 12, 30, 0.9) !important;
  border-color: rgba(148, 163, 184, 0.18);
  color: #ffffff;
}

.community-member-page :deep(.rail-create-btn),
.community-member-page :deep(.discover-more-btn) {
  justify-content: flex-start;
  width: 100%;
}

.community-member-page :deep(.community-switcher button) {
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 50px;
  width: 100%;
}

.community-member-page :deep(.discover-more-btn) {
  background: linear-gradient(135deg, #7c3aed, #c026d3) !important;
  border-color: rgba(216, 180, 254, 0.32);
  color: #ffffff;
}

.community-member-page :deep(.community-switcher button.active),
.community-member-page :deep(.topic-tabs button.active),
.community-member-page :deep(.topic-tabs button:hover) {
  background: rgba(124, 58, 237, 0.42) !important;
  border-color: rgba(168, 85, 247, 0.68);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.16);
  color: #ffffff;
}

.community-member-page :deep(.galaxy-hero) {
  align-items: end;
  background:
    linear-gradient(90deg, rgba(5, 7, 18, 0.9) 0%, rgba(10, 7, 28, 0.62) 43%, rgba(5, 7, 18, 0.18) 100%),
    linear-gradient(0deg, rgba(5, 7, 18, 0.96) 0%, rgba(5, 7, 18, 0.3) 58%, rgba(5, 7, 18, 0.14) 100%),
    var(--community-banner) center / cover;
  border: 1px solid rgba(168, 85, 247, 0.34);
  border-radius: 22px;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.38), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  grid-template-columns: 126px minmax(0, 1fr) auto;
  min-height: clamp(220px, 22vw, 300px);
  padding: 30px;
  position: relative;
}

.community-member-page :deep(.galaxy-hero::before) {
  background:
    radial-gradient(circle at 28% 24%, rgba(168, 85, 247, 0.2), transparent 26%),
    radial-gradient(circle at 76% 64%, rgba(236, 72, 153, 0.12), transparent 28%);
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.community-member-page :deep(.galaxy-icon),
.community-member-page :deep(.galaxy-copy),
.community-member-page :deep(.galaxy-actions) {
  position: relative;
  z-index: 1;
}

.community-member-page :deep(.galaxy-icon) {
  border-color: rgba(255, 255, 255, 0.68);
  border-radius: 22px;
  box-shadow: 0 22px 44px rgba(0, 0, 0, 0.36);
  height: 126px;
  width: 126px;
}

.community-member-page :deep(.galaxy-copy h1) {
  font-size: clamp(34px, 4vw, 54px);
  line-height: 0.98;
  max-width: 740px;
  text-shadow: 0 16px 38px rgba(0, 0, 0, 0.46);
}

.community-member-page :deep(.galaxy-copy p) {
  color: #e8e2ff;
  font-size: 16px;
  max-width: 680px;
}

.community-member-page :deep(.galaxy-actions) {
  align-self: end;
  flex-wrap: wrap;
  justify-content: end;
}

.community-member-page :deep(.galaxy-actions button),
.community-member-page :deep(.community-admin-toolbar > button),
.community-member-page :deep(.miiverse-composer .composer-actions .publish-btn) {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  box-shadow: 0 14px 30px rgba(124, 58, 237, 0.32);
}

.community-member-page :deep(.thread-card),
.community-member-page :deep(.composer),
.community-member-page :deep(.side-box) {
  border-radius: 18px;
}

.community-member-page :deep(.thread-footer span) {
  background: rgba(124, 58, 237, 0.18);
  color: #d8b4fe;
}

.community-member-page :deep(.live-pill) {
  background: rgba(239, 68, 68, 0.14);
  color: #fecaca;
}

.community-member-page :deep(.setup-only) {
  background:
    linear-gradient(135deg, rgba(16, 24, 44, 0.96), rgba(36, 14, 70, 0.88));
}

.community-content-enter-active,
.community-content-leave-active {
  transition:
    opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.65s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, filter, transform;
}

.community-content-enter-from,
.community-content-leave-to {
  filter: blur(14px) saturate(0.92);
  opacity: 0;
  transform: translateY(8px) scale(0.995);
}

@media (max-width: 1100px) {
  .community-member-page :deep(.community-stage) {
    grid-template-columns: 1fr;
  }

  .community-member-page :deep(.community-side) {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .community-member-page {
    padding: 78px 10px calc(126px + env(safe-area-inset-bottom));
  }

  .community-member-page :deep(.community-panel) {
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }

  .community-member-page :deep(.community-switcher-shell) {
    bottom: calc(72px + env(safe-area-inset-bottom));
    left: 10px;
    margin: 0;
    position: fixed;
    right: 10px;
    top: auto;
    transform: none;
    width: auto;
    z-index: 64;
  }

  .community-member-page :deep(.community-rail-card) {
    flex-direction: row;
    justify-content: flex-start;
    margin: 0 auto;
    max-width: min(100%, 430px);
    width: 100%;
  }

  .community-member-page :deep(.community-switcher) {
    flex-direction: row;
    flex: 1 1 auto;
    max-width: none;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .community-member-page :deep(.community-switcher button) {
    aspect-ratio: 1;
    grid-template-columns: 1fr;
    min-height: 46px;
    padding: 5px;
    width: 46px;
  }

  .community-member-page :deep(.community-switcher button strong) {
    display: none;
  }

  .community-member-page :deep(.discover-more-btn) {
    flex: 0 0 46px;
    height: 46px;
    justify-content: center;
    min-height: 46px;
    padding: 0;
    width: 46px;
  }

  .community-member-page :deep(.discover-more-btn span) {
    display: none;
  }

  .community-member-page :deep(.galaxy-hero) {
    align-items: end;
    background:
      linear-gradient(0deg, rgba(5, 7, 18, 0.98) 0%, rgba(5, 7, 18, 0.62) 54%, rgba(5, 7, 18, 0.18) 100%),
      var(--community-banner) center / cover;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 330px;
    padding: 22px;
  }

  .community-member-page :deep(.galaxy-icon) {
    align-self: flex-start;
    height: 96px;
    width: 96px;
  }

  .community-member-page :deep(.galaxy-copy h1) {
    font-size: clamp(36px, 12vw, 54px);
    max-width: 100%;
  }

  .community-member-page :deep(.galaxy-copy p) {
    font-size: 14px;
  }

  .community-member-page :deep(.galaxy-actions) {
    width: 100%;
  }

  .community-member-page :deep(.galaxy-actions button) {
    flex: 1 1 140px;
    justify-content: center;
  }

  .community-member-page :deep(.community-side) {
    grid-template-columns: 1fr;
  }

  .community-member-page :deep(.miiverse-composer) {
    grid-template-columns: 42px minmax(0, 1fr);
    padding: 14px;
  }

  .community-member-page :deep(.miiverse-composer .composer-avatar) {
    height: 42px;
    width: 42px;
  }

  .community-member-page :deep(.miiverse-composer .composer-body textarea) {
    font-size: 14px;
    min-height: 86px;
  }
}
</style>
