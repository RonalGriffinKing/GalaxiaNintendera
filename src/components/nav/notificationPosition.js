// Geometry only: keep the whole panel inside the viewport, including its header.
export function notificationPosition(width, height, anchor, { margin = 16, gap = 8, controlHeight = 44 } = {}) {
  const mobile = width <= 859
  // Two control rows, padding and a gap remain reachable in a low viewport.
  const minimumRoom = 2 * controlHeight + 4 * margin + gap
  const top = Math.min(Math.max(mobile ? 88 : 72, (anchor?.bottom || 64) + 12), Math.max(margin, height - minimumRoom))
  const right = Math.max(margin, anchor ? width - anchor.right : margin)
  const alignLeft = width - right - 360 < margin
  return {
    top: `${top}px`,
    left: mobile ? '50%' : alignLeft ? `${margin}px` : 'auto',
    right: mobile || alignLeft ? 'auto' : `${right}px`,
    width: mobile ? '92vw' : '360px',
    maxHeight: `${Math.max(0, height - top - margin)}px`,
    align: mobile || alignLeft ? 'left' : 'right'
  }
}
