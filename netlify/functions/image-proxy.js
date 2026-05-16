const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

export const handler = async (event) => {
  const rawUrl = event.queryStringParameters?.url || ''
  const target = parseTargetUrl(rawUrl)

  if (!target) {
    return jsonResponse(400, { error: 'missing-or-invalid-url' })
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        'user-agent': 'GalaxiaNintendera/1.0 image-proxy'
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      return jsonResponse(response.status, { error: 'image-fetch-failed' })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return jsonResponse(415, { error: 'not-an-image' })
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_IMAGE_BYTES) {
      return jsonResponse(413, { error: 'image-too-large' })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return jsonResponse(413, { error: 'image-too-large' })
    }

    return {
      statusCode: 200,
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=86400, s-maxage=604800',
        'content-type': contentType,
        vary: 'Accept'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    }
  } catch (error) {
    return jsonResponse(502, { error: 'proxy-error' })
  }
}

function parseTargetUrl(value) {
  try {
    const url = new URL(value)
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null
    return url
  } catch (error) {
    return null
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}
