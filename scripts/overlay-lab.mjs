// Isolated OBS/editor fixture; no real Firebase reads or writes.
import fs from 'node:fs'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
const root = process.cwd().replaceAll('\\', '/')
const modules = {
  '/__overlay_socket.js': 'export const socket=null;',
  '/__overlay_firebase.js': `export const auth={currentUser:{uid:'owner'}},db={};`,
  '/__overlay_store.js': `
    const listeners=new Set();window.overlayWrites=[];window.savedOverlay={name:'OBS de prueba',format:'horizontal',width:1920,height:1080,widgets:[]};
    window.publishOverlay=()=>{window.savedOverlay=JSON.parse(JSON.stringify(window.savedOverlay));listeners.forEach(callback=>callback({exists:()=>true,data:()=>window.savedOverlay}))};
    export const doc=(_, ...parts)=>({path:parts.join('/')});
    export const getDoc=async()=>({exists:()=>true,data:()=>window.savedOverlay});
    export const setDoc=async(ref,value)=>{if(window.overlayWriteFail)throw Error('Simulated write denial');window.overlayWrites.push({path:ref.path,value:JSON.parse(JSON.stringify(value))});window.savedOverlay=JSON.parse(JSON.stringify(value));listeners.forEach(callback=>callback({exists:()=>true,data:()=>window.savedOverlay}))};
    export const onSnapshot=(ref,callback)=>{listeners.add(callback);callback({exists:()=>true,data:()=>window.savedOverlay});return()=>listeners.delete(callback)};
  `,
  '/__overlay_gamer.js': `
    window.overlayGamerCalls=[];window.overlayGamerOffline=false;
    const game={id:'123',title:'Juego Xbox de prueba con un nombre largo',imageUrl:'/src/iconos/iconosKirby/01.png'};
    export const fetchOverlayGamer=async(owner,platform)=>{window.overlayGamerCalls.push({owner,platform});if(window.overlayGamerOffline)return [];return [{platform:platform==='nintendo'?'nintendo':'xbox',playtime:platform==='nintendo'?[{gameId:game.id,minutes:125,source:'fixture'}]:null,connectionState:'connected',visibility:'public',presence:{state:window.overlayGamerState||'online',currentGame:window.overlayGamerState==='offline'?null:game,lastGame:game},gameAchievements:[{game,unlocked:6,total:null,gamerscore:270,totalGamerscore:1000}]}]};
  `,
  '/__overlay_main.js': `import {createApp,h} from 'vue';import {createRouter,createWebHistory,RouterView} from 'vue-router';import Editor from '/src/pages/OverlayEditorPage.vue';import Viewer from '/src/pages/OverlayViewPage.vue';import '/src/style.css';window.overlayTimers=new Map();const originalTimeout=window.setTimeout.bind(window),originalClear=window.clearTimeout.bind(window);window.setTimeout=(callback,delay,...args)=>{const id=originalTimeout(()=>{window.overlayTimers.delete(id);callback(...args)},delay);window.overlayTimers.set(id,Number(delay));return id};window.clearTimeout=id=>{window.overlayTimers.delete(id);originalClear(id)};const router=createRouter({history:createWebHistory(),routes:[{path:'/edit',component:Editor},{path:'/overlay/:id',component:Viewer}]});window.overlayRouter=router;createApp({render:()=>h(RouterView)}).use(router).mount('#app');`
}
const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,include:['vue','vue-router','tmi.js']},plugins:[{name:'overlay-fixtures',enforce:'pre',resolveId(id){if(id==='@/firebase'||id===root+'/src/firebase'||id===root+'/src/firebase.js')return '/__overlay_firebase.js';if(id==='firebase/firestore')return '/__overlay_store.js';if(id==='@/services/socket'||id===root+'/src/services/socket')return '/__overlay_socket.js';if(id==='@/services/overlayGamerClient'||id===root+'/src/services/overlayGamerClient'||id===root+'/src/services/overlayGamerClient.js')return '/__overlay_gamer.js';if(modules[id])return id},load(id){return modules[id]},configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url.startsWith('/edit')||req.url.startsWith('/overlay/')){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(root+'/index.html','utf8').replace('/src/main.js','/__overlay_main.js'))}else next()})}},vue()],resolve:{alias:{'@':root+'/src'}},server:{host:'127.0.0.1',port:5232,strictPort:true}})
await server.listen();console.log('Overlay fixtures: http://127.0.0.1:5232/edit?id=test')
