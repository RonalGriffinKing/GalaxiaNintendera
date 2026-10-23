export const INVITATION_STATUSES = [
 {id:'upcoming',label:'Próximamente',badge:'PRÓXIMAMENTE',cta:'Reserva la fecha',tone:'violet',start:'#7e2ce6',end:'#a833c8'},
 {id:'today',label:'Hoy',badge:'HOY EN DIRECTO',cta:'Nos vemos en directo',tone:'cyan',start:'#007994',end:'#154dad'},
 {id:'live',label:'En vivo',badge:'EN VIVO',cta:'Ver en directo',tone:'rose',start:'#f82a94',end:'#fb1649'},
 {id:'replay',label:'Repetición',badge:'YA DISPONIBLE',cta:'Ver la repetición',tone:'cyan',start:'#007994',end:'#154dad'}
]
export const INVITATION_FORMATS = {story:{label:'Historia',width:1080,height:1920},portrait:{label:'Post vertical',width:1080,height:1350},square:{label:'Cuadrado',width:1080,height:1080}}
export const eventTime = value => typeof value==='number'?value:value?.toDate?.().getTime?.()||new Date(value).getTime()
export function invitationDefaults(event={}) {
 return {status:'upcoming',statusText:'',statusStart:'#7e2ce6',statusEnd:'#a833c8',statusColor:'#ffffff',statusSize:34,statusRadius:80,showStatus:true,showCta:true,showDate:true,showTime:true,showType:true,typeText:event.type||'Evento',dayLabel:'',titleColor:'#ffffff',descriptionColor:'#e5e6f5',descriptionSize:31,infoColor:'#ffffff',infoSize:31,timeSize:88,layout:'full',ctaStart:'#9b1de9',ctaEnd:'#fa5c68',ctaColor:'#ffffff',ctaSize:31,ctaRadius:29,reminderColor:'#e5ddff',reminderBorder:'#6e54a2',reminderSize:25,reminderRadius:29,brandColor:'#c2bbd9',brandSize:20,brandLogoSize:48,logoSize:210,title:String(event.title||'Te esperamos').replace(/\s*\|\s*/g,'\n'),description:event.description||'',image:event.backgroundUrl||event.imageUrl||'',logo:'',showTitle:true,showDescription:true,showDuration:true,showReminder:true,showBrand:true,showPagination:true,reminder:'Activa el recordatorio',cta:'Reserva la fecha',channel:'Galaxia Nintendera',timezone:'Europe/Madrid',theme:'galaxy',titleSize:84,imagePosition:50,imagePositionY:50,imageZoom:100,imageFit:'cover',imageBrightness:100}
}
export function invitationDate(event,timezone='Europe/Madrid') {
 const date=new Date(eventTime(event.startsAt))
 if(!Number.isFinite(date.getTime()))return {day:'Fecha pendiente',date:'',time:'--:--',zone:timezone,duration:''}
 const format=options=>new Intl.DateTimeFormat('es-ES',{timeZone:timezone,...options}).format(date)
 const minutes=Number(event.durationMinutes)||0
 const duration=minutes>0?[Math.floor(minutes/60)?Math.floor(minutes/60)+' h':'',minutes%60?minutes%60+' min':''].filter(Boolean).join(' '):''
 return {day:format({weekday:'long'}),date:format({day:'numeric',month:'long',year:'numeric'}),time:format({hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),zone:timezone==='Europe/Madrid'?'Hora España':timezone==='UTC'?'Hora UTC':timezone.replace('America/','').replaceAll('_',' '),duration}
}

// Events with no duration keep a one-hour live window instead of expiring at their start.
export function isEventActive(event,now=Date.now()) {
 const start=eventTime(event.startsAt)
 const duration=Number(event.durationMinutes)>0?Number(event.durationMinutes):60
 return Number.isFinite(start)&&start+duration*60000>now
}
