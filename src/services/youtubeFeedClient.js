import { backendRequest } from './backendClient'

export function fetchYoutubeFeed(channelId, { signal } = {}) {
  return backendRequest('youtube-feed', { query: { channelId }, signal })
}
