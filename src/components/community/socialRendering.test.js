import {describe,it,expect,vi} from 'vitest'
import {createSSRApp,h} from 'vue'
import {renderToString} from 'vue/server-renderer'
vi.mock('@/firebase',()=>({auth:{currentUser:null},db:{}}))
import ProfileHeaderCard from '../profile/ProfileHeaderCard.vue'
import ProfileStatsPanel from '../profile/ProfileStatsPanel.vue'
import CommunityThreadList from './CommunityThreadList.vue'
import CommunityHero from './CommunityHero.vue'
import PostEditCard from './PostEditCard.vue'
const render=(component,props)=>renderToString(createSSRApp({render:()=>h(component,props)}))
const baseProfile={profile:{name:'Usuario ficticio',username:'ficticio',description:'Biografía\nextensa',role:'user'},currentAchievement:{label:'Miembro'}}
describe('social presentation contracts',()=>{
 it('preserves own/public action differences without changing identity',async()=>{
  const publicHtml=await render(ProfileHeaderCard,baseProfile),own=await render(ProfileHeaderCard,{...baseProfile,isOwnProfile:true})
  expect(publicHtml).toContain('Usuario ficticio');expect(own).toContain('Usuario ficticio')
  expect(publicHtml).toContain('Seguir');expect(publicHtml).not.toContain('Editar perfil</button>')
  expect(own).toContain('Editar perfil');expect(own).not.toContain('>Seguir<')
 })
 it('retains disabled follow and optional profile fallback',async()=>{
  expect(await render(ProfileHeaderCard,{...baseProfile,followBusy:true})).toMatch(/disabled/)
  expect(await render(ProfileHeaderCard,{profile:{},currentAchievement:{label:'Miembro'}})).toContain('Usuario')
 })
 it('does not expose the previously observed public email fallback',async()=>{
  const html=await render(ProfileHeaderCard,{profile:{email:'PRIVATE_EMAIL_SENTINEL'},currentAchievement:{label:'Miembro'},isOwnProfile:false})
  expect(html).not.toContain('PRIVATE_EMAIL_SENTINEL');expect(html).toContain('Usuario de Galaxia')
 })
 it('keeps informational statistics non-interactive and icon/achievement statistics interactive',async()=>{
  const html=await render(ProfileStatsPanel,{stats:[{id:'followers',value:999999,label:'Seguidores'},{id:'icons',value:12,label:'Iconos'}]})
  expect((html.match(/<button/g)||[]).length).toBe(1);expect(html).toContain('999999');expect(html).toContain('Iconos')
 })
 it('preserves last-12 comment order and older-message expansion affordance',async()=>{
  const comments=Array.from({length:15},(_,i)=>({id:String(i),author:'Autor',body:`BODY_${i}_END`}))
  const html=await render(CommunityThreadList,{threads:[{id:'thread',author:'Autor',comments}],openThreadId:'thread'})
  expect(html).not.toContain('BODY_0_END');expect(html).toContain('BODY_3_END');expect(html).toContain('BODY_14_END')
  expect(html.indexOf('BODY_3_END')).toBeLessThan(html.indexOf('BODY_14_END'));expect(html).toContain('Ver 3 mensajes anteriores')
  expect(html).toContain('aria-label="Respuesta al hilo"');expect(html).toContain('maxlength="180"')
 })
 it('does not expose edit/delete affordances when predicates deny them',async()=>{
  const html=await render(CommunityThreadList,{threads:[{id:'thread',author:'Autor',comments:[{id:'c',author:'Autor',body:'Texto'}]}],openThreadId:'thread',canPinThread:()=>false,canDeleteThread:()=>false,canEditComment:()=>false,canDeleteComment:()=>false})
  expect(html).not.toContain('Mas acciones del hilo');expect(html).not.toContain('context-menu-trigger')
 })
 it('keeps moderation visibility in the hero controlled by its existing prop',async()=>{
  const community={name:'Comunidad',description:'Descripción'}
  expect(await render(CommunityHero,{community,isAdmin:false})).not.toContain('Editar')
  expect(await render(CommunityHero,{community,isAdmin:true})).toContain('Editar')
 })
 it('keeps edit validation boundaries, labelled model and button semantics',async()=>{
  const html=await render(PostEditCard,{modelValue:'Borrador',disabled:true})
  expect(html).toContain('Editar comentario');expect(html).toContain('maxlength="280"');expect(html).toContain('Borrador')
  expect(html).toContain('type="button"');expect(html).toMatch(/type="submit"[^>]*disabled/)
 })
})
