import { createHash } from 'node:crypto'
import { imageReferenceId } from './image-monitor-model.js'

const uidPattern = /^[A-Za-z0-9_-]{1,128}$/
const operationPattern = /^[A-Za-z0-9_-]{8,128}$/
const fieldKeys = new Set(['cover','hero.image','hero.logoUrl','hero.images','sections','social.image','social.slides','backgroundUrl'])
const digest = value => createHash('sha256').update(value).digest('hex')
const activeAccount = user => user && (user.isBlocked === undefined || user.isBlocked === false)
const validUrl = value => {
  if (typeof value !== 'string' || value.length > 4096) return false
  if (/^\/(?!\/)[^\s]*$/.test(value)) return true
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password
  } catch { return false }
}

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !['action','ownerType','ownerId','operationId','expectedUpdatedAt','fields'].includes(key))
    || body.action !== 'sync' || !['post','event'].includes(body.ownerType)
    || !uidPattern.test(body.ownerId || '') || !operationPattern.test(body.operationId || '')
    || !Number.isFinite(body.expectedUpdatedAt) || !Array.isArray(body.fields)
    || body.fields.length < 1 || body.fields.length > 50) throw new Error('invalid-request')
  const seen = new Set()
  const fields = body.fields.map(field => {
    if (!field || typeof field !== 'object' || Array.isArray(field)
      || Object.keys(field).some(key => !['fieldKey','mediaSlotId'].includes(key))
      || !fieldKeys.has(field.fieldKey)
      || (field.mediaSlotId !== undefined && !uidPattern.test(field.mediaSlotId))) throw new Error('invalid-request')
    if (body.ownerType === 'event' && field.fieldKey !== 'backgroundUrl') throw new Error('invalid-request')
    if (body.ownerType === 'post' && field.fieldKey === 'backgroundUrl') throw new Error('invalid-request')
    const needsSlot = ['hero.images','sections','social.slides'].includes(field.fieldKey)
    if (needsSlot !== Boolean(field.mediaSlotId)) throw new Error('invalid-request')
    const key = `${field.fieldKey}:${field.mediaSlotId || ''}`
    if (seen.has(key)) throw new Error('invalid-request')
    seen.add(key)
    return { fieldKey: field.fieldKey, mediaSlotId: field.mediaSlotId || '' }
  })
  return { ...body, fields }
}

function getField(ownerType, owner, field) {
  if (ownerType === 'event') return field.fieldKey === 'backgroundUrl' ? owner.backgroundUrl : undefined
  if (field.fieldKey === 'cover') return owner.image
  if (field.fieldKey === 'hero.image') return owner.hero?.image
  if (field.fieldKey === 'hero.logoUrl') return owner.hero?.logoUrl
  if (field.fieldKey === 'social.image') return owner.social?.image
  const items = field.fieldKey === 'hero.images' ? owner.hero?.images
    : field.fieldKey === 'sections' ? owner.sections : owner.social?.slides
  return Array.isArray(items) ? items.find(item => item?.mediaSlotId === field.mediaSlotId)?.url
    ?? items.find(item => item?.mediaSlotId === field.mediaSlotId)?.image : undefined
}

