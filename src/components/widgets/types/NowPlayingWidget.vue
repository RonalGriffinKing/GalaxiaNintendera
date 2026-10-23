<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { nowPlayingCard, nowPlayingSettings } from '@/services/nowPlaying'
import { fetchOverlayGamer } from '@/services/overlayGamerClient'
const props = defineProps({ widget: { type: Object, required: true }, ownerId: String, preview: Boolean })
const settings = computed(() => nowPlayingSettings(props.widget.data))
const particles = Array.from({length:14},(_,index)=>({left:((index*37+11)%100)+'%',top:((index*23+17)%100)+'%',width:(index%4===0?3:2)+'px',height:(index%4===0?3:2)+'px',animationDelay:-(index*.67)+'s',animationDuration:(6+index%5)+'s'}))
const identities = ref([]), visible = ref(false), loading = ref(false)
const card = computed(() => nowPlayingCard(identities.value, settings.value))
let polling, hiding, repeating, sequence = 0
function clearAnimation() { clearTimeout(hiding); clearTimeout(repeating); visible.value = false }
function reveal() {
  clearAnimation()
  if (!settings.value.enabled || !card.value) return
  visible.value = true
  hiding = setTimeout(() => { visible.value = false }, settings.value.visibleSeconds * 1000)
  repeating = setTimeout(reveal, settings.value.repeatSeconds * 1000)
}
watch(() => [props.ownerId, settings.value.platform, settings.value.enabled, settings.value.refreshMode, props.widget.data?.refreshNonce], async () => {
  const id = ++sequence
  clearTimeout(polling); clearAnimation(); identities.value = []; loading.value = false
  if (!settings.value.enabled || !props.ownerId) return
  loading.value = true
  async function refresh() {
    try { const values = await fetchOverlayGamer(props.ownerId, settings.value.platform, { refresh: Boolean(props.widget.data?.refreshNonce) }); if (id === sequence) identities.value = values }
    catch { if (id === sequence) identities.value = [] }
    finally { if (id === sequence) { loading.value = false; if (settings.value.refreshMode === 'auto') polling = setTimeout(refresh, settings.value.platform === 'nintendo' ? 60000 : 300000) } }
  }
  await refresh()
}, { immediate: true })
watch(() => [card.value?.game.id, card.value?.platform, card.value?.playing, settings.value.showLastGame, settings.value.visibleSeconds, settings.value.repeatSeconds, props.widget.data?.replayNonce], reveal)
onUnmounted(() => { sequence++; clearTimeout(polling); clearAnimation() })
const style = computed(() => ({ width: settings.value.width + 'px', height: settings.value.height + 'px', '--cover-width': settings.value.coverWidth+'px', '--badge-space': Math.max(0,settings.value.labelSize-12)*1.2+'px', '--label-size': settings.value.labelSize+'px', '--title-size': settings.value.titleSize+'px', '--platform-size': settings.value.platformSize+'px', '--stats-size': settings.value.statsSize+'px', '--slide': settings.value.direction === 'right' ? '60px' : '-60px' }))
</script>
<template>
  <div class="now-playing-shell" :style="style">
    <Transition name="now-playing" mode="out-in" appear>
      <article v-if="settings.enabled && visible && card" :key="card.platform + ':' + card.game.id" :class="['now-playing-card', settings.theme, card.platform, { compact: settings.width < 400 }]" aria-label="Actividad de juego">
        <img v-if="card.game.imageUrl" class="now-playing-backdrop" :src="card.game.imageUrl" alt="" />
        <div v-if="settings.particles" class="now-playing-particles" aria-hidden="true"><span v-for="(particle,index) in particles" :key="index" :style="particle"></span></div>
        <span class="now-playing-label"><i class="fas fa-gamepad" aria-hidden="true"></i> {{ card.playing ? 'Jugando ahora' : 'Último juego detectado' }}</span>
        <img v-if="card.game.imageUrl" class="now-playing-cover" :src="card.game.imageUrl" alt="" /><div v-else class="now-playing-cover cover-empty"><i class="fas fa-gamepad" aria-hidden="true"></i></div>
        <div class="now-playing-copy"><h3>{{ card.game.title }}</h3><span class="now-playing-platform">{{ card.platformLabel }}</span><div v-if="card.stats.length" class="now-playing-stats"><span v-for="stat in card.stats" :key="stat.text"><i :class="stat.icon" aria-hidden="true"></i> {{ stat.text }}</span></div></div>
        <span v-if="settings.theme === 'galaxy'" class="now-playing-star" aria-hidden="true">✦</span>
      </article>
    </Transition>
    <div v-if="preview && !visible" class="now-playing-placeholder"><i class="fas fa-gamepad" aria-hidden="true"></i><strong>{{ !settings.enabled ? 'Widget apagado' : loading ? 'Consultando tus plataformas…' : card ? 'En pausa entre apariciones' : 'Sin juego activo disponible' }}</strong><small>{{ !settings.enabled ? 'Enciende el widget desde el editor para publicarlo en OBS.' : card ? 'Usa «Probar animación» para verlo de nuevo.' : 'Conecta tus sistemas en Editar perfil o permite mostrar el último juego.' }}</small></div>
  </div>
