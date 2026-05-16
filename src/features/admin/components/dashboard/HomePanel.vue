<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  userRole: {
    type: String,
    default: 'user'
  }
})

const router = useRouter()
const isAdmin = computed(() => props.userRole === 'admin')

const readerLinks = [
  { label: 'Noticias', text: 'Lee las ultimas publicaciones aprobadas.', icon: 'fas fa-newspaper', to: '/noticias' },
  { label: 'Guias', text: 'Explora consejos y ayuda para tus juegos.', icon: 'fas fa-book-open', to: '/guias' },
  { label: 'Rumores', text: 'Mira filtraciones y teorias recientes.', icon: 'fas fa-question-circle', to: '/rumores' },
  { label: 'Comunidades', text: 'Entra a hilos y conversaciones en vivo.', icon: 'fas fa-comments', to: '/comunidad' }
]

const goTo = (to) => {
  router.push(to)
}
</script>

<template>
  <div class="relative min-h-full">

    <div class="panel-header">
      <div>
        <h1 class="panel-title">Dashboard</h1>
        <p class="panel-subtitle">Resumen general de la actividad</p>
      </div>
    </div>

    <div v-if="isAdmin" class="grid grid-cols-1 md:grid-cols-3 gap-3">

      <div class="app-card p-4">
        <p class="app-meta mb-2">Visitas</p>
        <h2 class="text-xl font-black text-gray-800">1,245</h2>
      </div>

      <div class="app-card p-4">
        <p class="app-meta mb-2">Posts</p>
        <h2 class="text-xl font-black text-gray-800">32</h2>
      </div>

      <div class="app-card p-4">
        <p class="app-meta mb-2">Usuarios</p>
        <h2 class="text-xl font-black text-gray-800">12</h2>
      </div>

    </div>

    <section class="reader-gateway">
      <div class="reader-head">
        <div>
          <h2>Zona de lectura</h2>
          <p>Accesos rapidos para moverte por noticias, guias, rumores y comunidades.</p>
        </div>

        <button @click="goTo('/')">
          <i class="fas fa-globe"></i>
          Ir a la web
        </button>
      </div>

      <div class="reader-grid">
        <button
          v-for="link in readerLinks"
          :key="link.label"
          class="reader-card"
          @click="goTo(link.to)"
        >
          <span>
            <i :class="link.icon"></i>
          </span>
          <div>
            <strong>{{ link.label }}</strong>
            <p>{{ link.text }}</p>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </section>

  </div>
</template>

<style scoped>
.reader-gateway {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  margin-top: 18px;
  padding: 18px;
}

.reader-head {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.reader-head h2 {
  color: #111827;
  font-size: 17px;
  font-weight: 900;
}

.reader-head p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  margin-top: 4px;
}

.reader-head button {
  align-items: center;
  background: #111827;
  border-radius: 10px;
  color: #ffffff;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  text-transform: uppercase;
}

.reader-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reader-card {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: grid;
  gap: 12px;
  grid-template-columns: 42px minmax(0, 1fr) 14px;
  padding: 14px;
  text-align: left;
}

.reader-card > span {
  align-items: center;
  background: #f3e8ff;
  border-radius: 10px;
  color: #7c3aed;
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.reader-card strong {
  color: #111827;
  display: block;
  font-size: 13px;
  font-weight: 900;
}

.reader-card p {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 3px;
}

.reader-card > i {
  color: #cbd5e1;
  font-size: 12px;
}

@media (max-width: 860px) {
  .reader-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .reader-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
