import { describe, expect, it } from 'vitest'
import { managementDestination } from './managementNavigation'
describe('single management workspace', () => {
 it('routes former standalone panels into global manager tabs', () => {
  for (const view of ['posts','users','overlays']) expect(managementDestination(view)).toEqual({path:'/admin/dashboard',query:{view}})
 })
 it('preserves page creation and theme bookmarks', () => {
  expect(managementDestination('posts',{section:'pages',create:'page',seed:'legal'})).toEqual({path:'/admin/dashboard',query:{view:'pages',create:'page',seed:'legal'}})
  expect(managementDestination('posts',{section:'themes'}).query.view).toBe('themes')
 })
 it('keeps direct editor actions without an intermediate manager', () => {
  expect(managementDestination('posts',{create:'post-json'})).toEqual({name:'post-create',query:{json:'1'}})
  expect(managementDestination('posts',{create:'hero'})).toEqual({name:'post-create',query:{mode:'hero'}})
 })
})
