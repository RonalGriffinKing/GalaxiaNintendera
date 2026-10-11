import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
const response=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(body)})
export const handler=async event=>{
 if(event.httpMethod!=='POST')return response(405,{error:'method-not-allowed'})
 const secret=process.env.GACHAPON_OBS_KEY
 if(!secret || secret.length<32)return response(503,{error:'not-configured'})
 if((event.body||'').length>4096)return response(400,{error:'invalid-request'})
 let body;try{body=JSON.parse(event.body||'{}')}catch{return response(400,{error:'invalid-request'})}
 if(typeof body.password!=='string'||body.password.length<4||body.password.length>128)return response(400,{error:'password-length'})
 const sign=value=>createHmac('sha256',secret).update(value).digest('base64url')
 if(body.action==='create'){
  const salt=randomBytes(16).toString('hex'),expires=Date.now()+12*60*60*1000
  const payload=Buffer.from(JSON.stringify({salt,hash:scryptSync(body.password,salt,32).toString('hex'),expires})).toString('base64url')
  return response(200,{token:payload+'.'+sign(payload),expires})
 }
 if(body.action!=='verify'||typeof body.token!=='string')return response(400,{error:'invalid-request'})
 try{
  const [payload,signature,...extra]=body.token.split('.')
  const a=Buffer.from(signature||''),b=Buffer.from(sign(payload||''))
  if(extra.length||a.length!==b.length||!timingSafeEqual(a,b))return response(401,{error:'invalid-link'})
  const data=JSON.parse(Buffer.from(payload,'base64url').toString())
  if(!Number.isFinite(data.expires)||Date.now()>data.expires)return response(401,{error:'expired-link'})
  const expected=Buffer.from(data.hash,'hex'),actual=scryptSync(body.password,data.salt,32)
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return response(401,{error:'wrong-password'})
  return response(200,{authorized:true,mode:'demonstration'})
 }catch{return response(401,{error:'invalid-link'})}
}
