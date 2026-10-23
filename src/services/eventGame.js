export function eventGameNames(event={}) {
 const value=event.game??event.juego
 const game=value&&typeof value==='object'&&!Array.isArray(value)?value:{}
 const text=value=>typeof value==='string'?value.trim():''
 return {nameEs:text(game.nameEs||game.nombreEs||event.gameNameEs||(typeof value==='string'?value:event.gameName)),nameEn:text(game.nameEn||game.nombreEn||game.name||event.gameNameEn)}
}
export function parseEventGame(event) {
 const supplied=['game','juego','gameName','gameNameEs','gameNameEn'].some(key=>Object.hasOwn(event,key))
 if(!supplied)return undefined
 const value=event.game??event.juego
 if(value!==undefined&&(value===null||Array.isArray(value)||!['object','string'].includes(typeof value)))throw Error('game debe ser un objeto con nameEs/nameEn o el nombre del juego.')
 const fields=[event.gameName,event.gameNameEs,event.gameNameEn,...(value&&typeof value==='object'?[value.nameEs,value.nameEn,value.nombreEs,value.nombreEn,value.name]:[value])]
 if(fields.some(v=>v!==undefined&&(typeof v!=='string'||v.trim().length>180)))throw Error('Los nombres del juego deben ser texto de hasta 180 caracteres.')
 return eventGameNames(event)
}
