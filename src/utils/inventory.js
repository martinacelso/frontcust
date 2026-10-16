import { addDays, hotelDate } from './hotel.js'
import { validDate } from './validation.js'

export const activeBooking = (b) => ['confirmed', 'checked-in'].includes(b.st)
const overlap = (a, b) => a.in < b.out && b.in < a.out
const effective = (b, today) => b.st === 'checked-in' && b.out <= today ? { ...b, out: addDays(today, 1) } : b

// Each reservation must fit one physical room for its whole stay. Existing assigned
// reservations remain fixed; legacy unassigned holds are allocated with backtracking.
// No room moves are implied. Maintenance blocks new assignments until marked done.
export function allocationPlan(rooms, bookings, candidate, ignoreId = null, today = hotelDate()) {
  if (!validDate(candidate.in) || !validDate(candidate.out) || candidate.in >= candidate.out) return null
  const inventory = rooms.filter((r) => r.type === candidate.type)
  const roomIds = new Set(inventory.map((r) => r.id))
  const existing = bookings.filter((b) => b.id !== ignoreId && activeBooking(b) && b.type === candidate.type && (b.out > today || b.st === 'checked-in')).map((b) => effective(b, today))
  const assigned = existing.filter((b) => b.room != null)
  // Invalid imported assignments need correction, never silently oversell around them.
  if (assigned.some((b) => !roomIds.has(b.room))) return null
  for (let i = 0; i < assigned.length; i++) {
    if (assigned.slice(i + 1).some((b) => b.room === assigned[i].room && overlap(b, assigned[i]))) return null
  }
  const pending = [...existing.filter((b) => b.room == null), { ...candidate, id: '__candidate__' }]
  const schedule = new Map(inventory.map((r) => [r.id, assigned.filter((b) => b.room === r.id)]))
  const plan = new Map(assigned.map((b) => [b.id, b.room]))
  const options = (b) => inventory.filter((r) =>
    (b.room == null || b.room === r.id) && r.status !== 'maintenance' &&
    // An occupied room without a matching stay record is unsafe for arrival today.
    !(r.status === 'occupied' && b.in <= today && b.st !== 'checked-in' && !assigned.some((x) => x.room === r.id && x.st === 'checked-in')) &&
    !schedule.get(r.id).some((x) => overlap(x, b))
  )
  function solve(left) {
    if (!left.length) return true
    const sorted = left.map((b) => ({ b, choices: options(b) })).sort((a, b) => a.choices.length - b.choices.length)
    const { b, choices } = sorted[0]
    for (const room of choices) {
      schedule.get(room.id).push(b)
      plan.set(b.id, room.id)
      if (solve(left.filter((x) => x !== b))) return true
      schedule.get(room.id).pop()
      plan.delete(b.id)
    }
    return false
  }
  return solve(pending) ? plan : null
}

export function availableRoomIds(rooms, bookings, type, from, to, ignoreId = null) {
  return rooms.filter((r) => r.type === type && allocationPlan(rooms, bookings, { type, in: from, out: to, room: r.id }, ignoreId)).map((r) => r.id)
}
