import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import PublicNavigationLink from './PublicNavigationLink.vue'
import { isPlainNavigationClick } from './publicNavigation'
import { notificationPosition } from './notificationPosition'
import { createPublicPanelLifecycle } from '../../composables/publicPanelLifecycle'

describe('public navigation', () => {
  it('exposes the unchanged native destination and current page', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(PublicNavigationLink, { to: '/login?mode=register', active: true }, () => 'Unete') }))
    expect(html).toContain('href="/login?mode=register"')
    expect(html).toContain('aria-current="page"')
    expect(html).not.toContain('role="menuitem"')
  })
  it('leaves modified, middle and previously handled clicks to the browser', () => {
    const click = { button: 0, defaultPrevented: false }
    expect(isPlainNavigationClick(click)).toBe(true)
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'defaultPrevented']) expect(isPlainNavigationClick({ ...click, [modifier]: true })).toBe(false)
    expect(isPlainNavigationClick({ ...click, button: 1 })).toBe(false)
  })
  it.each([320, 390, 768, 1440])('bounds notification panels at width %i, including low heights', width => {
    for (const height of [240, 360, 720, 900]) {
      const result = notificationPosition(width, height, { bottom: 65, right: width - 20 })
      expect(parseFloat(result.top)).toBeGreaterThanOrEqual(16)
      expect(parseFloat(result.top) + parseFloat(result.maxHeight)).toBeLessThanOrEqual(height - 16)
    }
  })
})

function fixture() {
  const document = { activeElement: null, body: {}, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const control = () => ({ tabIndex: 0, isConnected: true, matches: () => false, getClientRects: () => [{}], focus() { document.activeElement = this }, contains(target) { return target === this } })
  const first = control(), last = control(), opener = control(), outside = control()
  const panel = { ownerDocument: document, querySelectorAll: () => [first, last], contains: target => [first, last, panel].includes(target), focus() { document.activeElement = this }, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const requestClose = vi.fn(), trap = vi.fn(() => true)
  const lifecycle = createPublicPanelLifecycle(panel, { opener, requestClose, trap })
  return { document, first, last, opener, outside, panel, requestClose, trap, lifecycle }
}
describe('public panel keyboard lifecycle', () => {
  it('focuses the first control and returns focus on Escape/close', () => {
    const f = fixture(); f.lifecycle.open(); expect(f.document.activeElement).toBe(f.first)
    const preventDefault = vi.fn(); f.lifecycle.keydown({ key: 'Escape', preventDefault }); expect(f.requestClose).toHaveBeenCalledOnce()
    f.lifecycle.close(); expect(f.document.activeElement).toBe(f.opener)
    expect(f.document.removeEventListener).toHaveBeenCalledWith('pointerdown', f.lifecycle.outside)
  })
  it('cycles Tab in modal public sheets and preserves normal Tab in desktop disclosures', () => {
    const f = fixture(), preventDefault = vi.fn(); f.lifecycle.open(); f.document.activeElement = f.last
    f.lifecycle.keydown({ key: 'Tab', preventDefault }); expect(f.document.activeElement).toBe(f.first)
    f.lifecycle.keydown({ key: 'Tab', shiftKey: true, preventDefault }); expect(f.document.activeElement).toBe(f.last)
    f.trap.mockReturnValue(false); preventDefault.mockClear(); f.lifecycle.keydown({ key: 'Tab', preventDefault }); expect(preventDefault).not.toHaveBeenCalled()
  })
  it('does not steal focus when switching triggers or closing outside', () => {
    const f = fixture(); f.lifecycle.open(); f.document.activeElement = f.outside
    f.lifecycle.outside({ target: f.opener }); expect(f.requestClose).not.toHaveBeenCalled()
    f.lifecycle.outside({ target: f.outside }); expect(f.requestClose).toHaveBeenCalledOnce()
    f.lifecycle.close(); expect(f.document.activeElement).toBe(f.outside)
  })
  it('ignores keys outside the panel and closes when desktop focus leaves', () => {
    const f = fixture(); f.document.activeElement = f.outside
    f.lifecycle.keydown({ key: 'Escape', preventDefault: vi.fn() }); expect(f.requestClose).not.toHaveBeenCalled()
    f.trap.mockReturnValue(false); f.lifecycle.leave({ relatedTarget: f.outside }); expect(f.requestClose).toHaveBeenCalledOnce()
  })
  it('does not restore the opener during focusout before the browser assigns the next target', () => {
    const f = fixture(); f.lifecycle.open(); f.trap.mockReturnValue(false)
    f.opener.focus = vi.fn(); f.requestClose.mockImplementation(f.lifecycle.close)
    f.lifecycle.leave({ relatedTarget: f.outside })
    expect(f.opener.focus).not.toHaveBeenCalled()
  })
  it('returns focus to a surviving trigger after a menu option opens a confirmation', () => {
    const f = fixture(); f.opener.isConnected = false
    const lifecycle = createPublicPanelLifecycle(f.panel, { opener: f.opener, fallbackFocus: () => f.outside, requestClose: f.requestClose })
    lifecycle.open(); lifecycle.close(); expect(f.document.activeElement).toBe(f.outside)
  })
  it('uses the visible trigger when the opener was hidden by a responsive breakpoint', () => {
    const f = fixture(); f.opener.getClientRects = () => []
    const lifecycle = createPublicPanelLifecycle(f.panel, { opener: f.opener, fallbackFocus: () => f.outside, requestClose: f.requestClose })
    lifecycle.open(); lifecycle.close(); expect(f.document.activeElement).toBe(f.outside)
  })
  it('re-establishes focus in the panel when its first control is hidden on resize', () => {
    const f = fixture(); f.first.getClientRects = () => []
    f.lifecycle.focusInitial(); expect(f.document.activeElement).toBe(f.last)
  })
})
