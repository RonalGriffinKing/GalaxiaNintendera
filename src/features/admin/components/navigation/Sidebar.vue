<template>
  <div class="sidebar" :class="{ 'mobile-open': mobileOpen }">
    <div class="logo">
      <div class="brand-mark">
        <div class="logo-icon">
          <i class="fas fa-earth-americas"></i>
        </div>
        <span>Galaxia Nintendera</span>
      </div>

      <button class="mobile-close" aria-label="Cerrar menu" @click="$emit('close-mobile')">
        <i class="fas fa-xmark"></i>
      </button>
    </div>

    <div class="nav">
      <button
        class="nav-item return-item"
        title="Volver a la web"
        @click="returnToWeb"
      >
        <span class="nav-icon">
          <i class="fas fa-arrow-left"></i>
        </span>
        <span class="nav-label">Volver</span>
      </button>

      <button
        v-for="item in visibleNavItems"
        :key="item.view"
        class="nav-item"
        :class="{ active: active === item.view }"
        :title="item.label"
        @click="change(item.view)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>

    <div class="bottom">
      <button class="notifications-btn" @click="toggleNotifications">
        <span class="notifications-icon">
          <i class="fas fa-bell"></i>
          <strong v-if="unreadCount">{{ unreadCount }}</strong>
        </span>
        <span>Notificaciones</span>
      </button>

      <button class="user" @click="openProfile">
        <img :src="profile.imageUrl || fallbackAvatar" alt="" />
        <div class="user-copy">
          <p class="name">{{ profile.name || displayName }}</p>
          <p class="email">{{ profile.description || 'streamer' }}</p>
        </div>
      </button>

      <button class="logout-btn" @click="logout">
        <i class="fas fa-right-from-bracket"></i>
        <span>Cerrar sesion</span>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showProfile" class="profile-modal">
          <div class="profile-backdrop" @click="closeProfile"></div>

          <div class="profile-card">
            <div class="profile-head">
              <div>
                <h2>Perfil</h2>
                <p>Actualiza como apareces en el panel.</p>
              </div>

              <button @click="closeProfile" :disabled="isSaving">x</button>
            </div>

            <div class="profile-preview">
              <img :src="draft.imageUrl || fallbackAvatar" alt="" />
              <div>
                <strong>{{ draft.name || displayName }}</strong>
                <span>{{ draft.description || 'streamer' }}</span>
              </div>
            </div>

            <label class="profile-field">
              Nombre
              <input v-model="draft.name" placeholder="Ej: Marta" />
            </label>

            <label class="profile-field">
              Descripcion
              <textarea v-model="draft.description" rows="3" placeholder="Ej: streamer, redactora, admin..." />
            </label>

            <label class="profile-field">
              Icono por URL
              <input v-model="draft.imageUrl" placeholder="https://..." />
            </label>

            <div class="profile-actions">
              <button class="profile-cancel" @click="closeProfile" :disabled="isSaving">
                Cancelar
              </button>

              <button class="profile-save" @click="saveProfile" :disabled="isSaving">
                {{ isSaving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmLogout" class="profile-modal">
          <div class="profile-backdrop" @click="closeLogoutConfirm"></div>

          <div class="confirm-card">
            <div class="confirm-icon">
              <i class="fas fa-right-from-bracket"></i>
            </div>
            <h2>Quieres cerrar sesion?</h2>
            <p>Volveras a la pantalla de login.</p>

            <div class="profile-actions">
              <button class="profile-cancel" @click="closeLogoutConfirm" :disabled="isLoggingOut">
                Cancelar
              </button>
              <button class="logout-confirm" @click="confirmLogoutAction" :disabled="isLoggingOut">
                {{ isLoggingOut ? 'Cerrando...' : 'Cerrar sesion' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNotifications" class="profile-modal">
          <div class="profile-backdrop" @click="showNotifications = false"></div>

          <div class="notifications-card">
            <div class="profile-head">
              <div>
                <h2>Notificaciones</h2>
                <p>Actividad reciente de posts e hilos.</p>
              </div>

              <div class="notifications-head-actions">
                <button
                  v-if="notifications.length"
                  class="clear-notifications"
                  :disabled="isClearingNotifications"
                  @click="clearNotifications"
                >
                  {{ isClearingNotifications ? 'Limpiando...' : 'Limpiar' }}
                </button>

                <button @click="showNotifications = false">x</button>
              </div>
            </div>

            <div v-if="notifications.length" class="notifications-list">
              <button
                v-for="notification in notifications"
                :key="notification.id"
                class="notification-row"
                :class="{ unread: !notification.read }"
                @click="openNotification(notification)"
              >
                <span class="notification-dot"></span>
                <div>
                  <strong>{{ notification.title }}</strong>
                  <p>{{ notification.message }}</p>
                  <small>{{ formatNotificationDate(notification.createdAt) }}</small>
                </div>
              </button>
            </div>

            <div v-else class="notifications-empty">
              Todavia no tienes notificaciones.
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show" class="app-toast">
          <span class="app-toast-icon success">
            <i class="fas fa-check"></i>
          </span>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { signOut, updateProfile } from 'firebase/auth'
import { auth, db } from '@/firebase'

const emit = defineEmits(['change', 'close-mobile'])
const props = defineProps({
  role: {
    type: String,
    default: 'user'
  },
  mobileOpen: {
    type: Boolean,
    default: false
  }
})
const router = useRouter()

const active = ref('home')
const showProfile = ref(false)
const showNotifications = ref(false)
const confirmLogout = ref(false)
const isSaving = ref(false)
const isLoggingOut = ref(false)
const isClearingNotifications = ref(false)
const toast = ref({ show: false, message: '' })
const notifications = ref([])
let unsubscribeNotifications = null
let audioContext = null
let hasLoadedNotifications = false
let previousNotificationIds = new Set()

const fallbackAvatar = 'https://i.pravatar.cc/120'

const profile = ref({
  name: '',
  description: '',
  imageUrl: ''
})

const draft = ref({
  name: '',
  description: '',
  imageUrl: ''
})

const navItems = [
  { view: 'home', label: 'Inicio', icon: '🏠' },
  { view: 'favorites', label: 'Favoritos', icon: '❤️' },
  { view: 'community', label: 'Comunidades', icon: '💬' },
  { view: 'overlays', label: 'Overlays', icon: '📺', adminOnly: true },
  { view: 'posts', label: 'Posts', icon: '📝', publisherOnly: true },
  { view: 'users', label: 'Usuarios', icon: '👤', adminOnly: true }
]

const displayName = computed(() => auth.currentUser?.displayName || auth.currentUser?.email || 'Admin')
const unreadCount = computed(() => notifications.value.filter(notification => !notification.read).length)
const visibleNavItems = computed(() => navItems.filter(item => {
  if (item.view === 'home') return false
  if (item.adminOnly) return props.role === 'admin'
  if (item.publisherOnly) return ['admin', 'publisher'].includes(props.role)
  return true
}))

const isMobile = () => window.matchMedia('(max-width: 760px)').matches

const change = (view) => {
  active.value = view
  emit('change', view)

  if (isMobile()) {
    emit('close-mobile')
  }
}

const returnToWeb = () => {
  const savedPath = sessionStorage.getItem('last-public-path')
  const target = savedPath && !savedPath.startsWith('/dashboard') ? savedPath : '/'

  if (isMobile()) {
    emit('close-mobile')
  }

  router.push(target)
}

const loadProfile = async () => {
  const user = auth.currentUser
  if (!user) return

  const snap = await getDoc(doc(db, 'users', user.uid))
  const saved = snap.exists() ? snap.data() : {}

  profile.value = {
    name: saved.name || user.displayName || 'Admin',
    description: saved.description || 'streamer',
    imageUrl: saved.imageUrl || user.photoURL || ''
  }
}

const openProfile = () => {
  draft.value = { ...profile.value }
  showProfile.value = true
}

const closeProfile = () => {
  if (isSaving.value) return
  showProfile.value = false
}

const showToast = (message) => {
  toast.value = { show: true, message }
  setTimeout(() => {
    toast.value.show = false
  }, 2200)
}

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    audioContext ||= new AudioContext()
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const start = audioContext.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, start)
    oscillator.frequency.exponentialRampToValueAtTime(1320, start + 0.08)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.2)
  } catch (error) {
    console.error(error)
  }
}

