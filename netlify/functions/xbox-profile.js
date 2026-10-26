import { handler } from '../lib/xbox-profile.js'

// Native Netlify runtime supplies the persistent Blobs context automatically.
export default async function xboxProfile(request) {
 const url=new URL(request.url)
 const result=await handler({httpMethod:request.method,headers:Object.fromEntries(request.headers.entries()),queryStringParameters:Object.fromEntries(url.searchParams.entries())})
 return new Response(result.statusCode===204?null:result.body,{status:result.statusCode,headers:result.headers})
}
