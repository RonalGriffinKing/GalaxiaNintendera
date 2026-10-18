import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5231';const port=Number(process.env.THEME_QA_PORT||9458);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let attempt=0;attempt<50;attempt++){if(await ev(expression))return;await wait(100)}throw Error('Timed out: '+expression)}
try {
 await cdp('Runtime.enable');await cdp('Page.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await nav('/perfil/owner','.profile-primary');await wait(300);await ev('document.querySelector(".profile-gamer-preview .gamer-connect-button").click()');await until('!!document.querySelector(".nintendo-link")');
 await ev('window.setNintendoInput=(id,value)=>{const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}))}');
 await ev('document.querySelector(".account-actions .action-secondary,.account-actions .action-primary").click()');await wait(100);
 check(await ev('!!document.getElementById("nintendo-profile-url") && !!document.getElementById("nintendo-presence-url")'),'two optional public URL fields');
 await ev('window.setNintendoInput("nintendo-presence-url","https://evil.test/api/presence/d392169fdeb68a8e")');await wait(50);
 await ev('document.querySelector(".nintendo-link form").dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))');await wait(100);
 check(await ev('!document.querySelector(".nintendo-confirm") && window.profileWrites.length===0'),'invalid endpoint cannot preview or save');
 await ev('window.setNintendoInput("nintendo-presence-url","https://nxapi-presence.fancy.org.uk/api/presence/d392169fdeb68a8e");window.setNintendoInput("nintendo-profile-url","https://nxapi-auth.fancy.org.uk/profile/de97_DbiogMuJB5WFpmvKA")');await wait(50);
 await ev('document.querySelector(".nintendo-link form").dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))');await wait(300);
 await until('document.querySelectorAll(".nintendo-confirm .nintendo-account").length===2');
 check(await ev('document.querySelectorAll(".nintendo-confirm .nintendo-account").length===2 && window.profileWrites.length===0'),'both previews appear before any write');
 await ev('document.querySelector(".nintendo-confirm button").click()');await wait(300);
 check(await ev('window.profileWrites.length===1 && Object.keys(window.profileWrites[0].patch).sort().join(",")==="socialLinks.nintendoPresence,socialLinks.nintendoProfile"'),'confirmation writes only the two public links');
 await ev('window.profileRouter.push("/perfil/owner?section=summary")');await wait(200);
 check(await ev('document.querySelector(".gamer-most-played").textContent.includes("1 h 30 min") && document.querySelector(".gamer-presence").textContent==="Último juego detectado"'),'summary combines offline presence and public game times');
 await ev('window.profileRouter.push("/perfil/owner?section=gamer")');await wait(150);
 check(await ev('document.querySelector(".gamer-recent-preview").textContent.includes("Juego publicado")'),'main profile shows published recent games');
 await ev('document.querySelector(".profile-gamer-preview .gamer-connect-button").click()');await until('!!document.querySelector(".nintendo-link")');
 for (const width of [1440,768,390,320]) {
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
 await ev('document.querySelector(".account-actions .action-secondary,.account-actions .action-primary").click()');await wait(80);
 check(await ev('document.documentElement.scrollWidth<=innerWidth'),'connection form fits '+width);
 if([1440,390].includes(width)){const capture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(process.env.TEMP+'/galaxia-nintendo-form-'+width+'.png',Buffer.from(capture.result.data,'base64'));}
 await ev('[...document.querySelectorAll(".nintendo-link form button")].find(button=>button.textContent==="Cancelar").click()');await wait(50);
 }
 await ev('window.profileChangeViewer({uid:"visitor"})');await wait(500);
 check(await ev('!document.querySelector(".nintendo-actions") && !document.querySelector(".nintendo-link form")'),'visitors cannot edit or remove links');
 await ev('window.profileChangeViewer({uid:"owner"})');await wait(400);
 await ev('document.querySelector(".profile-gamer-preview .gamer-connect-button").click()');await until('!!document.querySelector(".nintendo-link")');
 await ev('document.querySelector(".account-actions .action-secondary,.account-actions .action-primary").click()');await wait(100);
 await ev('window.setNintendoInput("nintendo-presence-url","")');await wait(50);
 await ev('document.querySelector(".nintendo-link form").dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))');await wait(200);
 await ev('document.querySelector(".nintendo-confirm button").click()');await wait(250);
 check(await ev('!window.profileMockUsers.owner.socialLinks.nintendoPresence && !!window.profileMockUsers.owner.socialLinks.nintendoProfile'),'public profile alone can remain linked');
 await ev('document.querySelector(".account-actions .action-secondary,.account-actions .action-primary").click()');await wait(100);
 await ev('window.setNintendoInput("nintendo-presence-url","https://nxapi-presence.fancy.org.uk/api/presence/d392169fdeb68a8e");window.setNintendoInput("nintendo-profile-url","")');await wait(50);
 await ev('document.querySelector(".nintendo-link form").dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))');await until('!!document.querySelector(".nintendo-confirm")');
 await ev('document.querySelector(".nintendo-confirm button").click()');await wait(200);
 check(await ev('!!window.profileMockUsers.owner.socialLinks.nintendoPresence && !window.profileMockUsers.owner.socialLinks.nintendoProfile'),'presence alone can remain linked');
 await ev('document.getElementById("profile-systems-toggle").click()');await wait(100);
 await ev('document.getElementById("profile-edit-name").value="Nuevo nombre";document.getElementById("profile-edit-name").dispatchEvent(new Event("input",{bubbles:true}))');await wait(50);
 await ev('document.querySelector(".modal-edit-actions>button").click()');await until('window.profileMockUsers.owner.name==="Nuevo nombre"');
 check(await ev('!!window.profileMockUsers.owner.socialLinks.nintendoPresence'),'saving profile identity preserves Nintendo links');
 await ev('document.getElementById("profile-systems-toggle").click()');await until('!!document.querySelector(".nintendo-link")');
 await ev('window.profileWriteFail=true;[...document.querySelectorAll(".nintendo-actions button")].find(button=>button.textContent==="Eliminar vinculación").click()');await wait(200);
 check(await ev('!!window.profileMockUsers.owner.socialLinks.nintendoPresence && document.querySelector(".nintendo-link").textContent.includes("No se pudo guardar")'),'failed persistence retains the existing link');
 await ev('window.profileWriteFail=false;[...document.querySelectorAll(".nintendo-actions button")].find(button=>button.textContent==="Eliminar vinculación").click()');await wait(200);
 check(await ev('!window.profileMockUsers.owner.socialLinks.nintendoProfile && !window.profileMockUsers.owner.socialLinks.nintendoPresence'),'links can be removed');
 check(await ev('window.profileMockUsers.owner.stars===40 && window.profileMockUsers.owner.unlockedIcons[0]==="kirby-01" && window.profileMockUsers.owner.socialLinks.youtube==="https://youtube.com/@example"'),'rewards and other social links stay unchanged');
 check(!errors.length,'no runtime exceptions');
} catch(e){console.log('FAIL',e.message,'ERRORS',errors,await ev('document.querySelector(".nintendo-link")?.innerText'));process.exitCode=1}finally{ws.close();edge.kill()}
