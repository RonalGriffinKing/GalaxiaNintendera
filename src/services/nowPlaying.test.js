import { describe, it, expect } from 'vitest'
import { nowPlayingCard, nowPlayingSettings, eventNowPlayingCard, eventStartInfo } from './nowPlaying'
const game = { id: '1', title: 'Juego de prueba' }
const identity = (platform, presence, extra = {}) => ({ platform, connectionState: 'connected', visibility: 'public', presence, ...extra })
describe('OBS now-playing presentation', () => {
  it('provides bounded event descriptions and valid start times without using the event title',()=>{
    const event={title:'Título del directo',game:{nameEs:'Roco Kingdom'},description:'  Probamos\n la beta cerrada.  ',startsAt:'2026-10-27T17:00:00Z'}
    const card=eventNowPlayingCard(event,'e1')
    expect(card.eventDescription).toBe('Probamos la beta cerrada.')
    expect(card.eventStartsAt).toBe(Date.parse(event.startsAt))
    expect(eventStartInfo(card.eventStartsAt).label).toContain('18:00')
    expect(eventStartInfo(card.eventStartsAt,'Atlantic/Canary').label).toContain('17:00')
    expect(eventStartInfo({seconds:card.eventStartsAt/1000},'UTC').iso).toBe(event.startsAt.replace('Z','.000Z'))
    expect(eventNowPlayingCard({...event,description:'x'.repeat(1000)},'e1').eventDescription).toHaveLength(300)
    for(const value of [null,undefined,'bad',{},Infinity])expect(eventStartInfo(value)).toBeNull()
  })
  it('can hide event details and increases available height for larger event text',()=>{
    const defaults=nowPlayingSettings({source:'event'})
    expect(defaults).toMatchObject({eventShowDescription:true,eventShowStart:true,eventTimeZone:'Europe/Madrid'})
    expect(nowPlayingSettings({source:'event',eventTimeZone:'invalid'}).eventTimeZone).toBe('Europe/Madrid')
    expect(nowPlayingSettings({source:'event',titleSize:32,statsSize:24}).height).toBeGreaterThan(defaults.height)
    expect(nowPlayingSettings({source:'event',eventShowDescription:false,eventShowStart:false})).toMatchObject({eventShowDescription:false,eventShowStart:false})
  })
  it('selects the last game independently of the active game and keeps legacy settings',()=>{
    const old={id:'older',title:'Último juego'},active={id:'active',title:'Partida activa'}
    const values=[identity('xbox',{state:'online',currentGame:active,lastGame:old})]
    expect(nowPlayingCard(values,nowPlayingSettings({source:'last'})).game).toEqual(old)
    expect(nowPlayingCard(values,nowPlayingSettings({source:'auto'})).game).toEqual(active)
    expect(nowPlayingSettings({showLastGame:true})).toMatchObject({source:'auto',showLastGame:true})
    expect(nowPlayingSettings({source:'invalid',eventId:'../private'})).toMatchObject({source:'auto',eventId:''})
  })
  it('renders the event game, never the event title or unrelated platform statistics',()=>{
    const event={title:'Un directo especial',game:{nameEs:'Juego del evento',nameEn:'Event game'},backgroundUrl:'https://example.com/cover.jpg',stats:[{text:'fake'}]}
    const card=eventNowPlayingCard(event,'event-1')
    expect(card.game).toEqual({id:'event:event-1',title:'Juego del evento',imageUrl:event.backgroundUrl})
    expect(card.stats).toEqual([]);expect(card.platformLabel).toBe('')
    expect(nowPlayingCard([identity('xbox',{state:'online',currentGame:game})],nowPlayingSettings({source:'event'}))).toBeNull()
    expect(eventNowPlayingCard(null,'gone')).toBeNull()
    expect(eventNowPlayingCard({title:'No es el juego'},'id')).toBeNull()
    expect(eventNowPlayingCard({game:{nameEn:'English only'},backgroundUrl:'javascript:alert(1)'},'id').game).toMatchObject({title:'English only',imageUrl:''})
  })
  it('hides offline and online-without-game states unless the last-game option is enabled', () => {
    for (const state of ['online', 'offline', 'unknown']) {
      const values = [identity('xbox', { state, currentGame: null, lastGame: game })]
      expect(nowPlayingCard(values, nowPlayingSettings())).toBeNull()
      expect(nowPlayingCard(values, nowPlayingSettings({ showLastGame: true })).playing).toBe(false)
    }
  })
  it('prefers active games and respects platform selection and privacy', () => {
    const values = [identity('nintendo', { state: 'offline', lastGame: game }), identity('xbox', { state: 'online', currentGame: game })]
    expect(nowPlayingCard(values, nowPlayingSettings({ showLastGame: true })).platform).toBe('xbox')
    expect(nowPlayingCard(values, nowPlayingSettings({ platform: 'nintendo' }))).toBeNull()
    expect(nowPlayingCard([{ ...values[1], visibility: 'private' }], nowPlayingSettings())).toBeNull()
    expect(nowPlayingCard([{ ...values[1], connectionState: 'disconnected' }], nowPlayingSettings())).toBeNull()
  })
  it('uses only hours for the matching game with a real source', () => {
    const value = identity('nintendo', { state: 'online', currentGame: game }, { playtime: [{ gameId: 'other', minutes: 999, source: 'nxapi' }, { gameId: '1', minutes: 125, source: 'nxapi' }] })
    expect(nowPlayingCard([value], nowPlayingSettings()).stats[0].text).toBe('2 h 5 min')
    value.playtime[1].source = ''
    expect(nowPlayingCard([value], nowPlayingSettings()).stats).toEqual([])
  })
  it('uses per-game Xbox summaries without inventing achievement totals', () => {
    const value = identity('xbox', { state: 'online', currentGame: game }, { gameAchievements: [{ game, unlocked: 6, total: null, gamerscore: 270, totalGamerscore: 1000 }] })
    expect(nowPlayingCard([value], nowPlayingSettings()).stats.map(stat => stat.text)).toEqual(['6 logros', '270/1000 G'])
    value.gameAchievements[0].game = { id: 'different' }
    expect(nowPlayingCard([value], nowPlayingSettings()).stats).toEqual([])
  })
  it('grows the card when fonts are enlarged and keeps older saved widgets compatible', () => {
    expect(nowPlayingSettings().labelSize).toBe(12)
    const value = nowPlayingSettings({ labelSize: 24, titleSize: 32, statsSize: 24, platformSize: 20, height: 172 })
    expect(value.height).toBeGreaterThan(250)
    expect(nowPlayingSettings({ labelSize: 999 }).labelSize).toBe(24)
  })
  it('keeps the chosen Xbox console separate from provider data and bounds cover size', () => {
    const value = identity('xbox', { state: 'online', currentGame: game })
    expect(nowPlayingCard([value], nowPlayingSettings({ xboxPlatform: 'Xbox Series' })).platformLabel).toBe('Xbox Series')
    expect(nowPlayingSettings({ xboxPlatform: 'anything' }).xboxPlatform).toBe('Xbox')
    const nintendo = identity('nintendo', { state: 'online', currentGame: game, platformLabel: 'Nintendo Switch 2' })
    expect(nowPlayingCard([nintendo], nowPlayingSettings()).platformLabel).toBe('Nintendo Switch 2')
    expect(nowPlayingCard([nintendo], nowPlayingSettings({ nintendoPlatform: 'Nintendo Switch' })).platformLabel).toBe('Nintendo Switch')
    expect(nowPlayingCard([nintendo], nowPlayingSettings({ nintendoPlatform: 'Nintendo Switch 2' })).platformLabel).toBe('Nintendo Switch 2')
    expect(nowPlayingSettings({ coverWidth: 120 }).height).toBeGreaterThan(nowPlayingSettings().height)
    expect(nowPlayingSettings({ width: 320, coverWidth: 120 }).coverWidth).toBeLessThan(80)
  })
  it('bounds animation settings and sizes even for malformed saved input', () => {
    const value = nowPlayingSettings({ visibleSeconds: 1000, repeatSeconds: 1, width: -30, height: Infinity, direction: 'bad', platform: 'steam' })
    expect(value).toMatchObject({ visibleSeconds: 60, repeatSeconds: 65, width: 320, height: 172, direction: 'left', platform: 'auto' })
  })
})
