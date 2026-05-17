<script setup>
import { ref } from 'vue'

const profileDraft = defineModel('profileDraft', {
  type: Object,
  required: true
})
const iconSearch = defineModel('iconSearch', {
  type: String,
  default: ''
})
const iconFilter = defineModel('iconFilter', {
  type: String,
  default: 'Todos'
})
const mobileEditorTab = defineModel('mobileEditorTab', {
  type: String,
  default: 'details'
})
const uploadIconDraft = defineModel('uploadIconDraft', {
  type: Object,
  required: true
})

defineProps({
  profile: { type: Object, required: true },
  profileIcon: { type: String, default: '' },
  collectionOpen: { type: Boolean, default: false },
  panelOpen: { type: Boolean, default: false },
  uploadOpen: { type: Boolean, default: false },
  confirmRedeem: { type: Object, default: null },
  redeemedProfileIcons: { type: Array, default: () => [] },
  groupedRedeemedIcons: { type: Array, default: () => [] },
  iconFilters: { type: Array, default: () => [] },
  filteredIconCatalog: { type: Array, default: () => [] },
  mobileIconCatalog: { type: Array, default: () => [] },
  mobileIconPage: { type: Number, default: 0 },
  mobileIconPageCount: { type: Number, default: 1 },
  effectiveUnlockedIcons: { type: Array, default: () => [] },
  testUnlockedIcons: { type: Array, default: () => [] },
  iconTestMode: { type: Boolean, default: false },
  isAdminOwnProfile: { type: Boolean, default: false },
  message: { type: String, default: '' },
  editMessage: { type: String, default: '' },
  isSavingProfile: { type: Boolean, default: false },
  isSavingIcon: { type: Boolean, default: false },
  isRedeeming: { type: Boolean, default: false },
  isDeletingIcon: { type: Boolean, default: false },
  isUploadingIcon: { type: Boolean, default: false },
  redeemingIcon: { type: String, default: '' },
  deniedIcon: { type: String, default: '' },
  unlockBurst: { type: String, default: '' },
  displayStars: { type: Number, default: 0 },
  isSpending: { type: Boolean, default: false },
  previewIcon: { type: Object, required: true },
  previewIconEquipped: { type: Boolean, default: false },
  manageableProfileIcons: { type: Array, default: () => [] },
  editingIconId: { type: String, default: '' },
  uploadIconPreview: { type: String, default: '' },
  uploadIconMessage: { type: String, default: '' },
  iconState: { type: Function, required: true },
  iconCost: { type: Function, required: true },
  iconSaga: { type: Function, required: true },
  managedIconVisible: { type: Function, required: true }
})

const emit = defineEmits([
  'close-collection',
  'close-panel',
  'close-upload',
  'save-profile',
  'toggle-test-mode',
  'choose-icon',
  'change-mobile-page',
  'equip-preview',
  'upload-icon',
  'delete-icon',
  'select-managed-icon',
  'toggle-managed-visibility',
  'save-uploaded-icon',
  'close-redeem',
  'confirm-purchase'
])

const walletEl = ref(null)

