// Small synthesized chime: no audio downloads or dependencies.
export function createRewardSound() {
 let context
 return {
  async prime() { try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return; context ||= new Audio(); await context.resume() } catch {} },
  play(epic = false) { if (!context || context.state !== 'running') return; const now=context.currentTime; [523.25,659.25,epic?1046.5:783.99].forEach((frequency,index)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;const start=now+index*.09;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.38);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.4);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}}) },
  stop() { if(context?.state==='running') void context.suspend().catch(()=>{}) },
  dispose() { void context?.close().catch(()=>{});context=null }
 }
}
