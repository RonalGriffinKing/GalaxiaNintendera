<template>
  <div class="relative min-h-full">
    <div v-if="!embedded" class="panel-header">
      <div>
        <h1 class="panel-title">Usuarios</h1>
        <p class="panel-subtitle">Administra quienes pueden crear contenido</p>
      </div>

      <button
        v-if="canManageUsers"
        @click="openCreate"
        class="btn-primary-galaxy-xs flex items-center gap-2"
      >
        <i class="fas fa-plus"></i>
        Crear usuario
      </button>
    </div>

    <div v-if="!canManageUsers" class="app-card p-4 mb-5">
      <p class="section-caption">
        Solo un usuario con rol admin puede crear o eliminar usuarios.
      </p>
    </div>

    <div class="users-grid">
      <div
        v-for="user in users"
        :key="user.id"
        class="user-card"
      >
        <img :src="profileIcon(user) || fallbackAvatar" alt="" class="profile-icon-img" />

        <div class="user-info">
          <div class="user-row">
            <h3>{{ user.name || user.email || 'Usuario' }}</h3>
            <span :class="['role-pill', user.role || 'user']">
              {{ user.role || 'user' }}
            </span>
          </div>

          <p>{{ user.description || 'Sin descripcion' }}</p>
          <small>{{ user.email || 'Sin email' }}</small>
        </div>

        <div class="user-actions">
          <button
            v-if="user.id !== currentUid"
            class="mini-btn-xs btn-message"
            title="Enviar mensaje"
            @click="openDirectChat(user)"
          >
            <i class="fas fa-message"></i>
          </button>

          <button
            v-if="canManageUsers"
            class="mini-btn-xs btn-edit"
            title="Editar"
            @click="openEdit(user)"
          >
            <i class="fas fa-pen"></i>
          </button>

          <button
            v-if="canManageUsers && user.id !== currentUid"
            class="mini-btn-xs btn-danger"
            title="Eliminar"
            @click="triggerDelete(user)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div
        v-if="showPanel"
        class="side-panel-backdrop"
        @click="closePanel"
      ></div>
    </Transition>

    <Transition name="slide">
      <div v-if="showPanel" class="user-panel">
        <div class="panel-top">
          <div>
            <h2>{{ isEditing ? 'Editar usuario' : 'Crear usuario' }}</h2>
            <p>{{ isEditing ? 'Actualiza perfil y rol' : 'Crea una cuenta para el panel' }}</p>
          </div>

          <button class="panel-close-btn" @click="closePanel" :disabled="isSaving">x</button>
        </div>

        <div class="panel-body">
          <label class="field">
            Nombre
            <input v-model="form.name" placeholder="Ej: Marta" />
          </label>

          <label class="field">
            Email
            <input v-model="form.email" type="email" placeholder="persona@email.com" :disabled="isEditing" />
          </label>

          <label v-if="!isEditing" class="field">
            Password temporal
            <input v-model="form.password" type="password" placeholder="Minimo 6 caracteres" />
          </label>

          <label class="field">
            Descripcion
            <textarea v-model="form.description" rows="3" placeholder="Ej: redactora, streamer, editor..." />
          </label>

          <label class="field">
            Icono por URL
            <input v-model="form.imageUrl" placeholder="https://..." />
          </label>

          <label class="field">
            Rol
            <select v-model="form.role">
              <option value="user">Usuario</option>
              <option value="publisher">Publicador</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label class="chat-toggle">
            <input v-model="form.canChat" type="checkbox" />
            <span>
              <strong>Permitir chat</strong>
              <small>Los admins y publicadores pueden chatear siempre.</small>
            </span>
          </label>
        </div>

        <div class="panel-footer">
          <button
            @click="saveUser"
            :disabled="isSaving || !form.name || !form.email || (!isEditing && !form.password)"
            class="btn-primary-galaxy w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear usuario') }}
          </button>
        </div>

        <Transition name="fade">
          <div v-if="isSaving" class="panel-loading-cover">
            <GalaxyLoader compact title="Guardando usuario" text="Aplicando cambios con la pantalla de carga de la galaxia..." />
          </div>
        </Transition>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="confirmDialog.show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!isDeleting && (confirmDialog.show = false)"></div>

        <div class="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl text-center">
          <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg bg-red-100 text-red-600">
            <i class="fas fa-trash-alt"></i>
          </div>

          <h2 class="text-lg font-black text-gray-800 mb-1">Eliminar usuario?</h2>
          <p class="text-gray-500 mb-6 text-xs">
            Se eliminara su perfil y permisos del panel. Para borrar su Auth completamente hace falta backend Admin SDK.
          </p>

          <div class="flex gap-2">
            <button
              @click="confirmDialog.show = false"
              :disabled="isDeleting"
              class="flex-1 py-2 text-xs rounded-xl font-bold bg-gray-100 text-gray-500 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              @click="executeDelete"
              :disabled="isDeleting"
              class="flex-1 py-2 text-xs rounded-xl font-bold text-white shadow-lg bg-red-500 shadow-red-100 disabled:opacity-60"
            >
              {{ isDeleting ? 'Eliminando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show" class="app-toast">
          <div :class="['app-toast-icon', toast.type]">
            <i :class="toast.type === 'delete' ? 'fas fa-trash-alt' : 'fas fa-check'"></i>
          </div>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initializeApp, deleteApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { auth, db, firebaseConfig } from '@/firebase'
import { resolveProfileIcon } from '@/services/profileProgress'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})

