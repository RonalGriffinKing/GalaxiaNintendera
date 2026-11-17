// Only visibility timers live here; replaying never fetches platform data.
export function createNowPlayingPlayback({ timing, canShow, onShow, onHide }) {
  let hideTimer, repeatTimer, enterTimer, shown = false, hiddenAt = -Infinity
  function clearTimers() {
    clearTimeout(hideTimer); clearTimeout(repeatTimer); clearTimeout(enterTimer)
  }
  function hide() {
    if (!shown) return
    shown = false
    hiddenAt = Date.now()
    onHide()
  }
  function play() {
    clearTimers()
    hide()
    if (!canShow()) return
    const wait = Math.max(0, hiddenAt + timing().leave + 16 - Date.now())
    const enter = () => {
      if (!canShow()) return
      shown = true
      onShow()
      const cycle = timing()
      hideTimer = setTimeout(hide, cycle.hideAfter)
      repeatTimer = setTimeout(play, cycle.repeatAfter)
    }
    if (wait) enterTimer = setTimeout(enter, wait)
    else enter()
  }
  function stop() { clearTimers(); hide() }
  return { play, stop, dispose: stop }
}
