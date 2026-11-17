import test from 'node:test'
import assert from 'node:assert/strict'
import { createImageMonitorService } from './image-monitor.js'
import { createImageMonitorHandler } from '../image-monitor.js'
import { imageReferenceId } from './image-monitor-model.js'

function memoryDb(seed = {}) {
  const docs = new Map(Object.entries(seed))
  const db = {
    doc: path => ({ path }),
    runTransaction: async callback => {
      const writes = []
      const result = await callback({
        get: async ref => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
        create: (ref, data) => writes.push(['create', ref.path, data]),
        update: (ref, data) => writes.push(['update', ref.path, data])
      })
      for (const [kind, path, data] of writes) {
        if (kind === 'create' && docs.has(path)) throw new Error('already-exists')
        if (kind === 'update' && !docs.has(path)) throw new Error('not-found')
      }
      for (const [kind, path, data] of writes) docs.set(path, kind === 'update' ? { ...docs.get(path), ...data } : data)
      return result
    }
  }
  return { db, docs }
}

const request = (overrides = {}) => ({
  action: 'sync', ownerType: 'post', ownerId: 'post_01', operationId: 'operation_0001', expectedUpdatedAt: 10,
  fields: [{ fieldKey: 'sections', mediaSlotId: 'slot_0001' }], ...overrides
})
const post = (extra = {}) => ({ authorId: 'publisher_01', updatedAt: 10, sections: [{ mediaSlotId: 'slot_0001', image: 'https://images.example.test/a.jpg' }], ...extra })

test('registers only explicitly selected saved image fields, leaves availability unverified, and is idempotent', async () => {
  const { db, docs } = memoryDb({ 'users/admin_01': { role: 'admin' }, 'posts/post_01': post() })
  const sync = createImageMonitorService(db, () => 100)
  const first = await sync('admin_01', request())
  const referenceId = imageReferenceId('post', 'post_01', 'sections', 'slot_0001')
  const reference = docs.get(`imageReferences/${referenceId}`)
  assert.deepEqual(first.changes, [{ referenceId, kind: 'registered' }])
  assert.equal(reference.originalUrl, 'https://images.example.test/a.jpg')
  assert.equal(reference.availability, 'unverified')
  assert.equal(docs.size, 4)
  assert.deepEqual((await sync('admin_01', request())).changes, [])
  assert.equal([...docs.keys()].filter(path => path.startsWith('imageHistory/')).length, 1)
})

test('rejects publisher access to others, blocked users, stale saves and client supplied URLs', async () => {
  const { db } = memoryDb({
    'users/publisher_01': { role: 'publisher' }, 'users/blocked_01': { role: 'publisher', isBlocked: true },
    'users/malformed_01': { role: 'publisher', isBlocked: 'false' },
    'users/admin_01': { role: 'admin' }, 'posts/post_01': post()
  })
  const sync = createImageMonitorService(db)
  await assert.rejects(sync('publisher_01', request({ ownerId: 'other_post' })), { message: 'forbidden' })
  await assert.rejects(sync('blocked_01', request()), { message: 'forbidden' })
  await assert.rejects(sync('malformed_01', request()), { message: 'forbidden' })
  await assert.rejects(sync('admin_01', request({ expectedUpdatedAt: 9 })), { message: 'stale-owner' })
  await assert.rejects(sync('admin_01', request({ imageUrl: 'https://attacker.test/forged.jpg' })), { message: 'invalid-request' })
})

test('publisher synchronizes own post; changed URL increments reference version and archived slots stay recorded', async () => {
  const { db, docs } = memoryDb({ 'users/publisher_01': { role: 'publisher' }, 'posts/post_01': post() })
  const sync = createImageMonitorService(db, () => 101)
  await sync('publisher_01', request())
  docs.set('posts/post_01', post({ updatedAt: 11, sections: [{ mediaSlotId: 'slot_0001', image: 'https://images.example.test/b.jpg' }] }))
  const changed = await sync('publisher_01', request({ operationId: 'operation_0002', expectedUpdatedAt: 11 }))
  const referenceId = imageReferenceId('post', 'post_01', 'sections', 'slot_0001')
  assert.equal(docs.get(`imageReferences/${referenceId}`).referenceVersion, 2)
  assert.equal(changed.changes[0].kind, 'url-changed')
  docs.set('posts/post_01', post({ updatedAt: 12, sections: [] }))
  await sync('publisher_01', request({ operationId: 'operation_0003', expectedUpdatedAt: 12 }))
  assert.equal(docs.get(`imageReferences/${referenceId}`).adminState, 'archived')
  assert.equal([...docs.keys()].filter(path => path.startsWith('imageHistory/')).length, 3)
})

