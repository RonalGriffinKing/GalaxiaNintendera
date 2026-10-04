export const achievementTarget = (achievement) => Math.max(1, Number(achievement?.target ?? achievement?.reads ?? 1) || 1)
export const achievementValue = (achievement, metrics = {}) => Number(metrics[achievement?.type || 'reads'] || 0)
export const earnedAchievements = (items, metrics) => items.filter(item => achievementValue(item, metrics) >= achievementTarget(item))
