import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoleManagementService } from './role-management.js'
import { createRoleManagementHandler } from '../role-management.js'

function memoryDb(seed = {}) {
  const docs = new Map(Object.entries(seed))
  const audit = []
  const ref = path => ({ path })
  const db = {
    doc: ref,
    collection: name => ({ doc: () => ({ path: `${name}/audit-${audit.length + 1}` }) }),
    runTransaction: async callback => callback({
      get: async document => ({ exists: docs.has(document.path), data: () => docs.get(document.path) }),
      update: (document, data) => docs.set(document.path, { ...docs.get(document.path), ...data }),
      create: (document, data) => { docs.set(document.path, data); audit.push(data) }
    })
  }
  return { db, docs, audit }
}

const request = (action, targetUid) => ({ action, targetUid })

test('principal admin grants and revokes publisher role, preserving unrelated permission fields', async () => {
  const { db, docs, audit } = memoryDb({ 'users/owner': { role: 'admin' }, 'users/writer': { role: 'user', canChat: false } })
  const manage = createRoleManagementService(db, 'owner', () => 123)
  assert.deepEqual(await manage('owner', request('grant-publisher', 'writer')), { changed: true, role: 'publisher' })
  assert.deepEqual(docs.get('users/writer'), { role: 'publisher', canChat: false, updatedAt: 123 })
  assert.deepEqual(await manage('owner', request('revoke-publisher', 'writer')), { changed: true, role: 'user' })
  assert.equal(audit.length, 2)
})

test('publisher and normal user cannot manage roles, including their own', async () => {
  for (const [actor, role] of [['writer', 'publisher'], ['member', 'user']]) {
    const { db } = memoryDb({ [`users/${actor}`]: { role }, 'users/other': { role: 'user' } })
    const manage = createRoleManagementService(db, 'owner')
    await assert.rejects(manage(actor, request('grant-publisher', 'other')), { message: 'forbidden' })
    await assert.rejects(manage(actor, request('grant-publisher', actor)), { message: 'forbidden' })
  }
})

test('blocked principal and blocked target grant are denied; blocked publisher can be revoked', async () => {
  let state = memoryDb({ 'users/owner': { role: 'admin', isBlocked: true }, 'users/writer': { role: 'publisher', isBlocked: true } })
  await assert.rejects(createRoleManagementService(state.db, 'owner')('owner', request('revoke-publisher', 'writer')), { message: 'forbidden' })
  state = memoryDb({ 'users/owner': { role: 'admin' }, 'users/blocked': { role: 'user', isBlocked: true } })
  await assert.rejects(createRoleManagementService(state.db, 'owner')('owner', request('grant-publisher', 'blocked')), { message: 'invalid-transition' })
  state = memoryDb({ 'users/owner': { role: 'admin' }, 'users/writer': { role: 'publisher', isBlocked: true } })
  await createRoleManagementService(state.db, 'owner')('owner', request('revoke-publisher', 'writer'))
  assert.equal(state.docs.get('users/writer').role, 'user')
})

test('cannot grant admin, alter protected fields, or manage the principal', async () => {
  const { db } = memoryDb({ 'users/owner': { role: 'admin' }, 'users/other': { role: 'user' } })
  const manage = createRoleManagementService(db, 'owner')
  await assert.rejects(manage('owner', request('grant-admin', 'other')), { message: 'invalid-request' })
  await assert.rejects(manage('owner', { ...request('grant-publisher', 'other'), isBlocked: false }), { message: 'invalid-request' })
  await assert.rejects(manage('owner', request('revoke-publisher', 'owner')), { message: 'invalid-target' })
})

test('handler rejects missing, invalid, expired and malformed identity before role service', async () => {
  let calls = 0
  const handler = createRoleManagementHandler({ enabled: () => true, verify: async token => {
    if (token !== 'valid') throw Error('expired or invalid')
    return { uid: 'owner' }
  }, service: async () => { calls++; return { changed: true } } })
  const event = (authorization, body = '{}') => ({ httpMethod: 'POST', headers: authorization ? { authorization } : {}, body })
  assert.equal((await handler(event('', '{}'))).statusCode, 401)
  assert.equal((await handler(event('Bearer expired'))).statusCode, 401)
  assert.equal((await handler(event('Bearer valid', '{'))).statusCode, 400)
  assert.equal((await handler(event('Bearer valid', '{"action":"grant-publisher","targetUid":"x","role":"admin"}'))).statusCode, 400)
  assert.equal(calls, 0)
})
