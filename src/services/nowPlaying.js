import { GAMER_PLATFORMS } from './gamerIdentity'

export const NOW_PLAYING_DEFAULTS = Object.freeze({ platform: 'auto', width: 520, height: 172, visibleSeconds: 12, repeatSeconds: 180, direction: 'left', showLastGame: false, theme: 'galaxy', labelSize: 12, titleSize: 20, platformSize: 11, statsSize: 12 })
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback
export function nowPlayingSettings(data = {}) {
  const visibleSeconds = bounded(data.visibleSeconds, 12, 5, 60)
  const labelSize = bounded(data.labelSize, 12, 10, 24), titleSize = bounded(data.titleSize, 20, 14, 32), platformSize = bounded(data.platformSize, 11, 9, 20), statsSize = bounded(data.statsSize, 12, 10, 24)
  const textHeight = 172 + Math.max(0,titleSize-20)*2.4 + Math.max(0,platformSize-11)*1.4 + Math.max(0,statsSize-12)*2.8 + Math.max(0,labelSize-12)*1.3
  return { labelSize, titleSize, platformSize, statsSize, platform: ['auto', 'nintendo', 'xbox'].includes(data.platform) ? data.platform : 'auto', width: bounded(data.width, 520, 320, 900), height: Math.max(Math.ceil(textHeight), bounded(data.height, 172, 172, 360)), visibleSeconds, repeatSeconds: bounded(data.repeatSeconds, 180, visibleSeconds + 5, 1800), direction: data.direction === 'right' ? 'right' : 'left', showLastGame: data.showLastGame === true, theme: data.theme === 'minimal' ? 'minimal' : 'galaxy' }
}
export function nowPlayingCard(identities, settings) {
  const candidates = identities.filter(identity => identity?.connectionState === 'connected' && identity.visibility === 'public' && GAMER_PLATFORMS[identity.platform] && (settings.platform === 'auto' || identity.platform === settings.platform)).flatMap(identity => {
    const playing = identity.presence?.state === 'online' && Boolean(identity.presence.currentGame?.title)
    const game = playing ? identity.presence.currentGame : settings.showLastGame ? identity.presence?.lastGame : null
    if (!game?.title) return []
    const minutes = identity.playtime?.find(entry => entry.gameId === game.id && entry.source && Number.isFinite(entry.minutes) && entry.minutes >= 0)?.minutes
    const achievement = identity.gameAchievements?.find(entry => entry.game?.id === game.id)
    const stats = []
    if (minutes !== undefined) { const hours = Math.floor(minutes / 60), rest = Math.floor(minutes % 60); stats.push({ icon: 'far fa-clock', text: hours ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${rest} min` }) }
    if (achievement?.unlocked !== null && Number.isSafeInteger(achievement?.unlocked) && achievement.unlocked >= 0) stats.push({ icon: 'fas fa-trophy', text: `${achievement.unlocked}${achievement.total > 0 && achievement.total >= achievement.unlocked ? '/' + achievement.total : ''} logros` })
    if (achievement?.gamerscore !== null && Number.isSafeInteger(achievement?.gamerscore) && achievement.gamerscore >= 0) stats.push({ icon: 'fas fa-star', text: `${achievement.gamerscore}${achievement.totalGamerscore > 0 && achievement.totalGamerscore >= achievement.gamerscore ? '/' + achievement.totalGamerscore : ''} G` })
    return [{ game, platform: identity.platform, platformLabel: GAMER_PLATFORMS[identity.platform], playing, stats: stats.slice(0, 2), at: Date.parse(identity.presence?.updatedAt) || 0 }]
  }).sort((a, b) => Number(b.playing) - Number(a.playing) || b.at - a.at)
  return candidates[0] || null
}
