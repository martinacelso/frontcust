import { profileError, passwordError, emailKey, localDate } from '../utils/validation'
import { createContext, useContext, useState, useRef } from 'react'

import { ROOM_TYPES } from '../utils/catalog'
import { allocationPlan, availableRoomIds } from '../utils/inventory'
import { addDays, billTotal, netCollected, collected, refunded, balanceDue } from '../utils/hotel'
import { stayError } from '../utils/validation'
import { checkInError, checkOutError } from '../utils/actionValidation'

const AdminContext = createContext(null)

// ---- helpers ----
export const T = () => localDate()
export const sd = (n) => {
  return addDays(T(), n)
}
export const nights = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5))
export const P = (n) => '₱' + Number(n).toLocaleString()
// Booking reference shown to guests (e.g. TLH-0101)
export const refOf = (b) => 'TLH-' + String(b.id).padStart(4, '0')

// ---- modules ----
export const MODS = [
  ['dash', 'Dashboard'],
  ['rooms', 'Rooms'],
  ['book', 'Reservations'],
  ['guests', 'Guests'],
  ['chk', 'Check-in / out'],
  ['bill', 'Billing'],
  ['hk', 'Housekeeping'],
  ['rep', 'Reports'],
  ['staff', 'Staff & Roles'],
  ['audit', 'Audit Log'],
]

// ---- seed data ----
const seedTypes = ROOM_TYPES

const seedGuests = [
  { id: 1, name: 'Maria Santos', phone: '0917 111 2233', email: 'maria@mail.com' },
  { id: 2, name: 'Juan dela Cruz', phone: '0918 222 3344', email: 'juan@mail.com' },
  { id: 3, name: 'Angela Reyes', phone: '0919 333 4455', email: 'angela@mail.com' },
  { id: 4, name: 'Mark Villanueva', phone: '0920 444 5566', email: 'mark@mail.com' },
  { id: 5, name: 'Liza Gonzales', phone: '0921 555 6677', email: 'liza@mail.com' },
]

const seedBookings = [
  { id: 1, g: 1, room: 3, type: 'Superior', in: sd(-1), out: sd(2), st: 'checked-in', rate: 4500, extras: [{ d: 'Minibar', a: 650 }], disc: 0, pays: [{ d: sd(-1), a: 5000, m: 'Card' }] },
  { id: 2, g: 2, room: 5, type: 'Deluxe', in: sd(-2), out: sd(0), st: 'checked-in', rate: 5500, extras: [], disc: 500, pays: [{ d: sd(-2), a: 3000, m: 'Cash' }] },
  { id: 3, g: 3, room: null, type: 'Premier King', in: sd(0), out: sd(2), st: 'confirmed', rate: 6800, extras: [], disc: 0, pays: [] },
  { id: 4, g: 4, room: null, type: 'Family Suite', in: sd(3), out: sd(5), st: 'confirmed', rate: 12000, extras: [], disc: 0, pays: [] },
  { id: 5, g: 5, room: 7, type: 'Premier King', in: sd(-4), out: sd(-2), st: 'checked-out', rate: 6800, extras: [], disc: 0, pays: [{ d: sd(-2), a: 13600, m: 'GCash' }] },
  { id: 6, g: 1, room: null, type: 'Deluxe', in: sd(6), out: sd(7), st: 'cancelled', rate: 5500, extras: [], disc: 0, pays: [] },
  // Maria's online bookings (demo guest account)
  { id: 7, g: 1, room: null, type: 'Deluxe', in: sd(5), out: sd(7), st: 'confirmed', rate: 5500, extras: [], disc: 0, pays: [{ d: sd(-1), a: 2200, m: 'GCash' }], adults: 2, children: 0, gCount: 2, source: 'Online', requests: 'Late arrival' },
  { id: 8, g: 1, room: 1, type: 'Superior', in: sd(-60), out: sd(-58), st: 'checked-out', rate: 4500, extras: [], disc: 0, pays: [{ d: sd(-58), a: 9000, m: 'Card' }], adults: 2, children: 0, gCount: 2, source: 'Online', requests: '' },
  { id: 9, g: 1, room: 8, type: 'Premier King', in: sd(-200), out: sd(-199), st: 'checked-out', rate: 6800, extras: [], disc: 0, pays: [{ d: sd(-199), a: 6800, m: 'GCash' }], adults: 2, children: 0, gCount: 2, source: 'Online', requests: '' },
]

