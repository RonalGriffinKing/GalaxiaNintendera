import { normalizeSocialContent } from './socialContent'

export const socialSource = post => post?.social || post?.shortVersion || post?.versionCorta || post?.version_corta || {}

export function socialSummarySlides(post = {}) {
  const social = normalizeSocialContent(socialSource(post))
  if (!social.title && !social.summary && !social.slides.length) return []
  const sections = Array.isArray(post.sections) ? post.sections : []
  const cover = social.image || post.image || ''
  return [
    { type: 'cover', title: social.title || post.title || '', titleHighlights: social.titleHighlights, eyebrow: social.eyebrow || post.category || 'Noticias', accent: social.accent, content: social.summary || social.subtitle || post.summary || '', points: [], image: cover },
    ...social.slides.map((slide, index) => {
      const references = (slide.sectionIndexes.length ? slide.sectionIndexes : [index]).map(i => sections[i]).filter(section => section && !section.hidden)
      return { ...slide, eyebrow: slide.eyebrow || references[0]?.label || post.category || 'Noticias', image: slide.image || references.find(section => section.image)?.image || cover }
    })
  ]
}

export function socialHeadline(post = {}) {
  const social = normalizeSocialContent(socialSource(post))
  return { title: social.title || post.analysis?.hypeTitle || post.title || 'Publicación', highlights: social.titleHighlights }
}
