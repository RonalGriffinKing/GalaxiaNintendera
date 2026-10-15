import { query } from 'firebase/firestore'

import { earnedAchievements } from './achievementProgress'

import {ensureProfile,profileRequest} from './profiles'

export const READ_REWARD_STARS = 10
export const READ_REWARD_DELAY_MS = 30000
export const ICON_COST = 25
export const STARTER_ICON_LIMIT = 5

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
      cost: ICON_COST,
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
export const starterKirbyIcons = kirbyIcons.slice(0, STARTER_ICON_LIMIT)
export const getReadRewardDelayMs = () => READ_REWARD_DELAY_MS

export const getIconById = (id) => kirbyIcons.find(icon => icon.id === id)

export const normalizeProfileIcon = (id, data = {}) => ({
  id,
  name: data.name || 'Icono de comunidad',
  src: data.src || data.imageUrl || '',
  saga: data.saga || data.category || 'Especiales',
  special: Boolean(data.special),
  rarity: ['normal', 'rare', 'epic', 'legendary'].includes(data.rarity) ? data.rarity : data.special ? 'epic' : 'normal',
  effectColor: data.effectColor || '#a855f7',
  cost: Number(data.cost ?? ICON_COST),
  builtIn: Boolean(data.builtIn),
  local: Boolean(data.local),
  visible: data.visible === undefined ? true : Boolean(data.visible),
  archived: Boolean(data.archived),
  sourcePath: data.sourcePath || '',
  createdAt: data.createdAt || 0
})

export const loadUploadedProfileIcons = async ({includeHidden=false}={}) => {
 const {items}=await profileRequest('catalog',{includeHidden})
 return items.filter(i=>includeHidden||i.visible&&!i.archived).map(i=>({...i,src:getIconById(i.id)?.src||i.src}))
}

export const updateProfileIcon = async icon => profileRequest('icon-save',{id:icon.id||icon.iconId,data:Object.fromEntries(['name','saga','src','cost','visible','special','effectColor','rarity','sourcePath','imageUrl','builtIn'].filter(k=>icon[k]!==undefined).map(k=>[k,icon[k]]))})
export const archiveProfileIcon = async (iconId,archived=true) => profileRequest('icon-archive',{id:iconId,archived})

export const resolveProfileIcon = (profile = {}) => {
  const selected = getIconById(profile.selectedIcon)
  return selected?.src || profile.selectedIconUrl || profile.imageUrl || fallbackProfileIcon
}

export const resolveProfileIconMeta = (profile = {}) => {
  const selected = getIconById(profile.selectedIcon)
  const effect = profile.selectedIconEffect || {}
  const src = selected?.src || profile.selectedIconUrl || profile.imageUrl || fallbackProfileIcon

  return {
    src,
    special: Boolean(effect.special ?? selected?.special),
    effectColor: effect.effectColor || selected?.effectColor || '#a855f7',
    saga: effect.saga || selected?.saga || 'Especiales'
  }
}

export const unlockedAchievements = (readCount = 0, items = achievements) => {
  return earnedAchievements(items.filter(item => !item.type || item.type === 'reads'), { reads: readCount })
}

export const ensureUserProgress = async (user) => {
  {if(!user)return;return ensureProfile()}
  
}

// Reading rewards await server validation; no balance is changed.
export const beginPostRead = async postId => profileRequest('reading-start',{postId})
export const awardPostRead = async ({user,post}) => {
 if(!user||!post?.id)return {awarded:false}
 const result=await profileRequest('reading-claim',{postId:post.id})
 if(result.awarded){try{const config=await profileRequest('achievements');result.achievements=unlockedAchievements(result.readPostsCount,config.items||achievements)}catch{result.achievements=[];result.progressWarning='Lectura guardada; la lista de logros no se pudo actualizar.'}}
 return result
}

export const redeemIcon = async ({userId,iconId,expectedCost}) => {
  if(!userId||!iconId)throw new Error('missing-icon')
  return profileRequest('redeem-icon',{iconId,...(expectedCost!==undefined?{expectedCost}:{})})
}
