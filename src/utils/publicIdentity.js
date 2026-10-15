// Public presentation only. Never read email, uid, id or private account fields.
// Reject historical email-shaped values already copied into name/author/handle.
export function publicText(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  if (/[^\s@]+@[^\s@]+/u.test(value)) return ''
  return value
}

export function publicName(...candidates) {
  return candidates.map(publicText).find(Boolean) || 'Usuario de Galaxia'
}
