import { describe, expect, it } from 'vitest'
import { archiveXboxHistory, mergeXboxHistory } from './xboxHistory'
const game=id=>({id:String(id),title:'Game '+id,imageUrl:'https://example.com/'+id+'.png'})
const identity=(ids,score=10)=>({platform:'xbox',xuid:'2533274792093122',presence:{state:'offline'},featuredGames:ids.map(game),history:ids.map(id=>({game:game(id),at:'2026-10-26T10:00:00Z'})),gameAchievements:ids.map(id=>({game:game(id),at:'2026-10-26T10:00:00Z',unlocked:score,total:null,gamerscore:score,progress:null})),unavailable:[]})
const memoryStore=()=>{
 let data=null,etag=0,writes=0
 return {get writes(){return writes},get data(){return data},getWithMetadata:async()=>data?{data:structuredClone(data),etag:String(etag)}:null,setJSON:async(key,next,options)=>{if(options.onlyIfNew&&data || options.onlyIfMatch&&options.onlyIfMatch!==String(etag))return {modified:false};data=structuredClone(next);etag++;writes++;return {modified:true}}}
}
describe('persistent Xbox game history',()=>{
 it('accumulates distinct games and replaces a returning game with its new summary',()=>{
  const first=mergeXboxHistory(null,identity([1,2,3]))
  const next=mergeXboxHistory(first,identity([3,4,5],20))
  expect(next.history).toHaveLength(5);expect(next.gameAchievements).toHaveLength(5)
  expect(next.gameAchievements.find(e=>e.game.id==='3').unlocked).toBe(20)
  expect(next.gameAchievements.find(e=>e.game.id==='1').unlocked).toBe(10)
  expect(next).not.toHaveProperty('presence')
 })
 it('does not mix accounts or regress a later last-played record',()=>{
  const prior=mergeXboxHistory(null,identity([1],20));prior.history[0].at='2026-10-27T10:00:00Z'
  expect(mergeXboxHistory(prior,identity([1])).history[0].at).toBe('2026-10-27T10:00:00Z')
  expect(mergeXboxHistory({...prior,xuid:'another'},identity([2])).history.map(e=>e.game.id)).toEqual(['2'])
 })
 it('removes games the provider explicitly marks hidden',()=>{
  const result=mergeXboxHistory(mergeXboxHistory(null,identity([1,2])),identity([2,3]),['1'])
  for(const list of [result.history,result.gameAchievements])expect(list.some(e=>e.game.id==='1')).toBe(false)
  expect(result.featuredGames.some(g=>g.id==='1')).toBe(false)
 })
 it('writes only changed snapshots and retains games across later requests',async()=>{
  const store=memoryStore()
  await archiveXboxHistory(identity([1,2,3]),()=>store)
  await archiveXboxHistory(identity([1,2,3]),()=>store)
  expect(store.writes).toBe(1)
  const result=await archiveXboxHistory(identity([4,5,6]),()=>store)
  expect(result.history).toHaveLength(6);expect(result.archiveAvailable).toBe(true)
 })
 it('retries conditional conflicts without losing another request’s additions',async()=>{
  const store=memoryStore(),save=store.setJSON
  let conflict=true
  store.setJSON=async(...args)=>{if(conflict){conflict=false;await save('key',mergeXboxHistory(null,identity([9])),{onlyIfNew:true});return {modified:false}}return save(...args)}
  const result=await archiveXboxHistory(identity([1]),()=>store)
  expect(new Set(result.history.map(e=>e.game.id))).toEqual(new Set(['9','1']))
 })
 it('does not expose archived records when history is denied, and tolerates storage failures',async()=>{
  const denied={...identity([]),unavailable:['history']}
  expect(await archiveXboxHistory(denied,()=>{throw Error('Must not read')})).toEqual(denied)
  const fresh=identity([1])
  expect(await archiveXboxHistory(fresh,()=>{throw Error('Offline')})).toMatchObject({...fresh,archiveAvailable:false})
 })
})
