import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({getDoc:vi.fn(),getDocs:vi.fn()}))
vi.mock('@/firebase',()=>({db:{}}))
vi.mock('firebase/firestore',()=>({...mocks,doc:(_,collection,id)=>({collection,id}),collection:(_,name)=>({name}),query:(ref,...constraints)=>({ref,constraints}),orderBy:(...args)=>args,limit:n=>n}))
import { fetchOverlayEvent, listOverlayEvents, fetchOverlayEventCandidates } from './overlayEventClient'
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
it('retains the selected event if the catalog request fails',async()=>{
 mocks.getDocs.mockRejectedValueOnce(new Error('offline'))
 mocks.getDoc.mockResolvedValueOnce({id:'selected',exists:()=>true,data:()=>({game:{nameEs:'Juego'}})})
 expect(await fetchOverlayEventCandidates('selected')).toEqual([{id:'selected',game:{nameEs:'Juego'}}])
})
it('uses the catalog without requiring a selected event and does not duplicate it',async()=>{
 const catalog={docs:[{id:'e1',data:()=>({game:{nameEs:'Juego'}})}]}
 mocks.getDocs.mockResolvedValueOnce(catalog)
 expect(await fetchOverlayEventCandidates('')).toEqual([{id:'e1',game:{nameEs:'Juego'}}])
 expect(mocks.getDoc).not.toHaveBeenCalled()
 mocks.getDocs.mockResolvedValueOnce(catalog)
 mocks.getDoc.mockResolvedValueOnce({id:'e1',exists:()=>true,data:()=>({game:{nameEs:'Juego'}})})
 expect(await fetchOverlayEventCandidates('e1')).toHaveLength(1)
})
