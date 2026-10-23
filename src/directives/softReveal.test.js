import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
let directive, callback, motion, observer
function element(children=[]) {
 const classes=new Set(), listeners={}
 return { dataset:{}, children, classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},contains:()=>false,querySelectorAll:()=>children,addEventListener:(n,f)=>listeners[n]=f,removeEventListener:n=>delete listeners[n],listeners,animate:vi.fn(()=>({cancel:vi.fn()})) }
}
beforeEach(async()=>{
 vi.resetModules()
 motion={matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}
 observer={observe:vi.fn(),unobserve:vi.fn(),disconnect:vi.fn()}
 vi.stubGlobal('window',{matchMedia:()=>motion,IntersectionObserver:class{constructor(cb){callback=cb;return observer}}})
 vi.stubGlobal('document',{activeElement:null})
 directive=(await import('./softReveal')).vSoftReveal
})
afterEach(()=>vi.unstubAllGlobals())
describe('soft content entrance',()=>{
 it('waits for the viewport, staggers with a bounded delay, and never replays existing items',()=>{
  const items=Array.from({length:10},()=>element()),root=element(items)
  directive.mounted(root,{value:'.card'})
  expect(items.every(e=>e.classList.contains('gn-reveal-pending'))).toBe(true)
  callback(items.map(target=>({target,isIntersecting:true})))
  expect(items[1].animate.mock.calls[0][1].delay).toBe(45)
  expect(items[9].animate.mock.calls[0][1].delay).toBe(240)
  expect(items.every(e=>!e.classList.contains('gn-reveal-pending'))).toBe(true)
  directive.updated(root,{value:'.card'})
  expect(items[0].animate).toHaveBeenCalledTimes(1)
  const added=element();items.push(added);directive.updated(root,{value:'.card'})
  expect(added.classList.contains('gn-reveal-pending')).toBe(true)
  directive.unmounted(root)
  expect(added.classList.contains('gn-reveal-pending')).toBe(false)
  expect(observer.disconnect).toHaveBeenCalled()
 })
 it('reveals keyboard targets immediately and honors motion preference changes',()=>{
  const first=element(),second=element(),root=element([first,second])
  directive.mounted(root,{value:'.card'});first.listeners.focusin()
  expect(first.classList.contains('gn-reveal-pending')).toBe(false)
  motion.addEventListener.mock.calls[0][1]({matches:true})
  expect(second.classList.contains('gn-reveal-pending')).toBe(false)
  expect(second.animate).not.toHaveBeenCalled()
  directive.unmounted(root)
 })
 it('keeps content visible with reduced motion or unsupported browsers',()=>{
  motion.matches=true
  const root=element();directive.mounted(root,{})
  expect(root.classList.contains('gn-reveal-pending')).toBe(false)
  directive.unmounted(root)
  window.IntersectionObserver=undefined
  const fallback=element();directive.mounted(fallback,{})
  expect(fallback.classList.contains('gn-reveal-pending')).toBe(false)
  directive.unmounted(fallback)
 })
})
