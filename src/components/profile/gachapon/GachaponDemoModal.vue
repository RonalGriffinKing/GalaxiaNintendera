<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { DEMO_MODES, demoCandidates } from './demoCatalog'
import { createRewardSound } from './rewardSound'
import StarsRewardStage from './StarsRewardStage.vue'

const props = defineProps({ admin: Boolean, prepareMirror: Function, initialSaga: { type: String, default: 'all' }, stars: { type: Number, default: 0 }, icons: { type: Array, default: () => [] }, owned: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'collection', 'preview'])
const sound = createRewardSound()
const soundEnabled = ref(true)
const obsSettings = ref(false)
const obsMessage=ref('')
const obsLink=ref('')
const obsCreating=ref(false)
async function createObsLink(){if(obsCreating.value)return;obsCreating.value=true;try{obsLink.value=await props.prepareMirror();obsMessage.value='Enlace listo. OBS mostrara las aperturas iniciadas aqui.'}catch(error){obsMessage.value=error.message}finally{obsCreating.value=false}}
async function copyObsLink(){try{await navigator.clipboard.writeText(obsLink.value);obsMessage.value='Enlace copiado.'}catch{obsMessage.value='Selecciona el enlace para copiarlo manualmente.'}}
const dialog = ref(null)
const closeButton = ref(null)
const pendingReward = ref(null)
const busy = ref(false)
const mode = ref('normal')
const reward = ref(null)
const reducedMotion = ref(false)
const category = ref(props.initialSaga)
const iconSaga = icon => icon.saga || 'Especiales'
const categories = computed(() => [...new Set(props.icons.map(iconSaga))].sort((a, b) => a.localeCompare(b, 'es')))
const categoryIcons = computed(() => props.icons.filter(icon => category.value === 'all' || iconSaga(icon) === category.value))
const balance = computed(() => Number.isFinite(props.stars) ? props.stars : 0)
const modes = computed(() => DEMO_MODES.map(item => ({ ...item, candidates: demoCandidates(categoryIcons.value, props.owned, item.rarity) })))
let previousFocus
let previousOverflow
let motionQuery

function adminPreview() {
 if (!props.admin || busy.value) return
 const item = DEMO_MODES.find(item => item.rarity === mode.value) || DEMO_MODES[0]
 // Admin may preview already owned artwork; this never grants entitlement.
 preview({ ...item, candidates: demoCandidates(categoryIcons.value, [], item.rarity) })
}
function cancelPreview() { busy.value = false; pendingReward.value = null }
function preview(item) {
  if (busy.value || !item.candidates.length) return
  if (soundEnabled.value) void sound.prime()
  mode.value = item.rarity
  reward.value = null
  // A deterministic catalogue preview, never a real draw or reward entitlement.
  const candidate = item.candidates[0]
  emit('preview', { mode:item.rarity, icon:candidate })
  pendingReward.value = candidate
  busy.value = true
  if (reducedMotion.value) reveal()
}
function reveal() { if (!busy.value) return; reward.value = pendingReward.value; if (soundEnabled.value) sound.play(mode.value === 'epic'); cancelPreview() }
function onKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); return }
  if (event.key !== 'Tab') return
  const elements = [...dialog.value.querySelectorAll('button:not([disabled]), a[href]')]
  const first = elements[0], last = elements.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function onVisibility() { if (document.hidden) sound.stop(); if (document.hidden && busy.value) { cancelPreview(); reward.value = null } }
