export const SOCIAL_POINT_MARKERS = Object.freeze([
  { value: 'numbers', label: 'Números (1, 2, 3)' },
  { value: 'lines', label: 'Líneas (—)' },
  { value: 'dots', label: 'Puntos (•)' },
  { value: 'stars', label: 'Estrellas (✦)' }
])

export function socialPointMarker(style, index, slideType) {
  const selected = SOCIAL_POINT_MARKERS.some(option => option.value === style)
    ? style : slideType === 'closing' ? 'stars' : 'numbers'
  return { lines: '—', dots: '•', stars: '✦' }[selected] ?? index + 1
}
