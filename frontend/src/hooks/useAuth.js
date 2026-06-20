import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'yt_tracker_user'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingVerification, setPendingVerification] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {}
    }
    setLoading(false)
  }, [])

  const signIn = useCallback(async (email, password) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return false
      }
      if (data.needOtp) {
        setPendingVerification({ email: data.email, devCode: data.devCode || null })
        if (data.emailSent === false) setError('Email delivery failed — using fallback code')
        return false
      }
      setPendingVerification(null)
      const userData = { userId: data.userId, email: data.email, isAdmin: data.isAdmin || false }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
      setUser(userData)
      return true
    } catch (err) {
      setError('Failed to sign in. Is the server running?')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const completeVerification = useCallback(() => {
    setPendingVerification(null)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setPendingVerification(null)
  }, [])

  const setAuthUser = useCallback((data) => {
    const userData = { userId: data.userId, email: data.email, isAdmin: data.isAdmin || false }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    setUser(userData)
  }, [])

  return { user, loading, error, signIn, signOut, pendingVerification, completeVerification, setAuthUser }
}
