import { describe, expect, it, vi } from 'vitest'
vi.mock('./backendClient', () => ({ backendRequest: vi.fn(async (...args) => args) }))
import { backendRequest } from './backendClient'
import { changedEventImageFields, changedPostImageFields, imageMonitorAdminAction, syncPostImageReferences } from './imageMonitorClient'

describe('imageMonitorClient', () => {
  it('selects only changed or removed stable post slots, never matching by URL or array position', () => {
    const previous = { image: '/cover.jpg', sections: [
      { mediaSlotId: 'section_0001', image: '/a.jpg' },
      { mediaSlotId: 'section_0002', image: '/b.jpg' }
    ] }
    const next = { image: '/cover.jpg', sections: [
      { mediaSlotId: 'section_0002', image: '/b.jpg' },
      { mediaSlotId: 'section_0001', image: '/c.jpg' },
      { mediaSlotId: 'section_0003', image: '/b.jpg' }
    ] }
    expect(changedPostImageFields(next, previous)).toEqual([
      { fieldKey: 'sections', mediaSlotId: 'section_0001' },
      { fieldKey: 'sections', mediaSlotId: 'section_0003' }
    ])
    expect(changedPostImageFields({ sections: [] }, previous)).toEqual([
      { fieldKey: 'cover' },
      { fieldKey: 'sections', mediaSlotId: 'section_0001' },
      { fieldKey: 'sections', mediaSlotId: 'section_0002' }
    ])
  })

  it('detects event image additions and replacements, including legacy imageUrl comparison', () => {
    expect(changedEventImageFields({ backgroundUrl: '/new.jpg' }, { imageUrl: '/old.jpg' })).toEqual([{ fieldKey: 'backgroundUrl' }])
    expect(changedEventImageFields({ backgroundUrl: '/same.jpg' }, { backgroundUrl: '/same.jpg' })).toEqual([])
  })

  it('does not register unchanged historical gallery rows when IDs are assigned during an edit', () => {
    const previous = { hero: { images: [{ url: '/old-a.jpg' }, { url: '/old-b.jpg' }] } }
    const next = { hero: { images: [
      { mediaSlotId: 'hero_slot_0001', url: '/old-a.jpg' },
      { mediaSlotId: 'hero_slot_0002', url: '/replacement.jpg' }
    ] } }
    expect(changedPostImageFields(next, previous)).toEqual([])
    expect(changedPostImageFields(next, previous, { forcedFields: ['hero.images:hero_slot_0002'] })).toEqual([
      { fieldKey: 'hero.images', mediaSlotId: 'hero_slot_0002' }
    ])
  })

  it('uses the authenticated backend for sync and administration actions', async () => {
    await syncPostImageReferences({ ownerId: 'post_1', operationId: 'operation_0001', expectedUpdatedAt: 10, fields: [{ fieldKey: 'cover' }] })
    await imageMonitorAdminAction('open-incident', { referenceId: 'a'.repeat(64) })
    expect(backendRequest).toHaveBeenNthCalledWith(1, 'image-monitor', expect.objectContaining({ method: 'POST', authenticated: true, body: expect.objectContaining({ ownerType: 'post' }) }))
    expect(backendRequest).toHaveBeenNthCalledWith(2, 'image-monitor', expect.objectContaining({ authenticated: true, body: expect.objectContaining({ action: 'open-incident' }) }))
  })
})
