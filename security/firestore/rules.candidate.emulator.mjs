// Requires the local emulator and isolated test dependencies. Never accesses the real Firebase project.
import { readFile } from 'node:fs/promises'
import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createImageMonitorService } from '../../netlify/functions/lib/image-monitor.js'
import { imageReferenceId } from '../../netlify/functions/lib/image-monitor-model.js'

const projectId = 'demo-galaxia-security'
if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== projectId) {
  throw new Error('Refusing to run with a non-demo Google Cloud project.')
}
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8055') {
  throw new Error('Refusing to run: start only the local demo emulator at 127.0.0.1:8055. No production access is permitted.')
}
const { initializeTestEnvironment, assertFails, assertSucceeds } = await import('@firebase/rules-unit-testing')
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } = await import('firebase/firestore')
let env
const adminApp = initializeApp({ projectId }, `image-monitor-emulator-${process.pid}`)
const adminDb = getFirestore(adminApp)
const user = uid => env.authenticatedContext(uid,{email:`${uid}@example.test`,email_verified:true}).firestore()
const guest = () => env.unauthenticatedContext().firestore()
const ref = (db,path) => doc(db,path)
const newUser = (uid,extra={}) => ({name:uid,email:`${uid}@example.test`,emailVerified:true,role:'user',stars:0,readPostsCount:0,unlockedIcons:['kirby-01'],selectedIcon:'kirby-01',...extra})
before(async()=>{
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8055,rules:await readFile(new URL('./firestore.candidate.review.rules',import.meta.url),'utf8')}})
})
beforeEach(async()=>{
 await env.clearFirestore()
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore()
  const docs={
   'users/alice':newUser('alice',{canChat:true}),'users/bob':newUser('bob',{canChat:true}),
   'users/admin':newUser('admin',{role:'admin'}),'users/publisher':newUser('publisher',{role:'publisher'}),
   'users/blocked':newUser('blocked',{role:'admin',isBlocked:true}),
   'posts/public':{authorId:'publisher',status:'approved',visibility:'public',releaseAt:0},
   'posts/private':{authorId:'publisher',status:'approved',visibility:'private',releaseAt:0},
   'posts/draft':{authorId:'publisher',status:'draft'},
   'posts/unlisted':{authorId:'publisher',status:'approved',visibility:'unlisted',releaseAt:0},
   'posts/future':{authorId:'publisher',status:'approved',visibility:'public',releaseAt:Date.now()+86400000},
   'sitePages/public':{status:'published',visibility:'public'},'sitePages/draft':{status:'draft'},
   'communities/club':{name:'club'},'communities/galaxia-oficial':{isOfficial:true,lockedMembership:true,adminOnlyThreads:true},
   'communities/club/members/alice':{userId:'alice'},
   'communityThreads/thread':{authorId:'alice',communityId:'club',likes:0,likedBy:[],comments:[],replies:0},
   'galaxyEvents/event':{createdBy:'publisher',notifyBy:[]},
   'directChats/chat':{participants:['alice','bob']},
   'directChats/chat/messages/msg':{authorId:'bob',body:'hello',readBy:{bob:true}},
   'overlays/admin/items/scene':{name:'OBS fixture',widgets:[],width:1080,height:1920},
   'users/alice/notifications/n':{read:false},'users/alice/readPosts/public':{stars:5},
   'siteConfig/profileAchievements':{items:[]},'siteSettings/postCategories':{items:[]},
   'profileIcons/kirby-01':{cost:0},'liveChats/galaxia-oficial':{active:true},
   'liveGoals/goal':{type:'likes',likesBy:{},likerProfiles:{}},
   'ruzafaPrinterProducts/p':{name:'Local test product'},'publicProfiles/alice':{name:'Alice'}
   ,'imageReferences/ref':{ownerType:'post',ownerId:'public',fieldKey:'hero.image',originalUrl:'https://example.test/a.jpg',availability:'unverified',adminState:'active'}
   ,'imageIncidents/incident':{referenceId:'ref',referenceVersion:1,reason:'reported',adminState:'open'}
   ,'imageHistory/history':{referenceId:'ref',operationId:'operation_0001',kind:'registered',actorUid:'admin',at:1}
  }
  for(const [path,data] of Object.entries(docs))await setDoc(ref(db,path),data)
 })
})
after(async()=>{await env?.cleanup();await deleteApp(adminApp)})

