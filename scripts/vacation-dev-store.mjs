import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

// Only imported by Vite's development server. Never used by deployed Functions.
export function createVacationDevStore(directory) {
  mkdirSync(directory, { recursive: true })
  const filename = key => {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(key)) throw new Error('Invalid location key')
    return path.join(directory, `${key}.json`)
  }
  const read = key => {
    try { return JSON.parse(readFileSync(filename(key), 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') return null; throw error }
  }
  return {
    async getWithMetadata(key) { return read(key) },
    async setJSON(key, data, options = {}) {
      // Synchronous read/check/rename is atomic with respect to this server's requests.
      const existing = read(key)
      if ((options.onlyIfNew && existing) || (options.onlyIfMatch && existing?.etag !== options.onlyIfMatch)) return { modified: false }
      const etag = randomUUID()
      const target = filename(key), temporary = `${target}.tmp`
      writeFileSync(temporary, JSON.stringify({ data, etag }), 'utf8')
      renameSync(temporary, target)
      return { modified: true, etag }
    }
  }
}
