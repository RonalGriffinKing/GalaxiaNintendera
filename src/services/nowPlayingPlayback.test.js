import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNowPlayingPlayback } from './nowPlayingPlayback'

describe('now-playing appearance cycle', () => {
  beforeEach(() => {vi.useFakeTimers();vi.setSystemTime(0)})
  afterEach(() => {vi.clearAllTimers();vi.useRealTimers()})
  const create = (extra = {}) => {
    const callbacks = {onShow:vi.fn(),onHide:vi.fn(),canShow:()=>true,timing:()=>({enter:1800,leave:1100,hideAfter:6800,repeatAfter:11000}),...extra}
    return { ...callbacks, player:createNowPlayingPlayback(callbacks) }
  }
  it('restarts the entrance on every automatic appearance and keeps the full visible duration', () => {
    const {player,onShow,onHide} = create()
    player.play();expect(onShow).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(6799);expect(onHide).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1);expect(onHide).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(4200);expect(onShow).toHaveBeenCalledTimes(2)
    player.dispose()
  })
  it('previews the whole cycle again even if replay is requested while visible', () => {
    const {player,onShow,onHide} = create()
    player.play();vi.advanceTimersByTime(500);player.play()
    expect(onHide).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1115);expect(onShow).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1);expect(onShow).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(6800);expect(onHide).toHaveBeenCalledTimes(2)
  })
  it('does not restart after being hidden in OBS, disabled or unmounted', () => {
    let enabled = true
    const {player,onShow} = create({canShow:()=>enabled})
    player.play();enabled=false;player.stop();vi.advanceTimersByTime(60000)
    expect(onShow).toHaveBeenCalledTimes(1)
    player.play();expect(onShow).toHaveBeenCalledTimes(1)
    enabled=true;player.play();expect(onShow).toHaveBeenCalledTimes(2)
    player.dispose();vi.advanceTimersByTime(60000);expect(onShow).toHaveBeenCalledTimes(2)
  })
  it('cancels delayed re-entry when the widget is disabled mid-exit', () => {
    const {player,onShow} = create()
    player.play();player.play();player.stop();vi.advanceTimersByTime(60000)
    expect(onShow).toHaveBeenCalledTimes(1)
  })
})
