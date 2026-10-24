// Run with THEME_LAB_NAVIGATION=1 node scripts/visual-theme-lab.mjs on THEME_LAB_URL.
﻿import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5225';const port=Number(process.env.THEME_QA_PORT||9465);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error')console.log('BROWSER',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let i=0;i<50;i++){if(await ev(expression))return;await wait(100)}throw Error('Timeout '+expression)}
const igdbQueries=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.includes('/functions/igdb'))igdbQueries.push(JSON.parse(m.params.request.postData||'{}').query)});
const downloadDir=process.env.TEMP+'\\galaxia-image-search-'+Date.now();fs.mkdirSync(downloadDir,{recursive:true});
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Log.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'window.__labAllowPresence=true'});
 await nav('/public-navigation','.public-nav');
 await until('!!document.querySelector(".bottom-profile-btn")');
 check(await ev('document.querySelectorAll(".public-bottom-nav button").length===5'),'five bottom navigation buttons');
 check(await ev('!document.querySelector(".public-bottom-nav").textContent.includes("Comunidades")&&!!document.querySelector(".bottom-profile-avatar")'),'profile avatar replaces communities');
 check(await ev('!document.querySelector(".public-menu-toggle")&&getComputedStyle(document.querySelector(".public-account-btn")).display==="none"'),'no top avatar on mobile');
 await ev('document.body.style.minHeight="6000px";window.scrollTo({top:500,behavior:"instant"})');await wait(450);
 check(await ev('document.querySelector(".public-nav").classList.contains("hidden")'),'top navigation hides when scrolling down');
 await ev('window.scrollTo({top:450,behavior:"instant"})');await wait(450);
 check(await ev('document.querySelector(".public-nav").classList.contains("pill")&&!document.querySelector(".public-nav").classList.contains("hidden")'),'intentional upward scroll reveals the pill');
 if(process.env.NAV_QA_SCREENSHOT){const shot=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.NAV_QA_SCREENSHOT,Buffer.from(shot.result.data,'base64'))}
 await ev('document.querySelector(".public-nav-expand").click()');await wait(50);
 check(await ev('!document.querySelector(".public-nav").classList.contains("pill")'),'pill expands manually');
 await ev('window.scrollTo({top:0,behavior:"instant"})');await wait(400);
 await ev('window.scrollTo({top:500,behavior:"instant"})');await wait(400);const readingPosition=await ev('window.scrollY');
 await ev('document.querySelector(".bottom-profile-btn").click()');await wait(350);
 check(await ev('(()=>{const r=document.querySelector(".public-account-card").getBoundingClientRect();return Math.abs(r.right-innerWidth)<2&&r.left>0})()'),'profile drawer is anchored to the right');
 check(await ev('document.querySelector(".public-account-card").contains(document.activeElement)'),'profile drawer receives keyboard focus');
 if(process.env.NAV_QA_DRAWER_SCREENSHOT){const shot=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.NAV_QA_DRAWER_SCREENSHOT,Buffer.from(shot.result.data,'base64'))}

 check(await ev('!!document.querySelector(".public-account-panel")'),'bottom profile opens existing account menu');
 await ev('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');await wait(350);
 check(await ev('window.scrollY')===readingPosition,'closing the drawer preserves the article scroll position');
 check(await ev('document.activeElement===document.querySelector(".bottom-profile-btn")'),'closing restores focus to the profile button');
 await ev('document.querySelector(".notification-nav-btn").click()');await wait(100);
 check(await ev('document.querySelector(".notification-nav-btn").getAttribute("aria-expanded")==="true"'),'notification button opens the existing panel');
 await ev('document.querySelector(".notification-nav-btn").click()');
 await ev('document.querySelector(".public-mobile-search-btn").click()');await wait(100);
 check(await ev('document.querySelector(".public-bottom-nav").inert'),'search suppresses bottom controls');
 await ev('window.themeLab.router.push("/post/local-theme-demo")');await until('!!document.querySelector(".public-nav.reading")');await wait(400);
 await ev('window.scrollTo({top:0,behavior:"instant"})');await wait(100);await ev('window.scrollTo({top:600,behavior:"instant"})');await wait(400);
 check(await ev('document.querySelector(".public-nav").classList.contains("hidden")&&document.querySelector(".public-bottom-nav").classList.contains("suppressed")'),'article reading hides both bars');
 await ev('window.scrollTo({top:550,behavior:"instant"})');await wait(400);
 check(await ev('!document.querySelector(".public-bottom-nav").classList.contains("suppressed")'),'reading upward restores bottom navigation');
 await ev('(async()=>{const m=await import("/src/composables/usePublicChromeLoading.js");m.homeWelcomeLoading.value=true})()');await wait(50);
 check(await ev('getComputedStyle(document.querySelector(".public-nav")).display==="none"&&getComputedStyle(document.querySelector(".public-bottom-nav")).display==="none"'),'loading hides both navigation surfaces');
 await ev('(async()=>{const m=await import("/src/composables/usePublicChromeLoading.js");m.homeWelcomeLoading.value=false})()');
 await ev('window.__labPostDelay=1400;sessionStorage.removeItem("galaxia-home-welcome-seen");window.themeLab.router.push("/navigation")');
 await until('!!document.querySelector(".home-welcome-loader")');
 check(await ev('document.querySelector(".home-welcome-loader").parentElement===document.body&&getComputedStyle(document.querySelector(".public-bottom-nav")).display==="none"'),'real home welcome loader covers the viewport with chrome hidden');
 await until('!document.querySelector(".home-welcome-loader")');
 await ev('window.__labAllowPresence=true;window.__labAuthChange(null)');await wait(100);
 check(await ev('!!document.querySelector(".bottom-profile-btn .fa-user")&&!document.querySelector(".bottom-profile-avatar")'),'visitor sees profile icon');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await wait(150);
 check(await ev('getComputedStyle(document.querySelector(".public-bottom-nav")).display==="none"'),'desktop retains its navigation');
 if(errors.length)console.log(errors);check(errors.length===0,'no runtime exceptions');
}finally{ws.close();edge.kill()}
