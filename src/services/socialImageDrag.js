// Horizontal crop movement, bounded by the real image edges.
export function imagePanLimits({ width, height, naturalWidth, naturalHeight, scale = 100, cropX = 50 }) {
 if (!(width > 0 && height > 0 && naturalWidth > 0 && naturalHeight > 0)) return { min: 0, max: 0 }
 const cover = Math.max(width / naturalWidth, height / naturalHeight), contentWidth = naturalWidth * cover
 const zoom = Math.max(1, Number(scale) / 100 || 1), crop = Math.max(0, Math.min(100, Number(cropX) || 0)) / 100
 const left = (width - contentWidth) * crop * zoom + (1 - zoom) * width / 2
 return { min: (width - contentWidth * zoom - left) / width * 100, max: -left / width * 100 }
}
export function constrainImagePan(value, limits) { return Math.max(limits.min, Math.min(limits.max, Number(value) || 0)) }
export function imageDragOffset(start, dx, rect, limits) {
 const x = (Number(start.x) || 0) + (rect.width > 0 ? dx / rect.width * 100 : 0)
 return { x: constrainImagePan(x, limits), y: 0 }
}
