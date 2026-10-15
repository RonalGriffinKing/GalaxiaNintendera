import {DEFAULT_GACHAPON_PRICES,validateGachaponPrices} from '../src/components/profile/gachapon/prices.js';
import builtins from './builtin-icons.json' with {type:'json'};
import {editorialUrl} from './editorial/contract.mjs';
import {publicOriginal} from './editorial/legacy.mjs';
export const builtinIcon=id=>builtins.find(i=>i.id===id);
const fail=code=>{throw Object.assign(new Error(code),{code})};
const exact=(v,keys)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail('invalid-progress-input')};
const identifier=v=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(v))fail('invalid-progress-input');return v};
export const publicIcon=(id,raw)=>({id,name:typeof raw.name==='string'?raw.name.slice(0,120):'Icono',saga:typeof raw.saga==='string'?raw.saga.slice(0,80):'Especiales',src:editorialUrl(raw.src||raw.imageUrl||''),cost:raw.cost,visible:raw.visible!==false,archived:raw.archived===true,special:raw.special===true,effectColor:/^#[0-9a-f]{6}$/i.test(raw.effectColor||'')?raw.effectColor:'#a855f7',rarity:['common','rare','epic','legendary','normal'].includes(raw.rarity)?raw.rarity:'normal',builtIn:!!builtinIcon(id),sourcePath:builtinIcon(id)?.sourcePath||''});
export function createProgressService({db,auth,adminUid,clock=Date.now}){
 async function identity(token){let user;try{const claims=await auth.verifyIdToken(token,true);user=await auth.getUser(claims.uid);if(claims.uid!==user.uid||user.disabled||!user.emailVerified)fail('authentication-denied');}catch{fail('authentication-denied');}return user;}
 async function catalog(){const snap=await db.collection('profileIcons').limit(1001).get();if(snap.docs.length>1000)fail('catalog-limit');const map=new Map(builtins.map(i=>[i.id,publicIcon(i.id,i)]));for(const doc of snap.docs)map.set(doc.id,publicIcon(doc.id,doc.data()));return [...map.values()];}
 async function execute(token,action,input={}){
  if(action==='catalog'){exact(input,['includeHidden']);if(input.includeHidden!==undefined&&typeof input.includeHidden!=='boolean')fail('invalid-progress-input');let admin=false;if(input.includeHidden){admin=(await identity(token)).uid===adminUid;if(!admin)fail('forbidden');}return {items:(await catalog()).filter(icon=>admin||icon.visible&&!icon.archived)};}
  if(action==='gachapon-prices'){exact(input,[]);const doc=await db.doc('siteSettings/gachaponPrices').get();return {prices:doc.exists?validateGachaponPrices(doc.data()):{...DEFAULT_GACHAPON_PRICES}};}
  if(action==='achievements'){exact(input,[]);const doc=await db.doc('siteConfig/profileAchievements').get();return {items:doc.exists?validateAchievements(doc.data().items):null};}
  const user=await identity(token),ref=db.doc('users/'+user.uid);
  if(['icon-save','icon-archive','achievements-save','gachapon-prices-save'].includes(action)){
   if(user.uid!==adminUid||!adminUid)fail('forbidden');
   if(action==='gachapon-prices-save'){exact(input,['normal','epic']);const prices=validateGachaponPrices(input);return db.runTransaction(async tx=>{const r=db.doc('siteSettings/gachaponPrices'),old=await tx.get(r);tx.set(r,{...old.data(),...prices,updatedAt:clock()});return {prices};});}
   if(action==='achievements-save'){exact(input,['items']);const items=validateAchievements(input.items);return db.runTransaction(async tx=>{const r=db.doc('siteConfig/profileAchievements'),old=await tx.get(r);tx.set(r,{...old.data(),items,updatedAt:clock()});return {items};});}
   exact(input,action==='icon-archive'?['id','archived']:['id','data']);const id=identifier(input.id),r=db.doc('profileIcons/'+id);
   if(action==='icon-archive'&&typeof input.archived!=='boolean')fail('invalid-progress-input');
   let value;if(action==='icon-save'){exact(input.data,['name','saga','src','cost','visible','special','effectColor','rarity','sourcePath','imageUrl','builtIn']);value=publicIcon(id,input.data);if(!Number.isSafeInteger(value.cost)||value.cost<0||value.cost>1000000)fail('invalid-cost');}
   return db.runTransaction(async tx=>{const old=await tx.get(r);if(action==='icon-archive'&&!old.exists&&!builtinIcon(id))fail('unavailable-icon');const next=action==='icon-archive'?{...builtinIcon(id),...old.data(),archived:input.archived,updatedAt:clock()}:{...old.data(),...value,createdAt:old.data()?.createdAt??clock(),updatedAt:clock()};tx.set(r,next);return publicIcon(id,next);});
  }
  if(action==='equip-icon'){
   exact(input,['iconId']);const iconId=identifier(input.iconId);return db.runTransaction(async tx=>{const [profile,doc]=await tx.getAll(ref,db.doc('profileIcons/'+iconId));const raw=profile.data();if(!profile.exists||raw.isBlocked!==false)fail('profile-review-required');if(!Array.isArray(raw.unlockedIcons)||!raw.unlockedIcons.includes(iconId))fail('icon-not-owned');const source=doc.exists?doc.data():builtinIcon(iconId);if(!source)fail('unavailable-icon');const icon=publicIcon(iconId,source);const next={...raw,selectedIcon:iconId,selectedIconUrl:icon.src,selectedIconEffect:{special:icon.special,effectColor:icon.effectColor,saga:icon.saga},updatedAt:clock()};tx.set(ref,next);return {selectedIcon:iconId,selectedIconUrl:icon.src,selectedIconEffect:next.selectedIconEffect};});
  }
  if(!['reading-start','reading-claim'].includes(action))fail('invalid-progress-action');exact(input,['postId']);const postId=identifier(input.postId),readRef=db.doc('users/'+user.uid+'/readPosts/'+postId);
  return db.runTransaction(async tx=>{
   const [profile,post,read]=await tx.getAll(ref,db.doc('posts/'+postId),readRef);const raw=profile.data(),article=post.data(),now=clock();
   if(!profile.exists||raw.isBlocked!==false)fail('profile-review-required');if(!post.exists)fail('article-not-rewardable');const publicPost=publicOriginal(postId,article,now);if(!publicPost||publicPost.placement==='hero'||publicPost.isMainEntry===true)fail('article-not-rewardable');
   const ledger=read.data();if(read.exists&&(ledger.awarded===true||ledger.startedAt===undefined))return {awarded:false,alreadyAwarded:true};
   const reward=article.starReward??10,multiplier=Number(article.rewardMultiplier??1);if(!Number.isSafeInteger(reward)||reward<0||reward>10000||!Number.isFinite(multiplier)||multiplier<0||multiplier>10)fail('invalid-reward-config');const amount=Math.round(reward*multiplier);
   if(action==='reading-start'){if(!read.exists)tx.create(readRef,{postId,startedAt:now,awarded:false});return {awarded:false,readyAt:(ledger?.startedAt??now)+30000,rewardStars:amount};}
   if(!read.exists||!Number.isSafeInteger(ledger.startedAt)||ledger.startedAt>now-30000)fail('reading-delay-required');
   if(!Number.isSafeInteger(raw.stars)||raw.stars<0||!Number.isSafeInteger(raw.readPostsCount)||raw.readPostsCount<0||!Number.isSafeInteger(raw.stars+amount))fail('economy-review-required');
   tx.set(ref,{...raw,stars:raw.stars+amount,readPostsCount:raw.readPostsCount+1,updatedAt:now});tx.set(readRef,{...ledger,postId,title:article.title||'',category:article.category||'',stars:amount,readAt:now,awarded:true});return {awarded:true,awardedStars:amount,stars:raw.stars+amount,readPostsCount:raw.readPostsCount+1};
  });
 }
 return {execute,catalog};
}
function validateAchievements(items){if(!Array.isArray(items)||items.length>100)fail('invalid-achievements');const seen=new Set();return items.map(item=>{exact(item,['id','label','description','type','target','reads','iconUrl']);const id=identifier(item.id);if(seen.has(id))fail('invalid-achievements');seen.add(id);if(typeof item.label!=='string'||!item.label.trim()||item.label.length>160||typeof item.description!=='string'||item.description.length>2000||!['reads','posts','communities','months','icons','followers'].includes(item.type||'reads'))fail('invalid-achievements');const target=item.target??item.reads;if(!Number.isSafeInteger(target)||target<1||target>1000000)fail('invalid-achievements');return {id,label:item.label,description:item.description,type:item.type||'reads',target,reads:target,iconUrl:editorialUrl(item.iconUrl||'')};});}