defineExpose({
  getWalletRect: () => walletEl.value?.getBoundingClientRect?.() || null
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="collectionOpen" class="icon-collection-backdrop" @click.self="emit('close-collection')">
      <section class="icon-collection-card">
        <button class="icon-modal-close" type="button" aria-label="Cerrar coleccion de iconos" @click="emit('close-collection')">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="icon-collection-head">
          <span class="collection-profile-avatar">
            <img :src="profileIcon" alt="" />
          </span>
          <div>
            <span class="collection-kicker">Coleccion canjeada</span>
            <h2>{{ profile.name || profile.email || 'Usuario' }}</h2>
            <p>{{ redeemedProfileIcons.length }} iconos desbloqueados por categoria</p>
          </div>
          <strong>
            <i class="fas fa-icons"></i>
            {{ redeemedProfileIcons.length }}
          </strong>
        </div>

        <div v-if="groupedRedeemedIcons.length" class="icon-collection-groups">
          <article v-for="group in groupedRedeemedIcons" :key="group.saga" class="icon-collection-group">
            <header>
              <span>{{ group.saga }}</span>
              <small>{{ group.icons.length }} iconos</small>
            </header>
            <div class="collection-icon-grid">
              <figure v-for="icon in group.icons" :key="icon.id" :class="{ equipped: profile.selectedIcon === icon.id }">
                <span>
                  <img :src="icon.src" alt="" />
                </span>
                <figcaption>
                  {{ icon.name }}
                  <em v-if="profile.selectedIcon === icon.id">Equipado</em>
                </figcaption>
              </figure>
            </div>
          </article>
        </div>

        <div v-else class="icon-collection-empty">
          <i class="fas fa-icons"></i>
          <strong>Sin iconos canjeados todavia</strong>
          <p>Cuando desbloquee iconos, apareceran aqui organizados por categoria.</p>
        </div>
      </section>
    </div>
  </Transition>

  <Transition name="modal-fade">
    <div v-if="panelOpen" class="icon-modal-backdrop" @click.self="emit('close-panel')">
      <section class="icon-modal-card">
        <button class="icon-modal-close" type="button" aria-label="Cerrar selector de iconos" @click="emit('close-panel')">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="icon-modal-head">
          <span class="icon-modal-symbol"><i class="fas fa-user-pen"></i></span>
          <div>
            <h2>Editar perfil</h2>
            <p>Ajusta tu nombre, descripcion e icono de comunidad</p>
          </div>
          <div class="icon-modal-actions">
            <div ref="walletEl" class="icon-modal-wallet" :class="{ spending: isSpending }">
              <i class="fas fa-star"></i>
              <strong>{{ displayStars }}</strong>
              <span>estrellas</span>
            </div>
            <button
              v-if="isAdminOwnProfile"
              class="icon-add-button"
              type="button"
              title="Gestionar iconos"
              aria-label="Gestionar iconos"
              @click="emit('upload-icon')"
            >
              <i class="fas fa-sliders"></i>
            </button>
          </div>
        </div>

        <nav class="mobile-editor-tabs" aria-label="Editor de perfil">
          <button type="button" :class="{ active: mobileEditorTab === 'details' }" @click="mobileEditorTab = 'details'">
            <i class="fas fa-id-card"></i>
            Datos
          </button>
          <button type="button" :class="{ active: mobileEditorTab === 'icons' }" @click="mobileEditorTab = 'icons'">
            <i class="fas fa-wand-magic-sparkles"></i>
            Iconos
          </button>
        </nav>

        <div class="profile-editor-layout">
          <aside class="profile-editor-panel" :class="{ 'mobile-hidden-panel': mobileEditorTab !== 'details' }">
            <span class="editor-avatar-preview">
              <img :src="profileIcon" alt="" />
            </span>

            <div class="profile-edit-form modal-profile-form">
              <label>
                Nombre
                <input v-model="profileDraft.name" />
              </label>

              <label>
                Descripcion
                <textarea v-model="profileDraft.description" rows="4"></textarea>
              </label>

              <div class="social-edit-grid modal-social-grid">
                <label>
                  TikTok
                  <input v-model="profileDraft.socialLinks.tiktok" placeholder="https://www.tiktok.com/@usuario" />
                </label>

                <label>
                  YouTube
                  <input v-model="profileDraft.socialLinks.youtube" placeholder="https://www.youtube.com/@canal" />
                </label>

                <label>
                  Twitch
                  <input v-model="profileDraft.socialLinks.twitch" placeholder="https://www.twitch.tv/usuario" />
                </label>
              </div>

              <div class="profile-edit-actions modal-edit-actions">
                <p v-if="editMessage">{{ editMessage }}</p>
                <button type="button" :disabled="isSavingProfile" @click="emit('save-profile')">
                  {{ isSavingProfile ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </div>
          </aside>

          <section class="icon-picker-panel" :class="{ 'mobile-hidden-panel': mobileEditorTab !== 'icons' }">
            <div class="icon-modal-toolbar">
              <label class="icon-search-box">
                <i class="fas fa-search"></i>
                <input v-model="iconSearch" placeholder="Buscar icono..." />
              </label>

              <div class="icon-filter-row">
                <button
                  v-for="filter in iconFilters"
                  :key="filter"
                  type="button"
                  :class="{ active: iconFilter === filter }"
                  @click="iconFilter = filter"
                >
                  {{ filter }}
                </button>
              </div>
            </div>

            <div class="icon-modal-layout">
              <div class="icon-modal-list">
                <strong>Todos los iconos</strong>

                <div v-if="isAdminOwnProfile" class="icon-test-panel" :class="{ active: iconTestMode }">
                  <button
                    type="button"
                    :aria-pressed="iconTestMode"
                    :title="iconTestMode ? 'Desactivar modo test de canjes' : 'Activar modo test de canjes'"
                    @click="emit('toggle-test-mode')"
                  >
                    <i :class="iconTestMode ? 'fas fa-toggle-on' : 'fas fa-toggle-off'"></i>
                    Test
                  </button>
                </div>

                <p v-if="message" class="profile-message soft">{{ message }}</p>

                <div class="icon-grid compact modal-icons desktop-icon-grid">
                  <button
                    v-for="icon in filteredIconCatalog"
                    :key="icon.id"
                    class="icon-card"
                    :class="{
                      locked: !effectiveUnlockedIcons.includes(icon.id),
                      test: iconTestMode && testUnlockedIcons.includes(icon.id),
                      selected: previewIcon.id === icon.id,
                      saved: profile.selectedIcon === icon.id,
                      denied: deniedIcon === icon.id,
                      redeeming: redeemingIcon === icon.id,
                      burst: unlockBurst === icon.id
                    }"
                    :aria-label="`${icon.name} - ${iconState(icon)}`"
                    type="button"
                    @click="emit('choose-icon', icon, $event)"
                  >
                    <span v-if="redeemingIcon === icon.id" class="redeem-fill" aria-hidden="true">
                      <i></i>
                    </span>
                    <span class="icon-art">
                      <img :src="icon.src" alt="" />
                    </span>
                    <span v-if="!effectiveUnlockedIcons.includes(icon.id)" class="lock-badge" aria-hidden="true">
                      <i class="fas fa-lock"></i>
                    </span>
                    <small>
                      <i v-if="!effectiveUnlockedIcons.includes(icon.id)" class="fas fa-star"></i>
                      {{ effectiveUnlockedIcons.includes(icon.id) ? iconState(icon) : iconCost(icon) }}
                    </small>
                  </button>
                </div>

                <div class="icon-grid compact modal-icons mobile-icon-grid">
                  <button
                    v-for="icon in mobileIconCatalog"
                    :key="icon.id"
                    class="icon-card"
                    :class="{
                      locked: !effectiveUnlockedIcons.includes(icon.id),
                      test: iconTestMode && testUnlockedIcons.includes(icon.id),
                      selected: previewIcon.id === icon.id,
                      saved: profile.selectedIcon === icon.id,
                      denied: deniedIcon === icon.id,
                      redeeming: redeemingIcon === icon.id,
                      burst: unlockBurst === icon.id
                    }"
                    :aria-label="`${icon.name} - ${iconState(icon)}`"
                    type="button"
                    @click="emit('choose-icon', icon, $event)"
                  >
                    <span v-if="redeemingIcon === icon.id" class="redeem-fill" aria-hidden="true">
                      <i></i>
                    </span>
                    <span class="icon-art">
                      <img :src="icon.src" alt="" />
                    </span>
                    <span v-if="!effectiveUnlockedIcons.includes(icon.id)" class="lock-badge" aria-hidden="true">
                      <i class="fas fa-lock"></i>
                    </span>
                    <small>
                      <i v-if="!effectiveUnlockedIcons.includes(icon.id)" class="fas fa-star"></i>
                      {{ effectiveUnlockedIcons.includes(icon.id) ? iconState(icon) : iconCost(icon) }}
                    </small>
                  </button>
                </div>

                <div class="mobile-icon-pager">
                  <button type="button" aria-label="Iconos anteriores" @click="emit('change-mobile-page', -1)">
                    <i class="fas fa-chevron-left"></i>
                  </button>
                  <span>{{ mobileIconPage + 1 }} / {{ mobileIconPageCount }}</span>
                  <button type="button" aria-label="Iconos siguientes" @click="emit('change-mobile-page', 1)">
                    <i class="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>

              <aside class="icon-preview-panel">
                <h3>Vista previa</h3>
                <span class="preview-large-avatar">
                  <img :src="previewIcon.src" alt="" />
                </span>
                <strong>{{ previewIcon.name }}</strong>
                <small>{{ iconSaga(previewIcon) }}</small>
                <p>{{ previewIconEquipped ? 'Este icono esta equipado ahora mismo.' : (effectiveUnlockedIcons.includes(previewIcon.id) ? 'Icono desbloqueado para tu perfil.' : `Necesitas ${iconCost(previewIcon)} estrellas para desbloquearlo.`) }}</p>
                <button
                  type="button"
                  :class="{ equipped: previewIconEquipped }"
                  :disabled="isSavingIcon || isRedeeming || previewIconEquipped"
                  @click="emit('confirm-purchase', $event)"
                >
                  <i :class="previewIconEquipped ? 'fas fa-check' : (effectiveUnlockedIcons.includes(previewIcon.id) ? 'fas fa-shirt' : 'fas fa-star')"></i>
                  {{ previewIconEquipped ? 'Icono equipado' : (effectiveUnlockedIcons.includes(previewIcon.id) ? 'Equipar icono' : 'Desbloquear icono') }}
                </button>
                <div v-if="isAdminOwnProfile && !previewIcon.builtIn" class="icon-preview-actions">
                  <button type="button" :disabled="isDeletingIcon" @click="emit('edit-icon', previewIcon)">
                    <i class="fas fa-pen"></i>
                    Editar
                  </button>
                  <button type="button" class="danger" :disabled="isDeletingIcon" @click="emit('delete-icon')">
                    <i class="fas fa-trash"></i>
                    {{ isDeletingIcon ? 'Ocultando...' : 'Ocultar' }}
                  </button>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </section>
    </div>
  </Transition>

  <Transition name="modal-fade">
    <div v-if="uploadOpen" class="icon-upload-backdrop" @click.self="emit('close-upload')">
      <section class="icon-upload-card">
        <button class="icon-modal-close" type="button" aria-label="Cerrar gestion de iconos" @click="emit('close-upload')">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="icon-modal-head upload-head">
          <span class="icon-modal-symbol"><i class="fas fa-sliders"></i></span>
          <div>
            <h2>Gestionar iconos</h2>
            <p>Toca el ojo para mostrar u ocultar, ajusta datos y guarda</p>
          </div>
        </div>

        <div class="icon-upload-layout">
          <div class="icon-manage-list">
            <div
              v-for="icon in manageableProfileIcons"
              :key="icon.id"
              :class="{ selected: editingIconId === icon.id, visible: managedIconVisible(icon) }"
              @click="emit('select-managed-icon', icon)"
            >
              <img :src="icon.src" alt="" />
              <span>
                <strong>{{ icon.name }}</strong>
                <small>{{ icon.sourcePath || iconSaga(icon) }}</small>
              </span>
              <span class="icon-manage-actions">
                <button
                  type="button"
                  :aria-label="managedIconVisible(icon) ? 'Ocultar icono' : 'Mostrar icono'"
                  :title="managedIconVisible(icon) ? 'Ocultar para todos' : 'Mostrar para todos'"
                  @click.stop="emit('toggle-managed-visibility', icon)"
                >
                  <i :class="managedIconVisible(icon) ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
                </button>
              </span>
            </div>
            <p v-if="!manageableProfileIcons.length" class="profile-message soft">
              Crea carpetas como src/iconos/profileIcons/Mario y sube ahi tus PNG, JPG o WEBP.
            </p>
          </div>

          <div class="icon-upload-form">
            <label>
              Nombre
              <input v-model="uploadIconDraft.name" :disabled="!editingIconId" placeholder="Mario Fuego" />
            </label>

            <label>
              Categoria
              <select v-model="uploadIconDraft.saga" :disabled="!editingIconId">
                <option v-for="filter in iconFilters.filter(item => item !== 'Todos')" :key="filter" :value="filter">
                  {{ filter }}
                </option>
              </select>
            </label>

            <label>
              Coste en estrellas
              <input v-model.number="uploadIconDraft.cost" :disabled="!editingIconId" type="number" min="0" step="1" />
            </label>

            <aside class="icon-upload-mini-preview">
              <span class="preview-large-avatar">
                <img v-if="uploadIconPreview" :src="uploadIconPreview" alt="" />
                <i v-else class="fas fa-wand-magic-sparkles"></i>
              </span>
              <strong>{{ uploadIconDraft.name || 'Nuevo icono' }}</strong>
              <small>{{ uploadIconDraft.saga }} Â· {{ Math.max(0, Number(uploadIconDraft.cost || 0)) }} estrellas</small>
            </aside>

            <p v-if="uploadIconMessage" class="profile-message soft">{{ uploadIconMessage }}</p>
            <button type="button" :disabled="isUploadingIcon || !editingIconId" @click="emit('save-uploaded-icon')">
              <i class="fas fa-floppy-disk"></i>
              {{ isUploadingIcon ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Transition>

  <Transition name="modal-fade">
    <div v-if="confirmRedeem" class="redeem-confirm-backdrop" @click.self="emit('close-redeem')">
      <section class="redeem-confirm">
        <button class="redeem-close" type="button" aria-label="Cerrar" @click="emit('close-redeem')">
          <i class="fas fa-xmark"></i>
        </button>

        <span class="redeem-confirm-icon">
          <img :src="confirmRedeem.icon.src" alt="" />
          <i class="fas fa-crown"></i>
        </span>

        <div>
          <span>Confirmar canje</span>
          <h2>Seguro que quieres canjear?</h2>
          <p>Vas a gastar {{ iconCost(confirmRedeem.icon) }} estrellas. Esta accion no se puede revertir.</p>
        </div>

        <div class="redeem-confirm-actions">
          <button type="button" class="cancel-redeem" :disabled="isRedeeming" @click="emit('close-redeem')">
            Cancelar
          </button>
          <button type="button" class="confirm-redeem" :disabled="isRedeeming" @click="emit('confirm-purchase')">
            {{ isRedeeming ? 'Canjeando...' : `Canjear por ${iconCost(confirmRedeem.icon)}` }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.icon-modal-backdrop,
.icon-collection-backdrop,
.icon-upload-backdrop,
.redeem-confirm-backdrop {
  align-items: center;
  background: rgba(3, 7, 18, 0.74);
  backdrop-filter: blur(14px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2100;
}

.icon-modal-card,
.icon-collection-card,
.icon-upload-card,
.redeem-confirm {
  background:
    radial-gradient(circle at 14% 0%, rgba(168, 85, 247, 0.18), transparent 34%),
    linear-gradient(145deg, rgba(10, 15, 34, 0.98), rgba(24, 16, 50, 0.98));
  border: 1px solid rgba(216, 180, 254, 0.18);
  border-radius: 24px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.38);
  color: #f8fafc;
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  padding: 22px;
  position: relative;
  width: min(1120px, calc(100vw - 28px));
}

.icon-modal-close,
.redeem-close {
  align-items: center;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 40px;
  justify-content: center;
  position: absolute;
  right: 16px;
  top: 16px;
  width: 40px;
  z-index: 3;
}

.icon-modal-head,
.icon-collection-head {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding-right: 46px;
}

.icon-modal-symbol,
.collection-profile-avatar {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 18px;
  color: #ffffff;
  display: flex;
  height: 58px;
  justify-content: center;
  overflow: hidden;
  width: 58px;
}

.collection-profile-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.icon-modal-head h2,
.icon-collection-head h2 {
  color: #ffffff;
  font-size: 24px;
  font-weight: 950;
}

.icon-modal-head p,
.icon-collection-head p {
  color: #aeb8d3;
  font-size: 13px;
  font-weight: 800;
  margin-top: 4px;
}

.collection-kicker {
  color: #c084fc;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.icon-collection-head > strong,
.icon-modal-wallet {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  display: grid;
  gap: 2px;
  justify-items: center;
  min-width: 84px;
  padding: 10px 12px;
}

.icon-modal-wallet.spending {
  animation: walletSpend 0.55s ease;
}

.icon-modal-wallet i,
.icon-collection-head > strong i {
  color: #facc15;
}

.icon-modal-wallet strong,
.icon-collection-head > strong {
  color: #ffffff;
  font-size: 20px;
  font-weight: 950;
}

.icon-modal-wallet span {
  color: #fde68a;
  font-size: 9px;
  font-weight: 950;
  text-transform: uppercase;
}

.icon-modal-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}

.icon-add-button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.mobile-editor-tabs,
.mobile-icon-grid,
.mobile-icon-pager {
  display: none;
}

.profile-editor-layout {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  margin-top: 20px;
}

.profile-editor-panel,
.icon-picker-panel {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 16px;
}

.editor-avatar-preview,
.preview-large-avatar {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 22px;
  display: block;
  height: 96px;
  margin: 0 auto 14px;
  overflow: hidden;
  width: 96px;
}

.editor-avatar-preview img,
.preview-large-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.modal-profile-form,
.icon-upload-form {
  display: grid;
  gap: 12px;
}

.modal-profile-form label,
.icon-upload-form label {
  color: #cbd5e1;
  display: grid;
  font-size: 10px;
  font-weight: 950;
  gap: 6px;
  text-transform: uppercase;
}

.modal-profile-form input,
.modal-profile-form textarea,
.icon-upload-form input,
.icon-upload-form select {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 13px;
  color: #ffffff;
  font-weight: 850;
  min-height: 40px;
  outline: none;
  padding: 0 12px;
}

.modal-profile-form textarea {
  min-height: 92px;
  padding: 12px;
  resize: vertical;
}

.modal-social-grid {
  display: grid;
  gap: 10px;
}

.modal-edit-actions {
  display: grid;
  gap: 8px;
}

.modal-edit-actions p,
.profile-message {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 850;
}

.modal-edit-actions button,
.icon-upload-form > button,
.icon-preview-panel button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 13px;
  color: #ffffff;
  font-weight: 950;
  min-height: 42px;
}

.icon-modal-toolbar {
  display: grid;
  gap: 10px;
}

.icon-search-box {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #c084fc;
  display: flex;
  gap: 10px;
  min-height: 42px;
  padding: 0 13px;
}

.icon-search-box input {
  background: transparent;
  border: 0;
  color: #ffffff;
  min-width: 0;
  outline: none;
  width: 100%;
}

.icon-filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.icon-filter-row button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #cbd5e1;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  min-height: 32px;
  padding: 0 12px;
}

.icon-filter-row button.active {
  background: rgba(168, 85, 247, 0.28);
  color: #ffffff;
}

.icon-modal-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  margin-top: 14px;
}

.icon-modal-list > strong {
  color: #ffffff;
  display: block;
  font-size: 13px;
  font-weight: 950;
  margin-bottom: 10px;
}

.icon-test-panel {
  margin-bottom: 10px;
}

.icon-test-panel button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #cbd5e1;
  font-weight: 950;
  min-height: 32px;
  padding: 0 12px;
}

.modal-icons {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  max-height: 440px;
  overflow-y: auto;
  padding-right: 4px;
}

.icon-card {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 112px;
  overflow: hidden;
  padding: 10px;
  position: relative;
}

.icon-card.selected {
  border-color: rgba(192, 132, 252, 0.72);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.18);
}

