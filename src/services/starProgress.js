export const STAR_LEVELS = [0, 10, 25, 50, 100]
export const READ_REWARD_STARS = 1
export const READ_REWARD_DELAY_MS = 30000
export function starCount(value = 0) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid-stars')
  return value
}
export function progressStars(profile = {}) {
  return starCount(profile.participationStars ?? 0)
}
export function canUseIcon(profile, icon) {
  return (profile.unlockedIcons || ['kirby-01']).includes(icon.id) ||
    (icon.active !== false && icon.visible !== false && !icon.archived && progressStars(profile) >= starCount(icon.requiredStars ?? 25))
}
export function progressSummary(profile, icons = []) {
  const stars = progressStars(profile)
  const next = icons.filter(icon => icon.active !== false && icon.visible !== false && !icon.archived && !canUseIcon(profile, icon)).reduce((n, icon) => Math.min(n, icon.requiredStars), Infinity)
  return { stars, prestige: Math.floor(stars / 100), next: Number.isFinite(next) ? next : null, remaining: Number.isFinite(next) ? next - stars : 0 }
}
export function retainUnlocked(profile, icons) {
  return [...new Set([...(profile.unlockedIcons || ['kirby-01']), ...icons.filter(icon => canUseIcon(profile, icon)).map(icon => icon.id)])]
}
