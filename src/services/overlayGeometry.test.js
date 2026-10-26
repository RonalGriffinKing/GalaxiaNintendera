import { describe, expect, it } from 'vitest'
import { resizeCorner, snapAxis } from './overlayGeometry'

describe('overlay snapping', () => {
  it('aligns the center and reports its guide', () => {
    expect(snapAxis(392, 200, [500], 10, 800)).toEqual({ position: 400, guide: 500 })
  })
  it('chooses the closest edge without leaving the canvas', () => {
    expect(snapAxis(3, 200, [-2, 0, 208], 10, 800)).toEqual({ position: 0, guide: 0 })
    expect(snapAxis(50, 200, [500], 10, 800)).toEqual({ position: 50, guide: null })
  })
})
describe('proportional corner resizing', () => {
  const box = { x: 100, y: 100, width: 400, height: 200, scale: 1 }
  it('grows from the bottom right while preserving its anchor', () => {
    expect(resizeCorner({ ...box, corner: 'se' }, 200, 100, 1920, 1080)).toEqual({ x: 100, y: 100, scale: 1.5 })
  })
  it('keeps the opposite corner fixed when resizing from the top left', () => {
    expect(resizeCorner({ ...box, corner: 'nw' }, 200, 100, 1920, 1080)).toEqual({ x: 300, y: 200, scale: .5 })
  })
  it('limits growth to the canvas and prevents inversion', () => {
    const result = resizeCorner({ ...box, corner: 'nw' }, -2000, -2000, 1920, 1080)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
    expect(resizeCorner({ ...box, corner: 'se' }, -2000, -2000, 1920, 1080).scale).toBe(.1)
  })
})
