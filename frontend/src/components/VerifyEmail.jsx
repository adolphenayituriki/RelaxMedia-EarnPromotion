import { useState } from 'react'

export default function VerifyEmail({ email, onVerified, onCancel, devCode }) {
  const [code, setCode] = useState(devCode || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(devCode ? 'Email unavailable — using fallback code below' : '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      onVerified(data)
    } catch {
      setError('Failed to verify. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.emailSent === false) {
        setMessage('Code generated (check server console) — email sending failed')
      } else {
        setMessage('New code sent to your email')
      }
    } catch {
      setError('Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin-overlay" onClick={onCancel}>
      <div className="signin-modal" onClick={e => e.stopPropagation()}>
        <div className="signin-modal-header">
          <h2>Enter Verification Code</h2>
          <button className="signin-close" onClick={onCancel}>✕</button>
        </div>
        <p className="signin-desc">
          A 6-digit code was sent to <strong>{email}</strong>. If you don't see it, check spam or click <strong>Resend Code</strong>.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            required
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Submit'}
          </button>
        </form>
        <button className="resend-btn" onClick={handleResend} disabled={loading}>
          Resend Code
        </button>
        {error && <p className="signin-error">{error}</p>}
        {message && <p className="signin-success">{message}</p>}
      </div>
    </div>
  )
}
