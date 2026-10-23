import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5225';const port=Number(process.env.THEME_QA_PORT||9465);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let i=0;i<50;i++){if(await ev(expression))return;await wait(100)}throw Error('Timeout '+expression)}
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await nav('/public-navigation','.community-card');
 await ev('window.themeLab.router.push("/events")');await until('!!document.querySelector(".events-hero-premium button")');
 await ev('document.querySelector(".events-hero-premium button").click()');await until('!!document.querySelector(".event-editor-card")');
 await ev('document.querySelector(".event-json-import>button").click()');
 const payload=JSON.stringify({title:'Torneo JSON',description:'Descripcion de prueba',type:'Torneo',fecha:'2026-11-01',hora:'21:00',durationMinutes:90,url:'https://example.com',backgroundUrl:'https://example.com/banner.png',communityIds:['lab-community'],game:{nameEs:'Los Pitufos: Dreams',nameEn:'The Smurfs: Dreams'}});
 await ev('(()=>{const t=document.querySelector(".event-json-fields textarea");t.value='+JSON.stringify(payload)+';t.dispatchEvent(new Event("input",{bubbles:true}));})()');
 await ev('document.querySelector(".event-json-actions button:last-child").click()');await wait(100);
 check(await ev('document.querySelector(".event-editor-card form input").value==="Torneo JSON"&&document.querySelector(".event-editor-card select").value==="Torneo"&&document.querySelector("input[type=datetime-local]").value==="2026-11-01T21:00"'),'event JSON fills title, type and local date/time');
 check(await ev('document.querySelector("input[type=number]").value==="90"&&document.querySelector(".event-editor-card form textarea").value==="Descripcion de prueba"&&window.themeLab.writes.length===0'),'import fills extras without publishing');
 check(await ev('document.querySelector(".event-game-fields input").value==="Los Pitufos: Dreams"&&document.querySelectorAll(".event-game-fields input")[1].value==="The Smurfs: Dreams"'),'single-event JSON fills both game names');
 for(const width of [320,390,430]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:true});await wait(100);
  check(await ev('(()=>{const c=document.querySelector(".event-editor-card"),r=c.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&c.scrollWidth<=c.clientWidth+1})()'),'event editor fits mobile '+width);
 }
 const shot=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.TEMP+'/galaxia-event-json-mobile.png',Buffer.from(shot.result.data,'base64'));
 await ev('document.querySelector(".event-editor-card header button").click()');
 await ev('window.themeLab.router.push("/news")');await until('!!document.querySelector(".news-row")');
 for(const width of [320,390,430]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:true});
  await ev('document.querySelector(".news-row").scrollIntoView({block:"center"})');await wait(550);
  check(await ev('getComputedStyle(document.querySelector(".news-row")).opacity==="1"&&!document.querySelector(".news-row").classList.contains("gn-reveal-pending")'),'news is visible after mobile entrance '+width);
 }
 await ev('window.themeLab.router.push("/profile/local-admin")');await until('!!document.querySelector(".profile-hero")');await ev('scrollTo(0,0)');await wait(550);
 check(await ev('getComputedStyle(document.querySelector(".profile-hero")).opacity==="1"&&!document.querySelector(".page-load-status,.profile-loading-hero")'),'profile is visible on mobile with no visible loading label');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await until('!document.querySelector(".gn-reveal-pending")');
 check(await ev('!document.querySelector(".gn-reveal-pending")'),'mobile reduced motion leaves no hidden content');
 check(errors.length===0,'no runtime exceptions');
}finally{ws.close();edge.kill()}
