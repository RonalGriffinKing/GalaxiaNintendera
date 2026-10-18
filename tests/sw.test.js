import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {beforeEach,describe,it,expect,vi} from 'vitest'
let handlers,cache,storage,fetcher
beforeEach(()=>{
 handlers={};cache={put:vi.fn()};storage={match:vi.fn(async()=>undefined),open:vi.fn(async()=>cache),keys:vi.fn(async()=>['galaxia-nintendera-v2']),delete:vi.fn(async()=>true)};fetcher=vi.fn(async()=>new Response('ok'))
 runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{URL,Promise,caches:storage,fetch:fetcher,self:{location:{origin:'https://example.com'},clients:{claim:vi.fn()},addEventListener:(name,fn)=>{handlers[name]=fn}}})
})
const request=(path,headers={})=>({request:{method:'GET',url:'https://example.com'+path,headers:new Headers(headers)},respondWith:vi.fn()})
describe('offline cache',()=>{
 it('bypasses old cached function responses and authenticated requests',()=>{
  for(const event of [request('/.netlify/functions/xbox-profile?uid=owner'),request('/.netlify/functions/nintendo-presence'),request('/private-data',{Authorization:'Bearer session'})]){handlers.fetch(event);expect(event.respondWith).not.toHaveBeenCalled()}
  expect(storage.match).not.toHaveBeenCalled()
 })
 it('does not save responses marked no-store or private',async()=>{
  for(const policy of ['no-store','private, max-age=300']){fetcher.mockResolvedValueOnce(new Response('data',{headers:{'Cache-Control':policy}}));const event=request('/data');handlers.fetch(event);await event.respondWith.mock.calls[0][0]}
  expect(cache.put).not.toHaveBeenCalled()
 })
 it('clears obsolete caches when the new worker activates',async()=>{
  const event={waitUntil:vi.fn()};handlers.activate(event);await event.waitUntil.mock.calls[0][0];expect(storage.delete).toHaveBeenCalledWith('galaxia-nintendera-v2')
 })
})