const subscribeNotifications = () => {
  const user = auth.currentUser
  if (!user) return

  unsubscribeNotifications?.()

  const notificationsQuery = query(
    collection(db, 'users', user.uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  unsubscribeNotifications = onSnapshot(notificationsQuery, (snap) => {
    const nextNotifications = snap.docs.map(item => ({
      id: item.id,
      ...item.data()
    }))
    const nextIds = new Set(nextNotifications.map(notification => notification.id))
    const hasNewUnread = nextNotifications.some(notification => (
      !notification.read &&
      !previousNotificationIds.has(notification.id)
    ))

    notifications.value = nextNotifications

    if (hasLoadedNotifications && hasNewUnread) {
      playNotificationSound()
    }

    hasLoadedNotifications = true
    previousNotificationIds = nextIds
  })
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
}

const clearNotifications = async () => {
  const user = auth.currentUser
  if (!user || isClearingNotifications.value) return

  isClearingNotifications.value = true

  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'notifications'))
    const batches = []
    let batch = writeBatch(db)
    let operations = 0

    snap.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref)
      operations += 1

      if (operations === 450) {
        batches.push(batch.commit())
        batch = writeBatch(db)
        operations = 0
      }
    })

    if (operations > 0) {
      batches.push(batch.commit())
    }

    await Promise.all(batches)
    notifications.value = []
    previousNotificationIds = new Set()
    showToast('NOTIFICACIONES LIMPIAS')
  } catch (error) {
    console.error(error)
    showToast('NO SE PUDIERON LIMPIAR')
  } finally {
    isClearingNotifications.value = false
  }
}

