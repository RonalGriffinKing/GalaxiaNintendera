import { backendRequest } from './backendClient'

const url = value => String(value || '').trim()

export const imageMonitorEnabled = () => import.meta.env.VITE_IMAGE_MONITOR_ENABLED === 'true'

function postImageSlots(post = {}) {
  const slots = new Map()
  const add = (fieldKey, mediaSlotId, value) => {
    if (mediaSlotId) slots.set(`${fieldKey}:${mediaSlotId}`, { fieldKey, mediaSlotId, value: url(value) })
  }
  if (url(post.image)) slots.set('cover:', { fieldKey: 'cover', value: url(post.image) })
  if (url(post.hero?.image)) slots.set('hero.image:', { fieldKey: 'hero.image', value: url(post.hero.image) })
  if (url(post.hero?.logoUrl)) slots.set('hero.logoUrl:', { fieldKey: 'hero.logoUrl', value: url(post.hero.logoUrl) })
  if (url(post.social?.image)) slots.set('social.image:', { fieldKey: 'social.image', value: url(post.social.image) })
  for (const item of post.hero?.images || []) add('hero.images', item?.mediaSlotId, item?.url)
  for (const item of post.sections || []) add('sections', item?.mediaSlotId, item?.image)
  for (const item of post.social?.slides || []) add('social.slides', item?.mediaSlotId, item?.image)
  return slots
}

export function changedPostImageFields(nextPost, previousPost = null, { forcedFields = [] } = {}) {
  const next = postImageSlots(nextPost)
  const previous = postImageSlots(previousPost || {})
  const forced = new Set(forcedFields)
  for (const [key, item] of previous) if (!next.has(key)) next.set(key, { ...item, value: '' })
  return [...next].filter(([key, item]) => {
    const changed = !previous.has(key) || previous.get(key).value !== item.value
    if (!changed) return false
    // Existing legacy gallery rows get IDs together on first edit; only explicit edits may register them.
    if (previousPost && item.fieldKey === 'hero.images' && !previous.has(key) && !forced.has(key)) return false
    return true
  })
    .map(([, { fieldKey, mediaSlotId }]) => ({ fieldKey, ...(mediaSlotId ? { mediaSlotId } : {}) }))
}

export function changedEventImageFields(nextEvent, previousEvent = null) {
  const next = url(nextEvent?.backgroundUrl)
  const previous = url(previousEvent?.backgroundUrl || previousEvent?.imageUrl)
  return next !== previous && (next || previous) ? [{ fieldKey: 'backgroundUrl' }] : []
}

export function syncPostImageReferences({ ownerId, operationId, expectedUpdatedAt, fields }) {
  return backendRequest('image-monitor', {
    method: 'POST', authenticated: true,
    body: { action: 'sync', ownerType: 'post', ownerId, operationId, expectedUpdatedAt, fields }
  })
}

export function syncEventImageReferences({ ownerId, operationId, expectedUpdatedAt, fields }) {
  return backendRequest('image-monitor', {
    method: 'POST', authenticated: true,
    body: { action: 'sync', ownerType: 'event', ownerId, operationId, expectedUpdatedAt, fields }
  })
}

export function imageMonitorAdminAction(action, payload) {
  return backendRequest('image-monitor', { method: 'POST', authenticated: true, body: { ...payload, action } })
}
