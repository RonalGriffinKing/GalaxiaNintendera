import { afterEach, expect, it, vi } from 'vitest'
import xboxProfile from '../../netlify/functions/xbox-profile.js'
afterEach(()=>vi.unstubAllEnvs())
it('serves preflight with an empty body in the native runtime',async()=>{
 const response=await xboxProfile(new Request('https://example.com/.netlify/functions/xbox-profile',{method:'OPTIONS'}))
 expect(response.status).toBe(204);expect(await response.text()).toBe('')
 expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
})
it('keeps JSON errors and method validation in the native entrypoint',async()=>{
 const response=await xboxProfile(new Request('https://example.com/.netlify/functions/xbox-profile',{method:'POST'}))
 expect(response.status).toBe(405);expect((await response.json()).error).toContain('permitido')
})
