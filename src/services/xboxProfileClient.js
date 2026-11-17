import {auth} from '@/firebase'

import {cleanGamertag} from './xboxIdentity'
import {backendRequest} from './backendClient'
const cache=new Map()
export function clearXboxProfileCache(uid){for(const key of cache.keys())if(key.startsWith('profile:'+uid+':'))cache.delete(key)}
export async function fetchXboxProfile({gamertag,uid}){
 const user=auth.currentUser
 if(gamertag&&!user)throw Error('Inicia sesión para vincular Xbox.')
 const query=gamertag?'gamertag='+encodeURIComponent(cleanGamertag(gamertag)):'uid='+encodeURIComponent(uid)
 const key=(gamertag?'search:'+cleanGamertag(gamertag).toLowerCase():'profile:'+uid)+':'+(user?.uid||'public')
 const hit=cache.get(key);if(hit?.until>Date.now())return hit.request
 const request=(async()=>{
  let data
  try { data=await backendRequest('xbox-profile',{query:gamertag?{gamertag:cleanGamertag(gamertag)}:{uid},authenticated:Boolean(user),signal:AbortSignal.timeout(25000)}) }
  catch(error) { if(error.message==='session-expired')throw Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');if(error.message==='backend-network-error')throw Error('No se pudo contactar con Xbox. Inténtalo de nuevo.');throw error }
  if(data.platform!=='xbox'||!data.xuid||!data.displayName)throw Error('Respuesta Xbox no válida.')
  return data
 })().catch(error=>{cache.delete(key);throw error})
 if(cache.size>=100)cache.delete(cache.keys().next().value)
 cache.set(key,{request,until:Date.now()+300000})
 return request
}

// Temporary owner-only inspection of title fields; no provider headers are exposed.
export async function fetchXboxImageDiagnostic(){
 const user=auth.currentUser
 if(!user)throw Error('Inicia sesion para revisar tu Xbox.')
 return backendRequest('xbox-profile',{query:{uid:user.uid,diagnostic:'images'},authenticated:true,signal:AbortSignal.timeout(25000)})
}
