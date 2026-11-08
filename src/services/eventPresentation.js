import { eventTime, isEventActive } from './eventInvitation'
import { eventGameNames } from './eventGame'

export function eventState(event, now=Date.now()) {
  if (!isEventActive(event,now)) return 'past'
  return eventTime(event.startsAt)<=now ? 'live' : 'upcoming'
}
export const eventStateLabel = (event,now) => ({past:'Finalizado',live:'En directo',upcoming:'Próximo'})[eventState(event,now)]
export function eventReplayLink(event,handle='GalaxiaNintendera') {
  try {
    const url=new URL(event.url)
    if(['http:','https:'].includes(url.protocol))return {href:url.href,label:/(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname)?'Ver en YouTube':'Ver enlace del evento'}
  } catch {}
  return {href:'https://www.youtube.com/@'+encodeURIComponent(String(handle||'GalaxiaNintendera').replace(/^@+/,'')),label:'Ver el canal de YouTube'}
}
export const eventCommunityIds = event => event.communityIds || (event.communityId ? [event.communityId] : [])
export function filterEvents(events,{filter='upcoming',search='',type='all',sort='date'}={},now=Date.now()) {
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const term=normalize(search).trim()
  return events.filter(event=>{
    const state=eventState(event,now)
    if(filter==='past'&&state!=='past'||filter==='upcoming'&&state==='past')return false
    if(filter==='featured'&&(!event.featured||state==='past'))return false
    if(filter==='communities'&&(!eventCommunityIds(event).length||state==='past'))return false
    if(type!=='all'&&event.type!==type)return false
    const game=eventGameNames(event)
    return !term||normalize([event.title,event.description,game.nameEs,game.nameEn,event.platform,...(event.communityNames||[])].join(' ')).includes(term)
  }).sort((a,b)=>sort==='az'?String(a.title||'').localeCompare(String(b.title||''),'es'):sort==='recent'||filter==='past'?eventTime(b.startsAt)-eventTime(a.startsAt):eventTime(a.startsAt)-eventTime(b.startsAt))
}
