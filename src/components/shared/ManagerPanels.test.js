import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/firebase', () => ({ auth: { currentUser: { uid: 'admin' } }, db: {}, firebaseConfig: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(), setDoc: vi.fn()
}))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace: vi.fn() }) }))
import { getDocs } from 'firebase/firestore'
import UserPanel from './UserPanel.vue'
import VisualThemesPanel from '../posts/VisualThemesPanel.vue'

beforeEach(() => { vi.clearAllMocks() })

it('renders the embedded users panel with visible load and search buttons before fetching users', async () => {
  const html = await renderToString(createSSRApp(UserPanel, { embedded: true, userRole: 'admin' }))
  expect(html).toContain('Mostrar usuarios')
  expect(html).toContain('Buscar usuarios')
  expect(html).not.toContain('Solo un usuario con rol admin')
  expect(html).not.toContain('No hay usuarios con esos criterios')
  expect(getDocs).not.toHaveBeenCalled()
})

it('shows the visual theme cards without opening configuration or fetching all posts', async () => {
  const html = await renderToString(createSSRApp(VisualThemesPanel, { userRole: 'admin' }))
  expect(html).toContain('Galaxia General')
  expect(html).toContain('Kirby Dreamland')
  expect(html).not.toContain('Nombre del tema')
  expect(html).not.toContain('Vista previa')
  expect(getDocs).not.toHaveBeenCalled()
})
