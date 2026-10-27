import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { expect, it, vi } from 'vitest'
vi.mock('@/firebase',()=>({auth:{currentUser:{uid:'owner'}},db:{}}))
vi.mock('firebase/firestore',()=>({addDoc:vi.fn(),collection:vi.fn(),doc:vi.fn(),updateDoc:vi.fn()}))
import EventEditorModal from '../modals/EventEditorModal.vue'
it('renders the IGDB chooser alongside the URL when editing an existing event',async()=>{
 const context={}
 await renderToString(createSSRApp(EventEditorModal,{event:{id:'event-1',title:'Directo',startsAt:Date.now(),game:{nameEn:'Roco Kingdom'}}}),context)
 const html=context.teleports.body
 expect(html).toContain('Buscar imágenes del juego')
 expect(html).toContain('URL de imagen para el banner')
 expect(html).toContain('Roco Kingdom')
 expect(html).toContain('Guardar cambios')
})
it('offers the same image chooser when creating an event from scratch',async()=>{
 const context={}
 await renderToString(createSSRApp(EventEditorModal),context)
 expect(context.teleports.body).toContain('Buscar imágenes del juego')
 expect(context.teleports.body).toContain('Crear evento')
})
