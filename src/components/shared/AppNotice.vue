<script setup>
defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'success' },
  visible: { type: Boolean, default: true },
  theme: { type: String, default: 'dark', validator: value => ['dark', 'light'].includes(value) }
})
</script>

<template>
  <Teleport to="body">
    <div class="notice-region" :data-ui-theme="theme" aria-live="polite" aria-atomic="true">
      <Transition name="notice">
        <div v-if="visible && message" class="app-notice" :class="type" role="status">
          <i :class="['fas', type === 'error' ? 'fa-circle-exclamation' : ['delete', 'info'].includes(type) ? 'fa-circle-info' : 'fa-circle-check']" aria-hidden="true"></i>
          <span>{{ message }}</span>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.notice-region { position: fixed; z-index: 10000; inset: auto 16px max(24px, env(safe-area-inset-bottom)) 16px; display: flex; justify-content: center; pointer-events: none; }
.app-notice { display: flex; align-items: center; gap: var(--space-3); min-width: 0; max-width: min(520px, 100%); padding: var(--space-3) var(--space-4); border: var(--border-width) solid var(--notice-border, var(--border)); border-radius: var(--radius-control); background: var(--notice-surface, var(--surface-elevated)); color: var(--notice-text, var(--text-primary)); box-shadow: var(--shadow); font-size: var(--font-body); line-height: var(--line-body); overflow-wrap: anywhere; }
.app-notice span { min-width: 0; }
.app-notice i { flex: 0 0 auto; color: var(--notice-success-icon); }
.app-notice.error i { color: var(--notice-error-icon); }
.app-notice.delete i, .app-notice.info i { color: var(--notice-info-icon); }
.notice-region[data-ui-theme='light'] { --notice-surface: var(--notice-light-surface); --notice-text: var(--notice-light-text); --notice-border: var(--notice-light-border); --notice-success-icon: var(--action-success-text); --notice-error-icon: var(--action-danger-text); --notice-info-icon: var(--notice-light-info-icon); }
.notice-enter-active, .notice-leave-active { transition: opacity 170ms ease, transform 170ms ease; }
.notice-enter-from, .notice-leave-to { opacity: 0; transform: translateY(8px); }
@media (max-width: 760px) { .notice-region { bottom: calc(88px + env(safe-area-inset-bottom)); } }
@media (prefers-reduced-motion: reduce) { .notice-enter-active, .notice-leave-active { transition: none; } }
</style>
