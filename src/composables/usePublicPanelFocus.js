import { nextTick, onBeforeUnmount, toValue, watch } from 'vue'
import { createPublicPanelLifecycle } from './publicPanelLifecycle'
export function usePublicPanelFocus(open, panel, requestClose, options = {}) {
  let lifecycle
  const keepVisibleFocus = () => {
    if (!toValue(open) || !panel.value) return
    const active = document.activeElement
    if (active === document.body || (panel.value.contains(active) && !active.getClientRects().length)) lifecycle?.focusInitial()
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', keepVisibleFocus)
  watch(open, async value => {
    if (typeof document === 'undefined') return
    if (!value) { lifecycle?.close(); lifecycle = undefined; return }
    const opener = document.activeElement
    await nextTick()
    if (!toValue(open) || !panel.value) return
    const relatedTrigger = () => [...document.querySelectorAll('[aria-controls]')].find(element => panel.value?.id && element.getAttribute('aria-controls').split(/\s+/).includes(panel.value.id) && element.getClientRects().length)
    lifecycle = createPublicPanelLifecycle(panel.value, { opener, requestClose, fallbackFocus: relatedTrigger, ...options })
    lifecycle.open()
  }, { immediate: true })
  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') window.removeEventListener('resize', keepVisibleFocus)
    lifecycle?.close()
  })
}