.icon-card.locked .icon-art {
  filter: grayscale(0.65);
  opacity: 0.58;
}

.icon-card.saved::after {
  background: #22c55e;
  border-radius: 999px;
  color: #ffffff;
  content: 'Equipado';
  font-size: 9px;
  font-weight: 950;
  padding: 4px 7px;
  position: absolute;
  right: 7px;
  top: 7px;
}

.icon-art {
  border-radius: 14px;
  display: block;
  height: 58px;
  overflow: hidden;
  width: 58px;
}

.icon-art img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.lock-badge {
  align-items: center;
  background: rgba(15, 23, 42, 0.78);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 26px;
  justify-content: center;
  position: absolute;
  right: 8px;
  top: 8px;
  width: 26px;
}

.icon-card small {
  color: #e9d5ff;
  font-size: 11px;
  font-weight: 950;
}

.redeem-fill {
  inset: 0;
  overflow: hidden;
  position: absolute;
}

.redeem-fill i {
  background: linear-gradient(90deg, rgba(236, 72, 153, 0.34), rgba(250, 204, 21, 0.34));
  display: block;
  height: 100%;
  width: 100%;
}

.icon-preview-panel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  display: grid;
  gap: 9px;
  justify-items: center;
  padding: 16px;
  text-align: center;
}

