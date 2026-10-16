const text = value => String(value ?? '').trim()
const list = value => Array.isArray(value) ? value : []

// Shared by JSON import, post saving and the image renderer. Never contains HTML.
export function normalizeSocialContent(source = {}) {
  const social = source && typeof source === 'object' ? source : {}
  const normalizeTitle = item => ({
    title: text(item.title || item.titulo),
    titleHighlights: [...new Set(list(item.titleHighlights).map(text).filter(Boolean))],
    eyebrow: text(item.eyebrow || item.etiqueta),
    accent: item.accent === 'gold' ? 'gold' : 'violet'
  })
  return {
    schemaVersion: 2,
    ...normalizeTitle(social),
    subtitle: text(social.subtitle || social.subtitulo),
    summary: text(social.summary || social.resumen || social.content || social.contenido || social.description),
    image: text(social.image || social.imagen),
    slides: list(social.slides || social.diapositivas || social.sections || social.secciones).map(value => {
      const item = value && typeof value === 'object' ? value : {}
      return {
        ...normalizeTitle(item),
        type: item.type === 'closing' ? 'closing' : 'content',
        subtitle: text(item.subtitle || item.subtitulo),
        content: text(item.content || item.contenido || item.summary || item.resumen || item.description),
        image: text(item.image || item.imagen),
        points: list(item.points || item.puntos || item.highlights).map(text).filter(Boolean),
        sectionIndexes: list(item.sectionIndexes || item.secciones).map(Number).filter(index => Number.isInteger(index) && index >= 0),
        cta: text(item.cta)
      }
    })
  }
}

// Exact text matching: misspelled/obsolete phrases simply stay unhighlighted.
// Longest match wins for overlaps; punctuation and the full title are preserved.
export function titleRuns(title, highlights = []) {
  const value = String(title ?? '')
  const phrases = [...new Set(list(highlights).map(text).filter(Boolean))].sort((a, b) => b.length - a.length)
  const runs = []
  let plain = ''
  for (let index = 0; index < value.length;) {
    const match = phrases.find(phrase => value.startsWith(phrase, index))
    if (match) {
      if (plain) runs.push({ text: plain, highlighted: false })
      plain = ''
      runs.push({ text: match, highlighted: true })
      index += match.length
    } else plain += value[index++]
  }
  if (plain) runs.push({ text: plain, highlighted: false })
  return runs
}
