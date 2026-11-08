// Redacted reads of existing collections: no projections, migrations or writes.
import { authorizedRole } from '../../../src/services/authorizedIdentity.js'
export const publicProfileFields = ['name','description','imageUrl','selectedIcon','selectedIconUrl','selectedIconEffect','socialLinks','createdAt','joinedAt','participationStars','readPostsCount','unlockedIcons','lastActiveAt','isOnline','isBlocked']
const string = (value, max=3000) => typeof value === 'string' ? value.slice(0,max) : ''
const millis = (value=0) => value?.toMillis?.() ?? (typeof value === 'number' ? value : value==null ? 0 : Number.isFinite(Number(value)) ? Number(value) : Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity)
const publicCache=new Map()
const PAGE_SIZE=50, MAX_RESPONSE_BYTES=3500000
function wireData(value) {
  if(value?.toMillis)return value.toMillis()
  if(Array.isArray(value))return value.map(wireData)
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,wireData(item)]))
  return value
}
export function publicProfile(id, data) {
  if (!data || data.isBlocked) return null
  const effect=data.selectedIconEffect || {}, links=data.socialLinks || {}
  const publicLinks={}
  for(const key of ['tiktok','youtube','twitch','nintendoPresence','nintendoProfile']) if(typeof links[key]==='string')publicLinks[key]=string(links[key])
  if(links.xbox && typeof links.xbox==='object')publicLinks.xbox={xuid:string(links.xbox.xuid,30),gamertag:string(links.xbox.gamertag,80)}
  const name=string(data.name,120)
  return {id,name:name&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)?name:'Usuario',description:string(data.description,2000),imageUrl:string(data.imageUrl),selectedIcon:string(data.selectedIcon,200),selectedIconUrl:string(data.selectedIconUrl),selectedIconEffect:{special:Boolean(effect.special),effectColor:string(effect.effectColor,30),saga:string(effect.saga,80)},socialLinks:publicLinks,createdAt:millis(data.createdAt||data.joinedAt),participationStars:Number.isSafeInteger(data.participationStars)?Math.max(0,data.participationStars):0,readPostsCount:Number.isSafeInteger(data.readPostsCount)?Math.max(0,data.readPostsCount):0,unlockedIcons:Array.isArray(data.unlockedIcons)?data.unlockedIcons.filter(value=>typeof value==='string').slice(0,2000):['kirby-01'],isOnline:Boolean(data.isOnline),lastActiveAt:millis(data.lastActiveAt),role:authorizedRole(id)}
}
export function visiblePublicContent(collection, data, now=Date.now()) {
  if(collection==='posts')return data.status==='approved' && ['public','unlisted'].includes(data.visibility||'public') && millis(data.releaseAt??data.scheduledAt??0)<=now
  if(collection==='sitePages')return data.status==='published' && (data.visibility||'public')==='public'
  if(collection==='galaxyEvents')return !['draft','private'].includes(data.status) && (data.visibility||'public')==='public'
  return false
}
export function createPublicContentHandler(db, verify) {
  return async event => {
    const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)})
    if(event.httpMethod!=='GET')return reply(405,{error:'read-only'})
    const {collection,id,cursor}=event.queryStringParameters||{}
    if(!['users','posts','galaxyEvents','sitePages'].includes(collection) || [id,cursor].some(value=>value && !/^[^/]{1,200}$/.test(value)))return reply(400,{error:'invalid-query'})
    try {
      let viewer=''
      const token=(event.headers?.authorization||event.headers?.Authorization||'').match(/^Bearer (\S+)$/)?.[1]
      if(token && verify){try{viewer=(await verify(token)).uid}catch{return reply(401,{error:'invalid-token'})}}
      const key=[collection,id||'',cursor||'',collection==='galaxyEvents'?viewer:''].join(':')
      const cached=publicCache.get(key)
      if(cached && cached.db===db && Date.now()-cached.at<15000)return reply(200,cached.value)
      let snapshot
      if(id){const item=await db.doc(`${collection}/${id}`).get();snapshot={docs:item.exists?[item]:[]}}
      else {
        let query=db.collection(collection).orderBy('__name__').limit(PAGE_SIZE)
        if(collection==='users')query=query.select(...publicProfileFields)
        if(cursor)query=query.startAfter(cursor)
        snapshot=await query.get()
      }
      let bytes=0,lastScanned=cursor||'',truncated=false
      const docs=[]
      for(const item of snapshot.docs){
        const data=item.data()
        let result
        if(collection==='users')result=publicProfile(item.id,data)
        else if(visiblePublicContent(collection,data) && (id || collection!=='posts' || data.visibility!=='unlisted'))result={...wireData(data),id:item.id}
        if(!result){lastScanned=item.id;continue}
        // Reminder participants are not a public directory of personal preferences.
        if(collection==='galaxyEvents')result.notifyBy=viewer&&Array.isArray(data.notifyBy)&&data.notifyBy.includes(viewer)?[viewer]:[]
        const size=Buffer.byteLength(JSON.stringify(result))
        if(!id && bytes+size>MAX_RESPONSE_BYTES){truncated=true;break}
        bytes+=size;docs.push(result);lastScanned=item.id
      }
      const value={docs,nextCursor:!id&&(truncated||snapshot.docs.length===PAGE_SIZE)?lastScanned:null}
      if(publicCache.size>=20)publicCache.delete(publicCache.keys().next().value)
      publicCache.set(key,{db,at:Date.now(),value})
      return reply(200,value)
    }catch{return reply(503,{error:'public-content-unavailable'})}
  }
}
