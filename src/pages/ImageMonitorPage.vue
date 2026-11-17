<script setup>
import { computed, onMounted, ref } from 'vue'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
import { imageMonitorAdminAction } from '@/services/imageMonitorClient'

const references = ref([])
const incidents = ref([])
const history = ref([])
const loading = ref(false)
const error = ref('')
const notice = ref('')
const reasonByReference = ref({})
const noteByIncident = ref({})
const workingId = ref('')

const openIncidents = computed(() => incidents.value.filter(item => item.adminState === 'open' || item.adminState === 'reviewed'))
const unresolvedCount = computed(() => openIncidents.value.length)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [referenceSnapshot, incidentSnapshot, historySnapshot] = await Promise.all([
      getDocs(query(collection(db, 'imageReferences'), orderBy('updatedAt', 'desc'), limit(100))),
      getDocs(query(collection(db, 'imageIncidents'), orderBy('reportedAt', 'desc'), limit(100))),
      getDocs(query(collection(db, 'imageHistory'), orderBy('at', 'desc'), limit(100)))
    ])
    references.value = referenceSnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    incidents.value = incidentSnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    history.value = historySnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
  } catch (cause) {
    error.value = 'No se pudieron cargar los registros. Comprueba que la sesión sea de una cuenta administradora activa.'
    console.error(cause)
  } finally {
    loading.value = false
  }
}

