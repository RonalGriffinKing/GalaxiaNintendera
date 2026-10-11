// Pure presentation helpers. No persistence, currency or reward mutations.
export const DEMO_MODES = Object.freeze([
  Object.freeze({ rarity: 'normal', label: 'Icono normal', price: 20 }),
  Object.freeze({ rarity: 'epic', label: 'Icono épico', price: 50 })
])

export function demoCandidates(icons, owned, rarity) {
  if (!DEMO_MODES.some(mode => mode.rarity === rarity)) return []
  const inventory = new Set(owned || [])
  const seen = new Set()
  return (icons || []).filter(icon => {
    const category = ['normal', 'rare', 'epic', 'legendary'].includes(icon.rarity)
      ? icon.rarity : icon.special ? 'epic' : 'normal'
    if (!icon.id || !icon.src || !(icon.local || icon.builtIn) || icon.visible === false || icon.archived || icon.active === false || category !== rarity || inventory.has(icon.id) || seen.has(icon.id)) return false
    seen.add(icon.id)
    return true
  })
}

// Presentation follows the same rarity fallback and custom border as profile icons.
export function rewardAppearance(icon = {}) {
  const rarity = ['normal', 'rare', 'epic', 'legendary'].includes(icon.rarity)
    ? icon.rarity : icon.special ? 'epic' : 'normal'
  const labels = { normal: 'Normal', rare: 'Raro', epic: 'Épico', legendary: 'Legendario' }
  const colors = { normal: '#a5efff', rare: '#3b82f6', epic: '#c026d3', legendary: '#f59e0b' }
  // The existing administration color picker stores hexadecimal colors.
  const custom = typeof icon.effectColor === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(icon.effectColor)
  return { rarity, label: labels[rarity], color: custom ? icon.effectColor : colors[rarity], special: Boolean(icon.special) || rarity === 'epic' || rarity === 'legendary' }
}
