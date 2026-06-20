import { useEffect, useRef, useState, useCallback } from 'react'
import VideoPlayer from './components/VideoPlayer.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import ActivityLog from './components/ActivityLog.jsx'
import PlaylistSidebar from './components/PlaylistSidebar.jsx'
import Promotions from './components/Promotions.jsx'
import SignIn from './components/SignIn.jsx'
import VerifyEmail from './components/VerifyEmail.jsx'
import WithdrawModal from './components/WithdrawModal.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import useYouTubePlayer from './hooks/useYouTubePlayer.js'
import useAuth from './hooks/useAuth.js'
import './App.css'

const DEFAULT_PLAYLIST = 'PLIg7BzY08KX0w83WPW6GPZJwxTcKhK4ya'

export default function App() {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut, setAuthUser, pendingVerification, completeVerification } = useAuth()
  const hook = useYouTubePlayer()
  const apiLoadedRef = useRef(false)
  const fetchedRef = useRef(false)
  const [showPromo, setShowPromo] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [welcomeMsg, setWelcomeMsg] = useState('')
  const [watchedMap, setWatchedMap] = useState({})
  const [videos, setVideos] = useState([])

  const fetchPlaylist = useCallback(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch(`/api/playlist/${DEFAULT_PLAYLIST}`)
      .then(r => r.json())
      .then(data => {
        if (data.videos) {
          hook.setPlaylistVideos(data.videos)
          setVideos(data.videos)
        }
      })
      .catch(() => {})
  }, [hook.setPlaylistVideos])

  const fetchWatched = useCallback(async (userId) => {
    try {
      const res = await fetch(`/api/watched/${userId}`)
      const data = await res.json()
      setWatchedMap(data)
    } catch {
      setWatchedMap({})
    }
  }, [])

  useEffect(() => {
    if (apiLoadedRef.current) return
    if (window.YT && window.YT.loaded) {
      apiLoadedRef.current = true
      hook.loadPlaylist(DEFAULT_PLAYLIST)
      fetchPlaylist()
      return
    }
    apiLoadedRef.current = true
    window.onYouTubeIframeAPIReady = () => {
      hook.loadPlaylist(DEFAULT_PLAYLIST)
      fetchPlaylist()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [hook.loadPlaylist, fetchPlaylist])

  useEffect(() => {
    if (user) {
      fetchWatched(user.userId)
      fetch(`/api/earnings/${user.userId}`)
        .then(r => r.json())
        .then(data => {
          if (data.totalSeconds > 0) {
            hook.restoreWatched(data.totalSeconds)
            const hrs = (data.totalSeconds / 3600).toFixed(1)
            setWelcomeMsg(`Welcome back${user.fullName ? ' ' + user.fullName : ''}! ${hrs}h watched, ${data.earned.toFixed(2)} RFW earned.`)
            setTimeout(() => setWelcomeMsg(''), 4000)
          }
        })
        .catch(() => {})
    }
  }, [user, fetchWatched, hook.restoreWatched])

  const markWatched = useCallback(async (videoId, totalWatched) => {
    if (!user) return
    const cumulativeTotal = hook.getCumulativeTotal()
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.userId, videoId, totalWatched, fullyWatched: true, cumulativeTotal }),
    })
    setWatchedMap(prev => ({ ...prev, [videoId]: { totalWatched, fullyWatched: true } }))
  }, [user, hook.getCumulativeTotal])

  const unwatchedCount = videos.filter(v => !watchedMap[v.id]).length

  const TIERS = [
    { minHours: 0, rate: 65, label: 'Starter' },
    { minHours: 5, rate: 80, label: 'Bronze' },
    { minHours: 12, rate: 100, label: 'Silver' },
  ]
  const watchedHours = hook.totalWatched / 3600
  let currentTier = TIERS[0]
  for (const t of TIERS) {
    if (watchedHours >= t.minHours) currentTier = t
  }
  const earned = watchedHours * currentTier.rate

  const pendingEndedRef = useRef(null)

  useEffect(() => {
    if (hook.lastEndedVideoId) {
      pendingEndedRef.current = hook.lastEndedVideoId
    }
  }, [hook.lastEndedVideoId])

  useEffect(() => {
    const vid = pendingEndedRef.current
    if (vid && !watchedMap[vid]) {
      markWatched(vid, hook.duration)
      pendingEndedRef.current = null
    } else if (vid && watchedMap[vid]) {
      pendingEndedRef.current = null
    }
  }, [watchedMap, hook.duration, markWatched])

  useEffect(() => {
    if (!user) return
    const handleBeforeUnload = () => {
      const total = hook.getCumulativeTotal()
      if (total > 0) {
        navigator.sendBeacon('/api/earnings', JSON.stringify({ userId: user.userId, totalSeconds: total }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user, hook.getCumulativeTotal])

  const handleSignIn = async (email, password) => {
    const ok = await signIn(email, password)
    if (ok) setShowSignIn(false)
    return ok
  }

  const handleSignUp = async (fullName, email, password) => {
    await signUp(fullName, email, password)
  }

  const handleSignOut = () => {
    const total = hook.getCumulativeTotal()
    if (total > 0) {
      navigator.sendBeacon('/api/earnings', JSON.stringify({ userId: user.userId, totalSeconds: total }))
    }
    hook.resetState()
    signOut()
  }

  const [withdrawInfo, setWithdrawInfo] = useState(null)

  useEffect(() => {
    if (user && !user.isAdmin) {
      fetch(`/api/withdraw/earnings-info/${user.userId}`)
        .then(r => r.json())
        .then(setWithdrawInfo)
        .catch(() => {})
    }
  }, [user])

  const handleWithdraw = useCallback(async ({ amount, fee, netAmount, phone, fullName }) => {
    if (!user) return { error: 'Not logged in' }
    setWithdrawSubmitting(true)
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, email: user.email, amount, phone, fullName }),
      })
      const data = await res.json()
      if (data.success) {
        setWithdrawInfo(prev => ({
          ...prev,
          available: data.available,
          totalWithdrawn: data.totalWithdrawn,
          history: [{ _id: data.withdraw._id, ...data.withdraw }, ...(prev?.history || [])],
        }))
        return { success: true, ...data.withdraw }
      } else {
        return { error: data.error || 'Withdraw request failed' }
      }
    } catch {
      return { error: 'Failed to submit withdraw request' }
    } finally {
      setWithdrawSubmitting(false)
    }
  }, [user])

  if (authLoading && !user) {
    return (
      <div className="container">
        <div className="loading-screen">
          <div className="loader-ring" />
          Loading...
        </div>
      </div>
    )
  }

  if (user?.isAdmin) {
    return <AdminDashboard user={user} onSignOut={handleSignOut} />
  }

  return (
    <div className="container">
      <header>
        <div className="header-top">
          <div>
            <h1><span className="loader-ring-inline" /> RELAX MEDIA EARN PROMOTION / From youtube</h1>
            <p>Watch time is only counted during normal playback. Skipping / scrubbing forward pauses counting.</p>
          </div>
          <div className="user-info">
            {user ? (
              <>
                <span className="user-email">{user.fullName || user.email}</span>
                <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <button className="login-btn" onClick={() => setShowSignIn(true)}>
                Login to Start Earning
              </button>
            )}
          </div>
        </div>
        {user && (
          <p className="unwatched-count">
            {unwatchedCount > 0
              ? `${unwatchedCount} unwatched video${unwatchedCount !== 1 ? 's' : ''} remaining — keep watching to earn!`
              : 'You watched everything! Come back later for new videos.'}
          </p>
        )}
      </header>

      {successMsg && <div className="toast-success">{successMsg}</div>}
      {welcomeMsg && <div className="toast-info">{welcomeMsg}</div>}

      <div className="main-layout">
        <div className="player-col">
          <VideoPlayer
            isPlaylist={hook.isPlaylist}
            currentVideo={hook.currentVideo}
            playlistLength={hook.playlistLength}
            onNext={hook.nextVideo}
            onPrev={hook.prevVideo}
          />
          <ActivityLog logs={hook.logs} />
        </div>
        <div className="side-col">
          <StatsPanel
            duration={hook.duration}
            totalWatched={hook.totalWatched}
            totalSkipped={hook.totalSkipped}
            skipCount={hook.skipCount}
            status={hook.status}
            isPlaylist={hook.isPlaylist}
            currentVideo={hook.currentVideo}
            playlistLength={hook.playlistLength}
            onShowPromo={() => setShowPromo(true)}
            onWithdraw={() => setShowWithdraw(true)}
            user={user}
            earned={earned}
            withdrawInfo={withdrawInfo}
          />
          <PlaylistSidebar
            videos={hook.playlistVideos}
            currentIndex={hook.currentVideo.index}
            onJumpTo={hook.jumpToVideo}
            watchedMap={watchedMap}
            currentVideoId={hook.currentVideo.id}
          />
        </div>
      </div>

      {showSignIn && !pendingVerification && (
        <SignIn onSignIn={handleSignIn} onSignUp={handleSignUp} loading={authLoading} error={authError} onClose={() => setShowSignIn(false)} />
      )}

      {pendingVerification && (
        <VerifyEmail
          email={pendingVerification}
          onVerified={(data) => {
            setAuthUser(data)
            completeVerification()
            setShowSignIn(false)
            setSuccessMsg('Successfully logged in!')
            setTimeout(() => setSuccessMsg(''), 3000)
          }}
          onCancel={() => completeVerification()}
        />
      )}

      {showWithdraw && (
        <WithdrawModal
          earned={earned}
          available={withdrawInfo?.available ?? earned}
          onWithdraw={handleWithdraw}
          onClose={() => setShowWithdraw(false)}
          submitting={withdrawSubmitting}
        />
      )}

      {showPromo && (
        <Promotions totalWatched={hook.totalWatched} onClose={() => setShowPromo(false)} />
      )}

      <footer className="app-footer">
        Powered by RELAX MEDIA, 2026 Rwanda = Nayituriki Adolphe &nbsp;|&nbsp; Contact us: <a href="mailto:www.nayituriki.com@gmail.com">www.nayituriki.com@gmail.com</a>
      </footer>
    </div>
  )
}
