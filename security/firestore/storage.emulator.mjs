import { readFile } from 'node:fs/promises'
import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getMetadata, getBytes, deleteObject } from 'firebase/storage'
import identities from '../authorized-identities.json' with {type:'json'}
if(process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9199')throw Error('Local demo Storage emulator required')
let env
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-galaxia-permanent',storage:{host:'127.0.0.1',port:9199,rules:await readFile(new URL('../storage.permanent.rules',import.meta.url),'utf8')}})
  await env.withSecurityRulesDisabled(async context=>{
    await uploadBytes(ref(context.storage(),'profile-icons/existing.png'),new Uint8Array([137,80,78,71,13,10,26,10]),{contentType:'image/png'})
    await uploadBytes(ref(context.storage(),'private/old.png'),new Uint8Array([1,2,3]),{contentType:'image/png'})
  })
})
after(async()=>{await env?.cleanup()})
test('published icon images remain readable without authentication',async()=>{
  const file=ref(env.unauthenticatedContext().storage(),'profile-icons/existing.png')
  assert.equal((await assertSucceeds(getMetadata(file))).contentType,'image/png')
  assert.equal((await assertSucceeds(getBytes(file))).byteLength,8)
})
test('ordinary users and the admin browser cannot overwrite, upload or delete files directly',async()=>{
  for(const context of [env.unauthenticatedContext(),env.authenticatedContext('alice'),env.authenticatedContext(identities.adminUids[0])]){
    await assertFails(uploadBytes(ref(context.storage(),'profile-icons/new.png'),new Uint8Array([1])))
    await assertFails(deleteObject(ref(context.storage(),'profile-icons/existing.png')))
  }
})
test('unknown/private Storage paths are not exposed',async()=>{
  await assertFails(getMetadata(ref(env.unauthenticatedContext().storage(),'private/old.png')))
})
