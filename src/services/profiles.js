import {resolveKnownProfileAsset} from '@/constants/assets'
import {apiUrl} from './appEnvironment'
import {auth} from '@/firebase';
export async function profileRequest(action,data){
 const token=auth.currentUser?await auth.currentUser.getIdToken():'';
 let response;try{response=await fetch(apiUrl('/.netlify/functions/profile'),{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...(data?{data}:{})}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Object.assign(new Error('No hay conexión con el servicio de perfiles; no se confirma ningún cambio.'),{code:'profile-unavailable'});}
 const body=await response.json();if(!response.ok){const code=body.error?.code||'profile-unavailable';throw Object.assign(new Error(profileErrorMessage(code)),{code});}return body.result;
}
export const profileErrorMessage=code=>({
 'account-created-profile-pending':'La cuenta Auth se creo, pero falta completar su perfil. No vuelvas a crearla; revisa esa cuenta.',
 'account-partial-update':'Auth se actualizo, pero falta sincronizar el perfil. Reintenta guardar esa cuenta.',
 'forbidden':'Esta cuenta no tiene permiso para realizar la operacion.',
 'not-enough-stars':'No tienes estrellas suficientes para este canje.',
 'price-changed':'El precio cambio. Revisa el coste y confirma de nuevo.',
 'icon-not-owned':'No puedes equipar un icono que no tienes.',
 'reading-delay-required':'Todavia no ha transcurrido el tiempo minimo de lectura.',
 'community-operation-limit':'La operacion supera el limite seguro. No se ha aplicado parcialmente.',
 'community-review-required':'Los datos de esta comunidad necesitan revision; no se han modificado.',
 'chat-id-conflict':'Este chat tiene datos antiguos incompatibles; no se ha sobrescrito.',
 'live-chat-closed':'El chat en directo esta cerrado.',
 'invalid-page':'La pagina contiene campos no admitidos.',
 'profile-review-required':'Tu cuenta necesita revisión. No se han reiniciado tus estrellas ni inventario.',
 'avatar-review-required':'Este avatar necesita validación; se conserva el anterior.',
 'avatar-equipment-required':'El avatar debe equiparse desde el inventario con propiedad verificada. No se ha cambiado.',
 'authentication-denied':'La sesión no es válida. Vuelve a iniciar sesión.',
 'directory-pagination-required':'El directorio supera el límite local; no se muestra una lista incompleta.',
 'invalid-profile-name':'El nombre debe ser válido y no contener un correo electrónico.',
}[code]||'No se pudo completar la operación de perfil. Revisa el estado antes de reintentar.');
export async function ensureProfile(data){return profileRequest('ensure',data);}
export async function getProfile(uid){
 if(auth.currentUser?.uid===uid){const result=await profileRequest('get');return result.item?{...result.item,reviewRequired:result.reviewRequired}:null;}
 const item=await profileRequest('public',{uid});if(!item)return null
 return {...item,name:item.displayName,imageUrl:resolveKnownProfileAsset(item.avatarSourcePath)||item.avatarUrl,selectedIconUrl:resolveKnownProfileAsset(item.avatarSourcePath)||item.avatarUrl,selectedIconEffect:item.avatarEffect}
}
const snapshot=item=>({id:item?.id||'',exists:()=>!!item,data:()=>item})
export const getProfileSnapshot=async uid=>snapshot(await getProfile(uid))
export const listProfileSnapshots=async()=>({docs:(await profileRequest('directory')).items.map(item=>snapshot({...item,name:item.displayName,imageUrl:item.avatarUrl,selectedIconUrl:item.avatarUrl,selectedIconEffect:item.avatarEffect}))})

export function subscribeProfileDirectory(next,onError=console.error){let closed=false,busy=false;const refresh=async()=>{if(closed||busy)return;busy=true;try{const value=await listProfileSnapshots();if(!closed)next(value)}catch(error){if(!closed)onError(error)}finally{busy=false}};void refresh();const timer=setInterval(refresh,10000);return()=>{closed=true;clearInterval(timer)}}
