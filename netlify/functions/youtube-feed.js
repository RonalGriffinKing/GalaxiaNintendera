const YOUTUBE_FEED_BASE = 'https://www.youtube.com/feeds/videos.xml'

export const handler = async (event) => {
  const channelId = String(event.queryStringParameters?.channelId || '').trim()

  if (!/^UC[\w-]{20,}$/.test(channelId)) {
    return jsonResponse(400, { error: 'missing-or-invalid-channel-id' })
  }

  try {
    const url = new URL(YOUTUBE_FEED_BASE)
    url.searchParams.set('channel_id', channelId)

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/atom+xml,application/xml,text/xml,*/*;q=0.8',
        'user-agent': 'GalaxiaNintendera/1.0 youtube-feed'
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      return jsonResponse(response.status, { error: 'youtube-feed-fetch-failed' })
    }

    const xml = await response.text()
    const items = parseYoutubeFeed(xml).slice(0, 12)

    return jsonResponse(200, { items }, {
      'cache-control': 'public, max-age=300, s-maxage=900'
    })
  } catch (error) {
    return jsonResponse(502, { error: 'youtube-feed-proxy-error' })
  }
}

function parseYoutubeFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
    const entry = match[1]
    const id = pick(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/)
    const title = decodeXml(pick(entry, /<title>([\s\S]*?)<\/title>/)) || 'Video de Galaxia Nintendera'
    const publishedAt = pick(entry, /<published>([\s\S]*?)<\/published>/)
    const description = decodeXml(pick(entry, /<media:description>([\s\S]*?)<\/media:description>/))
    const thumbnail = pick(entry, /<media:thumbnail[^>]+url="([^"]+)"/)

    return {
      id,
      title,
      description,
      publishedAt,
      thumbnail,
      url: id ? `https://www.youtube.com/watch?v=${id}` : ''
    }
  }).filter(item => item.id)
}

function pick(value, pattern) {
  return value.match(pattern)?.[1]?.trim() || ''
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'access-control-allow-origin': '*',
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  }
}