const seedStaff = [
  { id: 1, name: 'Ana Lim', email: 'admin@twinlakes.ph', pw: 'admin123', role: 'Admin', dept: 'Management', on: true },
  { id: 2, name: 'Carlo Tan', email: 'desk@twinlakes.ph', pw: 'desk123', role: 'Front Desk', dept: 'Front Office', on: true },
  { id: 3, name: 'Rosa Diaz', email: 'hk@twinlakes.ph', pw: 'hk123', role: 'Housekeeping', dept: 'Housekeeping', on: true },
  { id: 4, name: 'Ben Cruz', email: 'ben@twinlakes.ph', pw: 'x', role: 'Manager', dept: 'Operations', on: true },
]

const seedPerms = {
  Admin: ['dash', 'rooms', 'book', 'guests', 'chk', 'bill', 'hk', 'rep', 'staff', 'audit'],
  Manager: ['dash', 'rooms', 'book', 'guests', 'chk', 'bill', 'hk', 'rep'],
  'Front Desk': ['dash', 'book', 'guests', 'chk', 'bill'],
  Housekeeping: ['dash', 'hk'],
}

const typePattern = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5]
const seedRooms = typePattern.map((t, i) => ({
  id: i + 1,
  no: 201 + i,
  type: seedTypes[t].n,
  status: 'available',
  hk: '',
}))
seedRooms[2].status = 'occupied'
seedRooms[4].status = 'occupied'
seedRooms[7].status = 'dirty'
seedRooms[11].status = 'maintenance'

