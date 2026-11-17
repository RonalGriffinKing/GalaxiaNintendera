export const IMAGE_MONITOR_COLLECTIONS = Object.freeze({
  references: 'imageReferences',
  incidents: 'imageIncidents',
  history: 'imageHistory'
})

export const IMAGE_AVAILABILITY = Object.freeze(['unverified'])
export const IMAGE_REFERENCE_STATES = Object.freeze(['active', 'archived'])
export const IMAGE_INCIDENT_STATES = Object.freeze(['open', 'reviewed', 'ignored', 'resolved'])
export const IMAGE_HISTORY_KINDS = Object.freeze([
  'registered', 'url-changed', 'archived', 'incident-opened',
  'note-added', 'reviewed', 'ignored', 'resolved'
])

const idPattern = /^[A-Za-z0-9_-]{1,128}$/
const operationPattern = /^[A-Za-z0-9_-]{8,128}$/
const postFieldKeys = new Set(['cover','hero.image','hero.logoUrl','hero.images','sections','social.image','social.slides'])
const validReferenceUrl = value => {
  if (typeof value !== 'string' || value.length > 4096) return false
  if (/^\/(?!\/)[^\s]*$/.test(value)) return true
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password
  } catch { return false }
}

export function imageReferenceId(ownerType, ownerId, fieldKey, mediaSlotId = '') {
  if (!['post', 'event'].includes(ownerType) || !idPattern.test(ownerId)
    || !(ownerType === 'event' ? fieldKey === 'backgroundUrl' : postFieldKeys.has(fieldKey))
    || (mediaSlotId && !idPattern.test(mediaSlotId))) throw new Error('invalid-image-reference-key')
  // Stable hash avoids Firestore document-ID length limits and excludes URL and array position.
  const identity = [ownerType, ownerId, fieldKey, mediaSlotId].map(value => `${value.length}:${value}`).join('|')
  return createHash('sha256').update(identity).digest('hex')
}

export function isValidImageReference(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowed = new Set(['ownerType','ownerId','fieldKey','mediaSlotId','referenceType','originalUrl',
    'referenceVersion','availability','adminState','createdAt','createdBy','updatedAt','lastOperationId','incidentSequence'])
  if (Object.keys(value).some(key => !allowed.has(key))) return false
  return ['post', 'event'].includes(value.ownerType)
    && idPattern.test(value.ownerId || '')
    && (value.ownerType === 'event' ? value.fieldKey === 'backgroundUrl' : postFieldKeys.has(value.fieldKey))
    && (value.mediaSlotId === undefined || idPattern.test(value.mediaSlotId))
    && ['image', 'video', 'logo'].includes(value.referenceType)
    && validReferenceUrl(value.originalUrl)
    && Number.isSafeInteger(value.referenceVersion) && value.referenceVersion > 0
    && IMAGE_AVAILABILITY.includes(value.availability)
    && IMAGE_REFERENCE_STATES.includes(value.adminState)
    && Number.isFinite(value.createdAt) && Number.isFinite(value.updatedAt)
    && (value.incidentSequence === undefined || (Number.isSafeInteger(value.incidentSequence) && value.incidentSequence >= 0))
    && idPattern.test(value.createdBy || '') && operationPattern.test(value.lastOperationId || '')
}

export function isValidImageIncident(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowed = new Set(['referenceId','referenceVersion','reason','adminState','reportedBy','reportedAt',
    'reviewedAt','ignoredUntil','resolvedAt','lastOperationId','sequence'])
  return Object.keys(value).every(key => allowed.has(key))
    && idPattern.test(value.referenceId || '') && Number.isSafeInteger(value.referenceVersion)
    && value.referenceVersion > 0 && typeof value.reason === 'string' && value.reason.length <= 1000
    && (value.sequence === undefined || (Number.isSafeInteger(value.sequence) && value.sequence > 0))
    && IMAGE_INCIDENT_STATES.includes(value.adminState) && idPattern.test(value.reportedBy || '')
    && Number.isFinite(value.reportedAt) && operationPattern.test(value.lastOperationId || '')
    && ['reviewedAt','ignoredUntil','resolvedAt'].every(key => value[key] === undefined || Number.isFinite(value[key]))
}

export function isValidImageHistory(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const allowed = new Set(['referenceId','incidentId','operationId','kind','actorUid','at','metadata'])
  return Object.keys(value).every(key => allowed.has(key))
    && idPattern.test(value.referenceId || '')
    && (value.incidentId === undefined || idPattern.test(value.incidentId))
    && operationPattern.test(value.operationId || '') && IMAGE_HISTORY_KINDS.includes(value.kind)
    && idPattern.test(value.actorUid || '') && Number.isFinite(value.at)
    && (value.metadata === undefined || (value.metadata && typeof value.metadata === 'object'
      && !Array.isArray(value.metadata) && Object.keys(value.metadata).length <= 12))
}
import { createHash } from 'node:crypto'
