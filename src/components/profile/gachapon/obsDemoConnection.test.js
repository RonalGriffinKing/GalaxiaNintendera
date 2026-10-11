import { it, expect } from 'vitest'
import { createObsDemoConnection, verifyObsDemoConnection } from './obsDemoConnection'
it('local demo asks for matching password without including plaintext',async()=>{
 const token=await createObsDemoConnection('demo-test-password')
 const decoded=atob(token.replaceAll('-','+').replaceAll('_','/'))
 expect(decoded).not.toContain('demo-test-password')
 await expect(verifyObsDemoConnection(token,'demo-test-password')).resolves.toBe(true)
 await expect(verifyObsDemoConnection(token,'wrong')).rejects.toThrow('Clave incorrecta')
 await expect(verifyObsDemoConnection('invalid','demo-test-password')).rejects.toThrow()
})
it('rejects expired links and short passwords',async()=>{
 await expect(createObsDemoConnection('abc')).rejects.toThrow()
 const token=await createObsDemoConnection('demo-pass'),data=JSON.parse(atob(token.replaceAll('-','+').replaceAll('_','/')))
 data.expires=0
 await expect(verifyObsDemoConnection(btoa(JSON.stringify(data)),'demo-pass')).rejects.toThrow('caducado')
})
