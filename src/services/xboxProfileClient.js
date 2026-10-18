import {auth} from '@/firebase'
import {apiUrl} from './appEnvironment'
import {cleanGamertag} from './xboxIdentity'
const cache=new Map()
export function clearXboxProfileCache(uid){for(const key of cache.keys())if(key.startsWith('profile:'+uid+':'))cache.delete(key)}
export async function fetchXboxProfile({gamertag,uid}){
 const user=auth.currentUser
 if(gamertag&&!user)throw Error('Inicia sesión para vincular Xbox.')
 const query=gamertag?'gamertag='+encodeURIComponent(cleanGamertag(gamertag)):'uid='+encodeURIComponent(uid)
 const key=(gamertag?'search:'+cleanGamertag(gamertag).toLowerCase():'profile:'+uid)+':'+(user?.uid||'public')
 const hit=cache.get(key);if(hit?.until>Date.now())return hit.request
 const request=(async()=>{
  const token=user?await user.getIdToken().catch(()=>{throw Error('Tu sesión ha caducado. Vuelve a iniciar sesión.')}):null
  const response=await fetch(apiUrl('/.netlify/functions/xbox-profile?'+query),{headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(25000)}).catch(()=>{throw Error('No se pudo contactar con Xbox. Inténtalo de nuevo.')})
  const data=await response.json().catch(()=>{throw Error('El servicio de Xbox no devolvió datos válidos.')})
  if(!response.ok)throw Error(data.error||'No se pudo consultar Xbox.')
  if(data.platform!=='xbox'||!data.xuid||!data.displayName)throw Error('Respuesta Xbox no válida.')
  return data
 })().catch(error=>{cache.delete(key);throw error})
 if(cache.size>=100)cache.delete(cache.keys().next().value)
 cache.set(key,{request,until:Date.now()+300000})
 return request
}
