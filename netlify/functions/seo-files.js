import {createServerRuntime} from '../../security/editorial/runtime.mjs'
import {createEditorialQueries} from '../../security/editorial/queries.mjs'
import {buildEditorialSitemap} from '../../security/editorial/seo.mjs'
export const handler=async event=>{
 const siteUrl=resolveSiteUrl(event)
 const headers={'content-type':'application/xml; charset=utf-8','cache-control':'no-store'}
 if(event.queryStringParameters?.type==='robots')return {statusCode:200,headers:{...headers,'content-type':'text/plain; charset=utf-8'},body:'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /perfil\nDisallow: /login\nSitemap: '+siteUrl+'/sitemap.xml\n'}
 let runtime
 try{runtime=createServerRuntime();return {statusCode:200,headers,body:await buildEditorialSitemap(createEditorialQueries(runtime.reader),siteUrl)}}
 catch{return {statusCode:503,headers:{...headers,'content-type':'text/plain'},body:'Sitemap no disponible; no se confirma una lista vacia.'}}
 finally{await runtime?.close()}
}
function resolveSiteUrl(event) {
  const configured = String(process.env.VITE_SITE_URL || 'https://galaxianintendera.com').trim()
  if (configured) return configured.replace(/\/$/, '')
  const host = event.headers?.['x-forwarded-host'] || event.headers?.host || 'localhost:8888'
  const protocol = event.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

