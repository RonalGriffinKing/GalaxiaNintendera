<script setup>
defineProps({
  stats: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <div class="profile-hero-stats" aria-label="Resumen rapido del perfil">
    <div v-for="item in stats" :key="item.id">
      <i :class="item.icon"></i>
      <strong>{{ item.value }}</strong>
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.profile-hero-stats {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.05);
  display: grid;
  gap: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 14px auto 0;
  max-width: var(--profile-content-width, min(1500px, calc(100vw - 48px)));
  overflow: hidden;
}

.profile-hero-stats div {
  align-items: center;
  display: grid;
  gap: 4px;
  justify-items: center;
  min-height: 88px;
  padding: 14px;
  position: relative;
  text-align: center;
}

.profile-hero-stats div + div::before {
  background: #e5e7eb;
  content: '';
  height: 42px;
  left: 0;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
}

.profile-hero-stats i {
  color: #8b5cf6;
}

.profile-hero-stats strong {
  color: #111827;
  font-size: 21px;
  font-weight: 950;
}

.profile-hero-stats span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

@media (max-width: 680px) {
  .profile-hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-hero-stats div + div::before {
    display: none;
  }
}
</style>
