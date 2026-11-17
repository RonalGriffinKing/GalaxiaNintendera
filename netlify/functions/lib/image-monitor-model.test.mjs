import test from 'node:test'
import assert from 'node:assert/strict'
import {
  IMAGE_MONITOR_COLLECTIONS, imageReferenceId, isValidImageHistory,
  isValidImageIncident, isValidImageReference
} from './image-monitor-model.js'

test('exposes only the three approved monitor collections and derives identity from owner and slot', () => {
  assert.deepEqual(IMAGE_MONITOR_COLLECTIONS, {
    references: 'imageReferences', incidents: 'imageIncidents', history: 'imageHistory'
  })
  assert.equal(imageReferenceId('post', 'p1', 'sections', 'slot-0001'), imageReferenceId('post', 'p1', 'sections', 'slot-0001'))
  assert.notEqual(imageReferenceId('post', 'p1', 'sections', 'slot-0001'), imageReferenceId('post', 'p1', 'sections', 'slot-0002'))
  assert.throws(() => imageReferenceId('post', 'p1', 'sections.0.image', '../slot'))
})

test('accepts the bounded unverified reference contract and rejects technical or injected fields', () => {
  const reference = {
    ownerType: 'post', ownerId: 'post_01', fieldKey: 'sections', mediaSlotId: 'slot_0001',
    referenceType: 'image', originalUrl: 'https://cdn.example.test/image.jpg', referenceVersion: 1,
    availability: 'unverified', adminState: 'active', createdAt: 1, createdBy: 'admin_01',
    updatedAt: 1, lastOperationId: 'operation_0001'
  }
  assert.equal(isValidImageReference(reference), true)
  assert.equal(isValidImageReference({ ...reference, availability: 'available' }), false)
  assert.equal(isValidImageReference({ ...reference, httpStatus: 200 }), false)
  assert.equal(isValidImageReference({ ...reference, originalUrl: 'javascript:alert(1)' }), false)
  assert.throws(() => imageReferenceId('post', 'p1', 'sections.4.image', 'slot-0001'))
})

test('validates incident states independently from availability and history kinds', () => {
  const incident = { referenceId: 'ref_0001', referenceVersion: 1, reason: 'Broken image', adminState: 'open', reportedBy: 'admin_01', reportedAt: 2, lastOperationId: 'operation_0001' }
  assert.equal(isValidImageIncident(incident), true)
  assert.equal(isValidImageIncident({ ...incident, adminState: 'available' }), false)
  assert.equal(isValidImageHistory({ referenceId: 'ref_0001', incidentId: 'incident_01', operationId: 'operation_0001', kind: 'incident-opened', actorUid: 'admin_01', at: 3 }), true)
  assert.equal(isValidImageHistory({ referenceId: 'ref_0001', operationId: 'operation_0001', kind: 'http-checked', actorUid: 'admin_01', at: 3 }), false)
  assert.equal(isValidImageHistory({ referenceId: 'ref_0001', operationId: 'operation_0001', kind: 'registered', actorUid: 'admin_01', at: 3, oldUrl: 'https://signed?secret=1' }), false)
})
