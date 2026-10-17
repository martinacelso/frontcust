import { cancelError } from '../utils/actionValidation'
import { stayError, localDate } from '../utils/validation'
import { createContext, useContext, useState, useEffect } from 'react'
import { authRequest } from '../utils/api'
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

export function AccountProvider({ children }) {
  const {
    bookings, setBookings, setGuests, types, roomsAvailable, saveReservation, getRoomType, refunded,
    total, paid, nextId, logAction,
  } = useAdmin()

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [promo, setPromo] = useState(null)
  const users = user ? [user] : []

  // Temporary bridge to the existing in-memory booking screens. Account IDs
  // come from MongoDB; never associate accounts by matching guest email.
  const acceptUser = (account) => {
    const mapped = { ...account, guestId: account.id, contactEmail: account.contactEmail || account.email }
    setGuests((prev) => [...prev.filter((g) => g.id !== account.id), {
      id: account.id, userId: account.id, name: account.name,
      email: account.contactEmail || account.email, phone: account.phone || '',
    }])
    setUser(mapped)
  }

  useEffect(() => {
    let active = true
    authRequest('/me').then((result) => {
      if (!active) return
      if (result.status === 401) setUser(null)
      else if (result.error) setAuthError(result.error)
      else acceptUser(result.user)
      setAuthLoading(false)
    })
    return () => { active = false }
    // Restore the session once when this provider mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const signIn = async (email, password) => {
    const result = await authRequest('/login', { email, password })
    if (result.error) return result
    acceptUser(result.user)
    setAuthError('')
    return { ok: true }
  }

  const signUp = (data) => authRequest('/signup', {
    name: data.name, email: data.email, password: data.password, phone: data.phone || '',
  })

  const signOut = async () => {
    const result = await authRequest('/logout', {})
    if (result.error) return result
    setUser(null)
    setPromo(null)
    return { ok: true }
  }

  const updateProfile = async (data) => {
    const result = await authRequest('/profile', data)
    if (!result.error) acceptUser(result.user)
    return result
  }
  const changePassword = async (currentPassword, newPassword) => {
    const result = await authRequest('/password', { currentPassword, newPassword })
    if (!result.error) acceptUser(result.user)
    return result
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
    user, users, bookings, authLoading, authError,
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
