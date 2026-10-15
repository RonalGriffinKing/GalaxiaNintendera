import {EditorialError} from './contract.mjs';
import {publicOriginal} from './legacy.mjs';
import {createPageService} from '../pages.mjs';
const fail=code=>{throw new EditorialError(code)};
const id=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}$/.test(value))fail('invalid-public-id');return value};
const exact=(v,keys)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail('invalid-read-input')};
export function createPublicEditorialReader({db,clock=Date.now}){
 const pages=createPageService({db,clock});
 const wrap=(doc,now)=>{const data=publicOriginal(doc.id,doc.data(),now);return data?{id:doc.id,data,cursor:{id:doc.id,releaseAt:data.releaseAt,createdAt:data.createdAt,asOf:now}}:null};
 async function page(input={}){
  exact(input,['direction','size','after','category']);const direction=input.direction??'desc',size=input.size??20;
  if(!['asc','desc'].includes(direction)||!Number.isSafeInteger(size)||size<1||size>100||input.category!==undefined&&(typeof input.category!=='string'||input.category.length>120))fail('invalid-read-input');
  let now=clock();if(input.after){exact(input.after,['id','releaseAt','createdAt','asOf']);id(input.after.id);for(const k of ['releaseAt','createdAt','asOf'])if(!Number.isSafeInteger(input.after[k])||input.after[k]<0)fail('invalid-cursor');if(input.after.asOf>now)fail('invalid-cursor');now=input.after.asOf;}
  const snapshot=await db.collection('posts').limit(501).get();if(snapshot.docs.length>500)fail('public-page-budget-exceeded');
  let rows=snapshot.docs.map(d=>wrap(d,now)).filter(r=>r&&r.data.visibility==='public'&&(!input.category||r.data.categories.includes(input.category)||r.data.category===input.category));
  const order=(a,b)=>{const n=a.releaseAt-b.releaseAt||a.createdAt-b.createdAt||(a.id<b.id?-1:a.id>b.id?1:0);return direction==='asc'?n:-n};
  rows.sort((a,b)=>order(a.cursor,b.cursor));if(input.after)rows=rows.filter(r=>order(r.cursor,input.after)>0);return {rows:rows.slice(0,size),asOf:now};
 }
 async function article(input){exact(input,['value']);const value=id(input.value),now=clock();let doc=await db.doc('posts/'+value).get();if(!doc.exists){const snap=await db.collection('posts').where('slug','==',value).limit(2).get();if(snap.docs.length>1)fail('ambiguous-public-slug');doc=snap.docs[0];}return doc?.exists?wrap(doc,now):null;}
 async function categories(input={}){exact(input,[]);let doc=await db.doc('siteSettings/postCategories').get();if(!doc.exists)doc=await db.doc('publicEditorialSettings/categories').get();if(!doc.exists)return null;const items=doc.data().items;if(!Array.isArray(items)||items.length>20||items.some(x=>typeof x!=='string'||!x.trim()||x.length>120))fail('public-contract-invalid');return {publicSchemaVersion:1,items};}
 async function read(operation,input){if(operation==='pages'){exact(input??{},['slug']);if(input?.slug!==undefined)id(input.slug);return {items:await pages.list({slug:input?.slug})};}if(!['page','article','categories'].includes(operation))fail('invalid-read-operation');return {page,article,categories}[operation](input);}
 return {read,page,article,categories,close:async()=>{}};
}
