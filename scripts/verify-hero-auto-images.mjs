import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5225';const port=Number(process.env.THEME_QA_PORT||9455);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}
try{
await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.enable');
await nav('/home-hero','.home-news-hero');
for(const width of [390,1440]) {
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
 await ev('(()=>{const p=window.themeLab.post.value;p.id="auto-"+innerWidth;p.hero={images:[{url:"/lab-image.svg?one"},{url:"/lab-image.svg?two"}]};p.image="/lab-image.svg?one"})()');await wait(1000);
 const first=await ev('document.querySelector(".hero-background:not(.hero-image-leave-active)").getAttribute("src")');
 check(await ev('!document.querySelector(".hero-gallery")&&!document.querySelector(".hero-thumbnails")'),'no thumbnail strip at '+width);
 const size=await ev('document.querySelector(".home-news-hero").getBoundingClientRect().height');
 await wait(5500);
 check(await ev('document.querySelector(".hero-background:not(.hero-image-leave-active)").getAttribute("src")')!==first,'images rotate automatically at '+width);
 check(await ev('document.querySelector(".home-news-hero").getBoundingClientRect().height')===size,'rotation keeps hero height at '+width);
 check(await ev('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow at '+width);
}
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait(50);
const paused=await ev('document.querySelector(".hero-background:not(.hero-image-leave-active)").getAttribute("src")');await wait(4800);
check(await ev('document.querySelector(".hero-background:not(.hero-image-leave-active)").getAttribute("src")')===paused,'reduced motion pauses image autoplay');
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await ev('(()=>{const p=window.themeLab.post.value;p.id="single";p.hero={};p.image="/lab-image.svg";p.sections=[];p.social={}})()');await wait(50);
check(await ev('!document.querySelector(".hero-image-label")'),'single image has no misleading counter');
const single=await ev('document.querySelector(".hero-background:not(.hero-image-leave-active)").getAttribute("src")');await wait(4800);
check(await ev('document.querySelector(".hero-background:not(.hero-image-leave-active)").getAttribute("src")')===single,'single image stays still');
check(!errors.length,'no runtime exceptions');check(!requests.some(u=>/firestore.googleapis|identitytoolkit/.test(u)),'no production Firebase access');
}catch(e){console.log('FAIL',e.message,'ERRORS',errors);process.exitCode=1}finally{ws.close();edge.kill()}
