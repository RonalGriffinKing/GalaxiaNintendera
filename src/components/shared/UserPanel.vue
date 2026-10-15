<template>
  <div class="relative min-h-full">
    <div v-if="!embedded" class="panel-header">
      <div>
        <h1 class="panel-title admin-list-title admin-list-title--page">Usuarios</h1>
        <p class="panel-subtitle admin-list-subtitle">Administra quienes pueden crear contenido</p>
      </div>

      <button
        v-if="canManageUsers"
        @click="openCreate"
        class="admin-action admin-action--primary"
        type="button"
      >
        <i class="fas fa-plus"></i>
        Crear usuario
      </button>
    </div>

    <div v-if="!canManageUsers" class="admin-surface admin-surface--card mb-5">
      <p class="admin-description">
        Solo un usuario con rol admin puede crear o eliminar usuarios.
      </p>
    </div>

    <div class="users-toolbar">
      <ListControls
        v-model:search="searchQuery"
        v-model:sort="sortMode"
        v-model:page-size="userPageSize"
        search-placeholder="Buscar usuarios..."
        :sort-options="userSortOptions"
      >
        <template #filters>
          <select v-model="roleFilter" aria-label="Filtrar por rol">
            <option value="all">Todos los usuarios</option>
            <option value="admin">Administradores</option>
            <option value="publisher">Publicadores</option>
            <option value="user">Usuarios normales</option>
            <option value="blocked">Solo lectura</option>
          </select>
        </template>
      </ListControls>
    </div>

    <div v-if="isLoadingUsers" class="users-empty admin-list-state">
      <i class="fas fa-circle-notch fa-spin"></i>
      <strong>Cargando usuarios</strong>
      <span>Conectando con la base de datos...</span>
    </div>

    <div v-else-if="loadError" class="users-empty admin-list-state">
      <i class="fas fa-triangle-exclamation"></i>
      <strong>No se pudieron cargar los usuarios</strong>
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="!filteredUsers.length" class="users-empty admin-list-state">
      <i class="fas fa-magnifying-glass"></i>
      <strong>No hay usuarios con esos criterios</strong>
      <span>Prueba con otra búsqueda, filtro u ordenación.</span>
    </div>

    <div v-if="!isLoadingUsers && !loadError && filteredUsers.length" class="users-grid">
      <AdminSurface
        v-for="user in paginatedUsers"
        :key="user.id"
        class="user-card"
      >
        <img :src="profileIcon(user) || fallbackAvatar" alt="" class="profile-icon-img" />

        <div class="user-info">
          <div class="user-row">
            <h3 class="admin-card-title">{{ user.name || user.email || 'Usuario' }}</h3>
            <AdminBadge :variant="roleBadgeVariant(user.role || 'user')">
              {{ user.role || 'user' }}
            </AdminBadge>
            <AdminBadge v-if="user.emailVerified" variant="success">Verificado</AdminBadge>
            <AdminBadge v-if="user.isBlocked" variant="danger">Solo lectura</AdminBadge>
          </div>

          <p class="admin-description">{{ user.description || 'Sin descripcion' }}</p>
          <small class="admin-meta">{{ user.email || 'Sin email' }}</small>
        </div>

        <div class="user-actions">
          <button v-if="true && canManageUsers && user.id !== currentUid" class="admin-action admin-action--sm" type="button" :disabled="isSaving" @click="togglePublisher(user)">
            {{ user.role === 'publisher' ? 'Retirar publicador' : 'Nombrar publicador' }}
          </button>
          <button
            v-if="user.id !== currentUid && !user.isBlocked"
            class="admin-action admin-action--sm admin-action--icon admin-action--message"
            type="button"
            title="Enviar mensaje"
            @click="openDirectChat(user)"
          >
            <i class="fas fa-message"></i>
          </button>

          <button
            v-if="canManageUsers"
            class="admin-action admin-action--sm admin-action--icon admin-action--edit"
            type="button"
            title="Editar"
            @click="openEdit(user)"
          >
            <i class="fas fa-pen"></i>
          </button>

          <button
            v-if="canManageUsers && user.id !== currentUid"
            class="admin-action admin-action--sm admin-action--icon admin-action--danger"
            type="button"
            title="Eliminar"
            @click="triggerDelete(user)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </AdminSurface>
    </div>

    <PaginationNav
      v-if="!isLoadingUsers && !loadError && filteredUsers.length"
      :current-page="userPagination.currentPage"
      :total-pages="userPagination.totalPages"
      :total-items="userPagination.totalItems"
      :start-item="userPagination.startItem"
      :end-item="userPagination.endItem"
      :page-tokens="userPagination.pageTokens"
      item-label="usuarios"
      @page="userPager.setPage"
    />

    <AdminDialog :open="showPanel" :busy="isSaving" :title="isEditing ? 'Editar usuario' : 'Crear usuario'" :description="isEditing ? 'Actualiza perfil y rol' : 'Crea una cuenta para el panel'" size="wide" @close="closePanel">
      <fieldset class="user-form" :disabled="isSaving">
        <AdminField label="Nombre" v-slot="{ id, describedBy }"><input :id="id" :aria-describedby="describedBy" class="admin-control" data-dialog-autofocus v-model="form.name" placeholder="Ej: Marta" /></AdminField>
        <AdminField label="Email" v-slot="{ id, describedBy }"><input :id="id" :aria-describedby="describedBy" class="admin-control" v-model="form.email" type="email" placeholder="persona@email.com" :disabled="isEditing" /></AdminField>
        <AdminField v-if="!isEditing" label="Password temporal" help="Minimo 6 caracteres." v-slot="{ id, describedBy }"><input :id="id" :aria-describedby="describedBy" class="admin-control" v-model="form.password" type="password" placeholder="Minimo 6 caracteres" /></AdminField>
        <AdminField label="Descripcion" v-slot="{ id, describedBy }"><textarea :id="id" :aria-describedby="describedBy" class="admin-control" v-model="form.description" rows="3" placeholder="Ej: redactora, streamer, editor..." /></AdminField>
        <AdminField label="Icono por URL" v-slot="{ id, describedBy }"><input :id="id" :aria-describedby="describedBy" class="admin-control" v-model="form.imageUrl" placeholder="https://..." /></AdminField>
        <AdminField label="Rol" help="El permiso de publicador se gestiona mediante la accion autorizada del servidor." v-slot="{ id, describedBy }"><select :id="id" :aria-describedby="describedBy" class="admin-control" v-model="form.role" disabled><option value="user">Usuario</option><option value="publisher">Publicador</option></select></AdminField>
        <label class="admin-toggle"><input v-model="form.canChat" type="checkbox" /><span><strong>Permitir chat</strong><small>Los admins y publicadores pueden chatear siempre.</small></span></label>
        <label class="admin-toggle"><input v-model="form.emailVerified" type="checkbox" /><span><strong>Correo verificado manualmente</strong><small>Util para cuentas creadas por admin con correos internos o no reales.</small></span></label>
        <label class="admin-toggle admin-toggle--danger"><input v-model="form.isBlocked" type="checkbox" /><span><strong>Bloquear acciones</strong><small>El usuario podra leer, pero no crear hilos, comentar, chatear ni publicar acciones sociales.</small></span></label>
        <AdminField v-if="form.isBlocked" label="Motivo del bloqueo" v-slot="{ id, describedBy }"><textarea :id="id" :aria-describedby="describedBy" class="admin-control" v-model="form.blockReason" rows="2" placeholder="Ej: spam, acoso, incumplimiento de normas..." /></AdminField>
      </fieldset>
      <p v-if="toast.show && toast.type === 'error'" class="admin-field-message admin-field-message--error" role="alert">{{ toast.message }}</p>
      <div v-if="isSaving" class="panel-loading-cover">
        <GalaxyLoader compact title="Guardando usuario" text="Aplicando cambios con la pantalla de carga de la galaxia..." />
      </div>
      <template #footer>
        <button class="admin-action" type="button" :disabled="isSaving" @click="closePanel">Cancelar</button>
        <button class="admin-action admin-action--primary" type="button" @click="saveUser" :disabled="isSaving || !form.name || !form.email || (!isEditing && !form.password)" :aria-busy="isSaving">{{ isSaving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear usuario') }}</button>
      </template>
    </AdminDialog>
    <AdminConfirmDialog :open="confirmDialog.show" :busy="isDeleting" title="Eliminar usuario?" description="Se eliminara su perfil y permisos del panel. Para borrar su Auth completamente hace falta backend Admin SDK." confirm-label="Eliminar usuario" pending-label="Eliminando..." :confirm-action="executeDelete" :error="toast.show && toast.type === 'error' ? toast.message : ''" @close="confirmDialog.show = false" />

    <Teleport to="body">
      <AppNotice :visible="toast.show" :message="toast.message" :type="toast.type" />
    </Teleport>
  </div>
</template>

<script setup>
import AppNotice from '@/components/shared/AppNotice.vue'
import { roleBadgeVariant } from '@/components/shared/adminBadgeVariants'
import AdminBadge from '@/components/shared/AdminBadge.vue'
import AdminSurface from '@/components/shared/AdminSurface.vue'
import AdminField from '@/components/shared/AdminField.vue'
import AdminDialog from '@/components/shared/AdminDialog.vue'
import AdminConfirmDialog from '@/components/shared/AdminConfirmDialog.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initializeApp, deleteApp } from 'firebase/app'


import {isEditorialOwner,manageEditorial} from "@/services/editorial";
import { auth } from '@/firebase'
import {profileRequest} from '@/services/profiles'
import { resolveProfileIcon } from '@/services/profileProgress'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'
import ListControls from '@/components/shared/ListControls.vue'
import PaginationNav from '@/components/shared/PaginationNav.vue'
import { useListNavigation } from '@/composables/useListNavigation'

defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['loading', 'ready'])

const fallbackAvatar = 'https://i.pravatar.cc/120'
const profileIcon = (user) => resolveProfileIcon(user)
const route = useRoute()
const router = useRouter()

const users = ref([])
const searchQuery = ref('')
const roleFilter = ref('all')
const sortMode = ref('az')
const isLoadingUsers = ref(false)
const loadError = ref('')
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
  canChat: false,
  emailVerified: true,
  isBlocked: false,
  blockReason: ''
})

