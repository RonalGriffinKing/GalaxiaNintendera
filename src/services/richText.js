const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const safeUrl = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return '#'
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://galaxia.local'
    const url = new URL(raw, base)
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return escapeHtml(raw)
  } catch (error) {
    if (raw.startsWith('/')) return escapeHtml(raw)
  }
  return '#'
}

const renderInline = (value = '') => {
  let html = escapeHtml(value)

  html = html.replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    return `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })

  return html
}

const closeList = (state) => {
  if (!state.type) return ''
  const tag = state.type === 'ol' ? 'ol' : 'ul'
  state.type = ''
  return `</${tag}>`
}

export const renderRichText = (value = '') => {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n')
  const listState = { type: '' }
  const output = []

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      output.push(closeList(listState))
      return
    }

    if (/^---+$/.test(trimmed)) {
      output.push(closeList(listState), '<hr />')
      return
    }

    if (/^>\s?/.test(trimmed)) {
      output.push(closeList(listState), `<blockquote>${renderInline(trimmed.replace(/^>\s?/, ''))}</blockquote>`)
      return
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)/)
    if (unordered) {
      if (listState.type !== 'ul') output.push(closeList(listState), '<ul>')
      listState.type = 'ul'
      output.push(`<li>${renderInline(unordered[1])}</li>`)
      return
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)/)
    if (ordered) {
      if (listState.type !== 'ol') output.push(closeList(listState), '<ol>')
      listState.type = 'ol'
      output.push(`<li>${renderInline(ordered[1])}</li>`)
      return
    }

    output.push(closeList(listState), `<p>${renderInline(trimmed)}</p>`)
  })

  output.push(closeList(listState))
  return output.filter(Boolean).join('')
}
