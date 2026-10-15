// A disclosure contains ordinary links/buttons, not an ARIA application menu.
export function disclosureDismissal(event, root, open) {
  if (!open || !root) return null
  if (event.type === 'keydown') return event.key === 'Escape' && root.contains(event.target) ? 'restore' : null
  if (event.type === 'pointerdown' && !root.contains(event.target)) return 'close'
  return null
}
