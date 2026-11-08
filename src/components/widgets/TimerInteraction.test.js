import { createRenderer, h, nextTick, reactive, ssrContextKey } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TimerWidget from './types/TimerWidget.vue'

const renderer = createRenderer({
  createElement: tag => ({ tag, children: [], props: {} }),
  createText: text => ({ text }), createComment: () => ({ text: '' }),
  setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
  patchProp: (node, key, old, value) => { node.props[key] = value },
  insert: (node, parent) => { node.parent = parent; parent.children.push(node) },
  remove: node => { if (node.parent) node.parent.children = node.parent.children.filter(item => item !== node) },
  parentNode: node => node.parent, nextSibling: () => null
})
let app
const InteractiveTimer = { ...TimerWidget, render() {
  const state = this.$.setupState
  return h('div', { onClick: state.startLocally, role: state.clickEnabled ? 'button' : undefined }, state.display)
} }
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-07T18:00:00Z'))
  vi.stubGlobal('window', { setInterval, clearInterval, matchMedia: () => ({ matches: true }) })
})
afterEach(() => { app?.unmount(); vi.unstubAllGlobals(); vi.useRealTimers() })
const text = node => [node.text || '', ...(node.children || []).map(text)].join(' ')
function mount(data = {}, interactive = true) {
  const widget = reactive({ id: 'timer1', data: { mode: 'countdown', running: false, remainingSeconds: 3, durationSeconds: 10, ...data } })
  const root = { children: [] }
  app = renderer.createApp(InteractiveTimer, { widget, interactive })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount(root)
  return { widget, root, click: () => root.children[0].props.onClick() }
}

it('starts locally, finishes on the second click and can restart after hiding', async () => {
  const { root, widget, click } = mount()
  await nextTick()
  click(); await nextTick()
  expect(text(root)).toContain('00:03')
  await vi.advanceTimersByTimeAsync(2000)
  expect(text(root)).toContain('00:01')
  click(); await nextTick()
  expect(text(root)).toContain('00:00')
  await vi.advanceTimersByTimeAsync(3000)
  expect(text(root)).toContain('00:00')
  click(); await nextTick()
  expect(text(root)).toContain('00:10')
  await vi.advanceTimersByTimeAsync(10000)
  expect(text(root)).toContain('00:00')
  click(); await nextTick()
  expect(text(root)).toContain('00:10')
  expect(widget.data.running).toBe(false)
  expect(widget.data.endAt).toBeUndefined()
})

it.each([{ data: { clickToStart: false }, interactive: true }, { data: {}, interactive: false }])('does not start when interaction is disabled: %j', async ({ data, interactive }) => {
  const { root, click } = mount(data, interactive)
  click(); await nextTick()
  await vi.advanceTimersByTimeAsync(2000)
  expect(text(root)).toContain('00:03')
  expect(root.children[0].props.role).toBeUndefined()
})

it('accepts a later timer change from the editor instead of keeping the local run', async () => {
  const { root, widget, click } = mount()
  click(); await nextTick()
  widget.data.remainingSeconds = 60
  await nextTick()
  expect(text(root)).toContain('01:00')
  await vi.advanceTimersByTimeAsync(2000)
  expect(text(root)).toContain('01:00')
})
