// Exact permanent candidate, demo project ONLY. No production credentials or data.
import { readFile } from 'node:fs/promises'
import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, collection, getDoc, getDocs, getCountFromServer, onSnapshot, limit, setDoc, updateDoc, deleteDoc, query, where, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage, getDownloadURL } from 'firebase-admin/storage'
import { createIconImageUploader } from '../../netlify/functions/lib/icon-image.js'
import identities from '../authorized-identities.json' with {type:'json'}
import { createPublicContentHandler } from '../../netlify/functions/lib/public-content.js'
import { createProgressService } from '../../netlify/functions/lib/progress-service.js'
const ADMIN=identities.adminUids[0], projectId='demo-galaxia-permanent'
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8055')throw Error('Local demo emulator required; refusing production access')
let env,app,server
const user=uid=>env.authenticatedContext(uid,{email:`${uid}@example.test`,email_verified:true}).firestore()
const guest=()=>env.unauthenticatedContext().firestore()
const ref=(db,path)=>doc(db,path)
const profile=(uid,extra={})=>({name:uid,email:`${uid}@example.test`,emailVerified:true,role:'user',stars:40,participationStars:9,readPostsCount:1,selectedIcon:'kirby-01',unlockedIcons:['kirby-01'],...extra})
before(async()=>{
  const rules=await readFile(new URL('./firestore.permanent.rules',import.meta.url),'utf8')
  assert.ok(rules.includes(ADMIN));assert.equal(identities.publisherUids.length,0)
  env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8055,rules}})
  app=initializeApp({projectId},'permanent-local-tests');server=getFirestore(app)
})
beforeEach(async()=>{
  await env.clearFirestore()
  const fixtures={
    [`users/${ADMIN}`]:profile(ADMIN,{role:'user'}),
    'users/alice':profile('alice',{canChat:true,socialLinks:{youtube:'https://example.test/public',privateToken:'secret'},password:'legacy-private',isOnline:true}),
    'users/bob':profile('bob',{canChat:true}),'users/forged':profile('forged',{role:'admin'}),'users/fakepublisher':profile('fakepublisher',{role:'publisher'}),
    'posts/public':{authorId:ADMIN,status:'approved',visibility:'public',releaseAt:0,title:'Published'},
    'posts/legacy':{authorId:ADMIN,status:'approved',title:'Legacy published'},
    'posts/draft':{authorId:ADMIN,status:'draft',title:'Private draft'},
    'posts/private':{status:'approved',visibility:'private',title:'Private'},
    'posts/future':{status:'approved',visibility:'public',releaseAt:Date.now()+86400000},
    'galaxyEvents/public':{title:'Public event',startsAt:Date.now()+3600000,notifyBy:['alice','bob']},
    'galaxyEvents/draft':{status:'draft',title:'Draft event'},
    'sitePages/public':{status:'published',visibility:'public',slug:'public'},'sitePages/private':{status:'draft'},
    'communities/club':{name:'Club',membersCount:0},'communities/galaxia-oficial':{name:'Official',lockedMembership:true,adminOnlyThreads:true},
    'communityThreads/thread':{authorId:'bob',communityId:'club',body:'Body',comments:[],replies:0,likes:0,likedBy:[]},
    'liveChats/live':{active:true},'liveGoals/goal':{type:'likes',likesBy:{},likerProfiles:{}},
    [`overlays/${ADMIN}/items/scene`]:{name:'OBS',widgets:[]},
    'profileIcons/custom':{requiredStars:10,active:true,visible:true,imageUrl:'https://example.test/i.png'},
    'siteConfig/profileAchievements':{items:[]},'siteSettings/postCategories':{items:[]},
    'ruzafaPrinterProducts/p':{name:'Product'}
  }
  const batch=server.batch();for(const [path,data]of Object.entries(fixtures))batch.set(server.doc(path),data);await batch.commit()
})
after(async()=>{await env?.cleanup();if(app)await deleteApp(app)})

