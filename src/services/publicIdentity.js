// Public author/member labels must never fall back to an email address.
export function safePublicName(...values) {
  return values.find(value => typeof value === 'string' && value.trim() && !value.includes('@'))?.trim().slice(0,120) || 'Usuario'
}
