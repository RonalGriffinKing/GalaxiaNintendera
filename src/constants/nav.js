import { DEFAULT_THREAD_TOPICS, CONTENT_TAB_ICONS } from '@/constants/community'

export const PUBLIC_NAV_LINKS = [
  { label: 'Inicio', icon: 'fas fa-house', to: '/' },
  { label: 'Noticias', icon: 'fas fa-newspaper', to: '/noticias' },
  { label: 'Eventos', icon: 'far fa-calendar', to: '/eventos' },
  { label: 'Comunidades', icon: 'fas fa-users', to: '/comunidad' }
]

export const QUICK_STICKER_POOL = ['⭐', '🔥', '🎮', '👾', '💥', '🟣', '🌟', '🧠', '💜', '🎯']
export const QUICK_EMOJI_POOL = ['😀', '😂', '😍', '😎', '🤯', '😭', '🥳', '🤔']
export const DEFAULT_QUICK_THREAD_TOPICS = [...DEFAULT_THREAD_TOPICS]
export const QUICK_THREAD_TOPIC_ICONS = { ...CONTENT_TAB_ICONS }
