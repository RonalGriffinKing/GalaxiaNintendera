import {describe,it,expect} from 'vitest'
import {animationFrame,cinematicState,ANIMATION_DURATION,ANIMATION_FPS,DEFAULT_EFFECTS,particleState,backgroundMotionState} from './publicationAnimation'
describe('Cinemática suave',()=>{
 it('keeps the background still when disabled or intensity is zero',()=>{for(const mode of ['none','zoom','pan','float'])expect(backgroundMotionState(3,mode,0)).toEqual({scale:1,x:0,y:0});expect(backgroundMotionState(3,'none',100)).toEqual({scale:1,x:0,y:0})})
 it('loops background movement continuously and covers the canvas edges',()=>{for(const mode of ['zoom','pan','float']){const start=backgroundMotionState(0,mode),end=backgroundMotionState(8,mode);for(const key of Object.keys(start))expect(end[key]).toBeCloseTo(start[key]);for(let frame=0;frame<=240;frame++){const s=backgroundMotionState(frame/30,mode,100);expect(Math.abs(s.x)).toBeLessThanOrEqual((s.scale-1)/2+1e-9);expect(Math.abs(s.y)).toBeLessThanOrEqual((s.scale-1)/2+1e-9)}}})
 it('has a deterministic eight second, 30fps preset with every effect enabled',()=>{expect(ANIMATION_DURATION*ANIMATION_FPS).toBe(240);expect(Object.values(DEFAULT_EFFECTS)).toEqual([true,true,true,true,true,true,true,true])})
 it('introduces the title then holds it readable',()=>{expect(cinematicState(0).titleOpacity).toBe(0);expect(cinematicState(.6).titleOpacity).toBeGreaterThan(0);expect(cinematicState(2).titleOpacity).toBe(1);expect(cinematicState(6).titleY).toBe(0);expect(cinematicState(8,false).titleY).toBe(0)})
 it('keeps the pulse subtle and all frame values finite',()=>{for(let frame=0;frame<240;frame++){const state=cinematicState(frame/30);expect(state.pillScale).toBeGreaterThanOrEqual(.975);expect(state.pillScale).toBeLessThanOrEqual(1.025);expect(Object.values(state).every(Number.isFinite)).toBe(true)}})
 it('returns title, pulse, shine and reflection to their initial state at the loop boundary',()=>{const start=cinematicState(0),end=cinematicState(8);expect(end.titleOpacity).toBe(start.titleOpacity);expect(end.titleY).toBe(start.titleY);expect(end.pillScale).toBeCloseTo(start.pillScale);expect(end.timeY).toBe(start.timeY);expect(end.pillGlow).toBe(start.pillGlow);expect(end.sweep).toBe(start.sweep);expect(end.reflectionOpacity).toBeCloseTo(0)})
 it('wraps rising particles invisibly and repeats their positions every eight seconds',()=>{for(let i=0;i<30;i++){const a=particleState(i,0),b=particleState(i,8);for(const key of Object.keys(a))expect(b[key]).toBeCloseTo(a[key]);expect(a.alpha).toBeGreaterThanOrEqual(0);expect(a.alpha).toBeLessThanOrEqual(.55)}})
 it('clamps scrubbing outside the timeline',()=>{expect(cinematicState(-1)).toEqual(cinematicState(0));expect(cinematicState(9)).toEqual(cinematicState(8))})
})

it('maps custom slide durations to full animation cycles without skipping the last slide',()=>{
 expect(animationFrame(0,3,5)).toEqual({index:0,time:0,total:15})
 expect(animationFrame(4.5,3,5)).toEqual({index:0,time:7.2,total:15})
 expect(animationFrame(5,3,5)).toEqual({index:1,time:0,total:15})
 expect(animationFrame(10,3,5)).toEqual({index:2,time:0,total:15})
 expect(animationFrame(15,3,5)).toEqual({index:2,time:8,total:15})
 expect(animationFrame(99,3,5)).toEqual(animationFrame(15,3,5))
 expect(animationFrame(-1,1,8)).toEqual({index:0,time:0,total:8})
})