export function AdminProvider({ children }) {
  // In-memory for now: replace with backend calls (fetch/API) when the server is ready
  const [types, rawSetTypes] = useState(seedTypes)
  const typeRef = useRef(types)
  const setTypes = (update) => {
    typeRef.current = typeof update === 'function' ? update(typeRef.current) : update
    rawSetTypes(typeRef.current)
  }
  const [rooms, rawSetRooms] = useState(seedRooms)
  const roomRef = useRef(rooms)
  const setRooms = (update) => {
    roomRef.current = typeof update === 'function' ? update(roomRef.current) : update
    rawSetRooms(roomRef.current)
  }
  const [guests, setGuests] = useState(seedGuests)
  const [bookings, rawSetBookings] = useState(() => seedBookings.map((b) => ({ ...b,
    checkedInAt: ['checked-in', 'checked-out'].includes(b.st) ? b.in + 'T14:00:00+08:00' : null,
    checkedOutAt: b.st === 'checked-out' ? b.out + 'T12:00:00+08:00' : null,
    refunds: [],
  })))
  const bookingRef = useRef(bookings)
  const setBookings = (update) => {
    const next = typeof update === 'function' ? update(bookingRef.current) : update
    bookingRef.current = next
    rawSetBookings(next)
  }
  const [staff, setStaff] = useState(seedStaff)
  const [perms, setPerms] = useState(seedPerms)
  const uid = useRef(100)
  const [logs, setLogs] = useState([])
  const [userId, setUserId] = useState(null)
  const user = staff.find((s) => s.id === userId && s.on) || null

  const nextId = () => {
    return ++uid.current
  }

  // ---- audit log ----
  const logAction = (action, target, details, actorOverride) => {
    const entry = {
      id: Date.now() + Math.random(),
      at: new Date().toISOString(),
      actor: actorOverride ? actorOverride.name : user ? user.name : 'System',
      role: actorOverride ? actorOverride.role : user ? user.role : '—',
      action,
      target: target || '',
      details: details || '',
    }
    setLogs((prev) => [entry, ...prev].slice(0, 500))
  }

  // ---- helpers ----
  const can = (moduleId) =>
    user && perms[user.role] && perms[user.role].indexOf(moduleId) > -1

  const by = (collection, id) => {
    const map = { rooms: roomRef.current, guests, bookings: bookingRef.current, staff, types: typeRef.current }
    return (map[collection] || []).filter((x) => x.id == id)[0]
  }

  const rate = (typeName) =>
    (types.filter((t) => t.n === typeName)[0] || { r: 0 }).r

  const sum = (arr, key) => arr.reduce((s, x) => s + x[key], 0)

  const total = billTotal
  const paid = netCollected

  const getRoomType = (name) => typeRef.current.find((t) => t.n === name)
  const free = (r, from, to, ignoreId) => !!r && !!allocationPlan(roomRef.current, bookingRef.current, { type: r.type, in: from, out: to, room: r.id }, ignoreId)
  const roomsAvailable = (type, from, to, ignoreId) => availableRoomIds(roomRef.current, bookingRef.current, type, from, to, ignoreId).length

  const saveReservation = (record, ignoreId = null) => {
    const type = getRoomType(record.type)
    if (!type) return { error: 'Select a valid room type.' }
    const error = stayError(record, { capacity: type.s })
    if (error) return { error }
    const old = ignoreId == null ? null : bookingRef.current.find((b) => b.id === ignoreId)
    if (ignoreId != null && (!old || old.st !== 'confirmed')) return { error: 'Only a confirmed reservation can be changed.' }
    if (ignoreId == null && bookingRef.current.some((b) => b.id === record.id)) return { error: 'This reservation has already been saved.' }
    const plan = allocationPlan(roomRef.current, bookingRef.current, record, ignoreId)
    if (!plan) return { error: 'No room is available for the whole stay. Choose another room or dates.' }
    const saved = { ...record, room: plan.get('__candidate__'), updatedAt: new Date().toISOString() }
    const rows = bookingRef.current.filter((b) => b.id !== ignoreId).map((b) => plan.has(b.id) ? { ...b, room: plan.get(b.id) } : b)
    setBookings([...rows, saved])
    return { booking: saved }
  }

  // Commit against the latest booking state, then update the physical room.
  const checkIn = (id, roomId) => {
    if (!can('chk')) return { error: 'You do not have permission to check in guests.' }
    const b = by('bookings', id), r = by('rooms', roomId)
    const error = checkInError(b, r, bookingRef.current)
    if (error) return { error }
    const capacityError = stayError({ ...b, adults: b.adults ?? b.gCount ?? 2, children: b.children ?? 0 }, { allowPast: true, capacity: getRoomType(b.type)?.s })
    if (capacityError) return { error: capacityError }
    if (!by('guests', b.g)) return { error: 'The guest record is missing.' }
    const plan = allocationPlan(roomRef.current, bookingRef.current, { ...b, room: r.id }, b.id)
    if (!plan) return { error: 'This room is no longer available for the whole stay.' }
    setBookings((prev) => prev.map((x) => x.id === b.id
      ? { ...x, room: r.id, st: 'checked-in', checkedInAt: new Date().toISOString() }
      : plan.has(x.id) ? { ...x, room: plan.get(x.id) } : x))
    setRooms((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'occupied' } : x))
    logAction('Checked in', 'Booking #' + id, 'Room ' + r.no)
    return { ok: true }
  }
  const checkOut = (id) => {
    if (!can('chk')) return { error: 'You do not have permission to check out guests.' }
    const b = by('bookings', id)
    const error = checkOutError(b, b ? balanceDue(b) : NaN)
    if (error) return { error }
    setBookings((prev) => prev.map((x) => x.id === id ? { ...x, st: 'checked-out', checkedOutAt: new Date().toISOString() } : x))
    setRooms((prev) => prev.map((x) => x.id === b.room ? { ...x, status: 'dirty' } : x))
    logAction('Checked out', 'Booking #' + id, 'Room ' + (by('rooms', b.room)?.no || '—'))
    return { ok: true }
  }

  // ---- auth ----
  const login = (email, password) => {
    const u = staff.filter((s) => emailKey(s.email) === emailKey(email) && s.pw === password)[0]
    if (!u) return { error: 'Invalid email or password.' }
    if (!u.on) return { error: 'This account is disabled.' }
    setUserId(u.id)
    setLogs((prev) =>
      [
        {
          id: Date.now() + Math.random(),
          at: new Date().toISOString(),
          actor: u.name,
          role: u.role,
          action: 'Logged in',
          target: 'Admin panel',
          details: `Signed in as ${u.role}`,
        },
        ...prev,
      ].slice(0, 500)
    )
    return { ok: true }
  }

  const logout = () => setUserId(null)

  const updateSelf = (data) => {
    if (!user) return { error: 'Please sign in again.' }
    const error = data.pw !== undefined ? passwordError(data.pw) || (data.pw === user.pw ? 'Choose a different new password.' : '') : profileError(data, staff, user.id)
    if (error) return { error }
    data = data.pw !== undefined ? { pw: data.pw } : { name: data.name.trim(), email: emailKey(data.email), phone: (data.phone || '').trim() }
    setStaff((prev) => prev.map((s) => (s.id === user.id ? { ...s, ...data } : s)))
  }

  const value = {
    types, rooms, guests, bookings, staff, perms, user, logs,
    setTypes, setRooms, setGuests, setBookings, setStaff, setPerms,
    can, by, rate, sum, total, paid, free, nextId, logAction,
    login, logout, updateSelf, checkIn, checkOut, roomsAvailable, saveReservation, getRoomType, collected, refunded, balanceDue,
    MODS, P, nights, T, sd,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
