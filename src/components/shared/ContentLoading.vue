<script setup>
const props = defineProps({
  module: {
    type: String,
    default: 'posts'
  },
  variant: {
    type: String,
    default: 'skeleton'
  }
})

const rows = Array.from({ length: 6 }, (_, index) => index)
const cards = Array.from({ length: 8 }, (_, index) => index)
</script>

<template>
  <div class="content-loading" :class="[`is-${props.variant}`, `module-${props.module}`]" role="status" aria-live="polite">
    <div v-if="props.variant === 'inline'" class="inline-spinner">
      <i class="fas fa-circle-notch fa-spin"></i>
    </div>

    <template v-else-if="props.module === 'users'">
      <div class="skeleton-toolbar">
        <span class="sk sk-tabs"></span>
        <span class="sk sk-button"></span>
      </div>
      <div class="users-skeleton-grid">
        <article v-for="item in cards.slice(0, 6)" :key="item" class="user-skeleton-card">
          <span class="sk sk-avatar"></span>
          <div>
            <span class="sk sk-title"></span>
            <span class="sk sk-line short"></span>
            <span class="sk sk-line"></span>
          </div>
          <span class="sk sk-actions"></span>
        </article>
      </div>
    </template>

    <template v-else-if="props.module === 'pages'">
      <div class="skeleton-toolbar">
        <span class="sk sk-tabs wide"></span>
        <span class="sk sk-button"></span>
      </div>
      <div class="pages-skeleton-list">
        <article v-for="item in rows" :key="item" class="page-skeleton-card">
          <span class="sk sk-icon"></span>
          <div>
            <span class="sk sk-kicker"></span>
            <span class="sk sk-title wide"></span>
            <span class="sk sk-line"></span>
          </div>
          <span class="sk sk-actions"></span>
        </article>
      </div>
    </template>

    <template v-else-if="props.module === 'overlays'">
      <div class="skeleton-toolbar">
        <span class="sk sk-title wide"></span>
        <span class="sk sk-button"></span>
      </div>
      <div class="overlays-skeleton-grid">
        <article v-for="item in cards" :key="item" class="overlay-skeleton-card">
          <span class="sk sk-preview"></span>
          <span class="sk sk-title"></span>
          <span class="sk sk-line short"></span>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="skeleton-toolbar">
        <span class="sk sk-tabs"></span>
        <span class="sk sk-filters"></span>
      </div>
      <div class="table-skeleton">
        <div class="table-skeleton-head">
          <span v-for="item in 5" :key="item" class="sk sk-head"></span>
        </div>
        <div v-for="row in rows" :key="row" class="table-skeleton-row">
          <span class="sk sk-thumb"></span>
          <span class="sk sk-title wide"></span>
          <span class="sk sk-pill"></span>
          <span class="sk sk-pill green"></span>
          <span class="sk sk-actions"></span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.content-loading {
  min-height: 320px;
  position: relative;
}

.inline-spinner {
  align-items: center;
  color: #8b5cf6;
  display: flex;
  font-size: 22px;
  justify-content: center;
  min-height: 280px;
}

.skeleton-toolbar {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 18px;
}

.sk {
  animation: skeletonPulse 1.15s ease-in-out infinite;
  background: linear-gradient(90deg, #eef2ff 0%, #f8fafc 48%, #f1f5f9 100%);
  border-radius: 10px;
  display: block;
  min-width: 0;
}

.sk-tabs { height: 42px; width: min(320px, 55%); }
.sk-tabs.wide { width: min(540px, 68%); }
.sk-filters { height: 42px; width: min(250px, 34%); }
.sk-button { height: 42px; width: 148px; }
.sk-head { height: 12px; width: 100%; }
.sk-thumb { aspect-ratio: 16 / 10; width: 74px; }
.sk-avatar { border-radius: 50%; height: 48px; width: 48px; }
.sk-icon { height: 54px; width: 54px; }
.sk-preview { border-radius: 12px 12px 0 0; height: 96px; width: 100%; }
.sk-title { height: 14px; width: min(220px, 78%); }
.sk-title.wide { width: min(440px, 90%); }
.sk-kicker { height: 10px; margin-bottom: 8px; width: 120px; }
.sk-line { height: 11px; margin-top: 9px; width: min(320px, 86%); }
.sk-line.short { width: 46%; }
.sk-pill { border-radius: 999px; height: 26px; width: 88px; }
.sk-pill.green { background: linear-gradient(90deg, #dcfce7, #f0fdf4, #dcfce7); }
.sk-actions { height: 30px; width: 142px; }

.table-skeleton {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

.table-skeleton-head,
.table-skeleton-row {
  align-items: center;
  border-bottom: 1px solid #eef2f7;
  display: grid;
  gap: 18px;
  grid-template-columns: 1.5fr 1fr 0.5fr 0.5fr 0.7fr;
  padding: 14px;
}

.table-skeleton-row {
  grid-template-columns: 74px minmax(180px, 1.6fr) minmax(90px, 0.6fr) minmax(90px, 0.5fr) minmax(120px, 0.7fr);
}

.users-skeleton-grid,
.overlays-skeleton-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.user-skeleton-card,
.page-skeleton-card,
.overlay-skeleton-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 14px;
}

.user-skeleton-card {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px minmax(0, 1fr) auto;
}

.pages-skeleton-list {
  display: grid;
  gap: 12px;
}

.page-skeleton-card {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: 58px minmax(0, 1fr) auto;
}

.overlays-skeleton-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.overlay-skeleton-card {
  display: grid;
  gap: 12px;
  padding: 0 0 14px;
  overflow: hidden;
}

.overlay-skeleton-card .sk-title,
.overlay-skeleton-card .sk-line {
  margin-left: 12px;
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 0.62; }
  50% { opacity: 1; }
}

@media (max-width: 760px) {
  .skeleton-toolbar,
  .table-skeleton-head {
    display: none;
  }

  .table-skeleton {
    background: transparent;
    border: 0;
    display: grid;
    gap: 10px;
  }

  .table-skeleton-row,
  .page-skeleton-card,
  .user-skeleton-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    grid-template-columns: 74px minmax(0, 1fr);
  }

  .table-skeleton-row .sk-pill,
  .table-skeleton-row .sk-actions {
    display: none;
  }
}
</style>
