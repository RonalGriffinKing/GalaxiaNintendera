<script setup>
defineProps({
  canCreate: {
    type: Boolean,
    default: false
  }
})

defineEmits(['create','bulk','carousel'])
</script>

<template>
  <section class="events-hero-premium">
    <div>
      <h1>Eventos</h1>
      <p>Descubre y participa en los eventos mas epicos de Nintendo y la comunidad.</p>
    </div>
    <div v-if="canCreate" class="events-admin-actions" aria-label="Herramientas de eventos">
      <button type="button" class="event-tool event-tool-create" @click="$emit('create')">
        <span class="event-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-9 3v4m-2-2h4"/></svg></span>
        <span class="event-tool-copy"><strong>Crear evento</strong><small>Un nuevo encuentro</small></span>
      </button>
      <button type="button" class="event-tool event-tool-import" @click="$emit('bulk')">
        <span class="event-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M9 12l-2 3 2 3m6-6 2 3-2 3"/></svg></span>
        <span class="event-tool-copy"><strong>Importar eventos</strong><small>Pega o adjunta JSON</small></span>
      </button>
      <button type="button" class="event-tool event-tool-magic" @click="$emit('carousel')">
        <span class="event-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 4 5 5L7 22l-5-5Zm-3 3 5 5M5 2v4M3 4h4m13 10v4m-2-2h4M20 1v4m-2-2h4"/></svg></span>
        <span class="event-tool-copy"><strong>Generador mágico</strong><small>Tu carrusel para redes</small></span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.events-hero-premium {
  align-items: center;
  background:
    linear-gradient(90deg, rgba(5, 8, 22, 0.96) 0%, rgba(5, 8, 22, 0.82) 46%, rgba(5, 8, 22, 0.52) 100%),
    url('@/iconos/Banner.png');
  background-position: center;
  background-size: cover;
  border: 1px solid rgba(168, 85, 247, 0.18);
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(124, 58, 237, 0.16);
  color: #ffffff;
  display: flex;
  justify-content: space-between;
  min-height: 156px;
  overflow: hidden;
  padding: 28px;
}

.events-hero-premium h1 {
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 0.95;
}

.events-hero-premium p {
  color: #cbd5e1;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.45;
  margin-top: 10px;
  max-width: 520px;
}

.events-hero-premium{gap:28px;flex-wrap:wrap}
.events-hero-premium > div:first-child{flex:1 1 280px;min-width:0}
.events-hero-premium p{font-weight:500}
.events-admin-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;flex:1 1 580px;max-width:660px}
.event-tool{box-sizing:border-box;display:flex;align-items:center;gap:10px;min-width:0;min-height:76px;padding:14px 13px;border:1px solid #c4b5fd2e;border-radius:15px;background:#14142bca;color:#ede9fe;text-align:left;cursor:pointer;transition:background .2s ease,border-color .2s ease,transform .2s ease,box-shadow .2s ease}
.event-tool-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:38px;border-radius:10px;background:#a78bfa1c;color:#c4b5fd}
.event-tool-icon svg{width:23px;height:23px}
.event-tool-copy{display:grid;gap:5px;min-width:0}
.event-tool strong{font-size:13px;line-height:1.25;font-weight:750;letter-spacing:0}
.event-tool small{font-size:10px;line-height:1.3;color:#b9b4cd;font-weight:500}
.event-tool-create{background:linear-gradient(125deg,#7c3aed,#a32cbe);border-color:#bc8bff70;box-shadow:0 5px 20px #7c3aed22}
.event-tool-create .event-tool-icon{background:#ffffff18;color:white}
.event-tool-create small{color:#eee0ff}
.event-tool-magic{background:linear-gradient(125deg,#25173bdb,#241b39e8);border-color:#e9a1e33d}
.event-tool-magic .event-tool-icon{background:#f0abfc14;color:#f0abfc}
.event-tool:hover{transform:translateY(-2px);border-color:#d8b4fe88;box-shadow:0 8px 22px #08041455}
.event-tool:active{transform:translateY(0)}
.event-tool:focus-visible{outline:2px solid #e9d5ff;outline-offset:4px}
@media(max-width:680px){
 .events-hero-premium{display:grid;gap:22px;min-height:190px;padding:22px;align-items:start}
 .events-admin-actions{width:100%;max-width:none;grid-template-columns:repeat(2,minmax(0,1fr))}
 .event-tool-create{grid-column:1/-1;min-height:62px}
 .event-tool{padding:12px 10px;gap:8px}
 .event-tool:not(.event-tool-create){flex-direction:column;align-items:flex-start;gap:10px}
 .event-tool strong{font-size:13px}
 .event-tool small{font-size:10px}
}
@media(prefers-reduced-motion:reduce){.event-tool{transition:none}.event-tool:hover{transform:none}}
</style>
