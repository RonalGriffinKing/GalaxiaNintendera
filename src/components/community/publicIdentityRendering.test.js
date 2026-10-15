import {describe,it,expect,vi} from 'vitest'
import {createSSRApp,h} from 'vue'
import {renderToString} from 'vue/server-renderer'
import {createMemoryHistory,createRouter} from 'vue-router'
vi.mock('@/firebase',()=>({auth:{currentUser:null},db:{}}))
vi.mock('firebase/firestore',async()=>({
 ...await vi.importActual('firebase/firestore'),
 doc:()=>({}),collection:()=>({}),onSnapshot:()=>()=>{},
 getDoc:async()=>({exists:()=>false,data:()=>({})}),getDocs:async()=>({docs:[]})
}))
import ProfileHeader from '../profile/ProfileHeaderCard.vue'
import Relations from '../profile/ProfileRelationModal.vue'
import Threads from './CommunityThreadList.vue'
import Live from './CommunityLiveHub.vue'
import Theater from './CommunityMediaTheater.vue'
import Search from '../nav/PublicSearchPanel.vue'
import Official from './CommunityOfficialPanel.vue'
import Guest from './CommunityGuestLanding.vue'
import Login from '../../pages/LoginPage.vue'
const email='private-sentinel@example.invalid'
const render=async(component,props={},path='/')=>{
 const router=createRouter({history:createMemoryHistory(),routes:[{path:'/:pathMatch(.*)*',component:{render:()=>null}}]})
 await router.push(path);await router.isReady()
 const app=createSSRApp({render:()=>h(component,props)});app.use(router)
 const context={},html=await renderToString(app,context)
 return html+Object.values(context.teleports||{}).join('')
}
const safe=html=>{
 expect(html).not.toContain(email)
 expect(html).not.toContain('private-sentinel')
 expect(html).not.toContain(`mailto:${email}`)
}
describe('public identity DOM and accessible attributes',()=>{
 it.each([undefined,'','   ','Nombre público'])('header respects public identity %j for own and visitor views',async name=>{
  for(const isOwnProfile of [false,true]){
   const html=await render(ProfileHeader,{profile:{name,email},currentAchievement:{label:'Miembro'},isOwnProfile})
   safe(html);expect(html).toContain(name?.trim()?name:'Usuario de Galaxia')
   expect(html).toContain(isOwnProfile?'Editar perfil':'Seguir')
  }
 })
 it('uses an authorized username, keeps ordinary names and does not reveal internal IDs',async()=>{
  const html=await render(ProfileHeader,{profile:{id:'INTERNAL_UID_SENTINEL',name:' ',email,username:'publico'},currentAchievement:{label:'Miembro'}})
  safe(html);expect(html).toContain('publico');expect(html).not.toContain('INTERNAL_UID_SENTINEL')
 })
 it('renders an absent email and absent name safely',async()=>{
  const html=await render(ProfileHeader,{profile:{},currentAchievement:{label:'Miembro'}})
  safe(html);expect(html).toContain('Usuario de Galaxia')
 })
 it('renders legacy email-names safely in relation cards including their accessible button text',async()=>{
  const html=await render(Relations,{title:'Usuarios',users:[{id:'route-id',name:email,username:email,role:'user'}]})
  safe(html);expect(html).toContain('Usuario de Galaxia');expect(html).toContain('Ver perfil')
 })
 it.each(['','viewer'])('sanitizes thread/comment names, avatar alt/labels and legacy handles for audience %j',async currentUserId=>{
  const html=await render(Threads,{currentUserId,threads:[{id:'t',author:email,authorId:'other',handle:email,comments:[{id:'c',author:email,authorId:'other',body:'Contenido intacto'}]}],openThreadId:'t'})
  safe(html);expect(html).toContain('Contenido intacto');expect(html).toContain('maxlength="180"')
 })
 it('keeps a valid thread handle and own-comment identity unchanged',async()=>{
  const html=await render(Threads,{currentUserId:'viewer',threads:[{id:'t',author:'Autor válido',handle:'@publico',comments:[{id:'c',author:email,authorId:'viewer',body:'Contenido intacto'}]}],openThreadId:'t'})
  safe(html);expect(html).toContain('@publico');expect(html).toContain('Yo')
 })
 it('sanitizes video comments and replies without changing their bodies',async()=>{
  const html=await render(Live,{featuredYoutubeVideo:{id:'v'},visibleVideoChatMessages:[{id:'m',author:email,body:'Comentario intacto',replies:[{id:'r',author:email,body:'Respuesta intacta'}]}],avatarInitial:name=>name,formatVideoChatTime:()=>'',hasLikedVideoMessage:()=>false,canDeleteVideoMessage:()=>false,formatVideoDate:()=>''})
  safe(html);expect(html).toContain('Comentario intacto');expect(html).toContain('Respuesta intacta')
 })
 it('sanitizes the teleported video conversation',async()=>{
  const html=await render(Theater,{open:true,visibleVideoChatMessages:[{id:'m',author:email,body:'Contenido intacto'}],avatarInitial:name=>name,formatVideoChatTime:()=>''})
  safe(html);expect(html).toContain('Contenido intacto');expect(html).toContain('Cerrar vista grande')
 })
 it.each(['','viewer'])('public search keeps profile destinations and actions for audience %j',async currentUserId=>{
  const html=await render(Search,{open:true,query:'test',currentUserId,results:{posts:[],communities:[],users:[{id:'route-id',name:' ',email,username:email}]}})
  safe(html);expect(html).toContain('/perfil/route-id');expect(html).toContain('Usuario de Galaxia')
  expect(html.includes('Seguir')).toBe(Boolean(currentUserId))
 })
 it('leaves the private authentication email field available',async()=>{
  const html=await render(Login,{},'/login')
  expect(html).toContain('type="email"');expect(html).toContain('placeholder="Email"')
  expect(html).toContain('type="password"')
 })
 it('sanitizes active user labels and ranking titles while preserving counts/actions',async()=>{
  const html=await render(Official,{isOfficial:true,canManageOfficialContent:true,activeUsers:[{id:'u',name:email,action:'Actividad intacta'}],liveGoalCards:[{id:'g',type:'likes',title:'Meta intacta',ranking:[{uid:'u',name:email,count:7}],progress:0}],avatarInitial:name=>name})
  safe(html);expect(html).toContain('Actividad intacta');expect(html).toContain(': 7')
 })
 it('sanitizes guest landing identities without removing conversation content',async()=>{
  const html=await render(Guest,{activeLive:'',chatMessages:[{name:email,message:'Mensaje intacto'}],communityThreads:[{id:'t',title:'Título intacto',author:email,replies:2}]})
  safe(html);expect(html).toContain('Título intacto')
 })
})
