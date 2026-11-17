import { describe, it, expect } from 'vitest'
import { nowPlayingCard, nowPlayingSettings, eventNowPlayingCard, eventStartInfo, overlayNowPlayingCard, selectNowPlayingEvents } from './nowPlaying'
const game = { id: '1', title: 'Juego de prueba' }
const identity = (platform, presence, extra = {}) => ({ platform, connectionState: 'connected', visibility: 'public', presence, ...extra })

describe('event overlay fallback', () => {
 const now = Date.parse('2026-11-13T19:00:00Z')
 const old = { id:'old', game:{nameEs:'Juego anterior'}, description:'Una aventura', startsAt:now-86400000, durationMinutes:60 }
 const older = {...old,id:'older',startsAt:now-172800000}
 const current = {...old,id:'current',startsAt:now-1800000}
 const future = {...old,id:'future',startsAt:now+86400000}
 const settings = nowPlayingSettings({source:'event',eventId:'old'})
 const live = identity('nintendo',{state:'online',currentGame:game})
 it('uses an ongoing event or the nearest upcoming event and retains its date', () => {
  expect(overlayNowPlayingCard([old,current,future],[live],settings,now).game.id).toBe('event:current')
  expect(overlayNowPlayingCard([old,future],[],settings,now).eventStartsAt).toBe(future.startsAt)
 })
 it('uses the detected Switch game when events have expired, without event details', () => {
  const card = overlayNowPlayingCard([old],[live],settings,now)
  expect(card.game).toEqual(game)
  expect(card.eventDescription).toBeUndefined()
  expect(card.eventStartsAt).toBeUndefined()
 })
 it('reuses the latest past event without a date when there is no live game', () => {
  const card = overlayNowPlayingCard([older,old],[],settings,now)
  expect(card.game.title).toBe('Juego anterior')
  expect(card.eventDescription).toBe('Una aventura')
  expect(card.eventStartsAt).toBeNull()
  expect(old.startsAt).toBe(now-86400000)
 })
 it('detects expiry at the end of the duration without reloading event data', () => {
  const end = current.startsAt+3600000
  expect(overlayNowPlayingCard([current],[],settings,end-1).eventStartsAt).toBe(current.startsAt)
  expect(overlayNowPlayingCard([current],[],settings,end).eventStartsAt).toBeNull()
 })
 it('falls back to live play even when there are no usable events', () => {
  expect(overlayNowPlayingCard([],[live],settings,now).game).toEqual(game)
  expect(overlayNowPlayingCard([{title:'Sin juego'}],[],settings,now)).toBeNull()
  expect(overlayNowPlayingCard([old],[{...live,visibility:'private'}],settings,now).game.id).toBe('event:old')
 })
 it('keeps the chosen valid event and ignores invalid dates for scheduling', () => {
  expect(selectNowPlayingEvents([current,future],future.id,now).active.id).toBe(future.id)
  expect(selectNowPlayingEvents([{...old,startsAt:'bad'}],'',now).active).toBeNull()
 })
 it('keeps the event artwork for the same detected game without losing live platform or stats', () => {
  const event={...old,game:{nameEs:'The Legend of Zelda: Ocarina of Time Remake'},backgroundUrl:'https://example.com/event.jpg'}
  const nintendo=identity('nintendo',{state:'online',currentGame:{id:'zelda',title:'The Legend of Zelda: Ocarina of Time',imageUrl:'https://example.com/switch.jpg'}})
  const card=overlayNowPlayingCard([event],[nintendo],settings,now)
  expect(card.game.imageUrl).toBe(event.backgroundUrl)
  expect(card.game.id).toBe('zelda')
  expect(card).toMatchObject({playing:true,platform:'nintendo',contentSource:'console',coverSource:'event'})
  expect(overlayNowPlayingCard([event],[],settings,now).game.imageUrl).toBe(card.game.imageUrl)
 })
 it('never reuses the previous event artwork for a different game', () => {
  const event={...old,game:{nameEn:'Zelda: Breath of the Wild'},backgroundUrl:'https://example.com/event.jpg'}
  const playing=identity('nintendo',{state:'online',currentGame:{id:'totk',title:'Zelda: Tears of the Kingdom',imageUrl:'https://example.com/new.jpg'}})
  expect(overlayNowPlayingCard([event],[playing],settings,now)).toMatchObject({game:{imageUrl:'https://example.com/new.jpg'},coverSource:'console'})
 })
})
describe('OBS now-playing presentation', () => {
  it('changes image presentation independently of theme and keeps old widgets on lateral covers', () => {
    expect(nowPlayingSettings().imageMode).toBe('cover')
    expect(nowPlayingSettings({imageMode:'invalid'}).imageMode).toBe('cover')
    const value=nowPlayingSettings({theme:'zelda',imageMode:'background',coverZoom:130,coverPositionX:75})
    expect(value).toMatchObject({theme:'zelda',imageMode:'background',coverZoom:130,coverPositionX:75})
    expect(nowPlayingSettings({...value,imageMode:'cover'})).toMatchObject({theme:'zelda',imageMode:'cover',coverZoom:130,coverPositionX:75})
  })
  it('supports activity titles and preserves the legacy default', () => {
    for (const label of ['Hoy jugamos', 'Hoy reaccionamos', 'Hoy vemos']) expect(nowPlayingSettings({ label }).label).toBe(label)
    for (const label of [undefined, null, '', 'invalid', {}]) expect(nowPlayingSettings({ label }).label).toBe('Hoy jugamos')
  })
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
