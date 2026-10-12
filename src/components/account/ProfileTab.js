import { useState } from 'react'
import { useAccount, nights, P, TYPES } from '../../context/AccountContext'

export default function ProfileTab() {
  const { user, updateProfile, changePassword, myBookings } = useAccount()

  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone || '')
  const [saved, setSaved] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const mine = myBookings()
  const today = new Date().toISOString().slice(0, 10)
  const past = mine.filter((b) => b.st === 'checked-out')
  const upcoming = mine.filter(
    (b) => b.st !== 'cancelled' && b.out >= today && b.st !== 'checked-out'
  )
  const lifetimeNights = past.reduce((s, b) => s + nights(b.in, b.out), 0)
  const lifetimeSpend = past.reduce(
    (s, b) => s + nights(b.in, b.out) * TYPES.find((t) => t.n === b.type).r,
    0
  )
  const memberSince = '2024'

  function handleSaveProfile() {
    if (!name.trim() || !email.trim()) return
    updateProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function handleChangePassword() {
    setPwError('')
    setPwSaved(false)
    const result = changePassword(current, next)
    if (result.error) {
      setPwError(result.error)
      return
    }
    setPwSaved(true)
    setCurrent('')
    setNext('')
    setTimeout(() => setPwSaved(false), 2200)
  }

  return (
    <>
      <h2 className="acc-section-title">My profile</h2>

      <div className="profile-layout">
        {/* LEFT: account summary */}
        <aside className="profile-sidebar">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-name">{user.name}</div>
          <div className="profile-email">{user.email}</div>

          <span className="profile-badge">Twin Lakes Member</span>

          <div className="profile-divider" />

          <div className="profile-stat-row">
            <div>
              <b>{upcoming.length}</b>
              <span>Upcoming</span>
            </div>
            <div>
              <b>{past.length}</b>
              <span>Past stays</span>
            </div>
          </div>
          <div className="profile-stat-row">
            <div>
              <b>{lifetimeNights}</b>
              <span>Nights</span>
            </div>
            <div>
              <b>{P(lifetimeSpend)}</b>
              <span>Total spent</span>
            </div>
          </div>

          <div className="profile-divider" />
          <div className="profile-since">Member since {memberSince}</div>
        </aside>

        {/* RIGHT: forms */}
        <div className="profile-main">
          <div className="acc-card profile-card">
            <div className="profile-card-header">
              <h3>Personal information</h3>
              <p className="acc-muted acc-small">
                Keep your details up to date for a smoother check-in.
              </p>
            </div>

            <div className="profile-form">
              <div>
                <label>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label>Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="acc-form-footer">
              <button className="btn" onClick={handleSaveProfile}>
                Save changes
              </button>
              {saved && <span className="acc-saved">✓ Profile updated</span>}
            </div>
          </div>

          <div className="acc-card profile-card">
            <div className="profile-card-header">
              <h3>Change password</h3>
              <p className="acc-muted acc-small">
                Use at least 6 characters. Avoid reusing passwords from other sites.
              </p>
            </div>

            <div className="profile-form">
              <div>
                <label>Current password</label>
                <input
                  type="password"
                  maxLength={20}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>

              <div>
                <label>New password</label>
                <input
                  type="password"
                  maxLength={20}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </div>
            </div>

            {pwError && <p className="acc-error">{pwError}</p>}
            {pwSaved && <p className="acc-saved">✓ Password updated</p>}

            <div className="acc-form-footer">
              <button className="btn" onClick={handleChangePassword}>
                Update password
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}