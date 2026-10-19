import { emailError, textError } from '../utils/validation'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthModal({ isOpen, onClose }) {
  return isOpen ? <AuthDialog onClose={onClose} /> : null
}

function AuthDialog({ onClose }) {
  const { handleSignIn, handleSignUp } = useAuth()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [message, setMessage] = useState('')
  const [notification, setNotification] = useState('')

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(''), 6000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setMessage('')
    setShowPass(false)
  }

  function switchMode(next) {
    reset()
    setMode(next)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const error = emailError(email)
    if (error) return setMessage(error)

    if (mode === 'reset') {
      if (!email) return setMessage('Please enter your email.')
      return setMessage('Password reset by email is not available yet. No reset link has been sent.')
    }

    if (!email || !password) return setMessage('Please fill in all fields.')

    if (mode === 'signin') {
      const result = handleSignIn(email.trim().toLowerCase(), password)
      if (result.error) return setMessage(result.error)
      reset()
      onClose()
      return
    }

    // signup — guests only
    if (textError(firstName, 'First name') || textError(lastName, 'Last name')) {
      return setMessage('Please enter your first and last name.')
    }
    const result = handleSignUp({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim().toLowerCase(),
      password,
      phone: '',
    })
    if (result.error) return setMessage(result.error)
    const registeredEmail = email.trim().toLowerCase()
    reset()
    setMode('signin')
    setEmail(registeredEmail)
    setNotification('Your account is ready. Please sign in with your email and password.')
  }

  const heading =
    mode === 'signin' ? 'SIGN IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'

  const subheading =
    mode === 'signin'
      ? 'Welcome back. Enter your details to continue.'
      : mode === 'signup'
      ? 'Join Twin Lakes Hotel for exclusive rates and offers.'
      : "We'll email you a link to reset your password."

  const buttonLabel =
    mode === 'signin' ? 'SIGN IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'

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
            <strong style={{ display: 'block', marginBottom: 3 }}>Account created successfully!</strong>
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
        <button className="auth-close" onClick={onClose} aria-label="Close">×</button>

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

            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="auth-field">
                <label htmlFor="auth-password">Password</label>
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

            {mode === 'signin' && (
              <div className="auth-forgot-row">
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => switchMode('reset')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="auth-submit">{buttonLabel}</button>

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
            {mode === 'reset' && (
              <>
                Remembered it?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
