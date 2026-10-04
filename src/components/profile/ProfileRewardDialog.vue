<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ProfileAvatar from './ProfileAvatar.vue'
const props = defineProps({ pending: Object, result: Object, busy: Boolean, saving: Boolean, stars: Number, cost: Function, simulated: Boolean, error: String, inspect: Boolean, own: Boolean, equipped: Boolean })
const emit = defineEmits(['close', 'confirm', 'use', 'another'])
const card = ref(null)
const icon = computed(() => props.result?.icon || props.pending?.icon)
const previousFocus = document.activeElement
const focus = async () => { await nextTick(); (card.value?.querySelector('button.primary:not(:disabled)') || card.value?.querySelector('button:not(:disabled)'))?.focus() }
watch(() => props.result, focus)
const keydown = event => {
  if (event.key === 'Escape' && !props.busy && !props.saving) emit('close')
  if (event.key !== 'Tab') return
  const buttons = [...(card.value?.querySelectorAll('button:not(:disabled)') || [])]
  if (!buttons.length) { event.preventDefault(); return }
  const first = buttons[0], last = buttons.at(-1)
  if (!card.value?.contains(document.activeElement)) { event.preventDefault(); first.focus() }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(() => { focus(); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', keydown) })
onUnmounted(() => { document.body.style.overflow = ''; document.removeEventListener('keydown', keydown); previousFocus?.focus?.() })
</script>

<template>
  <Teleport to="body">
    <div class="reward-backdrop" @click.self="!busy && !saving && emit('close')">
      <section ref="card" class="reward-dialog" role="dialog" aria-modal="true" aria-labelledby="reward-title" :aria-busy="busy || saving">
        <button class="close" type="button" aria-label="Cerrar" :disabled="busy || saving" @click="emit('close')">×</button>
        <div class="reward-art">
          <span v-if="result && !inspect" class="celebration" aria-hidden="true"><i v-for="n in 12" :key="n" class="fas fa-star" :style="{ '--angle': `${n * 30}deg`, '--delay': `${n % 3 * 70}ms` }"></i></span>
          <ProfileAvatar :src="icon.src" :alt="icon.name" :effect="icon" />
        </div>
        <p v-if="simulated" class="simulation">Simulación · saldo de prueba</p>
        <template v-if="inspect">
          <h2 id="reward-title">{{ icon.name }}</h2>
          <p>{{ equipped ? 'Este es tu icono actual.' : 'Icono conseguido · Disponible en la colección' }}</p>
          <button v-if="own && !equipped" class="primary" type="button" :disabled="saving" @click="emit('use', icon.id)">{{ saving ? 'Guardando…' : 'Usar icono' }}</button>
          <button type="button" :disabled="saving" @click="emit('close')">Volver a la colección</button>
        </template>
        <template v-else-if="result">
          <h2 id="reward-title">¡Icono canjeado!</h2>
          <p><strong>{{ icon.name }}</strong> ya está en tu colección.</p>
          <p>Te quedan {{ stars }} estrellas. ¿Quieres usarlo como icono?</p>
          <button class="primary" type="button" :disabled="saving" @click="emit('use', icon.id)">{{ saving ? 'Guardando…' : 'Usar icono' }}</button>
          <button type="button" :disabled="saving" @click="emit('another')">Canjear otro</button>
        </template>
        <template v-else>
          <h2 id="reward-title">Canjear {{ icon.name }}</h2>
          <p>Cuesta {{ cost(icon) }} estrellas. Te quedarán {{ Math.max(0, stars - cost(icon)) }}.</p>
          <p>Se añadirá a tu colección y después podrás elegir si usarlo.</p>
          <p v-if="stars < cost(icon)" class="error">Te faltan {{ cost(icon) - stars }} estrellas.</p>
          <button class="primary" type="button" :disabled="busy || stars < cost(icon)" @click="emit('confirm')">{{ busy ? 'Canjeando…' : `Canjear por ${cost(icon)} estrellas` }}</button>
          <button type="button" :disabled="busy" @click="emit('close')">Cancelar</button>
        </template>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.reward-backdrop { position: fixed; inset: 0; z-index: 3600; display: grid; place-items: center; padding: 16px; background: #040612b8; backdrop-filter: blur(8px); }
.reward-dialog { position: relative; width: min(100%, 440px); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 32px 24px 24px; border: 1px solid var(--border); border-radius: 20px; background: var(--surface-elevated, #181329); color: var(--text-primary, white); text-align: center; display: grid; gap: 12px; }
.reward-dialog h2 { font-size: 24px; line-height: 1.3; }.reward-dialog p { line-height: 1.6; color: var(--text-secondary); }
.reward-dialog button { min-height: 44px; padding: 10px 16px; border-radius: 10px; background: var(--surface); color: var(--text-primary); }.reward-dialog .primary { background: var(--accent); color: white; }.reward-dialog .close { position: absolute; right: 8px; top: 8px; font-size: 24px; }.reward-dialog button:disabled { opacity: .55; }
.reward-art { position: relative; display: grid; place-items: center; padding: 28px; }.reward-art :deep(.profile-avatar-ui) { --avatar-size: 104px; }
.celebration { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }.celebration i { position: absolute; color: #facc15; font-size: 20px; animation: reward-star 1.1s ease-out var(--delay) both; }
.reward-dialog .simulation { color: #facc15; }.reward-dialog .error { color: #fca5a5; }
@keyframes reward-star { from { opacity: 0; transform: rotate(var(--angle)) translateY(20px) scale(.2); } 20% { opacity: 1; } to { opacity: 0; transform: rotate(var(--angle)) translateY(95px) scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .celebration i { animation: none; display: none; } }
.reward-dialog .close { z-index: 5; display: grid; place-items: center; width: 48px; height: 48px; min-height: 48px; padding: 0; line-height: 1; cursor: pointer; touch-action: manipulation; }
.reward-dialog .close:disabled { cursor: wait; }
.reward-dialog .close:focus-visible { outline: 2px solid #c084fc; outline-offset: 2px; }
.reward-dialog .close:hover:not(:disabled) { background: #a855f733; }
.reward-art { pointer-events: none; }
</style>
