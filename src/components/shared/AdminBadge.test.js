import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import AdminBadge from './AdminBadge.vue'
import { badgeVariants, postBadgeVariant, roleBadgeVariant } from './adminBadgeVariants'

describe('administrative badge contract', () => {
  it.each(badgeVariants)('renders %s as an informational span, preserving label and attributes', async variant => {
    const html = await renderToString(createSSRApp({ render: () => h(AdminBadge, { variant, 'aria-label': 'Posición 123' }, () => 'Estado <externo>') }))
    expect(html).toContain('<span')
    expect(html).toContain('aria-label="Posición 123"')
    expect(html).toContain('Estado &lt;externo&gt;')
    expect(html).not.toMatch(/<(button|a)\b|tabindex=|role="(button|alert|status)"/)
  })
  it('uses neutral for unknown variants without dropping their text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const html = await renderToString(createSSRApp({ render: () => h(AdminBadge, { variant: 'unknown' }, () => 'Estado desconocido') }))
      expect(html).toContain('admin-badge--neutral')
      expect(html).toContain('Estado desconocido')
    } finally { warn.mockRestore() }
  })
  it('maps existing state/role values only for display and handles unknown values', () => {
    expect(['draft','pending','approved','rejected','future'].map(postBadgeVariant)).toEqual(['neutral','pending','success','danger','neutral'])
    expect(['admin','publisher','user','custom'].map(roleBadgeVariant)).toEqual(['brand','success','info','neutral'])
    expect(postBadgeVariant('__proto__')).toBe('neutral')
    expect(roleBadgeVariant('constructor')).toBe('neutral')
  })
})
