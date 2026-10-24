<script setup>
import ContentLoading from "@/components/shared/ContentLoading.vue"
import { computed, onUnmounted, ref, watch } from 'vue'
import { fetchNintendoSource } from '@/services/nintendoPresenceClient'
import { nxapiPresenceId, nxapiProfileId, NXAPI_BASE, NXAPI_PROFILE_BASE } from '@/services/nxapiPresence'
const props = defineProps({ own: Boolean, url: { type: String, default: '' }, profileUrl: { type: String, default: '' }, identity: Object, loading: Boolean, error: String, refresh: Function, saveLink: { type: Function, required: true } })
const editing = ref(false), draft = ref(''), profileDraft = ref(''), preview = ref(null), busy = ref(false), notice = ref('')
const emit = defineEmits(['busy'])
watch(busy, value => emit('busy', value), {flush:'sync'})
onUnmounted(() => {requestId++;emit('busy',false)})
let requestId = 0
const linked = computed(() => Boolean(props.url || props.profileUrl))
const stateLabel = identity => ({ online: 'En línea', offline: 'Sin conexión', unknown: 'Estado no disponible' }[identity?.presence?.state] || 'Estado no disponible')
watch([draft, profileDraft], () => { requestId++; preview.value = null; notice.value = '' })
watch([() => props.url, () => props.profileUrl], () => { requestId++; editing.value = false; preview.value = null; notice.value = '' })
function edit() { draft.value = props.url; profileDraft.value = props.profileUrl; preview.value = null; notice.value = ''; editing.value = true }
async function inspect() {
  notice.value = ''; preview.value = null
  const currentRequest = ++requestId
  busy.value = true
  try {
    const presenceUrl = draft.value.trim() ? NXAPI_BASE + nxapiPresenceId(draft.value) : ''
    const profileUrl = profileDraft.value.trim() ? NXAPI_PROFILE_BASE + nxapiProfileId(profileDraft.value) : ''
    if (!presenceUrl && !profileUrl) throw new Error('Introduce al menos uno de los dos enlaces públicos.')
    const [presence, profile] = await Promise.all([presenceUrl ? fetchNintendoSource(presenceUrl) : null, profileUrl ? fetchNintendoSource(profileUrl, 'profile') : null])
    if (currentRequest === requestId) preview.value = { presence, profile, presenceUrl, profileUrl }
  } catch(error) { if (currentRequest === requestId) notice.value = error.message }
  finally { busy.value = false }
}
async function save(links) {
  busy.value = true; notice.value = ''
  try { await props.saveLink(links); editing.value = false; preview.value = null; notice.value = links.presenceUrl || links.profileUrl ? 'Nintendo vinculado.' : 'Vinculación eliminada.' }
  catch { notice.value = 'No se pudo guardar la vinculación. Vuelve a intentarlo.' }
  finally { busy.value = false }
}
</script>
<template>
 <div class="nintendo-link" :aria-busy="busy || loading">
  <div class="nintendo-heading"><strong>Nintendo Switch</strong><span>{{ linked ? 'Enlace público vinculado' : 'Sin vincular' }}</span></div>
  <p class="link-explanation">Enlaces a datos públicos de nxapi. No verifican tu identidad Nintendo.</p>
  <ContentLoading v-if="loading" variant="inline" /><p v-if="error" role="status">{{ error }}</p>
  <div v-if="identity && !editing" class="nintendo-account"><img v-if="identity.avatarUrl" :src="identity.avatarUrl" alt="" /><div><strong>{{ identity.displayName }}</strong><small class="nintendo-state" :class="{online:identity.presence?.state==='online'}"><span aria-hidden="true">●</span> {{ stateLabel(identity) }}</small></div></div>
  <div class="nintendo-actions account-actions">
   <button v-if="linked && !editing" class="action-refresh" type="button" :disabled="loading || busy" @click="refresh?.()"><i class="fas fa-rotate-right" aria-hidden="true"></i>Actualizar datos</button>
   <button v-if="own && !editing" :class="linked ? 'action-secondary' : 'action-primary'" type="button" :disabled="busy" @click="edit"><i :class="linked ? 'fas fa-link' : 'fas fa-plug'" aria-hidden="true"></i>{{ linked ? 'Cambiar enlaces' : 'Conectar Nintendo' }}</button>
   <button v-if="own && linked && !editing" class="action-remove" type="button" :disabled="busy" @click="save({presenceUrl:'',profileUrl:''})"><i class="far fa-trash-can" aria-hidden="true"></i>Eliminar vinculación</button>
  </div>
  <form v-if="editing && own" @submit.prevent="inspect">
   <label for="nintendo-presence-url">URL de presencia (opcional)</label>
   <input id="nintendo-presence-url" v-model="draft" type="url" maxlength="160" :disabled="busy" autocomplete="off" placeholder="https://nxapi-presence.fancy.org.uk/api/presence/…" aria-describedby="nintendo-consent" />
   <label for="nintendo-profile-url">URL del perfil público (opcional)</label>
   <input id="nintendo-profile-url" v-model="profileDraft" type="url" maxlength="160" :disabled="busy" autocomplete="off" placeholder="https://nxapi-auth.fancy.org.uk/profile/…" aria-describedby="nintendo-consent" />
   <p id="nintendo-consent">Añade uno o ambos enlaces. Presencia aporta estado y juego actual; perfil público aporta los juegos y tiempos que publique. Al confirmar serán visibles en tu perfil. No introduzcas contraseñas ni tokens.</p>
   <div class="nintendo-actions"><button class="action-primary" type="submit" :disabled="busy">{{ busy ? 'Consultando…' : 'Ver vista previa' }}</button><button type="button" :disabled="busy" @click="editing=false;preview=null">Cancelar</button></div>
   <div v-if="preview" class="nintendo-confirm"><div v-for="(account,index) in [preview.presence,preview.profile].filter(Boolean)" :key="index" class="nintendo-account"><img v-if="account.avatarUrl" :src="account.avatarUrl" alt="" /><div><strong>{{ account.displayName }}</strong><small>{{ stateLabel(account) }}</small><small v-if="account.history">{{ account.history.length }} juegos recientes · {{ account.playtime?.length || 0 }} tiempos publicados</small></div></div><p>Comprueba que estos son los perfiles públicos que quieres compartir.</p><button class="action-primary" type="button" :disabled="busy" @click="save({presenceUrl:preview.presenceUrl,profileUrl:preview.profileUrl})">Confirmar vinculación pública</button></div>
  </form>
  <p v-if="notice" role="status">{{ notice }}</p>
 </div>
