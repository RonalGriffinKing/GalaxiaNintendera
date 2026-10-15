import {profileRequest} from './profiles'
const pending=new Map()
const snapshot=items=>({docs:items.map(item=>({id:item.id,exists:()=>true,data:()=>item})),exists:()=>items.length>0,data:()=>items[0]})
export async function communitySnapshot(kind,options={}){return snapshot((await profileRequest('community-read',{kind,...options})).items)}
export async function communityWrite(action,id,data={}){
 const stable={...data};for(const k of ['createdAt','updatedAt','author','authorImage','authorIconEffect','authorId','handle'])delete stable[k]
 if(stable.value){stable.value={...stable.value};for(const k of ['createdAt','updatedAt','createdBy'])delete stable.value[k]}
 const key=JSON.stringify({action,id,data:stable});if(!pending.has(key))pending.set(key,{action,id:id||crypto.randomUUID(),data,requestId:crypto.randomUUID()})
 let result;try{result=await profileRequest('community-write',pending.get(key))}catch(error){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('editorial-error',{detail:error.message}));throw error}pending.delete(key);if(typeof window!=='undefined')window.dispatchEvent(new Event('community-updated'));return result
}
// Validated HTTP DTOs replace public reads of mixed historical documents. No raw private fields reach Vue.
export function watchCommunity(kind,options,next,onError=console.error){let stopped=false,busy=false;const refresh=async()=>{if(stopped||busy)return;busy=true;try{const result=await communitySnapshot(kind,options);if(!stopped)next(result)}catch(error){if(!stopped)onError(error)}finally{busy=false}};void refresh();const timer=setInterval(refresh,10000);window.addEventListener('community-updated',refresh);return()=>{stopped=true;clearInterval(timer);window.removeEventListener('community-updated',refresh)}}
