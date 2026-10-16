export function clipboardUrls(value, multiple = false) {
  const lines = String(value || '').trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (!lines.length) throw new Error('El portapapeles está vacío.')
  if (!multiple && lines.length !== 1) throw new Error('Copia un solo enlace para este campo.')
  return [...new Set(lines.map(line => {
    if (/^\/(?![\/\\])[^\s\\]*$/.test(line)) return line
    try {
      const url = new URL(line)
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error()
      return url.href
    } catch {
      throw new Error('Copia un enlace completo que empiece por https:// o http://.')
    }
  }))].join('\n')
}