const fallbackAvatar = 'https://i.pravatar.cc/120'
const profileIcon = (user) => resolveProfileIcon(user)
const route = useRoute()
const router = useRouter()

const users = ref([])
const currentRole = ref('')
const showPanel = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
const confirmDialog = ref({ show: false, user: null })

const form = ref({
  id: null,
  name: '',
  email: '',
  password: '',
  description: '',
  imageUrl: '',
  role: 'user',
  canChat: false
})

const currentUid = computed(() => auth.currentUser?.uid || '')
const canManageUsers = computed(() => currentRole.value === 'admin')
const canUseChat = computed(() => ['admin', 'publisher'].includes(currentRole.value))

const loadUsers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  users.value = snap.docs.map(d => ({ ...d.data(), id: d.id }))

  const user = auth.currentUser
  if (!user) return

  const currentSnap = await getDoc(doc(db, 'users', user.uid))

  if (!currentSnap.exists() && users.value.length === 0) {
    currentRole.value = 'admin'
    await setDoc(doc(db, 'users', user.uid), {
      name: user.displayName || 'Admin',
      email: user.email || '',
      description: 'admin',
      imageUrl: user.photoURL || '',
      role: 'admin',
      canChat: true,
      emailOptIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, { merge: true })
    await loadUsers()
    return
  }

  currentRole.value = currentSnap.data()?.role || 'user'
}

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 2400)
}

const openCreate = () => {
  isEditing.value = false
  form.value = {
    id: null,
    name: '',
    email: '',
    password: '',
    description: '',
    imageUrl: '',
    role: 'user',
    canChat: false
  }
  showPanel.value = true
  if (route.query.create === 'user') {
    router.replace({ path: route.path, query: { ...route.query, create: undefined } })
  }
}

const openEdit = (user) => {
  isEditing.value = true
  form.value = {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    password: '',
    description: user.description || '',
    imageUrl: user.imageUrl || '',
    role: user.role || 'user',
    canChat: Boolean(user.canChat)
  }
  showPanel.value = true
}

const closePanel = () => {
  if (isSaving.value) return
  showPanel.value = false
}

const saveUser = async () => {
  if (!canManageUsers.value || isSaving.value) return

  isSaving.value = true

  try {
    if (isEditing.value) {
      await setDoc(doc(db, 'users', form.value.id), userPayload(form.value), { merge: true })
      showToast('USUARIO ACTUALIZADO')
    } else {
      const secondaryApp = initializeApp(firebaseConfig, `user-create-${Date.now()}`)
      const secondaryAuth = getAuth(secondaryApp)

      try {
        const credential = await createUserWithEmailAndPassword(
          secondaryAuth,
          form.value.email.trim(),
          form.value.password
        )

        await updateProfile(credential.user, {
          displayName: form.value.name.trim(),
          photoURL: form.value.imageUrl.trim() || null
        })

        await setDoc(doc(db, 'users', credential.user.uid), {
          ...userPayload(form.value),
          email: form.value.email.trim(),
          createdAt: Date.now()
        })

        await signOut(secondaryAuth)
      } finally {
        await deleteApp(secondaryApp)
      }

      showToast('USUARIO CREADO')
    }

    await loadUsers()

    if (isEditing.value) {
      showPanel.value = false
    } else {
      form.value = {
        id: null,
        name: '',
        email: '',
        password: '',
        description: '',
        imageUrl: '',
        role: 'user',
        canChat: false
      }
    }
  } catch (error) {
    console.error(error)
    showToast(error.code === 'auth/email-already-in-use' ? 'EL EMAIL YA EXISTE' : 'NO SE PUDO GUARDAR', 'delete')
  } finally {
    isSaving.value = false
  }
}

const userPayload = (source) => ({
  name: source.name.trim(),
  description: source.description.trim(),
  imageUrl: source.imageUrl.trim(),
  role: source.role,
  canChat: ['admin', 'publisher'].includes(source.role) || Boolean(source.canChat),
  emailOptIn: true,
  updatedAt: Date.now()
})

const openDirectChat = (user) => {
  if (!canUseChat.value) return

  window.dispatchEvent(new CustomEvent('open-direct-chat', {
    detail: {
      id: user.id,
      name: user.name || user.email || 'Usuario',
      email: user.email || '',
      imageUrl: user.imageUrl || ''
    }
  }))
}

