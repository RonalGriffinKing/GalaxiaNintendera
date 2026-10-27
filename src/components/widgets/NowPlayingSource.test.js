import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({event:vi.fn(),gamer:vi.fn()}))
vi.mock('@/services/overlayEventClient',()=>({fetchOverlayEvent:mocks.event}))
vi.mock('@/services/overlayGamerClient',()=>({fetchOverlayGamer:mocks.gamer}))
import NowPlayingWidget from './types/NowPlayingWidget.vue'
beforeEach(()=>{vi.clearAllMocks();mocks.event.mockResolvedValue(null);mocks.gamer.mockResolvedValue([])})
it('reads only the selected event in event mode, without consulting consoles',async()=>{
 await renderToString(createSSRApp(NowPlayingWidget,{widget:{data:{source:'event',eventId:'event-1'}},ownerId:'owner',preview:true}))
 expect(mocks.event).toHaveBeenCalledWith('event-1')
 expect(mocks.gamer).not.toHaveBeenCalled()
})
it('does not consult any source when the widget is disabled',async()=>{
 await renderToString(createSSRApp(NowPlayingWidget,{widget:{data:{source:'event',eventId:'event-1',enabled:false}},ownerId:'owner'}))
 expect(mocks.event).not.toHaveBeenCalled();expect(mocks.gamer).not.toHaveBeenCalled()
})
