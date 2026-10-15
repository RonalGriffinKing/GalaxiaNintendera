import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import AdminNavGroup from './AdminNavGroup.vue'
import AdminDisclosure from './AdminDisclosure.vue'
import { disclosureDismissal } from './disclosureDismissal'

describe('administrative navigation', () => {
  it('preserves native links, buttons and accessible current location', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(AdminNavGroup, { as: 'nav', 'aria-label': 'Módulos', vertical: true }, () => [h('a', { href: '/admin/posts', 'aria-current': 'page' }, 'Posts'), h('button', { type: 'button', 'aria-pressed': 'false' }, 'Filtro')]) }))
    expect(html).toContain('<nav')
    expect(html).toContain('href="/admin/posts"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).not.toMatch(/role="(tab|tablist|menu)"/)
  })
  it('associates disclosure control and hidden panel without false menu semantics', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(AdminDisclosure, { label: 'Herramientas', disabled: true }, () => h('button', { type: 'button' }, 'Acción')) }))
    const id = html.match(/aria-controls="([^"]+)"/)[1]
    expect(html).toContain(`id="${id}"`)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('display:none')
    expect(html).toContain('disabled')
    expect(html).not.toContain('role="menu"')
  })
  it('Escape restores focus only when focus belongs to the open disclosure', () => {
    const root = { contains: target => target === 'inside' }
    expect(disclosureDismissal({ type: 'keydown', key: 'Escape', target: 'inside' }, root, true)).toBe('restore')
    expect(disclosureDismissal({ type: 'keydown', key: 'Escape', target: 'outside' }, root, true)).toBeNull()
    expect(disclosureDismissal({ type: 'keydown', key: 'Enter', target: 'inside' }, root, true)).toBeNull()
    expect(disclosureDismissal({ type: 'keydown', key: 'Escape', target: 'inside' }, root, false)).toBeNull()
  })
  it('outside pointer closes without stealing focus; inside pointer leaves option actionable', () => {
    const root = { contains: target => target === 'inside' }
    expect(disclosureDismissal({ type: 'pointerdown', target: 'outside' }, root, true)).toBe('close')
    expect(disclosureDismissal({ type: 'pointerdown', target: 'inside' }, root, true)).toBeNull()
  })
})
