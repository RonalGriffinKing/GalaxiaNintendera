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