test('frontend public relation queries, counts and comment/OBS listeners work with the exact candidate',async()=>{
  const batch=server.batch()
  batch.set(server.doc('users/bob/followers/alice'),{userId:'alice',name:'Alice',imageUrl:'https://example.test/avatar.png'})
  batch.set(server.doc('users/alice/following/bob'),{userId:'bob',name:'Bob'})
  batch.set(server.doc('users/alice/communities/club'),{communityId:'club',name:'Club',role:'Miembro'})
  batch.set(server.doc('communities/club/members/alice'),{userId:'alice',name:'Alice'})
  batch.update(server.doc('communityThreads/thread'),{updatedAt:1,comments:[{id:'c',authorId:'alice',author:'Alice',authorImage:'https://example.test/avatar.png',body:'Public comment'}],replies:1})
  await batch.commit()
  for(const db of [guest(),user('alice')]){
    for(const [path,size] of [['users/bob/followers',500],['users/alice/following',500],['users/alice/communities',12],['communities/club/members',500]]){
      const result=await assertSucceeds(getDocs(query(collection(db,path),limit(size))))
      assert.equal(result.size,1)
      assert.equal(JSON.stringify(result.docs.map(item=>item.data())).includes('@example.test'),false)
    }
    assert.equal((await assertSucceeds(getCountFromServer(collection(db,'users/bob/followers')))).data().count,1)
    assert.equal((await assertSucceeds(getDocs(query(collection(db,'communityThreads'),where('authorId','==','bob'),limit(80))))).size,1)
    await new Promise((resolve,reject)=>{
      let stop=()=>{}
      stop=onSnapshot(query(collection(db,'communityThreads'),orderBy('updatedAt','desc'),limit(40)),snapshot=>{stop();try{assert.equal(snapshot.docs[0].data().comments[0].body,'Public comment');resolve()}catch(error){reject(error)}},reject)
    })
    await new Promise((resolve,reject)=>{
      let stop=()=>{}
      stop=onSnapshot(ref(db,`overlays/${ADMIN}/items/scene`),snapshot=>{stop();try{assert.equal(snapshot.data().name,'OBS');resolve()}catch(error){reject(error)}},reject)
    })
  }
})
test('private users and unregistered collections are never public',async()=>{
  for(const db of [guest(),user('bob'),user('forged')])await assertFails(getDoc(ref(db,'users/alice')))
  await assertFails(getDocs(collection(user('alice'),'users')))
  await assertFails(setDoc(ref(user(ADMIN),'unknown/document'),{value:1}))
})
test('only the confirmed Authentication UID has administrative/editorial authority',async()=>{
  await assertSucceeds(getDocs(collection(user(ADMIN),'users')))
  await assertSucceeds(updateDoc(ref(user(ADMIN),'posts/draft'),{status:'approved'}))
  for(const uid of ['alice','forged','fakepublisher']){
    await assertFails(updateDoc(ref(user(uid),'posts/public'),{title:'Hijacked'}))
    await assertFails(setDoc(ref(user(uid),'posts/new'),{authorId:uid,status:'pending'}))
    await assertFails(updateDoc(ref(user(uid),'users/alice'),{canChat:false}))
  }
})
test('registration and ordinary profile editing work without granting protected fields',async()=>{
  const db=user('new')
  await assertSucceeds(setDoc(ref(db,'users/new'),{name:'New',email:'new@example.test',emailVerified:true,role:'user',stars:0,readPostsCount:0,selectedIcon:'kirby-01',unlockedIcons:['kirby-01']}).catch(async error=>{throw error}))
})
test('self elevation, points, ownership and other profiles are protected',async()=>{
  const db=user('alice')
  await assertSucceeds(updateDoc(ref(db,'users/alice'),{name:'Alice edited',description:'Description',isOnline:true}))
  for(const data of [{role:'admin'},{canChat:false},{isBlocked:false},{stars:99},{participationStars:999},{unlockedIcons:['custom']},{selectedIcon:'custom'},{followersCount:999}])await assertFails(updateDoc(ref(db,'users/alice'),data))
  await assertFails(updateDoc(ref(db,'users/bob'),{name:'Hijacked'}))
  await assertFails(setDoc(ref(db,'users/alice/readPosts/public'),{stars:100}))
  await assertFails(updateDoc(ref(user(ADMIN),'users/alice'),{participationStars:100}))
})
test('public exact posts work; public lists use the actual filtered adapter instead of unsafe raw queries',async()=>{
  const db=guest()
  await assertSucceeds(getDoc(ref(db,'posts/public')))
  for(const id of ['draft','private','future'])await assertFails(getDoc(ref(db,'posts/'+id)))
  await assertFails(getDocs(collection(db,'posts')))
  await assertFails(getDocs(query(collection(db,'posts'),where('status','==','approved'),where('visibility','==','public'),where('releaseAt','<=',Date.now()))))
  const result=await createPublicContentHandler(server)({httpMethod:'GET',queryStringParameters:{collection:'posts'}})
  assert.deepEqual(JSON.parse(result.body).docs.map(item=>item.id).sort(),['legacy','public'])
})
test('the actual public read adapter preserves legacy posts and redacts private profile fields',async()=>{
  const handler=createPublicContentHandler(server)
  const read=async(collection,id)=>JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{collection,...(id?{id}:{})}})).body)
  const profiles=await read('users','alice'),serialized=JSON.stringify(profiles)
  assert.equal(profiles.docs[0].name,'alice')
  for(const value of ['alice@example.test','password','legacy-private','privateToken','secret','canChat','"stars"'])assert.equal(serialized.includes(value),false)
  assert.equal((await read('users','forged')).docs[0].role,'user')
  assert.deepEqual((await read('posts')).docs.map(d=>d.id).sort(),['legacy','public'])
  assert.equal((await read('galaxyEvents')).docs.length,1)
  assert.deepEqual((await read('galaxyEvents')).docs[0].notifyBy,[])
  assert.equal((await read('sitePages')).docs.length,1)
})
test('event reminders change only the caller and private events remain administrative',async()=>{
  const db=user('alice')
  await assertSucceeds(updateDoc(ref(db,'galaxyEvents/public'),{notifyBy:['bob']}))
  await assertFails(updateDoc(ref(db,'galaxyEvents/public'),{notifyBy:['alice','forged']}))
  await assertFails(updateDoc(ref(db,'galaxyEvents/public'),{title:'Hijack'}))
  await assertSucceeds(updateDoc(ref(user(ADMIN),'galaxyEvents/public'),{title:'Admin title'}))
  await assertFails(getDoc(ref(guest(),'galaxyEvents/draft')))
  const handler=createPublicContentHandler(server,async()=>({uid:'bob'}))
  const result=JSON.parse((await handler({httpMethod:'GET',headers:{authorization:'Bearer test'},queryStringParameters:{collection:'galaxyEvents'}})).body)
  assert.deepEqual(result.docs[0].notifyBy,['bob'])
})
test('personal bookmarks and editorial templates retain their correct private boundaries',async()=>{
  const favorite={postId:'public',postSlug:'published',title:'News',image:'https://example.test/i.png',category:'News',authorName:'Author',createdAt:1,savedAt:1}
  await assertSucceeds(setDoc(ref(user('alice'),'users/alice/favorites/public'),favorite))
  await assertSucceeds(getDocs(collection(user('alice'),'users/alice/favorites')))
  await assertFails(getDocs(collection(user('bob'),'users/alice/favorites')))
  await assertFails(setDoc(ref(user('alice'),'users/alice/favorites/private'),{...favorite,postId:'private'}))
  await assertSucceeds(setDoc(ref(user(ADMIN),`users/${ADMIN}/socialTemplates/test`),{name:'Template'}))
  await assertFails(setDoc(ref(user('forged'),'users/forged/socialTemplates/test'),{name:'Template'}))
})
test('membership and its counter change atomically; arbitrary counts and official enrollment fail',async()=>{
  const db=user('alice'),batch=writeBatch(db)
  batch.set(ref(db,'communities/club/members/alice'),{userId:'alice',name:'Alice',joinedAt:1})
  batch.set(ref(db,'users/alice/communities/club'),{communityId:'club',name:'Club',role:'Miembro'})
  batch.update(ref(db,'communities/club'),{membersCount:1})
  await assertSucceeds(batch.commit())
  await assertFails(updateDoc(ref(db,'communities/club'),{membersCount:900}))
  await assertFails(setDoc(ref(db,'communities/galaxia-oficial/members/alice'),{userId:'alice'}))
  await assertSucceeds(setDoc(ref(db,'communityThreads/new'),{authorId:'alice',communityId:'club',body:'Hello',likes:0,likedBy:[],comments:[],replies:0}))
  const leave=writeBatch(db);leave.delete(ref(db,'communities/club/members/alice'));leave.delete(ref(db,'users/alice/communities/club'));leave.update(ref(db,'communities/club'),{membersCount:0});await assertSucceeds(leave.commit())
})
test('community comments append/edit/delete only their own entry and preserve other comments',async()=>{
  const db=user('alice'),comment={id:'c',authorId:'alice',body:'Hello',createdAt:1}
  await assertSucceeds(updateDoc(ref(db,'communityThreads/thread'),{comments:[comment],replies:1}))
  await assertFails(updateDoc(ref(user('bob'),'communityThreads/thread'),{comments:[{...comment,body:'Hijack'}],replies:1}))
  await assertSucceeds(updateDoc(ref(db,'communityThreads/thread'),{comments:[{...comment,body:'Edited',editedAt:2}],replies:1}))
  await assertSucceeds(updateDoc(ref(db,'communityThreads/thread'),{comments:[],replies:0}))
})
test('followers and notifications require the actual actor and an existing event',async()=>{
  const db=user('alice')
  await assertSucceeds(setDoc(ref(db,'users/bob/followers/alice'),{userId:'alice',name:'Alice'}))
  await assertSucceeds(setDoc(ref(db,'users/alice/following/bob'),{userId:'bob',name:'Bob'}))
  await assertFails(setDoc(ref(db,'users/bob/followers/forged'),{userId:'forged'}))
  const payload={type:'new-follower',title:'Follower',message:'Followed',actorId:'alice',actorName:'Alice',targetId:'alice',targetType:'profile',read:false,createdAt:1}
  await assertSucceeds(setDoc(ref(db,'users/bob/notifications/follow-alice'),payload))
  await assertFails(setDoc(ref(db,'users/bob/notifications/forged'),{...payload,actorId:'forged'}))
  await assertFails(getDocs(collection(db,'users/bob/notifications')))
  await assertSucceeds(updateDoc(ref(user('bob'),'users/bob/notifications/follow-alice'),{read:true}))
})
test('direct message and summary commit together; nonparticipants and forged previews are denied',async()=>{
  const db=user('alice'),batch=writeBatch(db),chat='alice_bob'
  await assertSucceeds(getDoc(ref(db,'directChats/'+chat)))
  await assertSucceeds(getDocs(query(collection(db,`directChats/${chat}/messages`),orderBy('createdAt','asc'))))
  batch.set(ref(db,`directChats/${chat}/messages/msg`),{body:'Hello',authorId:'alice',author:'Alice',createdAt:serverTimestamp(),readBy:{alice:true}})
  batch.set(ref(db,`directChats/${chat}`),{participants:['alice','bob'],lastMessage:'Hello',lastMessagePreview:'Hello',lastMessageId:'msg',lastMessageAuthorId:'alice',updatedAt:serverTimestamp(),deletedFor:{alice:false,bob:false},lastReadBy:{alice:'msg'}})
  await assertSucceeds(batch.commit())
  await assertSucceeds(getDocs(query(collection(user('bob'),`directChats/${chat}/messages`),orderBy('createdAt','asc'))))
  await assertSucceeds(getDocs(query(collection(db,'directChats'),where('participants','array-contains','alice'))))
  await assertFails(getDoc(ref(user('forged'),`directChats/${chat}`)))
  await assertFails(updateDoc(ref(db,`directChats/${chat}`),{lastMessagePreview:'Forged'}))
  await assertSucceeds(updateDoc(ref(user('bob'),`directChats/${chat}/messages/msg`),{'readBy.bob':true}))
  await assertFails(updateDoc(ref(user('bob'),`directChats/${chat}/messages/msg`),{'readBy.alice':false}))
  const bob=user('bob'),reply=writeBatch(bob)
  reply.set(ref(bob,`directChats/${chat}/messages/reply`),{body:'Reply',authorId:'bob',createdAt:serverTimestamp(),readBy:{bob:true}})
  reply.set(ref(bob,`directChats/${chat}`),{participants:['bob','alice'],lastMessage:'Reply',lastMessagePreview:'Reply',lastMessageId:'reply',lastMessageAuthorId:'bob',updatedAt:serverTimestamp(),lastReadBy:{bob:'reply'},deletedFor:{alice:false,bob:false}},{merge:true})
  await assertSucceeds(reply.commit())
})
test('live chat uses a real message for previews and preserves engagement and video replies',async()=>{
  const db=user('alice'),batch=writeBatch(db)
  batch.set(ref(db,'liveChats/live/messages/msg'),{body:'Live',authorId:'alice',author:'Alice',createdAt:serverTimestamp()})
  batch.update(ref(db,'liveChats/live'),{lastMessageId:'msg',lastMessagePreview:'Live',lastMessageAuthorId:'alice',updatedAt:serverTimestamp()})
  await assertSucceeds(batch.commit())
  await assertFails(updateDoc(ref(db,'liveChats/live'),{active:false}))
  await assertSucceeds(updateDoc(ref(db,'liveGoals/goal'),{likesBy:{alice:1},likerProfiles:{alice:{name:'Alice'}}}))
  await assertSucceeds(setDoc(ref(db,'videoChats/video/messages/msg'),{authorId:'alice',body:'Video',likes:0,likedBy:[],replies:[]}))
  await assertSucceeds(updateDoc(ref(user('bob'),'videoChats/video/messages/msg'),{replies:[{id:'r',authorId:'bob',body:'Reply'}]}))
})
test('OBS exact document reads, public catalog and products work; their writes stay restricted',async()=>{
  await assertSucceeds(getDoc(ref(guest(),`overlays/${ADMIN}/items/scene`)))
  await assertFails(getDocs(collection(guest(),`overlays/${ADMIN}/items`)))
  for(const path of ['profileIcons/custom','siteConfig/profileAchievements','ruzafaPrinterProducts/p','siteSettings/postCategories'])await assertSucceeds(getDoc(ref(guest(),path)))
  await assertSucceeds(updateDoc(ref(user(ADMIN),`overlays/${ADMIN}/items/scene`),{name:'Updated'}))
  await assertFails(updateDoc(ref(user('forged'),`overlays/${ADMIN}/items/scene`),{widgets:[]}))
  await assertFails(updateDoc(ref(user(ADMIN),'profileIcons/custom'),{requiredStars:0}))
})
test('the privileged progress function checks the UID independently of Firestore rules and role fields',async()=>{
  let now=100000;const service=createProgressService(server,()=>now)
  await assert.rejects(service('forged',{action:'update-icon',iconId:'custom',requiredStars:0,order:0,name:'Hijack',src:'https://example.test/i.png'}),/forbidden/)
  await service(ADMIN,{action:'update-icon',iconId:'custom',requiredStars:10,order:1,name:'Authorized',src:'https://example.test/i.png'})
  await service('alice',{action:'begin-read',postId:'public'});now+=30000
  const results=await Promise.all([service('alice',{action:'award-read',postId:'public'}),service('alice',{action:'award-read',postId:'public'})])
  assert.equal(results.filter(result=>result.awarded).length,1)
  const saved=(await server.doc('users/alice').get()).data();assert.equal(saved.stars,40);assert.equal(saved.participationStars,10)
  assert.ok(saved.unlockedIcons.includes('custom'))
})

test('the real admin image service uploads locally and rejects forged admins before writing Storage',async()=>{
  assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199','local Storage required')
  process.env.STORAGE_EMULATOR_HOST='http://127.0.0.1:9199'
  const bucket=getStorage(app).bucket('demo-galaxia-permanent.appspot.com')
  const service=createProgressService(server,Date.now,createIconImageUploader(bucket,getDownloadURL))
  const image={action:'upload-icon-image',contentType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')}
  await assert.rejects(service('forged',image),/forbidden/)
  const result=await service(ADMIN,image)
  assert.ok(result.imageUrl.includes('profile-icons'))
  const [files]=await bucket.getFiles({prefix:'profile-icons/'})
  assert.ok(files.length>0)
  await assert.rejects(service(ADMIN,{...image,data:'aW52YWxpZA=='}),/invalid-image/)
})
