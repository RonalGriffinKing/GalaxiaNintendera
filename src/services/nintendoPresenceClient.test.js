import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

let fetchSource,fetchMock
const identity={platform:'nintendo',displayName:'Prueba',presence:{state:'offline'}}
const url='https://nxapi-presence.fancy.org.uk/api/presence/d392169fdeb68a8e'
beforeEach(async()=>{vi.resetModules();fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);fetchSource=(await import('./nintendoPresenceClient')).fetchNintendoSource})
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
describe('Nintendo browser source cache',()=>{
 it('rejects external URLs before any network call',()=>{expect(()=>fetchSource('https://evil.test')).toThrow();expect(fetchMock).not.toHaveBeenCalled()})
 it('shares pending requests across preview, summary and gamer then expires',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(0)
  fetchMock.mockImplementation(async()=>new Response(JSON.stringify(identity)))
  await Promise.all([fetchSource(url),fetchSource(url)]);expect(fetchMock).toHaveBeenCalledTimes(1)
  await fetchSource(url);expect(fetchMock).toHaveBeenCalledTimes(1)
  vi.setSystemTime(60001);await fetchSource(url);expect(fetchMock).toHaveBeenCalledTimes(2)
 })
 it('does not cache errors and allows retry',async()=>{
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({error:'No disponible'}),{status:502})).mockResolvedValueOnce(new Response(JSON.stringify(identity)))
  await expect(fetchSource(url)).rejects.toThrow('No disponible');await expect(fetchSource(url)).resolves.toEqual(identity);expect(fetchMock).toHaveBeenCalledTimes(2)
 })
})
