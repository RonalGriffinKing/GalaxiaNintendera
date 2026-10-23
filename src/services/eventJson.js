import { eventGameNames,parseEventGame } from './eventGame'
export const EVENT_TYPES = ['Direct', 'Live', 'Torneo', 'Anuncio', 'Comunidad', 'Podcast', 'Evento', 'Lanzamiento post']
export function eventLocalDate(value) {
 const date=new Date(value)
 if(!Number.isFinite(date.getTime())) throw new Error('La fecha y hora no son validas.')
 return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)
}
export function parseEventJson(text, communities=[]) {
 let data
 try { data=JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')) }
 catch { throw new Error('JSON no valido. Revisa comillas, comas y llaves.') }
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Pega un objeto JSON de evento.')
 data=data.event || data.evento || data
 const result={}
 const fields={title:['title','titulo'],description:['description','descripcion'],url:['url','link'],backgroundUrl:['backgroundUrl','imageUrl','imagen']}
 for(const [field,names] of Object.entries(fields)){
  const key=names.find(k=>Object.hasOwn(data,k));if(!key)continue
  if(typeof data[key]!=='string')throw new Error('El campo '+field+' debe ser texto.')
  result[field]=data[key].trim()
 }
 const game=parseEventGame(data)
 if(game)result.game=game
 if(!result.title)throw new Error('El JSON debe incluir un titulo.')
 const type=data.type??data.tipo
 if(type!==undefined){
  const normalized=String(type).trim().toLowerCase()
  const match=normalized==='directo'?'Direct':EVENT_TYPES.find(v=>v.toLowerCase()===normalized)
  if(!match)throw new Error('Tipo de evento no reconocido. Usa '+EVENT_TYPES.join(', ')+' (tambien se admite Directo).')
  result.type=match
 }
 const date=data.startsAt??(data.fecha&&data.hora?data.fecha+'T'+data.hora:undefined)
 if(date!==undefined){
  if(typeof date!=='number'&&(typeof date!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)?$/.test(date)))throw new Error('Usa startsAt en formato ISO o fecha YYYY-MM-DD y hora HH:mm.')
  if(typeof date==='string') {const [y,m,d]=date.slice(0,10).split('-').map(Number);if(new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==date.slice(0,10))throw new Error('La fecha no existe.')}
  result.startsAt=eventLocalDate(date)
 }
 const duration=data.durationMinutes??data.duracion
 if(duration!==undefined){if(typeof duration!=='number'||!Number.isFinite(duration)||duration<0||duration>10080)throw new Error('La duracion debe ser un numero entre 0 y 10080 minutos.');result.durationMinutes=duration}
 const ids=data.communityIds??(data.communityId?[data.communityId]:undefined)
 if(ids!==undefined){if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!communities.some(c=>c.id===id)))throw new Error('Hay comunidades no reconocidas. Usa sus IDs disponibles.');result.communityIds=[...new Set(ids)]}
 return result
}

export function parseEventsJson(text, communities=[]) {
 let data
 try {data=JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))}catch{throw new Error('JSON no valido. Pega una lista de eventos.')}
 const rows=Array.isArray(data)?data:data?.events??data?.eventos
 if(!Array.isArray(rows)||!rows.length||rows.length>50)throw new Error('Incluye entre 1 y 50 eventos en una lista o en events/eventos.')
 return rows.map((row,index)=>{
  try {const value=parseEventJson(JSON.stringify(row),communities);if(!value.startsAt)throw new Error('Falta fecha y hora.');return {description:'',type:'Evento',durationMinutes:60,url:'',backgroundUrl:'',communityIds:[],...value}}
  catch(e){throw new Error('Evento '+(index+1)+': '+e.message)}
 })
}
export function eventCreatePayload(event,communities,userId,now=Date.now()) {
 const selected=communities.filter(c=>event.communityIds?.includes(c.id))
 return {title:event.title,game:eventGameNames(event),description:event.description||'',type:event.type||'Evento',startsAt:new Date(event.startsAt).getTime(),durationMinutes:event.durationMinutes??60,url:event.url||'',backgroundUrl:event.backgroundUrl||'',communityIds:selected.map(c=>c.id),communityNames:selected.map(c=>c.name),communityId:selected[0]?.id||'',communityName:selected[0]?.name||'',createdAt:now,updatedAt:now,createdBy:userId}
}
