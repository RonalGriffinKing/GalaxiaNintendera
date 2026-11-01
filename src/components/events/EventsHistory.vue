<script setup>
import { computed, ref, watch } from 'vue'
import { isEventActive, invitationDate } from '@/services/eventInvitation'
import { eventGameNames } from '@/services/eventGame'

const props = defineProps({ events: { type: Array, default: () => [] }, now: Number, ready: Boolean })
defineEmits(['close', 'view', 'reactivate', 'delete'])
const search = ref('')
const page = ref(1)
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const matches = computed(() => props.events
  .filter(event => !isEventActive(event, props.now))
  .filter(event => {
    const game = eventGameNames(event)
    return normalize([event.title, game.nameEs, game.nameEn].join(' ')).includes(normalize(search.value).trim())
  })
  .sort((a, b) => b.startsAt - a.startsAt))
const totalPages = computed(() => Math.max(1, Math.ceil(matches.value.length / 6)))
const visible = computed(() => matches.value.slice((page.value - 1) * 6, page.value * 6))
watch(search, () => { page.value = 1 })
watch(totalPages, value => { page.value = Math.min(page.value, value) })
</script>

<template>
  <section class="events-history" aria-labelledby="events-history-title">
    <header>
      <div><h2 id="events-history-title">Eventos anteriores</h2><p>Recupera un evento para volver a programarlo o elimínalo del servidor.</p></div>
      <button type="button" @click="$emit('close')">Cerrar historial</button>
    </header>
    <label class="history-search">Buscar por título o juego<input v-model="search" type="search" placeholder="Busca un live, torneo o juego..."></label>
    <p v-if="!ready" role="status">Cargando eventos anteriores...</p>
    <p v-else-if="!matches.length" role="status">{{ search ? 'No hay eventos anteriores con esa búsqueda.' : 'No hay eventos anteriores guardados.' }}</p>
    <article v-for="event in visible" :key="event.id">
      <div><strong>{{ event.title }}</strong><p>{{ event.type }} · {{ invitationDate(event).date }} · {{ invitationDate(event).time }}</p></div>
      <div class="history-actions">
        <button type="button" @click="$emit('view', event)">Ver</button>
        <button type="button" class="reactivate" @click="$emit('reactivate', event)">Reactivar</button>
        <button type="button" class="danger" @click="$emit('delete', event)">Eliminar</button>
      </div>
    </article>
    <nav v-if="totalPages > 1" aria-label="Páginas de eventos anteriores">
      <button type="button" :disabled="page === 1" @click="page--">Anterior</button>
      <span>{{ page }} de {{ totalPages }}</span>
      <button type="button" :disabled="page === totalPages" @click="page++">Siguiente</button>
    </nav>
  </section>
</template>

<style scoped>
.events-history{padding:22px;border:1px solid #a855f740;border-radius:18px;background:#0d0b22;color:#fff}
header,article,.history-actions,nav{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
h2{font-size:22px;font-weight:800}p,.history-search{color:#b9b4cd;font-size:13px;line-height:1.6}
button,input{border:1px solid #c4b5fd40;border-radius:10px;background:#211638;color:#fff;padding:10px 14px;font-size:13px}
button:disabled{opacity:.4}button:focus-visible,input:focus-visible{outline:2px solid #c4b5fd;outline-offset:3px}
.history-search{display:grid;gap:6px;margin:18px 0;max-width:480px}input{background:#080a1b;width:100%}
article{padding:16px 0;border-top:1px solid #c4b5fd20}article>div:first-child{min-width:0;flex:1 1 240px;overflow-wrap:anywhere}
.reactivate{background:#7c3aed}.danger{color:#fecaca;border-color:#f8717150}nav{justify-content:center;margin-top:12px}
</style>
