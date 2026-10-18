import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
let session
let fetchProfile,clearCache,fetchMock
const identity={platform:'xbox',xuid:'2533274792093122',displayName:'Player'}
beforeEach(async()=>{vi.resetModules();session=(await import('@/firebase')).auth;await session.authStateReady();session.currentUser={uid:'owner',getIdToken:vi.fn(async()=>'firebase-test-token')};fetchMock=vi.fn(async()=>new Response(JSON.stringify(identity)));vi.stubGlobal('fetch',fetchMock);const module=await import('./xboxProfileClient');fetchProfile=module.fetchXboxProfile;clearCache=module.clearXboxProfileCache})
afterEach(()=>{if(session)session.currentUser=null;vi.unstubAllGlobals()})
describe('Xbox browser transport',()=>{
 it('requires an app session for searches and sends only its Firebase token',async()=>{await fetchProfile({gamertag:'Player#1234'});expect(fetchMock.mock.calls[0][0]).toContain('gamertag=Player%231234');expect(fetchMock.mock.calls[0][1].headers).toEqual({Authorization:'Bearer firebase-test-token'});session.currentUser=null;await expect(fetchProfile({gamertag:'Other'})).rejects.toThrow('Inicia sesión');expect(fetchMock).toHaveBeenCalledTimes(1)})
 it('shares cached reads and clears the profile after link changes',async()=>{await Promise.all([fetchProfile({uid:'owner'}),fetchProfile({uid:'owner'})]);expect(fetchMock).toHaveBeenCalledTimes(1);clearCache('owner');await fetchProfile({uid:'owner'});expect(fetchMock).toHaveBeenCalledTimes(2)})
 it('does not reuse signed-in caches for an anonymous visitor',async()=>{await fetchProfile({uid:'owner'});session.currentUser=null;await fetchProfile({uid:'owner'});expect(fetchMock).toHaveBeenCalledTimes(2);expect(fetchMock.mock.calls[1][1].headers).toEqual({})})
 it('allows retry after an upstream error',async()=>{fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({error:'Temporalmente no disponible'}),{status:503}));await expect(fetchProfile({uid:'owner'})).rejects.toThrow('Temporalmente');await expect(fetchProfile({uid:'owner'})).resolves.toEqual(identity)})
})
