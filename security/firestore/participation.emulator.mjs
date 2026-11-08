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
  const fragment=await readFile(new URL('./progress.fragment.rules',import.meta.url),'utf8')
  // Test-only baseline: verifies the scoped delta without deploying the older,
  // unrelated full proposal. Production rules still need a verified export.
  const rules=`rules_version = '2'; service cloud.firestore { match /databases/{database}/documents {
    ${fragment}
    match /users/{uid} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == uid && progressSafeProfileCreate();
      allow update: if request.auth != null && (request.auth.uid == uid || progressAdmin()) && progressSafeProfileUpdate();
      allow delete: if progressAdmin();
    }
    match /users/{uid}/readPosts/{postId} { allow read: if request.auth != null && (request.auth.uid == uid || progressAdmin()); }
    match /posts/{id} { allow read: if true; }
    match /communities/{id} { allow read: if true; }
    match /events/{id} { allow read: if true; }
    match /liveChats/{id}/messages/{messageId} { allow read: if true; }
  } }`
  env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8055,rules}})
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
  await assertFails(setDoc(doc(client,'siteConfig/profileAchievements'),{items:[]}))
  await assertFails(updateDoc(doc(client,'users/u'),{role:'admin'}))
  const newcomer=env.authenticatedContext('new').firestore()
  await assertFails(setDoc(doc(newcomer,'users/new'),{name:'New',role:'admin',participationStars:100}))
  await assertSucceeds(setDoc(doc(newcomer,'users/new'),{name:'New',role:'user',stars:0,selectedIcon:'kirby-01',unlockedIcons:['kirby-01']}))
  await assertSucceeds(getDoc(doc(client,'posts/news')))
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
  await assert.rejects(service('u',{action:'create-icon',iconId:'custom-illegal'}),/forbidden/)
  await service('admin',{action:'create-icon',iconId:'custom-unused',requiredStars:500,order:2,name:'Unused',src:'https://example.test/unused.png',active:true,visible:true})
  await service('admin',{action:'delete-icon',iconId:'custom-unused'})
  assert.equal((await db.doc('profileIcons/custom-unused').get()).exists,false)
  await assert.rejects(service('admin',{action:'delete-icon',iconId:'custom'}),/icon-in-use/)
  await service('admin',{action:'save-achievements',items:[{id:'read-10',label:'Reader',description:'Read ten',type:'reads',target:10,iconUrl:''}]})
  assert.equal((await db.doc('siteConfig/profileAchievements').get()).data().items[0].target,10)
})
