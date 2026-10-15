import {randomUUID} from 'node:crypto';
import {safePublicLabel} from './public-profile.mjs';
import {editorialUrl} from './editorial/contract.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code})};
const exact=(v,keys)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail('invalid-community-input')};
const id=v=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,180}$/.test(v))fail('invalid-community-input');return v};
const text=(v,n=4000)=>{if(typeof v!=='string'||v.length>n)fail('invalid-community-input');return v};
const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const ms=v=>v?.toMillis?.()??(Number.isFinite(v)?v:0);
const url=v=>{try{return editorialUrl(typeof v==='string'?v:'')}catch{return ''}};
const label=v=>safePublicLabel(v,120)||'Usuario de Galaxia';
const effect=v=>({special:v?.special===true,effectColor:/^#[0-9a-f]{6}$/i.test(v?.effectColor||'')?v.effectColor:'#a855f7',saga:typeof v?.saga==='string'?v.saga.slice(0,80):''});
const ids=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&/^[-a-zA-Z0-9_]{1,128}$/.test(x)))]:[];
const pointer=v=>typeof v==='string'&&/^[-a-zA-Z0-9_]{1,180}$/.test(v)?v:'';
const comment=v=>({id:pointer(v.id),authorId:pointer(v.authorId),author:label(v.author),authorImage:'',authorIconEffect:effect({}),handle:typeof v.handle==='string'&&/^@[a-zA-Z0-9_-]{1,40}$/.test(v.handle)?v.handle:'',body:typeof v.body==='string'?v.body.slice(0,4000):'',createdAt:ms(v.createdAt),editedAt:ms(v.editedAt)});
const schemas={
 communities:['name','description','bannerUrl','iconUrl','threadBackgroundUrl','musicPlaylistUrl','musicVolume','threadTopics','isOfficial','lockedMembership','adminOnlyThreads','membersCount','createdBy','createdAt','updatedAt'],
 events:['title','description','type','url','backgroundUrl','imageUrl','startsAt','durationMinutes','communityId','communityName','communityIds','communityNames','featured','createdBy','createdAt','updatedAt','notifyBy'],
 goals:['title','description','type','target','checklist','communityId','createdBy','createdAt','updatedAt','likesBy','likerProfiles'],
 threads:['communityId','communityName','authorId','author','authorImage','authorIconEffect','handle','topic','hashtags','title','body','imageUrl','mediaType','gif','poll','spoiler','isOfficial','lockedThread','pinnedCommunity','pinnedHome','showOnHome','pinnedAt','pinnedBy','homePinnedAt','homePinnedBy','comments','likedBy','likes','replies','createdAt','updatedAt'],
 video:['gif','videoId','videoTitle','videoSecond','body','authorId','author','authorImage','authorIconEffect','likedBy','likes','replies','kind','createdAt'],
 live:['active','title','updatedAt','lastMessagePreview','lastMessageAuthorId']
};
const collections={communities:'communities',events:'galaxyEvents',goals:'liveGoals',threads:'communityThreads',video:'videoChats',live:'liveChats'};
export function projectCommunity(kind,raw,docId){
 if(!Object.hasOwn(schemas,kind))fail('invalid-community-input');const out={id:docId};for(const key of schemas[kind]){const v=raw[key];if(v===undefined)continue;
  if(key==='author')out[key]=label(v);else if(key==='authorImage')out[key]='';else if(['authorId','createdBy','communityId','pinnedBy','homePinnedBy','lastMessageAuthorId'].includes(key))out[key]=pointer(v);else if(['bannerUrl','iconUrl','threadBackgroundUrl','musicPlaylistUrl','backgroundUrl','imageUrl','url'].includes(key))out[key]=url(v);
  else if(['createdAt','updatedAt','startsAt','pinnedAt','homePinnedAt'].includes(key))out[key]=ms(v);
  else if(key==='authorIconEffect')out[key]=effect({});
  else if(key==='comments'||key==='replies'&&kind==='video')out[key]=Array.isArray(v)?v.slice(0,200).map(comment):[];
  else if(['likedBy','notifyBy','communityIds'].includes(key))out[key]=ids(v);
  else if(['threadTopics','hashtags','communityNames'].includes(key))out[key]=Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,40).map(x=>x.slice(0,120)):[];
  else if(key==='checklist')out[key]=Array.isArray(v)?v.slice(0,100).map(x=>({id:typeof x.id==='string'?x.id:'',label:typeof x.label==='string'?x.label.slice(0,500):'',done:x.done===true})):[];
  else if(key==='likesBy')out[key]=Object.fromEntries(Object.entries(v&&typeof v==='object'&&!Array.isArray(v)?v:{}).filter(([k])=>/^[-a-zA-Z0-9_]{1,128}$/.test(k)).map(([k,n])=>[k,count(n)]));
  else if(key==='likerProfiles')out[key]=Object.fromEntries(Object.entries(v&&typeof v==='object'&&!Array.isArray(v)?v:{}).filter(([k])=>/^[-a-zA-Z0-9_]{1,128}$/.test(k)).map(([k,p])=>[k,{name:label(p?.name),imageUrl:''}]));
  else if(key==='gif')out[key]=v?{provider:typeof v.provider==='string'?v.provider.slice(0,30):'',title:typeof v.title==='string'?v.title.slice(0,200):'',url:url(v.url),previewUrl:url(v.previewUrl)}:null;
  else if(key==='poll')out[key]=null;
  else if(['string','number','boolean'].includes(typeof v))out[key]=typeof v==='string'?v.slice(0,8000):v;
 }return out;
}
export function createCommunityService({db,auth,adminUid,clock=Date.now}){
 async function publicParent(kind,raw){if(raw.visibility==='private')return false;if(kind!=='threads')return true;const key=raw.communityId;if(typeof key!=='string'||!/^[-a-zA-Z0-9_]{1,180}$/.test(key))return false;const parent=await db.doc('communities/'+key).get();return parent.exists?parent.data().visibility!=='private':key==='galaxia-oficial';}
 async function read(input){exact(input,['kind','id','limit']);const {kind}=input;if(!Object.hasOwn(collections,kind))fail('invalid-community-input');const size=input.limit??80;if(!Number.isSafeInteger(size)||size<1||size>500)fail('invalid-community-input');
  if(kind==='live'){const doc=await db.doc('liveChats/'+id(input.id||'galaxia-oficial')).get();if(!doc.exists)return {items:[]};const raw=doc.data();return {items:[{id:doc.id,active:raw.active===true,title:typeof raw.title==='string'?raw.title.slice(0,240):'',updatedAt:ms(raw.updatedAt)}]};}
  if(input.id&&kind!=='video'){const doc=await db.doc(collections[kind]+'/'+id(input.id)).get();return {items:doc.exists&&await publicParent(kind,doc.data())?[projectCommunity(kind,doc.data(),doc.id)]:[]};}
  if(kind==='video'){const parent=await db.doc('videoChats/'+id(input.id)).get();if(parent.exists&&parent.data().visibility==='private')return {items:[]};}const name=kind==='video'?'videoChats/'+id(input.id)+'/messages':collections[kind];let q=db.collection(name);
  q=q.orderBy(kind==='events'?'startsAt':kind==='threads'?'updatedAt':'createdAt',['threads','goals'].includes(kind)?'desc':'asc').limit(size);
  const snap=await q.get(),allowed=await Promise.all(snap.docs.map(d=>publicParent(kind,d.data())));return {items:snap.docs.filter((d,i)=>allowed[i]).map(d=>projectCommunity(kind,d.data(),d.id))};
 }
 async function mutate(token,input){exact(input,['action','id','data','requestId']);if(typeof input.action!=='string')fail('invalid-community-input');const data=input.data??{};let user;try{const claims=await auth.verifyIdToken(token,true);user=await auth.getUser(claims.uid);if(user.uid!==claims.uid||user.disabled||!user.emailVerified)fail('authentication-denied');}catch{fail('authentication-denied');}const actor=user.uid,isAdmin=!!adminUid&&actor===adminUid,ownRef=db.doc('users/'+actor),now=clock();
  if(input.action==='clear-live'){
   if(!isAdmin)fail('forbidden');exact(data,[]);const snap=await db.collection('liveChats/galaxia-oficial/messages').limit(401).get();if(snap.docs.length>400)fail('community-operation-limit');return db.runTransaction(async tx=>{const own=await tx.get(ownRef);if(!own.exists||own.data().isBlocked!==false)fail('profile-review-required');for(const doc of snap.docs)tx.delete(db.doc('liveChats/galaxia-oficial/messages/'+doc.id));return {deleted:snap.docs.length};});
  }
  if(input.action==='membership'){
   exact(data,['joined']);if(typeof data.joined!=='boolean')fail('invalid-community-input');const communityId=id(input.id),cRef=db.doc('communities/'+communityId),mRef=db.doc('communities/'+communityId+'/members/'+actor),uRef=db.doc('users/'+actor+'/communities/'+communityId);
   return db.runTransaction(async tx=>{const [own,community,member,mirror]=await tx.getAll(ownRef,cRef,mRef,uRef);if(!own.exists||own.data().isBlocked!==false)fail('profile-review-required');if(!community.exists)fail('community-missing');const c=community.data();if(!isAdmin&&(communityId==='galaxia-oficial'||c.lockedMembership===true||c.isOfficial===true))fail('forbidden');
    if(c.membersCount!==undefined&&(!Number.isSafeInteger(c.membersCount)||c.membersCount<0))fail('community-review-required');const next=(c.membersCount??0)+Number(data.joined)-Number(member.exists);if(next<0)fail('community-review-required');
    if(data.joined){tx.set(mRef,{userId:actor,name:label(own.data().name),joinedAt:member.data()?.joinedAt??now});tx.set(uRef,{communityId,name:typeof c.name==='string'?c.name:'Comunidad',bannerUrl:url(c.bannerUrl),iconUrl:url(c.iconUrl),role:'Miembro',joinedAt:mirror.data()?.joinedAt??now,updatedAt:now});}else{tx.delete(mRef);tx.delete(uRef);}if(next!==c.membersCount)tx.set(cRef,{...c,membersCount:next,updatedAt:now});return {joined:data.joined,membersCount:next};});
  }
  if(input.action==='community-delete'){
   if(!isAdmin||input.id==='galaxia-oficial')fail('forbidden');exact(data,[]);const communityId=id(input.id),ref=db.doc('communities/'+communityId);
   return db.runTransaction(async tx=>{const [own,parent]=await tx.getAll(ownRef,ref);if(!own.exists||own.data().isBlocked!==false||!parent.exists)fail('community-missing');const members=await tx.get(db.collection('communities/'+communityId+'/members').limit(201)),threads=await tx.get(db.collection('communityThreads').where('communityId','==',communityId).limit(451));if(members.docs.length>200||threads.docs.length+members.docs.length*2+1>450)fail('community-operation-limit');for(const member of members.docs){const uid=id(member.id);tx.delete(db.doc('communities/'+communityId+'/members/'+uid));tx.delete(db.doc('users/'+uid+'/communities/'+communityId));}for(const thread of threads.docs)tx.delete(db.doc('communityThreads/'+thread.id));tx.delete(ref);return {id:communityId,deleted:true};});
  }
  if(['site-save','site-delete'].includes(input.action)){
   if(!isAdmin)fail('forbidden');exact(data,input.action==='site-save'?['kind','value']:['kind']);if(!['communities','events','goals','live'].includes(data.kind))fail('invalid-community-input');const docId=id(input.id),ref=db.doc(collections[data.kind]+'/'+docId);
   if(data.kind==='live'&&docId!=='galaxia-oficial')fail('invalid-community-input');
   const value=input.action==='site-save'?data.value:null;if(value){exact(value,schemas[data.kind]);if(value.title!==undefined)text(value.title,240);if(value.name!==undefined)text(value.name,120);for(const k of ['description'])if(value[k]!==undefined)text(value[k],4000);for(const k of ['url','backgroundUrl','imageUrl','bannerUrl','iconUrl','threadBackgroundUrl','musicPlaylistUrl'])if(value[k])editorialUrl(value[k]);if(data.kind==='live'&&value.active!==undefined&&typeof value.active!=='boolean')fail('invalid-community-input');if(JSON.stringify(value).length>50000)fail('invalid-community-input');}
   return db.runTransaction(async tx=>{const [own,old]=await tx.getAll(ownRef,ref);if(!own.exists||own.data().isBlocked!==false)fail('profile-review-required');if(input.action==='site-delete'){if(data.kind==='communities')fail('community-delete-needs-explicit-cleanup');tx.delete(ref);return {id:docId,deleted:true};}
    const next={...old.data(),...projectCommunity(data.kind,value,docId),updatedAt:now,createdAt:old.data()?.createdAt??now,createdBy:old.data()?.createdBy??actor};delete next.id;for(const key of ['likesBy','likerProfiles','notifyBy','membersCount']){if(old.exists&&old.data()[key]!==undefined)next[key]=old.data()[key];else if(key==='membersCount'&&data.kind==='communities')next[key]=0;else if(['likesBy','likerProfiles'].includes(key)&&data.kind==='goals')next[key]={};else if(key==='notifyBy'&&data.kind==='events')next[key]=[];}
    if(data.kind==='communities'){next.isOfficial=docId==='galaxia-oficial';if(next.isOfficial){next.lockedMembership=true;next.adminOnlyThreads=true;}}
    tx.set(ref,next);return {id:docId};});
  }
  if(input.action==='event-notify'||input.action==='goal-like'){
   exact(data,input.action==='event-notify'?['notified']:[]);if(input.action==='event-notify'&&typeof data.notified!=='boolean')fail('invalid-community-input');const ref=db.doc((input.action==='event-notify'?'galaxyEvents/':'liveGoals/')+id(input.id));return db.runTransaction(async tx=>{const [own,doc]=await tx.getAll(ownRef,ref);if(!own.exists||own.data().isBlocked!==false||!doc.exists)fail('community-item-missing');const raw=doc.data();if(input.action==='event-notify'){const list=ids(raw.notifyBy),next=data.notified?[...new Set([...list,actor])]:list.filter(x=>x!==actor);tx.set(ref,{...raw,notifyBy:next});return {notified:data.notified};}const current=count(raw.likesBy?.[actor]);if(current>=1000000)fail('community-operation-limit');tx.set(ref,{...raw,likesBy:{...raw.likesBy,[actor]:current+1},likerProfiles:{...raw.likerProfiles,[actor]:{name:label(own.data().name),imageUrl:''}},updatedAt:now});return {likes:current+1};});
  }
  if(input.action==='live-create'||input.action==='direct-send'){
   const live=input.action==='live-create';exact(data,live?['body']:['targetUid','body','gif']);const body=text(data.body,4000).trim();if(!body&&!data.gif)fail('invalid-community-input');let target,chatId;
   if(!live){target=id(data.targetUid);if(target===actor)fail('invalid-community-input');let record;try{record=await auth.getUser(target);}catch{fail('community-item-missing');}if(record.uid!==target||record.disabled||!record.emailVerified)fail('forbidden');chatId=[actor,target].sort().join('_');}else chatId='galaxia-oficial';
   const parentRef=db.doc((live?'liveChats/':'directChats/')+chatId),messageId=id(input.id||randomUUID()),messageRef=db.doc((live?'liveChats/':'directChats/')+chatId+'/messages/'+messageId);
   return db.runTransaction(async tx=>{const [own,parent,previous]=await tx.getAll(ownRef,parentRef,messageRef);if(!own.exists||own.data().isBlocked!==false||!(isAdmin||own.data().editorialPublisher===true||own.data().canChat===true))fail('forbidden');let other;
    if(live){if(parent.data()?.active!==true)fail('live-chat-closed');}else{other=await tx.get(db.doc('users/'+target));if(!other.exists||other.data().isBlocked!==false)fail('forbidden');if(parent.exists&&(!Array.isArray(parent.data().participants)||parent.data().participants.length!==2||!parent.data().participants.includes(actor)||!parent.data().participants.includes(target)))fail('chat-id-conflict');}
    if(previous.exists){if(previous.data().authorId===actor&&previous.data().body===body)return {id:messageId};fail('request-conflict');}
    const authorName=label(own.data().name),message={body,authorId:actor,author:authorName,authorName,createdAt:now,...(!live?{readBy:{[actor]:true},seenAt:{[actor]:now}}:{authorImage:''})};if(!live&&data.gif){exact(data.gif,['provider','title','url','previewUrl']);message.gif={provider:typeof data.gif.provider==='string'?data.gif.provider.slice(0,30):'giphy',title:typeof data.gif.title==='string'?data.gif.title.slice(0,200):'',url:editorialUrl(data.gif.url),previewUrl:editorialUrl(data.gif.previewUrl||'')};}
    tx.create(messageRef,message);const next={...parent.data(),lastMessageId:messageId,lastMessageAuthorId:actor,lastMessagePreview:body||'GIF',lastMessage:body||'GIF',updatedAt:now};if(!live){next.deletedFor={...(parent.data()?.deletedFor||{}),[actor]:false,[target]:false};next.participants=[actor,target];next.participantNames={...(parent.data()?.participantNames||{}),[actor]:authorName,[target]:label(other.data().name)};next.lastReadBy={...(parent.data()?.lastReadBy||{}),[actor]:messageId};}tx.set(parentRef,next);return {id:messageId};
   });
  }
  const video=input.action.startsWith('video-'),collection=video?'videoChats/'+id(data.videoId)+'/messages':'communityThreads';
  const docId=id(input.id||randomUUID()),ref=db.doc(collection+'/'+docId);
  return db.runTransaction(async tx=>{
   const [own,snap]=await tx.getAll(ownRef,ref);if(!own.exists||own.data().isBlocked!==false)fail('profile-review-required');const profile=own.data(),raw=snap.data();const author={authorId:actor,author:label(profile.name),authorImage:'',authorIconEffect:effect(profile.selectedIconEffect),handle:''};
   if(input.action==='thread-create'||input.action==='video-create'){
    exact(data,video?schemas.video:schemas.threads);if(snap.exists){if(raw.authorId===actor&&raw.body===data.body)return {id:docId};fail('request-conflict');}text(data.body);if(!data.body.trim()&&!data.gif?.url)fail('invalid-community-input');if(data.gif?.url)editorialUrl(data.gif.url);
    let community;if(!video){const communityId=id(data.communityId);const [parent,member]=await tx.getAll(db.doc('communities/'+communityId),db.doc('communities/'+communityId+'/members/'+actor));community=parent.data();if(!isAdmin&&(!parent.exists||community.adminOnlyThreads===true||communityId==='galaxia-oficial'||!member.exists))fail('forbidden');}
    const value=projectCommunity(video?'video':'threads',data,docId);delete value.id;Object.assign(value,author,{comments:[],likedBy:[],likes:0,replies:video?[]:0,createdAt:now,updatedAt:now});if(!video){value.isOfficial=data.communityId==='galaxia-oficial';value.lockedThread=value.isOfficial;value.pinnedCommunity=false;value.showOnHome=false;value.pinnedHome=false;value.communityName=typeof community?.name==='string'?community.name:value.isOfficial?'Galaxia Nintendera':'Comunidad';}
    tx.create(ref,value);return {id:docId};
   }
   if(!snap.exists)fail('community-item-missing');
   if(raw.visibility==='private'&&!isAdmin&&raw.authorId!==actor)fail('forbidden');if(!isAdmin){const parent=await tx.get(db.doc(video?'videoChats/'+id(data.videoId):'communities/'+id(raw.communityId)));if(parent.data()?.visibility==='private'){if(video)fail('forbidden');const membership=await tx.get(db.doc('communities/'+id(raw.communityId)+'/members/'+actor));if(!membership.exists)fail('forbidden');}}
   if(input.action==='thread-like'||input.action==='video-like'){
    exact(data,video?['videoId','liked']:['liked']);if(typeof data.liked!=='boolean')fail('invalid-community-input');const current=ids(raw.likedBy),next=data.liked?[...new Set([...current,actor])]:current.filter(x=>x!==actor);if(next.length>2000)fail('community-operation-limit');tx.set(ref,{...raw,likedBy:next,likes:next.length,updatedAt:now});return {liked:data.liked,likes:next.length};
   }
   if(['thread-delete','video-delete'].includes(input.action)){exact(data,video?['videoId']:[]);if(!isAdmin&&raw.authorId!==actor)fail('forbidden');tx.delete(ref);return {id:docId,deleted:true};}
   if(input.action==='thread-pin'){
    if(!isAdmin)fail('forbidden');exact(data,['pinnedCommunity','showOnHome']);for(const k of Object.keys(data))if(typeof data[k]!=='boolean')fail('invalid-community-input');tx.set(ref,{...raw,...data,pinnedHome:false,pinnedAt:data.pinnedCommunity?now:0,pinnedBy:data.pinnedCommunity?actor:'',homePinnedAt:data.showOnHome?now:0,homePinnedBy:data.showOnHome?actor:'',updatedAt:now});return {id:docId};
   }
   if(['comment-add','comment-edit','comment-delete','video-reply'].includes(input.action)){
    exact(data,video?['videoId','commentId','body']:['commentId','body']);const commentId=id(data.commentId),key=video?'replies':'comments',comments=Array.isArray(raw[key])?[...raw[key]]:[];if(comments.length>200||new Set(comments.map(c=>c.id)).size!==comments.length)fail('community-review-required');const index=comments.findIndex(c=>c.id===commentId);
    if(input.action==='comment-add'||input.action==='video-reply'){
     if(raw.lockedThread===true&&!isAdmin)fail('forbidden');const body=text(data.body,4000).trim();if(!body)fail('invalid-community-input');if(index>=0){if(comments[index].authorId===actor&&comments[index].body===body)return {id:commentId};fail('request-conflict');}if(comments.length>=200)fail('community-operation-limit');comments.push({...author,id:commentId,body,createdAt:now});
    }else{if(index<0)fail('community-item-missing');if(!isAdmin&&comments[index].authorId!==actor)fail('forbidden');if(input.action==='comment-delete')comments.splice(index,1);else{const body=text(data.body).trim();if(!body)fail('invalid-community-input');comments[index]={...comments[index],body,editedAt:now};}}
    tx.set(ref,{...raw,[key]:comments,...(!video?{replies:comments.length}:{}),updatedAt:now});return {id:commentId};
   }
   fail('invalid-community-action');
  });
 }
 return {read,mutate};
}
