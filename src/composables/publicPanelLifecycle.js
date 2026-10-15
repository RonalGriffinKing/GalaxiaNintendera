// Public disclosures, sheets and confirmations. Scroll policy stays with the consumer.
export function createPublicPanelLifecycle(panel, { opener, fallbackFocus, requestClose, trap = () => false, initial = 'button:not(:disabled), a[href], input:not(:disabled)' }) {
  const document = panel.ownerDocument
  let restoreFocus = true
  const controls = () => [...panel.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(e => !e.matches(':disabled') && e.tabIndex >= 0 && e.getClientRects().length)
  function keydown(event) {
    if (!panel.contains(document.activeElement)) return
    if (event.key === 'Escape') { event.preventDefault(); requestClose(); return }
    if (event.key !== 'Tab' || !trap()) return
    const items = controls(), first = items[0], last = items.at(-1)
    if (!first) { event.preventDefault(); panel.focus(); return }
    if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement))) { event.preventDefault(); first.focus() }
  }
  function outside(event) {
    if (!panel.contains(event.target) && !opener?.contains(event.target)) { restoreFocus = false; requestClose() }
  }
  function leave(event) {
    if (!trap() && event.relatedTarget && !panel.contains(event.relatedTarget) && !opener?.contains(event.relatedTarget)) { restoreFocus = false; requestClose() }
  }
  function focusInitial() {
    const requested = [...panel.querySelectorAll(initial)].find(e => e.getClientRects().length)
    ;(requested || controls()[0] || panel).focus()
  }
  function open() {
    focusInitial()
    document.addEventListener('keydown', keydown)
    document.addEventListener('pointerdown', outside)
    panel.addEventListener('focusout', leave)
  }
  function close() {
    document.removeEventListener('keydown', keydown)
    document.removeEventListener('pointerdown', outside)
    panel.removeEventListener('focusout', leave)
    const target = opener?.isConnected && opener.getClientRects?.().length !== 0 ? opener : fallbackFocus?.()
    if (restoreFocus && target?.isConnected && (panel.contains(document.activeElement) || document.activeElement === document.body || document.activeElement === opener)) target.focus()
  }
  return { open, close, keydown, outside, leave, focusInitial }
}
