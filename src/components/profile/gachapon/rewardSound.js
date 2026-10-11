// Synthesized audio, loaded only with the gachapon. No external assets.
export function createRewardSound() {
 let context
 const nodes=new Set()
 function tone(frequency,start,duration,volume=.025,type='sine',target=frequency,swell=false){
  const oscillator=context.createOscillator(),gain=context.createGain();nodes.add(oscillator)
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(target,start+duration)
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(swell ? .003 : volume,start+.025);if(swell)gain.gain.linearRampToValueAtTime(volume,start+duration*.9);gain.gain.exponentialRampToValueAtTime(.001,start+duration)
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+duration+.03)
  oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();gain.disconnect()}
 }
 function stop(){for(const node of nodes){try{node.stop()}catch{}}nodes.clear()}
 return {
  async prime(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;if(!context || context.state==='closed')context=new Audio();const active=context;if(active.state!=='running')await active.resume();return context===active && active.state==='running'}catch{return false}},
  spin(epic=false){stop();if(context?.state!=='running')return;const now=context.currentTime;for(let n=0;n<12;n++)tone((epic?440:330)*Math.pow(2,n/24),now+n*.3,.32,.012+n*.0025);tone(epic?180:150,now,3.8,epic?.065:.055,'triangle',epic?850:650,true)},
  play(epic=false){stop();if(context?.state!=='running')return;const now=context.currentTime;const notes=epic?[523.25,659.25,783.99,1046.5]:[523.25,659.25,783.99];notes.forEach((f,n)=>tone(f,now+n*.1,.7,.04));if(epic)tone(1318.5,now+.45,.8,.018)},
  stop,
  dispose(){stop();void context?.close().catch(()=>{});context=null}
 }
}
