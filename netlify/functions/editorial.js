import {createServerRuntime} from '../../security/editorial/runtime.mjs';
// Testable facade. Dependency injection here is ONLY for offline tests, not a deployment switch.
export function createEditorialHandler({service,reader}){
 return async event=>{
  const reply=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
  try{
   if(event.httpMethod!=='POST')return reply(405,{error:{code:'method-not-allowed'}});
   if(event.isBase64Encoded||typeof event.body!=='string'||event.body.length>300000)return reply(400,{error:{code:'invalid-request'}});
   const request=JSON.parse(event.body);
   if(!request||Object.keys(request).some(k=>!['operation','input'].includes(k)))return reply(400,{error:{code:'invalid-request'}});
   if(['page','article','categories','pages'].includes(request.operation))return reply(200,{result:await reader.read(request.operation,request.input)});
   if(request.operation!=='manage')return reply(400,{error:{code:'invalid-request'}});
   const header=event.headers?.authorization||event.headers?.Authorization||'';
   if(!header.startsWith('Bearer '))return reply(401,{error:{code:'unauthorized'}});
   return reply(200,{result:await service.execute(header.slice(7),request.input)});
  }catch(error){const code=error.code;if([4,13,14,'unavailable','deadline-exceeded'].includes(code)||(!code&&!(error instanceof SyntaxError)))return reply(503,{error:{code:'reader-unavailable'}});const allowed=['invalid-page','page-list-limit','admin-not-configured','admin-list-limit','unauthorized','forbidden','invalid-input','invalid-id','invalid-action','invalid-revision','invalid-status','source-conflict','revision-conflict','request-conflict','slug-conflict','slug-change-requires-review'];return reply(['unauthorized','forbidden'].includes(code)?403:allowed.includes(code)?409:400,{error:{code:allowed.includes(code)?code:'editorial-request-rejected'}});}
 };
}
export async function handler(event){
 // Explicit server configuration is required before SDK initialization.
 let runtime;try{runtime=createServerRuntime();return await createEditorialHandler(runtime)(event);}catch{return {statusCode:503,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({error:{code:'server-unavailable'}})};}finally{await runtime?.close();}
}
