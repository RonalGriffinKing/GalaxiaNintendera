<script setup>
import HalloweenDecor from '../HalloweenDecor.vue'
import TriforceSymbol from '../TriforceSymbol.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { overlayNowPlayingCard, nowPlayingSettings, eventStartInfo, nowPlayingPalette } from '@/services/nowPlaying'
import { fetchOverlayEventCandidates } from '@/services/overlayEventClient'
import { fetchOverlayGamer } from '@/services/overlayGamerClient'
import { nowPlayingAppearance, nowPlayingTiming } from '@/services/nowPlayingAppearance'
import { createNowPlayingPlayback } from '@/services/nowPlayingPlayback'
import NowPlayingVisualEffects from '../NowPlayingVisualEffects.vue'
const props = defineProps({ widget: { type: Object, required: true }, ownerId: String, preview: Boolean, interactive: Boolean })
const emit = defineEmits(['source-status'])
const settings = computed(() => nowPlayingSettings(props.widget.data))
const appearance = computed(() => nowPlayingAppearance(settings.value))
const reducedMotion = ref(false)
const motionAllowed = computed(() => settings.value.animationsEnabled && !reducedMotion.value)
const timing = computed(() => nowPlayingTiming(settings.value, reducedMotion.value))
const displayCard = ref(null), appearanceCycle = ref(0)
let motionQuery
function motionChanged(event) { reducedMotion.value = event.matches }
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', motionChanged)
})
const particles = Array.from({length:14},(_,index)=>({left:((index*37+11)%100)+'%',top:((index*23+17)%100)+'%',width:(index%4===0?3:2)+'px',height:(index%4===0?3:2)+'px',animationDelay:-(index*.67)+'s',animationDuration:(6+index%5)+'s'}))
const eventData=ref([])
const now = ref(Date.now())
const identities = ref([]), visible = ref(false), loading = ref(false)
const manualVisibility = ref(null)
const clickEnabled = computed(() => props.interactive && props.widget.data?.clickToToggle !== false && settings.value.enabled)
const isShown = computed(() => manualVisibility.value ?? visible.value)
function toggleLocally() {
  if (!clickEnabled.value) return
  if (isShown.value) {
    manualVisibility.value = false
    clearAnimation()
  } else {
    manualVisibility.value = null
    reveal()
  }
}
const card = computed(() => overlayNowPlayingCard(eventData.value, identities.value, settings.value, now.value))
const shownCard = computed(() => displayCard.value || card.value)
const eventStart=computed(()=>settings.value.eventShowStart?eventStartInfo(shownCard.value?.eventStartsAt,settings.value.eventTimeZone):null)
watch(card, value => { if (value && value.game.id === displayCard.value?.game.id) displayCard.value = value })
const cardPalette = computed(() => settings.value.appearance === 'original'
  ? nowPlayingPalette(shownCard.value?.game, settings.value.theme)
  : { '--game-accent': appearance.value.accent, '--game-pill': appearance.value.primary, '--game-ink': appearance.value.ink })
