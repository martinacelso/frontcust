import { createContext, useContext, useState } from 'react'

const AdminContext = createContext(null)

// ---- helpers ----
export const T = () => new Date().toISOString().slice(0, 10)
export const sd = (n) => {
  const x = new Date()
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}
export const nights = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5))
export const P = (n) => '₱' + Number(n).toLocaleString()

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
const seedTypes = [
  { n: 'Superior', r: 4500 },
  { n: 'Deluxe', r: 5500 },
  { n: 'Premier King', r: 6800 },
  { n: 'Deluxe Executive King', r: 7500 },
  { n: 'Family Suite', r: 12000 },
  { n: 'Presidential Suite', r: 20000 },
]

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
  const [types, setTypes] = useState(seedTypes)
  const [rooms, setRooms] = useState(seedRooms)
  const [guests, setGuests] = useState(seedGuests)
  const [bookings, setBookings] = useState(seedBookings)
  const [staff, setStaff] = useState(seedStaff)
  const [perms, setPerms] = useState(seedPerms)
  const [uid, setUid] = useState(100)
  const [user, setUser] = useState(null)
  const [logs, setLogs] = useState([])

  const nextId = () => {
    const n = uid + 1
    setUid(n)
    return n
  }

  // ---- audit log ----
  const logAction = (action, target, details) => {
    const entry = {
      id: Date.now() + Math.random(),
      at: new Date().toISOString(),
      actor: user ? user.name : 'System',
      role: user ? user.role : '—',
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
    const map = { rooms, guests, bookings, staff, types }
    return (map[collection] || []).filter((x) => x.id == id)[0]
  }

  const rate = (typeName) =>
    (types.filter((t) => t.n === typeName)[0] || { r: 0 }).r

  const sum = (arr, key) => arr.reduce((s, x) => s + x[key], 0)

  const total = (b) => nights(b.in, b.out) * b.rate + sum(b.extras, 'a') - b.disc
  const paid = (b) => sum(b.pays, 'a')

  const free = (r, inDate, outDate, ignoreBookingId) =>
    r.status !== 'maintenance' &&
    !bookings.some(
      (b) =>
        b.room === r.id &&
        b.id !== ignoreBookingId &&
        ['confirmed', 'checked-in'].indexOf(b.st) > -1 &&
        b.in < outDate &&
        b.out > inDate
    )

  // ---- auth ----
  const login = (email, password) => {
    const u = staff.filter((s) => s.email === email && s.pw === password)[0]
    if (!u) return { error: 'Invalid email or password.' }
    if (!u.on) return { error: 'This account is disabled.' }
    setUser(u)
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

  const logout = () => setUser(null)

  const updateSelf = (data) => {
    setUser((u) => ({ ...u, ...data }))
    setStaff((prev) => prev.map((s) => (s.id === user.id ? { ...s, ...data } : s)))
  }

  const value = {
    types, rooms, guests, bookings, staff, perms, user, logs,
    setTypes, setRooms, setGuests, setBookings, setStaff, setPerms,
    can, by, rate, sum, total, paid, free, nextId, logAction,
    login, logout, updateSelf,
    MODS, P, nights, T, sd,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}