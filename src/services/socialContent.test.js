import { describe, it, expect } from 'vitest'
import { normalizeSocialContent, titleRuns } from './socialContent'

describe('social JSON contract', () => {
  it('preserves editorial punctuation and keeps it outside highlighted phrases', () => {
    const title = '¡La prensa descubre cambios que no conocíamos!'
    const result = normalizeSocialContent({ title, titleHighlights: ['cambios que no conocíamos'], eyebrow: 'BOSQUE KOKIRI', slides: [{ title: '¿Cambiarías los puzles del Ocarina original?' }] })
    expect(result.title).toBe(title)
    expect(result.eyebrow).toBe('BOSQUE KOKIRI')
    expect(result.slides[0].title).toBe('¿Cambiarías los puzles del Ocarina original?')
    expect(titleRuns(result.title, result.titleHighlights)).toEqual([
      { text: '¡La prensa descubre ', highlighted: false },
      { text: 'cambios que no conocíamos', highlighted: true },
      { text: '!', highlighted: false }
    ])
    expect(normalizeSocialContent({ title: 'texto sin signos', eyebrow: 'Etiqueta original' })).toMatchObject({ title: 'texto sin signos', eyebrow: 'Etiqueta original' })
  })
  it('keeps legacy aliases and all points without silent truncation', () => {
    const result = normalizeSocialContent({ titulo: 'Portada', resumen: 'Resumen', diapositivas: [{ titulo: 'Detalle', contenido: 'Texto', puntos: ['1', '2', '3', '4', '5'] }] })
    expect(result.title).toBe('Portada')
    expect(result.slides[0].points).toHaveLength(5)
    expect(result.slides[0].type).toBe('content')
  })
  it('preserves metadata through repeated import/save normalization', () => {
    const source = { title: 'Cambios secretos', titleHighlights: ['secretos'], eyebrow: 'ZELDA', summary: 'Resumen', accent: 'gold', slides: [{ type: 'closing', title: 'Tu opinión', titleHighlights: ['opinión'], content: 'Comenta', points: ['Opción'], cta: 'Cuéntanos', sectionIndexes: [0] }] }
    const normalized = normalizeSocialContent(source)
    expect(normalizeSocialContent(normalized)).toEqual(normalized)
    expect(normalized.slides[0]).toMatchObject({ type: 'closing', titleHighlights: ['opinión'], cta: 'Cuéntanos' })
  })
  it('matches exact phrases without duplicating or losing title characters', () => {
    const value = '¡Descubre cambios secretos y nuevos objetos!'
    const runs = titleRuns(value, ['cambios', 'cambios secretos', 'objetos', 'inexistente'])
    expect(runs.map(run => run.text).join('')).toBe(value)
    expect(runs.filter(run => run.highlighted).map(run => run.text)).toEqual(['cambios secretos', 'objetos'])
  })
  it('handles repeated phrases, edited titles and plain text safely', () => {
    expect(titleRuns('Link y Link', ['Link']).filter(run => run.highlighted)).toHaveLength(2)
    expect(titleRuns('Título editado', ['Link'])).toEqual([{ text: 'Título editado', highlighted: false }])
    expect(titleRuns('<img onerror=alert(1)>', ['img']).map(run => run.text).join('')).toBe('<img onerror=alert(1)>')
  })
})
