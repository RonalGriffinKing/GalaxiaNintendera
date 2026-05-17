<script setup>
defineProps({
  community: {
    type: Object,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  isJoined: {
    type: Boolean,
    default: false
  },
  isToggling: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'toggle-membership'])
</script>

<template>
  <section class="galaxy-hero" :style="{ '--community-banner': community.bannerUrl ? `url(${community.bannerUrl})` : `url('/src/iconos/Banner.png')` }">
    <div class="galaxy-icon">
      <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
      <span v-else>{{ community.name.slice(0, 2).toUpperCase() }}</span>
    </div>
    <div class="galaxy-copy">
      <span>{{ isOfficial ? 'Oficial' : 'Galaxia' }}</span>
      <h1>{{ community.name }} <i class="fas fa-circle-check"></i></h1>
      <p>{{ community.description }}</p>
    </div>
    <div class="galaxy-actions">
      <button v-if="isAdmin" type="button" class="admin-action" @click="emit('edit', community)">
        <i class="fas fa-pen"></i>
        Editar
      </button>
      <button v-if="isAdmin && !isOfficial" type="button" class="admin-danger" @click="emit('delete', community)">
        <i class="fas fa-trash"></i>
        Eliminar
      </button>
      <button v-if="!isOfficial" type="button" :class="{ joined: isJoined }" :disabled="isToggling" @click="emit('toggle-membership')">
        <i :class="isJoined ? 'fas fa-check' : 'far fa-star'"></i>
        {{ isToggling ? 'Guardando...' : (isJoined ? 'Salir' : 'Unirse') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.galaxy-hero {
  align-items: end;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(88, 28, 135, 0.54)),
    var(--community-banner);
  background-position: center;
  background-size: cover;
  border-radius: 28px;
  display: grid;
  gap: 18px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 260px;
  overflow: hidden;
  padding: 28px;
  position: relative;
}

.galaxy-hero::before {
  background: radial-gradient(circle at 20% 10%, rgba(236, 72, 153, 0.36), transparent 28%);
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.galaxy-hero > * {
  position: relative;
  z-index: 1;
}

.galaxy-icon {
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  display: flex;
  height: 92px;
  justify-content: center;
  overflow: hidden;
  width: 92px;
}

.galaxy-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.galaxy-icon span {
  color: #7c3aed;
  font-size: 25px;
  font-weight: 950;
}

.galaxy-copy span {
  color: #f0abfc;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.galaxy-copy h1 {
  color: #ffffff;
  font-size: clamp(34px, 5vw, 60px);
  line-height: 0.95;
  margin-top: 6px;
}

.galaxy-copy h1 i {
  color: #60a5fa;
  font-size: 22px;
}

.galaxy-copy p {
  color: #e0e7ff;
  font-size: 15px;
  line-height: 1.55;
  margin-top: 12px;
  max-width: 700px;
}

.galaxy-actions {
  align-items: end;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.galaxy-actions button {
  align-items: center;
  background: rgba(255, 255, 255, 0.93);
  border-radius: 999px;
  color: #111827;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  white-space: nowrap;
}

.galaxy-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.galaxy-actions button.joined {
  background: #dcfce7;
  color: #166534;
}

.galaxy-actions .admin-action {
  background: #eef2ff;
  color: #ffffff;
}

.galaxy-actions .admin-danger {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 760px) {
  .galaxy-hero {
    align-items: start;
    grid-template-columns: 1fr;
    min-height: 0;
    padding: 22px;
  }

  .galaxy-icon {
    height: 76px;
    width: 76px;
  }

  .galaxy-actions {
    align-items: stretch;
    width: 100%;
  }

  .galaxy-actions button {
    justify-content: center;
    width: 100%;
  }
}
</style>
