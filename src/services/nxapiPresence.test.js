import { describe, it, expect } from 'vitest'
import { nxapiPresenceId, nxapiProfileId, normalizeNxapiPresence, normalizeNxapiPublicProfile, parseNxapiPublicProfile, combineNintendoSources } from './nxapiPresence'
import { nowPlayingCard, nowPlayingSettings } from './nowPlaying'
const presenceUrl = 'https://nxapi-presence.fancy.org.uk/api/presence/d392169fdeb68a8e'
const profileId = 'de97_DbiogMuJB5WFpmvKA'
const profileUrl = 'https://nxapi-auth.fancy.org.uk/profile/' + profileId
const game = { id: '01006f8002326000', name: 'Juego de prueba', total_play_time: 79029, last_played_at: '2026-10-17T14:47:36.849Z', first_played_at: '2020-03-20T01:37:09.000Z' }
describe('nxapi public links and capabilities', () => {
 it('preserves Switch 2 presence minutes and matches the public profile by canonical title ID', () => {
  const live = normalizeNxapiPresence({friend:{name:'Prueba',presence:{state:'ONLINE',platform:2,game:{name:game.name,shopUri:'https://ec.nintendo.com/apps/'+game.id+'/GB?acdIndex=1',totalPlayTime:993}}}})
  expect(live.presence.platformLabel).toBe('Nintendo Switch 2')
  expect(live.presence.currentGame.id).toBe(game.id)
  const profile = normalizeNxapiPublicProfile({name:'Perfil',recent_titles:[{...game,total_play_time:900}]})
  const combined = combineNintendoSources(live,profile)
  expect(combined.playtime).toEqual([{gameId:game.id,minutes:993,source:'nxapi-presence'}])
  const card = nowPlayingCard([combined],nowPlayingSettings())
  expect(card.platformLabel).toBe('Nintendo Switch 2')
  expect(card.stats[0].text).toBe('16 h 33 min')
  expect(nowPlayingCard([combineNintendoSources(live,null)],nowPlayingSettings()).stats[0].text).toBe('16 h 33 min')
 })
 it('reconciles legacy shop URL IDs without matching games by similar names', () => {
  const profile = normalizeNxapiPublicProfile({name:'Perfil',recent_titles:[game]})
  const live = normalizeNxapiPresence({friend:{name:'Prueba',presence:{state:'ONLINE',game:{name:game.name,shopUri:'https://ec.nintendo.com/apps/'+game.id+'/GB'}}}})
  live.presence.currentGame.id='https://ec.nintendo.com/apps/'+game.id+'/GB'
  expect(nowPlayingCard([combineNintendoSources(live,profile)],nowPlayingSettings()).stats[0].text).toBe('1317 h 9 min')
  live.presence.currentGame.id='https://ec.nintendo.com/apps/0100000000000000/GB'
  expect(nowPlayingCard([combineNintendoSources(live,profile)],nowPlayingSettings()).stats).toEqual([])
 })
 it('does not infer consoles from names or invent missing/invalid minutes', () => {
  for(const minutes of [undefined,null,'993',-1,Infinity]){
   const value=normalizeNxapiPresence({friend:{name:'Prueba',presence:{state:'ONLINE',platform:99,game:{name:'Nintendo Switch 2 Edition',totalPlayTime:minutes}}}})
   expect(value.playtime).toBeNull();expect(value.presence.platformLabel).toBeUndefined()
  }
  const value=normalizeNxapiPresence({friend:{name:'Prueba',presence:{state:'ONLINE',platform:1,game:{name:'Juego',totalPlayTime:0}}}})
  expect(value.presence.platformLabel).toBe('Nintendo Switch');expect(value.playtime[0].minutes).toBe(0)
 })
 it('accepts only exact supported public endpoints', () => {
  expect(nxapiPresenceId(presenceUrl)).toBe('d392169fdeb68a8e'); expect(nxapiProfileId(profileUrl)).toBe(profileId)
  for (const url of [presenceUrl+'?token=secret', presenceUrl+'#x', presenceUrl+'/', presenceUrl.replace('https:', 'http:'), presenceUrl.replace('.uk/', '.uk.evil.test/'), presenceUrl.replace('https://', 'https://user:pass@'), presenceUrl.replace('/api/presence/', ':443/api/presence/'), presenceUrl.replace('d392169fdeb68a8e', '../resources')]) expect(() => nxapiPresenceId(url)).toThrow()
  for (const url of [profileUrl+'?token=x',profileUrl+'/',profileUrl.replace('/profile/','/api/'),profileUrl.replace('.uk/', '.uk.evil.test/'), 'https://127.0.0.1/profile/'+profileId]) expect(() => nxapiProfileId(url)).toThrow()
 })
 it('maps seconds without creating a game, hours or history while offline', () => {
  const result = normalizeNxapiPresence({friend:{name:'Prueba',imageUri:'javascript:alert(1)',presence:{state:'OFFLINE',updatedAt:1792248460,logoutAt:1792248460,game:{}}},title:null})
  expect(result.presence.state).toBe('offline');expect(result.presence.currentGame).toBeNull();expect(result.presence.lastGame).toBeNull()
  expect(result.presence.updatedAt).toBe(new Date(1792248460000).toISOString());expect(result.playtime).toBeNull();expect(result.history).toBeNull();expect(result.avatarUrl).toBe('')
 })
 it('maps online and playing states only when a named game is supplied', () => {
  const result = normalizeNxapiPresence({friend:{name:'Prueba',presence:{state:'PLAYING',game:{name:'Juego',imageUri:'https://example.com/cover.jpg'}}}})
  expect(result.presence.currentGame.title).toBe('Juego');expect(result.presence.lastGame).toBeNull();expect(result.presence.updatedAt).toBeNull()
  expect(() => normalizeNxapiPresence({})).toThrow()
 })
 it('reads structured public JSON without evaluating HTML', () => {
  const state = {['profile_id_'+profileId]:{profile:{id:profileId,name:'Prueba',recent_titles:[game],most_played_titles:[game]}}}
  const result = parseNxapiPublicProfile('<script type="application/json" id="state">'+JSON.stringify(state)+'</script><script>throw Error()</script>',profileId)
  expect(result.playtime).toEqual([{gameId:game.id,minutes:79029,source:'nxapi-public-profile'}]);expect(result.featuredGames).toHaveLength(1)
  expect(result.library).toBeNull();expect(result.history[0].at).toBe(game.last_played_at)
  expect(result.presence.state).toBe('unknown');expect(result.presence.lastGame.title).toBe(game.name)
  expect(() => parseNxapiPublicProfile('<h2>Prueba</h2>',profileId)).toThrow()
  expect(() => parseNxapiPublicProfile('<script id="state" type="application/json">{}</script>',profileId)).toThrow()
 })
 it('limits public highlights and ignores invalid times and dates', () => {
  const result=normalizeNxapiPublicProfile({name:'Prueba',recent_titles:[{...game,last_played_at:'yesterday',total_play_time:-1}],most_played_titles:[{...game,total_play_time:-1}]})
  expect(result.history).toEqual([]);expect(result.playtime).toEqual([]);expect(result.presence.updatedAt).toBeNull()
 })
 it('combines independent sources without replacing live presence or inventing a library', () => {
  const live=normalizeNxapiPresence({friend:{name:'Presencia',presence:{state:'ONLINE',game:{name:'Juego actual'}}}})
  const profile=normalizeNxapiPublicProfile({name:'Perfil',recent_titles:[game],most_played_titles:[game]})
  const combined=combineNintendoSources(live,profile)
  expect(combined.presence.currentGame.title).toBe('Juego actual');expect(combined.playtime).toEqual(profile.playtime);expect(combined.library).toBeNull()
  expect(combineNintendoSources(null,profile)).toEqual(profile);expect(combineNintendoSources(live,null).history).toBeNull();expect(combineNintendoSources(null,null)).toBeNull()
 })
})
