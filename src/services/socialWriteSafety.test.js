import { beforeEach, it, expect, vi } from 'vitest'
const state=vi.hoisted(()=>({user:{uid:'alice'},sets:[],updates:[],deletes:[],commits:0,member:false,locked:false}))
vi.mock('@/firebase',()=>({db:{},auth:{get currentUser(){return state.user}}}))
vi.mock('firebase/firestore',()=>({
  collection:(_db,...parts)=>parts.join('/'),
  doc:(db,...parts)=>{const path=typeof db==='string'?db+'/message':parts.join('/');return {path,id:path.split('/').at(-1)}},
  serverTimestamp:()=> 'SERVER_TIME',
  writeBatch:()=>({set:(...args)=>state.sets.push(args),commit:async()=>state.commits++}),
  runTransaction:async(_db,fn)=>fn({get:async ref=>({exists:()=>ref.path.includes('/members/')?state.member:true,data:()=>({name:'Club',membersCount:state.member?1:0,lockedMembership:state.locked})}),set:(...args)=>state.sets.push(args),update:(...args)=>state.updates.push(args),delete:ref=>state.deletes.push(ref)})
}))
import { sendDirectMessage, sendLiveChatMessage } from './directMessage'
import { changeCommunityMembership } from './communityMembership'
beforeEach(()=>Object.assign(state,{user:{uid:'alice'},sets:[],updates:[],deletes:[],commits:0,member:false,locked:false}))
it('real client sender batches the direct message with the exact referenced preview and own receipt',async()=>{
  await sendDirectMessage('bob',{body:'Hello',name:'Alice'})
  expect(state.commits).toBe(1)
  expect(state.sets).toHaveLength(2)
  expect(state.sets[0][0].path).toBe('directChats/alice_bob/messages/message')
  expect(state.sets[0][1]).toMatchObject({body:'Hello',authorId:'alice',createdAt:'SERVER_TIME'})
  expect(state.sets[1][1]).toMatchObject({participants:['alice','bob'],lastMessageId:'message',lastMessageAuthorId:'alice',lastReadBy:{alice:'message'}})
})
it('real live sender commits a verifiable message reference in the same batch',async()=>{
  await sendLiveChatMessage('live',{body:'Hello'})
  expect(state.commits).toBe(1)
  expect(state.sets[1][1].lastMessageId).toBe('message')
  expect(state.sets[1][1].lastMessagePreview).toBe(state.sets[0][1].body)
})
it('membership joins are idempotent and the counter cannot be incremented twice',async()=>{
  await changeCommunityMembership({id:'club'},true)
  expect(state.updates[0][1].membersCount).toBe(1)
  state.member=true;state.updates=[]
  await changeCommunityMembership({id:'club'},true)
  expect(state.updates).toEqual([])
})
it('locked/official enrollment and unauthenticated social writes fail before writing',async()=>{
  await expect(changeCommunityMembership({id:'galaxia-oficial'},true)).rejects.toThrow('locked-community')
  state.user=null
  await expect(sendDirectMessage('bob',{body:'Hello'})).rejects.toThrow('invalid-participants')
  expect(state.sets).toEqual([])
})