const formatNotificationDate = (value) => {
  if (!value) return ''
  const time = typeof value === 'number' ? value : value?.toDate?.().getTime?.() || new Date(value).getTime()
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} dia${days === 1 ? '' : 's'}`
}

const openNotification = async (notification) => {
  const user = auth.currentUser
  if (!user) return

  if (!notification.read) {
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.id), {
      read: true
    })
  }

  showNotifications.value = false

  if (notification.targetType === 'post' && notification.targetId) {
    router.push(`/post/${notification.targetId}`)
    return
  }

  if (notification.targetType === 'thread') {
    active.value = 'community'
    emit('change', 'community')
    if (isMobile()) emit('close-mobile')
  }
}

const saveProfile = async () => {
  const user = auth.currentUser
  if (!user || isSaving.value) return

  isSaving.value = true

  try {
    const cleanProfile = {
      name: draft.value.name.trim() || 'Admin',
      description: draft.value.description.trim(),
      imageUrl: draft.value.imageUrl.trim(),
      updatedAt: Date.now()
    }

    await setDoc(doc(db, 'users', user.uid), cleanProfile, { merge: true })
    await updateProfile(user, {
      displayName: cleanProfile.name,
      photoURL: cleanProfile.imageUrl || null
    })

    profile.value = cleanProfile
    showProfile.value = false
    showToast('PERFIL GUARDADO')
  } catch (error) {
    console.error(error)
    showToast('NO SE PUDO GUARDAR')
  } finally {
    isSaving.value = false
  }
}

const logout = async () => {
  if (isLoggingOut.value) return
  confirmLogout.value = true
}

const closeLogoutConfirm = () => {
  if (isLoggingOut.value) return
  confirmLogout.value = false
}

const confirmLogoutAction = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true

  try {
    await signOut(auth)
    confirmLogout.value = false
    await router.replace('/login')
  } catch (error) {
    console.error(error)
    showToast('NO SE PUDO CERRAR SESION')
  } finally {
    isLoggingOut.value = false
  }
}

onMounted(() => {
  loadProfile()
  subscribeNotifications()
})

onUnmounted(() => {
  unsubscribeNotifications?.()
})
</script>

<style scoped>
.sidebar {
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px 14px;
  width: 260px;
}

@media (min-width: 761px) {
  .sidebar {
    flex: 0 0 320px;
    padding: 24px 20px;
    width: 320px;
  }

  .logo {
    padding: 12px;
  }

  .nav {
    gap: 8px;
    margin-top: 24px;
  }

  .nav-item {
    gap: 12px;
    min-height: 48px;
    padding: 13px 14px;
  }

  .nav-icon {
    width: 24px;
  }

  .bottom {
    gap: 12px;
  }

  .notifications-btn,
  .logout-btn {
    justify-content: flex-start;
    min-height: 44px;
    padding: 12px 14px;
  }

  .user {
    padding: 12px;
  }

  .email {
    max-width: 220px;
  }
}

.logo {
  align-items: center;
  color: #1f2937;
  display: flex;
  font-size: 16px;
  font-weight: 900;
  gap: 10px;
  justify-content: space-between;
  padding: 10px;
}

.brand-mark {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.logo-icon {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 8px;
  color: #ffffff;
  display: flex;
  flex: 0 0 auto;
  font-size: 13px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.mobile-close {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #64748b;
  display: none;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 20px;
}

.nav-item {
  align-items: center;
  border-radius: 12px;
  color: #374151;
  cursor: pointer;
  display: flex;
  font-size: 13px;
  font-weight: 700;
  gap: 10px;
  min-height: 44px;
  padding: 12px;
  text-align: left;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #f1f5f9;
}

.nav-item.active {
  background: linear-gradient(to right, #9333ea20, #ec489920);
  color: #9333ea;
  font-weight: 900;
}

.return-item {
  background: #111827;
  color: #ffffff;
  font-weight: 900;
}

.return-item:hover {
  background: #1f2937;
}

.nav-icon {
  flex: 0 0 auto;
  text-align: center;
  width: 20px;
}

.nav-label,
.logo span,
.user-copy,
.logout-btn span {
  overflow: hidden;
  white-space: nowrap;
}

.bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.user {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  gap: 10px;
  padding: 10px;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.user:hover {
  border-color: #d8b4fe;
  box-shadow: 0 10px 22px rgba(147, 51, 234, 0.08);
}

.user img {
  border-radius: 50%;
  height: 40px;
  object-fit: cover;
  width: 40px;
}

.name {
  color: #1f2937;
  font-size: 13px;
  font-weight: 900;
}

.email {
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  align-items: center;
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  border-radius: 12px;
  color: #e11d48;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-content: center;
  padding: 10px;
  text-transform: uppercase;
}

.notifications-btn {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #374151;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 10px;
  justify-content: center;
  padding: 10px;
  text-transform: uppercase;
}

.notifications-icon {
  position: relative;
}

.notifications-icon strong {
  align-items: center;
  background: #ec4899;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 9px;
  height: 18px;
  justify-content: center;
  min-width: 18px;
  padding: 0 4px;
  position: absolute;
  right: -12px;
  top: -12px;
}

.profile-modal {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 120;
}

.profile-backdrop {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  inset: 0;
  position: absolute;
}

.profile-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  max-width: 420px;
  padding: 22px;
  position: relative;
  width: 100%;
}

.confirm-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  max-width: 360px;
  padding: 24px;
  position: relative;
  text-align: center;
  width: 100%;
}

.notifications-card {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  max-width: 460px;
  padding: 22px;
  position: relative;
  width: 100%;
}

.notifications-head-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}

.clear-notifications {
  background: #f1f5f9;
  border-radius: 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  min-height: 32px;
  padding: 0 12px;
  text-transform: uppercase;
}

.clear-notifications:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.notifications-list {
  display: grid;
  gap: 10px;
  max-height: min(520px, 62vh);
  overflow-y: auto;
}

.notification-row {
  align-items: start;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 10px;
  grid-template-columns: 8px minmax(0, 1fr);
  padding: 12px;
  text-align: left;
}

.notification-row.unread {
  background: #f5f3ff;
  border-color: #d8b4fe;
}

.notification-dot {
  background: #cbd5e1;
  border-radius: 999px;
  height: 8px;
  margin-top: 5px;
  width: 8px;
}

.notification-row.unread .notification-dot {
  background: #9333ea;
}

.notification-row strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 900;
}

.notification-row p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  margin-top: 4px;
}

.notification-row small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-top: 6px;
  text-transform: uppercase;
}

.notifications-empty {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  padding: 24px 16px;
  text-align: center;
}

.confirm-icon {
  align-items: center;
  background: #fff1f2;
  border-radius: 999px;
  color: #e11d48;
  display: flex;
  height: 48px;
  justify-content: center;
  margin: 0 auto 14px;
  width: 48px;
}

.confirm-card h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.confirm-card p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  margin-top: 6px;
}

.profile-head {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.profile-head h2 {
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.profile-head p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  margin-top: 4px;
}

.profile-preview {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
}

.profile-preview img {
  border-radius: 50%;
  height: 54px;
  object-fit: cover;
  width: 54px;
}

.profile-preview strong {
  color: #111827;
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.profile-preview span {
  color: #64748b;
  display: block;
  font-size: 12px;
  font-weight: 700;
  margin-top: 3px;
}

.profile-field {
  color: #64748b;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  margin-top: 12px;
  text-transform: uppercase;
}

.profile-field input,
.profile-field textarea {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  outline: none;
  padding: 10px 12px;
  resize: none;
  text-transform: none;
}

.profile-field input:focus,
.profile-field textarea:focus {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px #f3e8ff;
}

.profile-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.profile-cancel,
.profile-save {
  border-radius: 12px;
  flex: 1;
  font-size: 12px;
  font-weight: 900;
  padding: 11px;
  text-transform: uppercase;
}

.profile-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.profile-save {
  background: linear-gradient(to right, #9333ea, #ec4899);
  color: #ffffff;
}

.logout-confirm {
  background: #e11d48;
  border-radius: 12px;
  color: #ffffff;
  flex: 1;
  font-size: 12px;
  font-weight: 900;
  padding: 11px;
  text-transform: uppercase;
}

.logout-confirm:disabled,
.profile-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@media (max-width: 760px) {
  .sidebar {
    border-right: 0;
    box-sizing: border-box;
    box-shadow: 10px 0 28px rgba(15, 23, 42, 0.12);
    height: 100dvh;
    left: 0;
    max-width: 100%;
    overflow: hidden;
    padding: 18px;
    position: fixed;
    right: 0;
    top: 0;
    transform: translateX(-105%);
    transition: transform 0.24s ease;
    width: 100vw;
    z-index: 100;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .mobile-close {
    display: flex;
  }

  .nav {
    flex: 1;
    margin-top: 18px;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 16px;
  }

  .bottom {
    flex: 0 0 auto;
  }

  .email {
    max-width: none;
  }
}

@media (max-width: 520px) {
  .sidebar {
    padding: 14px;
  }

  .profile-modal {
    padding: 14px;
  }

  .profile-card,
  .confirm-card,
  .notifications-card {
    border-radius: 18px;
    max-height: calc(100dvh - 28px);
    overflow-y: auto;
  }

  .profile-actions {
    display: grid;
  }

  .profile-head {
    gap: 12px;
  }

  .notifications-head-actions {
    flex: 0 0 auto;
    gap: 8px;
  }

  .clear-notifications {
    font-size: 10px;
    max-width: 96px;
    min-height: 34px;
    padding: 0 9px;
    white-space: normal;
  }

  .app-toast {
    align-items: flex-start;
  }
}
</style>
