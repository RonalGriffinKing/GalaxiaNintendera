import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { fetchXboxProfile } from './xboxProfileClient'
import { fetchNintendoSource } from './nintendoPresenceClient'
import { combineNintendoSources } from './nxapiPresence'

// Only saved public links belonging to the overlay owner; never persist credentials in widgets.
export async function fetchOverlayGamer(ownerId, platform = 'auto') {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(ownerId || '')) return []
  const snapshot = await getDoc(doc(db, 'users', ownerId))
  if (!snapshot.exists()) return []
  const links = snapshot.data().socialLinks || {}
  const requests = []
  if ((platform === 'auto' || platform === 'xbox') && links.xbox?.xuid) requests.push(fetchXboxProfile({ uid: ownerId }))
  if ((platform === 'auto' || platform === 'nintendo') && (links.nintendoPresence || links.nintendoProfile)) requests.push((async () => {
    const sources = await Promise.allSettled([links.nintendoPresence ? fetchNintendoSource(links.nintendoPresence) : Promise.resolve(null), links.nintendoProfile ? fetchNintendoSource(links.nintendoProfile, 'profile') : Promise.resolve(null)])
    return combineNintendoSources(...sources.map(result => result.status === 'fulfilled' ? result.value : null))
  })())
  const results = await Promise.allSettled(requests)
  return results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
}