test('visitor cannot read private users or write private data',async()=>{
 await assertFails(getDoc(ref(guest(),'users/alice')))
 await assertFails(setDoc(ref(guest(),'users/alice'),{role:'admin'}))
})
test('only an active administrator can read monitor collections and all client writes are denied',async()=>{
 for(const path of ['imageReferences/ref','imageIncidents/incident','imageHistory/history']) {
  await assertSucceeds(getDoc(ref(user('admin'),path)))
  await assertFails(getDoc(ref(guest(),path)))
  await assertFails(getDoc(ref(user('alice'),path)))
  await assertFails(getDoc(ref(user('publisher'),path)))
  await assertFails(getDoc(ref(user('blocked'),path)))
  const collectionName=path.split('/')[0]
  await assertSucceeds(getDocs(collection(user('admin'),collectionName)))
  await assertFails(getDocs(collection(user('publisher'),collectionName)))
  await assertFails(setDoc(ref(user('admin'),`${collectionName}/client-create`),{value:'forged'}))
  await assertFails(updateDoc(ref(user('admin'),path),{value:'forged'}))
  await assertFails(deleteDoc(ref(user('admin'),path)))
  await assertFails(setDoc(ref(user('publisher'),`${collectionName}/publisher-create`),{value:'forged'}))
  for(const clientDb of [guest(),user('alice'),user('blocked')]) {
   await assertFails(setDoc(ref(clientDb,`${collectionName}/unprivileged-create`),{value:'forged'}))
   await assertFails(updateDoc(ref(clientDb,path),{value:'forged'}))
   await assertFails(deleteDoc(ref(clientDb,path)))
  }
 }
})
test('authenticated backend transaction synchronizes saved media and incident actions in the isolated emulator',async()=>{
 const service=createImageMonitorService(adminDb,()=>1234)
 const slot='backend_slot_0001'
 const operation='backend_operation_01'
 const ownerRef=adminDb.doc('posts/monitor-integration')
 await ownerRef.set({authorId:'publisher',updatedAt:40,sections:[{mediaSlotId:slot,image:'https://example.test/first.jpg'}]})
 const result=await service('publisher',{action:'sync',ownerType:'post',ownerId:'monitor-integration',operationId:operation,expectedUpdatedAt:40,fields:[{fieldKey:'sections',mediaSlotId:slot}]})
 const referenceId=imageReferenceId('post','monitor-integration','sections',slot)
 assert.equal(result.changes.length,1)
 let reference=(await adminDb.doc(`imageReferences/${referenceId}`).get()).data()
 assert.equal(reference.availability,'unverified')
 assert.equal(reference.referenceVersion,1)
 await ownerRef.set({authorId:'publisher',updatedAt:41,sections:[{mediaSlotId:slot,image:'https://example.test/second.jpg'}]})
 await service('publisher',{action:'sync',ownerType:'post',ownerId:'monitor-integration',operationId:'backend_operation_02',expectedUpdatedAt:41,fields:[{fieldKey:'sections',mediaSlotId:slot}]})
 reference=(await adminDb.doc(`imageReferences/${referenceId}`).get()).data()
 assert.equal(reference.referenceVersion,2)
 assert.equal(reference.originalUrl,'https://example.test/second.jpg')
 const incident=await service('admin',{action:'open-incident',referenceId,referenceVersion:2,reason:'Emulator review',operationId:'backend_incident_01'})
 await service('admin',{action:'note',referenceId,incidentId:incident.incidentId,note:'Checked in isolated emulator',operationId:'backend_note_0001'})
 await service('admin',{action:'transition-incident',incidentId:incident.incidentId,adminState:'resolved',operationId:'backend_resolve_01'})
 assert.equal((await adminDb.doc(`imageIncidents/${incident.incidentId}`).get()).data().adminState,'resolved')
 const history=await adminDb.collection('imageHistory').get()
 assert.equal(history.size,6) // Includes the fixed setup history fixture.
})
test('registration creates only an ordinary zero-balance account',async()=>{
 await assertSucceeds(setDoc(ref(user('new'),'users/new'),newUser('new')))
 await assertFails(setDoc(ref(user('evil'),'users/evil'),newUser('evil',{role:'admin'})))
 await assertFails(setDoc(ref(user('rich'),'users/rich'),newUser('rich',{stars:100000})))
 await assertFails(setDoc(ref(user('chat'),'users/chat'),newUser('chat',{canChat:true})))
})
test('authenticated account without profile cannot use admin routes before registration',async()=>{
 await assertFails(setDoc(ref(user('new'),'siteSettings/postCategories'),{items:[]}))
 await assertSucceeds(setDoc(ref(user('new'),'users/new'),newUser('new')))
 await assertFails(setDoc(ref(user('new'),'siteSettings/postCategories'),{items:[]}))
})
test('owner cannot elevate role, unblock, grant chat or forge verification',async()=>{
 for(const data of [{role:'admin'},{canChat:false},{isBlocked:false},{emailVerified:false},{email:'other@example.test'},{adminCreated:true}])
  await assertFails(updateDoc(ref(user('alice'),'users/alice'),data))
 await assertFails(deleteDoc(ref(user('alice'),'users/alice')))
})
test('owner cannot change financial progress, even paired with a read marker',async()=>{
 for(const data of [{stars:123},{readPostsCount:999},{unlockedIcons:['legendary']},{followersCount:999}])
  await assertFails(updateDoc(ref(user('alice'),'users/alice'),data))
 await assertFails(setDoc(ref(user('alice'),'users/alice/readPosts/other'),{stars:500}))
})
test('owner can edit safe profile fields but cannot alter another user',async()=>{
 await assertSucceeds(updateDoc(ref(user('alice'),'users/alice'),{name:'Alice edited',description:'Hello',isOnline:true}))
 await assertFails(updateDoc(ref(user('alice'),'users/bob'),{name:'Hijacked'}))
 await assertFails(getDocs(collection(user('alice'),'users')))
})
test('verified existing administrator may manage users; blocked admin may not',async()=>{
 await assertSucceeds(updateDoc(ref(user('admin'),'users/alice'),{name:'Admin edited name'}))
 for(const data of [{role:'publisher'},{isBlocked:true},{canChat:false},{stars:999},{emailVerified:false},{email:'forged@example.test'}])
  await assertFails(updateDoc(ref(user('admin'),'users/alice'),data))
 await assertSucceeds(getDocs(collection(user('admin'),'users')))
 await assertFails(updateDoc(ref(user('blocked'),'users/alice'),{role:'admin'}))
 await assertFails(updateDoc(ref(user('publisher'),'users/alice'),{role:'admin'}))
 await assertFails(setDoc(ref(user('admin'),'users/new-admin'),newUser('new-admin',{role:'admin'})))
})
test('administrator cannot edit protected account fields outside role endpoint',async()=>{
 for(const data of [{role:'admin'},{canChat:false},{isBlocked:true},{stars:100},{unlockedIcons:['legendary']},{readPostsCount:999}])
  await assertFails(updateDoc(ref(user('admin'),'users/publisher'),data))
})
test('public posts exclude drafts, private content, future releases and unfiltered queries',async()=>{
 await assertSucceeds(getDoc(ref(guest(),'posts/public')))
 await assertSucceeds(getDoc(ref(guest(),'posts/unlisted')))
 for(const id of ['draft','private','future'])await assertFails(getDoc(ref(guest(),`posts/${id}`)))
 await assertFails(getDocs(collection(guest(),'posts')))
 const result=await assertSucceeds(getDocs(query(collection(guest(),'posts'),where('status','==','approved'),where('visibility','==','public'),where('releaseAt','<=',Date.now()))))
 assert.equal(result.docs.length,1)
})
test('post with valid numeric releaseAt supports public get and filtered list',async()=>{
 const result=await assertSucceeds(getDoc(ref(guest(),'posts/public')))
 assert.equal(result.data().releaseAt,0)
 const list=await assertSucceeds(getDocs(query(collection(guest(),'posts'),where('status','==','approved'),where('visibility','==','public'),where('releaseAt','<=',Date.now()))))
 assert.deepEqual(list.docs.map(item=>item.id),['public'])
})
test('future release remains unavailable by get and future-bounded list',async()=>{
 await assertFails(getDoc(ref(guest(),'posts/future')))
 await assertFails(getDocs(query(collection(guest(),'posts'),where('status','==','approved'),where('visibility','==','public'),where('releaseAt','<=',Date.now()+172800000))))
})
test('text releaseAt is denied rather than treated as a numeric date',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(ref(context.firestore(),'posts/text-date'),{authorId:'publisher',status:'approved',visibility:'public',releaseAt:'0'})
 })
 await assertFails(getDoc(ref(guest(),'posts/text-date')))
})
test('missing releaseAt uses the existing zero fallback for get but is absent from filtered list',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(ref(context.firestore(),'posts/no-release'),{authorId:'publisher',status:'approved',visibility:'public'})
 })
 await assertSucceeds(getDoc(ref(guest(),'posts/no-release')))
 const list=await assertSucceeds(getDocs(query(collection(guest(),'posts'),where('status','==','approved'),where('visibility','==','public'),where('releaseAt','<=',Date.now()))))
 assert.deepEqual(list.docs.map(item=>item.id),['public'])
})
test('legacy scheduledAt remains readable by get but is absent from releaseAt list',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(ref(context.firestore(),'posts/legacy-date'),{authorId:'publisher',status:'approved',visibility:'public',scheduledAt:0})
 })
 await assertSucceeds(getDoc(ref(guest(),'posts/legacy-date')))
 const list=await assertSucceeds(getDocs(query(collection(guest(),'posts'),where('status','==','approved'),where('visibility','==','public'),where('releaseAt','<=',Date.now()))))
 assert.deepEqual(list.docs.map(item=>item.id),['public'])
})
test('private post remains denied by get and private-visibility list',async()=>{
 await assertFails(getDoc(ref(guest(),'posts/private')))
 await assertFails(getDocs(query(collection(guest(),'posts'),where('status','==','approved'),where('visibility','==','private'),where('releaseAt','<=',Date.now()))))
})
test('draft remains denied by get and draft-status list',async()=>{
 await assertFails(getDoc(ref(guest(),'posts/draft')))
 await assertFails(getDocs(query(collection(guest(),'posts'),where('status','==','draft'),where('visibility','==','public'),where('releaseAt','<=',Date.now()))))
})
test('publisher writes own pending draft; only administrator approves',async()=>{
 await assertSucceeds(setDoc(ref(user('publisher'),'posts/new'),{authorId:'publisher',status:'pending',title:'Draft'}))
 await assertFails(setDoc(ref(user('alice'),'posts/spam'),{authorId:'alice',status:'pending'}))
 await assertFails(updateDoc(ref(user('publisher'),'posts/draft'),{status:'approved'}))
 await assertFails(updateDoc(ref(user('publisher'),'posts/public'),{starReward:999}))
 await assertSucceeds(updateDoc(ref(user('admin'),'posts/draft'),{status:'approved'}))
})
test('published pages remain readable; unpublished pages and unfiltered footer query are denied',async()=>{
 await assertSucceeds(getDoc(ref(guest(),'sitePages/public')))
 await assertFails(getDoc(ref(guest(),'sitePages/draft')))
 await assertSucceeds(setDoc(ref(user('publisher'),'sitePages/new'),{status:'draft'}))
})
test('public configuration and icons remain readable; management is restricted',async()=>{
 for(const path of ['siteConfig/profileAchievements','siteSettings/postCategories','profileIcons/kirby-01','publicProfiles/alice','ruzafaPrinterProducts/p'])await assertSucceeds(getDoc(ref(guest(),path)))
 for(const path of ['siteConfig/profileAchievements','profileIcons/kirby-01']){
  await assertFails(setDoc(ref(user('alice'),path),{items:[]}));await assertFails(setDoc(ref(user('admin'),path),{items:[]}))
 }
 await assertFails(setDoc(ref(user('alice'),'siteSettings/postCategories'),{items:[]}))
 await assertSucceeds(setDoc(ref(user('admin'),'siteSettings/postCategories'),{items:[]}))
})
test('OBS exact public scene listener remains readable; listing and writes are restricted',async()=>{
 await assertSucceeds(getDoc(ref(guest(),'overlays/admin/items/scene')))
 await assertFails(getDocs(collection(guest(),'overlays/admin/items')))
 await assertFails(updateDoc(ref(user('alice'),'overlays/admin/items/scene'),{widgets:[]}))
 await assertFails(updateDoc(ref(user('publisher'),'overlays/admin/items/scene'),{widgets:[]}))
 await assertSucceeds(updateDoc(ref(user('admin'),'overlays/admin/items/scene'),{name:'Changed by owner'}))
 await assertSucceeds(getDocs(collection(user('admin'),'overlays/admin/items')))
})
test('private chats require participant identity and chat permission',async()=>{
 await assertSucceeds(getDoc(ref(user('alice'),'directChats/chat/messages/msg')))
 await assertFails(getDoc(ref(guest(),'directChats/chat/messages/msg')))
 await assertFails(getDoc(ref(user('publisher'),'directChats/chat/messages/msg')))
 await assertFails(updateDoc(ref(user('alice'),'directChats/chat'),{participants:['alice','publisher']}))
 await assertFails(setDoc(ref(user('alice'),'directChats/chat/messages/forged'),{authorId:'bob',body:'Forged'}))
 await assertSucceeds(setDoc(ref(user('alice'),'directChats/chat/messages/new'),{authorId:'alice',body:'Hello'}))
 await assertSucceeds(getDocs(query(collection(user('alice'),'directChats'),where('participants','array-contains','alice'))))
})
test('chat read and hiding maps permit only the caller key',async()=>{
 await assertSucceeds(updateDoc(ref(user('alice'),'directChats/chat/messages/msg'),{'readBy.alice':true}))
 await assertFails(updateDoc(ref(user('alice'),'directChats/chat/messages/msg'),{'readBy.bob':false}))
 await assertSucceeds(updateDoc(ref(user('alice'),'directChats/chat'),{'hiddenBefore.alice':100}))
 await assertFails(updateDoc(ref(user('alice'),'directChats/chat'),{'hiddenBefore.bob':100}))
 await assertFails(updateDoc(ref(user('alice'),'directChats/chat'),{lastMessagePreview:'Forged summary'}))
})
test('notifications are private and recipient can mark only read',async()=>{
 await assertFails(getDoc(ref(user('bob'),'users/alice/notifications/n')))
 await assertSucceeds(updateDoc(ref(user('alice'),'users/alice/notifications/n'),{read:true}))
 await assertFails(updateDoc(ref(user('alice'),'users/alice/notifications/n'),{title:'Forged'}))
 await assertFails(setDoc(ref(user('bob'),'users/alice/notifications/spam'),{read:false}))
 await assertSucceeds(setDoc(ref(user('admin'),'users/alice/notifications/admin'),{read:false}))
})
test('community roles and official publishing cannot be self-granted',async()=>{
 await assertFails(setDoc(ref(user('alice'),'users/alice/communities/club'),{communityId:'club',role:'Admin'}))
 await assertFails(setDoc(ref(user('alice'),'communities/galaxia-oficial/members/alice'),{userId:'alice'}))
 await assertSucceeds(setDoc(ref(user('alice'),'users/alice/communities/club'),{communityId:'club',role:'Miembro'}))
 await assertFails(updateDoc(ref(user('alice'),'communities/club'),{membersCount:999}))
 const thread={authorId:'alice',communityId:'club',likes:0,replies:0,likedBy:[],comments:[]}
 await assertSucceeds(setDoc(ref(user('alice'),'communityThreads/new'),thread))
 await assertFails(setDoc(ref(user('bob'),'communityThreads/fake'),{...thread,authorId:'bob'}))
 await assertFails(setDoc(ref(user('alice'),'communityThreads/official'),{...thread,communityId:'galaxia-oficial',isOfficial:true,lockedThread:true}))
})
test('likes can change only the caller membership and matching count',async()=>{
 await assertSucceeds(updateDoc(ref(user('bob'),'communityThreads/thread'),{likedBy:['bob'],likes:1}))
 await assertFails(updateDoc(ref(user('alice'),'communityThreads/thread'),{likedBy:['alice','forged'],likes:2}))
 await assertFails(updateDoc(ref(user('bob'),'communityThreads/thread'),{likedBy:['bob'],likes:999}))
})
test('comments append authentic authors without changing previous content',async()=>{
 const comment={id:'c',authorId:'bob',body:'Reply',createdAt:1}
 await assertSucceeds(updateDoc(ref(user('bob'),'communityThreads/thread'),{comments:[comment],replies:1}))
 await assertFails(updateDoc(ref(user('alice'),'communityThreads/thread'),{comments:[{...comment,body:'Hijacked'}],replies:1}))
 await assertFails(updateDoc(ref(user('alice'),'communityThreads/thread'),{comments:[comment,{id:'f',authorId:'bob',body:'Forged'}],replies:2}))
})
test('event subscription toggles caller only; event administration requires publisher',async()=>{
 await assertSucceeds(updateDoc(ref(user('alice'),'galaxyEvents/event'),{notifyBy:['alice']}))
 await assertFails(updateDoc(ref(user('alice'),'galaxyEvents/event'),{notifyBy:['alice','bob']}))
 await assertFails(updateDoc(ref(user('alice'),'galaxyEvents/event'),{title:'Hijacked'}))
 await assertSucceeds(updateDoc(ref(user('publisher'),'galaxyEvents/event'),{title:'Authorized'}))
})
test('live goals constrain own count but do not claim proof of real engagement',async()=>{
 await assertSucceeds(updateDoc(ref(user('alice'),'liveGoals/goal'),{likesBy:{alice:1},likerProfiles:{alice:{name:'Alice'}}}))
 await assertFails(updateDoc(ref(user('bob'),'liveGoals/goal'),{likesBy:{alice:100,bob:1}}))
 await assertFails(updateDoc(ref(user('alice'),'liveGoals/goal'),{likesBy:{alice:500}}))
})
test('live messages require active session and chat grant; cannot alter live settings',async()=>{
 await assertSucceeds(setDoc(ref(user('alice'),'liveChats/galaxia-oficial/messages/new'),{authorId:'alice',body:'Hello',createdAt:1}))
 await assertFails(updateDoc(ref(user('alice'),'liveChats/galaxia-oficial'),{active:true}))
 await assertFails(setDoc(ref(guest(),'liveChats/galaxia-oficial/messages/guest'),{authorId:'guest',body:'Spam'}))
})
test('video messages enforce author identity; embedded replies remain pending migration',async()=>{
 const db=user('alice')
 await assertSucceeds(setDoc(ref(db,'videoChats/video/messages/new'),{authorId:'alice',body:'Hello'}))
 await assertFails(setDoc(ref(db,'videoChats/video/messages/fake'),{authorId:'bob',body:'Forged'}))
 await assertFails(updateDoc(ref(user('bob'),'videoChats/video/messages/new'),{replies:[{authorId:'alice',body:'Forged'}]}))
})
test('printer writes need admin; mail queue and unknown collections remain private',async()=>{
 for(const path of ['ruzafaPrinterProducts/new','ruzafaPrinterHistory/new','mailQueue/new']){
  await assertFails(setDoc(ref(guest(),path),{value:'test'}));await assertSucceeds(setDoc(ref(user('admin'),path),{value:'test'}))
 }
 for(const path of ['unknown/test','unregisteredCatalog/test','unregisteredRewards/test']){
  await assertFails(setDoc(ref(user('admin'),path),{name:'Disabled'}));await assertFails(getDoc(ref(guest(),path)))
 }
})

