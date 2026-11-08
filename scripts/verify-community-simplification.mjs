import fs from 'node:fs';import {spawn} from 'node:child_process';
const base=process.env.THEME_LAB_URL||'http://127.0.0.1:5231';const port=Number(process.env.THEME_QA_PORT||9473);const edge=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-sync','--disable-features=msImplicitSignin,msSSO','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+process.env.TEMP+'/galaxia-theme-lab-'+Date.now(),'about:blank'],{stdio:'ignore'});let tabs;for(let n=0;n<150;n++){try{tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,200))}}const ws=new WebSocket(tabs.find(t=>t.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));let id=0;const pending=new Map(),errors=[],requests=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Log.entryAdded')console.log('LOG',m.params.entry.text);else if(m.method==='Runtime.consoleAPICalled')console.log('CONSOLE',m.params.args.map(a=>a.description||a.value));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});const cdp=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}))});const ev=async expression=>{const m=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};const wait=ms=>new Promise(r=>setTimeout(r,ms));const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS',label)};async function nav(url,selector){await cdp('Page.navigate',{url:base+url});for(let n=0;n<100;n++){await wait(150);if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;}console.log(await ev('document.body.innerText'),errors);throw Error('Page failed '+url)}

async function until(expression){for(let i=0;i<50;i++){if(await ev(expression))return;await wait(100)}throw Error('Timeout '+expression)}
try{
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['*youtube.com/*','*googlevideo.com/*','*ytimg.com/*']});
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'window.AudioContext=undefined;window.webkitAudioContext=undefined;'});
 await nav('/composer','.thread-destination');await until('document.querySelectorAll(".destination-list button").length>0');
 check(await ev('!document.querySelector("textarea")&&document.querySelector(".destination-list").textContent.includes("Comunidad local")'),'global create asks for a community before showing the editor');
 await ev('document.querySelector(".destination-list button").click()');await until('!!document.querySelector(".thread-composer textarea")');await wait(300);
 check(await ev('location.pathname==="/comunidad"&&new URLSearchParams(location.search).get("id")==="lab-community"'),'selection opens the chosen community');
 check(await ev('!document.querySelector("button.community-select")&&!document.querySelector(".community-picker-panel")&&document.querySelector(".community-select").textContent.includes("Comunidad local")'),'inline composer fixes the destination with no community selector');
 check(await ev('!!document.querySelector(".community-videos")&&!document.querySelector(".hub-live-player,.hub-live-chat-shell,.live-stage-chat,.community-media-theater")'),'community media has no floating, theater or video chat controls');
 check(await ev('!window.themeLab.reads.some(r=>["liveChats","videoChats","liveGoals"].includes(r))&&!document.querySelector(".live-goals-box,.live-goal-manager-card")'),'community does not load live chat or live goals');
 await ev('(()=>{const t=document.querySelector(".thread-composer textarea");t.value="Local isolated thread";t.dispatchEvent(new Event("input",{bubbles:true}))})()');await wait(100);
 await ev('document.querySelector(".publish-btn").click()');await wait(250);
 check(await ev('window.themeLab.writes.some(w=>w.communityId==="lab-community"&&w.body==="Local isolated thread")'),'thread publishes to the chosen community using mock data only');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(180);
 check(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'community has no horizontal overflow on mobile');
 check(await ev('(()=>{const e=document.querySelector(".community-thread-composer"),p=document.querySelector(".community-select");return e&&getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>100&&p.getBoundingClientRect().width<=e.getBoundingClientRect().width&&!!e.querySelector("textarea")})()'),'mobile shows the inline thread editor with a compact community pill');
 await ev('window.__labAllowPresence=true;window.themeLab.router.push("/chat-tools")');await until('!!document.querySelector(".galaxia-hub-orb")');await wait(250);
 await ev('document.querySelector(".galaxia-hub-orb").click()');await wait(150);
 check(await ev('document.querySelectorAll(".hub-segments button").length===2&&!document.querySelector(".hub-live-player,.hub-section.live")'),'global Hub retains communities and private chats only');
 await ev('window.dispatchEvent(new CustomEvent("open-direct-chat",{detail:{id:"local-peer",name:"Local peer"}}))');await wait(200);
 check(await ev('!!document.querySelector(".direct-chat-panel")&&!document.querySelector(".direct-live-goal-chip")'),'private chat still opens without live features');
 check(await ev('!window.themeLab.reads.includes("liveChats")'),'global tools do not subscribe to live chat');
 check(await ev('(()=>{const e=document.querySelector(".public-create-thread-desktop");return e&&getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().width>0})()'),'mobile navigation exposes the create-thread button');
 await ev('document.querySelector(".public-create-thread-desktop").click()');await until('!!document.querySelector(".thread-destination")');
 check(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'mobile destination picker stays inside the viewport');
 await ev('window.themeLab.router.push("/inline-unjoined")');await until('!!document.querySelector(".composer-empty")');
 check(await ev('!document.querySelector(".thread-composer textarea")'),'unjoined destination cannot silently fall back to another community');
 check(errors.length===0,'community and destination picker have no runtime exceptions');
}finally{if(errors.length)console.log(errors);ws.close();edge.kill()}

