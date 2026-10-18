// Isolated profile preview: no Firebase requests or writes.
import fs from 'node:fs'
import path from 'node:path'
import {createServer} from 'vite'
import vue from '@vitejs/plugin-vue'
const root=process.cwd().replaceAll('\\','/')
const mockFirebase=`export const auth={currentUser:{uid:'owner',getIdToken:async()=>"fixture_firebase_session_token_12345"}},db={},storage={},firebaseConfig={};`
const mockAuth=`export const onAuthStateChanged=(auth,cb)=>{cb(auth.currentUser);window.profileChangeViewer=user=>{auth.currentUser=user?{...user,getIdToken:async()=>"fixture_firebase_session_token_12345"}:null;cb(auth.currentUser)};return()=>{}};export const updateProfile=async()=>{};`
const mockStore=`
window.profileReads=[];window.profileWrites=[];window.profileMockUsers={};
export const doc=(_, ...parts)=>({path:parts.join('/'),id:parts.at(-1)}),collection=(_, ...parts)=>({path:parts.join('/')});
export const where=(...args)=>({where:args}),limit=n=>({limit:n}),orderBy=()=>({}),query=(ref,...filters)=>({...ref,filters});
const user={name:'Explorador de prueba',role:'user',description:'Una galaxia de juegos y aventuras.',selectedIcon:'kirby-01',unlockedIcons:['kirby-01'],stars:40,socialLinks:{youtube:'https://youtube.com/@example'}};
export const deleteField=()=>"__delete_field__";
export async function getDoc(ref){let data=ref.path.startsWith('users/')&&ref.path.split('/').length===2?(window.profileMockUsers[ref.id]||user):null;return {id:ref.id,exists:()=>!!data,data:()=>data}}
export async function getDocs(ref){window.profileReads.push(ref);const empty=location.search.includes('empty=1');const rows=!empty&&ref.path==='posts'?[{id:'post-1',authorId:'owner',title:'Una aventura de prueba',status:'approved',createdAt:1}]:[];return {docs:rows.map(row=>({id:row.id,data:()=>row}))}}
export const onSnapshot=(ref,callback)=>{callback({exists:()=>false});return()=>{}};
export const writeBatch=()=>({set(){throw Error('Writes disabled')},commit(){throw Error('Writes disabled')}});export const increment=n=>n;export const arrayUnion=(...x)=>x;export const arrayRemove=(...x)=>x;export const serverTimestamp=()=>0;
export async function setDoc(){throw Error('Writes disabled')};export const deleteDoc=setDoc,runTransaction=setDoc;
export async function updateDoc(ref,patch){
 if(ref.path!=='users/owner')throw Error('Non-owner writes disabled');
 if(window.profileWriteFail)throw Error('Simulated permission denial');
 const allowed=['socialLinks.xbox','socialLinks.tiktok','socialLinks.youtube','socialLinks.twitch','socialLinks.nintendoPresence','socialLinks.nintendoProfile','name','description','socialLinks','updatedAt'];
 if(Object.keys(patch).some(key=>!allowed.includes(key)))throw Error('Unrelated writes disabled');
 const saved=window.profileMockUsers.owner||structuredClone(user);
 for(const [key,value] of Object.entries(patch)){const parts=key.split('.');let target=saved;for(const part of parts.slice(0,-1))target=target[part] ||= {};if(value==='__delete_field__')delete target[parts.at(-1)];else target[parts.at(-1)]=value;}
 window.profileMockUsers.owner=saved;window.profileWrites.push({path:ref.path,patch});
}
`
const main=`import {createApp,h,ref} from 'vue';import {createRouter,createWebHistory,RouterView} from 'vue-router';import Profile from '/src/pages/ProfilePage.vue';import '/src/style.css';window.profileGamerFixtures=ref([]);const router=createRouter({history:createWebHistory(),routes:[{path:'/perfil/:uid',name:'profile',component:Profile,props:()=>({gamerIdentities:window.profileGamerFixtures.value})},{path:'/perfil/:uid/recompensas',name:'profile-rewards',component:Profile}]});window.profileRouter=router;createApp({render:()=>h(RouterView)}).use(router).mount('#app');`
const modules={'/__profile_firebase.js':mockFirebase,'/__profile_auth.js':mockAuth,'/__profile_store.js':mockStore,'/__profile_main.js':main}
let xboxFixtureTag='Xbox de prueba#1234';
const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,include:['vue','vue-router']},plugins:[{name:'profile-fixtures',enforce:'pre',resolveId(id){if(id==='@/firebase'||id==='../firebase'||id==='./firebase'||id.endsWith('/firebase.js')||id===root+'/src/firebase.js'||id===root+'/src/firebase')return '/__profile_firebase.js';if(id==='firebase/auth')return '/__profile_auth.js';if(id==='firebase/firestore')return '/__profile_store.js';if(modules[id])return id},load(id){return modules[id]},configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url.startsWith('/.netlify/functions/xbox-profile')){
 const query=new URL(req.url,'http://localhost').searchParams;
 if(query.get('diagnostic')==='images'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({diagnostic:'images',titleCount:2,withImage:{name:'Fixture covered',displayImage:'https://example.com/cover.jpg'},withoutImage:{name:'Fixture missing',images:[]}}));return}
 if(query.get('gamertag')==='NoExiste'){res.statusCode=404;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'No se encontró una coincidencia exacta.'}));return}
 if(query.get('gamertag'))xboxFixtureTag=query.get('gamertag');
 const game={id:'123456',title:'Juego Xbox de prueba',imageUrl:'/src/iconos/iconosKirby/01.png'};
 const data={platform:'xbox',connectionState:'connected',visibility:'public',xuid:xboxFixtureTag.includes('2222')?'2533274792093123':'2533274792093122',displayName:xboxFixtureTag,avatarUrl:'/src/iconos/iconosKirby/01.png',gamerscore:123,presence:{state:'online',currentGame:game,lastGame:null,updatedAt:null,logoutAt:null},history:[{game,at:'2026-10-18T10:00:00.000Z'}],library:null,playtime:null,achievements:null,unavailable:[]};
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));
 }else if(req.url.startsWith('/.netlify/functions/nintendo-presence')){
 const source=new URL(req.url,'http://localhost').searchParams.get('source');
 const data={platform:'nintendo',connectionState:'connected',visibility:'public',displayName:source==='profile'?'Perfil público de prueba':'Presencia de prueba',avatarUrl:'/src/iconos/iconosKirby/01.png',presence:{state:source==='profile'?'unknown':'offline',currentGame:null,lastGame:source==='profile'?{id:'0100000000000001',title:'Juego publicado',imageUrl:'/src/iconos/iconosKirby/01.png'}:null,updatedAt:'2026-10-17T10:00:00.000Z'},history:source==='profile'?[{game:{id:'0100000000000001',title:'Juego publicado',imageUrl:'/src/iconos/iconosKirby/01.png'},at:'2026-10-17T10:00:00.000Z'}]:null,featuredGames:source==='profile'?[{id:'0100000000000001',title:'Juego publicado',imageUrl:'/src/iconos/iconosKirby/01.png'}]:null,playtime:source==='profile'?[{gameId:'0100000000000001',minutes:90,source:'fixture'}]:null,library:null};
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));
 }else if(req.url.startsWith('/perfil/')){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="es" data-theme="dark"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script type="module" src="/__profile_main.js"></script></html>')}else next()})}},vue()],resolve:{alias:{'@':root+'/src'}},server:{host:'127.0.0.1',port:5231}})
await server.listen();console.log('Profile fixtures: http://127.0.0.1:5231/perfil/owner')