const currentUid = computed(() => auth.currentUser?.uid || '')
const canManageUsers = computed(() => isEditorialOwner(auth.currentUser))
const canUseChat = computed(() => ['admin', 'publisher'].includes(currentRole.value))
const userSortOptions = [
  { value: 'az', label: 'A-Z' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' }
]

const filteredUsers = computed(() => {
  const query = normalizeSearch(searchQuery.value)
  let list = [...users.value]

  if (roleFilter.value === 'blocked') list = list.filter(user => user.isBlocked)
  else if (roleFilter.value !== 'all') list = list.filter(user => (user.role || 'user') === roleFilter.value)

  if (query) {
    list = list.filter((user) => normalizeSearch([
      user.id,
      user.name,
      user.username,
      user.email,
      user.description,
      user.role
    ].filter(Boolean).join(' ')).includes(query))
  }

  return list.sort((a, b) => {
    if (sortMode.value === 'recent') return Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0)
    if (sortMode.value === 'oldest') return Number(a.createdAt || a.updatedAt || 0) - Number(b.createdAt || b.updatedAt || 0)
    return String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'es', { sensitivity: 'base' })
  })
})

const userPager = useListNavigation(filteredUsers, { initialPageSize: 20 })
const paginatedUsers = computed(() => userPager.pageItems.value)
const userPageSize = computed({
  get: () => userPager.pageSize.value,
  set: (value) => {
    userPager.pageSize.value = Number(value) || 20
  }
})
const userPagination = computed(() => ({
  currentPage: userPager.currentPage.value,
  totalPages: userPager.totalPages.value,
  totalItems: userPager.totalItems.value,
  startItem: userPager.startItem.value,
  endItem: userPager.endItem.value,
  pageTokens: userPager.pageTokens.value
}))

