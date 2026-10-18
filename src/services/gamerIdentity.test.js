import { describe, it, expect } from 'vitest'
import { gamerHighlights } from './gamerIdentity'
const game = (id, title = id) => ({ id, title, imageUrl: '/cover.png' })
const identity = overrides => ({ platform: 'nintendo', connectionState: 'connected', visibility: 'public', ...overrides })
describe('gamer preview capabilities', () => {
 it('shows no connections without adapter confirmation and respects privacy', () => {
  expect(gamerHighlights([identity({ connectionState: undefined })]).platforms).toEqual([])
  expect(gamerHighlights([identity({ visibility: 'private' })]).platforms).toEqual([])
  expect(gamerHighlights([identity({ visibility: 'private' })], true).platforms).toEqual(['Nintendo Switch'])
 })
 it('separates an online current game from the last detected game', () => {
  expect(gamerHighlights([identity({ presence: { state: 'online', currentGame: game('current'), lastGame: game('last') } })]).activity.playing).toBe(true)
  const offline = gamerHighlights([identity({ presence: { state: 'offline', currentGame: game('stale'), lastGame: game('last'), updatedAt: 'invalid' } })]).activity
  expect(offline.game.id).toBe('last'); expect(offline.playing).toBe(false); expect(offline.at).toBeNull()
  expect(gamerHighlights([identity({ presence: { state: 'offline', currentGame: game('stale') } })]).activity).toBeNull()
 })
 it('prioritizes currently playing over newer last activity', () => {
  const result = gamerHighlights([identity({ presence: { state: 'offline', lastGame: game('last'), updatedAt: '2026-10-18' } }), identity({ platform: 'steam', presence: { state: 'online', currentGame: game('current'), updatedAt: '2026-10-17' } })])
  expect(result.activity.game.id).toBe('current')
 })
 it('ranks at most three sourced measurements without estimating or summing duplicates', () => {
  const result = gamerHighlights([identity({ library: ['a','b','c','d'].map(id=>game(id)), playtime: [
   {gameId:'a',minutes:60,source:'api'}, {gameId:'a',minutes:90,source:'api'},
   {gameId:'b',minutes:180,source:'api'}, {gameId:'c',minutes:0,source:'api'},
   {gameId:'d',minutes:120,source:'api'}, {gameId:'unknown',minutes:999,source:'api'},
   {gameId:'c',minutes:500}, {gameId:'c',minutes:-1,source:'api'}
  ] })])
  expect(result.mostPlayed.map(item=>[item.game.id,item.minutes])).toEqual([['b',180],['d',120],['a',60]])
 })
 it('never derives time or library from presence', () => {
  const result = gamerHighlights([identity({ presence:{state:'online', currentGame:game('a')} })])
  expect(result.activity.game.id).toBe('a'); expect(result.mostPlayed).toEqual([])
 })
})
