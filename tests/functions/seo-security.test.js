import { it, expect, vi } from 'vitest'
const records=vi.hoisted(()=>({docs:[]}))
vi.mock('firebase-admin/firestore',()=>({getFirestore:()=>({collection:()=>({where:()=>({get:async()=>records})})})}))
vi.mock('../../netlify/functions/lib/firebase-admin.js',()=>({adminApp:()=>({})}))
import { handler } from '../../netlify/functions/seo-files.js'
it('sitemap retains published URLs and real timestamps without exposing future/private/draft URLs',async()=>{
  const now=Date.now(), fixture={
    public:{status:'approved',visibility:'public',createdAt:now,slug:'published'},
    timestamp:{status:'approved',createdAt:{toMillis:()=>now},slug:'timestamp'},
    future:{status:'approved',releaseAt:now+86400000,slug:'future-secret'},
    private:{status:'approved',visibility:'private',slug:'private-secret'},
    draft:{status:'draft',slug:'draft-secret'}
  }
  records.docs=Object.entries(fixture).map(([id,data])=>({id,data:()=>data}))
  const result=await handler({httpMethod:'GET',queryStringParameters:{type:'sitemap'},headers:{}})
  expect(result.statusCode).toBe(200)
  expect(result.body).toContain('/post/published')
  expect(result.body).toContain('/post/timestamp')
  expect(result.body).toContain(new Date(now).toISOString())
  expect(result.body).not.toMatch(/future-secret|private-secret|draft-secret/)
})
