import { useState } from 'react'
import './styles.css'
import { AuthContext } from './hooks/useAuth'
import { AccountProvider, useAccount } from './context/AccountContext'
import { AdminProvider, useAdmin } from './context/AdminContext'

// Public site
import Header from './components/Header'
import Hero from './components/Hero'
import BookingForm from './components/BookingForm'
import About from './components/About'
import Rooms from './components/Rooms'
import Facilities from './components/Facilities'
import Promos from './components/Promos'
import AuthModal from './components/AuthModal'
import AccountPage from './components/account/AccountPage'
import { Experience, Location, Footer } from './components/Sections'

// Admin
import AdminLayout from './components/admin/AdminLayout'

function Shell() {
  const [authOpen, setAuthOpen] = useState(false)
  const [bookingIntent, setBookingIntent] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('frontcust.booking-search') || 'null')
      return saved && typeof saved.in === 'string' && typeof saved.out === 'string' && Number.isInteger(saved.adults) && Number.isInteger(saved.children) ? saved : null
    } catch { return null }
  })
  const clearBookingIntent = () => {
    try { sessionStorage.removeItem('frontcust.booking-search') } catch { /* Storage may be disabled. */ }
    setBookingIntent(null)
  }
  const continueBooking = (selection) => {
    try { sessionStorage.setItem('frontcust.booking-search', JSON.stringify(selection)) } catch { /* Storage may be disabled. */ }
    setBookingIntent(selection); setAuthOpen(true)
  }
  const { user: guestUser, signUp: guestSignUp, authLoading, authError } = useAccount()
  const { user: staffUser, login: staffLogin, logout: staffLogout } = useAdmin()

  const openAuth = () => setAuthOpen(true)
  const closeAuth = () => setAuthOpen(false)

  if (authLoading) return <main className="wrap" role="status">Loading your account…</main>
  if (authError) return <main className="wrap" role="alert"><p>{authError}</p><button className="btn" onClick={() => window.location.reload()}>Try again</button></main>

  // ---- Signed in as staff → admin interface ----
  if (staffUser) {
    return <AdminLayout />
  }

  // ---- Signed in as guest → account dashboard ----
  if (guestUser) {
    return <AccountPage bookingIntent={bookingIntent} clearBookingIntent={clearBookingIntent} />
  }

  // ---- Not signed in → public site ----
  // One backend login determines whether the guest or staff interface opens.
  const handleSignIn = async (email, password) => {
    const result = await staffLogin(email, password)
    if (!result.error && result.role !== 'guest') clearBookingIntent()
    return result
  }

  const handleSignUp = (data) => {
    // Guests only — staff must be added by an Admin
    return guestSignUp(data)
  }

  const handleSignOut = () => {
    staffLogout()
    // guestUser signOut is handled inside AccountPage
  }

  return (
    <AuthContext.Provider
      value={{ openAuth, handleSignIn, handleSignUp, handleSignOut }}
    >
      <Header />
      <Hero />
      <BookingForm onBook={continueBooking} />
      <About />
      <Rooms />
      <Facilities />
      <Promos />
      <Experience />
      <Location />
      <Footer />
      <AuthModal isOpen={authOpen} onClose={closeAuth} />
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <AdminProvider>
      <AccountProvider>
        <Shell />
      </AccountProvider>
    </AdminProvider>
  )
}
