<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import GlobalThreadComposerCard from '@/components/thread/GlobalThreadComposerCard.vue'

const props = defineProps({
  open: Boolean,
  userRole: { type: String, default: 'user' },
  initialCommunityId: { type: String, default: '' }
})

const emit = defineEmits(['close', 'published'])
const scrollableSelector = '.global-thread-content, .global-thread-compose, .global-gif-grid, .global-thread-community-list'
const allowedTouchSelector = `${scrollableSelector}, textarea, input`
let touchStartY = 0

const updateGlobalThreadVvh = () => {
  if (typeof window === 'undefined') return
  const height = window.visualViewport?.height || window.innerHeight
  document.documentElement.style.setProperty('--global-thread-vvh', `${Math.round(height)}px`)
}

const setOpenClass = (isOpen) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('global-thread-open', Boolean(isOpen))
  document.body.classList.toggle('global-thread-open', Boolean(isOpen))
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && props.open) emit('close')
}

const findScrollableTarget = (target) => {
  if (!(target instanceof Element)) return null
  return target.closest(scrollableSelector)
}

const isAllowedTouchTarget = (target) => {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(allowedTouchSelector))
}

const handleTouchStart = (event) => {
  touchStartY = Number(event.touches?.[0]?.clientY || 0)
}

const preventBackgroundTouchMove = (event) => {
  if (!props.open) return
  const target = event.target
  if (!isAllowedTouchTarget(target)) {
    event.preventDefault()
    return
  }

  const editable = target instanceof Element ? target.closest('textarea, input') : null
  if (editable) return

  const scroller = findScrollableTarget(target)
  if (!scroller) {
    event.preventDefault()
    return
  }

  const currentY = Number(event.touches?.[0]?.clientY || 0)
  const deltaY = currentY - touchStartY
  const canScroll = scroller.scrollHeight > scroller.clientHeight + 1
  const atTop = scroller.scrollTop <= 0
  const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1

  if (!canScroll || (atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
    event.preventDefault()
  }
}

watch(() => props.open, (isOpen) => {
  setOpenClass(isOpen)
  if (isOpen) updateGlobalThreadVvh()
}, { immediate: true })

onMounted(() => {
  updateGlobalThreadVvh()
  window.addEventListener('resize', updateGlobalThreadVvh)
  window.addEventListener('orientationchange', updateGlobalThreadVvh)
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchmove', preventBackgroundTouchMove, { passive: false })
  window.visualViewport?.addEventListener('resize', updateGlobalThreadVvh)
  window.visualViewport?.addEventListener('scroll', updateGlobalThreadVvh)
})

onUnmounted(() => {
  setOpenClass(false)
  document.documentElement.style.removeProperty('--global-thread-vvh')
  window.removeEventListener('resize', updateGlobalThreadVvh)
  window.removeEventListener('orientationchange', updateGlobalThreadVvh)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('touchmove', preventBackgroundTouchMove)
  window.visualViewport?.removeEventListener('resize', updateGlobalThreadVvh)
  window.visualViewport?.removeEventListener('scroll', updateGlobalThreadVvh)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="global-thread-overlay-fade">
      <div v-if="open" class="global-thread-overlay">
        <div class="global-thread-panel" @click.self="emit('close')">
          <Transition name="global-thread-card-in" appear>
            <GlobalThreadComposerCard
              :user-role="userRole"
              :initial-community-id="initialCommunityId"
              @close="emit('close')"
              @published="emit('published')"
            />
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.global-thread-overlay {
  background: rgba(5, 5, 18, 0.72);
  backdrop-filter: blur(14px);
  height: var(--global-thread-vvh, 100dvh);
  inset: 0;
  overflow: hidden;
  overscroll-behavior: contain;
  position: fixed;
  touch-action: none;
  width: 100vw;
  z-index: 9999;
}

.global-thread-panel {
  align-items: center;
  display: flex;
  height: var(--global-thread-vvh, 100dvh);
  inset: 0;
  justify-content: center;
  overflow: hidden;
  padding: clamp(14px, 3vw, 32px);
  position: fixed;
  touch-action: none;
  width: 100vw;
}

:global(html.global-thread-open),
:global(body.global-thread-open) {
  overflow: hidden !important;
  overscroll-behavior: none !important;
  touch-action: none;
}

:global(.global-thread-card) {
  touch-action: auto;
}

:global(.global-thread-content),
:global(.global-thread-compose),
:global(.global-gif-grid),
:global(.global-thread-community-list) {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

:global(.global-thread-card textarea),
:global(.global-thread-card input) {
  touch-action: manipulation;
}

:global(body.global-thread-open .public-bottom-nav) {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: translate3d(0, 120%, 0) scale(0.96) !important;
}

:global(body.global-thread-open .music-bubble-fab),
:global(body.global-thread-open .music-bubble-panel),
:global(body.global-thread-open .direct-chat-fab),
:global(body.global-thread-open .direct-chat-panel),
:global(body.global-thread-open .community-floating-access) {
  opacity: 0 !important;
  pointer-events: none !important;
}

.global-thread-overlay-fade-enter-active,
.global-thread-overlay-fade-leave-active {
  transition: opacity 0.22s ease;
}

.global-thread-overlay-fade-enter-from,
.global-thread-overlay-fade-leave-to {
  opacity: 0;
}

.global-thread-card-in-enter-active,
.global-thread-card-in-leave-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.global-thread-card-in-enter-from,
.global-thread-card-in-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

@media (max-width: 768px) {
  .global-thread-panel {
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
  }

  .global-thread-card-in-enter-from,
  .global-thread-card-in-leave-to {
    opacity: 0;
    transform: translateY(18px);
  }
}
</style>
