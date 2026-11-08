import { beforeEach, describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createPublicContentHandler, publicProfile, visiblePublicContent } from '../../netlify/functions/lib/public-content.js'
import { authorizedRole, isAuthorizedAdmin } from './authorizedIdentity'
import identities from '../../security/authorized-identities.json'
function database(data) {
  const reads=[]
  return {reads,doc:path=>({get:async()=>({id:path.split('/').at(-1),exists:path in data,data:()=>data[path]})}),collection(name){let cursor='',limit=50;return{orderBy(){return this},limit(n){limit=n;return this},select(...fields){reads.push({fields});return this},startAfter(id){cursor=id;return this},async get(){reads.push(name);return{docs:Object.keys(data).filter(path=>path.startsWith(name+'/')&&path.split('/').length===2&&path.split('/')[1]>cursor).sort().slice(0,limit).map(path=>({id:path.split('/')[1],data:()=>data[path]}))}}}}}
}
describe('explicit identity authority',()=>{
  it('recognizes only the confirmed UID, including when its old role field is wrong',()=>{
    expect(identities).toEqual({adminUids:['vOWD2r82tSgrSqHL8PUfCkPcrhG2'],publisherUids:[]})
    expect(authorizedRole(identities.adminUids[0])).toBe('admin')
    expect(authorizedRole('forged-admin')).toBe('user')
    expect(isAuthorizedAdmin('forged-admin')).toBe(false)
    const rules=readFileSync('security/firestore/firestore.permanent.rules','utf8')
    expect(rules).toContain(identities.adminUids[0])
    expect(rules.match(/function isAdmin\(\) \{([^}]+)}/)[1]).not.toContain('role')
    expect(rules).not.toContain('timestamp.date')
  })
})
describe('public data compatibility boundary',()=>{
  it('never publishes old balances, credentials, moderation flags or claimed roles',()=>{
    const projected=publicProfile('forged',{name:'private@example.test',email:'private@example.test',role:'admin',password:'secret',stars:500,canChat:true,participationStars:35,selectedIconEffect:{token:'secret',special:true},socialLinks:{youtube:'https://example.test/channel',privateToken:'secret'}})
    const output=JSON.stringify(projected)
    expect(projected).toMatchObject({name:'Usuario',role:'user',participationStars:35})
    expect(output).not.toMatch(/private@example|secret|password|canChat|"stars"/)
  })
  it('filters draft/private/future posts and supports old published documents without new fields',()=>{
    expect(visiblePublicContent('posts',{status:'approved'},100)).toBe(true)
    for(const data of [{status:'draft'},{status:'approved',visibility:'private'},{status:'approved',releaseAt:101},{status:'approved',scheduledAt:'2999-01-01'},{status:'approved',scheduledAt:'invalid'}])expect(visiblePublicContent('posts',data,100)).toBe(false)
  })
  it('rejects writes and arbitrary paths before contacting Firestore',async()=>{
    const db=database({}),handler=createPublicContentHandler(db)
    expect((await handler({httpMethod:'POST'})).statusCode).toBe(405)
    for(const query of [{collection:'mailQueue'},{collection:'users',id:'../../mailQueue'}])expect((await handler({httpMethod:'GET',queryStringParameters:query})).statusCode).toBe(400)
    expect(db.reads).toEqual([])
  })
  it('paginates even when a page contains only hidden documents',async()=>{
    const data={};for(let n=0;n<51;n++)data['posts/p'+String(n).padStart(3,'0')]={status:n===50?'approved':'draft'}
    const handler=createPublicContentHandler(database(data))
    const first=JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{collection:'posts'}})).body)
    expect(first.docs).toEqual([]);expect(first.nextCursor).toBe('p049')
    const second=JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{collection:'posts',cursor:first.nextCursor}})).body)
    expect(second.docs.map(doc=>doc.id)).toEqual(['p050'])
  })
  it('only returns the verified viewer reminder and converts Firestore times to milliseconds',async()=>{
    const handler=createPublicContentHandler(database({'galaxyEvents/event':{title:'Event',startsAt:{toMillis:()=>1234},notifyBy:['alice','bob']}}),async()=>({uid:'alice'}))
    const result=JSON.parse((await handler({httpMethod:'GET',queryStringParameters:{collection:'galaxyEvents'},headers:{authorization:'Bearer test'}})).body)
    expect(result.docs[0]).toMatchObject({startsAt:1234,notifyBy:['alice']})
  })
})
