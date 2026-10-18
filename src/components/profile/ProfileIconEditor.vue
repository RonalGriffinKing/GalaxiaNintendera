<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import ProfileAvatar from './ProfileAvatar.vue'
const profileDraft = defineModel('profileDraft', { type: Object, required: true })
const uploadIconDraft = defineModel('uploadIconDraft', { type: Object, required: true })
const props = defineProps({ startSystems: Boolean, systemsBusy: Boolean, profile: Object, profileIcon: String, profileIconMeta: Object, panelOpen: Boolean, uploadOpen: Boolean, editMessage: String, isSavingProfile: Boolean, isUploadingIcon: Boolean, editingIconId: String, uploadIconPreview: String, uploadIconMessage: String, iconFilters: Array })
const systemsOpen = ref(false)
let previousFocus
watch(() => props.panelOpen, async open => {
 if (!open) return
 previousFocus = document.activeElement
 systemsOpen.value = props.startSystems
 await nextTick()
 document.getElementById(props.startSystems ? 'profile-systems-toggle' : 'profile-edit-name')?.focus()
}, {immediate:true})
onUnmounted(() => {if(previousFocus?.isConnected)previousFocus.focus()})
function trapProfileFocus(event) {
 if (event.key !== 'Tab') return
 const elements = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]')].filter(element => element.getClientRects().length)
 const first = elements[0], last = elements.at(-1)
 if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus()}
 else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus()}
}
const emit = defineEmits(['close-panel', 'close-upload', 'save-profile', 'open-rewards', 'save-uploaded-icon'])
</script>
<template>
<Teleport to="body">
<div v-if="panelOpen" class="icon-upload-backdrop" @click.self="!isSavingProfile && !systemsBusy && emit('close-panel')">
<section class="icon-upload-card profile-edit-card" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" @keydown="trapProfileFocus" @keydown.esc.stop="!isSavingProfile && !systemsBusy && emit('close-panel')">
 <button class="icon-modal-close" type="button" aria-label="Cerrar editor del perfil" :disabled="isSavingProfile || systemsBusy" @click="emit('close-panel')">×</button>
 <header class="profile-editor-head"><span>TU ESPACIO EN LA GALAXIA</span><h2 id="edit-profile-title">Editar perfil</h2><p>Tu identidad, tus redes y tus sistemas de juego.</p></header>
 <div v-show="!systemsOpen" class="profile-edit-form">
  <div class="profile-identity-grid">
   <div class="profile-edit-avatar"><ProfileAvatar class="profile-edit-avatar-preview" :src="profileIcon" :alt="profile.name" :effect="profileIconMeta" /><button type="button" :disabled="isSavingProfile" @click="emit('open-rewards')"><i class="fas fa-images" aria-hidden="true"></i> Cambiar icono</button><small>Elige uno de tu colección</small></div>
   <div class="profile-identity-fields"><label for="profile-edit-name"><span>Nombre<small>{{ (profileDraft.name || '').length }}/24</small></span><input id="profile-edit-name" v-model="profileDraft.name" maxlength="24" autocomplete="nickname" /></label><label for="profile-edit-description"><span>Descripción<small>{{ (profileDraft.description || '').length }}/140</small></span><textarea id="profile-edit-description" v-model="profileDraft.description" maxlength="140" rows="3" placeholder="Cuéntale a la galaxia algo sobre ti"></textarea></label></div>
  </div>
  <section class="profile-social-editor"><h3>Redes sociales</h3><p>Los enlaces aparecerán en la cabecera de tu perfil.</p><div class="social-edit-grid modal-social-grid"><label><span><i class="fab fa-tiktok" aria-hidden="true"></i> TikTok</span><input v-model="profileDraft.socialLinks.tiktok" type="url" placeholder="https://www.tiktok.com/@usuario" /></label><label><span><i class="fab fa-youtube" aria-hidden="true"></i> YouTube</span><input v-model="profileDraft.socialLinks.youtube" type="url" placeholder="https://www.youtube.com/@canal" /></label><label><span><i class="fab fa-twitch" aria-hidden="true"></i> Twitch</span><input v-model="profileDraft.socialLinks.twitch" type="url" placeholder="https://www.twitch.tv/usuario" /></label></div></section>
 </div>
 <button id="profile-systems-toggle" class="profile-systems-toggle" type="button" :disabled="isSavingProfile || systemsBusy" :aria-expanded="systemsOpen" aria-controls="profile-connected-systems" @click="systemsOpen=!systemsOpen"><i :class="systemsOpen ? 'fas fa-arrow-left' : 'fas fa-plug'" aria-hidden="true"></i><span><strong>{{ systemsOpen ? 'Volver a mis datos' : 'Conectar sistemas' }}</strong><small>{{ systemsOpen ? 'Nombre, descripción y redes sociales' : 'Nintendo Switch · Xbox · Steam' }}</small></span><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
 <section v-if="systemsOpen" id="profile-connected-systems" aria-label="Conectar sistemas"><slot name="systems" /></section>
 <footer class="profile-edit-actions modal-edit-actions"><p v-if="editMessage" role="status">{{ editMessage }}</p><button v-if="!systemsOpen" type="button" :disabled="isSavingProfile || systemsBusy" @click="emit('save-profile')">{{ isSavingProfile ? 'Guardando…' : 'Guardar cambios' }}</button></footer>
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

