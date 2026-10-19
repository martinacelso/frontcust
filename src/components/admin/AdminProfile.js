import DigitInput from '../DigitInput'
import { useState, useRef } from 'react'
import { useAdmin } from '../../context/AdminContext'

export default function AdminProfile({ onClose }) {
  const { user, updateSelf } = useAdmin()

  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [emailPassword, setEmailPassword] = useState('')
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone || '')

  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : '—'

  async function handleSaveProfile() {
    if (lock.current) return
    setSaved(false)
    setProfileError('')
    lock.current = true
    setBusy(true)
    const result = await updateSelf({
      currentPassword: emailPassword,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    })
    lock.current = false
    setBusy(false)
    if (result?.error) return setProfileError(result.error)
    setEmailPassword('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  async function handleChangePassword() {
    if (lock.current) return
    setPwError('')
    setPwSaved(false)

    if (!current) return setPwError('Please enter your current password.')
    if (next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (next !== confirm) return setPwError('New passwords do not match.')

    lock.current = true
    setBusy(true)
    const result = await updateSelf({ pw: next, currentPassword: current })
    lock.current = false
    setBusy(false)
    if (result?.error) return setPwError(result.error)
    setCurrent('')
    setNext('')
    setConfirm('')
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 2200)
  }

  return (
    <div className="acc-modal-overlay" onClick={onClose}>
      <div className="acc-modal profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="acc-modal-x" onClick={onClose} aria-label="Close">×</button>

        <div className="profile-layout">
          {/* ---- LEFT: summary ---- */}
          <aside className="profile-sidebar">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-name">{user.name}</div>
            <div className="profile-email">{user.email}</div>

            <span className="profile-badge">{user.role}</span>

            <div className="profile-divider" />

            <div className="profile-stat-row">
              <div>
                <b>{user.dept}</b>
                <span>Department</span>
              </div>
              <div>
                <b>{memberSince}</b>
                <span>Member since</span>
              </div>
            </div>

            <div className="profile-divider" />

            <img
              className="profile-logo"
              src="/logo.png"
              alt="Twin Lakes Hotel"
            />
          </aside>

          {/* ---- RIGHT: forms ---- */}
          <div className="profile-main">
            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Personal information</h3>
                <p className="acc-muted acc-small">
                  Update your contact details so admins can reach you.
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

                {email.trim().toLowerCase() !== user.email && <div>
                  <label htmlFor="staff-email-password">Current password to change email</label>
                  <input id="staff-email-password" type="password" autoComplete="current-password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
                </div>}
                <div>
                  <label>Philippine mobile number</label>
                  <DigitInput value={phone} onValueChange={setPhone} placeholder="0911 222 1233 (optional)" />
                </div>
              </div>

              <div className="acc-form-footer">
                <button className="btn" disabled={busy} onClick={handleSaveProfile}>Save changes</button>
                {profileError && <p className="acc-error" role="alert">{profileError}</p>}
              {saved && <span className="acc-saved">✓ Profile updated</span>}
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Change password</h3>
                <p className="acc-muted acc-small">
                  Use at least 8 characters.
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

                <div>
                  <label>Confirm new password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>

              {pwError && <p className="acc-error">{pwError}</p>}
              {pwSaved && <p className="acc-saved">✓ Password updated</p>}

              <div className="acc-form-footer">
                <button className="btn" disabled={busy} onClick={handleChangePassword}>
                  Update password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}