export function mergeSocialSettings(base, override = {}) {
  const result = JSON.parse(JSON.stringify(base))
  for (const [key, value] of Object.entries(override)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeSocialSettings(result[key] || {}, value)
      : value
  }
  return result
}

export function updateSocialSetting(global, overrides, index, scope, path, value) {
  const target = JSON.parse(JSON.stringify(scope === 'all' ? global : overrides[index] || {}))
  const keys = path.split('.')
  const last = keys.pop()
  let node = target
  for (const key of keys) node = node[key] ||= {}
  node[last] = value
  return scope === 'all'
    ? { global: target, overrides }
    : { global, overrides: { ...overrides, [index]: target } }
}
