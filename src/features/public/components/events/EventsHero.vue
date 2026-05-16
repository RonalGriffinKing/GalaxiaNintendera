<script setup>
defineProps({
  canCreate: {
    type: Boolean,
    default: false
  }
})

defineEmits(['create'])
</script>

<template>
  <section class="events-hero-premium">
    <div>
      <h1>Eventos</h1>
      <p>Descubre y participa en los eventos mas epicos de Nintendo y la comunidad.</p>
    </div>
    <button v-if="canCreate" type="button" @click="$emit('create')">
      <i class="far fa-calendar-plus"></i>
      Crear evento
    </button>
  </section>
</template>

<style scoped>
.events-hero-premium {
  align-items: center;
  background:
    linear-gradient(90deg, rgba(5, 8, 22, 0.96) 0%, rgba(5, 8, 22, 0.82) 46%, rgba(5, 8, 22, 0.52) 100%),
    url('/src/iconos/Banner.png');
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

.events-hero-premium button {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-weight: 950;
  gap: 9px;
  min-height: 44px;
  padding: 0 18px;
}

@media (max-width: 680px) {
  .events-hero-premium {
    align-items: flex-start;
    display: grid;
    gap: 18px;
    min-height: 190px;
    padding: 22px;
  }

  .events-hero-premium button {
    justify-content: center;
    width: 100%;
  }
}
</style>
