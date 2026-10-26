const text = value => typeof value === 'string' ? value.trim().slice(0, 200) : ''

// Optional metadata: old posts and non-game sections need no new fields.
export function sectionGameNames(game) {
  if (!game || typeof game !== 'object' || Array.isArray(game)) return null
  const nameEs = text(game.nameEs) || text(game.nameSpanish)
  const nameEn = text(game.nameEn) || text(game.nameEnglish)
  return nameEs || nameEn ? { nameEs, nameEn } : null
}

export function imageSearchQuery(post = {}, targetId = 'cover') {
  const match = /^section-(\d+)$/.exec(targetId)
  const section = match && Array.isArray(post.sections) ? post.sections[Number(match[1])] : null
  const local = sectionGameNames(section?.game)
  const general = sectionGameNames(post.game)
  return local?.nameEn || local?.nameEs || general?.nameEn || general?.nameEs || text(post.mediaGameName) || text(post.title)
}

export function normalizePostSections(sections, { dropEmpty = false, labelForIndex = () => 'Introduccion' } = {}) {
  const normalized = (Array.isArray(sections) ? sections : []).map((section, index) => {
    const game = sectionGameNames(section?.game)
    return {
      title: section?.title || section?.subtitulo || '',
      label: section?.label || section?.type || labelForIndex(index),
      navLabel: String(section?.navLabel || '').trim().slice(0, 42),
      image: section?.image || section?.imagen || '',
      content: section?.content || section?.contenido || '',
      hidden: Boolean(section?.hidden),
      ...(game ? { game } : {})
    }
  })
  const filtered = dropEmpty ? normalized.filter(s => s.title.trim() || s.image.trim() || s.content.trim()) : normalized
  return filtered.length ? filtered : [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }]
}
