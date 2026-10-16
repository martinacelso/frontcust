import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'

export default function AdminProfile({ onClose }) {
  const { user, updateSelf } = useAdmin()

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

  const memberSince = '2024'

  function handleSaveProfile() {
    setSaved(false)
    setProfileError('')
    const result = updateSelf({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    })
    if (result?.error) return setProfileError(result.error)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function handleChangePassword() {
    setPwError('')
    setPwSaved(false)

    if (!current) return setPwError('Please enter your current password.')
    if (current !== user.pw) return setPwError('Current password is incorrect.')
    if (next.length < 6) return setPwError('New password must be at least 6 characters.')
    if (next.length > 20) return setPwError('New password must be 20 characters or fewer.')
    if (next !== confirm) return setPwError('New passwords do not match.')

    const result = updateSelf({ pw: next })
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

                <div>
                  <label>Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="acc-form-footer">
                <button className="btn" onClick={handleSaveProfile}>Save changes</button>
                {profileError && <p className="acc-error" role="alert">{profileError}</p>}
              {saved && <span className="acc-saved">✓ Profile updated</span>}
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Change password</h3>
                <p className="acc-muted acc-small">
                  Use 6–20 characters. You'll stay signed in after changing it.
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

                <div>
                  <label>Confirm new password</label>
                  <input
                    type="password"
                    maxLength={20}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
      </div>
    </div>
  )
}