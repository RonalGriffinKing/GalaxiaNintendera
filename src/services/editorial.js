import {apiUrl} from './appEnvironment'
import {createEditorialTransport} from '../../security/editorial/transport.mjs';
import {createEditorialQueries} from '../../security/editorial/queries.mjs';
import {PUBLIC_EDITORIAL_FIELDS} from '../../security/editorial/contract.mjs';
import {ADMIN_UID} from '../../security/editorial/config.mjs';
export const isEditorialOwner=user=>Boolean(ADMIN_UID&&user?.uid===ADMIN_UID);
const report=error=>{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('editorial-error',{detail:'No se pudo completar la operación editorial. '+(error.code||'error-de-conexion')}));throw error;};
async function request(operation,input,token){
 try{
  const response=await fetch(apiUrl('/.netlify/functions/editorial'),{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({operation,input}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  const payload=await response.json();if(!response.ok)throw Object.assign(new Error('Operación editorial rechazada'),{code:payload.error?.code||'editorial-unavailable'});return payload.result;
 }catch(error){return report(error);}
}
export const publicPages=async input=>(await request('pages',input??{})).items;
// Existing typed transport uses the ordinary editorial endpoint.
const reader=createEditorialTransport({fetchImpl:async url=>{const params=new URL(url).searchParams;const result=await request(params.get('operation'),JSON.parse(params.get('input')));return new Response(JSON.stringify({result}),{headers:{'content-type':'application/json'}});}});
export const editorialQueries=createEditorialQueries(reader);
export async function manageEditorial(user,input){
 if(!user)return report(Object.assign(new Error('Sesion requerida'),{code:'unauthorized'}));
 const result=await request('manage',input,await user.getIdToken());
 for(const [key,value] of pendingOperations)if(value===input)pendingOperations.delete(key);
 return result;
}
export async function editorialRole(user){if(!user)return 'user';try{return (await manageEditorial(user,{action:'access'})).role;}catch{return 'user';}}
export function editorialFormData(form,{includeRewards=false}={}){
 const excluded=['publicSchemaVersion','revision','published','status','createdAt','updatedAt','publishedAt','authorName','authorId'];
 return Object.fromEntries([...PUBLIC_EDITORIAL_FIELDS,...(includeRewards?['starReward','rewardMultiplier','rewardBadges']:[])].filter(k=>!excluded.includes(k)&&Object.hasOwn(form,k)).map(k=>[k,form[k]]));
}
const pendingOperations=new Map();
export const editorialOperation=(action,post,data,targetStatus)=>{
 const key=JSON.stringify({action,id:post?.id,revision:post?.editorialRevision??0,data,targetStatus});
 if(!pendingOperations.has(key))pendingOperations.set(key,{action,id:post?.id||crypto.randomUUID(),expectedRevision:post?.editorialRevision??0,requestId:crypto.randomUUID(),...(data?{data}:{}),...(targetStatus?{targetStatus}:{})});
 return pendingOperations.get(key);
};
