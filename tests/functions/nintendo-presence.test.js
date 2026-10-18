import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
let handler, fetchMock
const payload={friend:{name:'Prueba',presence:{state:'OFFLINE',game:{}}}}
beforeEach(async()=>{vi.resetModules();fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);handler=(await import('../../netlify/functions/nintendo-presence.js')).handler})
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
const event=(id='d392169fdeb68a8e',extra={})=>({httpMethod:'GET',queryStringParameters:{id,...extra}})
describe('nxapi bounded proxy',()=>{
 it('rejects methods and arbitrary destinations without fetching',async()=>{
  expect((await handler({...event(),httpMethod:'POST'})).statusCode).toBe(405)
  for(const args of [event('https://evil.test'),event('../etc'),event(undefined,{url:'https://evil.test'}),event(undefined,{source:'evil'}),event('de97_DbiogMuJB5WFpmvKA',{source:'profile',url:'https://evil.test'})])expect((await handler(args)).statusCode).toBe(400)
  expect(fetchMock).not.toHaveBeenCalled()
 })
 it('builds a fixed upstream URL, forbids redirects and caches for 60 seconds',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(0)
  fetchMock.mockImplementation(async()=>new Response(JSON.stringify(payload),{headers:{'content-type':'application/json'}}))
  const first=await handler(event());expect(first.statusCode).toBe(200)
  expect(fetchMock.mock.calls[0][0]).toBe('https://nxapi-presence.fancy.org.uk/api/presence/d392169fdeb68a8e')
  expect(fetchMock.mock.calls[0][1].redirect).toBe('error')
  await handler(event());expect(fetchMock).toHaveBeenCalledTimes(1)
  vi.setSystemTime(60001);await handler(event());expect(fetchMock).toHaveBeenCalledTimes(2)
 })
 it('deduplicates simultaneous requests',async()=>{
  fetchMock.mockImplementation(async()=>new Response(JSON.stringify(payload),{headers:{'content-type':'application/json'}}))
  await Promise.all([handler(event()),handler(event())]);expect(fetchMock).toHaveBeenCalledTimes(1)
 })
 it('normalizes only embedded public profile JSON',async()=>{
  const id='de97_DbiogMuJB5WFpmvKA',state={['profile_id_'+id]:{profile:{id,name:'Perfil',recent_titles:[],most_played_titles:[]}}}
  fetchMock.mockResolvedValue(new Response('<script id="state" type="application/json">'+JSON.stringify(state)+'</script>',{headers:{'content-type':'text/html'}}))
  const result=await handler(event(id,{source:'profile'}));expect(result.statusCode).toBe(200);expect(JSON.parse(result.body).library).toBeNull()
  expect(fetchMock.mock.calls[0][0]).toBe('https://nxapi-auth.fancy.org.uk/profile/'+id)
 })
 it('handles errors, malformed payloads, wrong formats and oversized bodies',async()=>{
  for(const response of [new Response('',{status:404}),new Response('bad',{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response('x'.repeat(65537),{headers:{'content-type':'application/json'}})]){
   fetchMock.mockResolvedValueOnce(response);const result=await handler(event());expect(result.statusCode).toBe(502);expect(result.headers['Cache-Control']).toBe('no-store')
  }
  fetchMock.mockRejectedValueOnce(new Error('timeout'));expect((await handler(event())).statusCode).toBe(502)
 })
})
