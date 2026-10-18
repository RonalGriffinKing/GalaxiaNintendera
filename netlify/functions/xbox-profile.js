import {cleanGamertag,validXuid,findExactXboxPlayer,xboxProfilePerson,normalizeXboxIdentity} from '../../src/services/xboxIdentity.js'
const API='https://api.xbl.io/v2'
const FIREBASE_KEY=process.env.FIREBASE_API_KEY||'AIzaSyCIjX5wXqFS5nWj6u13bnVDq2PSFNjhZhA'
const PROJECT=process.env.FIREBASE_PROJECT_ID||'widget-dreams'
const cache=new Map(),pending=new Map(),searches=new Map()
const TTL=300000
let blockedUntil=0
class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization','Access-Control-Allow-Methods':'GET, OPTIONS','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)})
async function readJson(response){
 const reader=response.body.getReader(),decoder=new TextDecoder();let text='',size=0
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576){await reader.cancel();throw Error('size')}text+=decoder.decode(value,{stream:true})}text+=decoder.decode()}finally{reader.releaseLock()}
 return JSON.parse(text)
}
function boundedSet(map,key,value){if(map.size>=300)map.delete(map.keys().next().value);map.set(key,value)}
async function cached(key,load){const hit=cache.get(key);if(hit?.until>Date.now())return hit.value;if(pending.has(key))return pending.get(key);const request=load().then(value=>{boundedSet(cache,key,{value,until:Date.now()+TTL});return value}).finally(()=>pending.delete(key));pending.set(key,request);return request}
async function openxbl(path){
 if(Date.now()<blockedUntil)throw new ApiError(429,'Xbox ha alcanzado su límite de consultas. Inténtalo más tarde.')
 const response=await fetch(API+path,{headers:{'X-Authorization':process.env.OPENXBL_API_KEY,Accept:'application/json','Accept-Language':'es-ES'},redirect:'error',signal:AbortSignal.timeout(8000)})
 if(response.status===429){const seconds=Number(response.headers.get('retry-after'));blockedUntil=Date.now()+(Number.isFinite(seconds)&&seconds>0?Math.min(seconds,3600):300)*1000;throw new ApiError(429,'Xbox ha alcanzado su límite de consultas. Inténtalo más tarde.')}
 if(response.status===401)throw new ApiError(503,'La conexión de Xbox necesita revisión en el servidor.')
 if(response.status===403)throw new ApiError(403,'Xbox no permite acceder a estos datos.')
 if(response.status===404)throw new ApiError(404,'No se encontró el perfil de Xbox.')
 if(!response.ok)throw new ApiError(502,'OpenXBL no está disponible temporalmente.')
 const data=await readJson(response)
 if(Number(data.code)>=400)throw new ApiError(Number(data.code)===429?429:502,'OpenXBL no pudo devolver estos datos.')
 return data
}
async function identity(person){return cached('xuid:game-achievements-v1:'+person.xuid,async()=>{
 const results=await Promise.allSettled([openxbl('/presence/'+person.xuid),cached('titles:'+person.xuid,()=>openxbl('/titles/'+person.xuid))])
 const authFailure=results.find(result=>result.status==='rejected'&&result.reason.status===503)
 if(authFailure)throw authFailure.reason
 const value=normalizeXboxIdentity(person,...results.map(result=>result.status==='fulfilled'?result.value:null))
 value.unavailable=results.flatMap((result,index)=>result.status==='rejected'?[index===0?'presence':'history']:[])
 return value
})}
export async function handler(event){
 if(event.httpMethod==='OPTIONS')return json(204,{})
 if(event.httpMethod!=='GET')return json(405,{error:'Método no permitido.'})
 const params=event.queryStringParameters||{}
 if(Object.keys(params).some(key=>!['gamertag','uid','diagnostic'].includes(key))||Boolean(params.gamertag)===Boolean(params.uid))return json(400,{error:'Consulta Xbox no válida.'})
 if(params.diagnostic!==undefined&&(params.diagnostic!=='images'||!params.uid||params.gamertag))return json(400,{error:'Diagnostico no valido.'})
 if(!process.env.OPENXBL_API_KEY)return json(503,{error:'La conexión de Xbox todavía no está disponible.'})
 const token=(event.headers?.authorization||event.headers?.Authorization||'').match(/^Bearer ([A-Za-z0-9_.-]{20,5000})$/)?.[1]
 try{
  if(params.gamertag){
   let tag;try{tag=cleanGamertag(params.gamertag)}catch(error){return json(400,{error:error.message})}
   if(!token)return json(401,{error:'Inicia sesión para vincular Xbox.'})
   const authResponse=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),redirect:'error',signal:AbortSignal.timeout(8000)})
   if(!authResponse.ok)throw new ApiError(401,'Tu sesión ha caducado. Vuelve a iniciar sesión.')
   const user=(await readJson(authResponse)).users?.[0]
   if(!user?.localId||user.disabled)throw new ApiError(401,'Inicia sesión para vincular Xbox.')
   const result=await cached('search:'+tag.toLocaleLowerCase('en-US'),async()=>{
    const bucket=searches.get(user.localId);const current=bucket?.until>Date.now()?bucket:{count:0,until:Date.now()+3600000}
    if(current.count>=6)throw new ApiError(429,'Has realizado varias búsquedas de Xbox. Inténtalo más tarde.')
    current.count++;boundedSet(searches,user.localId,current)
    const person=findExactXboxPlayer(await openxbl('/search/'+encodeURIComponent(tag)),tag)
    if(!person)throw new ApiError(404,'No se encontró una coincidencia exacta. Comprueba el gamertag y su #sufijo.')
    return identity(person)
   })
   return json(200,result)
  }
  if(typeof params.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(params.uid))return json(400,{error:'Perfil no válido.'})
  if(params.diagnostic){
   if(!token)throw new ApiError(401,'Inicia sesion para revisar tu Xbox.')
   const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),redirect:'error',signal:AbortSignal.timeout(8000)})
   if(!response.ok)throw new ApiError(401,'Tu sesion ha caducado.')
   const user=(await readJson(response)).users?.[0]
   if(!user?.localId||user.disabled||user.localId!==params.uid)throw new ApiError(403,'Solo puedes revisar tu propia vinculacion.')
  }
  const result=await (async()=>{
   const response=await fetch('https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(PROJECT)+'/databases/(default)/documents/users/'+encodeURIComponent(params.uid)+'?key='+FIREBASE_KEY,{headers:token?{Authorization:'Bearer '+token}:{},redirect:'error',signal:AbortSignal.timeout(8000)})
   if(!response.ok)throw new ApiError(response.status===403?403:404,'No se puede acceder a la vinculación pública de Xbox.')
   const document=await readJson(response),xuid=document.fields?.socialLinks?.mapValue?.fields?.xbox?.mapValue?.fields?.xuid?.stringValue
   if(!validXuid(xuid))throw new ApiError(404,'Este perfil no tiene Xbox vinculado.')
   if(params.diagnostic){
    const payload=await cached('titles:'+xuid,()=>openxbl('/titles/'+xuid))
    const content=payload?.content??payload
    if(content?.xuid&&content.xuid!==xuid)throw new ApiError(502,'El historial no corresponde al perfil.')
    const titles=(Array.isArray(content?.titles)?content.titles:[]).filter(title=>title.type==='Game'&&title.titleHistory?.visible!==false)
    const hasImage=title=>{try{return new URL(title.displayImage).protocol==='https:'}catch{return false}}
    const sanitize=(value,depth=0)=>{if(depth>8)return '[truncated]';if(Array.isArray(value))return value.slice(0,30).map(item=>sanitize(item,depth+1));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,100).filter(([key])=>!/(token|secret|authorization|password|api.?key)/i.test(key)).map(([key,item])=>[key,sanitize(item,depth+1)]));return typeof value==='string'?value.slice(0,4000):value}
    return {diagnostic:'images',titleCount:titles.length,responseFields:Object.keys(content||{}),withImage:titles.find(hasImage)?sanitize(titles.find(hasImage)):null,withoutImage:titles.find(title=>!hasImage(title))?sanitize(titles.find(title=>!hasImage(title))):null}
   }
   const hit=cache.get('xuid:'+xuid);if(hit?.until>Date.now())return hit.value
   const person=await cached('person:'+xuid,async()=>{
    const value=xboxProfilePerson(await openxbl('/account/'+xuid),xuid)
    if(!value)throw new ApiError(404,'No se encontró el perfil de Xbox.')
    return value
   })
   return identity(person)
  })()
  return json(200,result)
 }catch(error){return json(error instanceof ApiError?error.status:502,{error:error instanceof ApiError?error.message:'No se pudo consultar Xbox. Inténtalo de nuevo.'})}
}
