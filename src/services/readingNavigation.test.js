import { expect, it } from 'vitest'
import { createReadingNavigation } from './readingNavigation'
it('responds to slow deliberate scroll and ignores small direction reversals',()=>{
 const nav=createReadingNavigation()
 for(let y=0;y<=150;y+=3)nav.update(y)
 expect(nav.update(153)).toBe(true)
 expect(nav.update(150)).toBe(true)
 expect(nav.update(154)).toBe(true)
 for(let y=151;y>=124;y-=3)nav.update(y)
 expect(nav.update(123)).toBe(false)
})
it('clamps overscroll and reveals the nav at the top or while interacting',()=>{
 const nav=createReadingNavigation()
 expect(nav.update(500,{maxScroll:500})).toBe(true)
 expect(nav.update(560,{maxScroll:500})).toBe(true)
 expect(nav.update(500,{maxScroll:500})).toBe(true)
 expect(nav.update(500,{locked:true})).toBe(false)
 expect(nav.update(-30)).toBe(false)
 nav.reset(250)
 expect(nav.update(250)).toBe(false)
})
