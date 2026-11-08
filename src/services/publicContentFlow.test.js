import { expect, it, vi } from 'vitest'
import { createPublicContentHandler } from '../../netlify/functions/lib/public-content.js'
vi.mock('@/firebase',()=>({auth:{currentUser:null},db:{}}))
vi.mock('firebase/firestore',()=>({doc:vi.fn(),getDoc:vi.fn()}))
import { publicUsers, publicUser, publicPostPage } from './publicContentClient'

it('runs the actual frontend directory/profile/news flow through the real read function, across 451 users',async()=>{
  const records=Object.fromEntries(Array.from({length:451},(_,i)=>[`users/u${String(i).padStart(3,'0')}`,{name:`User ${i}`,imageUrl:'https://example.test/avatar.png',email:'private@example.test',password:'secret',canChat:true}]))
  records['posts/published']={title:'Public',status:'approved',createdAt:10,authorId:'u000'}
  records['posts/draft']={title:'Hidden',status:'draft',createdAt:20,authorId:'u000'}
  const db={doc:path=>({get:async()=>({id:path.split('/')[1],exists:path in records,data:()=>records[path]})}),collection(name){let cursor='',size=50;return {orderBy(){return this},limit(value){size=value;return this},select(){return this},startAfter(value){cursor=value;return this},async get(){return {docs:Object.keys(records).filter(path=>path.startsWith(name+'/')&&path.split('/')[1]>cursor).sort().slice(0,size).map(path=>({id:path.split('/')[1],data:()=>records[path]}))}}}}}
  const handler=createPublicContentHandler(db)
  const calls=[]
  vi.stubGlobal('fetch',async url=>{
    calls.push(url)
    const result=await handler({httpMethod:'GET',queryStringParameters:Object.fromEntries(new URL(url,'https://local.test').searchParams)})
    return {ok:result.statusCode===200,json:async()=>JSON.parse(result.body)}
  })
  try {
    const directory=await publicUsers()
    expect(directory.docs).toHaveLength(451)
    expect(calls.filter(url=>url.includes('collection=users'))).toHaveLength(10)
    expect(directory.docs[0].data()).toMatchObject({name:'User 0',imageUrl:'https://example.test/avatar.png'})
    const profile=await publicUser('u000')
    expect(profile.exists()).toBe(true)
    expect(JSON.stringify(directory.docs.map(item=>item.data()))).not.toContain('private@example.test')
    expect(profile.data()).not.toHaveProperty('password')
    expect(profile.data()).not.toHaveProperty('canChat')
    expect((await publicPostPage({author:'u000',limit:6})).docs.map(item=>item.id)).toEqual(['published'])
  } finally {vi.unstubAllGlobals()}
})
