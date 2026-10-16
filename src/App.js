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
  const [bookingIntent, setBookingIntent] = useState(null)
  const clearBookingIntent = () => setBookingIntent(null)
  const continueBooking = (selection) => { setBookingIntent(selection); setAuthOpen(true) }
  const { user: guestUser, signIn: guestSignIn, signUp: guestSignUp } = useAccount()
  const { user: staffUser, login: staffLogin, logout: staffLogout } = useAdmin()

  const openAuth = () => setAuthOpen(true)
  const closeAuth = () => setAuthOpen(false)

  // ---- Signed in as staff → admin interface ----
  if (staffUser) {
    return <AdminLayout />
  }

  // ---- Signed in as guest → account dashboard ----
  if (guestUser) {
    return <AccountPage bookingIntent={bookingIntent} clearBookingIntent={clearBookingIntent} />
  }

  // ---- Not signed in → public site ----
  // Try staff login first, then guest login
  const handleSignIn = (email, password) => {
    if (staffLogin(email, password)?.ok) { clearBookingIntent(); return { ok: true, role: 'staff' } }
    if (guestSignIn(email, password)) return { ok: true, role: 'guest' }
    return { error: 'Incorrect email or password.' }
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