import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5231';const port=Number(process.env.THEME_QA_PORT||9465);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let i=0;i<50;i++){if(await ev(expression))return;await wait(100)}throw Error('Timeout '+expression)}
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await nav('/perfil/owner','.profile-hero');await wait(500);
 check(await ev('!!document.querySelector(".profile-page>.galaxy-atmosphere")&&getComputedStyle(document.querySelector(".profile-page")).backgroundImage==="none"'),'whole profile uses the shared star background');
 check(await ev('!document.querySelector(".profile-loading-hero,.rewards-loading-grid")'),'profile has no grey loading skeleton');
 check(await ev('document.querySelector(".profile-hero").dataset.softRevealed==="true"'),'profile hero enters softly');
 await nav('/perfil/owner/recompensas?tab=collection','.rewards-icons');await wait(500);
 check(await ev('[...document.querySelectorAll(".rewards-icons>button")].some(e=>e.dataset.softRevealed==="true")'),'collection icons enter softly');
 await nav('/communities','.community-card');await wait(500);
 check(await ev('document.querySelector(".community-card").dataset.softRevealed==="true"'),'community cards use the shared entrance');
 await ev('document.querySelector(".community-card:last-child").scrollIntoView()');await wait(600);
 check(await ev('document.querySelector(".community-card:last-child").dataset.softRevealed==="true"'),'cards reveal as they scroll into view');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 check(await ev('!document.querySelector(".gn-reveal-pending")'),'motion preference reveals all pending content');
 if(process.env.PUBLIC_THEME_LAB_URL){
  await cdp('Emulation.setEmulatedMedia',{features:[]});
  await cdp('Page.navigate',{url:process.env.PUBLIC_THEME_LAB_URL+'/navigation'});
  await until('!!document.querySelector(".home2-hero-grid")');await wait(600);
  check(await ev('document.querySelector(".home2-hero-grid").dataset.softRevealed==="true"'),'home hero uses the shared entrance');
  await ev('window.themeLab.router.push("/news")');await until('!!document.querySelector(".news-row")');await wait(600);
  check(await ev('[...document.querySelectorAll(".news-row")].some(e=>e.dataset.softRevealed==="true")'),'news cards use the shared entrance');
  check(await ev('!document.querySelector(".listing-card-loading,.home2-loading")'),'public pages have no grey loading skeleton');
 }
 check(errors.length===0,'no runtime exceptions');
}finally{ws.close();edge.kill()}
