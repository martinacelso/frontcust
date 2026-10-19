import { createContext, useContext, useEffect, useState } from 'react'
import { authRequest } from '../utils/api'
import { addDays } from '../utils/hotel'
import { localDate } from '../utils/validation'

const AdminContext = createContext(null)

export const T = () => localDate()
export const sd = (n) => addDays(T(), n)
export const nights = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5))
export const P = (n) => '₱' + Number(n).toLocaleString()
export const refOf = (booking) => 'TLH-' + String(booking.id).padStart(4, '0')

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

const permissions = {
  admin: ['dash', 'rooms', 'book', 'guests', 'chk', 'bill', 'hk', 'rep', 'staff', 'audit'],
  'front-desk': ['dash', 'rooms', 'book', 'guests', 'chk', 'bill'],
  housekeeping: ['dash', 'hk'],
}
const accountRoles = ['guest', 'admin', 'front-desk', 'housekeeping']
const isAccount = (user) => user && typeof user.id === 'string' && accountRoles.includes(user.role)

export function AdminProvider({ children }) {
  const [sessionUser, setSessionUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const roleLabels = { admin: 'Admin', 'front-desk': 'Front Desk', housekeeping: 'Housekeeping' }
  const user = sessionUser && roleLabels[sessionUser.role]
    ? { ...sessionUser, role: roleLabels[sessionUser.role], on: true, dept: roleLabels[sessionUser.role] }
    : null

  useEffect(() => {
    let active = true
    authRequest('/me').then((result) => {
      if (!active) return
      if (result.status === 401) setSessionUser(null)
      else if (result.error) setAuthError(result.error)
      else if (isAccount(result.user)) setSessionUser(result.user)
      else setAuthError('The server returned an invalid account response. Please try again.')
      setAuthLoading(false)
    })
    return () => { active = false }
  }, [])

  const login = async (email, password) => {
    const result = await authRequest('/login', { email, password })
    if (result.error) return result
    if (!isAccount(result.user)) return { error: 'Sign in could not be confirmed. Please try again.' }
    setSessionUser(result.user)
    setAuthError('')
    return { ok: true, role: result.user.role }
  }
  const logout = async () => {
    const result = await authRequest('/logout', {})
    if (result.error) return result
    setSessionUser(null)
    return { ok: true }
  }
  const updateSelf = async (data) => {
    const result = data.pw !== undefined
      ? await authRequest('/password', { currentPassword: data.currentPassword, newPassword: data.pw })
      : await authRequest('/profile', { ...data, contactEmail: sessionUser.contactEmail || sessionUser.email })
    if (!result.error) setSessionUser(result.user)
    return result
  }
  const can = (moduleId) => Boolean(sessionUser && permissions[sessionUser.role]?.includes(moduleId))
  const value = { user, sessionUser, setSessionUser, authLoading, authError, can, login, logout, updateSelf }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error('useAdmin must be used inside <AdminProvider>')
  return context
}
