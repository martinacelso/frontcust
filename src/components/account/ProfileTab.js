import { useState } from 'react'
import { useAccount, nights, P } from '../../context/AccountContext'

import { phMobileError } from '../../utils/validation'
import { hotelDate } from '../../utils/hotel'

export default function ProfileTab() {
  const { user, updateProfile, changePassword, myBookings } = useAccount()

  const [draft, setDraft] = useState({})
  const name = draft.name ?? user.name
  const email = draft.email ?? user.email
  const phone = draft.phone ?? user.phone ?? ''
  const contactEmail = draft.contactEmail ?? user.contactEmail ?? user.email
  const setName = (value) => setDraft((d) => ({ ...d, name: value }))
  const setEmail = (value) => setDraft((d) => ({ ...d, email: value }))
  const setPhone = (value) => setDraft((d) => ({ ...d, phone: value }))
  const setContactEmail = (value) => setDraft((d) => ({ ...d, contactEmail: value }))
  const [phoneTouched, setPhoneTouched] = useState(false)
  const phoneMessage = phoneTouched ? phMobileError(phone) : ''
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

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
  const today = hotelDate()
  const past = mine.filter((b) => b.st === 'checked-out')
  const upcoming = mine.filter(
    (b) => b.st !== 'cancelled' && b.out >= today && b.st !== 'checked-out'
  )
  const lifetimeNights = past.reduce((s, b) => s + nights(b.in, b.out), 0)
  const lifetimeSpend = past.reduce(
    (s, b) => s + b.paid,
    0
  )
  const memberSince = user.createdAt ? hotelDate(user.createdAt).slice(0, 4) : '—'

  function handleSaveProfile() {
    setSaved(false)
    setPhoneTouched(true)
    setProfileError('')
    const phoneIssue = phMobileError(phone)
    if (phoneIssue) return setProfileError(phoneIssue)
    const result = updateProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      contactEmail: contactEmail.trim().toLowerCase(),
      phone: phone.trim(),
    })
    if (result?.error) return setProfileError(result.error)
    setDraft({})
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
                <label>Login email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label>Contact email</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                <p className="acc-muted acc-small">The hotel uses this for your reservation details. Staff changes to it do not change your login email.</p>
              </div>
              <div>
                <label htmlFor="profile-phone">Philippine mobile number</label>
                <input
                  id="profile-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder="09171234567"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setSaved(false); setProfileError('') }}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={Boolean(phoneMessage)}
                  aria-describedby="profile-phone-help profile-phone-error"
                />
                <p id="profile-phone-help" className="acc-muted acc-small">Optional. Use 09171234567 or +639171234567.</p>
                <p id="profile-phone-error" className="acc-error" aria-live="polite">{phoneMessage}</p>
              </div>
            </div>

            <div className="acc-form-footer">
              <button className="btn" onClick={handleSaveProfile}>
                Save changes
              </button>
              {profileError && <p className="acc-error" role="alert">{profileError}</p>}
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