function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const loadUsers = async () => {
  isLoadingUsers.value = true
  loadError.value = ''
  try {
    {users.value=(await manageEditorial(auth.currentUser,{action:'users'})).items;currentRole.value=isEditorialOwner(auth.currentUser)?'admin':'user';return}
    
  } catch (error) {
    console.error(error)
    users.value = []
    loadError.value = 'Revisa permisos o conexion de Firestore.'
  } finally {
    isLoadingUsers.value = false
  }
}

const togglePublisher = async user => {
  if(isSaving.value)return
  isSaving.value=true
  try{await manageEditorial(auth.currentUser,{action:'publisher',id:user.id,requestId:crypto.randomUUID(),data:{enabled:user.role!=='publisher'}});await loadUsers();showToast('Permiso editorial actualizado')}
  catch{showToast('No se pudo actualizar el permiso editorial','error')}
  finally{isSaving.value=false}
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
    canChat: false,
    emailVerified: true,
    isBlocked: false,
    blockReason: ''
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
    canChat: Boolean(user.canChat),
    emailVerified: Boolean(user.emailVerified),
    isBlocked: Boolean(user.isBlocked),
    blockReason: user.blockReason || ''
  }
  showPanel.value = true
}

const closePanel = () => {
  if (isSaving.value) return
  showPanel.value = false
}

