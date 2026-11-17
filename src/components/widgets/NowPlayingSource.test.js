import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({event:vi.fn(),gamer:vi.fn()}))
vi.mock('@/services/overlayEventClient',()=>({fetchOverlayEventCandidates:mocks.event}))
vi.mock('@/services/overlayGamerClient',()=>({fetchOverlayGamer:mocks.gamer}))
import NowPlayingWidget from './types/NowPlayingWidget.vue'
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();mocks.event.mockResolvedValue([]);mocks.gamer.mockResolvedValue([])})
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers()})
it('loads events and console activity independently in event mode',async()=>{
 await renderToString(createSSRApp(NowPlayingWidget,{widget:{data:{source:'event',eventId:'event-1'}},ownerId:'owner',preview:true}))
 expect(mocks.event).toHaveBeenCalledWith('event-1')
 expect(mocks.gamer).toHaveBeenCalledWith('owner','auto',{refresh:false})
})
it('does not consult any source when the widget is disabled',async()=>{
 await renderToString(createSSRApp(NowPlayingWidget,{widget:{data:{source:'event',eventId:'event-1',enabled:false}},ownerId:'owner'}))
 expect(mocks.event).not.toHaveBeenCalled();expect(mocks.gamer).not.toHaveBeenCalled()
})