const operationId = () => globalThis.crypto?.randomUUID?.().replace(/-/g, '') || `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
const safeUrlLabel = value => {
  try { const parsed = new URL(value); return `${parsed.hostname}${parsed.pathname}` } catch { return String(value || '').split('?')[0] }
}
const ownerLabel = item => `${item.ownerType === 'event' ? 'Evento' : 'Post'} · ${item.ownerId} · ${item.fieldKey}`
const timeLabel = value => value ? new Date(value).toLocaleString() : '—'

const openIncident = async reference => {
  const reason = String(reasonByReference.value[reference.id] || '').trim()
  if (!reason) return
  workingId.value = reference.id
  error.value = ''
  try {
    await imageMonitorAdminAction('open-incident', {
      referenceId: reference.id, referenceVersion: reference.referenceVersion,
      reason, operationId: operationId()
    })
    reasonByReference.value[reference.id] = ''
    notice.value = 'Incidencia registrada.'
    await load()
  } catch (cause) {
    error.value = cause.message || 'No se pudo registrar la incidencia.'
  } finally { workingId.value = '' }
}

const transitionIncident = async (incident, adminState) => {
  workingId.value = incident.id
  error.value = ''
  try {
    await imageMonitorAdminAction('transition-incident', {
      incidentId: incident.id, adminState,
      ...(adminState === 'ignored' ? { ignoredUntil: Date.now() + 7 * 86400000 } : {}),
      operationId: operationId()
    })
    notice.value = adminState === 'resolved' ? 'Incidencia resuelta.' : adminState === 'ignored' ? 'Incidencia silenciada durante siete días.' : 'Incidencia marcada como revisada.'
    await load()
  } catch (cause) { error.value = cause.message || 'No se pudo actualizar la incidencia.' }
  finally { workingId.value = '' }
}

const addNote = async incident => {
  const note = String(noteByIncident.value[incident.id] || '').trim()
  if (!note) return
  workingId.value = incident.id
  error.value = ''
  try {
    await imageMonitorAdminAction('note', {
      referenceId: incident.referenceId, incidentId: incident.id, note, operationId: operationId()
    })
    noteByIncident.value[incident.id] = ''
    notice.value = 'Observación añadida al historial.'
    await load()
  } catch (cause) { error.value = cause.message || 'No se pudo guardar la observación.' }
  finally { workingId.value = '' }
}

onMounted(load)
</script>

<template>
  <main class="monitor-page">
    <header class="monitor-header">
      <div>
        <p class="eyebrow">ADMINISTRACIÓN · CONTENIDO</p>
        <h1>Monitor de imágenes</h1>
        <p>Referencias registradas y seguimiento manual de incidencias.</p>
      </div>
      <button class="refresh" type="button" :disabled="loading" @click="load">{{ loading ? 'Actualizando…' : 'Actualizar' }}</button>
    </header>

    <div class="status-banner"><strong>{{ unresolvedCount }}</strong> incidencias abiertas o revisadas <span>· Disponibilidad: sin comprobar automáticamente</span></div>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="notice" class="feedback" role="status">{{ notice }}</p>

    <section class="monitor-section">
      <div class="section-heading"><div><h2>Referencias</h2><p>Hasta 100 registros recientes; la URL se muestra sin parámetros.</p></div><span>{{ references.length }}</span></div>
      <p v-if="!loading && !references.length" class="empty">Aún no hay referencias registradas.</p>
      <article v-for="reference in references" :key="reference.id" class="reference-card">
        <div class="reference-main">
          <strong>{{ ownerLabel(reference) }}</strong>
          <span class="url-label" :title="safeUrlLabel(reference.originalUrl)">{{ safeUrlLabel(reference.originalUrl) }}</span>
          <small>Versión {{ reference.referenceVersion }} · {{ reference.availability }} · {{ reference.adminState }}</small>
        </div>
        <div class="incident-create">
          <input v-model="reasonByReference[reference.id]" maxlength="1000" placeholder="Motivo de incidencia" />
          <button type="button" :disabled="workingId === reference.id || !reasonByReference[reference.id]?.trim()" @click="openIncident(reference)">Registrar</button>
        </div>
      </article>
    </section>

    <section class="monitor-section">
      <div class="section-heading"><div><h2>Incidencias</h2><p>Estados administrativos independientes de la disponibilidad técnica.</p></div><span>{{ incidents.length }}</span></div>
      <p v-if="!loading && !incidents.length" class="empty">No hay incidencias.</p>
      <article v-for="incident in incidents" :key="incident.id" class="incident-card">
        <div class="incident-main">
          <strong>{{ incident.reason }}</strong>
          <small>Ref. {{ incident.referenceId.slice(0, 12) }}… · versión {{ incident.referenceVersion }} · {{ timeLabel(incident.reportedAt) }}</small>
          <span class="state" :data-state="incident.adminState">{{ incident.adminState }}</span>
        </div>
        <div v-if="incident.adminState !== 'resolved'" class="incident-actions">
          <button type="button" :disabled="workingId === incident.id" @click="transitionIncident(incident, 'reviewed')">Revisar</button>
          <button type="button" :disabled="workingId === incident.id" @click="transitionIncident(incident, 'ignored')">Silenciar 7 días</button>
          <button type="button" class="resolve" :disabled="workingId === incident.id" @click="transitionIncident(incident, 'resolved')">Resolver</button>
        </div>
        <div class="note-row"><input v-model="noteByIncident[incident.id]" maxlength="1000" placeholder="Añadir observación al historial" /><button type="button" :disabled="workingId === incident.id || !noteByIncident[incident.id]?.trim()" @click="addNote(incident)">Guardar nota</button></div>
      </article>
    </section>

    <section class="monitor-section">
      <div class="section-heading"><div><h2>Historial reciente</h2><p>Entradas inmutables del backend.</p></div><span>{{ history.length }}</span></div>
      <article v-for="entry in history" :key="entry.id" class="history-row">
        <strong>{{ entry.kind }}</strong><span>{{ entry.referenceId.slice(0, 16) }}…</span><small>{{ timeLabel(entry.at) }}</small>
      </article>
    </section>
  </main>
</template>

<style scoped>
.monitor-page{min-height:100vh;padding:clamp(20px,4vw,48px);background:#0b1020;color:#e7edf8;font-family:Inter,system-ui,sans-serif}.monitor-header{display:flex;align-items:center;justify-content:space-between;gap:20px;max-width:1180px;margin:0 auto 22px}.eyebrow{margin:0 0 8px;color:#bca3ff;font-size:11px;font-weight:800;letter-spacing:.15em}.monitor-header h1{margin:0;font-size:clamp(28px,4vw,42px);letter-spacing:-.04em}.monitor-header p:last-child{margin:9px 0 0;color:#9aa8c0}.refresh,.incident-create button,.incident-actions button,.note-row button{border:1px solid #303b55;border-radius:9px;padding:10px 14px;background:#182238;color:#eef3ff;font-weight:700;cursor:pointer}.refresh:hover,.incident-create button:hover,.incident-actions button:hover,.note-row button:hover{border-color:#9d7cff;background:#272344}.refresh:disabled,button:disabled{opacity:.55;cursor:wait}.status-banner,.monitor-section,.feedback{max-width:1180px;margin-left:auto;margin-right:auto}.status-banner{padding:14px 18px;border:1px solid #6c54b355;border-radius:12px;background:#18152b;color:#d8cffc}.status-banner strong{font-size:22px}.status-banner span{color:#aeb9cc}.feedback{padding:12px 14px;border-radius:9px;background:#172b2a;color:#a7f3d0}.feedback.error{background:#321c28;color:#fecdd3}.monitor-section{margin-top:26px;padding:20px;border:1px solid #202a3e;border-radius:16px;background:#111a2c}.section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.section-heading h2{margin:0;font-size:19px}.section-heading p,.empty{margin:5px 0 0;color:#91a0b8;font-size:13px}.section-heading>span{display:grid;place-items:center;min-width:32px;height:32px;border-radius:10px;background:#222d43;color:#d6c9ff;font-weight:800}.reference-card,.incident-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid #263148}.reference-main,.incident-main{display:grid;gap:5px;min-width:0}.reference-main strong,.incident-main strong{font-size:14px}.url-label{overflow:hidden;max-width:580px;color:#b8c6dd;text-overflow:ellipsis;white-space:nowrap}.reference-main small,.incident-main small{color:#8594ad}.incident-create,.note-row{display:flex;gap:8px}.incident-create input,.note-row input{min-width:200px;border:1px solid #303b55;border-radius:8px;padding:9px 11px;background:#0c1424;color:#eef3ff}.incident-create button,.note-row button{padding:9px 12px}.incident-card{flex-wrap:wrap}.incident-main{flex:1 1 260px}.state{width:max-content;padding:4px 8px;border-radius:20px;background:#29223b;color:#d8c7ff;font-size:11px}.state[data-state=resolved]{background:#173129;color:#a7f3d0}.incident-actions{display:flex;flex-wrap:wrap;gap:7px}.incident-actions button{padding:8px 10px;font-size:12px}.incident-actions .resolve{border-color:#25634f;color:#a7f3d0}.note-row{flex:1 0 100%;justify-content:flex-end}.note-row input{flex:1}.history-row{display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:center;padding:11px 0;border-top:1px solid #263148;font-size:13px}.history-row span,.history-row small{color:#91a0b8}@media(max-width:760px){.monitor-header,.reference-card{align-items:stretch;flex-direction:column}.monitor-header{gap:14px}.refresh{align-self:flex-start}.monitor-section{padding:15px}.incident-create,.note-row{width:100%}.incident-create input,.note-row input{min-width:0;flex:1}.history-row{grid-template-columns:1fr auto}.history-row span{grid-column:1/-1;grid-row:2}.history-row small{grid-column:2;grid-row:1}}
</style>
