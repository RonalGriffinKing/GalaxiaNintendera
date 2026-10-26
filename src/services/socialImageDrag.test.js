import { expect, it } from 'vitest'
import { imagePanLimits, imageDragOffset, constrainImagePan } from './socialImageDrag'
it('moves a wide crop horizontally without exposing the edges',()=>{
 const limits=imagePanLimits({width:100,height:200,naturalWidth:200,naturalHeight:200})
 expect(limits).toEqual({min:-50,max:50})
 expect(imageDragOffset({},25,{width:100},limits)).toEqual({x:25,y:0})
 expect(imageDragOffset({},1000,{width:100},limits)).toEqual({x:50,y:0})
 expect(imageDragOffset({},-1000,{width:100},limits)).toEqual({x:-50,y:0})
})
it('locks a fitting image and respects zoom and the old crop',()=>{
 const geometry={width:100,height:200,naturalWidth:100,naturalHeight:200}
 const fit=imagePanLimits(geometry)
 expect(constrainImagePan(50,fit)).toBe(0)
 expect(imagePanLimits({...geometry,scale:150})).toEqual({min:-25,max:25})
 expect(constrainImagePan(80,{min:-25,max:25})).toBe(25)
 const left=imagePanLimits({...geometry,naturalWidth:200,cropX:0})
 expect(left.min).toBe(-100);expect(left.max===0).toBe(true)
})
