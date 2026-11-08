import { randomUUID } from 'node:crypto'
export function decodeIconImage(body) {
  if (typeof body.data !== 'string' || !body.data || body.data.length > 700000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data)) throw new Error('invalid-image')
  const bytes = Buffer.from(body.data, 'base64')
  if (!bytes.length || bytes.length > 512 * 1024) throw new Error('invalid-image')
  const signatures = {
    'image/png': () => bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'image/jpeg': () => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    'image/webp': () => bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP',
    'image/gif': () => ['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6))
  }
  if (!signatures[body.contentType]?.()) throw new Error('invalid-image')
  return bytes
}
export function createIconImageUploader(bucket, downloadUrl) {
  return async body => {
    const bytes = decodeIconImage(body)
    const extension = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[body.contentType]
    const path = `profile-icons/${randomUUID()}.${extension}`
    const file = bucket.file(path)
    await file.save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: body.contentType, cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: randomUUID() } } })
    return { imageUrl: await downloadUrl(file) }
  }
}
