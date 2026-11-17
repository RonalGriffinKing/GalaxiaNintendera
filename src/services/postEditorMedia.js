import { createMediaSlotId } from './homeHero'

const validMediaSlotId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value)

export function uniqueMediaSlotItems(items = []) {
  const used = new Set()
  return (Array.isArray(items) ? items : []).map(item => {
    let id = validMediaSlotId(item?.mediaSlotId) ? item.mediaSlotId : ''
    if (!id || used.has(id)) id = createMediaSlotId()
    used.add(id)
    return { ...item, mediaSlotId: id }
  })
}

// Shared by the editor's clipboard import handler and its regression tests.
export function applyImportedPostMedia(post, parsed) {
  if (parsed.hero) post.hero = parsed.hero
  post.image = parsed.image || post.image
  post.sections = uniqueMediaSlotItems(parsed.sections)
  const currentSocial = post.social || {}
  post.social = {
    ...parsed.social,
    image: parsed.social.image || currentSocial.image || '',
    slides: uniqueMediaSlotItems(parsed.social.slides)
  }
  return post
}

// Clipboard-to-editor media path used directly by PostEditor.vue.
export async function pastePostMediaFromClipboard({ readText, parseJson, post }) {
  if (typeof readText !== 'function' || typeof parseJson !== 'function' || !post || typeof post !== 'object') {
    throw new Error('invalid-post-import-context')
  }
  const parsed = parseJson(await readText())
  applyImportedPostMedia(post, parsed)
  return parsed
}

// Called only after an explicit image replacement, including on historical sections.
export function replacePostSectionImage(sections, index, imageUrl) {
  const section = sections?.[index]
  if (!section) return false
  section.image = imageUrl
  if (!validMediaSlotId(section.mediaSlotId)) section.mediaSlotId = createMediaSlotId()
  return true
}
