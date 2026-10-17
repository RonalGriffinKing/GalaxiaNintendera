// Navigation cache only: no localStorage, credentials or user-specific read marks.
const entries=new Map(),pending=new Map()
let generation=0
export const PUBLIC_PAGE_TTL=30000
export const peekPublicPage=key=>entries.get(key)?.value
export const isPublicPageFresh=(key,now=Date.now())=>entries.has(key)&&now-entries.get(key).at<PUBLIC_PAGE_TTL
export function storePublicPage(key,value,now=Date.now()) {
 entries.delete(key);entries.set(key,{value,at:now})
 if(entries.size>120)entries.delete(entries.keys().next().value)
 return value
}
export function requestPublicPage(key,loader) {
 if(isPublicPageFresh(key))return Promise.resolve(peekPublicPage(key))
 if(pending.has(key))return pending.get(key)
 const version=generation
 const request=Promise.resolve().then(loader).then(value=>version===generation?storePublicPage(key,value):value).finally(()=>{if(pending.get(key)===request)pending.delete(key)})
 pending.set(key,request)
 return request
}
export function clearPublicPageCache(){generation++;entries.clear();pending.clear()}
