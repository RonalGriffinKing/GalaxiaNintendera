import { collection,getDocs,limit,orderBy,query,startAfter } from 'firebase/firestore'
import { auth,db } from '@/firebase'
import { apiUrl } from './appEnvironment'
import { eventGameNames } from './eventGame'
const libraries=new Map(),igdbCache=new Map(),TTL=5*60*1000,PAGE_SIZE=40
export const mediaSearchText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
export function extractPostImages(posts=[]) {
 const found=new Map()
 for(const post of posts){
  const game=eventGameNames(post)
  const items=[[post.image,'Portada'],[post.coverImage,'Portada'],[post.thumbnail,'Miniatura'],[post.game?.logoUrl||post.game?.logo,'Logo del juego'],...(Array.isArray(post.sections)?post.sections:[]).map(s=>[s.image,s.title||'Sección']),[post.social?.image,'Imagen social'],...(Array.isArray(post.social?.slides)?post.social.slides:[]).map(s=>[s.image,s.title||'Carrusel'])]
  for(const [raw,label] of items){
   if(typeof raw!=='string'||!raw.trim()||!(/^(https?:\/\/|\/[^/])/.test(raw.trim())))continue
   const url=raw.trim(),text=mediaSearchText([post.title,game.nameEs,game.nameEn,post.mediaGameName,label].filter(Boolean).join(' '))
   if(found.has(url)){found.get(url).searchText+=' '+text;continue}
   found.set(url,{id:url,url,label,postId:post.id,postTitle:post.title||'Publicación',searchText:text})
  }
 }
 return [...found.values()]
}
const snapshot=state=>({images:state.images,postCount:state.posts.size,hasMore:state.hasMore})
export async function loadWebImageLibrary({more=false,refresh=false}={}) {
 const uid=auth.currentUser?.uid;if(!uid)throw Error('Inicia sesión para consultar la biblioteca.')
 let state=libraries.get(uid)
 if(!state||refresh||Date.now()-state.at>TTL){state={at:Date.now(),posts:new Map(),images:[],cursor:null,hasMore:true,pages:0,pending:null};libraries.set(uid,state);if(libraries.size>3)libraries.delete(libraries.keys().next().value)}
 if(state.pending)return state.pending
 if((state.pages&&!more)||!state.hasMore)return snapshot(state)
 state.pending=(async()=>{
  const constraints=[orderBy('createdAt','desc'),limit(PAGE_SIZE)];if(state.cursor)constraints.push(startAfter(state.cursor))
  const result=await getDocs(query(collection(db,'posts'),...constraints))
  if(auth.currentUser?.uid!==uid)throw Error('La sesión ha cambiado. Abre la biblioteca de nuevo.')
  for(const document of result.docs)state.posts.set(document.id,{...document.data(),id:document.id})
  state.cursor=result.docs.at(-1)||state.cursor;state.hasMore=result.docs.length===PAGE_SIZE;state.pages++
  state.images=extractPostImages([...state.posts.values()]);return snapshot(state)
 })().finally(()=>{state.pending=null})
 return state.pending
}
export async function searchIgdbMedia(text,{signal}={}) {
 const value=String(text||'').trim();if(value.length<2)throw Error('Escribe al menos dos letras del juego.')
 const key=value.toLowerCase(),cached=igdbCache.get(key)
 if(cached&&Date.now()-cached.at<TTL)return cached.data
 const response=await fetch(apiUrl('/.netlify/functions/igdb'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:value}),signal})
 const data=await response.json().catch(()=>({}))
 if(!response.ok)throw Error(data.error||'No se pudo consultar IGDB.')
 const images=(Array.isArray(data.images)?data.images:[]).filter(image=>image?.url)
 const normalized={images,games:Array.isArray(data.games)?data.games:data.game?[data.game]:[]}
 igdbCache.set(key,{at:Date.now(),data:normalized});if(igdbCache.size>30)igdbCache.delete(igdbCache.keys().next().value)
 return normalized
}
export function imageSearchPreview(url){
 if(!url)return ''
 if(/^(data:|blob:|\/)/.test(url))return url
 try{if(new URL(url,location.origin).origin===location.origin)return url}catch{return ''}
 return apiUrl('/.netlify/functions/image-proxy?url='+encodeURIComponent(url))
}
