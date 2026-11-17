import { normalizeSectionGallery } from './sectionGallery'

const text = value => typeof value === 'string' ? value.trim().slice(0, 200) : ''
const mediaSlotId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : undefined
const newMediaSlotId = () => globalThis.crypto?.randomUUID?.().replace(/-/g, '') || `slot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`

// Optional metadata: old posts and non-game sections need no new fields.
export function sectionGameNames(game) {
  if (!game || typeof game !== 'object' || Array.isArray(game)) return null
  const nameEs = text(game.nameEs) || text(game.nameSpanish)
  const nameEn = text(game.nameEn) || text(game.nameEnglish)
  return nameEs || nameEn ? { nameEs, nameEn } : null
}

export function imageSearchQueries(post = {}, targetId = 'cover') {
  const match = /^section-(\d+)(?:-extra-\d+)?$/.exec(targetId)
  const section = match && Array.isArray(post.sections) ? post.sections[Number(match[1])] : null
  const games = (Array.isArray(section?.games) ? section.games : []).map(sectionGameNames).filter(Boolean)
  if (games.length) return [...new Set(games.map(game => game.nameEn || game.nameEs))]
  const local = sectionGameNames(section?.game)
  const general = sectionGameNames(post.game)
  return [local?.nameEn || local?.nameEs || general?.nameEn || general?.nameEs || text(post.mediaGameName) || text(post.title)].filter(Boolean)
}

export function imageSearchQuery(post = {}, targetId = 'cover') {
  return imageSearchQueries(post, targetId)[0] || ''
}

export function normalizePostSections(sections, { dropEmpty = false, labelForIndex = () => 'Introduccion' } = {}) {
  const seenIds = new Set()
  const normalized = (Array.isArray(sections) ? sections : []).map((section, index) => {
    const game = sectionGameNames(section?.game)
    const games = (Array.isArray(section?.games) ? section.games : []).map(sectionGameNames).filter(Boolean).slice(0, 4)
    const gallery = normalizeSectionGallery(section)
    let id = mediaSlotId(section?.mediaSlotId)
    if (id && seenIds.has(id)) id = newMediaSlotId()
    if (id) seenIds.add(id)
    return {
      ...(id ? { mediaSlotId: id } : {}),
      title: section?.title || section?.subtitulo || '',
      label: section?.label || section?.type || labelForIndex(index),
      navLabel: String(section?.navLabel || '').trim().slice(0, 42),
      ...gallery,
      content: section?.content || section?.contenido || '',
      ...(typeof section?.highlightQuote === 'string' && section.highlightQuote.trim()
        ? { highlightQuote: section.highlightQuote.trim().slice(0, 280) } : {}),
      hidden: Boolean(section?.hidden),
      ...(game ? { game } : {}),
      ...(games.length ? { games } : {})
    }
  })
  const filtered = dropEmpty ? normalized.filter(s => s.title.trim() || s.image.trim() || s.content.trim() || s.highlightQuote) : normalized
  return filtered.length ? filtered : [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }]
}
