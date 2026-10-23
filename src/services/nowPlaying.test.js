import { describe, it, expect } from 'vitest'
import { nowPlayingCard, nowPlayingSettings } from './nowPlaying'
const game = { id: '1', title: 'Juego de prueba' }
const identity = (platform, presence, extra = {}) => ({ platform, connectionState: 'connected', visibility: 'public', presence, ...extra })
describe('OBS now-playing presentation', () => {
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
