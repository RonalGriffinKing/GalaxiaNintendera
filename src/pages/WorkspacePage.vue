<script setup>
import FavoritesPanel from '@/components/shared/FavoritesPanel.vue'
</script>
<template>
 <main class="workspace-page">
  <header class="workspace-head"><div><span>Galaxia Nintendera</span><h1>Mis favoritos</h1><p>Noticias guardadas para leer después.</p></div></header>
  <section class="workspace-surface"><FavoritesPanel embedded /></section>
 </main>
</template>

<style scoped>
.workspace-page {
  background: var(--admin-bg);
  min-height: 100vh;
  padding: calc(var(--public-nav-offset, 0px) + 22px) 22px 34px;
  transition: padding-top 0.2s ease;
}

.workspace-head {
  align-items: end;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin: 0 auto 18px;
  max-width: 1280px;
}

.workspace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.workspace-actions button {
  align-items: center;
  background: linear-gradient(to right, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
}

.workspace-guide {
  background: linear-gradient(135deg, #111827, #581c87);
  border-radius: 14px;
  box-shadow: 0 18px 42px rgba(88, 28, 135, 0.16);
  color: #ffffff;
  margin: 0 auto 18px;
  max-width: 1280px;
  padding: 16px 18px;
}

.guide-title {
  align-items: center;
  display: flex;
  font-size: 13px;
  font-weight: 900;
  gap: 9px;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.guide-title i {
  color: #c084fc;
}

.workspace-guide ol {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.workspace-guide li {
  color: #e9d5ff;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
  list-style-position: inside;
}

.workspace-head span {
  color: var(--accent-hover);
  display: block;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.workspace-head h1 {
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
  margin-top: 4px;
}

.workspace-head p {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  margin-top: 5px;
}

.workspace-surface {
  margin: 0 auto;
  max-width: 1280px;
}

@media (max-width: 1100px) {
  .workspace-head { flex-wrap: wrap; align-items: start; }
  .workspace-guide ol { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .workspace-page {
    padding: calc(var(--public-nav-offset, 0px) + 16px) 12px 24px;
  }

  .workspace-head {
    align-items: start;
    display: grid;
  }

  .workspace-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    justify-content: stretch;
    width: 100%;
  }

  .workspace-actions button {
    justify-content: center;
  }

  .workspace-head h1 {
    font-size: 23px;
  }

  .workspace-guide {
    padding: 14px;
  }

  .workspace-guide ol {
    grid-template-columns: 1fr;
  }
}
</style>
