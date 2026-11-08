import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
const cache=new Map(), pending=new Map()
const snap = data => ({id:data?.id,exists:()=>Boolean(data),data:()=>data})
async function read(collection, id='') {
  const key=`${collection}:${id}:${collection==='galaxyEvents'?auth.currentUser?.uid||'':''}`
  if(cache.has(key)&&Date.now()-cache.get(key).at<15000)return cache.get(key).value
  if(pending.has(key))return pending.get(key)
  const request=(async()=>{
    let cursor='',docs=[]
    do {
      const query=new URLSearchParams({collection,...(id?{id}:{}),...(cursor?{cursor}:{})})
      const token=collection==='galaxyEvents'&&auth.currentUser?await auth.currentUser.getIdToken():null
      const response=await fetch('/.netlify/functions/public-content?'+query,{headers:token?{Authorization:`Bearer ${token}`}:{}})
      if(!response.ok)throw Error('public-content-unavailable')
      const page=await response.json();docs.push(...page.docs);cursor=page.nextCursor||''
    }while(cursor)
    const value=id?snap(docs[0]):{docs:docs.map(snap)}
    cache.set(key,{at:Date.now(),value});return value
  })().finally(()=>pending.delete(key))
  pending.set(key,request);return request
}
export const publicUser = uid => read('users',uid)
export const publicUsers = () => read('users')
export const publicPost = id => read('posts',id)
export const publicPosts = () => read('posts')
export const publicEvents = () => read('galaxyEvents')
export const publicEvent = id => read('galaxyEvents',id)
export const publicPages = () => read('sitePages')
export const publicPage = id => read('sitePages',id)
export const visibleProfile = uid => auth.currentUser?.uid===uid ? getDoc(doc(db,'users',uid)) : publicUser(uid)
export function subscribePublicCollection(collection, callback, onError=console.error) {
  let active=true
  const tick=()=>read(collection).then(value=>{if(active)callback(value)}).catch(error=>{if(active)onError(error)})
  tick();const timer=setInterval(tick,30000)
  return ()=>{active=false;clearInterval(timer)}
}
export async function publicPostPage({direction='desc',limit=20,cursor,author}={}) {
  let docs=[...(await publicPosts()).docs]
  if(author)docs=docs.filter(item=>item.data().authorId===author)
  docs.sort((a,b)=>{const order=Number(a.data().createdAt||0)-Number(b.data().createdAt||0);return (direction==='desc'?-order:order)||a.id.localeCompare(b.id)})
  const index=cursor?docs.findIndex(item=>item.id===cursor.id):-1
  return {docs:docs.slice(index+1,index+1+limit)}
}
