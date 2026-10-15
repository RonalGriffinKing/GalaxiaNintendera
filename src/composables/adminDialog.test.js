import { describe, it, expect, vi } from 'vitest'
import { usePendingAction } from './usePendingAction'
import { createModalLifecycle } from './modalLifecycle'

describe('administrative pending actions', () => {
  it('prevents duplicate actions and releases after completion', async () => {
    const { pending, run } = usePendingAction()
    let resolve
    const action = vi.fn(() => new Promise(r => { resolve = r }))
    const first = run(action)
    expect(pending.value).toBe(true)
    await run(action)
    expect(action).toHaveBeenCalledTimes(1)
    resolve('done')
    expect(await first).toBe('done')
    expect(pending.value).toBe(false)
  })
  it('releases after failure so an action can be retried', async () => {
    const { pending, run } = usePendingAction()
    await expect(run(() => Promise.reject(new Error('failure')))).rejects.toThrow('failure')
    expect(pending.value).toBe(false)
    expect(await run(() => 'retry')).toBe('retry')
  })
})

function fixture(document) {
  const doc = document || { body: { style: { overflow: 'auto' } }, activeElement: { isConnected: true, focus: vi.fn() }, querySelector: vi.fn() }
  const controls = [0, 1].map(() => ({ focus: vi.fn(), matches: () => false, tabIndex: 0, getClientRects: () => [1] }))
  const dialog = { ownerDocument: doc, open: false, showModal() { this.open = true }, close() { this.open = false }, querySelector: () => controls[0], querySelectorAll: () => controls, getBoundingClientRect: () => ({ left: 10, right: 100, top: 10, bottom: 100 }), focus: vi.fn() }
  const requestClose = vi.fn()
  let busy = false
  const lifecycle = createModalLifecycle(dialog, { requestClose, isBusy: () => busy })
  return { doc, controls, dialog, requestClose, lifecycle, setBusy: value => { busy = value } }
}
describe('modal lifecycle', () => {
  it('focuses the initial control, restores focus and preserves nested scroll locks', () => {
    const a = fixture(); const b = fixture(a.doc); const opener = a.doc.activeElement
    a.lifecycle.open(); b.lifecycle.open()
    expect(a.controls[0].focus).toHaveBeenCalledOnce()
    expect(a.doc.body.style.overflow).toBe('hidden')
    a.lifecycle.close()
    expect(a.doc.body.style.overflow).toBe('hidden')
    b.lifecycle.dispose()
    expect(a.doc.body.style.overflow).toBe('auto')
    expect(opener.focus).toHaveBeenCalledTimes(2)
  })
  it('blocks Escape and backdrop cancellation while busy', () => {
    const f = fixture(); const event = { preventDefault: vi.fn() }
    f.setBusy(true); f.lifecycle.cancel(event)
    f.lifecycle.backdrop({ target: f.dialog, clientX: 0, clientY: 0 })
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(f.requestClose).not.toHaveBeenCalled()
    f.setBusy(false); f.lifecycle.cancel(event)
    f.lifecycle.backdrop({ target: f.dialog, clientX: 50, clientY: 50 })
    expect(f.requestClose).toHaveBeenCalledOnce()
  })
  it('cycles Tab and Shift+Tab at the dialog boundaries', () => {
    const f = fixture(); const event = { key: 'Tab', preventDefault: vi.fn(), shiftKey: false }
    f.doc.activeElement = f.controls[1]; f.lifecycle.keydown(event)
    expect(f.controls[0].focus).toHaveBeenCalledOnce()
    f.doc.activeElement = f.controls[0]; event.shiftKey = true; f.lifecycle.keydown(event)
    expect(f.controls[1].focus).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledTimes(2)
  })
})
