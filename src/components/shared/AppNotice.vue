<script setup>
defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'success' },
  visible: { type: Boolean, default: true }
})
</script>

<template>
  <Teleport to="body">
    <div class="notice-region" aria-live="polite" aria-atomic="true">
      <Transition name="notice">
        <div v-if="visible && message" class="app-notice" :class="type" role="status">
          <i :class="['fas', type === 'error' ? 'fa-circle-exclamation' : type === 'delete' ? 'fa-circle-info' : 'fa-circle-check']" aria-hidden="true"></i>
          <span>{{ message }}</span>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.notice-region { position: fixed; z-index: 10000; inset: auto 16px max(24px, env(safe-area-inset-bottom)) 16px; display: flex; justify-content: center; pointer-events: none; }
.app-notice { display: flex; align-items: center; gap: 12px; max-width: 520px; padding: 14px 18px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface-elevated); color: var(--text-primary); box-shadow: var(--shadow); font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
.app-notice i { color: #86efac; }
.app-notice.error i { color: #fca5a5; }
.app-notice.delete i { color: var(--accent-hover); }
.notice-enter-active, .notice-leave-active { transition: opacity 170ms ease, transform 170ms ease; }
.notice-enter-from, .notice-leave-to { opacity: 0; transform: translateY(8px); }
@media (max-width: 760px) { .notice-region { bottom: calc(88px + env(safe-area-inset-bottom)); } }
@media (prefers-reduced-motion: reduce) { .notice-enter-active, .notice-leave-active { transition: none; } }
</style>
