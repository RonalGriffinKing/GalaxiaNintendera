export const INVITATION_LAYERS = [
 {id:'image',label:'Fondo',flag:'showImage'}, {id:'status',label:'Píldora de estado',flag:'showStatus'},
 {id:'title',label:'Título',flag:'showTitle'}, {id:'brand',label:'Logo y nombre del canal',flag:'showBrand'},
 {id:'logo',label:'Logo del juego',flag:'showLogo',asset:'logo'}, {id:'type',label:'Tipo de evento',flag:'showType'},
 {id:'time',label:'Hora',flag:'showTime'}, {id:'date',label:'Fecha',flag:'showDate'},
 {id:'duration',label:'Duración',flag:'showDuration'}, {id:'description',label:'Descripción',flag:'showDescription'},
 {id:'cta',label:'Botón de invitación',flag:'showCta'}, {id:'reminder',label:'Botón recordatorio',flag:'showReminder'},
 {id:'pagination',label:'Número de imagen',flag:'showPagination'}
]
export function layerVisible(options,layer){return options[layer.flag]!==false&&(!layer.asset||!!options[layer.asset])}
const restoreKeys=[...INVITATION_LAYERS.map(l=>l.flag),'status','statusText','statusStart','statusEnd','statusColor']
export function tiktokPreset(options,enable){
 if(!enable)return {...options.tiktokPrevious,tiktok:false,tiktokPrevious:undefined}
 const previous=options.tiktokPrevious||Object.fromEntries(restoreKeys.map(key=>[key,options[key]]))
 return {tiktok:true,tiktokPrevious:previous,showImage:true,showStatus:true,showTitle:true,showBrand:true,showLogo:!!options.logo,showType:false,showTime:false,showDate:false,showDuration:false,showDescription:false,showCta:false,showReminder:false,showPagination:false,status:'live',statusText:'',statusStart:'#f82a94',statusEnd:'#fb1649',statusColor:'#ffffff'}
}