watch([card,loading], () => {
  if (props.preview) emit('source-status', { loading: loading.value, source: card.value?.contentSource || (card.value ? 'console' : ''), platform: card.value?.platformLabel || '', coverSource: card.value?.coverSource || 'console' })
}, { immediate: true })
let polling, clock, sequence = 0
const playback = createNowPlayingPlayback({
  timing: () => timing.value,
  canShow: () => settings.value.enabled && Boolean(card.value) && manualVisibility.value !== false,
  onShow: () => { displayCard.value = card.value; appearanceCycle.value++; visible.value = true },
  onHide: () => { visible.value = false }
})
function clearAnimation() { playback.stop() }
function reveal() { playback.play() }
watch(() => [props.ownerId, settings.value.source, settings.value.eventId, settings.value.platform, settings.value.enabled, settings.value.refreshMode, props.widget.data?.refreshNonce], async () => {
  const id = ++sequence
  clearTimeout(polling); clearInterval(clock); clearAnimation(); identities.value = [];eventData.value=[]; loading.value = false
  if (!settings.value.enabled || (settings.value.source!=='event' && !props.ownerId)) return
  loading.value = true
  now.value = Date.now()
  if (settings.value.source === 'event') clock = setInterval(() => { now.value = Date.now() }, 30000)
  async function refresh() {
    try {
      if(settings.value.source==='event') {
        const [events,games] = await Promise.allSettled([
          fetchOverlayEventCandidates(settings.value.eventId),
          props.ownerId ? fetchOverlayGamer(props.ownerId,settings.value.platform,{refresh:Boolean(props.widget.data?.refreshNonce)}) : Promise.resolve([])
        ])
        if(id===sequence) {
          now.value = Date.now()
          eventData.value = events.status === 'fulfilled' ? events.value : []
          identities.value = games.status === 'fulfilled' ? games.value : []
        }
      }
      else {const values=await fetchOverlayGamer(props.ownerId,settings.value.platform,{refresh:Boolean(props.widget.data?.refreshNonce)});if(id===sequence)identities.value=values}
    }
    catch { if (id === sequence) {identities.value = [];eventData.value=[]} }
    finally { if (id === sequence) { loading.value = false; if (settings.value.refreshMode === 'auto') polling = setTimeout(refresh, settings.value.source==='event' || settings.value.platform === 'nintendo' ? 60000 : 300000) } }
  }
  await refresh()
}, { immediate: true })
watch(() => [card.value?.game.id, card.value?.game.title,card.value?.game.imageUrl, card.value?.platform, card.value?.playing, settings.value.showLastGame, settings.value.visibleSeconds, settings.value.repeatSeconds, props.widget.data?.replayNonce, settings.value.appearance, settings.value.entryAnimation, settings.value.exitAnimation, settings.value.animationDuration, settings.value.exitDuration, settings.value.animationsEnabled], reveal)
onUnmounted(() => { sequence++; clearTimeout(polling); clearInterval(clock); playback.dispose(); motionQuery?.removeEventListener('change', motionChanged) })
const visualStyle = computed(() => ({
  '--np-primary': appearance.value.primary, '--np-accent': appearance.value.accent,
  '--np-base': appearance.value.base, '--np-ink': appearance.value.ink,
  '--np-opacity': settings.value.panelOpacity, '--np-blur': settings.value.blurIntensity+'px',
  '--np-radius': settings.value.cornerRadius+'px', '--np-border-width': settings.value.borderWidth+'px',
  '--np-glow-alpha': settings.value.effectsEnabled ? settings.value.glowIntensity : 0,
  '--np-effect-alpha': settings.value.effectsEnabled ? settings.value.effectIntensity : 0,
  '--np-speed': settings.value.effectSpeed+'s', '--np-in': timing.value.enter+'ms', '--np-out': timing.value.leave+'ms',
  '--np-stagger': Math.min(settings.value.elementDelay, settings.value.animationDuration * .05)+'s'
}))
const style = computed(() => ({ ...visualStyle.value, width: settings.value.width + 'px', height: settings.value.height + 'px', '--cover-position': settings.value.coverPositionX+'% '+settings.value.coverPositionY+'%', '--cover-zoom': settings.value.coverZoom/100, '--cover-fit': settings.value.coverFit, '--cover-width': settings.value.coverWidth+'px', '--badge-space': Math.max(0,settings.value.labelSize-12)*1.2+'px', '--label-size': settings.value.labelSize+'px', '--title-size': settings.value.titleSize+'px', '--platform-size': settings.value.platformSize+'px', '--stats-size': settings.value.statsSize+'px', '--slide': settings.value.direction === 'right' ? '60px' : '-60px' }))
</script>
<template>
  <div class="now-playing-shell" :class="{
    'obs-interactive': clickEnabled,
    'np-contained': !settings.allowOverflow,
    'np-motion-off': !motionAllowed,
    'np-static-effects': !settings.effectsEnabled || !settings.animatedGlow
  }" :style="style" :role="clickEnabled?'button':undefined" :tabindex="clickEnabled?0:undefined"
    :aria-label="clickEnabled?(isShown?'Ocultar Hoy jugamos':'Mostrar Hoy jugamos'):undefined"
    @click="toggleLocally" @keydown.enter.prevent="toggleLocally" @keydown.space.prevent="toggleLocally">
    <Transition :css="motionAllowed" :duration="{enter:timing.enter,leave:timing.leave}"
      :enter-active-class="'np-entry-'+settings.entryAnimation" enter-from-class="np-before-enter"
      :leave-active-class="'np-exit-'+settings.exitAnimation" leave-to-class="np-after-leave" mode="out-in" appear>
      <div v-if="settings.enabled && isShown && shownCard" :key="appearanceCycle" class="np-presence">
        <div v-if="settings.entryAnimation==='triforce' || settings.exitAnimation==='triforce'" class="np-relic-stage" aria-hidden="true">
          <div class="np-relic-orbit"><i v-for="n in 8" :key="n" :style="{'--mote':n}"></i></div>
          <TriforceSymbol class="np-intro-triforce" />
          <span class="np-relic-flare"></span>
        </div>
        <article :style="cardPalette" :data-appearance="settings.appearance" :data-border="appearance.border"
          :class="['now-playing-card',settings.theme,shownCard.platform,{
            compact:settings.width<400,
            'image-as-background':settings.imageMode==='background',
            'np-modern':settings.appearance!=='original',
            'np-custom-border':appearance.border!=='original'
          }]" aria-label="Actividad de juego">
          <HalloweenDecor v-if="settings.theme==='halloween' && settings.appearance==='original'" />
          <div v-if="settings.imageMode==='background' && shownCard.game.imageUrl" class="now-playing-background-art" aria-hidden="true"><img :src="shownCard.game.imageUrl" alt="" /></div>
          <img v-else-if="shownCard.game.imageUrl" class="now-playing-backdrop" :src="shownCard.game.imageUrl" alt="" />
          <NowPlayingVisualEffects v-if="settings.appearance!=='original' || appearance.border!=='original'" :settings="settings" :appearance="appearance" />
          <div v-if="settings.particles && settings.effectsEnabled" class="now-playing-particles" aria-hidden="true"><span v-for="(particle,index) in particles" :key="index" :style="particle"></span></div>
          <div v-if="settings.theme==='zelda' && settings.appearance==='original'" class="now-playing-sigil" aria-hidden="true"><TriforceSymbol /></div>
          <span class="now-playing-label"><TriforceSymbol v-if="settings.theme==='zelda' || ['emerald','crystal'].includes(settings.appearance)" /><i v-else class="fas fa-gamepad" aria-hidden="true"></i>{{ settings.label }}</span>
          <template v-if="settings.imageMode==='cover'">
            <div v-if="shownCard.game.imageUrl" class="now-playing-cover"><img class="now-playing-cover-image" :src="shownCard.game.imageUrl" alt="" /></div>
            <div v-else class="now-playing-cover cover-empty"><i class="fas fa-gamepad" aria-hidden="true"></i></div>
          </template>
          <div class="now-playing-copy">
            <h3>{{ shownCard.game.title }}</h3>
            <p v-if="settings.source==='event' && settings.eventShowDescription && shownCard.eventDescription" class="now-playing-event-description">{{ shownCard.eventDescription }}</p>
            <time v-if="settings.source==='event' && eventStart" class="now-playing-event-start" :datetime="eventStart.iso"><i class="far fa-clock" aria-hidden="true"></i><span>Inicio: {{ eventStart.label }}</span></time>
            <div v-if="shownCard.platformLabel || shownCard.playing" class="now-playing-meta">
              <span v-if="shownCard.platformLabel" class="now-playing-platform"><i class="fas fa-gamepad" aria-hidden="true"></i>{{ shownCard.platformLabel }}</span>
              <span v-if="shownCard.playing" class="now-playing-live"><i aria-hidden="true"></i>Jugando ahora</span>
            </div>
            <div v-if="shownCard.stats.length" class="now-playing-stats"><span v-for="stat in shownCard.stats" :key="stat.text"><i :class="stat.icon" aria-hidden="true"></i>{{ stat.text }}</span></div>
          </div>
          <span v-if="settings.theme==='galaxy' && settings.appearance==='original'" class="now-playing-star" aria-hidden="true">&#10022;</span>
          <span v-if="settings.theme==='zelda' && settings.appearance==='original'" class="now-playing-relic" aria-hidden="true"><TriforceSymbol /></span>
        </article>
      </div>
    </Transition>
    <div v-if="preview && !isShown" class="now-playing-placeholder"><i class="fas fa-gamepad" aria-hidden="true"></i><strong>{{ !settings.enabled?'Widget apagado':loading?'Consultando tus plataformas…':card?'En pausa entre apariciones':'Sin juego activo disponible' }}</strong><small>{{ !settings.enabled?'Enciende el widget desde el editor para publicarlo en OBS.':card?'Usa Previsualizar animación para ver el ciclo completo.':'Conecta tus sistemas en Editar perfil o permite mostrar el último juego.' }}</small></div>
  </div>
