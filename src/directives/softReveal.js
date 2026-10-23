import './softReveal.css'

const scopes = new Set()
const owners = new WeakMap()
const records = new Map()
const seen = new WeakSet()
let observer, media

function finish(record) {
  observer?.unobserve(record.element)
  record.element.classList.remove('gn-reveal-pending')
  record.element.dataset.softRevealed = 'true'
  record.animation?.cancel()
  record.animation = null
  record.pending = false
}
function reveal(record, index = 0) {
  if (!record.pending) return
  observer?.unobserve(record.element)
  record.element.classList.remove('gn-reveal-pending')
  record.element.dataset.softRevealed = 'true'
  record.pending = false
  if (media?.matches) return
  try {
    record.animation = record.element.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 360, delay: Math.min(index * record.stagger, 240), easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'backwards' })
    record.animation.onfinish = () => { record.animation = null }
  } catch { finish(record) }
}
function onMotion(event) { if (event.matches) for (const record of records.values()) finish(record) }
function setup() {
  if (!media) { media = window.matchMedia('(prefers-reduced-motion: reduce)'); media.addEventListener('change', onMotion) }
  if (!observer) observer = new window.IntersectionObserver(entries => {
    const batches = new Map()
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const record = records.get(entry.target)
      if (!record) continue
      const index = batches.get(record.scope) || 0
      reveal(record, index)
      batches.set(record.scope, index + 1)
    }
  }, { threshold: .01, rootMargin: '0px 0px 24px 0px' })
}
function remove(record) {
  finish(record)
  record.element.removeEventListener('focusin', record.focus)
  records.delete(record.element)
  record.scope.items.delete(record.element)
}
function sync(element, binding) {
  let scope = owners.get(element)
  if (!scope) { scope = { element, items: new Map() }; owners.set(element, scope); scopes.add(scope) }
  const selector = typeof binding.value === 'string' ? binding.value : binding.value?.selector
  const targets = selector ? [...element.querySelectorAll(selector)] : [element]
  const current = new Set(targets)
  for (const record of scope.items.values()) if (!current.has(record.element)) remove(record)
  if (typeof window === 'undefined' || !window.IntersectionObserver || !window.matchMedia || !element.animate) return
  setup()
  for (const target of targets) {
    if (seen.has(target) || records.has(target)) continue
    seen.add(target)
    if (media.matches || target.contains?.(document.activeElement)) { target.dataset.softRevealed = 'true'; continue }
    const record = { element: target, scope, pending: true, stagger: Math.min(70, Math.max(0, Number(binding.value?.stagger) || 45)), animation: null }
    record.focus = () => finish(record)
    records.set(target, record); scope.items.set(target, record)
    target.addEventListener('focusin', record.focus)
    target.classList.add('gn-reveal-pending')
    observer.observe(target)
  }
}
export const vSoftReveal = {
  mounted: sync,
  updated: sync,
  unmounted(element) {
    const scope = owners.get(element)
    if (!scope) return
    for (const record of [...scope.items.values()]) remove(record)
    owners.delete(element); scopes.delete(scope)
    if (!scopes.size) { observer?.disconnect(); observer = null; media?.removeEventListener('change', onMotion); media = null }
  }
}