test('event owner synchronization requires event creator for publisher; image URLs come from persisted event', async () => {
  const { db, docs } = memoryDb({ 'users/publisher_01': { role: 'publisher' }, 'galaxyEvents/event_01': { createdBy: 'publisher_01', updatedAt: 4, backgroundUrl: 'https://images.example.test/event.jpg' } })
  const sync = createImageMonitorService(db, () => 5)
  const body = { action: 'sync', ownerType: 'event', ownerId: 'event_01', operationId: 'operation_event01', expectedUpdatedAt: 4, fields: [{ fieldKey: 'backgroundUrl' }] }
  await sync('publisher_01', body)
  const id = imageReferenceId('event', 'event_01', 'backgroundUrl')
  assert.equal(docs.get(`imageReferences/${id}`).originalUrl, 'https://images.example.test/event.jpg')
  await assert.rejects(sync('publisher_01', { ...body, ownerId: 'someone_elses_event' }), { message: 'forbidden' })
})

test('incident workflow is admin-only, idempotent, keeps technical availability separate, and records immutable events', async () => {
  const referenceId = imageReferenceId('post', 'post_01', 'cover')
  const { db, docs } = memoryDb({
    'users/admin_01': { role: 'admin' }, 'users/publisher_01': { role: 'publisher' },
    [`imageReferences/${referenceId}`]: { referenceVersion: 1, adminState: 'active', availability: 'unverified' }
  })
  const service = createImageMonitorService(db, () => 200)
  const open = { action: 'open-incident', referenceId, referenceVersion: 1, reason: 'No carga', operationId: 'incident_op_0001' }
  await assert.rejects(service('publisher_01', open), { message: 'forbidden' })
  const created = await service('admin_01', open)
  assert.equal(created.changed, true)
  assert.equal((await service('admin_01', open)).changed, false)
  const duplicate = await service('admin_01', { ...open, operationId: 'incident_duplicate_01' })
  assert.deepEqual(duplicate, { changed: false, incidentId: created.incidentId })
  assert.equal(docs.get(`imageReferences/${referenceId}`).availability, 'unverified')
  await service('admin_01', { action: 'note', referenceId, incidentId: created.incidentId, note: 'Vista en el panel', operationId: 'incident_note_0001' })
  await service('admin_01', { action: 'transition-incident', incidentId: created.incidentId, adminState: 'reviewed', operationId: 'incident_review_01' })
  const resolved = await service('admin_01', { action: 'transition-incident', incidentId: created.incidentId, adminState: 'resolved', operationId: 'incident_resolve_01' })
  assert.deepEqual(resolved, { changed: true, adminState: 'resolved' })
  const incident = docs.get(`imageIncidents/${created.incidentId}`)
  assert.equal(incident.adminState, 'resolved')
  assert.equal(incident.reviewedAt, 200)
  assert.equal(incident.resolvedAt, 200)
  assert.equal([...docs.keys()].filter(path => path.startsWith('imageHistory/')).length, 4)
  await assert.rejects(service('admin_01', { action: 'transition-incident', incidentId: created.incidentId, adminState: 'reviewed', operationId: 'incident_reopen_01' }), { message: 'invalid-transition' })
  const reopened = await service('admin_01', { ...open, operationId: 'incident_reopen_02' })
  assert.equal(reopened.changed, true)
  assert.notEqual(reopened.incidentId, created.incidentId)
  assert.equal(docs.get(`imageIncidents/${reopened.incidentId}`).sequence, 2)
})

test('handler checks feature flag, bearer identity, JSON and method before dispatch', async () => {
  let calls = 0
  const handler = createImageMonitorHandler({ enabled: () => true, verify: async token => {
    if (token !== 'valid') throw Error('invalid')
    return { uid: 'admin_01' }
  }, service: async () => { calls++; return { synchronized: true } } })
  const event = (httpMethod, authorization, body = '{}') => ({ httpMethod, headers: authorization ? { authorization } : {}, body })
  assert.equal((await handler(event('GET', 'Bearer valid'))).statusCode, 405)
  assert.equal((await handler(event('POST', ''))).statusCode, 401)
  assert.equal((await handler(event('POST', 'Bearer invalid'))).statusCode, 401)
  assert.equal((await handler(event('POST', 'Bearer valid', '{'))).statusCode, 400)
  assert.equal((await handler(event('POST', 'Bearer valid'))).statusCode, 200)
  assert.equal(calls, 1)
})
