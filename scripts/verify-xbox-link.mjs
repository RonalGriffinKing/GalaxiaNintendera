import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5231';const port=Number(process.env.THEME_QA_PORT||9461);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let i=0;i<60;i++){if(await ev(expression))return;await wait(100)}throw Error('Timeout '+expression)}
try{
 await cdp('Runtime.enable');await cdp('Page.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await nav('/perfil/owner','.profile-primary');await wait(300);
 await ev('document.querySelector(".profile-gamer-preview .gamer-connect-button").click()');await until('!!document.querySelector(".xbox-link")');
 check(await ev('document.querySelector(".xbox-connect").textContent==="Conectar Xbox"'),'Xbox replaces the future connection');
 await ev('document.querySelector(".xbox-connect").click()');await wait(80);
 await ev('window.fillXbox=value=>{const input=document.getElementById("xbox-gamertag");input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}))};window.fillXbox("https://evil.test")');await wait(50);
 await ev('document.querySelector(".xbox-link form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await wait(100);
 check(await ev('!document.querySelector(".xbox-confirm")&&window.profileWrites.length===0'),'invalid input cannot preview or write');
 await ev('window.fillXbox("NoExiste")');await wait(50);await ev('document.querySelector(".xbox-link form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await wait(200);
 await until('document.querySelector(".xbox-link").textContent.includes("coincidencia exacta")');
 check(await ev('document.querySelector(".xbox-link").textContent.includes("coincidencia exacta")&&window.profileWrites.length===0'),'no fuzzy first-result linking');
 await ev('window.fillXbox("Xbox de prueba#1234")');await wait(50);await ev('document.querySelector(".xbox-link form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await until('!!document.querySelector(".xbox-confirm")');
 check(await ev('window.profileWrites.length===0 && document.querySelector(".xbox-confirm").textContent.includes("Xbox de prueba#1234")'),'preview and consent precede persistence');
 await ev('document.querySelector(".xbox-confirm button").click()');await until('!!window.profileMockUsers.owner?.socialLinks.xbox');
 check(await ev('Object.keys(window.profileWrites[0].patch).join(",")==="socialLinks.xbox"'),'only Xbox link is written');
 await ev('document.querySelector(".profile-edit-card .icon-modal-close").click()');await wait(150);
 check(await ev('document.querySelector(".gamer-connected").textContent.includes("Xbox") && document.querySelector(".featured-info").textContent.includes("Juego Xbox de prueba")'),'Xbox data appears on main profile');
 check(await ev('document.querySelectorAll(".gamer-most-played .empty-game").length===3 && !document.querySelector(".played-hours")'),'no invented Xbox hours');
 await ev('window.profileGamerFixtures.value=[{platform:"nintendo",connectionState:"connected",visibility:"public",presence:{state:"offline",lastGame:{id:"n",title:"Nintendo de prueba"}},history:[],playtime:[]}]');await wait(150);
 check(await ev('document.querySelectorAll(".gamer-system-selector button").length===2'),'linked systems have separate selectors');
 await ev('[...document.querySelectorAll(".gamer-system-selector button")].find(b=>b.textContent==="Nintendo").click()');await wait(80);
 check(await ev('document.querySelector(".featured-info").textContent.includes("Nintendo de prueba")&&!document.querySelector(".featured-info").textContent.includes("Juego Xbox")'),'Nintendo selection isolates activity');
 for(const width of [1440,390,320]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await wait(80);check(await ev('document.documentElement.scrollWidth<=innerWidth'),'system selector fits '+width)}
 await ev('[...document.querySelectorAll(".gamer-system-selector button")].find(b=>b.textContent==="Xbox").click()');await wait(80);
 check(await ev('document.querySelector(".featured-info").textContent.includes("Juego Xbox de prueba")&&document.querySelectorAll(".gamer-most-played .empty-game").length===3'),'Xbox selection keeps its own data and missing-hour slots');
 await ev('window.profileGamerFixtures.value=[]');await wait(100);
 await ev('window.profileChangeViewer({uid:"visitor"})');await wait(400);
 check(await ev('!document.querySelector(".profile-gamer-preview .gamer-connect-button") && document.querySelector(".gamer-connected").textContent.includes("Xbox")'),'visitor sees public data with no editing controls');
 await ev('window.profileChangeViewer({uid:"owner"})');await wait(350);
 await ev('document.querySelector(".profile-gamer-preview .gamer-connect-button").click()');await until('!!document.querySelector(".xbox-link")');
 for(const width of [1440,768,390,320]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await wait(80);check(await ev('(()=>{const card=document.querySelector(".profile-edit-card");return card.scrollWidth<=card.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth})()'),'Xbox connection fits '+width);if([1440,390].includes(width)){const capture=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.TEMP+'/galaxia-xbox-'+width+'.png',Buffer.from(capture.result.data,'base64'));}}
 await ev('[...document.querySelectorAll(".xbox-actions button")].find(button=>button.textContent==="Cambiar gamertag").click()');await wait(80);
 await ev('window.fillXbox("Xbox Nuevo#2222")');await wait(50);await ev('document.querySelector(".xbox-link form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');await until('!!document.querySelector(".xbox-confirm")');
 await ev('document.querySelector(".xbox-confirm button").click()');await until('window.profileMockUsers.owner.socialLinks.xbox.xuid==="2533274792093123"');
 check(await ev('window.profileMockUsers.owner.socialLinks.xbox.gamertag==="Xbox Nuevo#2222"'),'gamertag can be changed');
 await ev('window.profileWriteFail=true;document.querySelector(".xbox-remove").click()');await wait(150);
 check(await ev('!!window.profileMockUsers.owner.socialLinks.xbox && document.querySelector(".xbox-link").textContent.includes("No se pudo guardar")'),'failed write retains the link');
 await ev('window.profileWriteFail=false;document.querySelector(".xbox-remove").click()');await until('!window.profileMockUsers.owner.socialLinks.xbox');
 check(await ev('window.profileMockUsers.owner.stars===40&&window.profileMockUsers.owner.socialLinks.youtube==="https://youtube.com/@example"'),'unlink preserves rewards and other links');
 check(!errors.length,'no runtime exceptions');
}catch(error){console.log('FAIL',error.message,errors,await ev('document.querySelector(".xbox-link")?.innerText'));process.exitCode=1}finally{ws.close();edge.kill()}
