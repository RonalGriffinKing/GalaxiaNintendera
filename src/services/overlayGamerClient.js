import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { fetchXboxProfile, clearXboxProfileCache } from './xboxProfileClient'
import { fetchNintendoSource, clearNintendoSourceCache } from './nintendoPresenceClient'
import { combineNintendoSources } from './nxapiPresence'

// Only saved public links belonging to the overlay owner; never persist credentials in widgets.
export async function fetchOverlayGamer(ownerId, platform = 'auto', { refresh = false } = {}) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(ownerId || '')) return []
  const snapshot = await getDoc(doc(db, 'users', ownerId))
  if (!snapshot.exists()) return []
  const links = snapshot.data().socialLinks || {}
  if (refresh) {
    if (platform !== 'nintendo') clearXboxProfileCache(ownerId)
    if (platform !== 'xbox') {
      try { if (links.nintendoPresence) clearNintendoSourceCache(links.nintendoPresence) } catch {}
      try { if (links.nintendoProfile) clearNintendoSourceCache(links.nintendoProfile, 'profile') } catch {}
    }
  }
  const requests = []
  if ((platform === 'auto' || platform === 'xbox') && links.xbox?.xuid) requests.push(fetchXboxProfile({ uid: ownerId }))
  if ((platform === 'auto' || platform === 'nintendo') && (links.nintendoPresence || links.nintendoProfile)) requests.push((async () => {
    const sources = await Promise.allSettled([links.nintendoPresence ? fetchNintendoSource(links.nintendoPresence) : Promise.resolve(null), links.nintendoProfile ? fetchNintendoSource(links.nintendoProfile, 'profile') : Promise.resolve(null)])
    return combineNintendoSources(...sources.map(result => result.status === 'fulfilled' ? result.value : null))
  })())
  const results = await Promise.allSettled(requests)
  return results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
}
