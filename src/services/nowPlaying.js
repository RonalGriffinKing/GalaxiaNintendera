import { GAMER_PLATFORMS } from './gamerIdentity'

export const NOW_PLAYING_DEFAULTS = Object.freeze({ platform: 'auto', width: 520, height: 172, visibleSeconds: 12, repeatSeconds: 180, direction: 'left', showLastGame: false, theme: 'galaxy', labelSize: 12, titleSize: 20, platformSize: 11, statsSize: 12, coverWidth: 88, particles: true, xboxPlatform: 'Xbox', nintendoPlatform: 'auto', enabled: true, refreshMode: 'manual' })
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback
export function nowPlayingSettings(data = {}) {
  const visibleSeconds = bounded(data.visibleSeconds, 12, 5, 60)
  const labelSize = bounded(data.labelSize, 12, 10, 24), titleSize = bounded(data.titleSize, 20, 14, 32), platformSize = bounded(data.platformSize, 11, 9, 20), statsSize = bounded(data.statsSize, 12, 10, 24)
  const width = bounded(data.width, 520, 320, 900)
  const coverWidth = Math.min(bounded(data.coverWidth, 88, 60, 120), Math.floor(width * .23))
  const coverHeight = coverWidth * 1.5 + 56 + Math.max(0,labelSize-12)*1.2
  const textHeight = 172 + Math.max(0,titleSize-20)*2.4 + Math.max(0,platformSize-11)*1.4 + Math.max(0,statsSize-12)*2.8 + Math.max(0,labelSize-12)*1.3
  return { enabled: data.enabled !== false, refreshMode: data.refreshMode === 'auto' ? 'auto' : 'manual', nintendoPlatform: ['auto', 'Nintendo Switch', 'Nintendo Switch 2'].includes(data.nintendoPlatform) ? data.nintendoPlatform : 'auto', xboxPlatform: ['Xbox', 'Xbox Series', 'Xbox One', 'PC'].includes(data.xboxPlatform) ? data.xboxPlatform : 'Xbox', coverWidth, particles: data.particles !== false, labelSize, titleSize, platformSize, statsSize, platform: ['auto', 'nintendo', 'xbox'].includes(data.platform) ? data.platform : 'auto', width, height: Math.max(Math.ceil(coverHeight), Math.ceil(textHeight), bounded(data.height, 172, 172, 360)), visibleSeconds, repeatSeconds: bounded(data.repeatSeconds, 180, visibleSeconds + 5, 1800), direction: data.direction === 'right' ? 'right' : 'left', showLastGame: data.showLastGame === true, theme: data.theme === 'minimal' ? 'minimal' : 'galaxy' }
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
    const platformLabel = identity.platform === 'xbox' ? settings.xboxPlatform : identity.platform === 'nintendo' && settings.nintendoPlatform !== 'auto' ? settings.nintendoPlatform : identity.platform === 'nintendo' && playing && ['Nintendo Switch', 'Nintendo Switch 2'].includes(identity.presence?.platformLabel) ? identity.presence.platformLabel : GAMER_PLATFORMS[identity.platform]
    return [{ game, platform: identity.platform, platformLabel, playing, stats: stats.slice(0, 2), at: Date.parse(identity.presence?.updatedAt) || 0 }]
  }).sort((a, b) => Number(b.playing) - Number(a.playing) || b.at - a.at)
  return candidates[0] || null
}
