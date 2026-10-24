import { describe, expect, it } from 'vitest'
import { defaultRules, validateBooking, weekDates, overlaps, weekStart, bookingDates, usedWeeks, selectionWeeks } from './vacationRules'

const state = () => ({ people: [{ id: 'a' }, { id: 'b' }], rules: defaultRules(), bookings: [] })
describe('vacation booking rules', () => {
  it('selects 14 consecutive days in the middle block and checks the second week too', () => {
    const s = state()
    expect(selectionWeeks(s, 'a', '2027-05-03')).toBe(1)
    expect(validateBooking(s, { person: 'a', start: '2027-05-03', weeks: 1 })).toBe('')
    expect(bookingDates({ start: '2027-05-03', weeks: 2 })).toHaveLength(14)
    expect(bookingDates({ start: '2027-05-03', weeks: 2 }).at(-1)).toBe('2027-05-16')
    s.rules.datedBlocked = [['2027-05-12', '2027-05-12']]
    expect(validateBooking(s, { person: 'a', start: '2027-05-03', weeks: 2 })).toContain('bloqueadas')
    s.rules.datedBlocked = []
    s.bookings = [{ id: 'other', person: 'b', start: '2027-05-10' }]
    expect(validateBooking(s, { person: 'a', start: '2027-05-03', weeks: 2 })).toBe('')
  })
  it('counts a saved fortnight as two weeks and preserves legacy booking durations when editing', () => {
    const s = state()
    s.bookings = [{ id: 'one', person: 'a', start: '2027-05-03', weeks: 2 }]
    expect(usedWeeks(s, 'a', 2027, 1)).toBe(2)
    expect(validateBooking(s, { person: 'a', start: '2027-06-07' })).toContain('completado')
    expect(validateBooking(s, { person: 'a', start: '2027-06-07', weeks: 2 }, 'one')).toBe('')
    s.bookings[0].weeks = 1
    expect(selectionWeeks(s, 'a', '2027-06-07', 'one')).toBe(1)
  })
  it('checks all seven days against seasonal closures', () => {
    for (const start of ['2027-01-15', '2027-02-26', '2027-03-10', '2027-11-10', '2027-12-02']) expect(validateBooking(state(), { person: 'a', start })).toBeTruthy()
    for (const start of ['2027-01-18', '2027-04-12', '2027-11-08']) expect(validateBooking(state(), { person: 'a', start })).toBe('')
  })
  it('enforces quotas by person, block and year', () => {
    const s = state()
    s.bookings.push({ id: '1', person: 'a', start: '2027-04-01' })
    expect(validateBooking(s, { person: 'a', start: '2027-04-12' })).toContain('completado')
    expect(validateBooking(s, { person: 'b', start: '2027-04-12' })).toBe('')
    expect(validateBooking(s, { person: 'a', start: '2028-04-10' })).toBe('')
    expect(validateBooking(s, { person: 'a', start: '2027-04-12' }, '1')).toBe('')
    s.bookings.push({ id: '2', person: 'a', start: '2027-05-01' })
    expect(validateBooking(s, { person: 'a', start: '2027-05-10' })).toBe('')
    s.bookings.push({ id: '3', person: 'a', start: '2027-05-10' })
    expect(validateBooking(s, { person: 'a', start: '2027-06-07' })).toContain('completado')
  })
  it('allows full weeks crossing months and blocks, and rejects invalid dates', () => {
    for (const start of ['2027-04-28', '2027-02-30', 'bad']) expect(validateBooking(state(), { person: 'a', start })).toBeTruthy()
    expect(validateBooking(state(), { person: 'a', start: '2027-08-30' })).toBe('')
    expect(weekDates('2028-02-26')).toContain('2028-02-29')
  })
  it('lets the last February week finish in March, without opening March starts', () => {
    expect(weekStart('2026-03-01')).toBe('2026-02-23')
    expect(validateBooking(state(), { person: 'a', start: '2026-02-23' })).toBe('')
    expect(validateBooking(state(), { person: 'a', start: '2026-03-02' })).toContain('bloqueadas')
  })
  it('applies dated closures and personal permissions only to the intended person and year', () => {
    const s = state()
    s.rules.datedBlocked = [['2027-05-10', '2027-05-12']]
    expect(validateBooking(s, { person: 'a', start: '2027-05-10' })).toContain('bloqueadas')
    s.exceptions = [{ person: 'a', year: 2027, quotas: [5, 5, 5], allowed: [['2027-05-10', '2027-05-16'], ['2027-03-01', '2027-03-31']] }]
    expect(validateBooking(s, { person: 'a', start: '2027-05-10' })).toBe('')
    expect(validateBooking(s, { person: 'b', start: '2027-05-10' })).toContain('bloqueadas')
    expect(validateBooking(s, { person: 'a', start: '2027-03-01' })).toBe('')
    expect(validateBooking(s, { person: 'a', start: '2028-03-06' })).toContain('bloqueadas')
  })
  it('detects partial overlaps but permits adjacent weeks', () => {
    expect(overlaps({ start: '2027-05-01' }, { start: '2027-05-07' })).toBe(true)
    expect(overlaps({ start: '2027-05-01' }, { start: '2027-05-08' })).toBe(false)
  })
})