</template>
<style scoped>
.nintendo-link{border:1px solid var(--border,#a855f733);border-radius:14px;padding:20px;margin-bottom:14px;min-width:0;font-family:var(--font-family-base,'Roboto',system-ui,sans-serif);font-size:14px;font-weight:400;line-height:1.5;text-shadow:none;background:linear-gradient(135deg,#7c3aed08,transparent)}
.nintendo-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.nintendo-heading>strong{font-size:15px;font-weight:600}.nintendo-heading>span{font-size:11px;font-weight:400;padding:4px 8px;border:1px solid var(--border,#a855f733);border-radius:6px;color:var(--text-secondary,#cbd5e1)}.link-explanation{font-size:12px;font-weight:400;color:var(--text-secondary,#cbd5e1);margin:8px 0 0;line-height:1.6}.nintendo-account{display:flex;gap:12px;align-items:center;margin:18px 0}.nintendo-account img{width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid #a855f733}.nintendo-account strong{font-size:16px;font-weight:600}.nintendo-account small{display:block;font-size:12px;font-weight:400;color:var(--text-secondary,#cbd5e1);margin-top:4px}.nintendo-account .nintendo-state.online{color:#10b981}.nintendo-state>span{font-size:9px;margin-right:3px}
.nintendo-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.account-actions{padding-top:16px;border-top:1px solid var(--border,#a855f733);margin-top:16px}button,input{font-family:inherit;font-weight:400;color:inherit;border:1px solid var(--border,#a855f755);border-radius:9px;background:var(--surface,#7c3aed0c)}button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:9px 12px;cursor:pointer;font-size:12px;font-weight:500;line-height:1.4;transition:background 180ms,border-color 180ms}button:hover:not(:disabled){background:#7c3aed20;border-color:#a855f780}button:disabled{opacity:.5;cursor:wait}.action-refresh{background:transparent;color:var(--text-secondary,#cbd5e1)}.action-remove{margin-left:auto;background:transparent;color:#e891a5;border-color:transparent}.action-remove:hover:not(:disabled){background:#e11d4810;border-color:#e11d4840;color:#fb7185}.action-primary{background:var(--accent,#7c3aed);border-color:transparent;color:#fff}.action-primary:hover:not(:disabled){background:color-mix(in srgb,var(--accent,#7c3aed),#fff 12%)}
label{display:block;font-size:13px;font-weight:500;margin:16px 0 8px}input{box-sizing:border-box;width:100%;min-width:0;font-size:13px;padding:11px 12px;line-height:1.5}form p{font-size:12px;font-weight:400;line-height:1.65;color:var(--text-secondary,#cbd5e1)}.nintendo-confirm{margin-top:16px;padding-top:8px;border-top:1px solid var(--border,#a855f733)}:focus-visible{outline:2px solid var(--accent,#c084fc);outline-offset:3px}[role=status]{font-size:13px;line-height:1.6}
@media(max-width:520px){.nintendo-link{padding:16px}.account-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.account-actions>button{min-width:0;padding:9px 8px}.account-actions .action-remove{grid-column:1/-1;margin:0;justify-self:start;padding-left:0}.nintendo-heading{align-items:start}.nintendo-heading>span{font-size:10px}}
@media(prefers-reduced-motion:reduce){button{transition:none}}
</style>
