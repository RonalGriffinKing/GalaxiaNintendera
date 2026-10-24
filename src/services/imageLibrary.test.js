import { describe, it, expect, vi } from 'vitest'
vi.mock('@/firebase',()=>({auth:{currentUser:{uid:'admin'}},db:{}}))
vi.mock('firebase/firestore',()=>({collection:vi.fn((_,name)=>name),getDocs:vi.fn(),limit:vi.fn(n=>({limit:n})),orderBy:vi.fn((...v)=>({orderBy:v})),query:vi.fn((...v)=>v),startAfter:vi.fn(v=>({after:v.id}))}))
import {extractPostImages,loadWebImageLibrary,searchIgdbMedia} from './imageLibrary'
import {getDocs} from 'firebase/firestore'
import {auth} from '@/firebase'
import {parseEventJson,eventCreatePayload,parseEventsJson} from './eventJson'
describe('event game JSON',()=>{
 it('preserves both game names through parsing and the stored event payload',()=>{
  const game={nameEs:'Los Pitufos: Dreams',nameEn:'The Smurfs: Dreams'}
  const event=parseEventsJson(JSON.stringify({events:[{title:'Directo de hoy',fecha:'2026-11-01',hora:'18:30',game}]}))[0]
  expect(event.game).toEqual(game);expect(eventCreatePayload(event,[],'admin').game).toEqual(game)
 })
 it('accepts either language without requiring new metadata on old JSON',()=>{
  expect(parseEventJson('{"title":"Live","game":{"nameEn":"Kirby Air Riders"}}').game).toEqual({nameEn:'Kirby Air Riders',nameEs:''})
  expect(parseEventJson('{"title":"Live","juego":"Los Pitufos"}').game.nameEs).toBe('Los Pitufos')
  expect(parseEventJson('{"title":"Live"}').game).toBeUndefined()
  expect(()=>parseEventJson('{"title":"Live","game":{"nameEn":123}}')).toThrow()
 })
})
describe('image library',()=>{
 it('deduplicates URLs while making reused images searchable by either post and language',()=>{
  const posts=[{id:'a',title:'Un directo',image:'https://a.test/image.png',game:{nameEn:'The Smurfs',nameEs:'Los Pitufos'},sections:[{title:'Gameplay',image:'/shot.png'}],social:{image:'https://a.test/image.png',slides:[{image:'/social.png'}]}},{id:'b',title:'Otra noticia',image:'https://a.test/image.png',sections:'invalid',social:{slides:null}},{id:'c',title:'Bad',image:'javascript:alert(1)'}]
  const images=extractPostImages(posts)
  expect(images).toHaveLength(3);expect(images[0].searchText).toContain('the smurfs');expect(images[0].searchText).toContain('otra noticia');expect(images[0].searchText).toContain('los pitufos')
 })
 it('caches a bounded post page, then reads more only on demand, isolated by user',async()=>{
  getDocs.mockResolvedValueOnce({docs:Array.from({length:40},(_,i)=>({id:'p'+i,data:()=>({title:'Game',image:'/img'+i+'.png'})}))}).mockResolvedValueOnce({docs:[{id:'next',data:()=>({title:'Next',image:'/next.png'})}]}).mockResolvedValueOnce({docs:[]})
  const first=await loadWebImageLibrary({refresh:true});expect(first.hasMore).toBe(true);expect(first.postCount).toBe(40)
  await loadWebImageLibrary();expect(getDocs).toHaveBeenCalledTimes(1)
  const more=await loadWebImageLibrary({more:true});expect(more.postCount).toBe(41);expect(more.hasMore).toBe(false)
  auth.currentUser={uid:'other'};expect((await loadWebImageLibrary()).postCount).toBe(0);expect(getDocs).toHaveBeenCalledTimes(3)
  auth.currentUser={uid:'admin'}
 })
 it('reuses IGDB results without another API request',async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({images:[{id:'a',url:'https://img.test/a.png'}],games:[]})});vi.stubGlobal('fetch',fetchMock)
  await searchIgdbMedia('Unique test game');await searchIgdbMedia('Unique test game');expect(fetchMock).toHaveBeenCalledTimes(1);vi.unstubAllGlobals()
 })
})
