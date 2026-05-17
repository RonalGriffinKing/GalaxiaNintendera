<script setup>
defineProps({
  isOfficial: {
    type: Boolean,
    default: false
  },
  canCreate: {
    type: Boolean,
    default: false
  },
  hasBackground: {
    type: Boolean,
    default: false
  },
  community: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['create'])
</script>

<template>
  <div
    class="community-empty community-empty-threads"
    :class="{ 'with-background': hasBackground }"
  >
    <div class="empty-thread-visual">
      <img v-if="community?.iconUrl" :src="community.iconUrl" alt="" />
      <i v-else class="fas fa-wand-magic-sparkles"></i>
    </div>
    <h2>{{ isOfficial ? 'Aun no hay comunicados oficiales' : 'No hay hilos todavia en esta seccion' }}</h2>
    <p>{{ isOfficial ? 'Cuando haya un anuncio importante, live o evento, aparecera aqui para toda la galaxia.' : `Se el primero en compartir algo con la comunidad de ${community?.name || 'este espacio'}.` }}</p>
    <button v-if="canCreate" type="button" class="empty-create-thread" @click="emit('create')">
      <i class="fas fa-feather"></i>
      Crear publicacion
    </button>
  </div>
</template>

<style scoped>
.community-empty {
  background: rgba(255, 255, 255, 0.82);
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 22px;
  color: #64748b;
  font-weight: 900;
  padding: 28px;
  text-align: center;
}

.community-empty-threads.with-background {
  backdrop-filter: blur(10px);
}

.empty-thread-visual {
  align-items: center;
  background: #f5f3ff;
  border-radius: 24px;
  color: #8b5cf6;
  display: inline-flex;
  font-size: 30px;
  height: 84px;
  justify-content: center;
  margin-bottom: 14px;
  overflow: hidden;
  width: 84px;
}

.empty-thread-visual img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-empty h2 {
  color: #111827;
  font-size: 22px;
  font-weight: 950;
}

.community-empty p {
  color: #64748b;
  font-size: 14px;
  line-height: 1.55;
  margin: 8px auto 0;
  max-width: 520px;
}

.empty-create-thread {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  margin-top: 16px;
  min-height: 42px;
  padding: 0 16px;
}
</style>