</template>
<style scoped>
.now-playing-shell{position:relative;box-sizing:border-box;padding:18px 10px 10px;font-family:var(--font-family-base,system-ui,sans-serif);color:#fff;pointer-events:none}
.now-playing-card{position:relative;isolation:isolate;height:100%;box-sizing:border-box;display:flex;align-items:center;gap:18px;padding:14px 18px;border:1px solid #ae7dff99;border-radius:24px;background:linear-gradient(115deg,#15102df5,#07132ef5);box-shadow:0 0 15px #a855f733,inset 0 0 18px #7c3aed22;overflow:visible}
.now-playing-card:before{content:'';position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:linear-gradient(100deg,#1d1135e8,#07152cc4);z-index:-1}
.now-playing-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;opacity:.18;filter:blur(4px);z-index:-2}
.now-playing-label{position:absolute;max-width:calc(100% - 44px);box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;top:-13px;left:22px;display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:12px;background:linear-gradient(100deg,#8b2df2,#6522de);font-size:var(--label-size);font-weight:650;line-height:1.4;white-space:nowrap;box-shadow:0 3px 12px #7c3aed40}
.now-playing-cover{width:var(--cover-width);height:calc(var(--cover-width) * 1.5);max-height:none;box-sizing:border-box;object-fit:cover;flex:none;border-radius:12px;border:1px solid #ffffff45}.cover-empty{display:grid;place-items:center;background:#7c3aed22;color:#c4b5fd}
.now-playing-copy{min-width:0;flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:9px}.now-playing-copy h3{font-size:var(--title-size);font-weight:700;line-height:1.2;margin:0;color:inherit;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;text-shadow:none}
.now-playing-platform{display:inline-flex;padding:4px 9px;border-radius:7px;background:#ffffff13;border:1px solid #ffffff26;font-size:var(--platform-size);line-height:1.4;font-weight:600}.nintendo .now-playing-platform{background:#e60022;border-color:#ff5670}.xbox .now-playing-platform{background:#107c10;border-color:#43b63c}
.now-playing-stats{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:var(--stats-size);line-height:1.4;color:#ede9fe;font-variant-numeric:tabular-nums}.now-playing-stats i{margin-right:4px;color:#c4b5fd}.now-playing-star{position:absolute;right:12px;top:-17px;color:#ffe68c;font-size:35px;line-height:1;text-shadow:0 0 13px #ffc743a0}
.minimal{border-radius:16px;border-color:#ffffff26;background:#080e1cf5;box-shadow:0 4px 18px #0003}.minimal:before{background:#080e1ce8}.minimal .now-playing-label{background:#18213a;box-shadow:none}
.now-playing-placeholder{position:absolute;inset:18px 10px 10px;border:1px dashed #a78bfa70;border-radius:20px;background:#15102f;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;padding:16px;box-sizing:border-box;color:#ddd6fe;text-align:center}.now-playing-placeholder strong{font-size:15px}.now-playing-placeholder small{font-size:11px;font-weight:400}
.now-playing-enter-active{transition:transform .65s cubic-bezier(.16,1,.3,1),opacity .45s ease}.now-playing-leave-active{transition:transform .5s cubic-bezier(.4,0,1,1),opacity .4s ease}.now-playing-enter-from,.now-playing-leave-to{opacity:0;transform:translateX(var(--slide)) scale(.97)}
@media(prefers-reduced-motion:reduce){.now-playing-enter-active,.now-playing-leave-active{transition:opacity .15s}.now-playing-enter-from,.now-playing-leave-to{transform:none}}
.compact{gap:12px;padding:14px 12px}.compact .now-playing-copy{gap:6px}.compact h3{font-size:var(--title-size)}.compact .now-playing-stats{font-size:var(--stats-size);gap:4px 10px}
.now-playing-card{padding-top:calc(14px + var(--badge-space))}
.now-playing-cover,.now-playing-copy{position:relative;z-index:1}.now-playing-label,.now-playing-star{z-index:2}
.now-playing-particles{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0;mask-image:linear-gradient(90deg,#0004,#0006 50%,#000)}.now-playing-particles span{position:absolute;border-radius:50%;background:#d8c7ff;box-shadow:0 0 6px #b794ff88;opacity:.35;animation:now-playing-drift 7s ease-in-out infinite alternate}.minimal .now-playing-particles{opacity:.4}
@keyframes now-playing-drift{from{transform:translate3d(-4px,8px,0);opacity:.12}to{transform:translate3d(9px,-10px,0);opacity:.6}}
@media(prefers-reduced-motion:reduce){.now-playing-particles span{animation:none;opacity:.25}}
</style>
