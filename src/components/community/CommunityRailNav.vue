<script setup>
const props = defineProps({
  communities: {
    type: Array,
    default: () => []
  },
  selectedId: {
    type: String,
    default: ''
  },
  canCreate: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select', 'create', 'explore'])
</script>

<template>
  <nav v-if="props.communities.length" class="community-rail-nav" aria-label="Comunidades">
    <button
      v-for="community in props.communities"
      :key="community.id"
      type="button"
      :aria-label="`Ir a ${community.name}`"
      :class="{
        active: props.selectedId === community.id,
        official: community.isOfficial || community.id === 'galaxia-oficial'
      }"
      :title="community.name"
      @click="$emit('select', community)"
    >
      <span>
        <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
        <b v-else>{{ community.name.slice(0, 2).toUpperCase() }}</b>
      </span>
      <strong>{{ community.name }}</strong>
    </button>

    <button v-if="props.canCreate" type="button" class="community-nav-create" @click="$emit('create')">
      <span><i class="fas fa-plus"></i></span>
      <strong>Crear</strong>
    </button>

    <button type="button" class="community-nav-more" @click="$emit('explore')">
      <span><i class="fas fa-compass"></i></span>
      <strong>Explorar</strong>
    </button>
  </nav>
</template>

<style scoped>
.community-rail-nav {
  align-items: center;
  backdrop-filter: blur(18px);
  background: rgba(8, 12, 30, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.32);
  display: flex;
  gap: 6px;
  max-width: calc(100vw - 24px);
  overflow-x: auto;
  padding: 7px 10px;
  scrollbar-width: none;
}

.community-rail-nav::-webkit-scrollbar {
  display: none;
}

.community-rail-nav button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  color: #e5e7eb;
  display: grid;
  flex: 0 0 auto;
  gap: 0;
  grid-template-columns: 38px;
  height: 48px;
  justify-items: center;
  min-width: 48px;
  padding: 5px;
  position: relative;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, width 0.18s ease;
  width: 48px;
}

.community-rail-nav button:hover,
.community-rail-nav button:focus-visible,
.community-rail-nav button.active {
  background: rgba(124, 58, 237, 0.2);
  border-color: rgba(192, 132, 252, 0.3);
  transform: translateY(-1px);
}

.community-rail-nav button.official {
  background: rgba(124, 58, 237, 0.28);
  border-color: rgba(192, 132, 252, 0.32);
  gap: 8px;
  grid-template-columns: 38px minmax(0, 1fr);
  padding-right: 14px;
  width: 186px;
}

.community-rail-nav span {
  border-radius: 999px;
  display: grid;
  height: 38px;
  overflow: hidden;
  place-items: center;
  width: 38px;
}

.community-rail-nav img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.community-rail-nav b,
.community-nav-create span,
.community-nav-more span {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #ffffff;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  height: 100%;
  justify-content: center;
  width: 100%;
}

.community-nav-create span {
  background: linear-gradient(135deg, #a855f7, #ec4899);
}

.community-nav-more span {
  background: linear-gradient(135deg, #7c3aed, #c026d3);
}

.community-rail-nav strong {
  color: #ffffff;
  display: none;
  font-size: 11px;
  font-weight: 950;
  line-height: 1.05;
  max-width: 118px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.community-rail-nav button.official strong {
  display: block;
}

@media (max-width: 859px) {
  .community-rail-nav {
    gap: 6px;
    max-width: 100%;
    padding: 6px;
  }

  .community-rail-nav button,
  .community-rail-nav button.official {
    gap: 0;
    grid-template-columns: 34px;
    height: 42px;
    min-width: 42px;
    padding: 4px;
    width: 42px;
  }

  .community-rail-nav button:nth-of-type(n+4):not(.community-nav-more),
  .community-nav-create {
    display: none;
  }

  .community-rail-nav button.official strong,
  .community-rail-nav strong {
    display: none;
  }

  .community-rail-nav span {
    height: 34px;
    width: 34px;
  }
}

@media (min-width: 1421px) {
  .community-rail-nav {
    align-items: stretch;
    border-radius: 28px;
    flex-direction: column;
    max-height: min(430px, calc(100dvh - var(--public-nav-offset, 72px) - 260px));
    max-width: 220px;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 10px;
    width: 220px;
  }

  .community-rail-nav button,
  .community-rail-nav button.official {
    gap: 10px;
    grid-template-columns: 42px minmax(0, 1fr);
    height: 50px;
    min-width: 50px;
    padding: 4px 12px 4px 4px;
    width: 100%;
  }

  .community-rail-nav button:hover,
  .community-rail-nav button:focus-visible,
  .community-rail-nav button.active {
    transform: translateX(2px);
  }

  .community-rail-nav span {
    height: 42px;
    width: 42px;
  }

  .community-rail-nav strong,
  .community-rail-nav button.official strong {
    display: block;
    max-width: 140px;
    opacity: 1;
    position: static;
    text-align: left;
    transform: none;
    width: auto;
  }
}

@media (min-width: 860px) and (max-width: 1420px) {
  .community-rail-nav {
    align-items: center;
    border-radius: 999px;
    flex-direction: row;
    gap: 6px;
    max-height: none;
    max-width: min(100%, 620px);
    overflow-x: auto;
    overflow-y: hidden;
    padding: 6px;
    width: auto;
  }

  .community-rail-nav button,
  .community-rail-nav button.official {
    gap: 0;
    grid-template-columns: 38px;
    height: 46px;
    justify-content: center;
    min-width: 46px;
    padding: 4px;
    width: 46px;
  }

  .community-rail-nav button:hover,
  .community-rail-nav button:focus-visible,
  .community-rail-nav button.active {
    transform: translateY(-1px);
  }

  .community-rail-nav span {
    height: 38px;
    width: 38px;
  }

  .community-rail-nav strong,
  .community-rail-nav button.official strong {
    display: none;
  }
}
</style>
