import { describe,it,expect } from 'vitest'
import { parseEventJson } from './eventJson'
import { compactPostCategory } from './postCategoryDisplay'
describe('event JSON import',()=>{
 it('maps an event and its optional fields without importing server metadata',()=>{
  expect(parseEventJson(JSON.stringify({title:' Direct ',type:'direct',description:'Texto',fecha:'2026-11-01',hora:'21:00',durationMinutes:90,url:'https://example.com',imageUrl:'https://example.com/image.png',communityIds:['a','a'],createdBy:'other',id:'x'}),[{id:'a'}])).toEqual({title:'Direct',type:'Direct',description:'Texto',startsAt:'2026-11-01T21:00',durationMinutes:90,url:'https://example.com',backgroundUrl:'https://example.com/image.png',communityIds:['a']})
 })
 it('accepts a fenced Spanish event and converts zoned time to the local input',()=>{
  const result=parseEventJson('```json\n'+JSON.stringify({evento:{titulo:'Torneo',tipo:'Torneo',startsAt:'2026-11-01T20:00:00Z'}})+'\n```')
  const date=new Date('2026-11-01T20:00:00Z');expect(result.startsAt).toBe(new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16))
 })
 it.each(['[]','null','{bad',JSON.stringify({title:'Evento',fecha:'2026-02-30',hora:'20:00'}),JSON.stringify({title:'Evento',startsAt:'tomorrow'}),JSON.stringify({title:'Evento',type:'Invalid'}),JSON.stringify({title:'Evento',durationMinutes:-1}),JSON.stringify({title:'Evento',communityIds:['missing']})])('rejects invalid input atomically: %s',text=>expect(()=>parseEventJson(text)).toThrow())
 it('keeps omitted optional fields out of the patch',()=>expect(parseEventJson('{"title":"Evento"}')).toEqual({title:'Evento'}))
})
describe('compact editorial category',()=>{
 it('replaces a repeated title with a real category or Noticias',()=>{
  const title='Una noticia con muchas novedades'
  expect(compactPostCategory({title,category:title,categories:['Nintendo Switch 2']})).toBe('Nintendo Switch 2')
  expect(compactPostCategory({title,category:title})).toBe('Noticias')
  expect(compactPostCategory({category:'A'.repeat(100)})).toBe('Noticias')
 })
})
