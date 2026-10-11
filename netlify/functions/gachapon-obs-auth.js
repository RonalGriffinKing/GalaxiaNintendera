import { createHash, timingSafeEqual } from 'node:crypto'
const response = (statusCode, body) => ({ statusCode, headers: { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }, body: JSON.stringify(body) })
export const handler = async event => {
 if(event.httpMethod !== 'POST') return response(405,{error:'method-not-allowed'})
 const expected=process.env.GACHAPON_OBS_KEY
 if(!expected || expected.length<32) return response(503,{error:'not-configured'})
 const header=event.headers?.authorization || event.headers?.Authorization || ''
 const key=header.startsWith('Bearer ')?header.slice(7):''
 if(!key || key.length>512) return response(401,{error:'unauthorized'})
 const hash=value=>createHash('sha256').update(value).digest()
 if(!timingSafeEqual(hash(key),hash(expected))) return response(401,{error:'unauthorized'})
 return response(200,{authorized:true,mode:'demonstration'})
}