.icon-preview-panel h3,
.icon-preview-panel strong {
  color: #ffffff;
  font-weight: 950;
}

.icon-preview-panel small,
.icon-preview-panel p {
  color: #aeb8d3;
  font-size: 12px;
  font-weight: 800;
}

.icon-preview-panel button:disabled,
.icon-upload-form > button:disabled,
.redeem-confirm-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.icon-preview-panel button.equipped {
  background: rgba(34, 197, 94, 0.28);
}

.icon-preview-actions {
  display: grid;
  gap: 8px;
  width: 100%;
}

.icon-preview-actions button.danger {
  background: #7f1d1d;
}

.icon-collection-groups,
.icon-upload-layout {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.icon-collection-group {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 14px;
}

.icon-collection-group header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.icon-collection-group header span,
.icon-collection-empty strong {
  color: #ffffff;
  font-weight: 950;
}

.icon-collection-group header small,
.icon-collection-empty p {
  color: #aeb8d3;
  font-size: 12px;
  font-weight: 800;
}

.collection-icon-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
}

.collection-icon-grid figure {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  display: grid;
  gap: 8px;
  justify-items: center;
  padding: 10px;
  text-align: center;
}

.collection-icon-grid figure.equipped {
  outline: 2px solid rgba(34, 197, 94, 0.65);
}

