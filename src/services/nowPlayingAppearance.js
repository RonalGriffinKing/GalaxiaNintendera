export const NOW_PLAYING_APPEARANCES = [
  { id: 'original', label: 'Original' },
  { id: 'emerald', label: 'Esmeralda de Hyrule' },
  { id: 'crystal', label: 'Cristal de Hyrule' },
  { id: 'holographic', label: 'Holográfico' },
  { id: 'custom', label: 'Personalizado' }
]
export const NOW_PLAYING_BORDERS = [
  { id: 'original', label: 'Del estilo' }, { id: 'none', label: 'Sin borde' },
  { id: 'solid', label: 'Sólido' }, { id: 'gradient', label: 'Degradado' },
  { id: 'glow', label: 'Luminoso estático' }, { id: 'travel', label: 'Luz en movimiento' },
  { id: 'holographic', label: 'Reflejo holográfico' }
]
export const NOW_PLAYING_ENTRIES = [
  { id: 'classic', label: 'Clásica' }, { id: 'slide', label: 'Deslizamiento' },
  { id: 'crystal', label: 'Cristal mágico' }, { id: 'triforce', label: 'Trifuerza mágica' }
]
export const NOW_PLAYING_EXITS = [
  { id: 'classic', label: 'Clásica (actual)' }, { id: 'fade', label: 'Desvanecimiento' },
  { id: 'slide', label: 'Deslizamiento' }, { id: 'collapse', label: 'Contracción al centro' },
  { id: 'triforce', label: 'Cierre mágico con Trifuerza' }
]
export const NOW_PLAYING_VISUAL_DEFAULTS = Object.freeze({
  appearance: 'original', borderMode: 'original', borderWidth: 1.5, cornerRadius: 24,
  primaryColor: '#075942', secondaryColor: '#d9b959', panelOpacity: .88,
  blurIntensity: 10, glowIntensity: .4, effectIntensity: .45, effectSpeed: 8,
  effectsEnabled: true, animatedGlow: true, reflections: true, allowOverflow: false,
  animationsEnabled: true, entryAnimation: 'classic', exitAnimation: 'classic',
  animationDuration: .65, exitDuration: .5, elementDelay: .07
})
const choose = (value, options, fallback) => options.some(option => option.id === value) ? value : fallback
const bounded = (value, fallback, min, max) => value !== null && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback
const hex = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
export function nowPlayingVisualSettings(data = {}) {
  const d = NOW_PLAYING_VISUAL_DEFAULTS
  return {
    appearance: choose(data.appearance, NOW_PLAYING_APPEARANCES, d.appearance),
    borderMode: choose(data.borderMode, NOW_PLAYING_BORDERS, d.borderMode),
    entryAnimation: choose(data.entryAnimation, NOW_PLAYING_ENTRIES, d.entryAnimation),
    exitAnimation: choose(data.exitAnimation, NOW_PLAYING_EXITS, d.exitAnimation),
    primaryColor: hex(data.primaryColor, d.primaryColor), secondaryColor: hex(data.secondaryColor, d.secondaryColor),
    borderWidth: bounded(data.borderWidth, d.borderWidth, .5, 5),
    cornerRadius: bounded(data.cornerRadius, d.cornerRadius, 0, 48),
    panelOpacity: bounded(data.panelOpacity, d.panelOpacity, .1, 1),
    blurIntensity: bounded(data.blurIntensity, d.blurIntensity, 0, 24),
    glowIntensity: bounded(data.glowIntensity, d.glowIntensity, 0, 1),
    effectIntensity: bounded(data.effectIntensity, d.effectIntensity, 0, 1),
    effectSpeed: bounded(data.effectSpeed, d.effectSpeed, 3, 30),
    animationDuration: bounded(data.animationDuration, d.animationDuration, .3, 3),
    exitDuration: bounded(data.exitDuration, d.exitDuration, .2, 2),
    elementDelay: bounded(data.elementDelay, d.elementDelay, 0, .2),
    effectsEnabled: data.effectsEnabled !== false, animatedGlow: data.animatedGlow !== false,
    reflections: data.reflections !== false, allowOverflow: data.allowOverflow === true,
    animationsEnabled: data.animationsEnabled !== false
  }
}

export function nowPlayingAppearance(settings) {
  const palettes = {
    emerald: ['#063c2e', '#e7c569', '#031c17', '#fff4d2'],
    crystal: ['#278e82', '#a3eee0', '#0a222b', '#efffff'],
    holographic: ['#7755d9', '#74e8f0', '#11112b', '#f3efff'],
    custom: [settings.primaryColor, settings.secondaryColor, '#0b141b', '#fffaf0'],
    original: settings.theme === 'zelda' ? ['#173c2d', '#f5ce69', '#081e16', '#fff3ce']
      : settings.theme === 'halloween' ? ['#713394', '#ffc080', '#1c102b', '#fff1db']
        : ['#5b3291', '#cfb2ff', '#11102b', '#f1e7ff']
  }
  const [primary, accent, base, ink] = palettes[settings.appearance] || palettes.original
  const border = settings.borderMode === 'original'
    ? ({ original: 'original', emerald: 'travel', crystal: 'glow', holographic: 'holographic', custom: 'gradient' }[settings.appearance])
    : settings.borderMode
  return { primary, accent, base, ink, border }
}

export function nowPlayingTiming(settings, reducedMotion = false) {
  const motion = settings.animationsEnabled && !reducedMotion
  const enter = motion ? Math.round(settings.animationDuration * 1000) : 0
  const leave = motion ? Math.round(settings.exitDuration * 1000) : 0
  const visible = settings.visibleSeconds * 1000
  return { enter, leave, hideAfter: enter + visible, repeatAfter: Math.max(settings.repeatSeconds * 1000, enter + visible + leave + 1000) }
}