const saveUser = async () => {
 if(!canManageUsers.value||isSaving.value)return
 isSaving.value=true
 try{if(isEditing.value){const keys=['name','description','imageUrl','emailOptIn','canChat','isBlocked','blockReason','emailVerified'];await profileRequest('admin-user-update',{uid:form.value.id,...Object.fromEntries(keys.filter(k=>form.value[k]!==undefined).map(k=>[k,form.value[k]]))})}else await profileRequest('admin-user-create',{name:form.value.name.trim(),email:form.value.email.trim(),password:form.value.password,description:form.value.description||'',canChat:!!form.value.canChat,emailOptIn:form.value.emailOptIn!==false});showPanel.value=false;await loadUsers();showToast('Usuario guardado')}catch(error){showToast(error.message||'No se pudo guardar el usuario','error')}finally{isSaving.value=false}
}

const userPayload = (source) => ({
  name: source.name.trim(),
  description: source.description.trim(),
  imageUrl: source.imageUrl.trim(),
  role: source.role,
  canChat: !source.isBlocked && (['admin', 'publisher'].includes(source.role) || Boolean(source.canChat)),
  emailVerified: Boolean(source.emailVerified),
  emailVerificationRequired: !source.emailVerified,
  isBlocked: Boolean(source.isBlocked),
  blockReason: source.isBlocked ? source.blockReason.trim() : '',
  blockedAt: source.isBlocked ? Date.now() : null,
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
 if(!canManageUsers.value||!confirmDialog.value.user||isDeleting.value)return
 isDeleting.value=true
 try{await profileRequest('admin-user-delete',{uid:confirmDialog.value.user.id});confirmDialog.value.show=false;await loadUsers();showToast('Cuenta eliminada; las publicaciones se conservan')}catch(error){showToast(error.message||'No se pudo eliminar la cuenta','error')}finally{isDeleting.value=false}
}

onMounted(async () => {
  emit('loading', 'users')
  try {
    await loadUsers()
  } finally {
    emit('ready', 'users')
  }
  if (route.query.create === 'user' && canManageUsers.value) openCreate()
})

watch(() => route.query.create, (createTarget) => {
  if (createTarget === 'user' && canManageUsers.value) openCreate()
})



watch([searchQuery, roleFilter, sortMode], userPager.resetPage)


</script>

<style scoped>
.user-form { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(2, minmax(0, 1fr)); }
.user-form .admin-field:nth-child(4), .user-form .admin-field:nth-child(5), .user-form .admin-toggle { grid-column: 1 / -1; }
@media (max-width: 760px) { .user-form { grid-template-columns: minmax(0, 1fr); } }

.users-toolbar {
  margin-bottom: 16px;
}

.users-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
}

.user-card {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 48px minmax(0, 1fr) auto;
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
  gap: var(--space-2);
  flex-wrap: wrap;
}

.user-actions {
  display: flex;
  gap: 6px;
}

.panel-loading-cover {
  align-items: center;
  background: var(--admin-surface-raised);
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

.user-info .admin-description, .user-info .admin-meta { margin-top: var(--space-1); }
</style>
