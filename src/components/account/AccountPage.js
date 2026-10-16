import { useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import HomeTab from './HomeTab'
import BookTab from './BookTab'
import TripsTab from './TripsTab'
import ProfileTab from './ProfileTab'

const TABS = [
  ['home', 'Home'],
  ['book', 'Book a stay'],
  ['trips', 'My bookings'],
  ['me', 'Profile'],
]

export default function AccountPage({ bookingIntent = null, clearBookingIntent = () => {} }) {
  const { user, signOut } = useAccount()
  const [tab, setTab] = useState(bookingIntent ? 'book' : 'home')
  const [signOutOpen, setSignOutOpen] = useState(false)

  if (!user) return null

  return (
    <div className="acc-app">
      <header className="acc-header">
        <div className="wrap">
          <span className="acc-logo">TWIN LAKES</span>
          <div className="acc-tabs">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                className={id === tab ? 'on' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="acc-signout" onClick={() => setSignOutOpen(true)}>
            Sign out
          </button>
        </div>
      </header>

      <div className="wrap acc-main">
        {tab === 'home' && <HomeTab onNavigate={setTab} />}
        {tab === 'book' && <BookTab initialSearch={bookingIntent} onBooked={clearBookingIntent} />}
        {tab === 'trips' && <TripsTab />}
        {tab === 'me' && <ProfileTab />}
      </div>

      {signOutOpen && (
        <div className="acc-modal-overlay" onClick={() => setSignOutOpen(false)}>
          <div
            className="acc-modal signout-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Sign out?</h3>
            <p className="acc-muted">
              You'll need to sign in again to access your bookings and profile.
            </p>
            <div className="acc-modal-actions">
              <button
                className="btn ghost-dark"
                onClick={() => setSignOutOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => {
                  setSignOutOpen(false)
                  clearBookingIntent()
                  signOut()
                }}
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}