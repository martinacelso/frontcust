import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { authRequest } from '../utils/api'
import { bookingRequest, accountBooking, bookingStatus } from '../utils/bookingApi'
import { useAdmin } from './AdminContext'
import { localDate } from '../utils/validation'
import { addDays, roundMoney } from '../utils/hotel'
import { ROOM_TYPES } from '../utils/catalog'

const AccountContext = createContext(null)
export const T = () => localDate()
export const sd = (n) => addDays(T(), n)
export const nights = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5))
export const P = (n) => '₱' + Number(n).toLocaleString()
export const DOWN_PAYMENT_RATE = 0.2
export const downPayment = (n) => roundMoney(n * DOWN_PAYMENT_RATE)
export const PAYMENT_METHODS = ['Bank Transfer']
export const TYPES = ROOM_TYPES

export function AccountProvider({ children }) {
  const auth = useAdmin()
  // Clear private booking state when the signed-in account changes.
  return <AccountState key={auth.sessionUser?.id || 'signed-out'} auth={auth}>{children}</AccountState>
}
function AccountState({ children, auth }) {
  const { sessionUser, setSessionUser, login, logout, authLoading, authError } = auth
  const user = sessionUser?.role === 'guest' ? { ...sessionUser, guestId: sessionUser.id, contactEmail: sessionUser.contactEmail || sessionUser.email } : null
  const [types, setTypes] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(!!user)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [promo, setPromo] = useState(null)
  const [now, setNow] = useState(Date.now())
  const lock = useRef(false), alive = useRef(false), revision = useRef(0)
  const guestId = user?.id
  const refreshBookings = useCallback(async (includeArchived = false) => {
    if (!guestId || lock.current) return
    const ticket = ++revision.current
    setLoading(true); setError('')
    const list = []
    let page = 1, result
    do {
      result = await bookingRequest('/bookings?page=' + page++ + '&includeArchived=' + includeArchived)
      if (!alive.current || ticket !== revision.current) return
      if (result.error || !Array.isArray(result.bookings)) {
        setError(result.error || 'Unexpected booking response.'); setLoading(false); return
      }
      list.push(...result.bookings.map(accountBooking))
    } while (result.hasMore && page <= 10000)
    setRows(list); setLoading(false)
  }, [guestId])
  useEffect(() => {
    alive.current = true
    let current = true
    Promise.all([bookingRequest('/rooms/catalog'), bookingRequest('/bookings/options')]).then(([catalog, options]) => {
      if (!current) return
      if (catalog.types) setTypes(catalog.types.map((t) => ({ id: t.id, n: t.name, r: t.rate, s: t.capacity, d: t.description, img: t.image })))
      setDemoEnabled(options.demoPaymentsEnabled === true)
    })
    refreshBookings()
    const timer = setInterval(() => setNow(Date.now()), 15000)
    return () => { current = false; alive.current = false; revision.current++; clearInterval(timer) }
  }, [refreshBookings])
  async function mutation(path, body, method) {
    if (!user) return { error: 'Please sign in.' }
    if (lock.current) return { error: 'Please wait for the current request.' }
    lock.current = true; revision.current++; setBusy(true); setLoading(false); setError('')
    const result = await bookingRequest(path, body, method)
    if (alive.current) {
      if (result.booking) {
        const row = accountBooking(result.booking)
        setRows((old) => [row, ...old.filter((item) => item.id !== row.id)])
      }
      if (result.error) setError(result.error)
      lock.current = false; setBusy(false)
    }
    return result.booking ? { booking: accountBooking(result.booking) } : result
  }
  const updateProfile = async (data) => {
    const result = await authRequest('/profile', data)
    if (!result.error) setSessionUser(result.user)
    return result
  }
  const changePassword = async (currentPassword, newPassword) => {
    const result = await authRequest('/password', { currentPassword, newPassword })
    if (!result.error) setSessionUser(result.user)
    return result
  }
  const bookings = rows.map((b) => ({ ...b, st: bookingStatus(b, now) }))
  const value = { user, users: user ? [user] : [], bookings, authLoading, authError,
    signIn: login, signOut: logout,
    signUp: (data) => authRequest('/signup', { name: data.name, email: data.email, password: data.password, phone: data.phone || '' }),
    updateProfile, changePassword, TYPES: types, promo, setPromo,
    myBookings: () => bookings, bookingLoading: loading, bookingError: error, bookingBusy: busy,
    demoEnabled, refreshBookings,
    addBooking: (data) => mutation('/bookings', data),
    updateBooking: (id, data) => mutation('/bookings/' + id, data),
    simulatePayment: (id, bankDetails) => mutation('/bookings/' + id + '/simulate-payment', {
      method: 'Bank Transfer', bankDetails,
    }),
    cancelBooking: (id, confirmRefund = false) => {
      const row = rows.find((b) => b.id === id)
      return row ? mutation('/bookings/' + id + '/cancel', { version: row.version, confirmRefund }) : Promise.resolve({ error: 'Booking not found. Refresh and try again.' })
    },
    archiveBooking: (id) => {
      const row = rows.find((b) => b.id === id)
      return row ? mutation('/bookings/' + id, { version: row.version, confirm: true }, 'DELETE') : Promise.resolve({ error: 'Booking not found. Refresh and try again.' })
    },
    restoreBooking: (id) => {
      const row = rows.find((b) => b.id === id)
      return row ? mutation('/bookings/' + id + '/restore', { version: row.version }) : Promise.resolve({ error: 'Booking not found. Refresh and try again.' })
    }, sd, T, nights, P,
  }
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount must be used inside AccountProvider')
  return context
}
