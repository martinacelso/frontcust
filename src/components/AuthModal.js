import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthModal({ isOpen, onClose }) {
  const { handleSignIn, handleSignUp } = useAuth()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

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

    if (mode === 'reset') {
      if (!email) return setMessage('Please enter your email.')
      return setMessage('Demo only: reset link would be emailed to you.')
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
    if (!firstName || !lastName) {
      return setMessage('Please enter your first and last name.')
    }
    const result = handleSignUp({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim().toLowerCase(),
      password,
      phone: '',
    })
    if (result.error) return setMessage(result.error)
    reset()
    onClose()
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

            {message && <p className="auth-msg">{message}</p>}
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