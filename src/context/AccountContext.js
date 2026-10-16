import { cancelError } from '../utils/actionValidation'
import { profileError, passwordError, emailError, phMobileError, normalizePhMobile, emailKey, stayError, localDate } from '../utils/validation'
import { createContext, useContext, useState } from 'react'
import { useAdmin, refOf } from './AdminContext'

import { ROOM_TYPES } from '../utils/catalog'
import { addDays, roundMoney, cents } from '../utils/hotel'
import { quoteStay } from '../utils/promotions'

const AccountContext = createContext(null)

// ---- helpers ----
export const sd = (n) => {
  return addDays(localDate(), n)
}
export const T = () => sd(0)
export const nights = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5))
export const P = (n) => '₱' + Number(n).toLocaleString()

// ---- down payment ----
export const DOWN_PAYMENT_RATE = 0.2
export const downPayment = (total) => roundMoney(total * DOWN_PAYMENT_RATE)
export const PAYMENT_METHODS = ['GCash', 'Maya', 'Card', 'Bank transfer']

// ---- room types ----
export const TYPES = ROOM_TYPES

// ---- seed data ----
// Guest accounts only. Bookings and guest records live in AdminContext so the
// front desk / admin side and the guest side always see the same data.
const seedUsers = [
  { id: 1, guestId: 1, createdAt: '2024-01-01T00:00:00Z', name: 'Maria Santos', email: 'maria@mail.com', phone: '0917 111 2233', pw: 'guest123' },
]

