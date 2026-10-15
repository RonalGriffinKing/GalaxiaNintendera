// Single-owner editorial operations. Injected SDK interfaces permit offline unit tests.
import {createHash} from 'node:crypto';
import {projectEditorial,PUBLIC_EDITORIAL_FIELDS} from './contract.mjs';
import {createPageService} from '../pages.mjs';
import {originalSource,publicOriginal} from './legacy.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const id=value=>{if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(value))fail('invalid-id');return value;};
const fields=PUBLIC_EDITORIAL_FIELDS.filter(k=>!['publicSchemaVersion','revision','published','status','createdAt','updatedAt','publishedAt','authorName','authorId'].includes(k));
const exact=(object,keys)=>{if(!object||Object.getPrototypeOf(object)!==Object.prototype||Reflect.ownKeys(object).some(k=>typeof k!=='string'||!keys.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(object,k),'value')))fail('invalid-input');};
export function createEditorialService({db,auth,adminUid='',clock=Date.now}){
  const pages=createPageService({db,clock});
  async function identity(token){
    if(!adminUid.trim()||adminUid==='PENDING_OWNER_CONFIRMATION')fail('admin-not-configured');
    let claims,user;try{claims=await auth.verifyIdToken(token,true);user=await auth.getUser(claims.uid);}catch{fail('unauthorized');}
    if(user.uid!==claims.uid||user.disabled||!user.emailVerified||claims.email_verified!==true)fail('forbidden');
    if(user.uid===adminUid)return {uid:user.uid,role:'admin'};
    const profile=await db.doc('users/'+user.uid).get();
    return {uid:user.uid,role:profile.data()?.editorialPublisher===true&&profile.data()?.isBlocked===false?'publisher':'user'};
  }
  async function execute(token,input){
    const account=await identity(token),actor=account.uid,isAdmin=account.role==='admin';
    exact(input,['action','id','requestId','expectedRevision','data','targetStatus']);
    if(input.action==='access')return {role:account.role};
    if(account.role==='user')fail('forbidden');
    if(['pages-list','page-get','page-save','page-delete'].includes(input.action)){
      if(!isAdmin)fail('forbidden');
      if(input.action==='pages-list')return {items:await pages.list({admin:true})};
      const pageId=id(input.id);
      if(input.action==='page-get')return {item:(await pages.list({admin:true})).find(p=>p.id===pageId)??null};
      if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)fail('invalid-revision');
      return input.action==='page-save'?pages.save({...input,id:pageId}):pages.remove({...input,id:pageId});
    }
    if(input.action==='users'){
      if(!isAdmin)fail('forbidden');const snap=await db.collection('users').limit(201).get();if(snap.docs.length>200)fail('admin-list-limit');
      return {items:snap.docs.map(d=>{const raw=d.data();return {id:d.id,name:raw.name||'',email:raw.email||'',description:raw.description||'',imageUrl:raw.imageUrl||'',selectedIcon:raw.selectedIcon||'',selectedIconUrl:raw.selectedIconUrl||'',selectedIconEffect:raw.selectedIconEffect||{},emailVerified:raw.emailVerified===true,emailOptIn:raw.emailOptIn!==false,canChat:raw.canChat===true,blockReason:raw.blockReason||'',isBlocked:raw.isBlocked!==false,role:d.id===adminUid?'admin':raw.editorialPublisher===true?'publisher':'user'};})};
    }
    if(input.action==='publisher'){
      if(!isAdmin)fail('forbidden');exact(input.data,['enabled']);if(typeof input.data.enabled!=='boolean')fail('invalid-input');
      const uid=id(input.id);if(uid===adminUid)fail('forbidden');let target;try{target=await auth.getUser(uid);}catch{fail('forbidden');}
      if(target.uid!==uid||(input.data.enabled&&(target.disabled||!target.emailVerified)))fail('forbidden');
      const requestId=id(input.requestId),fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
      return db.runTransaction(async tx=>{const ref=db.doc('users/'+uid),receiptRef=db.doc('editorialRequests/'+requestId);const [profile,receipt]=await tx.getAll(ref,receiptRef);if(receipt.exists){if(receipt.data().actor!==actor||receipt.data().fingerprint!==fingerprint)fail('request-conflict');return receipt.data().result;}if(!profile.exists||(input.data.enabled&&profile.data().isBlocked!==false))fail('forbidden');const result={id:uid,role:input.data.enabled?'publisher':'user'};tx.set(ref,{...profile.data(),editorialPublisher:input.data.enabled,role:result.role});tx.create(receiptRef,{actor,fingerprint,result,time:clock()});return result;});
    }
    if(input.action==='list'){let query=db.collection('posts');if(!isAdmin)query=query.where('authorId','==',actor);const snap=await query.limit(201).get();if(snap.docs.length>200)fail('admin-list-limit');return {items:snap.docs.map(d=>({id:d.id,...d.data()})),limit:200};}
    if(input.action==='get'){const doc=await db.doc('posts/'+id(input.id)).get();if(doc.exists&&!isAdmin&&doc.data().authorId!==actor)fail('forbidden');return {item:doc.exists?{id:doc.id,...doc.data()}:null};}
    if(!isAdmin&&!['create','save'].includes(input.action))fail('forbidden');
    if(input.action==='categories'){
      exact(input.data,['items']);const items=input.data.items;
      if(!Array.isArray(items)||items.length>20||items.some(x=>typeof x!=='string'||!x.trim()||x.length>120))fail('invalid-input');
      const requestId=id(input.requestId),fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
      return db.runTransaction(async tx=>{const ref=db.doc('siteSettings/postCategories'),receiptRef=db.doc('editorialRequests/'+requestId);const [old,receipt]=await tx.getAll(ref,receiptRef);if(receipt.exists){if(receipt.data().fingerprint!==fingerprint)fail('request-conflict');return receipt.data().result;}const revision=(old.data()?.editorialRevision??0)+1,result={revision,state:'published'};tx.set(ref,{...old.data(),items,editorialRevision:revision});tx.set(db.doc('publicEditorialSettings/categories'),{publicSchemaVersion:1,items});tx.create(receiptRef,{actor,fingerprint,result});return result;});
    }
    if(!['create','save','approve','publish','withdraw','delete'].includes(input.action))fail('invalid-action');
    const postId=id(input.id),requestId=id(input.requestId),expected=input.expectedRevision;
    if(!Number.isSafeInteger(expected)||expected<0)fail('invalid-revision');
    const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return db.runTransaction(async tx=>{
      const sourceRef=db.doc('posts/'+postId),publicRef=db.doc('publicNews/'+postId),ledgerRef=db.doc('editorialPublication/'+postId),receiptRef=db.doc('editorialRequests/'+requestId);
      const [source,ledger,receipt,permission]=await tx.getAll(sourceRef,ledgerRef,receiptRef,db.doc('users/'+actor));
      if(!isAdmin&&(permission.data()?.editorialPublisher!==true||permission.data()?.isBlocked!==false))fail('forbidden');
      if(receipt.exists){if(receipt.data().fingerprint!==fingerprint||receipt.data().actor!==actor)fail('request-conflict');return receipt.data().result;}
      const old=source.data();
      if(!isAdmin&&source.exists&&(old.authorId!==actor||!['draft','pending'].includes(old.status)||ledger.data()?.state==='published'))fail('forbidden');
      if(input.action==='create'?(source.exists||ledger.exists):!source.exists)fail('source-conflict');
      if((old?.editorialRevision??0)!==expected)fail('revision-conflict');
      const revision=expected+1,now=clock();
      if(['withdraw','delete'].includes(input.action)){
        const result={id:postId,revision,state:input.action==='delete'?'deleted':'withdrawn'};
        if(input.action==='delete')tx.delete(sourceRef);else tx.set(sourceRef,{...old,status:'withdrawn',editorialRevision:revision,updatedAt:now});
        tx.delete(publicRef);tx.set(ledgerRef,{revision,state:result.state,actor,time:now});tx.create(receiptRef,{actor,fingerprint,result});return result;
      }
      let patch={};
      if(['create','save'].includes(input.action)){
        exact(input.data,isAdmin?[...fields,'starReward','rewardMultiplier','rewardBadges']:fields);patch=structuredClone(input.data);
        if(patch.starReward!==undefined&&(!Number.isSafeInteger(patch.starReward)||patch.starReward<0||patch.starReward>10000))fail('invalid-input');
        if(patch.rewardMultiplier!==undefined&&(!['string','number'].includes(typeof patch.rewardMultiplier)||!Number.isFinite(Number(patch.rewardMultiplier))||Number(patch.rewardMultiplier)<0||Number(patch.rewardMultiplier)>10))fail('invalid-input');
        if(patch.rewardBadges!==undefined&&(!Array.isArray(patch.rewardBadges)||patch.rewardBadges.length>50||patch.rewardBadges.some(v=>typeof v!=='string'||v.length>120)))fail('invalid-input');
        if(patch.placement==='news')patch.placement='feed';
        if(input.targetStatus!==undefined&&!['draft','pending'].includes(input.targetStatus))fail('invalid-status');
      }else if(input.data!==undefined)fail('invalid-input');
      const next={...old,...patch,editorialRevision:revision,createdAt:old?.createdAt??now,updatedAt:now,authorId:old?.authorId??actor,authorName:old?.authorName??'Redacción Galaxia Nintendera'};
      next.status=['approve','publish'].includes(input.action)?'approved':(input.targetStatus==='draft'?'draft':old?.status==='approved'?'approved':input.targetStatus==='pending'?'pending':old?.status??'draft');
      next.visibility??='public';
      if(!['public','unlisted','private'].includes(next.visibility))fail('invalid-input');
      if(source.exists&&(next.slug||postId)!==(old?.slug||postId))fail('slug-change-requires-review');
      // Validate content even when draft, private, future or expired. Reuse the D1 contract.
      for(const key of ['releaseAt','expiresAt'])if(next[key]!==undefined&&(!Number.isSafeInteger(next[key])||next[key]<0))fail('invalid-date');
      projectEditorial({...originalSource(postId,old??{}),...patch,status:'approved',visibility:'public',releaseAt:0,expiresAt:0},{revision,now});
      next.publishedAt=old?.publishedAt??now;
      const effectiveSlug=next.slug||postId,slugRef=db.doc('editorialSlugs/'+effectiveSlug);
      const [slug,collision,alias]=await tx.getAll(slugRef,db.doc('posts/'+effectiveSlug),db.doc('editorialSlugs/'+postId));
      if(slug.exists&&slug.data().postId!==postId||collision.exists&&collision.id!==postId||alias.exists&&alias.data().postId!==postId)fail('slug-conflict');
      const projected=next.status==='approved'?{state:projectEditorial(originalSource(postId,next),{revision,now}).state,document:publicOriginal(postId,next,now)}:{state:'withdrawn',document:null};
      tx.set(sourceRef,next);tx.set(slugRef,{postId});
      if(projected.document)tx.set(publicRef,projected.document);else tx.delete(publicRef);
      const result={id:postId,revision,state:next.status==='approved'?projected.state:next.status};
      tx.set(ledgerRef,{revision,state:result.state,actor,time:now});tx.create(receiptRef,{actor,fingerprint,result});return result;
    });
  }
  return {execute};
}
