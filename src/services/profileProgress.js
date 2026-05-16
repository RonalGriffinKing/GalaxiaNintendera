import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import icon01 from '@/iconos/iconosKirby/icon_01.png'
import icon02 from '@/iconos/iconosKirby/icon_02.png'
import icon03 from '@/iconos/iconosKirby/icon_03.png'
import icon04 from '@/iconos/iconosKirby/icon_04.png'
import icon05 from '@/iconos/iconosKirby/icon_05.png'
import icon06 from '@/iconos/iconosKirby/icon_06.png'
import icon07 from '@/iconos/iconosKirby/icon_07.png'
import icon08 from '@/iconos/iconosKirby/icon_08.png'
import icon09 from '@/iconos/iconosKirby/icon_09.png'
import icon10 from '@/iconos/iconosKirby/icon_10.png'

export const READ_REWARD_STARS = 10
export const READ_REWARD_DELAY_MS = 30000
export const ICON_COST = 25
export const STARTER_ICON_LIMIT = 5

export const kirbyIcons = [
  { id: 'kirby-01', name: 'Kirby Clasico', src: icon01, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-02', name: 'Kirby Brillo', src: icon02, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-03', name: 'Kirby Dream', src: icon03, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-04', name: 'Kirby Pop', src: icon04, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-05', name: 'Kirby Star', src: icon05, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-06', name: 'Kirby Nova', src: icon06, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-07', name: 'Kirby Pixel', src: icon07, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-08', name: 'Kirby Meta', src: icon08, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-09', name: 'Kirby Cometa', src: icon09, saga: 'Kirby', cost: ICON_COST, builtIn: true },
  { id: 'kirby-10', name: 'Kirby Galaxia', src: icon10, saga: 'Kirby', cost: ICON_COST, builtIn: true }
]

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
const localProfileIconModules = import.meta.glob('../iconos/profileIcons/**/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
  query: '?url'
})

export const getReadRewardDelayMs = () => READ_REWARD_DELAY_MS

export const getIconById = (id) => kirbyIcons.find(icon => icon.id === id)

const titleFromFileName = (value = '') => String(value)
  .replace(/\.[^.]+$/, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())

const localIconId = (path) => `local-${String(path)
  .replace('../iconos/profileIcons/', '')
  .replace(/\.[^.]+$/, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')}`

export const localProfileIcons = Object.entries(localProfileIconModules).map(([path, src]) => {
  const relativePath = path.replace('../iconos/profileIcons/', '')
  const parts = relativePath.split('/')
  const fileName = parts.pop() || 'icono'
  const saga = parts[0] || 'Especiales'

  return {
    id: localIconId(path),
    name: titleFromFileName(fileName),
    src,
    saga,
    cost: ICON_COST,
    builtIn: false,
    local: true,
    visible: false,
    archived: false,
    sourcePath: relativePath,
    createdAt: 0
  }
})

export const normalizeProfileIcon = (id, data = {}) => ({
  id,
  name: data.name || 'Icono de comunidad',
  src: data.src || data.imageUrl || '',
  saga: data.saga || data.category || 'Especiales',
  cost: Number(data.cost ?? ICON_COST),
  builtIn: Boolean(data.builtIn),
  local: Boolean(data.local),
  visible: Boolean(data.visible),
  archived: Boolean(data.archived),
  sourcePath: data.sourcePath || '',
  createdAt: data.createdAt || 0
})

export const loadUploadedProfileIcons = async ({ includeHidden = false } = {}) => {
  const iconsQuery = query(collection(db, 'profileIcons'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(iconsQuery)
  const savedById = new Map(snap.docs.map(item => [item.id, normalizeProfileIcon(item.id, item.data())]))
  const localIcons = localProfileIcons.map(icon => {
    const saved = savedById.get(icon.id)
    savedById.delete(icon.id)
    return normalizeProfileIcon(icon.id, {
      ...icon,
      ...saved,
      src: icon.src,
      sourcePath: icon.sourcePath,
      local: true,
      saga: saved?.saga || icon.saga
    })
  })

  const remoteIcons = [...savedById.values()].filter(icon => icon.src)
  return [...localIcons, ...remoteIcons].filter(icon => icon.src && (includeHidden || (icon.visible && !icon.archived)))
}

export const updateProfileIcon = async ({ iconId, name, saga, cost, visible = true, sourcePath = '', src = '' }) => {
  if (!iconId) throw new Error('missing-icon')

  const updates = {
    name: String(name || 'Icono de comunidad').trim(),
    saga: String(saga || 'Especiales').trim(),
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

  return runTransaction(db, async (transaction) => {
    const readSnap = await transaction.get(readRef)
    const userSnap = await transaction.get(userRef)

    if (readSnap.exists()) {
      return { awarded: false }
    }

    const data = userSnap.exists() ? userSnap.data() : {}
    const nextStars = Number(data.stars || 0) + READ_REWARD_STARS
    const nextReadCount = Number(data.readPostsCount || 0) + 1
    const currentUnlocked = data.unlockedIcons?.length ? data.unlockedIcons : ['kirby-01']

    transaction.set(readRef, {
      postId: post.id,
      title: post.title || '',
      category: post.category || 'General',
      stars: READ_REWARD_STARS,
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
      stars: nextStars,
      readPostsCount: nextReadCount,
      achievements: unlockedAchievements(nextReadCount)
    }
  })
}

export const redeemIcon = async ({ userId, iconId, stars, unlockedIcons = [], cost = ICON_COST, iconUrl = '' }) => {
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
    updatedAt: Date.now()
  })
}
