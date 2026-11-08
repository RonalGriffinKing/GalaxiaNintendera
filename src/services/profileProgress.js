import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '@/firebase'
import iconDefaults from './profileIconDefaults.json'
import { progressRequest } from './progressClient'

export { READ_REWARD_STARS, READ_REWARD_DELAY_MS } from './starProgress'
import { READ_REWARD_DELAY_MS } from './starProgress'

const titleFromFileName = (value = '') => String(value)
  .replace(/\.[^.]+$/, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())

const naturalIconSort = ([pathA], [pathB]) => pathA.localeCompare(pathB, undefined, {
  numeric: true,
  sensitivity: 'base'
})

const profileIconModules = import.meta.glob('../iconos/iconos*/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
  query: '?url'
})

const sagaFromIconFolder = (path = '') => {
  const folder = String(path).match(/\/iconos([^/]+)\//)?.[1] || 'Especiales'
  return folder
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase()) || 'Especiales'
}

const idPart = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export const kirbyIcons = Object.entries(profileIconModules)
  .sort(naturalIconSort)
  .map(([path, src]) => {
    const saga = sagaFromIconFolder(path)
    const fileName = path.split('/').pop() || 'icono'
    const baseName = fileName.replace(/\.[^.]+$/, '')
    const slug = idPart(baseName)
    const sagaSlug = idPart(saga)
    const displayName = titleFromFileName(fileName)

    return {
      id: `${sagaSlug}-${slug}`,
      name: `${saga} ${displayName}`,
      src,
      saga,
      requiredStars: iconDefaults.find(icon => icon.sourcePath === path.replace('../iconos/', ''))?.requiredStars ?? 25,
      order: iconDefaults.find(icon => icon.sourcePath === path.replace('../iconos/', ''))?.order ?? 0,
      active: true,
      builtIn: true,
      sourcePath: path.replace('../iconos/', '')
    }
  })

export const achievements = [
  { id: 'read-10', label: 'Lector Novato', description: 'Leer 10 posts', type: 'reads', target: 10, reads: 10 },
  { id: 'read-25', label: 'Explorador Galactico', description: 'Leer 25 posts', type: 'reads', target: 25, reads: 25 },
  { id: 'read-50', label: 'Fan Constante', description: 'Leer 50 posts', type: 'reads', target: 50, reads: 50 },
  { id: 'publish-5', label: 'Voz de la Galaxia', description: 'Publicar 5 posts', type: 'posts', target: 5 },
  { id: 'community-3', label: 'Aliado de Comunidades', description: 'Unirse a 3 comunidades', type: 'communities', target: 3 },
  { id: 'icons-10', label: 'Coleccionista Cosmico', description: 'Desbloquear 10 iconos', type: 'icons', target: 10 }
]

export const fallbackProfileIcon = kirbyIcons[0].src
export const getReadRewardDelayMs = () => READ_REWARD_DELAY_MS

export const getIconById = (id) => kirbyIcons.find(icon => icon.id === id)

export const normalizeProfileIcon = (id, data = {}) => ({
  id,
  name: data.name || 'Icono de comunidad',
  src: data.imageUrl || data.src || '',
  saga: data.saga || data.category || 'Especiales',
  special: Boolean(data.special),
  rarity: ['normal', 'rare', 'epic', 'legendary'].includes(data.rarity) ? data.rarity : data.special ? 'epic' : 'normal',
  effectColor: data.effectColor || '#a855f7',
  requiredStars: Number.isSafeInteger(data.requiredStars) && data.requiredStars >= 0 ? data.requiredStars : (iconDefaults.find(icon => icon.id === id)?.requiredStars ?? 25),
  order: Number.isSafeInteger(data.order) && data.order >= 0 ? data.order : (iconDefaults.find(icon => icon.id === id)?.order ?? 10000),
  active: data.active !== false,
  builtIn: Boolean(data.builtIn),
  local: Boolean(data.local),
  visible: data.visible === undefined ? true : Boolean(data.visible),
  archived: Boolean(data.archived),
  sourcePath: data.sourcePath || '',
  createdAt: data.createdAt || 0
})

export const loadUploadedProfileIcons = async ({ includeHidden = false } = {}) => {
  const iconsQuery = query(collection(db, 'profileIcons'))
  const snap = await getDocs(iconsQuery)
  const savedById = new Map(snap.docs.map(item => [item.id, normalizeProfileIcon(item.id, item.data())]))
  const localIcons = kirbyIcons.map(icon => {
    const saved = savedById.get(icon.id)
    return normalizeProfileIcon(icon.id, {
      ...icon,
      ...saved,
      src: saved?.src || icon.src,
      sourcePath: icon.sourcePath,
      local: true,
      saga: saved?.saga || icon.saga
    })
  })

  const localIds = new Set(localIcons.map(icon => icon.id))
  const uploadedIcons = [...savedById.values()].filter(icon => !localIds.has(icon.id))
  return [...localIcons, ...uploadedIcons].filter(icon => icon.src && (includeHidden || (icon.visible && icon.active && !icon.archived))).sort((a,b) => a.order - b.order || a.name.localeCompare(b.name))
}


export const resolveProfileIcon = (profile = {}) => {
  const selected = getIconById(profile.selectedIcon)
  return profile.selectedIconUrl || selected?.src || profile.imageUrl || fallbackProfileIcon
}

export const resolveProfileIconMeta = (profile = {}) => {
  const selected = getIconById(profile.selectedIcon)
  const effect = profile.selectedIconEffect || {}
  const src = profile.selectedIconUrl || selected?.src || profile.imageUrl || fallbackProfileIcon

  return {
    src,
    special: Boolean(effect.special ?? selected?.special),
    effectColor: effect.effectColor || selected?.effectColor || '#a855f7',
    saga: effect.saga || selected?.saga || 'Especiales'
  }
}


export const ensureUserProgress = user => user ? progressRequest('sync') : Promise.resolve()
export const beginPostRead = ({ user, post }) => user && post?.id ? progressRequest('begin-read', { postId: post.id }) : Promise.resolve()
export const awardPostRead = ({ user, post }) => user && post?.id ? progressRequest('award-read', { postId: post.id }) : Promise.resolve({ awarded: false })
export const equipProfileIcon = iconId => progressRequest('equip', { iconId })
