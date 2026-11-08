import { readFile } from 'node:fs/promises'
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createProgressService } from '../../netlify/functions/lib/progress-service.js'
const projectId = 'demo-galaxia-participation'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8055') throw new Error('Local demo emulator required')
let env, app, db
before(async()=>{
  env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8055,rules:await readFile(new URL('./firestore.participation.proposed.rules',import.meta.url),'utf8')}})
  await env.clearFirestore()
  app=initializeApp({projectId},'participation-tests')
  db=getFirestore(app)
  await db.doc('users/u').set({name:'Reader',email:'u@example.test',emailVerified:true,role:'user',stars:40,participationStars:9,readPostsCount:1,unlockedIcons:['old'],selectedIcon:'old'})
  await db.doc('users/admin').set({name:'Admin',role:'admin'})
  await db.doc('posts/news').set({status:'approved',visibility:'public',releaseAt:0,title:'News',starReward:999})
  await db.doc('profileIcons/custom').set({requiredStars:10,imageUrl:'https://example.test/icon.png',active:true,visible:true})
})
after(async()=>{await env?.cleanup();if(app)await deleteApp(app)})
test('clients cannot forge points, ownership, read records, sessions or selected icons',async()=>{
  const client=env.authenticatedContext('u',{email:'u@example.test',email_verified:true}).firestore()
  for(const data of [{stars:9000},{participationStars:9000},{unlockedIcons:['custom']},{selectedIcon:'custom'},{progressMigrationVersion:2}]) await assertFails(updateDoc(doc(client,'users/u'),data))
  await assertFails(setDoc(doc(client,'users/u/readPosts/news'),{stars:1}))
  await assertFails(setDoc(doc(client,'users/u/readingSessions/news'),{startedAt:0}))
  await assertFails(updateDoc(doc(client,'profileIcons/custom'),{requiredStars:0}))
  await assertSucceeds(updateDoc(doc(client,'users/u'),{description:'Still editable'}))
  await assertSucceeds(getDoc(doc(client,'profileIcons/custom')))
  const guest=env.unauthenticatedContext().firestore()
  await assertFails(updateDoc(doc(guest,'users/u'),{participationStars:100}))
  const admin=env.authenticatedContext('admin').firestore()
  await assertFails(updateDoc(doc(admin,'profileIcons/custom'),{requiredStars:0}))
})
test('real concurrent Firestore transactions reward only once and preserve permanent rights',async()=>{
  let time=100000
  const service=createProgressService(db,()=>time)
  await service('u',{action:'begin-read',postId:'news'})
  await assert.rejects(service('u',{action:'award-read',postId:'news'}),/reading-too-soon/)
  time+=30000
  const result=await Promise.all([service('u',{action:'award-read',postId:'news'}),service('u',{action:'award-read',postId:'news'})])
  assert.equal(result.filter(r=>r.awarded).length,1)
  const user=(await db.doc('users/u').get()).data()
  assert.equal(user.stars,40);assert.equal(user.participationStars,10);assert.ok(user.unlockedIcons.includes('old'));assert.ok(user.unlockedIcons.includes('custom'))
  await service('admin',{action:'update-icon',iconId:'custom',requiredStars:500,order:1,name:'Custom',src:'https://example.test/icon.png',active:false,visible:false})
  await service('u',{action:'equip',iconId:'custom'})
  assert.equal((await db.doc('users/u').get()).data().selectedIcon,'custom')
})
