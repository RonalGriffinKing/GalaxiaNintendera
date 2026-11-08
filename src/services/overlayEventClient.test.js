import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({getDoc:vi.fn(),getDocs:vi.fn()}))
vi.mock('@/firebase',()=>({db:{}}))
vi.mock('firebase/firestore',()=>({...mocks,doc:(_,collection,id)=>({collection,id}),collection:(_,name)=>({name}),query:(ref,...constraints)=>({ref,constraints}),orderBy:(...args)=>args,limit:n=>n}))
import { fetchOverlayEvent, listOverlayEvents } from './overlayEventClient'
beforeEach(()=>vi.clearAllMocks())
it('only reads the selected public event document and handles missing or invalid IDs',async()=>{
 expect(await fetchOverlayEvent('../bad')).toBeNull();expect(mocks.getDoc).not.toHaveBeenCalled()
 mocks.getDoc.mockResolvedValueOnce({id:'e1',exists:()=>true,data:()=>({game:{nameEn:'Game'}})})
 expect(await fetchOverlayEvent('e1')).toEqual({id:'e1',game:{nameEn:'Game'}})
 expect(mocks.getDoc).toHaveBeenCalledWith({collection:'galaxyEvents',id:'e1'})
 mocks.getDoc.mockResolvedValueOnce({exists:()=>false})
 expect(await fetchOverlayEvent('removed')).toBeNull()
})
it('loads a bounded event list for the selector in one request',async()=>{
 mocks.getDocs.mockResolvedValueOnce({docs:[{id:'e1',data:()=>({title:'Event'})}]})
 expect(await listOverlayEvents()).toEqual([{id:'e1',title:'Event'}])
 expect(mocks.getDocs).toHaveBeenCalledTimes(1)
 expect(mocks.getDocs.mock.calls[0][0].constraints).toContain(100)
})
