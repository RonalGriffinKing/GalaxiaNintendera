import { describe, it, expect, beforeEach } from 'vitest'
import { createProgressHandler } from './profile-progress.js'
import { createProgressService } from './lib/progress-service.js'
// In-memory transactional adapter: enforces reads-before-writes and atomic rollback.
function store(seed) {
  const data = structuredClone(seed)
  const doc = path => ({path, id:path.split('/').at(-1)})
  const collection = path => ({path, collection:true, limit(n){return {...this,max:n}}})
  let queue = Promise.resolve()
  return {data,doc,collection,runTransaction(fn){
    const run=queue.then(async()=>{
      const pending=[]
      const result=await fn({
        async get(ref){
          if(pending.length)throw new Error('read-after-write')
          if(ref.collection)return {docs:Object.keys(data).filter(p=>p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1).slice(0,ref.max).map(p=>({id:doc(p).id,ref:doc(p),exists:true,data:()=>structuredClone(data[p])}))}
          return {exists:ref.path in data, data:()=>structuredClone(data[ref.path])}
        },set(ref,value,options){pending.push(()=>{data[ref.path]=options?.merge?{...data[ref.path],...value}:value})},update(ref,value){pending.push(()=>{data[ref.path]={...data[ref.path],...value}})},delete(ref){pending.push(()=>delete data[ref.path])}
      })
      pending.forEach(write=>write());return result
    })
    queue=run.catch(()=>{});return run
  }}
}
describe('verified participation service',()=>{
  let db,service,time
  beforeEach(()=>{
    time=100000
    db=store({'users/u':{stars:40,readPostsCount:7,unlockedIcons:['old'],participationStars:9},'users/admin':{role:'admin'},'posts/news':{status:'approved',visibility:'public',title:'News',starReward:999,rewardMultiplier:99},'profileIcons/custom':{requiredStars:10,imageUrl:'https://example.test/icon.png',visible:true,active:true}})
    service=createProgressService(db,()=>time)
  })
  it('awards exactly one future star, ignores browser reward data, keeps legacy balance and historical reads',async()=>{
    await service('u',{action:'begin-read',postId:'news'})
    time+=30000
    const result=await service('u',{action:'award-read',postId:'news',stars:10000,userId:'admin'})
    expect(result).toMatchObject({awarded:true,awardedStars:1,participationStars:10,readPostsCount:8})
    expect(db.data['users/u'].stars).toBe(40)
    expect(result.unlockedIcons).toContain('old');expect(result.unlockedIcons).toContain('custom')
    expect(db.data['users/u/readPosts/news']).toMatchObject({stars:1,progressVersion:2})
    const duplicates=await Promise.all([service('u',{action:'award-read',postId:'news'}),service('u',{action:'award-read',postId:'news'})])
    expect(duplicates.every(r=>r.awarded===false)).toBe(true);expect(db.data['users/u'].participationStars).toBe(10)
  })
  it('never re-rewards an old read or changes its original amount',async()=>{
    db.data['users/u/readPosts/news']={stars:90,readAt:42}
    expect(await service('u',{action:'award-read',postId:'news'})).toEqual({awarded:false})
    expect(db.data['users/u/readPosts/news']).toEqual({stars:90,readAt:42})
  })
  it('enforces server elapsed time and rejects missing sessions, blocked users and unavailable posts',async()=>{
    await expect(service('u',{action:'award-read',postId:'news'})).rejects.toThrow('reading-too-soon')
    await service('u',{action:'begin-read',postId:'news'})
    await expect(service('u',{action:'award-read',postId:'news',startedAt:0})).rejects.toThrow('reading-too-soon')
    db.data['posts/news'].visibility='private'
    await expect(service('u',{action:'begin-read',postId:'news'})).rejects.toThrow('unavailable-post')
    db.data['users/u'].isBlocked=true
    await expect(service('u',{action:'sync'})).rejects.toThrow('forbidden')
  })
  it('checks persisted stars for selection and never charges, including grandfathered unavailable icons',async()=>{
    await expect(service('u',{action:'equip',iconId:'custom',participationStars:100})).rejects.toThrow('locked-icon')
    db.data['users/u'].unlockedIcons.push('custom');db.data['profileIcons/custom'].active=false
    expect(await service('u',{action:'equip',iconId:'custom'})).toMatchObject({selectedIcon:'custom',selectedIconUrl:'https://example.test/icon.png'})
    expect(db.data['users/u'].stars).toBe(40)
  })
  it('freezes existing eligibility atomically before raising requirements or hiding icons',async()=>{
    db.data['users/u'].participationStars=10
    const body={action:'update-icon',iconId:'custom',name:'Custom',src:'https://example.test/icon.png',order:3,requiredStars:100,visible:true,active:true}
    await expect(service('u',body)).rejects.toThrow('forbidden')
    await service('admin',body)
    expect(db.data['users/u'].unlockedIcons).toContain('custom')
    expect(db.data['profileIcons/custom'].requiredStars).toBe(100)
    await service('u',{action:'equip',iconId:'custom'})
  })
  it('rejects malformed configuration without writes',async()=>{
    const before=JSON.stringify(db.data)
    await expect(service('admin',{action:'update-icon',iconId:'custom',requiredStars:-1})).rejects.toThrow('invalid-stars')
    expect(JSON.stringify(db.data)).toBe(before)
  })
})
describe('HTTP authentication boundary',()=>{
  const event={httpMethod:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({action:'sync',userId:'victim'})}
  it('derives identity exclusively from verified tokens',async()=>{
    let received
    const handler=createProgressHandler({enabled:()=>true,verify:async()=>({uid:'owner'}),service:async(uid)=>{received=uid;return {ok:true}}})
    expect((await handler(event)).statusCode).toBe(200);expect(received).toBe('owner')
  })
  it('fails closed when disabled, unauthenticated or token verification fails',async()=>{
    let calls=0
    const handler=createProgressHandler({enabled:()=>true,verify:async()=>{throw Error()},service:async()=>calls++})
    expect((await handler(event)).statusCode).toBe(401)
    expect((await handler({...event,headers:{}})).statusCode).toBe(401)
    expect((await createProgressHandler({enabled:()=>false})(event)).statusCode).toBe(503)
    expect(calls).toBe(0)
  })
})