.collection-icon-grid figure > span {
  border-radius: 999px;
  height: 54px;
  overflow: hidden;
  width: 54px;
}

.collection-icon-grid img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.collection-icon-grid figcaption {
  color: #e5e7eb;
  font-size: 11px;
  font-weight: 850;
}

.collection-icon-grid em {
  color: #86efac;
  display: block;
  font-style: normal;
  font-weight: 950;
}

.icon-collection-empty {
  display: grid;
  gap: 8px;
  justify-items: center;
  padding: 40px 14px;
  text-align: center;
}

.icon-collection-empty i {
  color: #c084fc;
  font-size: 34px;
}

.icon-upload-layout {
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
}

.icon-manage-list {
  display: grid;
  gap: 9px;
}

.icon-manage-list > div {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #ffffff;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  padding: 8px;
}

.icon-manage-list > div.selected {
  border-color: rgba(192, 132, 252, 0.7);
}

.icon-manage-list img {
  border-radius: 12px;
  height: 44px;
  object-fit: cover;
  width: 44px;
}

.icon-manage-list strong,
.icon-manage-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-manage-list small {
  color: #aeb8d3;
  font-size: 11px;
}

.icon-manage-actions button {
  color: #c084fc;
}

.icon-upload-mini-preview {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  display: grid;
  gap: 7px;
  justify-items: center;
  padding: 14px;
  text-align: center;
}

