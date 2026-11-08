import { describe,it,expect } from 'vitest'
import { eventState,filterEvents,eventReplayLink } from './eventPresentation'
const now=1800000000000
const events=[
 {id:'past',title:'Encuentro anterior',startsAt:now-7200000,durationMinutes:60},
 {id:'live',title:'Torneo en directo',startsAt:now-600000,durationMinutes:60,type:'Torneo'},
 {id:'next',title:'Próxima cita',startsAt:now+3600000,game:{nameEs:'Pokémon'},communityIds:['club']},
 {id:'featured',title:'Destacado',startsAt:now+7200000,featured:true}
]
describe('event views keep current, archived and community events',()=>{
 it('keeps an ongoing event until its duration ends',()=>{
   expect(eventState(events[0],now)).toBe('past')
   expect(eventState(events[1],now)).toBe('live')
   expect(filterEvents(events,{filter:'upcoming'},now).map(e=>e.id)).toEqual(['live','next','featured'])
 })
 it('retains previous events and their original data',()=>{
   expect(filterEvents(events,{filter:'past'},now)).toEqual([events[0]])
   expect(events).toHaveLength(4)
 })
 it('filters by game, community, highlight and event type',()=>{
   expect(filterEvents(events,{filter:'all',search:'pokemon'},now).map(e=>e.id)).toEqual(['next'])
   expect(filterEvents(events,{filter:'communities'},now).map(e=>e.id)).toEqual(['next'])
   expect(filterEvents(events,{filter:'featured'},now).map(e=>e.id)).toEqual(['featured'])
   expect(filterEvents(events,{filter:'all',type:'Torneo'},now).map(e=>e.id)).toEqual(['live'])
 })
 it('orders all events from most recent to oldest when requested',()=>{
   expect(filterEvents(events,{filter:'all',sort:'recent'},now).map(e=>e.id)).toEqual(['featured','next','live','past'])
 })
 it('uses the existing replay link, with a channel fallback for missing or unsafe links',()=>{
   expect(eventReplayLink({url:'https://youtu.be/demo'}).label).toBe('Ver en YouTube')
   expect(eventReplayLink({url:'https://twitch.tv/demo'}).href).toBe('https://twitch.tv/demo')
   expect(eventReplayLink({},'@Canal').href).toBe('https://www.youtube.com/@Canal')
   expect(eventReplayLink({url:'javascript:alert(1)'},'Canal').label).toBe('Ver el canal de YouTube')
 })
})
