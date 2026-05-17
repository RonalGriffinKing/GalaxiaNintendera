<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  },
  formatDate: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['open-community', 'open-item'])
</script>

<template>
  <section class="community-stories-panel media-center-panel">
    <div class="panel-heading">
      <h2>
        <span></span>
        Videos, lives y podcasts
      </h2>
      <button @click="emit('open-community')">
        Ver canal
        <i class="fas fa-arrow-right"></i>
      </button>
    </div>

    <div class="media-hero-card">
      <span><i class="fas fa-satellite-dish"></i> Galaxia Nintendera</span>
      <h3>{{ items[0]?.title || 'Directos, videos y podcasts oficiales' }}</h3>
      <p>{{ items[0]?.description || 'Aqui apareceran los estrenos de YouTube, lives programados, podcasts y comunicados multimedia.' }}</p>
      <button type="button" @click="items[0] ? emit('open-item', items[0]) : emit('open-community')">
        {{ items[0] ? 'Ver ahora' : 'Ir a la comunidad oficial' }}
        <i class="fas fa-arrow-right"></i>
      </button>
    </div>

    <div class="media-chip-grid">
      <button type="button" @click="emit('open-community')">
        <i class="fas fa-video"></i>
        Lives
      </button>
      <button type="button" @click="emit('open-community')">
        <i class="fas fa-play"></i>
        Videos
      </button>
      <button type="button" @click="emit('open-community')">
        <i class="fas fa-headphones"></i>
        Podcasts
      </button>
      <button type="button" @click="emit('open-community')">
        <i class="far fa-calendar"></i>
        Eventos
      </button>
    </div>

    <div class="media-list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="media-row"
        @click="emit('open-item', item)"
      >
        <span><i class="fas fa-play"></i></span>
        <div>
          <strong>{{ item.title }}</strong>
          <small>{{ item.type }} - {{ formatDate(item.startsAt) }}</small>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.community-stories-panel {
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  padding: 18px;
}

.media-center-panel {
  display: grid;
  gap: 16px;
}

.panel-heading {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.panel-heading h2 {
  align-items: center;
  display: flex;
  font-size: 21px;
  gap: 10px;
}

.panel-heading h2 span {
  background: linear-gradient(135deg, #a855f7, #ec4899);
  border-radius: 999px;
  height: 12px;
  width: 12px;
}

.panel-heading button {
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 900;
}

.media-hero-card {
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.32), rgba(236, 72, 153, 0.24)),
    rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  min-height: 220px;
  padding: 22px;
}

.media-hero-card span,
.media-hero-card small {
  color: #c4b5fd;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.media-hero-card h3 {
  font-size: clamp(24px, 3vw, 38px);
  line-height: 1;
  margin-top: 18px;
  max-width: 620px;
}

.media-hero-card p {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.55;
  margin-top: 12px;
  max-width: 620px;
}

.media-hero-card button {
  align-items: center;
  background: #ffffff;
  border-radius: 999px;
  color: #111827;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 9px;
  margin-top: 18px;
  padding: 11px 16px;
}

.media-chip-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.media-chip-grid button {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #ffffff;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  justify-content: center;
  min-height: 44px;
}

.media-chip-grid i {
  color: #f0abfc;
}

.media-list {
  display: grid;
  gap: 10px;
}

.media-row {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  gap: 11px;
  grid-template-columns: 40px minmax(0, 1fr);
  padding: 11px;
  text-align: left;
}

.media-row > span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 13px;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.media-row strong {
  display: block;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-row small {
  color: #94a3b8;
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 3px;
}

@media (max-width: 680px) {
  .community-stories-panel {
    border-radius: 22px;
    padding: 14px;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .media-chip-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
