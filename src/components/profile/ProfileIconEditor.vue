<script setup>
import ProfileAvatar from './ProfileAvatar.vue'
const profileDraft = defineModel('profileDraft', { type: Object, required: true })
const uploadIconDraft = defineModel('uploadIconDraft', { type: Object, required: true })
defineProps({ profile: Object, profileIcon: String, profileIconMeta: Object, panelOpen: Boolean, uploadOpen: Boolean, editMessage: String, isSavingProfile: Boolean, isUploadingIcon: Boolean, editingIconId: String, uploadIconPreview: String, uploadIconMessage: String, iconFilters: Array })
const emit = defineEmits(['close-panel', 'close-upload', 'save-profile', 'open-rewards', 'save-uploaded-icon'])
</script>
<template>
<Teleport to="body">
<div v-if="panelOpen" class="icon-upload-backdrop" @click.self="!isSavingProfile && emit('close-panel')">
<section class="icon-upload-card" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
<button class="icon-modal-close" type="button" aria-label="Cerrar" :disabled="isSavingProfile" @click="emit('close-panel')">×</button>
<h2 id="edit-profile-title">Editar perfil</h2>
<div class="profile-edit-avatar">
  <ProfileAvatar class="profile-edit-avatar-preview" :src="profileIcon" :alt="profile.name" :effect="profileIconMeta" />
  <button type="button" :disabled="isSavingProfile" @click="emit('open-rewards')">
    <i class="fas fa-images" aria-hidden="true"></i>
    Cambiar icono en Mi colección
  </button>
</div>
            <div class="profile-edit-form modal-profile-form">
              <label>
                <span>
                  Nombre
                  <small>{{ (profileDraft.name || '').length }}/24</small>
                </span>
                <input v-model="profileDraft.name" maxlength="24" />
              </label>

              <label>
                <span>
                  Descripcion
                  <small>{{ (profileDraft.description || '').length }}/140</small>
                </span>
                <textarea v-model="profileDraft.description" maxlength="140" rows="4"></textarea>
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

</section></div>
  <Transition name="modal-fade">
    <div v-if="uploadOpen" class="icon-upload-backdrop" @click.self="emit('close-upload')">
      <section class="icon-upload-card">
        <button class="icon-modal-close" type="button" aria-label="Cerrar gestion de iconos" @click="emit('close-upload')">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="icon-modal-head upload-head">
          <span class="icon-modal-symbol"><i class="fas fa-sliders"></i></span>
          <div>
            <h2>Gestionar icono</h2>
            <p>Ajusta este icono sin tocar archivos ni subir nada nuevo</p>
          </div>
        </div>

        <div class="single-icon-manage">
          <div class="icon-upload-form">
            <aside class="icon-upload-mini-preview">
              <ProfileAvatar
                class="preview-large-avatar"
                :src="uploadIconPreview"
                :alt="uploadIconDraft.name || 'Icono'"
                :effect="{ special: uploadIconDraft.special, effectColor: uploadIconDraft.effectColor }"
              />
              <strong>{{ uploadIconDraft.name || 'Icono' }}</strong>
              <small>{{ uploadIconDraft.saga }} - {{ Math.max(0, Number(uploadIconDraft.cost || 0)) }} estrellas</small>
            </aside>

            <button
              type="button"
              class="visibility-toggle"
              :class="{ hidden: !uploadIconDraft.visible }"
              :disabled="!editingIconId"
              @click="uploadIconDraft.visible = !uploadIconDraft.visible"
            >
              <i :class="uploadIconDraft.visible ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
              {{ uploadIconDraft.visible ? 'Visible en la tienda' : 'Oculto para usuarios' }}
            </button>

            <button
              type="button"
              class="special-toggle"
              :class="{ active: uploadIconDraft.special }"
              :disabled="!editingIconId"
              @click="uploadIconDraft.special = !uploadIconDraft.special"
            >
              <i class="fas fa-wand-magic-sparkles"></i>
              {{ uploadIconDraft.special ? 'Icono especial activo' : 'Marcar como especial' }}
            </button>

            <label v-if="uploadIconDraft.special" class="effect-color-field">
              Color del efecto
              <input v-model="uploadIconDraft.effectColor" type="color" :disabled="!editingIconId" />
              <span>
                <button type="button" style="--swatch: #a855f7" @click="uploadIconDraft.effectColor = '#a855f7'"></button>
                <button type="button" style="--swatch: #22c55e" @click="uploadIconDraft.effectColor = '#22c55e'"></button>
                <button type="button" style="--swatch: #ef4444" @click="uploadIconDraft.effectColor = '#ef4444'"></button>
                <button type="button" style="--swatch: #3b82f6" @click="uploadIconDraft.effectColor = '#3b82f6'"></button>
                <button type="button" style="--swatch: #f59e0b" @click="uploadIconDraft.effectColor = '#f59e0b'"></button>
              </span>
            </label>

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
            <label>Rareza visual
              <select v-model="uploadIconDraft.rarity" :disabled="!editingIconId"><option value="normal">Normal</option><option value="rare">Raro</option><option value="epic">Épico</option><option value="legendary">Legendario</option></select>
            </label>

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


</Teleport>
</template>
<style scoped>
.icon-upload-backdrop { position: fixed; inset: 0; z-index: 3500; background: #040612b8; backdrop-filter: blur(8px); display: grid; place-items: center; padding: 16px; }
.icon-upload-card { position: relative; width: min(100%, 600px); max-height: calc(100dvh - 32px); overflow: auto; padding: 28px; background: var(--surface-elevated, #181329); border: 1px solid var(--border); border-radius: 20px; color: var(--text-primary); display: grid; gap: 16px; }
h2 { font-size: 24px; }.icon-modal-close { position: absolute; right: 8px; top: 8px; }.icon-upload-form,.profile-edit-form,.social-edit-grid { display: grid; gap: 16px; }
label { display: grid; gap: 8px; } label span { display: flex; justify-content: space-between; } small,p { color: var(--text-secondary); } input,textarea,select { width: 100%; padding: 12px; min-height: 44px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-primary); } textarea { resize: vertical; }
button { min-height: 44px; padding: 10px 16px; border-radius: 10px; background: var(--surface); color: var(--text-primary); } button:disabled { opacity: .55; }.modal-edit-actions > button,.icon-upload-form > button:last-child { background: var(--accent); color: white; width: 100%; }.icon-upload-mini-preview { display: grid; justify-items: center; gap: 10px; }.effect-color-field span { display: flex; gap: 8px; }.effect-color-field span button { background: var(--swatch); width: 44px; }.icon-modal-head { padding-right: 30px; }
.profile-edit-avatar { display: grid; justify-items: center; gap: 18px; padding: 8px 0 4px; }
.profile-edit-avatar-preview { --avatar-size: 96px; }
.profile-edit-avatar > button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 1px solid var(--border); }
.icon-upload-card { font-family: var(--font-family-base, 'Roboto', system-ui, sans-serif); }
.icon-upload-card :is(button,input,textarea,select) { font-family: inherit; font-size: 14px; }
.icon-upload-card h2 { padding-right: 40px; }
@media(max-width:600px) { .icon-upload-card { padding: 20px; }.profile-edit-avatar-preview { --avatar-size: 88px; } }
</style>
