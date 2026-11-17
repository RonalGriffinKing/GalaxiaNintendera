import { describe, expect, it, vi } from 'vitest'
vi.mock('./backendClient', () => ({ backendRequest: vi.fn() }))
import { backendRequest } from './backendClient'
import { fetchYoutubeFeed } from './youtubeFeedClient'

describe('youtubeFeedClient', () => {
  it('uses the shared client as a public GET with the channel id', async () => {
    backendRequest.mockResolvedValueOnce({ items: [{ id: 'video' }] })
    const controller = new AbortController()
    await expect(fetchYoutubeFeed('UC12345678901234567890', { signal: controller.signal })).resolves.toEqual({ items: [{ id: 'video' }] })
    expect(backendRequest).toHaveBeenCalledWith('youtube-feed', { query: { channelId: 'UC12345678901234567890' }, signal: controller.signal })
  })

  it('preserves backend errors for the caller fallback', async () => {
    backendRequest.mockRejectedValueOnce(new Error('youtube-feed-fetch-failed'))
    await expect(fetchYoutubeFeed('UC12345678901234567890')).rejects.toThrow('youtube-feed-fetch-failed')
  })
})