.profile-edit-card{width:min(100%,780px);box-sizing:border-box;gap:22px;background:var(--surface-elevated,#101329)}
.profile-editor-head{padding-right:24px}.profile-editor-head>span{font-size:10px;font-weight:800;letter-spacing:.12em;color:var(--accent,#a855f7)}.profile-editor-head h2{margin:7px 0 8px}.profile-editor-head p{font-size:13px;margin:0;line-height:1.5}
.profile-identity-grid{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;align-items:center}.profile-identity-fields{display:grid;gap:16px}.profile-edit-card .profile-edit-avatar{gap:12px;padding:16px 10px;border:1px solid var(--border,#a855f733);border-radius:14px;background:var(--surface,#7c3aed08)}.profile-edit-card .profile-edit-avatar-preview{--avatar-size:92px}.profile-edit-card .profile-edit-avatar>button{padding:8px;font-size:12px;min-height:36px}.profile-edit-avatar>small{font-size:10px;text-align:center}.profile-edit-card label{font-size:13px}.profile-edit-card label small{font-size:11px;font-weight:400}.profile-edit-card input,.profile-edit-card textarea{box-sizing:border-box;min-width:0}.profile-edit-card textarea{min-height:100px}.profile-social-editor{border-top:1px solid var(--border,#a855f733);padding-top:18px}.profile-social-editor h3{font-size:15px;margin:0 0 5px}.profile-social-editor>p{font-size:12px;margin:0 0 14px}.profile-edit-card .modal-social-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.profile-edit-card .modal-social-grid label span{justify-content:start;align-items:center;gap:7px}.profile-edit-card .modal-social-grid input{font-size:12px;padding:10px}.profile-edit-card .profile-systems-toggle{display:flex;align-items:center;gap:12px;text-align:left;border:1px solid var(--border,#a855f744);background:linear-gradient(110deg,#7c3aed16,#db277710);padding:16px}.profile-systems-toggle>span{flex:1;display:grid;gap:5px}.profile-systems-toggle small{font-size:11px;font-weight:400}.profile-systems-toggle>i:first-child{font-size:20px;color:var(--accent,#a855f7)}.profile-edit-card :focus-visible{outline:2px solid var(--accent,#c084fc);outline-offset:3px}.profile-edit-card .icon-modal-close{border:1px solid var(--border,#a855f733);width:34px;height:34px;min-height:34px;padding:0}.profile-edit-card .modal-edit-actions{margin:0}.profile-edit-card #profile-connected-systems{min-width:0}
@media(max-width:600px){.profile-identity-grid{grid-template-columns:minmax(0,1fr);gap:18px}.profile-edit-card .profile-edit-avatar{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}.profile-edit-card .profile-edit-avatar>button{width:auto}.profile-edit-card .profile-edit-avatar>small{width:100%}.profile-edit-card .modal-social-grid{grid-template-columns:minmax(0,1fr)}.profile-edit-card{gap:18px;padding:20px;max-height:calc(100dvh - 24px)}.profile-edit-card .profile-edit-avatar-preview{--avatar-size:72px}}
</style>
