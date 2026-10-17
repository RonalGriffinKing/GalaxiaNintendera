import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPublicPageCache, peekPublicPage, isPublicPageFresh, requestPublicPage, storePublicPage, PUBLIC_PAGE_TTL } from './publicPageCache'
beforeEach(()=>{clearPublicPageCache();vi.useFakeTimers();vi.setSystemTime(100000)})
afterEach(()=>vi.useRealTimers())
describe('public navigation cache',()=>{
 it('reuses fresh data without another request',async()=>{
  const load=vi.fn(async()=>[{id:'one'}]);const first=await requestPublicPage('home',load)
  expect(await requestPublicPage('home',load)).toBe(first);expect(load).toHaveBeenCalledTimes(1)
 })
 it('deduplicates concurrent requests',async()=>{
  const load=vi.fn(async()=>['one']);const a=requestPublicPage('home',load),b=requestPublicPage('home',load)
  expect(a).toBe(b);await Promise.all([a,b]);expect(load).toHaveBeenCalledTimes(1)
 })
 it('keeps stale content available while a refresh runs',async()=>{
  storePublicPage('home',['old']);vi.advanceTimersByTime(PUBLIC_PAGE_TTL+1)
  let finish;const refresh=requestPublicPage('home',()=>new Promise(resolve=>finish=resolve));await Promise.resolve()
  expect(peekPublicPage('home')).toEqual(['old']);expect(isPublicPageFresh('home')).toBe(false)
  finish(['new']);await refresh;expect(peekPublicPage('home')).toEqual(['new'])
 })
 it('does not erase good content after network failure',async()=>{
  storePublicPage('home',['old']);vi.advanceTimersByTime(PUBLIC_PAGE_TTL+1)
  await expect(requestPublicPage('home',async()=>{throw Error('offline')})).rejects.toThrow('offline')
  expect(peekPublicPage('home')).toEqual(['old'])
 })
 it('does not repopulate invalidated entries with an old in-flight response',async()=>{
  let finish;const old=requestPublicPage('home',()=>new Promise(resolve=>finish=resolve));await Promise.resolve()
  clearPublicPageCache();await requestPublicPage('home',async()=>['new']);finish(['old']);await old
  expect(peekPublicPage('home')).toEqual(['new'])
 })
 it('separates page and sort keys and bounds memory',()=>{
  storePublicPage('news:recent',['recent']);storePublicPage('news:oldest',['oldest'])
  expect(peekPublicPage('news:recent')).toEqual(['recent'])
  for(let i=0;i<121;i++)storePublicPage('page:'+i,[i])
  expect(peekPublicPage('news:recent')).toBeUndefined();expect(peekPublicPage('page:120')).toEqual([120])
 })
})
