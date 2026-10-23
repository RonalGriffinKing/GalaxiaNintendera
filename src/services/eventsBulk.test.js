import { describe,it,expect } from 'vitest'
import { parseEventsJson,eventCreatePayload } from './eventJson'
const one={title:'Direct',fecha:'2026-11-01',hora:'21:00',communityIds:['c']}
describe('multi-event import',()=>{
 it('accepts Directo in the two-day Smurfs schedule and preserves its dates',()=>{
  const rows=[{title:'Los Pitufos: Dreams | Una joya oculta',type:'Directo',fecha:'2026-10-19',hora:'18:30',durationMinutes:90},{title:'Los Pitufos: Dreams | Seguimos soñando',type:' DIRECTO ',fecha:'2026-10-22',hora:'18:30',durationMinutes:90}]
  const parsed=parseEventsJson(JSON.stringify({events:rows}))
  expect(parsed.map(e=>e.type)).toEqual(['Direct','Direct'])
  expect(parsed.map(e=>e.startsAt)).toEqual(['2026-10-19T18:30','2026-10-22T18:30'])
  expect(parsed.map(e=>e.durationMinutes)).toEqual([90,90])
 })
 it('accepts arrays and Spanish envelopes, preserving distinct days',()=>{
  const rows=[one,{...one,title:'Torneo',fecha:'2026-11-04'}]
  for(const data of [rows,{events:rows},{eventos:rows}]){const parsed=parseEventsJson(JSON.stringify(data),[{id:'c'}]);expect(parsed.map(e=>e.startsAt)).toEqual(['2026-11-01T21:00','2026-11-04T21:00']);expect(parsed[0].durationMinutes).toBe(60)}
 })
 it('reports the bad row and rejects the whole input',()=>expect(()=>parseEventsJson(JSON.stringify([{title:'First',...one},{title:'Missing date'}]),[{id:'c'}])).toThrow('Evento 2'))
 it('bounds batch size and requires a list',()=>{for(const data of [[],{title:'x'},Array(51).fill(one)])expect(()=>parseEventsJson(JSON.stringify(data))).toThrow()})
 it('creates only whitelisted payload fields with trusted author and community labels',()=>{
  const row=parseEventsJson(JSON.stringify([one]),[{id:'c'}])[0]
  const result=eventCreatePayload({...row,createdBy:'attacker',admin:true},[{id:'c',name:'Club'}],'admin',123)
  expect(result).toMatchObject({createdBy:'admin',communityIds:['c'],communityNames:['Club'],createdAt:123,updatedAt:123})
  expect(result.admin).toBeUndefined();expect(Number.isFinite(result.startsAt)).toBe(true)
 })
})
