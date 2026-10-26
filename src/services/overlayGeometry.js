// All geometry uses canvas pixels; the editor converts pointer coordinates.
export function snapAxis(position, length, targets, threshold, max) {
  let distance = threshold, guide = null, result = position
  for (const target of targets) {
    for (const offset of [0, length / 2, length]) {
      const candidate = target - offset
      const delta = Math.abs(candidate - position)
      if (candidate >= 0 && candidate <= max && delta < distance) {
        distance = delta; result = candidate; guide = target
      }
    }
  }
  return { position: result, guide }
}

export function resizeCorner(box, dx, dy, canvasWidth, canvasHeight) {
  const west = box.corner.includes('w'), north = box.corner.includes('n')
  const anchorX = west ? box.x + box.width : box.x
  const anchorY = north ? box.y + box.height : box.y
  // Project the pointer onto the diagonal to preserve the widget's proportions.
  const change = ((west ? -dx : dx) * box.width + (north ? -dy : dy) * box.height) / (box.width ** 2 + box.height ** 2)
  const availableWidth = west ? anchorX : canvasWidth - anchorX
  const availableHeight = north ? anchorY : canvasHeight - anchorY
  const maximum = Math.min(5 / box.scale, availableWidth / box.width, availableHeight / box.height)
  const factor = Math.max(Math.min(.1 / box.scale, maximum), Math.min(maximum, 1 + change))
  return {
    x: west ? anchorX - box.width * factor : anchorX,
    y: north ? anchorY - box.height * factor : anchorY,
    scale: Math.max(.1, box.scale * factor)
  }
}
