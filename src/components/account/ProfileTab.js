import GuestInbox from './GuestInbox'
import DigitInput from '../DigitInput'
import { useState, useRef } from 'react'
import { useAccount, nights, P } from '../../context/AccountContext'

import { phMobileError, emailError } from '../../utils/validation'
import { hotelDate } from '../../utils/hotel'

export default function ProfileTab() {
  const { user, updateProfile, changePassword, myBookings } = useAccount()

  const saveLock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [profilePassword, setProfilePassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

  async function handleSaveProfile() {
    if (saveLock.current) return
    setSaved(false)
    setPhoneTouched(true)
    setProfileError('')
    const emailIssue = emailError(email) || emailError(contactEmail)
    if (emailIssue) return setProfileError(emailIssue)
    const phoneIssue = phMobileError(phone)
    if (phoneIssue) return setProfileError(phoneIssue)
    saveLock.current = true
    setBusy(true)
    try {
    const result = await updateProfile({
      currentPassword: profilePassword,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      contactEmail: contactEmail.trim().toLowerCase(),
      phone: phone.trim(),
    })
    if (result?.error) return setProfileError(result.error)
    setProfilePassword('')
    setDraft({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
    } finally { saveLock.current = false; setBusy(false) }
  }

  async function handleChangePassword() {
    if (saveLock.current) return
    setPwError('')
    setPwSaved(false)
    if (next !== confirmPassword) return setPwError('New passwords do not match.')
    saveLock.current = true
    setBusy(true)
    try {
    const result = await changePassword(current, next)
    if (result.error) {
      setPwError(result.error)
      return
    }
    setPwSaved(true)
    setCurrent('')
    setNext('')
    setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 2200)
    } finally { saveLock.current = false; setBusy(false) }
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
          <GuestInbox key={user.id || user.guestId} />
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

              {email.trim().toLowerCase() !== user.email && <div>
                <label htmlFor="profile-current-password">Current password to change login email</label>
                <input id="profile-current-password" type="password" autoComplete="current-password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} />
              </div>}
              <div>
                <label htmlFor="booking-contact-email">Booking email address</label>
                <input id="booking-contact-email" type="email" autoComplete="email" required maxLength={254} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                <p className="acc-muted acc-small">This address appears on your booking messages below. Messages stay inside your profile; no external email is sent.</p>
              </div>
              <div>
                <label htmlFor="profile-phone">Philippine mobile number</label>
                <DigitInput
                  id="profile-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder="0911 222 1233"
                  value={phone}
                  onValueChange={(value) => { setPhone(value); setSaved(false); setProfileError('') }}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={Boolean(phoneMessage)}
                  aria-describedby="profile-phone-help profile-phone-error"
                />
                <p id="profile-phone-help" className="acc-muted acc-small">Optional. Enter 11 digits starting with 09, shown as 0911 222 1233.</p>
                <p id="profile-phone-error" className="acc-error" aria-live="polite">{phoneMessage}</p>
              </div>
            </div>

            <div className="acc-form-footer">
              <button className="btn" disabled={busy} onClick={handleSaveProfile}>
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
                Use at least 8 characters (maximum 72 UTF-8 bytes). Avoid reusing passwords from other sites.
              </p>
            </div>

            <div className="profile-form">
              <div>
                <label>Current password</label>
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>

              <div>
                <label>New password</label>
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-form"><div>
              <label htmlFor="confirm-new-password">Confirm new password</label>
              <input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div></div>
            {pwError && <p className="acc-error">{pwError}</p>}
            {pwSaved && <p className="acc-saved">✓ Password updated. Other sessions have been signed out.</p>}

            <div className="acc-form-footer">
              <button className="btn" disabled={busy} onClick={handleChangePassword}>
                Update password
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}