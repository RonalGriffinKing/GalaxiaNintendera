<script setup>
defineProps({
  activeLive: {
    type: String,
    required: true
  },
  lives: {
    type: Array,
    default: () => []
  },
  chatMessages: {
    type: Array,
    default: () => []
  },
  communityThreads: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:activeLive', 'join'])
</script>

<template>
  <main class="community-page">
    <section class="community-hero">
      <div class="hero-copy">
        <span class="hero-kicker">
          <i class="fas fa-signal"></i>
          Comunidades en vivo
        </span>
        <h1>Unete, chatea y comparte tus opiniones mientras pasan los lives.</h1>
        <p>
          Entra a conversaciones activas, sigue chats en vivo y abre hilos con otros fans
          para comentar noticias, teorias, guias o cualquier tema de la galaxia Nintendo.
        </p>

        <div class="hero-actions">
          <button class="primary-action" @click="emit('join')">
            <i class="fas fa-comments"></i>
            Unirme a comunidades
          </button>
          <a href="#lives" class="secondary-action">
            <i class="fas fa-play"></i>
            Ver lives activos
          </a>
        </div>
      </div>

      <div class="live-stage" aria-label="Vista previa de chat en vivo">
        <div class="live-screen">
          <div class="live-badge">
            <span></span>
            LIVE
          </div>
          <strong>{{ activeLive }}</strong>
          <p>Interactua con el stream, responde al chat y salta entre conversaciones.</p>
        </div>

        <div class="chat-preview">
          <div class="chat-head">
            <span>Chat en vivo</span>
            <small>Ahora</small>
          </div>
          <div class="chat-list">
            <p v-for="message in chatMessages" :key="message.name">
              <strong>{{ message.name }}</strong>
              {{ message.text }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="lives" class="live-section">
      <div class="section-heading">
        <span>Lives activos</span>
        <h2>Elige una sala y entra a comentar</h2>
      </div>

      <div class="live-grid">
        <button
          v-for="live in lives"
          :key="live.title"
          class="live-card"
          :class="{ active: activeLive === live.title }"
          :style="{ '--accent': live.accent }"
          @click="emit('update:activeLive', live.title)"
        >
          <div class="live-card-top">
            <span class="live-dot"></span>
            <strong>{{ live.viewers }} viendo</strong>
          </div>
          <h3>{{ live.title }}</h3>
          <p>{{ live.topic }}</p>
          <small>{{ live.host }}</small>
        </button>
      </div>
    </section>

    <section class="community-layout">
      <div class="thread-panel">
        <div class="section-heading compact">
          <span>Hilos populares</span>
          <h2>La conversacion sigue despues del directo</h2>
        </div>

        <button v-for="thread in communityThreads" :key="thread.title" class="thread-row">
          <span>{{ thread.tag }}</span>
          <div>
            <h3>{{ thread.title }}</h3>
            <p>Por {{ thread.author }} - {{ thread.replies }} respuestas</p>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <aside class="join-panel">
        <i class="fas fa-user-plus"></i>
        <h2>Crea tu usuario y participa</h2>
        <p>
          Desde tu dashboard podras publicar hilos, guardar favoritos y preparar tu perfil
          para que otros te reconozcan en la comunidad.
        </p>
        <button @click="emit('join')">Crear perfil</button>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.community-page {
  background:
    radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.22), transparent 32%),
    radial-gradient(circle at 82% 10%, rgba(236, 72, 153, 0.13), transparent 28%),
    linear-gradient(180deg, #070817 0%, #100927 48%, #060814 100%);
  color: #f8fafc;
  min-height: 100vh;
  padding: var(--public-page-top, 88px) 16px 0;
}

.community-hero {
  align-items: center;
  background:
    linear-gradient(90deg, rgba(5, 7, 18, 0.92), rgba(26, 12, 58, 0.56), rgba(5, 7, 18, 0.18)),
    linear-gradient(0deg, rgba(5, 7, 18, 0.94), rgba(5, 7, 18, 0.08)),
    url('/src/iconos/Banner.png') center / cover;
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 18px;
  box-shadow: 0 26px 90px rgba(0, 0, 0, 0.36);
  color: #ffffff;
  display: grid;
  gap: 42px;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.78fr);
  margin: 0 auto;
  max-width: 1400px;
  min-height: min(720px, calc(100vh - 126px));
  overflow: hidden;
  padding: 56px;
  position: relative;
}

.community-hero::before {
  background:
    radial-gradient(circle at 26% 22%, rgba(168, 85, 247, 0.18), transparent 28%),
    rgba(255, 255, 255, 0.025);
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.hero-copy {
  max-width: 680px;
  position: relative;
  z-index: 1;
}

.hero-kicker {
  align-items: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  padding: 8px 12px;
  text-transform: uppercase;
}

.hero-copy h1 {
  font-size: clamp(36px, 6vw, 68px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.98;
  margin-top: 20px;
}

.hero-copy p {
  color: #e5e7eb;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.7;
  margin-top: 22px;
  max-width: 620px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.primary-action,
.secondary-action {
  align-items: center;
  border-radius: 8px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 9px;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  text-transform: uppercase;
}

.primary-action {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  box-shadow: 0 16px 34px rgba(124, 58, 237, 0.32);
  color: #ffffff;
}

.secondary-action {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.live-stage {
  display: grid;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.live-screen,
.chat-preview,
.live-card,
.thread-panel,
.join-panel {
  background: rgba(9, 13, 30, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.26);
}

.live-screen {
  aspect-ratio: 16 / 9;
  background:
    linear-gradient(135deg, rgba(12, 74, 110, 0.9), rgba(88, 28, 135, 0.88)),
    url('/src/iconos/hero.png') center / cover;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  padding: 24px;
}

.live-badge {
  align-items: center;
  background: #ef4444;
  border-radius: 999px;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  margin-bottom: auto;
  padding: 7px 10px;
  width: fit-content;
}

.live-badge span,
.live-dot {
  background: currentColor;
  border-radius: 999px;
  display: inline-flex;
  height: 7px;
  width: 7px;
}

.live-screen strong {
  font-size: 26px;
  font-weight: 900;
}

.live-screen p {
  color: #dbeafe;
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
}

.chat-preview {
  color: #111827;
  padding: 16px;
}

.chat-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chat-head span,
.live-card h3,
.thread-row h3,
.join-panel h2,
.section-heading h2 {
  color: #ffffff;
}

.chat-head span {
  font-size: 14px;
  font-weight: 900;
}

.chat-head small {
  color: #16a34a;
  font-size: 11px;
  font-weight: 900;
}

.chat-list {
  display: grid;
  gap: 8px;
}

.chat-list p {
  background: rgba(10, 15, 34, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  color: #dbeafe;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  padding: 10px;
}

.chat-list strong,
.section-heading span {
  color: #c084fc;
}

.chat-list strong {
  margin-right: 6px;
}

.live-section,
.community-layout {
  margin: 0 auto;
  max-width: 1400px;
  padding: 54px 24px 0;
}

.section-heading span {
  display: block;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.section-heading h2 {
  font-size: 28px;
  font-weight: 900;
  margin-top: 6px;
}

.section-heading.compact h2 {
  font-size: 22px;
}

.live-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 22px;
}

.live-card {
  color: #111827;
  padding: 20px;
  text-align: left;
}

.live-card.active {
  border-color: var(--accent);
  box-shadow: 0 18px 36px rgba(124, 58, 237, 0.12);
}

.live-card-top {
  align-items: center;
  color: var(--accent);
  display: flex;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  text-transform: uppercase;
}

.live-card h3 {
  font-size: 18px;
  font-weight: 900;
  margin-top: 14px;
}

.live-card p,
.live-card small,
.thread-row p,
.join-panel p {
  color: #b8c1d8;
}

.live-card p {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
  margin-top: 8px;
}

.live-card small {
  display: block;
  font-size: 11px;
  font-weight: 900;
  margin-top: 16px;
  text-transform: uppercase;
}

.community-layout {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) 320px;
  padding-bottom: 64px;
}

.thread-panel,
.join-panel {
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
  padding: 22px;
}

.thread-row {
  align-items: center;
  background: rgba(10, 15, 34, 0.5);
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  color: #dbeafe;
  display: grid;
  gap: 16px;
  grid-template-columns: 92px minmax(0, 1fr) 16px;
  margin-top: 18px;
  padding-top: 18px;
  position: relative;
  text-align: left;
  width: 100%;
}

.thread-row > span {
  background: #eef2ff;
  border-radius: 999px;
  color: #4f46e5;
  font-size: 10px;
  font-weight: 900;
  padding: 6px 9px;
  text-align: center;
  text-transform: uppercase;
}

.thread-row h3 {
  font-size: 15px;
  font-weight: 900;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.thread-row p {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.thread-row i {
  color: #cbd5e1;
}

.join-panel {
  align-self: start;
}

.join-panel i {
  align-items: center;
  background: #f3e8ff;
  border-radius: 8px;
  color: #7c3aed;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.join-panel h2 {
  font-size: 20px;
  font-weight: 900;
  line-height: 1.15;
  margin-top: 18px;
}

.join-panel p {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
  margin-top: 10px;
}

.join-panel button {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  border-radius: 8px;
  box-shadow: 0 16px 34px rgba(124, 58, 237, 0.32);
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  margin-top: 18px;
  min-height: 40px;
  padding: 0 16px;
  text-transform: uppercase;
}

@media (max-width: 940px) {
  .community-hero,
  .community-layout {
    grid-template-columns: 1fr;
  }

  .community-hero {
    min-height: auto;
  }
}

@media (max-width: 720px) {
  .community-page {
    padding: var(--public-page-top-mobile, 76px) 10px 0;
  }

  .community-hero {
    border-radius: 14px;
    gap: 28px;
    padding: 34px 16px;
  }

  .hero-copy h1 {
    font-size: 36px;
    line-height: 1.02;
  }

  .hero-copy p {
    font-size: 14px;
  }

  .hero-actions {
    display: grid;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }

  .live-section,
  .community-layout {
    padding-left: 16px;
    padding-right: 16px;
  }

  .section-heading h2 {
    font-size: 24px;
  }

  .live-grid {
    grid-template-columns: 1fr;
  }

  .thread-panel,
  .join-panel {
    padding: 18px;
  }

  .thread-row {
    align-items: start;
    gap: 8px 12px;
    grid-template-columns: minmax(0, 1fr) 16px;
    padding-right: 2px;
  }

  .thread-row > span {
    grid-column: 1;
    grid-row: 1;
    width: fit-content;
  }

  .thread-row > div {
    grid-column: 1 / -1;
    grid-row: 2;
    min-width: 0;
  }

  .thread-row i {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    margin-top: 4px;
  }
}

@media (max-width: 420px) {
  .hero-copy h1 {
    font-size: 32px;
  }

  .section-heading.compact h2 {
    font-size: 19px;
    line-height: 1.2;
  }

  .thread-row h3 {
    font-size: 14px;
  }
}
</style>
