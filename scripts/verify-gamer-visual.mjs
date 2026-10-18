import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5231';const port=Number(process.env.THEME_QA_PORT||9460);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

try {
 await cdp('Runtime.enable');await cdp('Page.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await nav('/perfil/owner','.profile-primary');await wait(300);
 const {handler}=await import('../netlify/functions/nintendo-presence.js');
 const {combineNintendoSources}=await import('../src/services/nxapiPresence.js');
 const responses=await Promise.all([handler({httpMethod:'GET',queryStringParameters:{source:'presence',id:'d392169fdeb68a8e'}}),handler({httpMethod:'GET',queryStringParameters:{source:'profile',id:'de97_DbiogMuJB5WFpmvKA'}})]);
 if(responses.some(response=>response.statusCode!==200))throw Error('Public nxapi preview unavailable');
 const identity=combineNintendoSources(...responses.map(response=>JSON.parse(response.body)));
 await ev('window.profileGamerFixtures.value='+JSON.stringify([identity])+';window.profileRouter.push("/perfil/owner?visual=1")');await wait(400);
 await ev('Promise.all([...document.querySelectorAll(".profile-gamer-preview img")].map(img=>img.decode().catch(()=>{})))');
 check(await ev('document.querySelectorAll(".gamer-recent-preview li").length===3'),'three actual public recent covers');
 check(await ev('parseFloat(getComputedStyle(document.querySelector(".featured-info h3")).fontWeight)<=700&&parseFloat(getComputedStyle(document.querySelector(".played-copy strong")).fontWeight)<=600'),'regular title weights instead of inherited 950');
 for(const width of [1440,1024,768,390,320]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600});await wait(150);
 check(await ev('document.documentElement.scrollWidth<=innerWidth'),'actual long titles fit '+width);
 check(await ev('document.querySelector(".played-art").getBoundingClientRect().height<=113'),'compact cover height '+width);
 check(await ev('(()=>{const cards=[...document.querySelectorAll(".gamer-most-played li")].map(el=>el.getBoundingClientRect().height);return Math.max(...cards)-Math.min(...cards)<1})()'),'game cards align '+width);
 if(width<500)check(await ev('document.querySelector(".gamer-recent-preview ul").scrollWidth>document.querySelector(".gamer-recent-preview ul").clientWidth'),'recent covers scroll inside the card '+width);
 if([1440,390].includes(width)){const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(process.env.TEMP+'/galaxia-gamer-polish-'+width+'.png',Buffer.from(shot.result.data,'base64'));}
 }
 await ev('window.profileGamerFixtures.value=[{platform:"nintendo",connectionState:"connected",visibility:"public",presence:null}];window.profileRouter.push("/perfil/owner?empty-gamer=1")');await wait(150);
 check(await ev('document.querySelectorAll(".gamer-most-played .empty-game").length===3 && document.querySelectorAll(".gamer-recent-preview .empty-game").length===3'),'missing data keeps three explicit empty slots');
 check(await ev('(()=>{const cards=[...document.querySelectorAll(".gamer-most-played li")].map(el=>el.getBoundingClientRect().height);return Math.max(...cards)-Math.min(...cards)<1})()'),'empty game cards have equal heights');
 check(!errors.length,'no runtime exceptions');
} catch(e){console.log('FAIL',e.message,errors);process.exitCode=1}finally{ws.close();edge.kill()}
