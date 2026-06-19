import { useState } from 'react'

export default function SignIn({ onSignIn, loading, error, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email.trim() && password.trim()) onSignIn(email.trim(), password.trim())
  }

  return (
    <div className="signin-overlay" onClick={onClose}>
      <div className="signin-modal" onClick={e => e.stopPropagation()}>
        <div className="signin-modal-header">
          <h2>Sign In</h2>
          <button className="signin-close" onClick={onClose}>✕</button>
        </div>
        <p className="signin-desc">Enter your email and password to start earning rewards.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading || !email.trim() || !password.trim()}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {error && <p className="signin-error">{error}</p>}
      </div>
    </div>
  )
}
