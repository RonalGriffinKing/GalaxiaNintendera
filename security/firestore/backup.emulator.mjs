import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Firestore, Timestamp, GeoPoint, FieldValue } from 'firebase-admin/firestore'
import { createKey, exportBackup, verifyBackup, restoreEmulator, capture, emulatorCredentials, createEmulatorClient } from '../../scripts/firestore-private-backup.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8055')throw Error('Local demo emulator required')
let directory,key,source,target
before(async()=>{
  directory=await mkdtemp(join(tmpdir(),'galaxia-backup-test-'))
  key=join(directory,'separate-keys','key.bin');await createKey(key)
  const suffix=Date.now()
  source=new Firestore({projectId:`demo-backup-source-${suffix}`,useBigInt:true,credentials:emulatorCredentials})
  target=new Firestore({projectId:`demo-backup-target-${suffix}`,useBigInt:true,credentials:emulatorCredentials})
  await source.doc('users/synthetic').create({name:'Synthetic test',email:'fake@example.test',integer:9223372036854775807n,negative:-9223372036854775808n,double:1.5,negativeZero:-0,nan:NaN,infinity:Infinity,negativeInfinity:-Infinity,date:new Timestamp(1700000000,123456789),geo:new GeoPoint(40,-3),bytes:Buffer.from([0,255,13]),nothing:null,yes:true,list:[1n,'test',{nested:2n}],map:{'__proto__safe':'safe',kind:'map'},reference:source.doc('users/synthetic'),vector:FieldValue.vector([1,2,3])})
  await source.doc('users/synthetic/history/entry').create({reward:1n})
  await source.doc('missing/parent/children/child/deeper/last').create({survives:true})
  await source.doc('empty/document').create({})
  const client=createEmulatorClient(source.projectId)
  try{const database=`projects/${source.projectId}/databases/(default)`;await client.commit({database,writes:[{update:{name:database+'/documents/numbers/integral-double',fields:{value:{doubleValue:42}}}}]},{otherArgs:{headers:{authorization:'Bearer owner'}}})}finally{await client.close()}
})
after(async()=>{await source?.terminate();await target?.terminate();if(directory)await rm(directory,{recursive:true,force:true})})

test('all collections, orphan subcollections, IDs and native types survive encrypted backup and isolated restore',async()=>{
  const out=join(directory,'backup')
  const result=await exportBackup(source,out,key)
  assert.equal(result.documents,5)
  assert.equal(result.missingParents,2)
  const encrypted=await readFile(join(out,'documents.enc'))
  assert.equal(encrypted.includes(Buffer.from('fake@example.test')),false)
  const verified=await verifyBackup(out,key)
  assert.equal(verified.summary.verified,true)
  assert.ok(verified.backup.records.every(d=>!d.exists||d.createTime&&d.updateTime))
  let restored
  try{restored=await restoreEmulator(target,out,key)}catch(error){
    const actual=await capture(target)
    const differences=[]
    for(const record of verified.backup.records){const other=actual.records.find(d=>d.path===record.path);if(record.exists&&other?.exists)for(const [field,value]of record.data[1]){const saved=other.data[1].find(([key])=>key===field)?.[1];if(field!=='reference'&&JSON.stringify(value)!==JSON.stringify(saved))differences.push(field)}}
    throw Error('Restore test failed; differing field names only: '+differences.join(','),{cause:error})
  }
  assert.equal(restored.restoredAndCompared,true)
  const doc=(await target.doc('users/synthetic').get()).data()
  assert.equal(doc.integer,9223372036854775807n)
  assert.equal(doc.negative,-9223372036854775808n)
  assert.equal(doc.date.nanoseconds,(await source.doc('users/synthetic').get()).data().date.nanoseconds)
  assert.equal(doc.reference.firestore.projectId,target.projectId)
  assert.equal(doc.reference.path,'users/synthetic')
  assert.deepEqual(doc.vector.toArray(),[1,2,3])
  assert.equal(typeof (await target.doc('numbers/integral-double').get()).data().value,'number')
  assert.equal((await target.doc('missing/parent').get()).exists,false)
  assert.equal((await target.doc('missing/parent/children/child/deeper/last').get()).exists,true)
})
test('verification rejects corruption and wrong encryption keys before restore',async()=>{
  const original=join(directory,'backup'),tampered=join(directory,'tampered')
  await mkdir(tampered)
  const encrypted=await readFile(join(original,'documents.enc'));encrypted[0]^=1
  await writeFile(join(tampered,'documents.enc'),encrypted)
  await writeFile(join(tampered,'manifest.json'),await readFile(join(original,'manifest.json')))
  await assert.rejects(verifyBackup(tampered,key))
  const wrong=join(directory,'wrong-key');await writeFile(wrong,Buffer.alloc(32))
  await assert.rejects(verifyBackup(original,wrong))
})
test('restore refuses nonempty targets and production project identifiers',async()=>{
  await assert.rejects(restoreEmulator(target,join(directory,'backup'),key),/empty-target/)
  await assert.rejects(restoreEmulator({projectId:'widget-dreams'},join(directory,'backup'),key),/only-local-demo/)
})
test('source-side changes stop the backup without producing a valid archive',async()=>{
  let scans=0
  const unstable={listCollections:async()=>{scans++;return [{path:'test',listDocuments:async()=>[{path:'test/doc',get:async()=>({exists:true,data:()=>({n:BigInt(scans)}),createTime:new Timestamp(1,0),updateTime:new Timestamp(scans,0)}),listCollections:async()=>[]}]}]}}
  await assert.rejects(exportBackup(unstable,join(directory,'unstable'),key),/database-changed/)
})
test('documented CLI exports, verifies and restores only local demo fixtures with aggregate output',()=>{
  const out=join(directory,'cli-backup'),script=new URL('../../scripts/firestore-private-backup.mjs',import.meta.url)
  const run=args=>spawnSync(process.execPath,[fileURLToPath(script),...args],{encoding:'utf8',env:{...process.env,PROGRESS_ENABLED:'false'},windowsHide:true})
  for(const args of [
    ['export','--project',source.projectId,'--dir',out,'--key',key],
    ['verify','--dir',out,'--key',key],
    ['restore-emulator','--project',`demo-cli-restore-${Date.now()}`,'--dir',out,'--key',key]
  ]){
    const result=run(args)
    assert.equal(result.status,0,'CLI operation must succeed with synthetic data')
    assert.equal(JSON.parse(result.stdout).documents,5)
    assert.equal(result.stdout.includes('fake@example.test'),false)
  }
})
