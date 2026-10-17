import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'

export default function AdminLogin() {
  const { login } = useAdmin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const result = await login(email.trim().toLowerCase(), password)
    setBusy(false)
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

        <button type="submit" className="admin-login-btn" disabled={busy}>Sign in</button>


      </form>
    </div>
  )
}