function onMotion(event) { reducedMotion.value = event.matches; if (busy.value) { cancelPreview(); reward.value = null } }
watch(() => [props.icons, props.owned], () => { cancelPreview(); reward.value = null })
watch(categories, items => { if (category.value !== 'all' && !items.includes(category.value)) category.value = 'all' })
watch(category, () => { cancelPreview(); reward.value = null })
onMounted(async () => {
  previousFocus = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', onMotion)
  document.addEventListener('visibilitychange', onVisibility)
  await nextTick()
  closeButton.value?.focus()
})
onUnmounted(() => {
  cancelPreview()
  sound.dispose()
  motionQuery?.removeEventListener('change', onMotion)
  document.removeEventListener('visibilitychange', onVisibility)
  document.body.style.overflow = previousOverflow ?? ''
  if (previousFocus?.isConnected) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="gacha-backdrop" @click.self="emit('close')">
      <section ref="dialog" class="gacha-dialog" :class="{ epic: mode === 'epic', previewing: busy }" role="dialog" aria-modal="true" aria-labelledby="gacha-title" aria-describedby="gacha-disclaimer" @keydown="onKeydown">
        <header class="gacha-header">
          <div><span class="gacha-eyebrow">Una sorpresa entre las estrellas</span><h2 id="gacha-title">Gachapon Estelar</h2></div>
          <div class="gacha-header-actions"><button class="gacha-collection" type="button" @click="emit('collection')">Ver colección</button>
          <button ref="closeButton" class="gacha-close" type="button" aria-label="Cerrar Gachapon Estelar" @click="emit('close')">×</button></div>
        </header>
        <div class="gacha-categories" role="group" aria-label="Elegir saga de iconos">
          <button type="button" :disabled="busy" :aria-pressed="category === 'all'" @click="category = 'all'">Todas</button>
          <button v-for="saga in categories" :key="saga" type="button" :disabled="busy" :aria-pressed="category === saga" @click="category = saga; $event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })">{{ saga }}</button>
        </div>
        <div class="gacha-tools"><button v-if="admin" type="button" :disabled="busy" @click="adminPreview">Probar animación (admin)</button><button type="button" :aria-pressed="soundEnabled" @click="soundEnabled = !soundEnabled; !soundEnabled && sound.stop()">{{ soundEnabled ? 'Sonido activado' : 'Sonido apagado' }}</button><button v-if="admin" type="button" :aria-expanded="obsSettings" @click="obsSettings = !obsSettings">Configuración OBS</button></div>
        <div v-if="admin && obsSettings" class="gacha-obs-settings">
          <button v-if="!obsLink" type="button" :disabled="obsCreating" @click="createObsLink">{{ obsCreating ? 'Preparando...' : 'Crear espejo OBS' }}</button>
          <template v-else><label>Enlace de solo visualizacion<input :value="obsLink" readonly @focus="$event.target.select()" /></label><button type="button" @click="copyObsLink">Copiar enlace OBS</button></template>
          <p role="status">{{ obsMessage || 'Sin claves. El enlace solo muestra la animacion; no permite canjear.' }}</p>
        </div>
        <div class="gacha-wallet"><span>Tu saldo actual</span><strong><span aria-hidden="true">★</span> {{ balance }} <small>estrellas</small></strong></div>
        <p id="gacha-disclaimer" class="gacha-disclaimer">Demostración · No se han gastado estrellas ni añadido iconos.</p>
        <div class="gacha-stage">
          <StarsRewardStage :busy="busy" :reward="reward" :mode="mode" @complete="reveal" @hidden="cancelPreview" />
        </div>
        <div class="gacha-options">
          <div v-for="item in modes" :key="item.rarity" class="gacha-option">
            <button type="button" :class="item.rarity" :disabled="busy || !item.candidates.length" :aria-describedby="`gacha-${item.rarity}-note`" @click="preview(item)">{{ item.rarity === 'epic' ? 'Épico' : 'Normal' }} · {{ item.price }} ⭐</button>
            <small :id="`gacha-${item.rarity}-note`">{{ item.candidates.length ? 'Precio informativo · prueba gratuita' : 'Sin iconos disponibles en esta saga y rareza' }}</small>
          </div>
        </div>
        <div class="gacha-result-slot" aria-live="polite" aria-atomic="true" :aria-busy="busy">
          <p class="gacha-hint">{{ busy ? 'Preparando tu sorpresa…' : reward ? 'Puedes probar otra sorpresa. No se ha gastado saldo.' : 'Elige una opción. Esta prueba no requiere saldo.' }}</p>
          <button class="gacha-reveal" :class="{ concealed: !busy }" :disabled="!busy" :aria-hidden="!busy" type="button" @click="reveal">Omitir animación</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.gacha-tools { display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; }.gacha-tools button { min-height:36px; color:#dbc4fc; background:transparent; border:0; cursor:pointer; }.gacha-obs-settings { padding:12px; background:#271c37; border-radius:12px; }.gacha-obs-settings label { display:grid; gap:8px; }.gacha-obs-settings input { width:100%; box-sizing:border-box; padding:10px; color:white; background:#110b20; border:1px solid #a879ff; border-radius:8px; }.gacha-obs-settings button { min-height:44px; margin-top:8px; color:white; background:#7734bc; border:0; border-radius:8px; padding:8px; }.gacha-obs-settings p { font-size:12px; }
.gacha-header-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.gacha-collection { margin-top:0; min-height:44px; padding:8px 16px; border:1px solid #c084fc70; border-radius:12px; color:#f3e8ff; background:#7b35a440; cursor:pointer; }
.gacha-categories { display:flex; gap:8px; overflow-x:auto; padding:5px 3px 8px; margin-top:14px; scrollbar-width:thin; scrollbar-color:#a879ff #20162f; }
.gacha-categories button { flex:0 0 auto; min-height:38px; padding:8px 14px; border:1px solid #c084fc40; border-radius:20px; color:#e2d6f5; background:#21162f; cursor:pointer; }
.gacha-categories button[aria-pressed=true] { background:linear-gradient(120deg,#7734bc,#ab388f); border-color:#dda8ff; color:white; }
.gacha-categories button:disabled { opacity:.6; cursor:default; }
.gacha-backdrop { position:fixed; inset:0; z-index:2000; display:grid; place-items:center; padding:20px; background:#060411d9; overflow-y:auto; }
.gacha-dialog { --glow:#c084fc; width:min(100%,580px); max-height:calc(100dvh - 40px); overflow-y:auto; color:#f8f5ff; background:radial-gradient(ellipse at 50% 40%,#3b176255,transparent 60%),#100d20; border:1px solid #9d6eda70; border-radius:24px; padding:24px; box-sizing:border-box; font-family:var(--font-family-base,Roboto,system-ui,sans-serif); }
.gacha-dialog.epic { --glow:#f6c86e; border-color:#f6c86e80; }
.gacha-header { display:flex; justify-content:space-between; align-items:center; gap:12px; }.gacha-eyebrow { color:#cab6e9; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }.gacha-header h2 { margin:5px 0 0; font-size:clamp(22px,5vw,28px); line-height:1.2; }
.gacha-close { flex-shrink:0; width:44px; height:44px; background:#ffffff0d; color:white; border:1px solid #ffffff26; border-radius:12px; font-size:28px; cursor:pointer; }
.gacha-wallet { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-top:18px; font-size:12px; color:#cfc3e2; }.gacha-wallet strong { color:#f6d889; font-size:21px; }.gacha-wallet small { font-size:12px; font-weight:500; }
.gacha-disclaimer { padding:10px 12px; margin:12px 0 0; border-radius:10px; background:#a879ff14; color:#e0cffc; font-size:12px; line-height:1.5; }
.gacha-stage { position:relative; height:clamp(390px,44dvh,430px); margin:12px 0; border-radius:14px; overflow:hidden; background:#262253; border:1px solid #c7b0ff25; }
.gacha-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }.gacha-option { min-width:0; }.gacha-option button { width:100%; min-height:48px; border:1px solid #d6afff55; border-radius:12px; background:linear-gradient(120deg,#702dd5,#a9349c); color:white; padding:10px; font-size:13px; font-weight:700; cursor:pointer; }.gacha-option button.epic { background:linear-gradient(120deg,#6d3297,#986420); border-color:#e9bb5d80; color:#fff3cf; }.gacha-option button:disabled { opacity:.5; cursor:default; }.gacha-option small { display:block; margin-top:7px; color:#beb0d2; font-size:10px; line-height:1.5; text-align:center; }
.gacha-result-slot { margin-top:10px; height:96px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }.gacha-hint { margin:0; min-height:36px; display:grid; place-items:center; color:#bdb0d0; text-align:center; font-size:12px; line-height:1.5; }
.gacha-reveal.concealed { visibility:hidden; pointer-events:none; }
.gacha-reveal { min-height:44px; padding:10px 16px; margin-top:8px; border:1px solid #c084fc80; border-radius:10px; background:#7433b8; color:white; cursor:pointer; }
button:focus-visible,a:focus-visible { outline:3px solid #f6d889; outline-offset:3px; }
@media(max-width:480px) { .gacha-header { flex-wrap:wrap; }.gacha-header-actions { margin-left:auto; } .gacha-backdrop { padding:10px; }.gacha-dialog { padding:18px; border-radius:18px; max-height:calc(100dvh - 20px); }.gacha-options { grid-template-columns:1fr; gap:10px; }.gacha-stage { height:380px; }.gacha-option button { min-height:48px; } }
</style>
