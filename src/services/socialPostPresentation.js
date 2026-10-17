import { normalizeSocialContent } from './socialContent'

export const socialSource = post => post?.social || post?.shortVersion || post?.versionCorta || post?.version_corta || {}

export function socialHeadline(post = {}) {
  const social = normalizeSocialContent(socialSource(post))
  return { title: social.title || post.analysis?.hypeTitle || post.title || 'Publicación', highlights: social.titleHighlights }
}
