import * as Vue from 'vue'
import { createRenderer, nextTick, reactive, ssrContextKey } from 'vue'
import { readFileSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ event:vi.fn(), gamer:vi.fn() }))
vi.mock('@/services/overlayEventClient', () => ({ fetchOverlayEventCandidates:api.event }))
vi.mock('@/services/overlayGamerClient', () => ({ fetchOverlayGamer:api.gamer }))
import NowPlayingWidget from './types/NowPlayingWidget.vue'

// Vitest's Node pipeline supplies SSR templates. Compile the same template for the test host.
const descriptor=parse(readFileSync(new URL('./types/NowPlayingWidget.vue',import.meta.url),'utf8')).descriptor
const bindings=compileScript(descriptor,{id:'np-test'}).bindings
const compiled=compileTemplate({id:'np-test',source:descriptor.template.content,compilerOptions:{mode:'function',bindingMetadata:bindings}})
if(compiled.errors.length)throw compiled.errors[0]
const ClientWidget={...NowPlayingWidget,render:new Function('Vue',compiled.code)(Vue)}

// Mount the real widget with a lightweight host; data/timers are exercised without a browser dependency.
const makeNode = type => ({type,props:{},children:[],parent:null,text:''})
const renderer = createRenderer({
  createElement:makeNode, createText:text=>({...makeNode('text'),text}), createComment:()=>makeNode('comment'),
  insert(child,parent,anchor=null) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child),1)
    child.parent=parent
    const index=anchor?parent.children.indexOf(anchor):-1
    if(index<0)parent.children.push(child);else parent.children.splice(index,0,child)
  },
  remove(child) { if(child.parent){child.parent.children.splice(child.parent.children.indexOf(child),1);child.parent=null} },
  setText(node,text){node.text=text}, setElementText(node,text){node.text=text;node.children=[]},
  parentNode:node=>node.parent, nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]||null,
  patchProp(node,key,previous,next){node.props[key]=next}
})
const all = node => [node,...node.children.flatMap(all)]
let app
beforeEach(() => {
  vi.useFakeTimers();vi.clearAllMocks()
  vi.stubGlobal('window',{matchMedia:()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})})
  api.event.mockResolvedValue([{id:'e1',game:{nameEs:'Zelda de prueba'},description:'Una aventura',backgroundUrl:'https://example.com/zelda.png'}])
  api.gamer.mockResolvedValue([])
})
afterEach(() => {app?.unmount();app=null;vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals()})
async function mount(extra={}) {
  const root=makeNode('root')
  const widget=reactive({id:'w1',data:{source:'event',eventId:'e1',appearance:'original',imageMode:'background',visibleSeconds:5,repeatSeconds:10,animationsEnabled:false,width:559,height:236,...extra}})
  app=renderer.createApp(ClientWidget,{widget,ownerId:'owner',preview:true,interactive:true})
  app.provide(ssrContextKey,{})
  app.mount(root)
  await vi.advanceTimersByTimeAsync(0);await nextTick()
  return {root,widget}
}
it('previews repeated cycles without extra provider requests or geometry changes',async()=>{
  const {root,widget}=await mount()
  const shell=root.children[0]
  expect(shell.props.style).toMatchObject({width:'559px',height:'236px'})
  expect(all(root).some(node=>node.type==='article')).toBe(true)
  widget.data.replayNonce=123;await nextTick();await vi.advanceTimersByTimeAsync(20)
  expect(all(root).some(node=>node.type==='h3'&&node.text==='Zelda de prueba')).toBe(true)
  expect(api.event).toHaveBeenCalledTimes(1);expect(api.gamer).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(5000)
  expect(all(root).some(node=>node.type==='article')).toBe(false)
  await vi.advanceTimersByTimeAsync(5000)
  expect(all(root).some(node=>node.type==='article')).toBe(true)
  expect(api.event).toHaveBeenCalledTimes(1)
  expect(shell.props.style).toMatchObject({width:'559px',height:'236px'})
})
it('keeps the OBS click-to-hide control working until the user clicks again',async()=>{
  const {root}=await mount()
  root.children[0].props.onClick();await nextTick()
  await vi.advanceTimersByTimeAsync(30000)
  expect(all(root).some(node=>node.type==='article')).toBe(false)
  root.children[0].props.onClick();await nextTick();await vi.advanceTimersByTimeAsync(20)
  expect(all(root).some(node=>node.type==='article')).toBe(true)
  expect(api.event).toHaveBeenCalledTimes(1)
})
it('cancels pending cycles on disable and does not leak timers after unmount',async()=>{
  const {root,widget}=await mount()
  widget.data.enabled=false;await nextTick();await vi.advanceTimersByTimeAsync(10000)
  expect(all(root).some(node=>node.type==='article')).toBe(false)
  expect(api.event).toHaveBeenCalledTimes(1)
  app.unmount();app=null
  expect(vi.getTimerCount()).toBe(0)
})
