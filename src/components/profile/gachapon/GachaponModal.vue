<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import ProfileAvatar from '../ProfileAvatar.vue'
const props = defineProps({ stars: Number, cost: Number, remaining: Number, draw: Function, equip: Function })
const emit = defineEmits(['close', 'collection'])
const dialog = ref(null), close = ref(null), busy = ref(false), reward = ref(null), error = ref(''), equipping = ref(false)
const canDraw = computed(() => !busy.value && props.remaining > 0 && props.stars >= props.cost)
let previousFocus, overflow, alive = true, timer, finishDelay
async function open() {
  if (!canDraw.value) return
  busy.value = true; reward.value = null; error.value = ''
  try {
    const result = await props.draw()
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => { finishDelay = resolve; timer = setTimeout(resolve, 650) })
    if (alive) reward.value = result.icon
  } catch (e) { if (alive) error.value = e.message || 'No se pudo confirmar el canje. Revisa tu saldo y vuelve a intentarlo.' }
  finally { if (alive) busy.value = false }
}
async function useIcon() {
  if (!reward.value || equipping.value) return
  equipping.value = true;error.value = ''
  try { const equipped = await props.equip(reward.value.id); if (equipped !== true) throw Error('equip-failed'); if (alive) emit('close') }
  catch { if (alive) error.value = 'El icono está en tu colección, pero no se pudo equipar.' }
  finally { if (alive) equipping.value = false }
}
function dismiss() { if (!busy.value && !equipping.value) emit('close') }
function keydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss() }
  if (event.key !== 'Tab') return
  const buttons = [...dialog.value.querySelectorAll('button:not(:disabled)')]
  const first = buttons[0], last = buttons.at(-1)
  if (!buttons.length) { event.preventDefault(); return }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(async () => { previousFocus = document.activeElement;overflow = document.body.style.overflow;document.body.style.overflow = 'hidden';await nextTick();close.value?.focus() })
onUnmounted(() => { alive = false;clearTimeout(timer);finishDelay?.();document.body.style.overflow = overflow || '';previousFocus?.isConnected && previousFocus.focus() })
</script>
<template>
  <Teleport to="body"><div class="gacha-backdrop" @click.self="dismiss">
    <section ref="dialog" class="gacha-dialog" role="dialog" aria-modal="true" aria-labelledby="gacha-title" :aria-busy="busy" @keydown="keydown">
      <header><div><small>Una sorpresa para tu colección</small><h2 id="gacha-title">Gachapón Estelar</h2></div><button ref="close" class="gacha-close" type="button" aria-label="Cerrar gachapón" :disabled="busy||equipping" @click="dismiss">×</button></header>
      <div class="gacha-balance"><span>Tu saldo</span><strong>★ {{ stars }}</strong></div>
      <div class="gacha-stage" :class="{opening:busy}">
        <template v-if="reward"><ProfileAvatar :src="reward.src" :alt="reward.name" :effect="reward"/><strong>{{ reward.name }}</strong><small>Nuevo icono · Ya está en tu colección</small></template>
        <template v-else><span class="gacha-gift" aria-hidden="true">✦</span><strong>{{ busy ? 'Abriendo tu sorpresa…' : remaining ? '¿Qué icono te tocará?' : '¡Colección completa!' }}</strong><small>{{ remaining ? 'Todos los iconos pendientes pueden salir.' : 'Has conseguido todos los iconos disponibles.' }}</small></template>
      </div>
      <p class="gacha-note">Una tirada al azar, sin categorías ni duplicados. Se descuentan {{ cost }} estrellas al guardar tu nuevo icono.</p>
      <p v-if="error" class="gacha-error" role="alert">{{ error }}</p>
      <button v-if="reward" class="gacha-primary" type="button" :disabled="equipping||busy" @click="useIcon">{{ equipping ? 'Guardando…' : 'Usar este icono' }}</button>
      <button v-else class="gacha-primary" type="button" :disabled="!canDraw" @click="open">{{ busy ? 'Canjeando…' : stars < cost ? 'Necesitas ' + cost + ' estrellas' : 'Abrir por ' + cost + ' ★' }}</button>
      <div class="gacha-footer"><button type="button" :disabled="busy||equipping" @click="emit('collection')">Ver colección</button><button v-if="reward&&remaining" type="button" :disabled="busy||equipping||stars<cost" @click="open">Otra tirada · {{ cost }} ★</button></div>
    </section>
  </div></Teleport>
</template>
<style scoped>
.gacha-backdrop{position:fixed;inset:0;z-index:3700;display:grid;place-items:center;padding:12px;background:#040612b8;backdrop-filter:blur(6px);box-sizing:border-box}.gacha-dialog{width:min(100%,380px);max-height:calc(100dvh - 24px);box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:20px;border:1px solid #a78bfa55;border-radius:22px;background:linear-gradient(150deg,#211435,#0c1020);color:#f8fafc;font-family:var(--font-family-base,system-ui,sans-serif);box-shadow:0 20px 70px #0007}.gacha-dialog header{display:flex;align-items:center;justify-content:space-between;gap:8px}.gacha-dialog h2{margin:3px 0 0;font-size:21px;line-height:1.2;font-weight:700}.gacha-dialog header small{font-size:11px;color:#c4b5fd}.gacha-dialog button{font:inherit;cursor:pointer;min-height:40px;border:0;border-radius:10px}.gacha-dialog button:disabled{opacity:.5;cursor:wait}.gacha-close{flex:none;width:40px;color:#e9d5ff;background:#ffffff0c;font-size:24px!important}.gacha-balance{display:flex;justify-content:space-between;font-size:12px;color:#cbd5e1}.gacha-balance strong{color:#fcd34d;font-size:15px}.gacha-stage{flex:1;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px 10px;border-radius:16px;background:radial-gradient(ellipse at 50% 35%,#8955da30,transparent 75%),#ffffff03;text-align:center;box-sizing:border-box}.gacha-stage :deep(.profile-avatar-ui){--avatar-size:80px}.gacha-stage strong{font-size:15px;line-height:1.35}.gacha-stage small{font-size:11px;color:#c4b5fd}.gacha-gift{display:grid;place-items:center;width:72px;height:72px;border-radius:22px;background:linear-gradient(140deg,#7c3aed,#22d3ee);font-size:40px;box-shadow:0 0 25px #a855f733}.opening .gacha-gift{animation:gacha-pulse .65s ease-in-out infinite alternate}.gacha-note{font-size:11px;line-height:1.5;color:#cbd5e1;margin:0}.gacha-primary{padding:10px;background:linear-gradient(110deg,#7c3aed,#b02cba);color:#fff;font-size:13px!important;font-weight:600!important}.gacha-footer{display:flex;justify-content:space-between;gap:10px}.gacha-footer button{background:transparent;color:#c4b5fd;font-size:11px}.gacha-error{margin:0;font-size:12px;line-height:1.5;color:#fda4af}.gacha-dialog button:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px}@keyframes gacha-pulse{from{transform:scale(.94);filter:brightness(1)}to{transform:scale(1.04);filter:brightness(1.2)}}@media(max-height:600px){.gacha-dialog{gap:7px;padding:14px}.gacha-stage{min-height:110px;padding:8px}.gacha-stage :deep(.profile-avatar-ui){--avatar-size:60px}.gacha-gift{width:52px;height:52px;font-size:30px}.gacha-dialog h2{font-size:19px}}@media(prefers-reduced-motion:reduce){.opening .gacha-gift{animation:none}}
</style>
