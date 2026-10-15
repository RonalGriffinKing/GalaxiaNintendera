const locks = new WeakMap()

function lockScroll(document) {
  const body = document.body
  let state = locks.get(document)
  if (!state) {
    state = { count: 0, overflow: body.style.overflow }
    locks.set(document, state)
  }
  state.count++
  body.style.overflow = 'hidden'
  let released = false
  return () => {
    if (released) return
    released = true
    if (--state.count === 0) {
      body.style.overflow = state.overflow
      locks.delete(document)
    }
  }
}

export function createModalLifecycle(dialog, { isBusy = () => false, requestClose }) {
  let opener
  let releaseScroll
  function open() {
    if (dialog.open) return
    opener = dialog.ownerDocument.activeElement
    dialog.showModal()
    releaseScroll = lockScroll(dialog.ownerDocument)
    const initial = dialog.querySelector('[data-dialog-autofocus]:not(:disabled)')
    initial?.focus()
  }
  function close() {
    if (!dialog.open && !releaseScroll) return
    if (dialog.open) dialog.close()
    releaseScroll?.()
    releaseScroll = undefined
    if (opener?.isConnected) opener.focus()
    else dialog.ownerDocument.querySelector('main button:not([disabled])')?.focus()
    opener = undefined
  }
  function cancel(event) {
    // The parent controls visibility, including Escape; busy dialogs cannot close.
    event.preventDefault()
    if (!isBusy()) requestClose()
  }
  function backdrop(event) {
    if (event.target !== dialog || isBusy()) return
    const box = dialog.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) requestClose()
  }
  function keydown(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(e => !e.matches(':disabled') && e.tabIndex >= 0 && e.getClientRects().length)
    const current = dialog.ownerDocument.activeElement
    const first = controls[0]
    const last = controls.at(-1)
    if (!first) { event.preventDefault(); dialog.focus(); return }
    if (event.shiftKey && (current === first || !controls.includes(current))) {
      event.preventDefault(); last.focus()
    } else if (!event.shiftKey && (current === last || !controls.includes(current))) {
      event.preventDefault(); first.focus()
    }
  }
  return { open, close, cancel, backdrop, keydown, dispose: close }
}
