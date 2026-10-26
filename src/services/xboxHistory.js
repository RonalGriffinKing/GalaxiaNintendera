const MAX_GAMES = 500
const time = value => Date.parse(value?.at) || 0
const validGame = game => game && /^\d{1,12}$/.test(game.id) && typeof game.title === 'string' && game.title.length > 0
const newest = entries => entries.sort((a,b) => time(b)-time(a)).slice(0, MAX_GAMES)

// Store provider-normalized summaries only; never persist live presence or credentials.
export function mergeXboxHistory(previous, identity, hiddenIds = []) {
  const prior = previous?.schemaVersion === 1 && previous.xuid === identity.xuid ? previous : {}
  const hidden = new Set(hiddenIds.map(String))
  const merge = (old, current) => {
    const values = new Map()
    for (const entry of [...(old || []), ...(current || [])]) {
      if (!validGame(entry?.game) || hidden.has(entry.game.id)) continue
      const existing = values.get(entry.game.id)
      if (!existing || time(entry) >= time(existing)) values.set(entry.game.id, entry)
    }
    return newest([...values.values()])
  }
  const history = merge(prior.history, identity.history)
  const gameAchievements = merge(prior.gameAchievements, identity.gameAchievements)
  const games = new Map()
  for (const game of [...(prior.featuredGames || []), ...(identity.featuredGames || []), ...history.map(e=>e.game), ...gameAchievements.map(e=>e.game)]) {
    if(validGame(game) && !hidden.has(game.id)) games.set(game.id,game)
  }
  const orderedIds = [...new Set([...history.map(e=>e.game.id), ...gameAchievements.map(e=>e.game.id), ...games.keys()])].slice(0,MAX_GAMES)
  const kept=new Set(orderedIds)
  return { schemaVersion:1, xuid:identity.xuid, history:history.filter(e=>kept.has(e.game.id)), gameAchievements:gameAchievements.filter(e=>kept.has(e.game.id)), featuredGames:orderedIds.map(id=>games.get(id)).filter(Boolean) }
}

export async function archiveXboxHistory(identity, createStore, hiddenIds = []) {
  // A denied/private history must never be replaced with previously public data.
  if(identity.unavailable?.includes('history'))return identity
  let merged
  try {
    const store = createStore(), key = 'xbox/' + identity.xuid
    for(let attempt=0;attempt<4;attempt++) {
      const current = await store.getWithMetadata(key,{type:'json'})
      merged = mergeXboxHistory(current?.data,identity,hiddenIds)
      if(JSON.stringify(current?.data)===JSON.stringify(merged))return {...identity,...merged,archiveAvailable:true}
      const result = await store.setJSON(key,merged,current?{onlyIfMatch:current.etag}:{onlyIfNew:true})
      if(result.modified)return {...identity,...merged,archiveAvailable:true}
    }
  } catch { /* Preserve the current provider response if storage is unavailable. */ }
  return {...identity,...(merged || {}),archiveAvailable:false}
}
