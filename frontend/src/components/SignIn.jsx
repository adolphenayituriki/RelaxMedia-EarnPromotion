import { useState } from 'react'

export default function SignIn({ onSignIn, onSignUp, loading, error, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (isSignUp) {
      onSignUp(fullName.trim(), email.trim(), password.trim())
    } else {
      onSignIn(email.trim(), password.trim())
    }
  }

  return (
    <div className="signin-overlay" onClick={onClose}>
      <div className="signin-modal" onClick={e => e.stopPropagation()}>
        <div className="signin-modal-header">
          <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
          <button className="signin-close" onClick={onClose}>✕</button>
        </div>
        <p className="signin-desc">
          {isSignUp ? 'Create an account to start earning rewards.' : 'Enter your email and password to start earning rewards.'}
        </p>
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          )}
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <div className="pw-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" disabled={loading || !email.trim() || !password.trim()}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <button className="toggle-auth-mode" onClick={() => setIsSignUp(p => !p)}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
        {error && <p className="signin-error">{error}</p>}
      </div>
    </div>
  )
}