import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { CAMERA_FRAME_THEMES, CAMERA_FRAME_DEFAULTS, cameraFrameSettings } from '@/services/cameraFrame'
import CameraFrameWidget from './types/CameraFrameWidget.vue'
import CameraFrameEditor from './editors/CameraFrameEditor.vue'
vi.mock('./types/NowPlayingWidget.vue', () => ({ default: { render: () => null } }))
import WidgetRenderer from './WidgetRenderer.vue'

describe('camera frames', () => {
  it.each(CAMERA_FRAME_THEMES)('renders $label as a background without a frame', async theme => {
    const html = await renderToString(createSSRApp(CameraFrameWidget, { widget: { data: { mode: 'background', theme: theme.id } } }))
    expect(html).toContain('camera-background')
    expect(html).toContain('background-motes')
    expect(html).not.toContain('class="frame-outline"')
    expect(html).not.toContain('class="frame-emblem"')
  })

  it('supports combined mode and preserves the transparent default for saved frames', async () => {
    expect(cameraFrameSettings({})).toMatchObject({ mode: 'frame', backgroundBrightness: 100 })
    expect(cameraFrameSettings({ mode: 'invalid', backgroundBrightness: 1000 })).toMatchObject({ mode: 'frame', backgroundBrightness: 150 })
    const html = await renderToString(createSSRApp(CameraFrameWidget, { widget: { data: { mode: 'both', animated: false, theme: 'zelda' } } }))
    expect(html).toContain('camera-background')
    expect(html).toContain('class="frame-outline"')
    expect(html).not.toContain('zelda moving')
  })
  it('bounds saved geometry and safely falls back for legacy or invalid settings', () => {
    expect(cameraFrameSettings()).toMatchObject({ width: 480, height: 270, showLabel: false, theme: { id: 'galaxy' } })
    expect(cameraFrameSettings({ width: -10, height: Infinity, radius: 900, borderWidth: 100, glow: -3, theme: 'unknown' })).toMatchObject({ width: 160, height: 270, radius: 80, borderWidth: 16, glow: 0, theme: { id: 'galaxy' } })
    expect(cameraFrameSettings({ label: 'x'.repeat(100) }).label).toHaveLength(60)
  })

  it.each(CAMERA_FRAME_THEMES)('renders a transparent center for $label', async theme => {
    const html = await renderToString(createSSRApp(CameraFrameWidget, { widget: { data: { ...CAMERA_FRAME_DEFAULTS, theme: theme.id } } }))
    expect(html).toContain('fill="none"')
    expect(html).toContain('<rect')
    expect(html).not.toContain('<image')
    expect(html).not.toContain('<video')
    expect(html).toContain('width:480px')
    expect(html).toContain('height:270px')
    if (theme.id === 'zelda') expect(html).toContain('triforce-symbol')
  })

  it('keeps decorations and labels optional and escapes the channel name', async () => {
    const html = await renderToString(createSSRApp(CameraFrameWidget, { widget: { data: { decorations: false, animated: false, showLabel: true, label: '<script>test</script>' } } }))
    expect(html).not.toContain('class="frame-emblem"')
    expect(html).not.toContain('class="frame-corner"')
    expect(html).toContain('&lt;script&gt;test&lt;/script&gt;')
    expect(html).not.toContain('class="frame-energy"')
    expect(html).not.toContain('class="frame-wave"')
    expect(html).not.toContain('class="frame-particles"')
  })

  it('renders perimeter effects by default and lets each one be disabled', async () => {
    const render = data => renderToString(createSSRApp(CameraFrameWidget, { widget: { data } }))
    const html = await render({ theme: 'zelda' })
    expect(html).toContain('class="frame-energy"')
    expect(html).toContain('class="frame-wave"')
    expect((html.match(/class="frame-particle"/g) || []).length).toBe(14)
    expect(html).toContain('--icon-size:48px')
    const quiet = await render({ energy: false, waves: false, particleCount: 0 })
    expect(quiet).not.toContain('class="frame-energy"')
    expect(quiet).not.toContain('class="frame-wave"')
    expect(quiet).not.toContain('class="frame-particles"')
    expect(cameraFrameSettings({ speed: 0, iconSize: 200, particleCount: 100 })).toMatchObject({ speed: 2, iconSize: 96, particleCount: 24 })
  })

  it('uses separate SVG gradients when several camera frames share an overlay', async () => {
    const html = await renderToString(createSSRApp({ render: () => h('div', [h(CameraFrameWidget, { widget: { data: {} } }), h(CameraFrameWidget, { widget: { data: { theme: 'zelda' } } })]) }))
    const ids = [...html.matchAll(/linearGradient id="([^"]+)"/g)].map(match => match[1])
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('routes the new saved widget type through the shared OBS renderer', async () => {
    const html = await renderToString(createSSRApp(WidgetRenderer, { widget: { id: 'frame1', type: 'cameraFrame', data: { theme: 'zelda' } } }))
    expect(html).toContain('camera-frame zelda')
    expect(html).not.toContain('Widget no soportado')
  })

  it('offers camera proportions and all themes in its editor', async () => {
    const html = await renderToString(createSSRApp(CameraFrameEditor, { widget: { data: { ...CAMERA_FRAME_DEFAULTS } } }))
    expect(html).toContain('16:9')
    expect(html).toContain('4:3')
    expect(html).toContain('9:16')
    for (const theme of CAMERA_FRAME_THEMES) expect(html).toContain(theme.label)
  })
})
