import { createContext, useContext, useState } from 'react'

const AccountContext = createContext(null)

// ---- helpers ----
export const sd = (n) => {
  const x = new Date()
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}
export const T = () => sd(0)
export const nights = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5))
export const P = (n) => '₱' + Number(n).toLocaleString()

// ---- room types ----
export const TYPES = [
  { n: 'Superior', r: 4500, s: 4, c: 3, img: '/room-1.jpg', d: 'Comfortable room with balcony, seating area and bidet bath.' },
  { n: 'Deluxe', r: 5500, s: 4, c: 3, img: '/room-2.jpg', d: 'Spacious room with soundproofing and a separate tub and shower.' },
  { n: 'Premier King', r: 6800, s: 2, c: 2, img: '/room-3.jpg', d: '36 sq m with a king bed and balcony.' },
  { n: 'Deluxe Executive King', r: 7500, s: 2, c: 2, img: '/room-4.jpg', d: 'Lake-view balcony, king bed, 36 sq m.' },
  { n: 'Family Suite', r: 12000, s: 6, c: 1, img: '/room-5.jpg', d: 'Two bedrooms for up to four adults and two children.' },
  { n: 'Presidential Suite', r: 20000, s: 6, c: 1, img: '/room-6.jpg', d: '106 sq m of space and the best views in the house.' },
]

// ---- seed data ----
let uid = 100
const seedUsers = [
  { id: 1, name: 'Maria Santos', email: 'maria@mail.com', phone: '0917 111 2233', pw: 'guest123' },
]
const seedBookings = [
  { id: 'TLH-1001', u: 1, type: 'Deluxe', in: sd(5), out: sd(7), g: 2, st: 'confirmed', note: 'Late arrival', paid: 0 },
  { id: 'TLH-0950', u: 1, type: 'Superior', in: sd(-60), out: sd(-58), g: 2, st: 'checked-out', note: '', paid: 9000 },
  { id: 'TLH-0871', u: 1, type: 'Premier King', in: sd(-200), out: sd(-199), g: 2, st: 'checked-out', note: '', paid: 6800 },
]

export function AccountProvider({ children }) {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState(seedUsers)
  const [bookings, setBookings] = useState(seedBookings)
  const [promo, setPromo] = useState(null)

  const signIn = (email, password) => {
    const u = users.find((x) => x.email === email && x.pw === password)
    if (!u) return false
    setUser(u)
    return true
  }

  const signUp = (data) => {
    if (users.some((u) => u.email === data.email)) return { error: 'An account with this email already exists.' }
    if (data.password.length < 6) return { error: 'Password must be at least 6 characters.' }
    const u = { id: ++uid, name: data.name, email: data.email, phone: data.phone || '', pw: data.password }
    setUsers((prev) => [...prev, u])
    setUser(u)
    return { ok: true }
  }

  const signOut = () => setUser(null)

  const updateProfile = (data) => setUser((u) => ({ ...u, ...data }))

  const changePassword = (current, next) => {
    if (current !== user.pw) return { error: 'Current password is incorrect.' }
    if (next.length < 6) return { error: 'New password must be at least 6 characters.' }
    if (next.length > 20) return { error: 'New password must be 20 characters or fewer.' }
    setUser((u) => ({ ...u, pw: next }))
    return { ok: true }
  }

  const addBooking = (b) => {
    const id = 'TLH-' + (++uid + 1000)
    const nb = { ...b, id, u: user.id, st: 'confirmed', paid: 0 }
    setBookings((prev) => [...prev, nb])
    return nb
  }

  const cancelBooking = (id) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, st: 'cancelled' } : b)))
  }

  const myBookings = () =>
    bookings.filter((b) => b.u === user?.id).sort((a, b) => (a.in < b.in ? 1 : -1))

  const value = {
    user, users, bookings,
    signIn, signUp, signOut, updateProfile, changePassword,
    addBooking, cancelBooking, myBookings,
    promo, setPromo,
    TYPES, sd, T, nights, P,
  }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}