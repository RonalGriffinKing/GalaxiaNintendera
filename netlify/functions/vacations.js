import { getStore } from '@netlify/blobs'
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto'
import { defaultRules, validateBooking, validateMonthlyRequest, selectionWeeks, overlaps, MAX_VACATION_CHANGES } from '../../src/services/vacationRules.js'

const seed = () => ({ name: 'Russafa', people: ['Ivanna', 'Jonny', 'Esteban', 'Camilo', 'Antonio', 'Nacha', 'Miriam', 'Ronal'].map(name => ({ id: randomUUID(), name })), rules: defaultRules(), bookings: [] })
const password = () => process.env.VACATION_MANAGER_PASSWORD || 'Ronal1997'
const sign = payload => createHmac('sha256', process.env.VACATION_SESSION_SECRET || password()).update(payload).digest('hex')
function authorized(event) {
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer /, '')
  const [expires, signature] = token.split('.')
  const expected = sign(expires || '')
  return Number(expires) > Date.now() && signature?.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
const response = (statusCode, data) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) })
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
const validRanges = ranges => Array.isArray(ranges) && ranges.length <= 50 && ranges.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(validDate) && pair[0] <= pair[1])
const validQuotas = quotas => Array.isArray(quotas) && quotas.length === 3 && quotas.every(n => Number.isInteger(n) && n >= 0 && n <= 18)
export const createVacationHandler = storeProvider => async event => {
  try {
    const store = storeProvider()
    const query = event.queryStringParameters || {}
    const local = query.local || 'russafa'
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(local)) return response(400, { error: 'Local no válido.' })
    const body = event.body ? JSON.parse(event.body) : {}
    if (event.httpMethod === 'POST' && body.action === 'login') {
      const candidate = createHmac('sha256', 'login').update(String(body.password || '')).digest()
      const expected = createHmac('sha256', 'login').update(password()).digest()
      if (body.username !== 'Ronal' || !timingSafeEqual(candidate, expected)) return response(401, { error: 'Usuario o contraseña incorrectos.' })
      const expires = String(Date.now() + 4 * 3600000)
      return response(200, { token: `${expires}.${sign(expires)}` })
    }
    let entry = await store.getWithMetadata(local, { type: 'json' })
    if (!entry && local === 'russafa') {
      await store.setJSON(local, seed(), { onlyIfNew: true })
      entry = await store.getWithMetadata(local, { type: 'json' })
    }
    const manager = authorized(event)
    if (event.httpMethod === 'POST' && body.action === 'createLocal') {
      if (!manager) return response(401, { error: 'Inicia sesión como gerente.' })
      if (!body.name?.trim() || body.name.length > 80) return response(400, { error: 'Escribe el nombre del local (máximo 80 caracteres).' })
      const id = randomUUID()
      await store.setJSON(id, { name: body.name.trim(), people: [], bookings: [], rules: defaultRules() }, { onlyIfNew: true })
      return response(200, { id })
    }
    if (!entry) return response(404, { error: 'Este enlace de local no existe.' })
    if (event.httpMethod === 'GET') return response(200, entry.data)
    if (event.httpMethod !== 'POST') return response(405, { error: 'Método no permitido.' })
    const state = entry.data
    if (body.action === 'monthlyRequest') {
      const proposal = { person: body.person, start: body.start, weeks: 4, status: 'pending' }
      const error = validateMonthlyRequest(state, proposal)
      if (error) return response(400, { error })
      const existing = (state.monthlyRequests || []).find(r => r.person === proposal.person && r.start.slice(0, 4) === proposal.start.slice(0, 4))
      if (existing?.start === proposal.start) return response(400, { error: 'Ya has enviado esta propuesta. Puedes consultar su estado debajo del calendario.' })
      const key = `${proposal.person}:${proposal.start.slice(0, 4)}`
      const count = state.changeCounts?.[key] || 0
      if (existing && !manager && count >= MAX_VACATION_CHANGES) return response(403, { error: 'Has agotado tus 10 cambios. Contacta con gerencia.' })
      if (existing && !manager) state.changeCounts = { ...state.changeCounts, [key]: count + 1 }
      state.monthlyRequests = [...(state.monthlyRequests || []).filter(r => r.id !== existing?.id), { ...proposal, id: existing?.id || randomUUID() }]
    } else if (body.action === 'cancelMonthly') {
      const proposal = state.monthlyRequests?.find(r => r.id === body.id)
      if (!proposal) return response(404, { error: 'La consulta ya no existe.' })
      if (!manager && proposal.person !== body.person) return response(403, { error: 'Selecciona el nombre de la persona de esta consulta.' })
      const key = `${proposal.person}:${proposal.start.slice(0, 4)}`
      const count = state.changeCounts?.[key] || 0
      if (!manager && count >= MAX_VACATION_CHANGES) return response(403, { error: 'Has agotado tus 10 cambios. Contacta con gerencia.' })
      if (!manager) state.changeCounts = { ...state.changeCounts, [key]: count + 1 }
      state.monthlyRequests = state.monthlyRequests.filter(r => r.id !== proposal.id)
    } else if (body.action === 'reviewMonthly') {
      if (!manager) return response(403, { error: 'Solo gerencia puede resolver consultas.' })
      const proposal = state.monthlyRequests?.find(r => r.id === body.id)
      if (!proposal) return response(404, { error: 'La consulta ya no existe.' })
      if (!['approved', 'rejected', 'pending'].includes(body.status)) return response(400, { error: 'Estado no válido.' })
      proposal.status = body.status
    } else if (body.action === 'book') {
      const booking = { id: body.id || randomUUID(), person: body.person, start: body.start }
      const previous = state.bookings.find(b => b.id === body.id)
      if (previous?.quotaStart) booking.quotaStart = previous.quotaStart
      booking.weeks = body.weeks ?? selectionWeeks(state, booking.person, String(booking.start || ''), body.id)
      if (body.id && !manager) return response(403, { error: 'Solo gerencia puede editar reservas.' })
      if (body.id && !state.bookings.some(b => b.id === body.id)) return response(404, { error: 'La reserva ya no existe.' })
      const error = validateBooking(state, booking, body.id)
      if (error) return response(400, { error })
      const conflicts = state.bookings.filter(b => b.id !== body.id && b.person !== booking.person && overlaps(b, booking))
      if (conflicts.length && !body.confirmOverlap) return response(409, { error: 'Estas fechas ya están solicitadas. Puedes guardarlas como alternativa pendiente de coordinar con esas personas y gerencia.', conflicts })
      booking.pendingCoordination = conflicts.length > 0
      state.bookings = [...state.bookings.filter(b => b.id !== booking.id), booking]
    } else if (body.action === 'splitBooking') {
      const booking = state.bookings.find(b => b.id === body.id)
      if (!booking) return response(404, { error: 'La reserva ya no existe.' })
      if (!manager && body.person !== booking.person) return response(403, { error: 'Selecciona la persona de esta reserva.' })
      if (booking.weeks !== 2) return response(400, { error: 'Esta reserva no contiene dos semanas.' })
      const secondStart = new Date(`${booking.start}T12:00:00Z`)
      secondStart.setUTCDate(secondStart.getUTCDate() + 7)
      const quotaStart = booking.quotaStart || booking.start
      state.bookings = [...state.bookings.filter(b => b.id !== booking.id), { ...booking, quotaStart, weeks: 1 }, { ...booking, quotaStart, id: randomUUID(), weeks: 1, start: secondStart.toISOString().slice(0, 10) }]
    } else if (body.action === 'cancelBooking') {
      const booking = state.bookings.find(b => b.id === body.id)
      if (!booking) return response(404, { error: 'La reserva ya no existe. Actualiza el calendario.' })
      if (!manager && body.person !== booking.person) return response(403, { error: 'Solo puedes borrar las vacaciones del nombre que has seleccionado.' })
      const key = `${booking.person}:${booking.start.slice(0, 4)}`
      const count = state.changeCounts?.[key] || 0
      if (!manager && count >= MAX_VACATION_CHANGES) return response(403, { error: 'Has utilizado tus 10 cambios de este año. Contacta con gerencia para volver a cambiar las fechas.' })
      if (!manager) state.changeCounts = { ...state.changeCounts, [key]: count + 1 }
      state.bookings = state.bookings.filter(b => b.id !== booking.id)
    } else {
      if (!manager) return response(403, { error: 'Solo gerencia puede hacer este cambio.' })
      if (body.action === 'person') {
        if (!body.name?.trim() || body.name.length > 80) return response(400, { error: 'Escribe un nombre (máximo 80 caracteres).' })
        if (state.people.some(p => p.id !== body.id && p.name.toLowerCase() === body.name.trim().toLowerCase())) return response(400, { error: 'Ese nombre ya existe.' })
        if (body.id && !state.people.some(p => p.id === body.id)) return response(404, { error: 'Persona no encontrada.' })
        if (body.id) state.people.find(p => p.id === body.id).name = body.name.trim()
        else state.people.push({ id: randomUUID(), name: body.name.trim() })
      } else if (body.action === 'exception') {
        const e = body.exception
        if (!e || !state.people.some(p => p.id === e.person) || !Number.isInteger(e.year) || e.year < 2020 || e.year > 2100 || !validQuotas(e.quotas) || !validRanges(e.allowed) || e.allowed.some(range => range.some(d => Number(d.slice(0, 4)) !== e.year))) return response(400, { error: 'Revisa la persona, el año, las cuotas y el intervalo autorizado.' })
        state.exceptions = (state.exceptions || []).filter(item => item.person !== e.person || item.year !== e.year)
        if (!body.remove) state.exceptions.push({ person: e.person, year: e.year, quotas: e.quotas, allowed: e.allowed })
      } else if (body.action === 'datedBlocks') {
        if (!validRanges(body.ranges)) return response(400, { error: 'Revisa los días bloqueados.' })
        state.rules.datedBlocked = body.ranges
      } else if (body.action === 'deleteBooking') state.bookings = state.bookings.filter(b => b.id !== body.id)
      else if (body.action === 'rules') {
        const rules = body.rules
        if (!rules || !Array.isArray(rules.quotas) || rules.quotas.length !== 3 || !rules.quotas.every(n => Number.isInteger(n) && n >= 0 && n <= 18) || !Array.isArray(rules.blocked) || rules.blocked.length > 50 || !rules.blocked.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(d => /^\d{2}-\d{2}$/.test(d) && new Date(`2028-${d}T12:00:00Z`).toISOString().slice(5, 10) === d) && pair[0] <= pair[1])) return response(400, { error: 'Revisa las condiciones y fechas bloqueadas.' })
        state.rules = { quotas: rules.quotas, blocked: rules.blocked, datedBlocked: state.rules.datedBlocked || [] }
      } else return response(400, { error: 'Acción no válida.' })
    }
    const result = await store.setJSON(local, state, { onlyIfMatch: entry.etag })
    if (!result.modified) return response(409, { error: 'Otra persona acaba de modificar el calendario. Actualiza y vuelve a intentarlo.' })
    return response(200, state)
  } catch (error) {
    console.error('Vacations:', error.message)
    return response(503, { error: 'No se pudo conectar con el calendario compartido. Inténtalo de nuevo.' })
  }
}

const handleEvent = createVacationHandler(() => getStore({ name: 'team-vacations', consistency: 'strong' }))

// Use the native Functions runtime so Netlify supplies the Blobs environment.
// The legacy Lambda event did not reliably carry its storage credentials.
export default async function vacations(request) {
  const url = new URL(request.url)
  const result = await handleEvent({
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: ['GET', 'HEAD'].includes(request.method) ? '' : await request.text()
  })
  return new Response(result.body, { status: result.statusCode, headers: result.headers })
}
