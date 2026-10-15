import {projectEditorial,PUBLIC_EDITORIAL_FIELDS,EditorialError} from './contract.mjs';
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export function validatePublicEditorial(data,now){
 if(!data||Object.getPrototypeOf(data)!==Object.prototype||Object.keys(data).some(k=>!PUBLIC_EDITORIAL_FIELDS.includes(k))||data.publicSchemaVersion!==1||data.published!==true)throw new EditorialError('public-contract-invalid');
 const result=projectEditorial(data,{now,revision:data.revision});
 if(!result.document||canonical(result.document)!==canonical(data))throw new EditorialError('public-contract-invalid');
 return result.document;
}
