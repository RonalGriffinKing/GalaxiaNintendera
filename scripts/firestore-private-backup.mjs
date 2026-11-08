// Private, encrypted Firestore document backup. No production restore capability.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { initializeApp, cert, deleteApp } from 'firebase-admin/app'
import { Firestore, getFirestore, Timestamp, GeoPoint, DocumentReference, FieldValue } from 'firebase-admin/firestore'
import firestorePackage from '@google-cloud/firestore'
import grpc from '@grpc/grpc-js'
const { v1 }=firestorePackage

const LIMIT=256*1024*1024, FORMAT='galaxia-firestore-private-v1'
export const emulatorCredentials={client_email:'emulator@demo.invalid',private_key:'unused-local-emulator',universe_domain:'googleapis.com'}
export function createEmulatorClient(projectId){
  if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8055'||!projectId.startsWith('demo-'))throw Error('restore-only-local-demo-emulator')
  return new v1.FirestoreClient({servicePath:'127.0.0.1',port:8055,grpc,sslCreds:grpc.credentials.createInsecure(),projectId,credentials:emulatorCredentials})
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const sha=data=>createHash('sha256').update(data).digest('hex')
const fail=()=>{throw Error('backup-validation-failed')}
function inside(parent,child){const r=relative(parent,child);return !r||(!r.startsWith('..')&&!isAbsolute(r))}
function outsideRepo(path){if(inside(root,resolve(path)))throw Error('private-files-must-be-outside-repository')}
async function privateDirectory(path){
  outsideRepo(path)
  await mkdir(path,{mode:0o700}) // Must be new; never alter an existing directory.
  if(process.platform==='win32'){
    const sid=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8',windowsHide:true}).trim()
    if(!/^S-1-\d+(?:-\d+)+$/.test(sid))fail()
    execFileSync('icacls.exe',[path,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`],{stdio:'ignore',windowsHide:true})
  }
}
export async function createKey(file){
  outsideRepo(file)
  await privateDirectory(dirname(resolve(file)))
  await writeFile(file,randomBytes(32),{flag:'wx',mode:0o600})
}
function encode(value){
  if(value===null)return ['null']
  if(typeof value==='boolean')return ['bool',value]
  if(typeof value==='string')return ['string',value]
  if(typeof value==='bigint')return ['int',String(value)]
  if(typeof value==='number')return ['double',Number.isNaN(value)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':String(value)]
  if(value instanceof Timestamp)return ['timestamp',String(value.seconds),value.nanoseconds]
  if(value instanceof GeoPoint)return ['geo',value.latitude,value.longitude]
  if(value instanceof DocumentReference)return ['ref',value.firestore.projectId,value.firestore.databaseId,value.path]
  if(value?.constructor?.name==='VectorValue'&&typeof value.toArray==='function')return ['vector',value.toArray()]
  if(Buffer.isBuffer(value)||value instanceof Uint8Array)return ['bytes',Buffer.from(value).toString('base64')]
  if(Array.isArray(value))return ['array',value.map(encode)]
  if(value&&Object.getPrototypeOf(value)===Object.prototype)return ['map',Object.keys(value).sort().map(k=>[k,encode(value[k])])]
  throw Error('unsupported-firestore-type') // Fail closed; never silently lose data.
}
function decode(value,target,source){
  if(!Array.isArray(value))fail()
  const [type,a,b,c]=value
  switch(type){
    case 'null':return null
    case 'bool':if(typeof a!=='boolean')fail();return a
    case 'string':if(typeof a!=='string')fail();return a
    case 'int':return BigInt(a)
    case 'double':return a==='NaN'?NaN:a==='Infinity'?Infinity:a==='-Infinity'?-Infinity:a==='-0'?-0:Number(a)
    case 'timestamp':return new Timestamp(Number(a),b)
    case 'geo':return new GeoPoint(a,b)
    case 'bytes':return Buffer.from(a,'base64')
    case 'vector':return FieldValue.vector(a)
    case 'ref':{
      // Internal references follow the isolated destination; external references stay external.
      const db=a===source.projectId&&b===source.databaseId?target:new Firestore({projectId:a,databaseId:b,useBigInt:true})
      return db.doc(c)
    }
    case 'array':return a.map(v=>decode(v,target,source))
    case 'map':return Object.fromEntries(a.map(([k,v])=>[k,decode(v,target,source)]))
    default:fail()
  }
}
function validPath(path){return typeof path==='string'&&path.split('/').length%2===0&&path.split('/').every(Boolean)&&!path.includes('\0')}
function protoValue(value,target,source){
  const [type,a,b,c]=value
  switch(type){
    case 'null':return {nullValue:0}
    case 'bool':return {booleanValue:a}
    case 'string':return {stringValue:a}
    case 'int':return {integerValue:a}
    case 'double':return {doubleValue:a==='NaN'?NaN:a==='Infinity'?Infinity:a==='-Infinity'?-Infinity:a==='-0'?-0:Number(a)}
    case 'timestamp':return {timestampValue:{seconds:a,nanos:b}}
    case 'geo':return {geoPointValue:{latitude:a,longitude:b}}
    case 'bytes':return {bytesValue:Buffer.from(a,'base64')}
    case 'ref':return {referenceValue:`projects/${a===source.projectId&&b===source.databaseId?target.projectId:a}/databases/${a===source.projectId&&b===source.databaseId?target.databaseId:b}/documents/${c}`}
    case 'vector':return {mapValue:{fields:{__type__:{stringValue:'__vector__'},value:{arrayValue:{values:a.map(n=>({doubleValue:n}))}}}}}
    case 'array':return {arrayValue:{values:a.map(v=>protoValue(v,target,source))}}
    case 'map':return {mapValue:{fields:Object.fromEntries(a.map(([k,v])=>[k,protoValue(v,target,source)]))}}
    default:fail()
  }
}
export async function capture(db){
  const records=[],collections=[];let size=0
  async function visit(collection){
    collections.push(collection.path)
    // listDocuments includes missing parents with surviving subcollections.
    const refs=await collection.listDocuments()
    for(const ref of refs){
      const snapshot=await ref.get()
      const record={path:ref.path,exists:snapshot.exists}
      if(snapshot.exists){record.data=encode(snapshot.data());record.createTime=encode(snapshot.createTime);record.updateTime=encode(snapshot.updateTime)}
      size+=Buffer.byteLength(JSON.stringify(record))
      if(size>LIMIT)throw Error('backup-exceeds-local-memory-limit')
      records.push(record)
      for(const child of await ref.listCollections())await visit(child)
    }
  }
  for(const collection of await db.listCollections())await visit(collection)
  records.sort((a,b)=>a.path.localeCompare(b.path));collections.sort()
  return {collections,records}
}
export async function exportBackup(db,directory,keyFile){
  outsideRepo(directory);outsideRepo(keyFile)
  if(inside(resolve(directory),resolve(keyFile)))throw Error('key-must-be-stored-separately')
  const key=await readFile(keyFile);if(key.length!==32)fail()
  const startedAt=new Date().toISOString()
  const first=await capture(db),second=await capture(db)
  if(sha(JSON.stringify(first))!==sha(JSON.stringify(second)))throw Error('database-changed-repeat-in-quiet-window')
  const content={format:FORMAT,source:{projectId:db.projectId,databaseId:db.databaseId},startedAt,finishedAt:new Date().toISOString(),...second}
  const plain=Buffer.from(JSON.stringify(content));if(plain.length>LIMIT)throw Error('backup-exceeds-local-memory-limit')
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv)
  cipher.setAAD(Buffer.from(FORMAT))
  const encrypted=Buffer.concat([cipher.update(gzipSync(plain)),cipher.final()])
  const manifest={format:FORMAT,algorithm:'aes-256-gcm+gzip',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),sha256:sha(encrypted),bytes:encrypted.length,plainBytes:plain.length,documents:second.records.filter(d=>d.exists).length,missingParents:second.records.filter(d=>!d.exists).length,collections:second.collections.length}
  await privateDirectory(resolve(directory))
  await writeFile(resolve(directory,'documents.enc'),encrypted,{flag:'wx',mode:0o600})
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600})
  await verifyBackup(directory,keyFile)
  return {documents:manifest.documents,missingParents:manifest.missingParents,collections:manifest.collections,bytes:manifest.bytes,plainBytes:manifest.plainBytes,verified:true}
}
export async function verifyBackup(directory,keyFile){
  outsideRepo(directory);outsideRepo(keyFile)
  const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'))
  const encrypted=await readFile(resolve(directory,'documents.enc')),key=await readFile(keyFile)
  if(manifest.format!==FORMAT||key.length!==32||manifest.bytes!==encrypted.length||manifest.sha256!==sha(encrypted)||encrypted.length>LIMIT)fail()
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(manifest.iv,'base64'))
  decipher.setAAD(Buffer.from(FORMAT));decipher.setAuthTag(Buffer.from(manifest.tag,'base64'))
  const compressed=Buffer.concat([decipher.update(encrypted),decipher.final()])
  const plain=gunzipSync(compressed,{maxOutputLength:LIMIT})
  if(plain.length!==manifest.plainBytes)fail()
  const backup=JSON.parse(plain)
  if(backup.format!==FORMAT||!backup.source?.projectId||!backup.source.databaseId||!Array.isArray(backup.records)||!Array.isArray(backup.collections))fail()
  const paths=new Set()
  // Decode/validate every record before any restore operation can write.
  const validationDb=new Firestore({projectId:'demo-backup-validation',useBigInt:true})
  for(const record of backup.records){
    if(!validPath(record.path)||paths.has(record.path)||typeof record.exists!=='boolean')fail()
    paths.add(record.path)
    if(record.exists){decode(record.data,validationDb,backup.source);decode(record.createTime,validationDb,backup.source);decode(record.updateTime,validationDb,backup.source)}
  }
  if(manifest.documents!==backup.records.filter(d=>d.exists).length||manifest.missingParents!==backup.records.filter(d=>!d.exists).length||manifest.collections!==backup.collections.length)fail()
  return {backup,summary:{documents:manifest.documents,missingParents:manifest.missingParents,collections:manifest.collections,bytes:manifest.bytes,plainBytes:manifest.plainBytes,verified:true}}
}
function normalizedRecords(records,projectId,databaseId){
  const normalize=v=>Array.isArray(v)?v[0]==='ref'&&v[1]===projectId&&v[2]===databaseId?['ref','SELF','SELF',v[3]]:v.map(normalize):v
  return records.map(r=>({path:r.path,exists:r.exists,...(r.exists?{data:normalize(r.data)}:{})}))
}
export async function restoreEmulator(db,directory,keyFile){
  if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8055'||!db.projectId.startsWith('demo-')||db.projectId==='widget-dreams')throw Error('restore-only-local-demo-emulator')
  const {backup,summary}=await verifyBackup(directory,keyFile)
  if((await db.listCollections()).length)throw Error('restore-requires-empty-target')
  // Typed gRPC preserves integral doubles and negative zero without JSON coercion.
  // The endpoint is hardcoded to the local emulator; there is no production writer.
  const client=createEmulatorClient(db.projectId)
  try{
    for(const record of backup.records)if(record.exists){
      const database=`projects/${db.projectId}/databases/${db.databaseId}`
      await client.commit({database,writes:[{update:{name:`${database}/documents/${record.path}`,fields:protoValue(record.data,db,backup.source).mapValue.fields},currentDocument:{exists:false}}]},{otherArgs:{headers:{authorization:'Bearer owner'}}})
    }
  }finally{await client.close()}
  const restored=await capture(db)
  const expected=normalizedRecords(backup.records,backup.source.projectId,backup.source.databaseId)
  const actual=normalizedRecords(restored.records,db.projectId,db.databaseId)
  if(JSON.stringify(expected)!==JSON.stringify(actual)||JSON.stringify(backup.collections)!==JSON.stringify(restored.collections))throw Error('restored-data-mismatch')
  return {...summary,restoredAndCompared:true}
}
async function main(){
  const [action,...args]=process.argv.slice(2),options={}
  for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith('--')||!args[i+1])throw Error('invalid-arguments');options[args[i].slice(2)]=args[i+1]}
  if(action==='init-key'){if(!options.key)throw Error('key-path-required');await createKey(resolve(options.key));return {keyCreated:true}}
  if(!options.dir||!options.key)throw Error('directory-and-key-required')
  const directory=resolve(options.dir),key=resolve(options.key)
  if(action==='verify')return(await verifyBackup(directory,key)).summary
  if(!['export','restore-emulator'].includes(action)||!options.project)throw Error('invalid-action')
  const emulator=process.env.FIRESTORE_EMULATOR_HOST
  let app,db
  try{
    if(emulator){
      if(emulator!=='127.0.0.1:8055'||!options.project.startsWith('demo-'))throw Error('only-local-demo-emulator-allowed')
      db=new Firestore({projectId:options.project,useBigInt:true,credentials:emulatorCredentials})
    }else{
      if(action!=='export'||options.project!=='widget-dreams'||options['authorize-production-read']!=='widget-dreams')throw Error('explicit-production-read-authorization-required')
      const credentialFile=process.env.GOOGLE_APPLICATION_CREDENTIALS
      if(!credentialFile)throw Error('private-readonly-credential-file-required')
      outsideRepo(credentialFile)
      const account=JSON.parse(await readFile(credentialFile,'utf8'))
      if(account.project_id!==options.project)throw Error('credential-project-mismatch')
      app=initializeApp({projectId:options.project,credential:cert(account)},'private-backup')
      db=getFirestore(app);db.settings({useBigInt:true})
    }
    return action==='export'?await exportBackup(db,directory,key):await restoreEmulator(db,directory,key)
  }finally{await db?.terminate();if(app)await deleteApp(app)}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Backup operation failed. No document, path, credential or raw server error has been logged. Do not use an incomplete backup.');process.exitCode=1})
}
