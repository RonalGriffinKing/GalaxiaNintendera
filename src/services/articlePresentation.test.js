import { describe, expect, it } from 'vitest'
import { analysisRating, criterionRating, criterionStarFill, gameEditorialFields, safeOfficialUrl, sectionNavLabel } from './articlePresentation'
describe('editorial article data', () => {
 it('reads historical hundred-point imports without turning every criterion into ten', () => {
  expect(analysisRating({score:100,criteria:[20,40,85,95,95].map(score=>({score}))})).toBe(67)
 })
 it('derives the total from criteria instead of a stale published score', () => {
  expect(analysisRating({score:100,criteria:Array.from({length:5},()=>({score:4}))})).toBe(40)
  expect(analysisRating({score:100,criteria:[{score:3},{score:8},{score:10},{score:10},{score:10}]})).toBe(82)
  expect(analysisRating({criteria:[{score:9},{score:9.5}]})).toBe(93)
  expect(analysisRating({score:85})).toBe(85)
  expect(analysisRating({score:95,criteria:[{score:''},{score:null},{score:'invalid'}]})).toBe(95)
  expect(analysisRating({criteria:[{score:0}]})).toBe(0)
 })
 it('maps criteria to five stars without rounding away partial ratings', () => {
  expect([1,2,3,4,5].map(star=>criterionStarFill(9,star))).toEqual([100,100,100,100,50])
  expect(criterionStarFill(8.5,5)).toBe(25)
  expect(criterionStarFill(9.2,5)).toBe(60)
  expect(criterionStarFill(10,5)).toBe(100)
  expect(criterionStarFill('invalid',1)).toBe(0)
 })
 it('keeps legacy labels and allows short navigation labels', () => {
  expect(sectionNavLabel({ title:'Un viaje largo', label:'Historia' })).toBe('Historia')
  expect(sectionNavLabel({ title:'Un viaje largo', label:'Historia', navLabel:'Trama' })).toBe('Trama')
  expect(sectionNavLabel({ title:'Título antiguo' })).toBe('Título antiguo')
  expect(sectionNavLabel({ navLabel:'a'.repeat(100) })).toHaveLength(42)
 })
 it('makes new game fields optional without inventing data', () => {
  expect(gameEditorialFields()).toEqual({cover:'',developer:'',genres:[]})
  expect(gameEditorialFields({cover:'/cover.jpg',developer:' Level-5 ',genres:' RPG, Simulación, '})).toEqual({cover:'/cover.jpg',developer:'Level-5',genres:['RPG','Simulación']})
  expect(gameEditorialFields({genres:['RPG',' ']}).genres).toEqual(['RPG'])
 })
 it('preserves the existing ten point criteria scale and bounds invalid values', () => {
  expect(criterionRating(8.5)).toBe(8.5)
  expect(criterionRating(95)).toBe(9.5)
  expect(criterionRating(-2)).toBe(0)
  expect(criterionRating('invalid')).toBe(0)
 })
 it('does not render executable official links', () => {
  expect(safeOfficialUrl('javascript:alert(1)')).toBe('')
  expect(safeOfficialUrl('https://example.org/game')).toBe('https://example.org/game')
 })
})