.icon-upload-mini-preview .preview-large-avatar {
  height: 78px;
  width: 78px;
}

.icon-upload-mini-preview strong {
  color: #ffffff;
  font-weight: 950;
}

.icon-upload-mini-preview small {
  color: #aeb8d3;
  font-weight: 850;
}

.redeem-confirm {
  display: grid;
  gap: 16px;
  justify-items: center;
  max-width: 420px;
  text-align: center;
}

.redeem-confirm-icon {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 28px;
  display: block;
  height: 112px;
  overflow: hidden;
  position: relative;
  width: 112px;
}

.redeem-confirm-icon img {
  height: 136%;
  margin-left: -18%;
  margin-top: -17%;
  max-width: none;
  object-fit: cover;
  width: 136%;
}

.redeem-confirm-icon i {
  bottom: 6px;
  color: #fde68a;
  position: absolute;
  right: 8px;
}

.redeem-confirm span:not(.redeem-confirm-icon) {
  color: #c084fc;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.redeem-confirm h2 {
  color: #ffffff;
  font-size: 22px;
  font-weight: 950;
}

.redeem-confirm p {
  color: #cbd5e1;
  font-weight: 800;
  line-height: 1.45;
}

.redeem-confirm-actions {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  width: 100%;
}

.redeem-confirm-actions button {
  border-radius: 13px;
  font-weight: 950;
  min-height: 42px;
}

