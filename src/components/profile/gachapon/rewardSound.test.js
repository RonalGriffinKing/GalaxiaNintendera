import {it,expect,vi} from 'vitest'
import {createRewardSound} from './rewardSound'
it('stops spinning tones before reveal and cleans up on disposal',async()=>{
 const nodes=[]
 const param=()=>({setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()})
 const close=vi.fn(async()=>{})
 class Audio {state='running';currentTime=0;destination={};resume=async()=>{};close=close;createGain(){return {gain:param(),connect:vi.fn(),disconnect:vi.fn()}};createOscillator(){const node={frequency:param(),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn()};nodes.push(node);return node}}
 vi.stubGlobal('window',{AudioContext:Audio})
 try{const audio=createRewardSound();expect(await audio.prime()).toBe(true);audio.spin(true);const spinning=[...nodes];expect(spinning.length).toBe(13);audio.play(true);expect(spinning.every(node=>node.stop.mock.calls.length===2)).toBe(true);audio.dispose();expect(close).toHaveBeenCalledOnce()}finally{vi.unstubAllGlobals()}
})

it('reuses audio for repeated normal and epic openings and resumes after suspension',async()=>{
 const nodes=[],contexts=[]
 const param=()=>({setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()})
 class Audio {state='running';currentTime=0;destination={};constructor(){contexts.push(this)}resume=vi.fn(async()=>{this.state='running'});close=vi.fn(async()=>{this.state='closed'});createGain(){return{gain:param(),connect:vi.fn(),disconnect:vi.fn()}};createOscillator(){const node={frequency:param(),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn()};nodes.push(node);return node}}
 vi.stubGlobal('window',{AudioContext:Audio})
 try{
 const audio=createRewardSound()
 for(const epic of [false,true,false,true]){
 expect(await audio.prime()).toBe(true)
 const before=nodes.length;audio.spin(epic);expect(nodes.length-before).toBe(13)
 audio.play(epic);expect(nodes.length-before).toBe(epic?18:16)
 contexts[0].state='suspended'
 }
 expect(contexts.length).toBe(1);expect(contexts[0].resume).toHaveBeenCalledTimes(3)
 expect(nodes.every(node=>node.start.mock.calls.length===1)).toBe(true)
 audio.dispose();expect(contexts[0].close).toHaveBeenCalledOnce()
 }finally{vi.unstubAllGlobals()}
})
