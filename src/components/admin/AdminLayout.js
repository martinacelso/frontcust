import { useState } from 'react'
import { useAdmin, MODS } from '../../context/AdminContext'
import Dashboard from './Dashboard'
import RoomsModule from './RoomsModule'
import ReservationsModule from './ReservationsModule'
import GuestsModule from './GuestsModule'
import CheckInModule from './CheckInModule'
import BillingModule from './BillingModule'
import HousekeepingModule from './HousekeepingModule'
import ReportsModule from './ReportsModule'
import StaffModule from './StaffModule'
import AuditModule from './AuditModule'
import AdminProfile from './AdminProfile'

export default function AdminLayout() {
  const { user, can, logout } = useAdmin()
  const [tab, setTab] = useState('dash')
  const [accountOpen, setAccountOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  if (!user) return null

  const visible = MODS.filter(([id]) => can(id))

  function renderModule() {
    if (!can(tab)) return <p className="admin-muted">You do not have access to this section. Choose a section from the menu.</p>
    switch (tab) {
      case 'dash': return <Dashboard />
      case 'rooms': return <RoomsModule />
      case 'book': return <ReservationsModule />
      case 'guests': return <GuestsModule />
      case 'chk': return <CheckInModule />
      case 'bill': return <BillingModule />
      case 'hk': return <HousekeepingModule />
      case 'rep': return <ReportsModule />
      case 'staff': return <StaffModule />
      case 'audit': return <AuditModule />
      default: return null
    }
  }

  const currentLabel = MODS.find(([id]) => id === tab)?.[1] || 'Dashboard'

  return (
    <div className="admin-app">
      <aside className="admin-side">
        <div className="admin-side-brand">Twin Lakes</div>
        <div className="admin-side-user">
          {user.name} · {user.role}
        </div>
        <nav className="admin-side-nav">
          {visible.map(([id, label]) => (
            <button
              key={id}
              className={id === tab ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-side-footer">
          <button onClick={() => setAccountOpen(true)}>My account</button>
          <button onClick={() => setSignOutOpen(true)}>Sign out</button>
        </div>
      </aside>

      <main className="admin-main">
        <h1 className="admin-page-title">{currentLabel}</h1>
        {renderModule()}
      </main>

      {accountOpen && (
        <AdminProfile onClose={() => setAccountOpen(false)} />
      )}

      {signOutOpen && (
        <div className="acc-modal-overlay" onClick={() => setSignOutOpen(false)}>
          <div className="acc-modal signout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sign out?</h3>
            <p className="acc-muted">
              You'll need to sign in again to access the admin panel.
            </p>
            <div className="acc-modal-actions">
              <button className="btn ghost-dark" onClick={() => setSignOutOpen(false)}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => {
                  setSignOutOpen(false)
                  logout()
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