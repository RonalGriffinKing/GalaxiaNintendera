import { toCanvas, getFontEmbedCSS } from 'html-to-image'
export const ANIMATION_DURATION = 8
export const ANIMATION_FPS = 30
export const DEFAULT_EFFECTS = { hologram:true, title:true, pill:true, button:true, particles:true, stars:true, time:true, loop:true }
export function backgroundMotionState(time,mode='zoom',intensity=50) {
 const phase=Math.max(0,Math.min(8,time))/8*Math.PI*2
 const amount=Math.max(0,Math.min(100,Number(intensity)||0))/100
 if(mode==='none'||!['zoom','pan','float'].includes(mode))return {scale:1,x:0,y:0}
 const wave=(1-Math.cos(phase))/2
 return {scale:mode==='zoom'?1+.08*amount*wave:1+.08*amount,x:mode==='pan'?.025*amount*Math.sin(phase):mode==='float'?.018*amount*Math.sin(phase):0,y:mode==='float'?.018*amount*wave:0}
}
export function cinematicState(time, loop=true) {
 const t=Math.max(0,Math.min(8,time)), entrance=Math.min(1,Math.max(0,(t-.18)/.85))
 const exit=loop?Math.min(1,Math.max(0,(8-t)/.85)):1
 const visibility=entrance*exit, motion=t===8?0:t
 return {titleOpacity:visibility,titleY:36*Math.pow(1-visibility,3),pillScale:1+.012*Math.sin(motion*Math.PI),pillGlow:.3+.25*(1-Math.cos(motion*Math.PI))/2,timeY:3*Math.sin(motion*Math.PI/2),sweep:(t%4)/4,reflection:t/8,reflectionOpacity:Math.sin(Math.PI*t/8)**2}
}
// Fixed seeds and whole-cycle movement keep preview/export identical and the loop continuous.
export function particleState(index,time) {
 const phase=((Math.max(0,Math.min(8,time))/8*(1+index%2)+index*.61803398875)%1+1)%1
 return {x:.05+((index*.754877666)%1)*.9+Math.sin(phase*Math.PI*2+index)*.018,y:1.04-phase*1.08,alpha:Math.sin(phase*Math.PI)**2*.55,radius:1.8+(index%4)*.75}
}
const particleSprites=new Map()
function particleSprite(index,star=false) {
 const key=(star?"star-":"dot-")+index%12
 if(particleSprites.has(key))return particleSprites.get(key)
 const sprite=document.createElement('canvas');sprite.width=sprite.height=40
 const ctx=sprite.getContext('2d'),color=['#e9d5ff','#a5f3fc','#fef3c7'][index%3],radius=1.8+(index%4)*.75
 const glow=ctx.createRadialGradient(20,20,0,20,20,18);glow.addColorStop(0,color+'99');glow.addColorStop(.25,color+'44');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,40,40);ctx.fillStyle=color;ctx.beginPath();if(star){for(let point=0;point<8;point++){const angle=point*Math.PI/4-Math.PI/2,r=point%2?.8:radius;const x=20+Math.cos(angle)*r,y=20+Math.sin(angle)*r;point?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath()}else ctx.arc(20,20,radius,0,Math.PI*2);ctx.fill();particleSprites.set(key,sprite);return sprite
}
function drawParticles(ctx,w,h,time,star=false) {
 ctx.save();ctx.globalCompositeOperation='screen'
 const size=(star?28:40)*w/1080
 for(let i=0;i<(star?20:30);i++){const p=particleState(star?i+40:i,time);ctx.globalAlpha=p.alpha;ctx.drawImage(particleSprite(i,star),p.x*w-size/2,p.y*h-size/2,size,size)}
 ctx.restore()
}
const abort = signal => { if(signal?.aborted) throw new DOMException('Cancelado','AbortError') }
// Work exclusively on an offscreen clone: editor state and static output stay untouched.
export async function captureAnimationLayers(element, signal) {
 if(!element)throw Error('Selecciona una publicación para animar.')
 await document.fonts.ready;abort(signal)
 const clone=element.cloneNode(true),sourceStyle=getComputedStyle(element)
 clone.classList.remove('is-editable');clone.querySelectorAll('[data-inv-selected]').forEach(n=>n.removeAttribute('data-inv-selected'))
 Object.assign(clone.style,{position:'relative',left:'0',top:'0',display:sourceStyle.display==='none'?'block':sourceStyle.display,transform:'none',margin:'0','--selection-outline':'none'})
 const host=document.createElement('div');Object.assign(host.style,{position:'fixed',left:'-30000px',top:'0',width:element.offsetWidth?element.offsetWidth+'px':sourceStyle.width});host.append(clone);document.body.append(host)
 try {
  // A slide hidden by the editor has zero offsets. Measure its visible clone instead.
  const width=clone.offsetWidth,height=clone.offsetHeight
  if(!(width>0&&height>0))throw Error('No se pudo preparar el tamaño de esta diapositiva. Vuelve a abrir Animar cuando el diseño haya cargado.')
  Object.assign(clone.style,{width:width+'px',height:height+'px'})
  await Promise.all([...clone.querySelectorAll('img')].map(async img=>{if(!img.complete)await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo cargar una imagen del diseño.'))});if(!img.naturalWidth)throw Error('Hay una imagen no disponible en el diseño.')}))
  const fontEmbedCSS=await getFontEmbedCSS(clone), all=[clone,...clone.querySelectorAll('*')]
  const groups={registrationGlow:clone.querySelector('.inv-tiktok-halo'),registrationArrow:clone.querySelector('.inv-register-invite svg'),title:clone.querySelector('[data-edit="title"],[data-inv-edit="title"]'),pill:clone.querySelector('[data-edit="part"],[data-inv-edit="status"]'),button:clone.querySelector('[data-edit="button"],[data-inv-edit="cta"]'),time:clone.querySelector('[data-inv-edit="time"]')}
  const original=all.map(n=>n.style.visibility), rect=clone.getBoundingClientRect(),layers={width,height}
  const capture=async()=>{
   const result=await toCanvas(clone,{width,height,pixelRatio:1,style:{position:"relative",left:"0",top:"0",margin:"0",transform:"none"},fontEmbedCSS,includeQueryParams:true,filter:n=>!n.hasAttribute?.('data-editor-ui')})
   if(!(result.width>0&&result.height>0))throw Error('No se pudo preparar una capa de la diapositiva. Vuelve a intentarlo.')
   return result
  }
  Object.values(groups).filter(Boolean).forEach(n=>n.style.visibility='hidden')
  const background=clone.querySelector('.inv-art-viewport,.social-card-bg')
  if(background){
   all.forEach(n=>n.style.visibility='hidden');background.style.visibility='visible';background.querySelectorAll('*').forEach(n=>n.style.visibility='visible')
   layers.background=await capture();abort(signal)
   all.forEach((n,i)=>n.style.visibility=original[i]);Object.values(groups).filter(Boolean).forEach(n=>n.style.visibility='hidden')
   background.style.visibility='hidden';background.querySelectorAll('*').forEach(n=>n.style.visibility='hidden')
   clone.style.background='transparent';const frame=clone.querySelector('.inv-frame');if(frame){frame.style.background='transparent';frame.style.boxShadow='none'}
  }
  layers.base=await capture();abort(signal)
  for(const [key,node] of Object.entries(groups)) {
   if(!node)continue
   all.forEach(n=>n.style.visibility='hidden');node.style.visibility='visible';node.querySelectorAll('*').forEach(n=>n.style.visibility='visible')
   const r=node.getBoundingClientRect();layers[key]={canvas:await capture(),x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height,radius:parseFloat(getComputedStyle(node).borderRadius)||0};abort(signal)
  }
  if(layers.pill){const p=layers.pill,pad=48,glow=document.createElement('canvas');glow.width=Math.ceil(p.width+pad*2);glow.height=Math.ceil(p.height+pad*2);const ctx=glow.getContext('2d');ctx.filter='blur(18px)';ctx.drawImage(p.canvas,p.x,p.y,p.width,p.height,pad,pad,p.width,p.height);p.glow=glow;p.glowPadding=pad}
  all.forEach((n,i)=>n.style.visibility=original[i]);return layers
 } finally {host.remove()}
}
export function drawAnimation(ctx,layers,time,effects=DEFAULT_EFFECTS) {
 const {width:w,height:h}=layers,s=cinematicState(time,effects.loop!==false);ctx.clearRect(0,0,w,h)
 if(layers.background){const motion=backgroundMotionState(time,effects.backgroundMotion||'none',effects.backgroundIntensity??50);ctx.save();ctx.fillStyle='#071024';ctx.fillRect(0,0,w,h);ctx.translate(w/2+motion.x*w,h/2+motion.y*h);ctx.scale(motion.scale,motion.scale);ctx.drawImage(layers.background,-w/2,-h/2);ctx.restore()}
 ctx.drawImage(layers.base,0,0)
 if(effects.hologram){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=s.reflectionOpacity;const x=(-.6+s.reflection*2.2)*w,g=ctx.createLinearGradient(x,0,x+w*.55,h*.25);g.addColorStop(0,'#00ddff00');g.addColorStop(.42,'#61cfff08');g.addColorStop(.5,'#e5aaff24');g.addColorStop(.58,'#88ffe810');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore()}
 if(layers.registrationGlow){ctx.save();if(effects.hologram)ctx.globalAlpha=.65+.35*(1-Math.cos((time===8?0:time)*Math.PI))/2;ctx.drawImage(layers.registrationGlow.canvas,0,0);ctx.restore()}
 if(effects.particles)drawParticles(ctx,w,h,time)
 if(effects.stars)drawParticles(ctx,w,h,time,true)
 if(effects.pill&&layers.pill?.glow){const p=layers.pill;ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=s.pillGlow;ctx.drawImage(p.glow,p.x-p.glowPadding,p.y-p.glowPadding);ctx.restore()}
 for(const key of ['title','pill','button','time','registrationArrow']){const l=layers[key];if(!l)continue;ctx.save();if(key==='title'&&effects.title){ctx.globalAlpha=s.titleOpacity;ctx.translate(0,s.titleY)}if(key==='pill'&&effects.pill){const x=l.x+l.width/2,y=l.y+l.height/2;ctx.translate(x,y);ctx.scale(s.pillScale,s.pillScale);ctx.translate(-x,-y)}if(key==='registrationArrow'&&effects.pill)ctx.translate(0,s.timeY*2);if(key==='time'&&effects.time)ctx.translate(0,s.timeY);ctx.drawImage(l.canvas,0,0);ctx.restore()}
 if(effects.button&&layers.button){const b=layers.button;ctx.save();ctx.beginPath();ctx.roundRect(b.x,b.y,b.width,b.height,Math.min(b.radius,b.height/2));ctx.clip();const x=b.x+(s.sweep*1.6-.4)*b.width,g=ctx.createLinearGradient(x-b.width*.12,0,x+b.width*.12,0);g.addColorStop(0,'#ffffff00');g.addColorStop(.5,'#ffffff66');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(b.x,b.y,b.width,b.height);ctx.restore()}
}

// Map each slide to a complete animation cycle, regardless of its chosen duration.
export function animationFrame(time,count=1,seconds=8) {
 const duration=Math.max(1,Math.min(60,Number(seconds)||8)), total=Math.max(1,count)*duration
 const position=Math.max(0,Math.min(total,Number(time)||0))
 const index=Math.min(Math.max(1,count)-1,Math.floor(position/duration))
 return {index,time:(position-index*duration)/duration*ANIMATION_DURATION,total}
}
export async function encodeAnimation(canvas,layers,{format='mp4',effects=DEFAULT_EFFECTS,signal,onProgress=()=>{},duration=8,clips=[()=>layers]}={}) {
 const seconds=Math.max(1,Math.min(60,Number(duration)||8)),frames=Math.round(seconds*ANIMATION_FPS)
 const ctx=canvas.getContext('2d');canvas.width=layers.width;canvas.height=layers.height
 const resolve=async clip=>{abort(signal);const result=typeof clip==='function'?await clip():clip;abort(signal);if(result.width!==canvas.width||result.height!==canvas.height)throw Error('Todas las diapositivas deben tener el mismo formato.');return result}
 if(format==='webm'){
  const resolved=[];for(const clip of clips)resolved.push(await resolve(clip))
  return recordWebm(canvas,resolved,{effects,signal,onProgress,duration:seconds})
 }
 const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,canEncodeVideo}=await import('mediabunny')
 if(!await canEncodeVideo('avc',{width:canvas.width,height:canvas.height,bitrate:6000000}))throw Error('Este navegador no puede codificar MP4 H.264. Prueba Chrome o Edge actualizado, o descarga WebM.')
 const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target}),source=new CanvasSource(canvas,{codec:'avc',bitrate:6000000})
 output.addVideoTrack(source,{frameRate:ANIMATION_FPS})
 try{
  await output.start()
  for(let index=0;index<clips.length;index++){
   const current=await resolve(clips[index])
   for(let frame=0;frame<frames;frame++){
    abort(signal);const position=index*frames+frame
    drawAnimation(ctx,current,frame/frames*ANIMATION_DURATION,effects)
    await source.add(position/ANIMATION_FPS,1/ANIMATION_FPS,{keyFrame:frame===0||position%60===0})
    onProgress((position+1)/(frames*clips.length));if(frame%8===0)await new Promise(r=>setTimeout(r,0))
   }
  }
  source.close();await output.finalize();return new Blob([target.buffer],{type:'video/mp4'})
 }catch(e){await output.cancel().catch(()=>{});throw e}
}
async function recordWebm(canvas,clips,{effects,signal,onProgress,duration}) {
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>globalThis.MediaRecorder?.isTypeSupported(t))
 if(!mime||!canvas.captureStream)throw Error('Este navegador no admite grabación WebM. Prueba Chrome o Edge actualizado.')
 abort(signal);const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000}),chunks=[]
 const draw=time=>{const frame=animationFrame(time,clips.length,duration);drawAnimation(canvas.getContext('2d'),clips[frame.index],frame.time,effects)}
 return new Promise((resolve,reject)=>{let raf,start;const cleanup=()=>{cancelAnimationFrame(raf);stream.getTracks().forEach(t=>t.stop());signal?.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',hidden)};const fail=e=>{cleanup();if(recorder.state!=='inactive')recorder.stop();reject(e)};const cancel=()=>fail(new DOMException('Cancelado','AbortError'));const hidden=()=>{if(document.hidden)fail(Error('La grabación se interrumpió al ocultar la pestaña. Mantén esta ventana visible y vuelve a exportar.'))};signal?.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',hidden);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=e=>fail(e.error||Error('No se pudo grabar el vídeo.'));recorder.onstop=()=>{cleanup();resolve(new Blob(chunks,{type:mime}))};draw(0);recorder.start(250);start=performance.now();const total=duration*clips.length;const tick=now=>{const t=(now-start)/1000;draw(Math.min(t,total));onProgress(Math.min(t/total,1));if(t>=total)recorder.stop();else raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)})
}
