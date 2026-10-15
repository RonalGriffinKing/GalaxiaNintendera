import {validatePublicEditorial} from './public-validator.mjs';

export class EditorialReadError extends Error { constructor(code) { super(code); this.code=code; } }
const fail=code=>{throw new EditorialReadError(code);};
const exact=(value,keys)=>{if(!value || Object.getPrototypeOf(value)!==Object.prototype || Object.keys(value).some(key=>!keys.includes(key)))fail('invalid-response');};
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}$/.test(value);
function row(value,now){
  exact(value,['id','data','cursor']); if(!validId(value.id))fail('invalid-response');
  const data=validatePublicEditorial(value.data,now);exact(value.cursor,['id','releaseAt','createdAt','asOf']);
  if(value.cursor.id!==value.id || value.cursor.releaseAt!==data.releaseAt || value.cursor.createdAt!==data.createdAt || !Number.isSafeInteger(value.cursor.asOf) || value.cursor.asOf<0 || value.cursor.asOf>now)fail('invalid-response');
  return {id:value.id,data,cursor:{...value.cursor}};
}
export function createEditorialTransport({fetchImpl=globalThis.fetch,origin='https://editorial.invalid',clock=Date.now}={}){
  if(typeof fetchImpl!=='function')fail('local-configuration-denied');
  return {async read(operation,input={}){
    if(!['page','article','categories'].includes(operation))fail('invalid-request');
    exact(input,operation==='page'?['direction','size','after','category']:operation==='article'?['value']:[]);
    if(operation==='article'&&!validId(input.value))fail('invalid-request');
    if(operation==='page'&&((input.size!==undefined&&(!Number.isSafeInteger(input.size)||input.size<1||input.size>100))||(input.direction!==undefined&&!['asc','desc'].includes(input.direction))||(input.category!==undefined&&(typeof input.category!=='string'||input.category.length>120))))fail('invalid-request');
    const url=new URL('/__editorial/read',origin);url.searchParams.set('operation',operation);url.searchParams.set('input',JSON.stringify(input));
    if(url.href.length>5000)fail('invalid-request');
    let response;try{response=await fetchImpl(url.href,{cache:'no-store',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(10000)});}catch{fail('network-error');}
    if(!response.ok){let permission=false;if(response.status===400){try{const body=await response.json();permission=body?.error?.code==='permission-denied';}catch{}}fail([401,403].includes(response.status)||permission?'authorization-error':response.status>=500?'reader-unavailable':'reader-error');}
    let payload;try{if(!response.headers.get('content-type')?.includes('application/json'))fail('invalid-response');const text=await response.text();if(text.length>1500000)fail('invalid-response');payload=JSON.parse(text);exact(payload,['result']);if(!Object.hasOwn(payload,'result'))fail('invalid-response');}catch{fail('invalid-response');}
    try{
      const now=clock(),result=payload.result;
      if(operation==='article')return result===null?null:row(result,now);
      if(operation==='categories'){if(result===null)return null;exact(result,['publicSchemaVersion','items']);if(result.publicSchemaVersion!==1||!Array.isArray(result.items)||result.items.length>20||result.items.some(x=>typeof x!=='string'||!x.trim()||x.length>120))fail('invalid-response');return {publicSchemaVersion:1,items:[...result.items]};}
      exact(result,['rows','asOf']);if(!Array.isArray(result.rows)||result.rows.length>(input.size??20)||!Number.isSafeInteger(result.asOf)||result.asOf<0||result.asOf>now)fail('invalid-response');
      const rows=result.rows.map(value=>row(value,now));if(new Set(rows.map(x=>x.id)).size!==rows.length||rows.some(x=>x.cursor.asOf!==result.asOf||x.data.visibility!=='public'))fail('invalid-response');return {rows,asOf:result.asOf};
    }catch{fail('invalid-response');}
  }};
}
