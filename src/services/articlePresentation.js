// Optional editorial fields: old posts keep their existing section labels and game data.
export const sectionNavLabel = (section = {}, index = 0) => String(section.navLabel || section.label || section.title || `Apartado ${index + 1}`).trim().slice(0, 42)
export function gameEditorialFields(game = {}) {
 return {
  cover: String(game.cover || '').trim(),
  developer: String(game.developer || '').trim(),
  genres: (Array.isArray(game.genres) ? game.genres : String(game.genres || '').split(',')).map(value => String(value).trim()).filter(Boolean)
 }
}
export const safeOfficialUrl = value => /^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : ''
export function criterionRating(value) {
 const score = Number(value)
 // Older imports sometimes stored criteria on 100 instead of the canonical 10.
 return Number.isFinite(score) ? Math.max(0, Math.min(10, score > 10 ? score / 10 : score)) : 0
}
// Ten point score mapped to five stars; preserve decimals in each star's fill.
export function criterionStarFill(value, star) {
 return Math.round(Math.max(0, Math.min(1, criterionRating(value) / 2 - (star - 1))) * 100)
}

// Criteria use a ten-point scale; the published total is their mean on 100.
export function analysisRating(analysis = {}) {
 const scores = (Array.isArray(analysis.criteria) ? analysis.criteria : []).map(item => item.score).filter(value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)))
 if (!scores.length) return Math.round(Math.max(0, Math.min(100, Number(analysis.score) || 0)))
 return Math.round(scores.reduce((sum, value) => sum + criterionRating(value), 0) / scores.length * 10)
}