// Regression cases copied from actual client operations. A denial here is an
// identified compatibility gap, never a claim that the user flow works.
test('public collection queries for events and communities remain available',async()=>{
 await assertSucceeds(getDocs(collection(guest(),'galaxyEvents')))
 await assertSucceeds(getDocs(collection(guest(),'communities')))
 await assertSucceeds(getDocs(collection(guest(),'communityThreads')))
})
test('public profile projection is readable but ordinary user cannot forge it',async()=>{
 await assertSucceeds(getDoc(ref(guest(),'publicProfiles/alice')))
 await assertFails(setDoc(ref(user('alice'),'publicProfiles/alice'),{name:'Impersonated'}))
 await assertFails(setDoc(ref(user('admin'),'publicProfiles/alice'),{name:'Alice',email:'private@example.test'}))
})
test('ordinary and blocked accounts cannot use privileged role-dependent paths',async()=>{
 await assertFails(setDoc(ref(user('alice'),'siteSettings/postCategories'),{items:[]}))
 await assertFails(setDoc(ref(user('blocked'),'siteSettings/postCategories'),{items:[]}))
 await assertFails(getDocs(collection(user('blocked'),'users')))
 await assertFails(setDoc(ref(user('blocked'),'posts/blocked'),{authorId:'blocked',status:'pending'}))
})
test('scheduled legacy post is readable by exact id but missing canonical releaseAt prevents a list query',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(ref(context.firestore(),'posts/legacy'),{authorId:'publisher',status:'approved',visibility:'public',scheduledAt:0})
 })
 await assertSucceeds(getDoc(ref(guest(),'posts/legacy')))
 await assertFails(getDocs(collection(guest(),'posts')))
})
test('guest cannot list private users; admin direct profile projection writes stay denied',async()=>{
 await assertFails(getDocs(collection(guest(),'users')))
 await assertFails(setDoc(ref(user('admin'),'publicProfiles/new'),{name:'Alice'}))
})
test('membership documents can be joined but community counter cannot be forged',async()=>{
 const db=user('bob'), now=Date.now()
 await assertSucceeds(setDoc(ref(db,'users/bob/communities/club'),{communityId:'club',name:'club',description:'',bannerUrl:'',iconUrl:'',role:'Miembro',joinedAt:now,updatedAt:now}))
 await assertSucceeds(setDoc(ref(db,'communities/club/members/bob'),{userId:'bob',name:'bob',imageUrl:'',joinedAt:now}))
 await assertFails(updateDoc(ref(db,'communities/club'),{membersCount:999,updatedAt:now}))
})
test('real chat summary write is denied pending bounded-message validation',async()=>{
 const db=user('alice')
 await assertSucceeds(setDoc(ref(db,'directChats/chat/messages/new'),{authorId:'alice',body:'Hola',authorName:'Alice',createdAt:Date.now()}))
 await assertFails(setDoc(ref(db,'directChats/chat'),{participants:['alice','bob'],lastMessage:'Hola',lastMessageId:'new',lastMessageAuthorId:'alice',updatedAt:Date.now()},{merge:true}))
 await assertSucceeds(setDoc(ref(db,'directChats/chat'),{hiddenBefore:{alice:Date.now()}},{merge:true}))
})
test('published page footer query needs status and visibility constraints',async()=>{
 await assertFails(getDocs(query(collection(guest(),'sitePages'),where('showInFooter','==',true))))
 await assertSucceeds(getDoc(ref(guest(),'sitePages/public')))
})
test('overlay viewer may read exact scene but cannot enumerate or modify it',async()=>{
 await assertSucceeds(getDoc(ref(guest(),'overlays/admin/items/scene')))
 await assertFails(getDocs(collection(guest(),'overlays/admin/items')))
 await assertFails(setDoc(ref(guest(),'overlays/admin/items/scene'),{widgets:[]}))
})
