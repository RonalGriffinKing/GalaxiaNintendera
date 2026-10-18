/**
 * Future server adapters must populate each capability independently.
 * Presence never implies access to a library, history, playtime or achievements.
 * No Nintendo credentials are collected; public nxapi links are handled separately.
 * Adapters require consent, server-side URL validation, caching and privacy checks.
 * @typedef {Object} GamerIdentity
 * @property {'nintendo'|'steam'|'xbox'} platform
 * @property {'connected'|'disconnected'} connectionState Explicit adapter confirmation.
 * @property {'public'|'private'} visibility
 * @property {{state:'online'|'offline'|'unknown', currentGame?:GamerGame, lastGame?:GamerGame, updatedAt?:string, logoutAt?:string}|null} presence
 * @property {Array<{game:GamerGame, at:string}>|null} history
 * @property {GamerGame[]|null} featuredGames Partial public highlights, never a full library.
 * @property {GamerGame[]|null} library
 * @property {Array<{gameId:string, minutes:number, source:string}>|null} playtime
 * @property {Array<{id:string, platform:string, gameId?:string, label:string}>|null} achievements
 */
/** @typedef {{id:string, title:string, imageUrl?:string}} GamerGame */
export const GAMER_CAPABILITIES = Object.freeze(['presence', 'history', 'library', 'playtime', 'achievements'])
export const GAMER_PLATFORMS = Object.freeze({ nintendo: 'Nintendo Switch', steam: 'Steam', xbox: 'Xbox' })

/** Build a read-only preview from independently supplied adapter capabilities. */
export function gamerHighlights(identities = [], own = false) {
  const connected = identities.filter(identity => identity && GAMER_PLATFORMS[identity.platform]
    && identity.connectionState === 'connected' && (own || identity.visibility === 'public'))
  const activity = connected.flatMap(identity => {
    const presence = identity.presence
    if (!presence) return []
    const playing = presence.state === 'online' && Boolean(presence.currentGame?.title)
    const game = playing ? presence.currentGame : presence.lastGame
    if (!game?.title) return []
    const at = presence.updatedAt || presence.logoutAt
    const timestamp = typeof at === 'string' ? Date.parse(at) : NaN
    return [{ game, playing, platform: GAMER_PLATFORMS[identity.platform], at: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null }]
  }).sort((a, b) => Number(b.playing) - Number(a.playing) || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0))
  const mostPlayed = connected.flatMap(identity => {
    const games = [...(identity.library || []), ...(identity.featuredGames || []), ...(identity.history || []).map(entry => entry.game), identity.presence?.currentGame, identity.presence?.lastGame].filter(Boolean)
    // Conflicting or duplicate measurements cannot safely be summed.
    const seen = new Set()
    return (identity.playtime || []).flatMap(entry => {
      if (!entry.source || !Number.isFinite(entry.minutes) || entry.minutes < 0 || seen.has(entry.gameId)) return []
      const game = games.find(game => game.id === entry.gameId && game.title)
      if (!game) return []
      seen.add(entry.gameId)
      return [{ game, minutes: entry.minutes, platform: GAMER_PLATFORMS[identity.platform], key: identity.platform + ':' + entry.gameId }]
    })
  }).sort((a, b) => b.minutes - a.minutes).slice(0, 3)
  return { platforms: [...new Set(connected.map(identity => GAMER_PLATFORMS[identity.platform]))], activity: activity[0] || null, mostPlayed }
}
