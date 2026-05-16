export const playPublishSound = () => {
  if (typeof window === 'undefined') return

  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  try {
    const context = new AudioContext()
    const start = context.currentTime
    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, start)
    master.gain.exponentialRampToValueAtTime(0.16, start + 0.03)
    master.gain.exponentialRampToValueAtTime(0.0001, start + 0.46)
    master.connect(context.destination)

    const notes = [523.25, 659.25, 783.99]
    notes.forEach((frequency, index) => {
      const noteStart = start + index * 0.055
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.24, noteStart + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22)

      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + 0.24)
    })

    context.resume?.()
    window.setTimeout(() => context.close?.(), 650)
  } catch (error) {
    console.warn('Publish sound could not play', error)
  }
}
