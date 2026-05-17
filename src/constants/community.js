export const DEFAULT_THREAD_TOPICS = ['Posts', 'Fanarts', 'Guias', 'Trucos', 'Preguntas', 'Clips', 'Eventos']

export const CONTENT_TAB_ICONS = {
  Inicio: 'far fa-comment',
  Hilos: 'fas fa-feather',
  Posts: 'far fa-comment',
  Fanarts: 'fas fa-pen-nib',
  Guias: 'far fa-book-open',
  Trucos: 'far fa-lightbulb',
  Preguntas: 'far fa-circle-question',
  Clips: 'fas fa-clapperboard',
  Eventos: 'far fa-calendar',
  'Acerca de': 'fas fa-circle-info'
}

export const OFFICIAL_COMMUNITY_ID = 'galaxia-oficial'

export const createOfficialCommunity = () => ({
  id: OFFICIAL_COMMUNITY_ID,
  name: 'Galaxia Nintendera Oficial',
  description: 'Comunicados, lives, eventos y lanzamientos importantes de Galaxia Nintendera.',
  bannerUrl: '/src/iconos/Banner.png',
  iconUrl: '/src/iconos/logo.png',
  membersCount: 0,
  isOfficial: true,
  lockedMembership: true,
  adminOnlyThreads: true,
  threadTopics: [...DEFAULT_THREAD_TOPICS],
  createdAt: 0,
  updatedAt: 0
})