.cancel-redeem {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.confirm-redeem {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .redeem-confirm,
.modal-fade-leave-active .redeem-confirm {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .redeem-confirm,
.modal-fade-leave-to .redeem-confirm {
  transform: translateY(12px) scale(0.98);
}

@keyframes walletSpend {
  0%,
  100% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.06);
  }
}

@media (max-width: 760px) {
  .icon-modal-backdrop,
  .icon-collection-backdrop,
  .icon-upload-backdrop {
    align-items: stretch;
    padding: 10px;
  }

  .icon-modal-card,
  .icon-collection-card,
  .icon-upload-card {
    align-self: center;
    max-height: calc(100dvh - 20px);
    padding: 52px 14px 18px;
  }

  .icon-modal-close {
    right: 12px;
    top: 12px;
  }

  .icon-modal-head,
  .icon-collection-head {
    grid-template-columns: 46px minmax(0, 1fr);
    padding-right: 0;
  }

  .icon-modal-actions,
  .icon-collection-head > strong {
    grid-column: 1 / -1;
  }

  .mobile-editor-tabs {
    display: grid;
    gap: 8px;
    grid-template-columns: 1fr 1fr;
    margin-top: 14px;
  }

  .mobile-editor-tabs button {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    color: #cbd5e1;
    font-weight: 950;
    min-height: 38px;
  }

  .mobile-editor-tabs button.active {
    background: rgba(168, 85, 247, 0.28);
    color: #ffffff;
  }

  .profile-editor-layout,
  .icon-modal-layout,
  .icon-upload-layout {
    grid-template-columns: 1fr;
  }

  .mobile-hidden-panel {
    display: none;
  }

  .desktop-icon-grid {
    display: none;
  }

  .mobile-icon-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mobile-icon-pager {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 12px;
  }

  .mobile-icon-pager button {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    color: #ffffff;
    height: 36px;
    width: 36px;
  }

  .mobile-icon-pager span {
    color: #cbd5e1;
    font-weight: 950;
  }

  .redeem-confirm-actions {
    grid-template-columns: 1fr;
  }
}
</style>