</template>
<style scoped>
.now-playing-shell.obs-interactive{pointer-events:auto;cursor:pointer}.now-playing-shell.obs-interactive:focus-visible{outline:2px solid #e8bd55;outline-offset:4px}
.now-playing-shell{position:relative;box-sizing:border-box;padding:18px 10px 10px;font-family:var(--font-family-base,system-ui,sans-serif);color:#fff;pointer-events:none}
.now-playing-card{position:relative;isolation:isolate;height:100%;box-sizing:border-box;display:flex;align-items:center;gap:18px;padding:14px 18px;border:1px solid #ae7dff99;border-radius:24px;background:linear-gradient(115deg,#15102df5,#07132ef5);box-shadow:0 0 15px #a855f733,inset 0 0 18px #7c3aed22;overflow:visible}
.now-playing-card:before{content:'';position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:linear-gradient(100deg,#1d1135e8,#07152cc4);z-index:-1}
.now-playing-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;opacity:.18;filter:blur(4px);z-index:-2}
.now-playing-label{position:absolute;max-width:calc(100% - 44px);box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;top:-13px;left:22px;display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:12px;background:linear-gradient(100deg,#8b2df2,#6522de);font-size:var(--label-size);font-weight:650;line-height:1.4;white-space:nowrap;box-shadow:0 3px 12px #7c3aed40}
.now-playing-cover{width:var(--cover-width);height:calc(var(--cover-width) * 1.5);max-height:none;box-sizing:border-box;object-fit:cover;flex:none;border-radius:12px;border:1px solid #ffffff45}.cover-empty{display:grid;place-items:center;background:#7c3aed22;color:#c4b5fd}
.now-playing-copy{min-width:0;flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:9px}.now-playing-copy h3{font-size:var(--title-size);font-weight:700;line-height:1.2;margin:0;color:inherit;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;text-shadow:none}
.now-playing-platform{display:inline-flex;padding:4px 9px;border-radius:7px;background:#ffffff13;border:1px solid #ffffff26;font-size:var(--platform-size);line-height:1.4;font-weight:600}
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

.halloween{border-color:#ff973eaa;background:#1c102bf5;box-shadow:0 0 20px #ff973e22,inset 0 0 24px #8755cc33}.halloween:before{background:linear-gradient(115deg,#1c102bf0,#321744db)}.halloween .now-playing-label{background:linear-gradient(100deg,#a44816,#713394);box-shadow:0 3px 12px #ff973e33}.halloween .now-playing-cover{border-color:#ffb46488}.halloween .now-playing-stats{color:#fff1dc}.halloween .now-playing-stats i{color:#ffb464}.halloween .now-playing-particles span{background:#ffc775;box-shadow:0 0 6px #ff973e88}
.now-playing-event-description{margin:0;color:#ede9f0;font-size:var(--stats-size);font-weight:400;line-height:1.4;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.now-playing-event-start{display:flex;align-items:baseline;gap:6px;color:#ffe3ac;font-size:var(--stats-size);line-height:1.4;font-weight:600}.now-playing-event-start i{flex:none}.now-playing-event-start span{overflow-wrap:anywhere}
.now-playing-cover{overflow:hidden;background:#080e1c}.now-playing-cover-image{display:block;width:100%;height:100%;object-fit:var(--cover-fit,cover);object-position:var(--cover-position,50% 50%);transform:scale(var(--cover-zoom,1));transform-origin:var(--cover-position,50% 50%)}
.zelda{color:#fff3ce;border-color:#d8b65caa;background:linear-gradient(115deg,#071d15fa,#122c20f5);box-shadow:0 0 18px #e8bd5526,inset 0 0 24px #d4a84d10}
.zelda:before{background:linear-gradient(110deg,#081e16ed,#173624d9)}
.zelda .now-playing-label{color:#fff3ce;border:1px solid #e8bd55aa;background:linear-gradient(110deg,#132f20,#29452a);box-shadow:0 3px 14px #0005,inset 0 1px #ffe7a333}
.zelda .now-playing-label .triforce-symbol{color:#f5ce69;font-size:15px;transform:translateY(-1px);filter:drop-shadow(0 0 4px #efc55b66)}
.zelda .now-playing-cover{border-color:#e8bd5588;box-shadow:0 0 12px #e8bd551a;background:#06170f}
.zelda .now-playing-copy h3{color:#fff3ce}
.zelda .now-playing-event-description,.zelda .now-playing-stats{color:#e4e6d2}
.zelda .now-playing-event-start,.zelda .now-playing-stats i{color:#f5ce69}
.zelda .now-playing-particles span{background:#ffe7a3;box-shadow:0 0 7px #e8bd5588}
.now-playing-relic{position:absolute;z-index:2;right:16px;top:-15px;display:grid;place-items:center;width:32px;height:32px;font-size:25px;color:#f5ce69;filter:drop-shadow(0 0 7px #efc55b88)}
.now-playing-relic .triforce-symbol{transform:translateY(-2px)}
.now-playing-meta{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;max-width:100%}
.now-playing-meta .now-playing-platform{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;background:linear-gradient(115deg,var(--game-pill),color-mix(in srgb,var(--game-pill) 82%,var(--game-accent)));border:1px solid color-mix(in srgb,var(--game-accent) 60%,transparent);color:var(--game-ink);box-shadow:inset 0 1px 0 #ffffff12;font-weight:650}
.now-playing-platform i{font-size:.9em;opacity:.85}
.now-playing-live{display:inline-flex;align-items:center;gap:6px;font-size:var(--platform-size);color:var(--game-ink);opacity:.8;line-height:1.4}
.now-playing-live>i{width:5px;height:5px;border-radius:50%;background:var(--game-accent);box-shadow:0 0 6px color-mix(in srgb,var(--game-accent) 45%,transparent);flex:none}
.now-playing-card:not(.minimal)::after{content:'';position:absolute;inset:5px;border:1px solid color-mix(in srgb,var(--game-accent) 10%,transparent);border-radius:19px;pointer-events:none;z-index:0}
.now-playing-sigil{position:absolute;right:20px;bottom:10px;font-size:88px;color:var(--game-accent);opacity:.055;pointer-events:none;z-index:0;transform:rotate(-8deg)}
.zelda::before{background:radial-gradient(ellipse at 100% 100%,#b2973e12,transparent 60%),linear-gradient(110deg,#081e16ed,#173624d9)}
.zelda .now-playing-cover{box-shadow:0 0 0 3px #e8bd5509,0 4px 18px #0004}
.now-playing-stats{padding-top:7px;border-top:1px solid color-mix(in srgb,var(--game-accent) 16%,transparent);width:100%;box-sizing:border-box}
.now-playing-stats i{color:var(--game-accent)}
.compact .now-playing-meta{gap:6px 8px}.compact .now-playing-live{font-size:10px}
.now-playing-card{--panel-base:#11102b}.now-playing-card.zelda{--panel-base:#081e16}.now-playing-card.halloween{--panel-base:#1c102b}.now-playing-card.minimal{--panel-base:#080e1c}
.now-playing-background-art{position:absolute;inset:0;overflow:hidden;border-radius:inherit;z-index:-2;pointer-events:none}
.now-playing-background-art img{display:block;width:100%;height:100%;object-fit:var(--cover-fit);object-position:var(--cover-position);transform:scale(var(--cover-zoom));transform-origin:var(--cover-position);opacity:.85}
.now-playing-card.image-as-background::before{background:linear-gradient(90deg,var(--panel-base) 0%,color-mix(in srgb,var(--panel-base) 94%,transparent) 24%,color-mix(in srgb,var(--panel-base) 70%,transparent) 60%,color-mix(in srgb,var(--panel-base) 25%,transparent) 100%),linear-gradient(0deg,color-mix(in srgb,var(--panel-base) 70%,transparent),transparent 60%)}
.image-as-background .now-playing-copy{max-width:86%;padding-block:4px}
.image-as-background .now-playing-copy h3{text-shadow:0 2px 8px #0008}
.image-as-background .now-playing-sigil{opacity:.035}
.image-as-background.compact .now-playing-copy{max-width:100%}
</style>

<style scoped src="./nowPlayingMagic.css"></style>