const triggerDelete = (user) => {
  confirmDialog.value = { show: true, user }
}

const executeDelete = async () => {
  if (!canManageUsers.value || !confirmDialog.value.user || isDeleting.value) return

  isDeleting.value = true

  try {
    await deleteDoc(doc(db, 'users', confirmDialog.value.user.id))
    users.value = users.value.filter(u => u.id !== confirmDialog.value.user.id)
    confirmDialog.value.show = false
    showToast('USUARIO ELIMINADO', 'delete')
  } catch (error) {
    console.error(error)
    showToast('NO SE PUDO ELIMINAR', 'delete')
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  await loadUsers()
  if (route.query.create === 'user' && canManageUsers.value) openCreate()
})

watch(() => route.query.create, (createTarget) => {
  if (createTarget === 'user' && canManageUsers.value) openCreate()
})

watch([showPanel, () => confirmDialog.value.show], ([isPanelOpen, isConfirmOpen]) => {
  document.body.style.overflow = isPanelOpen || isConfirmOpen ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.users-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.user-card {
  align-items: center;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px 1fr auto;
  padding: 14px;
  transition: all 0.2s ease;
}

.user-card:hover {
  box-shadow: 0 8px 15px rgba(0,0,0,0.04);
  transform: translateY(-2px);
}

.user-card img {
  border-radius: 50%;
  height: 48px;
  object-fit: cover;
  width: 48px;
}

.user-info {
  min-width: 0;
}

.user-row {
  align-items: center;
  display: flex;
  gap: 8px;
}

.user-row h3 {
  color: #1f2937;
  font-size: 13px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info p {
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info small {
  color: #9ca3af;
  display: block;
  font-size: 10px;
  font-weight: 800;
  margin-top: 4px;
}

.role-pill {
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
  padding: 3px 7px;
  text-transform: uppercase;
}

.role-pill.admin {
  background: #f3e8ff;
  color: #7c3aed;
}

.role-pill.user {
  background: #e0f2fe;
  color: #0284c7;
}

.role-pill.publisher {
  background: #dcfce7;
  color: #16a34a;
}

.user-actions {
  display: flex;
  gap: 6px;
}

.side-panel-backdrop {
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(16px);
  inset: 0;
  position: fixed;
  z-index: 2000;
}

.user-panel {
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.26);
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100dvh - 48px));
  left: 50%;
  max-width: 720px;
  position: fixed;
  right: auto;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(100vw - 32px);
  z-index: 2001;
  overflow: hidden;
}

.panel-top {
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  padding: 24px;
}

.panel-top h2 {
  color: #1f2937;
  font-size: 14px;
  font-weight: 900;
  text-transform: uppercase;
}

.panel-top p {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
  margin-top: 3px;
}

.panel-body {
  display: grid;
  flex: 1;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
}

.panel-body .field:nth-child(4),
.panel-body .field:nth-child(5),
.panel-body .chat-toggle {
  grid-column: 1 / -1;
}

.panel-footer {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  margin-top: auto;
  padding: 24px 24px max(24px, env(safe-area-inset-bottom));
}

.field {
  color: #64748b;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  text-transform: uppercase;
}

.field input,
.field textarea,
.field select {
  background: #f9fafb;
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

.field input::placeholder,
.field textarea::placeholder {
  color: #94a3b8;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px #f3e8ff;
}

.chat-toggle {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 12px;
  grid-template-columns: 18px minmax(0, 1fr);
  padding: 12px;
}

.chat-toggle input {
  accent-color: #7c3aed;
  height: 18px;
  width: 18px;
}

.chat-toggle strong {
  color: #111827;
  display: block;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.chat-toggle small {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 3px;
}

.panel-loading-cover {
  align-items: center;
  background: rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(10px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: absolute;
  z-index: 5;
}

.panel-loading-cover :deep(.galaxy-loader) {
  min-height: min(340px, calc(100dvh - 80px));
  max-width: 500px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 24px));
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@media (max-width: 760px) {
  .panel-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .panel-header button {
    justify-content: center;
    width: 100%;
  }

  .users-grid {
    grid-template-columns: 1fr;
  }

  .user-panel {
    border-radius: 18px;
    bottom: auto;
    height: min(720px, calc(100svh - 32px));
    left: 50%;
    max-width: none;
    right: auto;
    top: 50%;
    transform: translate(-50%, -50%);
    width: calc(100vw - 32px);
  }

  .panel-top,
  .panel-body,
  .panel-footer {
    padding: 18px;
  }

  .panel-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .slide-enter-from {
    transform: translateY(24px);
  }
}

@media (max-width: 520px) {
  .user-card {
    align-items: start;
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .user-card img {
    height: 42px;
    width: 42px;
  }

  .user-actions {
    grid-column: 2;
  }

  .user-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
}
</style>