export function createImageMonitorService(db, now = Date.now) {
  const sync = async (actorUid, body) => {
    const ownerCollection = body.ownerType === 'post' ? 'posts' : 'galaxyEvents'
    const actorRef = db.doc(`users/${actorUid}`)
    const ownerRef = db.doc(`${ownerCollection}/${body.ownerId}`)
    const references = body.fields.map(field => {
      const referenceId = imageReferenceId(body.ownerType, body.ownerId, field.fieldKey, field.mediaSlotId)
      const historyId = digest(`${body.operationId}|${referenceId}`)
      return { field, referenceId, referenceRef: db.doc(`imageReferences/${referenceId}`), historyRef: db.doc(`imageHistory/${historyId}`), historyId }
    })

    return db.runTransaction(async tx => {
      const [actorSnapshot, ownerSnapshot, ...related] = await Promise.all([
        tx.get(actorRef), tx.get(ownerRef), ...references.flatMap(item => [tx.get(item.referenceRef), tx.get(item.historyRef)])
      ])
      if (!actorSnapshot.exists || !activeAccount(actorSnapshot.data()) || !ownerSnapshot.exists) throw new Error('forbidden')
      const actor = actorSnapshot.data()
      const owner = ownerSnapshot.data()
      const isAdmin = actor.role === 'admin'
      const ownsContent = body.ownerType === 'post'
        ? owner.authorId === actorUid : owner.createdBy === actorUid
      if (!isAdmin && !(actor.role === 'publisher' && ownsContent)) throw new Error('forbidden')
      if (!isAdmin && !ownsContent) throw new Error('forbidden')
      if (Number(owner.updatedAt || 0) !== body.expectedUpdatedAt) throw new Error('stale-owner')

      const changes = []
      for (let index = 0; index < references.length; index++) {
        const item = references[index]
        const priorRef = related[index * 2]
        const priorHistory = related[index * 2 + 1]
        if (priorHistory.exists) continue
        const url = getField(body.ownerType, owner, item.field)
        const previous = priorRef.exists ? priorRef.data() : null
        if (!url && !previous) continue
        if (url && !validUrl(url)) throw new Error('invalid-owner-image')
        const at = now()
        const kind = !url ? 'archived' : !previous ? 'registered' : previous.originalUrl === url ? null : 'url-changed'
        if (!kind) continue
        if (!url) {
          tx.update(item.referenceRef, { adminState: 'archived', updatedAt: at, lastOperationId: body.operationId })
        } else {
          const reference = {
            ownerType: body.ownerType, ownerId: body.ownerId, fieldKey: item.field.fieldKey,
            ...(item.field.mediaSlotId ? { mediaSlotId: item.field.mediaSlotId } : {}),
            referenceType: item.field.fieldKey === 'hero.logoUrl' ? 'logo' : 'image',
            originalUrl: url, referenceVersion: previous ? previous.referenceVersion + 1 : 1,
            availability: 'unverified', adminState: 'active', createdAt: previous?.createdAt || at,
            createdBy: previous?.createdBy || actorUid, updatedAt: at, lastOperationId: body.operationId
          }
          if (previous) tx.update(item.referenceRef, reference)
          else tx.create(item.referenceRef, reference)
        }
        tx.create(item.historyRef, {
          referenceId: item.referenceId, operationId: body.operationId, kind,
          actorUid, at, metadata: { referenceVersion: url ? (previous ? previous.referenceVersion + 1 : 1) : previous.referenceVersion }
        })
        changes.push({ referenceId: item.referenceId, kind })
      }
      return { synchronized: true, changes }
    })
  }

  const adminAction = async (actorUid, body) => {
    if (!uidPattern.test(actorUid || '') || !body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid-request')
    const operationId = body.operationId
    if (!operationPattern.test(operationId || '')) throw new Error('invalid-request')
    const actorRef = db.doc(`users/${actorUid}`)
    const history = (referenceId, itemId, kind, metadata = {}) => {
      const historyId = digest(`${operationId}|${itemId}|${kind}`)
      return { historyId, ref: db.doc(`imageHistory/${historyId}`), data: { referenceId, ...(itemId.startsWith('incident:') ? { incidentId: itemId.slice(9) } : {}), operationId, kind, actorUid, at: now(), ...(Object.keys(metadata).length ? { metadata } : {}) } }
    }
    if (body.action === 'open-incident') {
      if (Object.keys(body).some(key => !['action','referenceId','referenceVersion','operationId','reason'].includes(key))
        || !/^[a-f0-9]{64}$/.test(body.referenceId || '') || !Number.isSafeInteger(body.referenceVersion)
        || body.referenceVersion < 1 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000) throw new Error('invalid-request')
      const referenceRef = db.doc(`imageReferences/${body.referenceId}`)
      const normalizedReason = body.reason.trim()
      const logId = digest(`${operationId}|${body.referenceId}|incident-opened`)
      const logRef = db.doc(`imageHistory/${logId}`)
      return db.runTransaction(async tx => {
        const [actorSnapshot, referenceSnapshot, historySnapshot] = await Promise.all([tx.get(actorRef), tx.get(referenceRef), tx.get(logRef)])
        if (!actorSnapshot.exists || actorSnapshot.data().role !== 'admin' || !activeAccount(actorSnapshot.data())) throw new Error('forbidden')
        if (!referenceSnapshot.exists || referenceSnapshot.data().referenceVersion !== body.referenceVersion || referenceSnapshot.data().adminState !== 'active') throw new Error('stale-reference')
        if (historySnapshot.exists) return { changed: false, incidentId: historySnapshot.data().metadata.incidentId }
        const reference = referenceSnapshot.data()
        const previousSequence = Number.isSafeInteger(reference.incidentSequence) ? reference.incidentSequence : 0
        const currentIncidentId = previousSequence ? digest(`${body.referenceId}|${body.referenceVersion}|${normalizedReason}|${previousSequence}`) : ''
        const currentIncidentRef = currentIncidentId ? db.doc(`imageIncidents/${currentIncidentId}`) : null
        const currentIncidentSnapshot = currentIncidentRef ? await tx.get(currentIncidentRef) : null
        if (currentIncidentSnapshot?.exists) {
          const current = currentIncidentSnapshot.data()
          if (current.adminState !== 'resolved' && current.referenceVersion === body.referenceVersion && current.reason === normalizedReason) {
            return { changed: false, incidentId: currentIncidentId }
          }
        }
        const sequence = previousSequence + 1
        const incidentId = digest(`${body.referenceId}|${body.referenceVersion}|${normalizedReason}|${sequence}`)
        const incidentRef = db.doc(`imageIncidents/${incidentId}`)
        const at = now()
        tx.create(incidentRef, { referenceId: body.referenceId, referenceVersion: body.referenceVersion, reason: normalizedReason, sequence, adminState: 'open', reportedBy: actorUid, reportedAt: at, lastOperationId: operationId })
        tx.update(referenceRef, { incidentSequence: sequence })
        tx.create(logRef, { referenceId: body.referenceId, incidentId, operationId, kind: 'incident-opened', actorUid, at, metadata: { referenceVersion: body.referenceVersion, incidentId } })
        return { changed: true, incidentId }
      })
    }
    if (body.action === 'note') {
      if (Object.keys(body).some(key => !['action','referenceId','incidentId','operationId','note'].includes(key))
        || !/^[a-f0-9]{64}$/.test(body.referenceId || '')
        || (body.incidentId !== undefined && !/^[a-f0-9]{64}$/.test(body.incidentId))
        || typeof body.note !== 'string' || !body.note.trim() || body.note.trim().length > 1000) throw new Error('invalid-request')
      const itemId = body.incidentId ? `incident:${body.incidentId}` : `reference:${body.referenceId}`
      const log = history(body.referenceId, itemId, 'note-added', { note: body.note.trim() })
      return db.runTransaction(async tx => {
        const [actorSnapshot, referenceSnapshot, incidentSnapshot, historySnapshot] = await Promise.all([
          tx.get(actorRef), tx.get(db.doc(`imageReferences/${body.referenceId}`)),
          ...(body.incidentId ? [tx.get(db.doc(`imageIncidents/${body.incidentId}`))] : []), tx.get(log.ref)
        ])
        if (!actorSnapshot.exists || actorSnapshot.data().role !== 'admin' || !activeAccount(actorSnapshot.data())) throw new Error('forbidden')
        if (!referenceSnapshot.exists || (body.incidentId && !incidentSnapshot.exists)) throw new Error('missing-reference')
        if (body.incidentId && incidentSnapshot.data().referenceId !== body.referenceId) throw new Error('invalid-request')
        if (historySnapshot.exists) return { changed: false }
        tx.create(log.ref, log.data)
        return { changed: true }
      })
    }
    if (body.action === 'transition-incident') {
      if (Object.keys(body).some(key => !['action','incidentId','operationId','adminState','ignoredUntil'].includes(key))
        || !/^[a-f0-9]{64}$/.test(body.incidentId || '')
        || !['reviewed','ignored','resolved'].includes(body.adminState)
        || (body.adminState !== 'ignored' && body.ignoredUntil !== undefined)
        || (body.adminState === 'ignored' && (!Number.isFinite(body.ignoredUntil)
          || body.ignoredUntil <= now() || body.ignoredUntil > now() + 365 * 86400000))) throw new Error('invalid-request')
      const incidentRef = db.doc(`imageIncidents/${body.incidentId}`)
      return db.runTransaction(async tx => {
        const [actorSnapshot, incidentSnapshot] = await Promise.all([tx.get(actorRef), tx.get(incidentRef)])
        if (!actorSnapshot.exists || actorSnapshot.data().role !== 'admin' || !activeAccount(actorSnapshot.data())) throw new Error('forbidden')
        if (!incidentSnapshot.exists) throw new Error('missing-incident')
        const incident = incidentSnapshot.data()
        const log = history(incident.referenceId, `incident:${body.incidentId}`, body.adminState, { referenceVersion: incident.referenceVersion })
        const historySnapshot = await tx.get(log.ref)
        if (historySnapshot.exists) return { changed: false, adminState: incident.adminState }
        const transitions = { open: ['reviewed','ignored','resolved'], reviewed: ['ignored','resolved'], ignored: ['reviewed','resolved'], resolved: [] }
        if (!transitions[incident.adminState]?.includes(body.adminState)) throw new Error('invalid-transition')
        const at = log.data.at
        tx.update(incidentRef, {
          adminState: body.adminState, lastOperationId: operationId,
          ...(body.adminState === 'reviewed' ? { reviewedAt: at } : {}),
          ...(body.adminState === 'ignored' ? { ignoredUntil: body.ignoredUntil } : {}),
          ...(body.adminState === 'resolved' ? { resolvedAt: at } : {})
        })
        tx.create(log.ref, log.data)
        return { changed: true, adminState: body.adminState }
      })
    }
    throw new Error('invalid-request')
  }

  return async (actorUid, rawBody) => {
    if (rawBody?.action === 'sync') return sync(actorUid, validateRequest(rawBody))
    return adminAction(actorUid, rawBody)
  }
}

export { validateRequest as validateImageMonitorSyncRequest }
