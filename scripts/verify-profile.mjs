import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5231';const port=Number(process.env.THEME_QA_PORT||9457);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let i=0;i<50;i++){if(await ev(expression))return;await wait(100)}throw Error('Timeout '+expression)}
try {
 await cdp('Runtime.enable');await cdp('Page.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await nav('/perfil/owner','.profile-primary');await wait(500);
 check(await ev('!document.querySelector(".profile-hero-stats,.profile-section-navigation,.profile-about,[role=tabpanel]")'),'one main profile without statistics bar, tabs or duplicate biography');
 check(await ev('!!document.querySelector(".profile-activity") && !!document.querySelector(".profile-communities") && !!document.querySelector(".achievement-preview") && !!document.querySelector(".collection-preview")'),'all profile cards remain on the main page');
 check(await ev('!window.profileReads.some(r=>r.path.endsWith("favorites"))'),'main page defers saved queries');
 await ev('document.querySelector(".profile-gamer-preview .gamer-connect-button").click()');await until('!!document.querySelector(".nintendo-link")');
 check(await ev('!!document.querySelector(".profile-edit-card") && document.getElementById("profile-systems-toggle").getAttribute("aria-expanded")==="true"'),'connect systems opens inside profile editor');
 check(await ev('document.querySelectorAll(".future-systems button:disabled").length===1 && !!document.querySelector(".xbox-connect:not(:disabled)")'),'Xbox available and Steam visibly unavailable');
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await until('!document.querySelector(".profile-edit-card")');
 await ev('[...document.querySelectorAll(".activity-tabs button")].find(button=>button.textContent==="Guardados").click()');await until('window.profileReads.some(r=>r.path==="users/owner/favorites")');
 check(await ev('!!document.querySelector(".profile-activity .favorite-preview-section")'),'owner saved posts available inline');
 await ev('window.profileRouter.push("/perfil/visitor?activity=saved")');await wait(500);
 check(await ev('!document.querySelector(".favorite-preview-section") && !window.profileReads.some(r=>r.path==="users/visitor/favorites")'),'visitor saved posts hidden and never queried');
 check(await ev('!document.querySelector(".profile-gamer-preview")'),'public profile without gamer data has no empty card');
 await ev('window.profileGamerFixtures.value=[{platform:"nintendo",connectionState:"connected",visibility:"public",presence:{state:"offline",lastGame:{id:"a",title:"Juego de prueba",imageUrl:"/src/iconos/iconosKirby/01.png"},updatedAt:"2026-10-18T09:00:00Z"},history:[{game:{id:"a",title:"Juego de prueba",imageUrl:"/src/iconos/iconosKirby/01.png"},at:"2026-10-17T09:00:00Z"}],library:["a","b","c"].map(id=>({id,title:"Juego "+id,imageUrl:"/src/iconos/iconosKirby/01.png"})),playtime:[{gameId:"a",minutes:120,source:"test"},{gameId:"b",minutes:90,source:"test"},{gameId:"c",minutes:30,source:"test"}]}];window.profileRouter.push("/perfil/owner?fixture=1")');await wait(200);
 check(await ev('document.querySelectorAll(".gamer-most-played li").length===3 && document.querySelectorAll(".gamer-recent-preview .recent-copy:not(.empty-copy)").length===1'),'gamer highlights and recent activity remain on the main page');
 await ev('document.querySelector(".profile-right").style.minHeight="1400px"');
 check(await ev('(()=>{const gamer=document.querySelector(".profile-gamer-preview").getBoundingClientRect(),posts=document.querySelector(".profile-activity").getBoundingClientRect();return Math.abs(posts.top-gamer.bottom-18)<2})()'),'sidebar cannot create gaps in the primary column');
 await ev('document.querySelector(".profile-right").style.minHeight=""');
 for(const width of [1440,1024,768,390,320]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await wait(100);
 check(await ev('document.documentElement.scrollWidth<=innerWidth'),'main profile fits '+width);
 if([1440,390].includes(width)){const capture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(process.env.TEMP+'/galaxia-profile-'+width+'.png',Buffer.from(capture.result.data,'base64'));}
 await ev('document.querySelector(".avatar-edit-shortcut").click()');await until('!!document.getElementById("profile-edit-name")');
 check(await ev('document.getElementById("profile-systems-toggle").getAttribute("aria-expanded")==="false"'),'header edit opens identity fields '+width);
 check(await ev('(()=>{const r=document.querySelector(".profile-edit-card").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.querySelector(".profile-edit-card").scrollWidth<=document.querySelector(".profile-edit-card").clientWidth+1})()'),'editor fits '+width);
 if([1440,390].includes(width)){const capture=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.TEMP+'/galaxia-editor-'+width+'.png',Buffer.from(capture.result.data,'base64'));}
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await until('!document.querySelector(".profile-edit-card")');
 }
 await nav('/perfil/owner?empty=1','.profile-primary');await wait(400);
 check(await ev('document.querySelector(".profile-activity").textContent.includes("no hay publicaciones")'),'empty publications');
 check(await ev('document.querySelector(".profile-communities").textContent.includes("ninguna comunidad")'),'empty communities');
 check(await ev('document.querySelector(".achievement-preview").textContent.includes("no hay logros completados")'),'empty achievements');
 check(!errors.length,'no runtime exceptions');
} catch(e){console.log('FAIL',e.message,'ERRORS',errors);process.exitCode=1}finally{ws.close();edge.kill()}
