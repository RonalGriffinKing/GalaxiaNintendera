export const defaultRules = () => ({ quotas: [1, 2, 1], blocked: [['01-01', '01-15'], ['03-01', '03-31'], ['11-16', '11-30'], ['12-01', '12-31']] })
export const MAX_VACATION_CHANGES = 10
export const iso = date => date.toISOString().slice(0, 10)
export function weekDates(start, weeks = 1) {
  const date = new Date(`${start}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(+date) || iso(date) !== start) return []
  return Array.from({ length: 7 * weeks }, (_, index) => iso(new Date(+date + index * 86400000)))
}
export const bookingWeeks = booking => booking.weeks || 1
export const bookingDates = booking => weekDates(booking.start, bookingWeeks(booking))
export const overlaps = (a, b) => a.start <= bookingDates(b).at(-1) && b.start <= bookingDates(a).at(-1)
export const blockOf = date => Math.floor((Number(date.slice(5, 7)) - 1) / 4)
export function weekStart(day) {
  const dates = weekDates(day)
  if (!dates.length) return ''
  const date = new Date(`${day}T12:00:00Z`)
  return iso(new Date(+date - ((date.getUTCDay() + 6) % 7) * 86400000))
}
export const personException = (state, person, year) => state.exceptions?.find(e => e.person === person && e.year === Number(year))
export const quotaFor = (state, person, year, block) => personException(state, person, year)?.quotas?.[block] ?? state.rules.quotas[block]
export const usedWeeks = (state, person, year, block, exceptId) => state.bookings.filter(b => b.id !== exceptId && b.person === person && Number(b.start.slice(0, 4)) === Number(year) && blockOf(b.start) === block).reduce((sum, b) => sum + bookingWeeks(b), 0)
export function selectionWeeks(state, person, start, exceptId) {
  const existing = state.bookings.find(b => b.id === exceptId)
  if (existing) return bookingWeeks(existing)
  const block = blockOf(start)
  const remaining = quotaFor(state, person, start.slice(0, 4), block) - usedWeeks(state, person, start.slice(0, 4), block)
  return block === 1 && remaining >= 2 ? 2 : 1
}
export function isBlocked(state, day, person, start = weekStart(day)) {
  const exception = personException(state, person, day.slice(0, 4))
  if (exception?.allowed?.some(([from, to]) => day >= from && day <= to)) return false
  if (state.rules.datedBlocked?.some(([from, to]) => day >= from && day <= to)) return true
  return state.rules.blocked.some(([from, to]) => {
    if (day.slice(5) < from || day.slice(5) > to) return false
    // The February week may finish in March, but no week may start in March.
    if (from === '03-01' && start.slice(5, 7) === '02' && day.slice(0, 4) === start.slice(0, 4) && weekDates(start).includes(day)) return false
    return true
  })
}
export function validateBooking(state, booking, exceptId) {
  const weeks = booking.weeks ?? selectionWeeks(state, booking.person, booking.start, exceptId)
  if (![1, 2].includes(weeks) || weeks !== selectionWeeks(state, booking.person, booking.start, exceptId)) return 'En este bloque debes seleccionar las dos semanas seguidas.'
  const dates = weekDates(booking.start, weeks)
  if (!state.people.some(p => p.id === booking.person)) return 'Selecciona una persona del local.'
  if (dates.length !== weeks * 7) return 'Selecciona una fecha válida.'
  if (weekStart(booking.start) !== booking.start) return 'Selecciona una semana de lunes a domingo.'
  if (dates.some(d => d.slice(0, 4) !== booking.start.slice(0, 4))) return 'La semana debe quedar dentro del mismo año.'
  if (dates.some(d => isBlocked(state, d, booking.person, booking.start))) return 'La semana incluye fechas bloqueadas. Solo gerencia puede autorizar una excepción personal.'
  const used = state.bookings.filter(b => b.id !== exceptId && b.person === booking.person && b.start.slice(0, 4) === booking.start.slice(0, 4) && blockOf(b.start) === blockOf(booking.start))
  const candidate = { ...booking, weeks }
  if (state.bookings.some(b => b.id !== exceptId && b.person === booking.person && overlaps(b, candidate))) return 'Ya tienes vacaciones en esas fechas.'
  if (used.reduce((sum, b) => sum + bookingWeeks(b), 0) + weeks > quotaFor(state, booking.person, booking.start.slice(0, 4), blockOf(booking.start))) return 'Has completado las semanas de este bloque.'
  return ''
}

export function validateMonthlyRequest(state, request) {
  if (!state.people.some(p => p.id === request.person)) return 'Selecciona una persona del local.'
  const dates = weekDates(request.start, 4)
  if (dates.length !== 28 || weekStart(request.start) !== request.start) return 'Selecciona el lunes de inicio de las cuatro semanas.'
  if (dates.some(day => day.slice(0, 4) !== request.start.slice(0, 4))) return 'Las cuatro semanas deben quedar dentro del mismo año.'
  if (dates.some(day => isBlocked(state, day, request.person, request.start))) return 'La consulta incluye fechas bloqueadas. Gerencia debe autorizar esos días para tu nombre antes de solicitarlos.'
  return ''
}
