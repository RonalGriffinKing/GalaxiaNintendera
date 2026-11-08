export const CAMERA_FRAME_THEMES = Object.freeze([
  { id: 'galaxy', label: 'Galaxia', primary: '#a855f7', secondary: '#ec4899', ink: '#f5eaff', surface: '#17102f' },
  { id: 'minimal', label: 'Minimalista', primary: '#ffffff', secondary: '#cbd5e1', ink: '#ffffff', surface: '#111827' },
  { id: 'zelda', label: 'Zelda · Trifuerza', primary: '#e8bd55', secondary: '#fff0af', ink: '#fff3ce', surface: '#0b241b' },
  { id: 'nebula', label: 'Nebulosa', primary: '#22d3ee', secondary: '#3b82f6', ink: '#ecfeff', surface: '#071a3d' },
  { id: 'solar', label: 'Solar', primary: '#fb7185', secondary: '#fbbf24', ink: '#fff7ed', surface: '#4c1727' },
  { id: 'halloween', label: 'Halloween', primary: '#ff973e', secondary: '#a855f7', ink: '#fff1dc', surface: '#1c102b' }
])
export const CAMERA_FRAME_FORMATS = Object.freeze([
  { id: 'wide', label: 'Horizontal · 16:9', ratio: 16 / 9 },
  { id: 'classic', label: 'Clásico · 4:3', ratio: 4 / 3 },
  { id: 'square', label: 'Cuadrado · 1:1', ratio: 1 },
  { id: 'portrait', label: 'Vertical · 9:16', ratio: 9 / 16 }
])
export const CAMERA_FRAME_DEFAULTS = Object.freeze({ theme: 'galaxy', width: 480, height: 270, borderWidth: 5, radius: 20, glow: 12, animated: true, decorations: true, iconSize: 48, speed: 6, particleCount: 14, energy: true, waves: true, showLabel: false, label: 'EN DIRECTO' })
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback
export function cameraFrameSettings(data = {}) {
  const theme = CAMERA_FRAME_THEMES.find(item => item.id === data.theme) || CAMERA_FRAME_THEMES[0]
  return {
    mode: ['frame', 'background', 'both'].includes(data.mode) ? data.mode : 'frame',
    borderStyle: ['single', 'double', 'corners'].includes(data.borderStyle) ? data.borderStyle : 'single',
    backgroundBrightness: bounded(data.backgroundBrightness, 100, 30, 150),
    theme,
    width: bounded(data.width, 480, 160, 1600),
    height: bounded(data.height, 270, 120, 1600),
    borderWidth: bounded(data.borderWidth, 5, 1, 16),
    radius: bounded(data.radius, 20, 0, 80),
    glow: bounded(data.glow, 12, 0, 30),
    iconSize: bounded(data.iconSize, 48, 24, 96),
    speed: bounded(data.speed, 6, 2, 16),
    particleCount: Math.round(bounded(data.particleCount, 14, 0, 24)),
    energy: data.energy !== false,
    waves: data.waves !== false,
    animated: data.animated !== false,
    decorations: data.decorations !== false,
    showIcon: typeof data.showIcon === 'boolean' ? data.showIcon : !['background', 'both'].includes(data.mode),
    showLabel: data.showLabel === true,
    label: typeof data.label === 'string' ? data.label.trim().slice(0, 60) : 'EN DIRECTO'
  }
}
