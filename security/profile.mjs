// Ordinary profile operations using existing Auth. No roles, claims or account authority system.
import {safePublicLabel,projectPublicProfile,assertPublicProfile,createTrustedAssetPolicy,canonicalAssetPath} from './public-profile.mjs';
import {editorialUrl} from './editorial/contract.mjs';
import {builtinIcon,publicIcon} from './profile-progress.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const exact=(value,keys)=>{if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).some(key=>!keys.includes(key)))fail('invalid-profile-input');};
export function createProfileService({db,auth,adminUid='',clock=Date.now,assetPolicy=createTrustedAssetPolicy([]),iconPurchases,progress,follows,community}){
 const publicProfile=raw=>{
  const base=projectPublicProfile(raw,{assetPolicy,equippedIcon:{src:raw.imageUrl||''}});
  if(!base)return null;
  return {...base,description:typeof raw.description==='string'?raw.description.slice(0,2000):'',socialLinks:links(raw.socialLinks??{})};
 };
 function links(value){exact(value,['tiktok','youtube','twitch']);const result={};for(const key of ['tiktok','youtube','twitch']){const url=value[key]||'';if(typeof url!=='string')fail('invalid-social-link');if(url){const parsed=new URL(editorialUrl(url)),host=parsed.hostname.replace(/^www\./,'');const permitted={tiktok:['tiktok.com'],youtube:['youtube.com','youtu.be'],twitch:['twitch.tv']}[key];if(!permitted.includes(host))fail('invalid-social-link');result[key]=parsed.href;}else result[key]='';}return result;}
 async function identity(token){let claims,user;try{claims=await auth.verifyIdToken(token,true);user=await auth.getUser(claims.uid);}catch{fail('authentication-denied');}if(user.disabled||user.uid!==claims.uid)fail('authentication-denied');return user;}
 function validatePublic(value){exact(value,['publicSchemaVersion','displayName','handle','avatarUrl','avatarEffect','description','socialLinks']);assertPublicProfile(Object.fromEntries(['publicSchemaVersion','displayName','handle','avatarUrl','avatarEffect'].map(k=>[k,value[k]])),{assetPolicy});if(typeof value.description!=='string'||value.description.length>2000)fail('invalid-public-profile');links(value.socialLinks);return value;}
 async function getPublic(uid){if(typeof uid!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(uid))fail('invalid-profile-id');const [pub,privateDoc]=await Promise.all([db.doc('publicProfiles/'+uid).get(),db.doc('users/'+uid).get()]);if(!privateDoc.exists||privateDoc.data().isBlocked!==false)return null;let target;try{target=await auth.getUser(uid);}catch(e){if(e.code==='auth/user-not-found')return null;throw e;}if(target.uid!==uid||target.disabled||!target.emailVerified)return null;const raw=privateDoc.data(),base=pub.exists?validatePublic(pub.data()):publicProfile(raw);if(!base)return null;let equipped=null;if(Array.isArray(raw.unlockedIcons)&&raw.unlockedIcons.includes(raw.selectedIcon)){const icon=await db.doc('profileIcons/'+raw.selectedIcon).get();try{const value=icon.exists?icon.data():builtinIcon(raw.selectedIcon);if(value)equipped=publicIcon(raw.selectedIcon,value);}catch{}}const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;return {id:uid,...base,...(equipped?{avatarUrl:equipped.src,avatarSourcePath:equipped.sourcePath,avatarEffect:{special:equipped.special,effectColor:equipped.effectColor,saga:equipped.saga}}:{}),selectedIcon:equipped?raw.selectedIcon:'',role:uid===adminUid&&adminUid?'admin':raw.editorialPublisher===true?'publisher':'user',readPostsCount:count(raw.readPostsCount),followersCount:count(raw.followersCount),followingCount:count(raw.followingCount),createdAt:raw.createdAt?.toMillis?.()??(Number.isSafeInteger(raw.createdAt)?raw.createdAt:0),canChat:raw.canChat===true,isOnline:raw.isOnline===true,lastActiveAt:count(raw.lastActiveAt)};}
 async function execute(token,input){
  exact(input,['action','data']);
  if(input.action==='community-read'){if(!community)fail('community-unavailable');return community.read(input.data);}
  if(input.action==='community-write'){if(!community)fail('community-unavailable');return community.mutate(token,input.data);}
  if(input.action==='follow'){if(!follows)fail('follow-unavailable');return follows.execute(token,input.data);}
  if(input.action==='relations'){
   exact(input.data,['uid']);const uid=input.data.uid;if(!await getPublic(uid))return {followers:[],following:[],communities:[]};
   const read=async kind=>{const snap=await db.collection('users/'+uid+'/'+kind).limit(501).get();if(snap.docs.length>500)fail('relations-limit');return snap.docs.map(d=>({id:d.id,userId:typeof d.data().userId==='string'?d.data().userId:d.id,communityId:kind==='communities'?d.id:undefined,name:safePublicLabel(d.data().name,120)||'Usuario de Galaxia'}));};
   const [followers,following,communities]=await Promise.all(['followers','following','communities'].map(read));return {followers,following,communities};
  }
  if(['gachapon-prices','gachapon-prices-save','catalog','achievements','icon-save','icon-archive','achievements-save','equip-icon','reading-start','reading-claim'].includes(input.action)){if(!progress)fail('progress-unavailable');return progress.execute(token,input.action,input.data??{});}
  if(input.action==='redeem-icon'){if(!iconPurchases)fail('economy-unavailable');return iconPurchases.execute(token,input.data);}
  if(input.action==='public'){exact(input.data,['uid']);return getPublic(input.data.uid);}
  if(input.action==='directory'){const snap=await db.collection('users').limit(121).get();if(snap.docs.length>120)fail('directory-pagination-required');return {items:(await Promise.all(snap.docs.map(d=>getPublic(d.id)))).filter(Boolean)};}
  const user=await identity(token),ref=db.doc('users/'+user.uid);
  if(['admin-user-create','admin-user-update','admin-user-delete'].includes(input.action)){
   if(!adminUid||user.uid!==adminUid||!user.emailVerified)fail('authentication-denied');
   if(input.action==='admin-user-create'){
    exact(input.data,['name','email','password','description','canChat','emailOptIn']);const data=input.data;
    if(safePublicLabel(data.name,120)!==data.name||typeof data.email!=='string'||!/^\S+@\S+\.\S+$/.test(data.email)||data.email.length>254||typeof data.password!=='string'||data.password.length<6||data.password.length>128||typeof data.description!=='string'||data.description.length>2000||typeof data.canChat!=='boolean'||typeof data.emailOptIn!=='boolean')fail('invalid-profile-input');
    const created=await auth.createUser({email:data.email,password:data.password,displayName:data.name,emailVerified:false});
    try{await db.runTransaction(async tx=>{const target=db.doc('users/'+created.uid),old=await tx.get(target);if(old.exists)fail('profile-review-required');tx.create(target,{name:data.name,email:created.email||data.email,description:data.description,imageUrl:'',provider:'password',emailVerified:false,emailOptIn:data.emailOptIn,canChat:data.canChat,isBlocked:false,role:'user',editorialPublisher:false,stars:0,readPostsCount:0,unlockedIcons:['kirby-01'],selectedIcon:'kirby-01',legalAccepted:false,createdAt:clock(),updatedAt:clock()});});}catch{fail('account-created-profile-pending');}
    return {id:created.uid,created:true};
   }
   exact(input.data,input.action==='admin-user-delete'?['uid']:['uid','name','description','imageUrl','emailOptIn','canChat','isBlocked','blockReason','emailVerified']);const uid=input.data.uid;if(typeof uid!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(uid)||uid===adminUid&&input.action==='admin-user-delete')fail('invalid-profile-id');
   let target;try{target=await auth.getUser(uid);}catch{fail('profile-missing');}if(target.uid!==uid)fail('authentication-denied');
   if(input.action==='admin-user-delete'){
    await db.runTransaction(async tx=>{const r=db.doc('users/'+uid),old=await tx.get(r);if(!old.exists)fail('profile-missing');tx.set(r,{...old.data(),isBlocked:true,editorialPublisher:false,role:'user',deleted:true,updatedAt:clock()});tx.delete(db.doc('publicProfiles/'+uid));});try{await auth.deleteUser(uid);}catch{fail('account-partial-update');}return {id:uid,deleted:true};
   }
   const patch={...input.data};delete patch.uid;
   if(patch.name!==undefined&&safePublicLabel(patch.name,120)!==patch.name||patch.description!==undefined&&(typeof patch.description!=='string'||patch.description.length>2000)||patch.blockReason!==undefined&&(typeof patch.blockReason!=='string'||patch.blockReason.length>2000))fail('invalid-profile-input');
   for(const key of ['emailOptIn','canChat','isBlocked','emailVerified'])if(patch[key]!==undefined&&typeof patch[key]!=='boolean')fail('invalid-profile-input');
   if(patch.imageUrl!==undefined){if(typeof patch.imageUrl!=='string')fail('avatar-review-required');if(patch.imageUrl)editorialUrl(patch.imageUrl);}
   let authChanged=false;if(patch.emailVerified!==undefined&&patch.emailVerified!==target.emailVerified){authChanged=true;target=await auth.updateUser(uid,{emailVerified:patch.emailVerified});}delete patch.emailVerified;
   let result;try{result=await db.runTransaction(async tx=>{const r=db.doc('users/'+uid),old=await tx.get(r);if(!old.exists)fail('profile-missing');const next={...old.data(),...patch,email:target.email||'',emailVerified:target.emailVerified===true,updatedAt:clock()};tx.set(r,next);const projected=publicProfile(next);if(projected&&target.emailVerified)tx.set(db.doc('publicProfiles/'+uid),projected);else tx.delete(db.doc('publicProfiles/'+uid));return {id:uid,updated:true};});if(patch.isBlocked===true)await auth.revokeRefreshTokens(uid);return result;}catch(error){if(authChanged||result)fail('account-partial-update');throw error;}
  }
  if(input.action==='notify-interaction'){
   exact(input.data,['type','threadId','commentId']);const {type,threadId,commentId}=input.data;
   if(!['thread-like','thread-reply'].includes(type)||typeof threadId!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(threadId)||type==='thread-reply'&&(typeof commentId!=='string'||!/^[-a-zA-Z0-9_]{1,180}$/.test(commentId))||!user.emailVerified)fail('invalid-notification');
   return db.runTransaction(async tx=>{const [own,thread]=await tx.getAll(ref,db.doc('communityThreads/'+threadId));if(!own.exists||own.data().isBlocked!==false||!thread.exists)fail('authentication-denied');const raw=thread.data(),target=raw.authorId;if(typeof target!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(target))fail('invalid-notification');if(target===user.uid)return {delivered:false};let body='';
    if(type==='thread-like'){if(!Array.isArray(raw.likedBy)||!raw.likedBy.includes(user.uid))fail('invalid-notification');}
    else{const comment=(raw.comments||[]).find(c=>c.id===commentId&&c.authorId===user.uid);if(!comment)fail('invalid-notification');body=typeof comment.body==='string'?comment.body.slice(0,280):'';}
    const notice=db.doc('users/'+target+'/notifications/'+type+'_'+threadId+'_'+(type==='thread-reply'?String(commentId):user.uid));
    const [previous,recipient]=await tx.getAll(notice,db.doc('users/'+target));if(previous.exists||!recipient.exists)return {delivered:false};const name=safePublicLabel(own.data().name,120)||'Usuario de Galaxia';tx.create(notice,{type,title:type==='thread-like'?'Nuevo like en tu hilo':'Nueva respuesta en tu hilo',message:name+(type==='thread-like'?' le dio like a tu hilo.':' respondio: '+body),actorId:user.uid,actorName:name,targetId:threadId,targetType:'thread',read:false,createdAt:clock()});return {delivered:true};});
  }
  if(input.action==='get'){const doc=await ref.get();return {item:doc.exists?{...doc.data(),id:doc.id,role:user.uid===adminUid&&adminUid?'admin':doc.data().editorialPublisher===true&&doc.data().isBlocked===false?'publisher':'user'}:null,reviewRequired:doc.exists&&doc.data().isBlocked!==false};}
  if(!['ensure','update'].includes(input.action))fail('invalid-profile-action');
  const patch=input.data??{};exact(patch,['name','description','imageUrl','emailOptIn','socialLinks','legalAccepted','parentalConsentConfirmed','legalVersion']);
  if(patch.name!==undefined&&safePublicLabel(patch.name,120)!==patch.name)fail('invalid-profile-name');
  if(patch.description!==undefined&&(typeof patch.description!=='string'||patch.description.length>2000))fail('invalid-profile-description');
  for(const key of ['emailOptIn','legalAccepted','parentalConsentConfirmed'])if(patch[key]!==undefined&&typeof patch[key]!=='boolean')fail('invalid-profile-preference');
  if(patch.legalVersion!==undefined&&(typeof patch.legalVersion!=='string'||patch.legalVersion.length>100))fail('invalid-profile-preference');
  if(patch.imageUrl!==undefined&&(typeof patch.imageUrl!=='string'||patch.imageUrl&&canonicalAssetPath(patch.imageUrl)!==patch.imageUrl))fail('avatar-review-required');
  if(patch.socialLinks!==undefined)patch.socialLinks=links(patch.socialLinks);
  return db.runTransaction(async tx=>{
   const old=await tx.get(ref),raw=old.data();
   if(raw?.isBlocked!==false&&old.exists){if(input.action==='ensure')return {item:{id:user.uid,...raw},reviewRequired:true};fail('profile-review-required');}
   if(!old.exists&&input.action!=='ensure')fail('profile-missing');
   // Avatar selection is equipment, not a free URL write that could bypass inventory ownership.
   if(patch.imageUrl&&patch.imageUrl!==raw?.imageUrl)fail('avatar-equipment-required');
   if(!old.exists){const created=Date.parse(user.metadata?.creationTime);if(!Number.isFinite(created)||clock()-created>300000||patch.legalAccepted!==true||patch.parentalConsentConfirmed!==true||!patch.legalVersion)fail('profile-review-required');}
   // Existing economy is neither coerced, initialized again nor trusted as an authority.
   const next=old.exists?{...raw}:{name:safePublicLabel(user.displayName,120)||'Usuario de Galaxia',description:'lector',imageUrl:'',isBlocked:false,stars:0,readPostsCount:0,unlockedIcons:['kirby-01'],selectedIcon:'kirby-01',createdAt:clock(),legalAcceptedAt:clock()};
   if(!old.exists||input.action==='update')Object.assign(next,patch);
   next.email=user.email||'';next.emailVerified=user.emailVerified===true;next.provider=user.providerData?.[0]?.providerId||'password';next.updatedAt=clock();
   const projected=publicProfile(next);if(patch.imageUrl&&projected?.avatarUrl!==patch.imageUrl)fail('avatar-review-required');
   tx.set(ref,next);if(projected&&user.emailVerified)tx.set(db.doc('publicProfiles/'+user.uid),projected);else tx.delete(db.doc('publicProfiles/'+user.uid));
   return {item:{id:user.uid,...next}};
  });
 }
 return {execute};
}
