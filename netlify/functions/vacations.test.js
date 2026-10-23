import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => new Map())
vi.mock('@netlify/blobs', () => ({
  connectLambda: vi.fn(),
  getStore: () => ({
    async getWithMetadata(key) { const value = storage.get(key); return value ? structuredClone(value) : null },
    async setJSON(key, data, options = {}) {
      const old = storage.get(key)
      if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false }
      storage.set(key, { data: structuredClone(data), etag: String(Number(old?.etag || 0) + 1) })
      return { modified: true }
    }
  })
}))
import { handler } from './vacations'
const request = async (body, local = 'russafa', token = '') => {
  const res = await handler({ httpMethod: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}` }, queryStringParameters: { local }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.statusCode, data: JSON.parse(res.body) }
}
describe('shared vacation API', () => {
  beforeEach(() => storage.clear())
  it('stores a four-week consultation separately, with approval restricted to managers', async () => {
    const { data: initial } = await request()
    const person = initial.people[0].id
    await request({ action: 'book', person, start: '2027-05-03' })
    const saved = await request({ action: 'monthlyRequest', person, start: '2027-05-03', weeks: 1, status: 'approved' })
    expect(saved.status).toBe(200)
    expect(saved.data.bookings).toHaveLength(1)
    expect(saved.data.bookings[0].weeks).toBe(2)
    expect(saved.data.monthlyRequests).toHaveLength(1)
    const proposal = saved.data.monthlyRequests[0]
    expect(proposal.weeks).toBe(4)
    expect(proposal.status).toBe('pending')
    expect((await request({ action: 'reviewMonthly', id: proposal.id, status: 'approved' })).status).toBe(403)
    const { data: { token } } = await request({ action: 'login', username: 'Ronal', password: process.env.VACATION_MANAGER_PASSWORD || 'Ronal1997' })
    const approved = await request({ action: 'reviewMonthly', id: proposal.id, status: 'approved' }, 'russafa', token)
    expect(approved.data.monthlyRequests[0].status).toBe('approved')
    expect(approved.data.bookings).toEqual(saved.data.bookings)
    const changed = await request({ action: 'monthlyRequest', person, start: '2027-06-07' })
    expect(changed.data.monthlyRequests).toHaveLength(1)
    expect(changed.data.monthlyRequests[0].status).toBe('pending')
    expect(changed.data.changeCounts[`${person}:2027`]).toBe(1)
    const cancelled = await request({ action: 'cancelMonthly', person, id: proposal.id })
    expect(cancelled.data.monthlyRequests).toEqual([])
    expect(cancelled.data.changeCounts[`${person}:2027`]).toBe(2)
  })
  it('validates all 28 days of a consultation against closures', async () => {
    const { data: initial } = await request()
    const person = initial.people[0].id
    for (const start of ['2027-02-08', '2027-11-01', '2027-05-04', 'invalid']) {
      expect((await request({ action: 'monthlyRequest', person, start })).status).toBe(400)
    }
    expect((await request()).data.monthlyRequests).toBeUndefined()
  })
  it('allows ten employee cancellations per year and unlimited manager corrections', async () => {
    const { data: initial } = await request()
    const person = initial.people[0].id
    const another = initial.people[1].id
    let lastId
    for (let i = 0; i < 10; i++) {
      const saved = await request({ action: 'book', person, start: '2027-04-12' })
      lastId = saved.data.bookings.find(b => b.person === person).id
      expect((await request({ action: 'cancelBooking', id: lastId, person: another })).status).toBe(403)
      const cancelled = await request({ action: 'cancelBooking', id: lastId, person })
      expect(cancelled.status).toBe(200)
      expect(cancelled.data.changeCounts[`${person}:2027`]).toBe(i + 1)
      expect((await request({ action: 'cancelBooking', id: lastId, person })).status).toBe(404)
    }
    const saved = await request({ action: 'book', person, start: '2027-04-12' })
    lastId = saved.data.bookings.find(b => b.person === person).id
    expect((await request({ action: 'cancelBooking', id: lastId, person })).status).toBe(403)
    const { data: { token } } = await request({ action: 'login', username: 'Ronal', password: process.env.VACATION_MANAGER_PASSWORD || 'Ronal1997' })
    expect((await request({ action: 'book', id: lastId, person, start: '2027-04-19' }, 'russafa', token)).status).toBe(200)
    const managerDelete = await request({ action: 'cancelBooking', id: lastId }, 'russafa', token)
    expect(managerDelete.status).toBe(200)
    expect(managerDelete.data.changeCounts[`${person}:2027`]).toBe(10)
    const nextYear = await request({ action: 'book', person, start: '2028-04-10' })
    const nextId = nextYear.data.bookings.find(b => b.person === person).id
    expect((await request({ action: 'cancelBooking', id: nextId, person })).data.changeCounts[`${person}:2028`]).toBe(1)
  })
  it('requires manager authentication for configuration and isolates locations', async () => {
    expect((await request({ action: 'createLocal', name: 'Otro local' })).status).toBe(401)
    expect((await request({ action: 'login', username: 'Ronal', password: 'wrong' })).status).toBe(401)
    const { data: { token } } = await request({ action: 'login', username: 'Ronal', password: process.env.VACATION_MANAGER_PASSWORD || 'Ronal1997' })
    const created = await request({ action: 'createLocal', name: 'Otro local' }, 'russafa', token)
    const other = await request(undefined, created.data.id)
    expect(other.data.people).toEqual([])
    expect(other.data.bookings).toEqual([])
    expect((await request()).data.people).toHaveLength(8)
    expect((await request({ action: 'person', name: 'Ana' }, created.data.id, token)).data.people).toHaveLength(1)
    expect((await request()).data.people).toHaveLength(8)
  })
  it('requires confirmation for overlapping alternatives and protects edits', async () => {
    const { data: s } = await request()
    const first = { action: 'book', person: s.people[0].id, start: '2027-05-03' }
    const saved = await request(first)
    expect(saved.status).toBe(200)
    expect(saved.data.bookings[0].weeks).toBe(2)
    expect((await request({ ...first, person: s.people[1].id, start: '2027-05-10' })).status).toBe(409)
    const second = { ...first, person: s.people[1].id }
    expect((await request(second)).status).toBe(409)
    const alternative = await request({ ...second, confirmOverlap: true })
    expect(alternative.status).toBe(200)
    expect(alternative.data.bookings.find(b => b.person === second.person).pendingCoordination).toBe(true)
    expect((await request({ ...first, id: saved.data.bookings[0].id })).status).toBe(403)
    expect((await request({ action: 'deleteBooking', id: saved.data.bookings[0].id })).status).toBe(403)
  })
  it('restricts date closures and individual exceptions to managers', async () => {
    const { data: s } = await request()
    const { data: { token } } = await request({ action: 'login', username: 'Ronal', password: process.env.VACATION_MANAGER_PASSWORD || 'Ronal1997' })
    const exception = { person: s.people[0].id, year: 2027, quotas: [5, 2, 1], allowed: [['2027-03-01', '2027-03-31']] }
    expect((await request({ action: 'exception', exception })).status).toBe(403)
    expect((await request({ action: 'datedBlocks', ranges: [['2027-05-03', '2027-05-05']] })).status).toBe(403)
    expect((await request({ action: 'datedBlocks', ranges: [['2027-05-03', '2027-05-05']] }, 'russafa', token)).status).toBe(200)
    expect((await request({ action: 'exception', exception }, 'russafa', token)).status).toBe(200)
    expect((await request({ action: 'book', person: s.people[0].id, start: '2027-03-01' })).status).toBe(200)
    expect((await request({ action: 'book', person: s.people[1].id, start: '2027-03-08' })).status).toBe(400)
    expect((await request({ action: 'book', person: s.people[1].id, start: '2027-05-03' })).status).toBe(400)
    expect((await request({ action: 'exception', exception, remove: true }, 'russafa', token)).data.exceptions).toEqual([])
  })
})
