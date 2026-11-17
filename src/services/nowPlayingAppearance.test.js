import { describe, expect, it } from 'vitest'
import { nowPlayingSettings } from './nowPlaying'
import { nowPlayingAppearance, nowPlayingTiming, nowPlayingVisualSettings, NOW_PLAYING_APPEARANCES, NOW_PLAYING_BORDERS } from './nowPlayingAppearance'

describe('optional now-playing visuals', () => {
  it('keeps legacy widgets on the original design without changing geometry or content settings', () => {
    const old = { theme:'zelda', source:'event', eventId:'existing', width:559, height:236, coverZoom:140 }
    const settings = nowPlayingSettings(old)
    expect(settings).toMatchObject({ ...old, appearance:'original', entryAnimation:'classic', exitAnimation:'classic', animationsEnabled:true })
    expect(nowPlayingAppearance(settings).border).toBe('original')
    expect(old).not.toHaveProperty('appearance')
  })
  it('supports every style and border independently of the selected game image', () => {
    for (const appearance of NOW_PLAYING_APPEARANCES) for (const border of NOW_PLAYING_BORDERS) {
      const settings = nowPlayingSettings({appearance:appearance.id,borderMode:border.id,imageMode:'background'})
      expect(nowPlayingAppearance(settings).border).toBe(border.id==='original'?({original:'original',emerald:'travel',crystal:'glow',holographic:'holographic',custom:'gradient'})[appearance.id]:border.id)
      expect(settings.imageMode).toBe('background')
    }
  })
  it('sanitizes custom values and accepts zero intensity without accepting CSS injection', () => {
    const settings = nowPlayingVisualSettings({ appearance:'invalid', primaryColor:'url(secret)',secondaryColor:'#abcdef',blurIntensity:999,panelOpacity:-1,cornerRadius:Infinity,borderWidth:99,effectSpeed:0,glowIntensity:0,effectIntensity:0,entryAnimation:'bad',allowOverflow:'yes' })
    expect(settings).toMatchObject({ appearance:'original',primaryColor:'#075942',secondaryColor:'#abcdef',blurIntensity:24,panelOpacity:.1,cornerRadius:24,borderWidth:5,effectSpeed:3,glowIntensity:0,effectIntensity:0,entryAnimation:'classic',allowOverflow:false })
  })
  it('round-trips configuration through the existing JSON persistence format', () => {
    const raw = { appearance:'custom',primaryColor:'#225544',secondaryColor:'#ddcc88',entryAnimation:'triforce',exitAnimation:'collapse',animationDuration:1.8,exitDuration:.7,effectsEnabled:false,reflections:false,animationsEnabled:false }
    const saved = JSON.parse(JSON.stringify(raw))
    expect(nowPlayingSettings(saved)).toMatchObject(raw)
    expect(nowPlayingAppearance(nowPlayingSettings(saved))).toMatchObject({primary:raw.primaryColor,accent:raw.secondaryColor})
  })
  it('reserves the full entry, stay and exit before the next appearance', () => {
    const settings = nowPlayingSettings({animationDuration:3,exitDuration:2,visibleSeconds:5,repeatSeconds:10})
    expect(nowPlayingTiming(settings)).toEqual({enter:3000,leave:2000,hideAfter:8000,repeatAfter:11000})
    expect(nowPlayingTiming(settings,true)).toEqual({enter:0,leave:0,hideAfter:5000,repeatAfter:10000})
    expect(nowPlayingTiming({...settings,animationsEnabled:false}).enter).toBe(0)
  })
})
