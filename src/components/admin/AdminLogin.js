import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'

export default function AdminLogin() {
  const { login } = useAdmin()

  const [email, setEmail] = useState('admin@twinlakes.ph')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const result = login(email.trim().toLowerCase(), password)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <div className="admin-login-logo">TWIN LAKES HOTEL</div>
        <h1>Admin &amp; Staff</h1>
        <p className="admin-login-sub">Sign in to manage the property.</p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="admin-login-error">{error}</p>}

        <button type="submit" className="admin-login-btn">Sign in</button>

        <div className="admin-login-hint">
          <b>Demo logins</b>
          <ul>
            <li><span>admin@twinlakes.ph</span> / admin123 <em>(Admin)</em></li>
            <li><span>desk@twinlakes.ph</span> / desk123 <em>(Front Desk)</em></li>
            <li><span>hk@twinlakes.ph</span> / hk123 <em>(Housekeeping)</em></li>
          </ul>
        </div>
      </form>
    </div>
  )
}