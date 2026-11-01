import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { expect, it, vi } from 'vitest'
import EventsHistory from './EventsHistory.vue'

vi.mock('@/firebase', () => ({ auth: { currentUser: { uid: 'owner' } }, db: {} }))
vi.mock('firebase/firestore', () => ({ addDoc: vi.fn(), collection: vi.fn(), doc: vi.fn(), updateDoc: vi.fn() }))
import EventEditorModal from '../modals/EventEditorModal.vue'

const now = new Date('2026-11-01T12:00:00Z').getTime()
const event = (id, startsAt) => ({ id, title: `Evento ${id}`, startsAt, durationMinutes: 60 })

it('shows expired events, including the exact end boundary, and excludes ongoing and future events', async () => {
  const html = await renderToString(createSSRApp(EventsHistory, {
    now, ready: true,
    events: [event('terminado', now - 3600000), event('en-vivo', now - 1800000), event('futuro', now + 3600000)]
  }))
  expect(html).toContain('Evento terminado')
  expect(html).not.toContain('Evento en-vivo')
  expect(html).not.toContain('Evento futuro')
  expect(html).toContain('Reactivar')
  expect(html).toContain('Eliminar')
})

it('limits the history to six events per page with the most recent first', async () => {
  const html = await renderToString(createSSRApp(EventsHistory, {
    now, ready: true, events: Array.from({ length: 8 }, (_, index) => event(String(index), now - (index + 1) * 3600000))
  }))
  expect((html.match(/<article/g) || []).length).toBe(6)
  expect(html.indexOf('Evento 0')).toBeLessThan(html.indexOf('Evento 5'))
  expect(html).not.toContain('Evento 6')
  expect(html).toContain('1 de 2')
})

it('shows a loading message rather than an empty history before the server responds', async () => {
  const html = await renderToString(createSSRApp(EventsHistory, { now, ready: false }))
  expect(html).toContain('Cargando eventos anteriores')
  expect(html).not.toContain('No hay eventos anteriores guardados')
})

it('reactivates an existing event with its content preserved and requires a new date', async () => {
  const context = {}
  await renderToString(createSSRApp(EventEditorModal, {
    reactivating: true,
    event: { ...event('anterior', now - 86400000), description: 'Mismo juego y canal', url: 'https://twitch.tv/example' }
  }), context)
  const html = context.teleports.body
  expect(html).toContain('Reactivar evento')
  expect(html).toContain('Mismo juego y canal')
  expect(html).toContain('https://twitch.tv/example')
  expect(html).toMatch(/<input(?=[^>]*type="datetime-local")(?=[^>]*value="")[^>]*>/)
  expect(html).toMatch(/<button type="submit" disabled/)
})

it('offers previous events from the creator', async () => {
  const context = {}
  await renderToString(createSSRApp(EventEditorModal), context)
  expect(context.teleports.body).toContain('Ver eventos anteriores')
})
