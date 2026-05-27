import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'

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
  effectColor: data.effectColor || '#a855f7',
  cost: Number(data.cost ?? ICON_COST),
  builtIn: Boolean(data.builtIn),
  local: Boolean(data.local),
  visible: data.visible === undefined ? true : Boolean(data.visible),
  archived: Boolean(data.archived),
  sourcePath: data.sourcePath || '',
  createdAt: data.createdAt || 0
})

export const loadUploadedProfileIcons = async ({ includeHidden = false } = {}) => {
  const iconsQuery = query(collection(db, 'profileIcons'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(iconsQuery)
  const savedById = new Map(snap.docs.map(item => [item.id, normalizeProfileIcon(item.id, item.data())]))
  const localIcons = kirbyIcons.map(icon => {
    const saved = savedById.get(icon.id)
    return normalizeProfileIcon(icon.id, {
      ...icon,
      ...saved,
      src: icon.src,
      sourcePath: icon.sourcePath,
      local: true,
      saga: saved?.saga || icon.saga
    })
  })

  return localIcons.filter(icon => icon.src && (includeHidden || (icon.visible && !icon.archived)))
}

export const updateProfileIcon = async ({ iconId, name, saga, cost, visible = true, sourcePath = '', src = '', special = false, effectColor = '#a855f7' }) => {
  if (!iconId) throw new Error('missing-icon')

  const updates = {
    name: String(name || 'Icono de comunidad').trim(),
    saga: String(saga || 'Especiales').trim(),
    special: Boolean(special),
    effectColor: String(effectColor || '#a855f7'),
    cost: Math.max(0, Number(cost || 0)),
    visible: Boolean(visible),
    archived: !visible,
    local: Boolean(sourcePath),
    sourcePath,
    imageUrl: src,
    updatedAt: Date.now()
  }

  await setDoc(doc(db, 'profileIcons', iconId), {
    ...updates,
    createdAt: Date.now()
  }, { merge: true })
  return updates
}

export const archiveProfileIcon = async ({ iconId }) => {
  if (!iconId) throw new Error('missing-icon')

  await updateDoc(doc(db, 'profileIcons', iconId), {
    archived: true,
    archivedAt: Date.now(),
    updatedAt: Date.now()
  })
}

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

export const unlockedAchievements = (readCount = 0) => {
  return achievements.filter(item => readCount >= item.reads)
}

export const ensureUserProgress = async (user) => {
  if (!user) return

  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)
  const data = snap.exists() ? snap.data() : {}

  await setDoc(userRef, {
    name: data.name || user.displayName || user.email || 'Usuario',
    email: data.email || user.email || '',
    imageUrl: data.imageUrl || user.photoURL || '',
    stars: Number(data.stars || 0),
    readPostsCount: Number(data.readPostsCount || 0),
    unlockedIcons: data.unlockedIcons?.length ? data.unlockedIcons : ['kirby-01'],
    selectedIcon: data.selectedIcon || 'kirby-01',
    selectedIconUrl: data.selectedIconUrl || '',
    updatedAt: Date.now()
  }, { merge: true })
}

export const awardPostRead = async ({ user, post }) => {
  if (!user || !post?.id) return { awarded: false }

  const userRef = doc(db, 'users', user.uid)
  const readRef = doc(db, 'users', user.uid, 'readPosts', post.id)
  const configuredReward = Math.max(0, Number(post.starReward || READ_REWARD_STARS))
  const multiplier = Math.max(0, Number(post.rewardMultiplier || 1))
  const rewardStars = Math.max(0, Math.round(configuredReward * multiplier))

  return runTransaction(db, async (transaction) => {
    const readSnap = await transaction.get(readRef)
    const userSnap = await transaction.get(userRef)

    if (readSnap.exists()) {
      return { awarded: false }
    }

    const data = userSnap.exists() ? userSnap.data() : {}
    const nextStars = Number(data.stars || 0) + rewardStars
    const nextReadCount = Number(data.readPostsCount || 0) + 1
    const currentUnlocked = data.unlockedIcons?.length ? data.unlockedIcons : ['kirby-01']

    transaction.set(readRef, {
      postId: post.id,
      title: post.title || '',
      category: post.category || 'General',
      rewardBadges: Array.isArray(post.rewardBadges) ? post.rewardBadges : [],
      stars: rewardStars,
      readAt: Date.now()
    })

    transaction.set(userRef, {
      stars: nextStars,
      readPostsCount: nextReadCount,
      unlockedIcons: currentUnlocked,
      selectedIcon: data.selectedIcon || 'kirby-01',
      updatedAt: Date.now()
    }, { merge: true })

    return {
      awarded: true,
      awardedStars: rewardStars,
      stars: nextStars,
      readPostsCount: nextReadCount,
      achievements: unlockedAchievements(nextReadCount)
    }
  })
}

export const redeemIcon = async ({ userId, iconId, stars, unlockedIcons = [], cost = ICON_COST, iconUrl = '', iconEffect = null }) => {
  if (!userId || !iconId) return
  const currentUnlocked = unlockedIcons.length ? unlockedIcons : ['kirby-01']
  if (currentUnlocked.includes(iconId)) return
  const iconCost = Math.max(0, Number(cost || 0))
  if (Number(stars || 0) < iconCost) throw new Error('not-enough-stars')

  await updateDoc(doc(db, 'users', userId), {
    stars: Number(stars || 0) - iconCost,
    unlockedIcons: [...currentUnlocked, iconId],
    selectedIcon: iconId,
    selectedIconUrl: iconUrl,
    ...(iconEffect ? { selectedIconEffect: iconEffect } : {}),
    updatedAt: Date.now()
  })
}
