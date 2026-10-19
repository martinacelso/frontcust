import { emailError, textError } from '../utils/validation'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authRequest } from '../utils/api'

function clearResetTokenFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('resetToken')
  url.hash = ''
  window.history.replaceState(null, '', url.pathname + url.search)
}

export default function AuthModal({ isOpen, onClose, resetToken }) {
  return isOpen ? <AuthDialog key={resetToken || 'auth'} onClose={onClose} resetToken={resetToken} /> : null
}

function AuthDialog({ onClose, resetToken }) {
  const { handleSignIn, handleSignUp } = useAuth()

  const [mode, setMode] = useState(resetToken ? 'set-password' : 'signin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [message, setMessage] = useState('')
  const [notification, setNotification] = useState('')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(''), 6000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !resetToken) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, resetToken])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setMessage('')
    setShowPass(false)
  }

  function switchMode(next) {
    reset()
    setMode(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    if (mode === 'reset-request' || mode === 'signin' || mode === 'signup') {
      const error = emailError(email)
      if (error) return setMessage(error)
    }

    if (mode === 'set-password') {
      if (password.length < 8) return setMessage('Use a password with at least 8 characters.')
      if (password !== confirmPassword) return setMessage('The passwords do not match.')
    } else if (!email || (mode !== 'reset-request' && !password)) {
      return setMessage('Please fill in all fields.')
    }

    setBusy(true)
    setMessage('')
    try {
      if (mode === 'reset-request') {
        const result = await authRequest('/password-reset/request', { email: email.trim().toLowerCase() })
        if (result.error || !result.ok) return setMessage(result.error || 'Unable to request a password reset.')
        setPassword('')
        setMode('signin')
        setNotificationTitle('Password reset request')
        setNotification(result.message)
        if (resetToken) {
          clearResetTokenFromUrl()
          window.setTimeout(() => window.location.reload(), 1200)
        }
        return
      }

      if (mode === 'set-password') {
        const result = await authRequest('/password-reset/complete', { token: resetToken, password })
        if (result.error || !result.ok) return setMessage(result.error || 'Unable to reset your password.')
        setMessage(result.message)
        clearResetTokenFromUrl()
        window.setTimeout(() => window.location.reload(), 1200)
        return
      }

      if (mode === 'signin') {
        const result = await handleSignIn(email.trim().toLowerCase(), password)
        if (result.error || !result.ok) {
          return setMessage(result.error || 'Sign in could not be confirmed. Please try again.')
        }
        reset()
        onClose()
        return
      }

      // signup — guests only
      if (textError(firstName, 'First name') || textError(lastName, 'Last name')) {
        return setMessage('Please enter your first and last name.')
      }
      const result = await handleSignUp({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        password,
        phone: '',
      })
      if (result.error || !result.ok) {
        return setMessage(result.error || 'Account creation could not be confirmed. Please try again.')
      }
      const registeredEmail = email.trim().toLowerCase()
      reset()
      setMode('signin')
      setEmail(registeredEmail)
      setNotificationTitle('Account created successfully!')
      setNotification('Your account is ready. Please sign in with your email and password.')
    } finally {
      setBusy(false)
    }
  }

  const heading =
    mode === 'signin' ? 'SIGN IN'
      : mode === 'signup' ? 'CREATE ACCOUNT'
        : mode === 'set-password' ? 'CHOOSE A NEW PASSWORD' : 'RESET PASSWORD'

  const subheading =
    mode === 'signin'
      ? 'Welcome back. Enter your details to continue.'
      : mode === 'signup'
      ? 'Join Twin Lakes Hotel for exclusive rates and offers.'
      : mode === 'set-password'
        ? 'Choose a new password for your account.'
        : "We'll email you a link to reset your password."

  const buttonLabel =
    mode === 'signin' ? 'SIGN IN'
      : mode === 'signup' ? 'CREATE ACCOUNT'
        : mode === 'set-password' ? 'UPDATE PASSWORD' : 'SEND RESET LINK'

  return (
    <div className="auth-overlay">
      {notification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 10000,
            width: 'min(380px, calc(100vw - 40px))', boxSizing: 'border-box',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '16px 18px', borderRadius: 12, background: '#fff',
            border: '1px solid #cce5d7', borderLeft: '5px solid #287b50',
            boxShadow: '0 8px 30px rgba(0,0,0,.16)', color: '#234332',
            textAlign: 'left', fontSize: 14, lineHeight: 1.5,
          }}
        >
          <span aria-hidden="true" style={{ color: '#287b50', fontSize: 22 }}>✓</span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: 3 }}>{notificationTitle}</strong>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotification('')}
            style={{ border: 0, background: 'transparent', color: '#466253', cursor: 'pointer', fontSize: 22, padding: '0 4px', lineHeight: 1.2 }}
          >
            ×
          </button>
        </div>
      )}
      <div className="auth-left">
        <div className="auth-logo">TWIN LAKES HOTEL</div>
        <div className="auth-welcome">
          <h1>WELCOME TO TWIN LAKES</h1>
          <p>Please sign in to continue to the hotel website.</p>
        </div>
      </div>

      <div className="auth-right">
        {!resetToken && <button className="auth-close" onClick={onClose} aria-label="Close">×</button>}

        <div className="auth-form-wrap">
          <h2 className="auth-heading">{heading}</h2>
          <p className="auth-sub">{subheading}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="auth-name-row">
                <div className="auth-field">
                  <label htmlFor="auth-first">First name</label>
                  <input
                    id="auth-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="auth-last">Last name</label>
                  <input
                    id="auth-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            )}

            {mode !== 'set-password' && <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>}

            {mode !== 'reset-request' && (
              <div className="auth-field">
                <label htmlFor="auth-password">{mode === 'set-password' ? 'New password' : 'Password'}</label>
                <div className="auth-pass-wrap">
                  <input
                    id="auth-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="auth-show"
                    onClick={() => setShowPass((s) => !s)}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'set-password' && (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password">Confirm new password</label>
                <input
                  id="auth-confirm-password"
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}

            {mode === 'signin' && (
              <div className="auth-forgot-row">
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => switchMode('reset-request')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'PLEASE WAIT…' : buttonLabel}</button>

            {message && <p className="auth-msg" role="alert">{message}</p>}
          </form>

          <p className="auth-switch">
            {mode === 'signin' && (
              <>
                New to Twin Lakes?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset-request' && (
              <>
                Remembered it?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              </>
            )}
            {mode === 'set-password' && (
              <>
                Need a new link?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('reset-request')}>
                  Request another reset link
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
