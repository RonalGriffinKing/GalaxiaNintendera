import {describe,it,expect} from 'vitest'
import {invitationDate,invitationDefaults,isEventActive} from './eventInvitation'
describe('event invitations and expiry',()=>{
 it('formats the invitation in the selected timezone across the Madrid summer-time boundary',()=>{
  const event={startsAt:Date.parse('2026-10-24T23:30:00Z'),durationMinutes:90}
  expect(invitationDate(event,'Europe/Madrid')).toMatchObject({day:'domingo',time:'01:30',date:'25 de octubre de 2026',duration:'1 h 30 min',zone:'Hora España'})
  expect(invitationDate(event,'UTC').time).toBe('23:30')
 })
 it('keeps future and running events active, and excludes them at their actual end',()=>{
  const event={startsAt:100000,durationMinutes:90}
  expect(isEventActive(event,99999)).toBe(true)
  expect(isEventActive(event,100000+60*60000)).toBe(true)
  expect(isEventActive(event,100000+90*60000)).toBe(false)
  expect(isEventActive({startsAt:'invalid'},0)).toBe(false)
 })
 it('provides a one-hour window when a legacy event has no duration',()=>{
  expect(isEventActive({startsAt:1000},3600999)).toBe(true)
  expect(isEventActive({startsAt:1000},3601000)).toBe(false)
 })
 it('does not label an invitation live automatically or mutate the event',()=>{
  const event={title:'Los Pitufos',description:'Una aventura',startsAt:Date.now(),backgroundUrl:'cover.png'}
  const options=invitationDefaults(event)
  expect(options.status).toBe('upcoming');expect(options.image).toBe('cover.png')
  options.title='Invitacion editada';expect(event.title).toBe('Los Pitufos')
 })
})