export function AccountProvider({ children }) {
  const {
    bookings, setBookings, guests, setGuests, types, staff, roomsAvailable, saveReservation, getRoomType, refunded,
    total, paid, nextId, logAction,
  } = useAdmin()

  // In-memory for now: replace with backend calls (fetch/API) when the server is ready
  const [userId, setUserId] = useState(null)
  const [users, setUsers] = useState(seedUsers)
  const [promo, setPromo] = useState(null)
  const identity = users.find((u) => u.id === userId)
  const profile = identity && guests.find((g) => g.id === identity.guestId)
  const user = identity && profile ? { ...identity, name: profile.name, phone: profile.phone || '', contactEmail: profile.email } : null

  // Convert a shared (admin-shaped) booking into what the guest screens expect
  const toAccount = (b) => ({
    id: refOf(b),
    u: b.g,
    type: b.type,
    in: b.in,
    out: b.out,
    g: b.gCount || (b.adults || 0) + (b.children || 0) || 2,
    st: b.st,
    note: b.requests || '',
    promoId: b.promoId || null,
    roomCharge: nights(b.in, b.out) * b.rate,
    extras: b.extras || [],
    disc: b.disc || 0,
    total: total(b),
    paid: paid(b),
    refunded: refunded(b),
    payMethod: b.pays && b.pays.length ? b.pays[0].m : undefined,
    payRef: b.pays && b.pays.length ? b.pays[0].ref : undefined,
  })

  const signIn = (email, password) => {
    const u = users.find((x) => emailKey(x.email) === emailKey(email) && x.pw === password)
    if (!u) return false
    setUserId(u.id)
    return true
  }

  const signUp = (data) => {
    const error = profileError(data, users) || passwordError(data.password)
    if (error) return { error }
    data = { ...data, name: data.name.trim(), email: emailKey(data.email), phone: (data.phone || '').trim() }
    if (users.some((u) => u.email === data.email)) return { error: 'An account with this email already exists.' }
    if (data.password.length < 6) return { error: 'Password must be at least 6 characters.' }

    if (staff.some((s) => emailKey(s.email) === data.email)) return { error: 'This email is already in use.' }
    // Never claim a walk-in guest record based on an unverified email match.
    const id = nextId()
    const guestId = nextId()
    setGuests((prev) => [...prev, { id: guestId, userId: id, name: data.name, email: data.email, phone: data.phone }])
    const u = { id, guestId, email: data.email, pw: data.password, createdAt: new Date().toISOString() }
    setUsers((prev) => [...prev, u])
    return { ok: true }
  }

  const signOut = () => setUserId(null)

  const updateProfile = (data) => {
    if (!user) return { error: 'Please sign in again.' }
    const error = phMobileError(data.phone) || profileError(data, [...users, ...staff.map((s) => ({ ...s, id: `staff-${s.id}` }))], user.id) || emailError(data.contactEmail ?? user.contactEmail)
    if (error) return { error }
    data = { name: data.name.trim(), email: emailKey(data.email), phone: normalizePhMobile(data.phone), contactEmail: emailKey(data.contactEmail ?? user.contactEmail) }
    setUsers((prev) => prev.map((x) => (x.id === user.id ? { ...x, ...data } : x)))
    setGuests((prev) => prev.map((g) => (g.id === user.guestId ? { ...g, name: data.name, phone: data.phone, email: data.contactEmail } : g)))
  }

  const changePassword = (current, next) => {
    if (!user) return { error: 'Please sign in again.' }
    const error = passwordError(next)
    if (error) return { error }
    if (next === current) return { error: 'Choose a different new password.' }
    if (current !== user.pw) return { error: 'Current password is incorrect.' }
    if (next.length < 6) return { error: 'New password must be at least 6 characters.' }
    if (next.length > 20) return { error: 'New password must be 20 characters or fewer.' }
    setUsers((prev) => prev.map((x) => (x.id === user.id ? { ...x, pw: next } : x)))
    return { ok: true }
  }

  // Creates a booking in the shared store so the front desk / admin see it immediately.
  // Inventory is reserved immediately; the front desk confirms a clean room at check-in.
  const addBooking = (b) => {
    if (!user) return { error: 'Please sign in again.' }
    const type = getRoomType(b.type)
    if (!type) return { error: 'Choose a valid room type.' }
    const error = stayError(b, { capacity: type.s })
    if (error) return { error }
    if (roomsAvailable(b.type, b.in, b.out) <= 0) return { error: 'This room type is no longer available for these dates. Close this checkout and choose another room or different dates.' }
    const quote = quoteStay(type, b.in, b.out, b.promoId)
    if (quote.error) return quote
    if (!b.quote || cents(b.quote.total) !== cents(quote.total) || cents(b.quote.rate) !== cents(quote.rate)) return { error: 'The price or promotion changed. Close checkout and review the new quote.' }
    if (cents(b.paid) !== cents(quote.deposit)) return { error: 'The down payment must match the accepted quote.' }
    if (!PAYMENT_METHODS.includes(b.payMethod)) return { error: 'Choose a valid payment method.' }
    const id = nextId()
    const adults = b.adults ?? 1
    const children = b.children ?? 0
    const nb = {
      id,
      g: user.guestId,
      room: null,
      type: b.type,
      in: b.in,
      out: b.out,
      st: 'confirmed',
      rate: quote.rate,
      quote: { ...quote },
      createdAt: new Date().toISOString(),
      refunds: [],
      extras: [],
      disc: quote.discount,
      pays: b.paid > 0 ? [{ id: crypto.randomUUID(), d: T(), a: b.paid, m: b.payMethod || 'GCash', ref: b.payRef || '', status: 'succeeded', demo: true, recordedAt: new Date().toISOString() }] : [],
      adults,
      children,
      gCount: adults + children,
      source: 'Online',
      requests: b.note || '',
      arrivalTime: '',
      promoId: b.promoId || null,
    }
    const result = saveReservation(nb)
    if (result.error) return result
    logAction(
      'Online booking',
      `#${id}`,
      `${user.name} · ${b.type} · ${b.in} → ${b.out}` +
        (b.paid > 0 ? ` · Down payment ${P(b.paid)} (${b.payMethod})` : ''),
      { name: user.name, role: 'Guest' }
    )
    return toAccount(result.booking)
  }

  const cancelBooking = (ref) => {
    const target = bookings.find((b) => refOf(b) === ref)
    if (!user || !target || target.g !== user.guestId) return { error: 'This reservation is not available to your account.' }
    const error = cancelError(target)
    if (error) return { error }
    if (target.in <= T()) return { error: 'Contact the front desk to cancel an arrival due today or earlier.' }
    setBookings((prev) => prev.map((b) => (b.id === target.id ? { ...b, st: 'cancelled', cancelledAt: new Date().toISOString() } : b)))
    const held = paid(target)
    logAction(
      'Cancelled booking (guest)',
      `#${target.id}`,
      `${user.name} cancelled online` + (held > 0 ? ` · Down payment ${P(held)} on record, refund per policy` : ''),
      { name: user.name, role: 'Guest' }
    )
  }

  const myBookings = () =>
    bookings
      .filter((b) => b.g === user?.guestId)
      .map(toAccount)
      .sort((a, b) => (a.in < b.in ? 1 : -1))

  const value = {
    user, users, bookings,
    signIn, signUp, signOut, updateProfile, changePassword,
    addBooking, cancelBooking, myBookings, roomsAvailable,
    promo, setPromo,
    TYPES: types, sd, T, nights, P,
  }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}
