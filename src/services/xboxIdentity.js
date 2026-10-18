/** OpenXBL public-profile adapter. No Xbox identity verification or inferred playtime. */
export function cleanGamertag(value) {
 if(typeof value!=='string')throw Error('Introduce tu gamertag.')
 const tag=value.trim().normalize('NFC')
 if(!/^[\p{L}\p{N} _#-]{1,32}$/u.test(tag))throw Error('Introduce un gamertag válido, incluido #sufijo si lo tiene.')
 return tag
}
export const validXuid=value=>typeof value==='string' && value===value.trim() && /^\d{10,20}$/.test(value)
const text=value=>typeof value==='string'?value.trim().slice(0,200):''
const date=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))?new Date(value).toISOString():null
const image=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}
export const xblContent=value=>value?.content??value
export function xboxProfilePerson(payload,xuid) {
 const content=xblContent(payload)
 const person=content?.people?.find(item=>item.xuid===xuid)
 if(person)return person
 const raw=content?.profileUsers?.find(item=>item.id===xuid)
 if(!raw)return null
 const get=id=>raw.settings?.find(item=>item.id===id)?.value
 return {xuid:raw.id,gamertag:get('Gamertag'),displayPicRaw:get('GameDisplayPicRaw'),gamerScore:get('Gamerscore')}
}
export function findExactXboxPlayer(payload,gamertag) {
 const tag=cleanGamertag(gamertag).toLocaleLowerCase('en-US')
 const people=xblContent(payload)?.people
 if(!Array.isArray(people))throw Error('Respuesta de búsqueda de Xbox no válida.')
 const matches=people.filter(person=>validXuid(person.xuid)&&[person.gamertag,person.uniqueModernGamertag].some(name=>typeof name==='string'&&name.toLocaleLowerCase('en-US')===tag))
 const unique=[...new Map(matches.map(person=>[person.xuid,person])).values()]
 return unique.length===1?unique[0]:null
}
export function normalizeXboxIdentity(person,presencePayload,titlesPayload) {
 if(!validXuid(person?.xuid)||!text(person.uniqueModernGamertag||person.gamertag))throw Error('Perfil Xbox no válido.')
 const presence=xblContent(presencePayload)
 if(presence?.xuid && presence.xuid!==person.xuid)throw Error('La presencia no corresponde al perfil Xbox.')
 const titles=xblContent(titlesPayload)
 if(titles?.xuid && titles.xuid!==person.xuid)throw Error('El historial no corresponde al perfil Xbox.')
 const games=(Array.isArray(titles?.titles)?titles.titles:[]).filter(game=>game.type==='Game' && game.titleHistory?.visible!==false && text(game.name) && /^\d{1,12}$/.test(String(game.titleId))).slice(0,100)
 const gameData=game=>({id:String(game.titleId),title:text(game.name),imageUrl:image(game.displayImage)})
 const history=games.flatMap(game=>{const at=date(game.titleHistory?.lastTimePlayed);return at?[{game:gameData(game),at}]:[]}).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,3)
 const state=presence?.state==='Online'?'online':presence?.state==='Offline'?'offline':'unknown'
 const active=(presence?.devices||[]).flatMap(device=>device.titles||[]).filter(title=>title.state==='Active'&&text(title.name)&&/^\d{1,12}$/.test(String(title.id)))
 // Use a single explicitly active title; never pick arbitrarily between simultaneous games.
 const unique=[...new Map(active.map(title=>[String(title.id),title])).values()]
 const current=state==='online'&&unique.length===1?unique[0]:null
 const currentGame=current?{id:String(current.id),title:text(current.name),imageUrl:games.find(game=>String(game.titleId)===String(current.id))?.displayImage?image(games.find(game=>String(game.titleId)===String(current.id)).displayImage):''}:null
 const score=String(person.gamerScore??'')
 return {platform:'xbox',connectionState:'connected',visibility:'public',xuid:person.xuid,displayName:text(person.uniqueModernGamertag||person.gamertag),avatarUrl:image(person.displayPicRaw),gamerscore:/^\d{1,10}$/.test(score)?Number(score):null,
 presence:{state,currentGame,lastGame:history[0]?.game||null,updatedAt:state==='online'?null:date(presence?.lastSeen?.timestamp)||history[0]?.at||null,logoutAt:date(presence?.lastSeen?.timestamp)},history,featuredGames:games.map(gameData),library:null,playtime:null,achievements:null}
}
