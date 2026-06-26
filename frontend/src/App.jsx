import { useEffect, useRef, useState, useCallback } from 'react'
import VideoPlayer from './components/VideoPlayer.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import PlaylistSidebar from './components/PlaylistSidebar.jsx'
import Promotions from './components/Promotions.jsx'
import SignIn from './components/SignIn.jsx'
import VerifyEmail from './components/VerifyEmail.jsx'
import WithdrawModal from './components/WithdrawModal.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import useYouTubePlayer from './hooks/useYouTubePlayer.js'
import useAuth from './hooks/useAuth.js'
import './App.css'

const PLAYLIST_ID = 'PLIg7BzY08KX3LXB6_u7XoLuO5rijKVcoz'

export default function App() {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut, setAuthUser, pendingVerification, completeVerification } = useAuth()
  const hook = useYouTubePlayer()
  const [showPromo, setShowPromo] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [welcomeMsg, setWelcomeMsg] = useState('')
  const [watchedMap, setWatchedMap] = useState({})
  const [videos, setVideos] = useState([])

  useEffect(() => {
    fetch(`/api/playlist/${PLAYLIST_ID}`)
      .then(r => r.json())
      .then(data => {
        const videos = data.videos || []
        setVideos(videos)
        hook.setPlaylistVideos(videos)
        hook.loadPlaylist(PLAYLIST_ID, videos)
      })
      .catch(() => {})
  }, [hook.setPlaylistVideos, hook.loadPlaylist])

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

  const markWatched = useCallback(async (videoId, duration) => {
    if (!user) return
    const cumulativeTotal = hook.getCumulativeTotal()
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.userId, videoId, totalWatched: duration, fullyWatched: true, cumulativeTotal }),
    })
    setWatchedMap(prev => ({ ...prev, [videoId]: { totalWatched: duration, fullyWatched: true } }))
  }, [user, hook.getCumulativeTotal])

  const handleYtWatched = useCallback((videoId, seconds) => {
    if (!watchedMap[videoId] && seconds >= 10) {
      hook.addWatchTime(seconds)
      markWatched(videoId, seconds)
      hook.setDuration(seconds)
    }
  }, [watchedMap, hook.addWatchTime, markWatched, hook.setDuration])

  const unwatchedCount = videos.filter(v => !watchedMap[v.id]).length

  const TIERS = [
    { minHours: 0, rate: 100, label: 'Starter' },
    { minHours: 5, rate: 100, label: 'Bronze' },
    { minHours: 12, rate: 100, label: 'Silver' },
  ]
  const watchedHours = hook.totalWatched / 3600
  let currentTier = TIERS[0]
  for (const t of TIERS) {
    if (watchedHours >= t.minHours) currentTier = t
  }
  const earned = watchedHours * currentTier.rate

  useEffect(() => {
    if (!user) return
    const handleBeforeUnload = () => {
      const total = hook.getCumulativeTotal()
      if (total > 0) {
        navigator.sendBeacon('/api/earnings', new Blob([JSON.stringify({ userId: user.userId, totalSeconds: total })], { type: 'application/json' }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user, hook.getCumulativeTotal])

  // Periodic auto-save every 30 seconds during watch sessions
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      const total = hook.getCumulativeTotal()
      if (total > 0) {
        try {
          await fetch('/api/earnings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.userId, totalSeconds: total }),
          })
        } catch {}
      }
    }, 30000)
    return () => clearInterval(interval)
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
      navigator.sendBeacon('/api/earnings', new Blob([JSON.stringify({ userId: user.userId, totalSeconds: total })], { type: 'application/json' }))
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
          <div className="header-title-row">
            <button className="refresh-btn" onClick={() => window.location.reload()} title="Refresh page">↻</button>
            <h1><span className="loader-ring-inline" /> RELAX MEDIA EARN PROMOTION / From youtube</h1>
          </div>
          <p className="header-note">Watch each video on YouTube, then return to this tab to earn RFW automatically.</p>
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
        {user && videos.length > 0 && (
          <p className="unwatched-count">
            {unwatchedCount > 0
              ? `${unwatchedCount} unwatched video${unwatchedCount !== 1 ? 's' : ''} remaining — keep watching to earn!`
              : videos.length > 0 && 'You watched everything! Come back later for new videos.'}
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
            onYtWatched={handleYtWatched}
          />
          <a className="youtube-channel-link" href="https://www.youtube.com/@Kiliziya-vibes" target="_blank" rel="noopener noreferrer">
            <span className="youtube-channel-icon">▶</span>
            <span>Visit our YouTube Channel: <strong>@Kiliziya-vibes</strong></span>
          </a>
          <div className="how-it-works">
            <div className="how-it-works-title">How to Earn</div>
            <div className="how-it-works-step"><span className="how-step-num">1</span>Click <strong>Watch on YouTube</strong> &mdash; video opens on YouTube in a new tab</div>
            <div className="how-it-works-step"><span className="how-step-num">2</span>Watch the video on YouTube &mdash; every minute you're away counts</div>
            <div className="how-it-works-step"><span className="how-step-num">3</span>Come back to this tab &mdash; your time away is credited automatically</div>
            <div className="how-it-works-step"><span className="how-step-num">4</span>Watch all videos in the playlist, then <strong>Withdraw at 500 RFW</strong></div>
            <div className="how-tips">
              <div className="how-tips-title">Important</div>
              <div className="how-tip">✓ Time away = watch credit. Stay on YouTube as long as the video to earn full credit</div>
              <div className="how-tip">✓ Returning too early = less credit. Need at least 30% of the video to earn anything</div>
              <div className="how-tip">✓ Sign up &amp; verify your email first <span className="how-tip-spam">(check spam for OTP)</span></div>
              <div className="how-tip">✓ Track your total watch time &amp; earned RFW in the stats panel</div>
            </div>
          </div>
          <div className="toc-toggle" onClick={() => setShowToc(!showToc)}>
            {showToc ? '▾' : '▸'} Terms &amp; Conditions
          </div>
          {showToc && (
            <div className="toc-content">
              <p><strong>How It Works &amp; Rules</strong></p>
              <ul>
                <li><strong>Sign up</strong> with your email and verify via OTP (check spam folder).</li>
                <li>Each video in the playlist can earn credit <strong>only once</strong> per account.</li>
              </ul>
              <p><strong>Earning Process</strong></p>
              <ul>
                <li>Click <strong>Watch on YouTube</strong> — the video opens on YouTube in a new tab.</li>
                <li>Watch the video on YouTube. Every second you spend there is counted.</li>
                <li>Come back to this tab. Your time away is credited automatically as watch time.</li>
                <li>Credit = real time you were away, capped at the video's duration.</li>
                <li><strong>Minimum:</strong> You must be away for at least 30% of the video length to earn anything. Returning too early = no credit.</li>
                <li>Only the time the YouTube video tab is open counts. Closing YouTube early stops the timer.</li>
              </ul>
              <p><strong>Earnings &amp; Withdrawals</strong></p>
              <ul>
                <li>Watch time converts to RFW tokens based on your tier:
                  <br/>Starter (0+ hrs) = 65 RFW/hr &nbsp;|&nbsp; Bronze (5+ hrs) = 80 RFW/hr &nbsp;|&nbsp; Silver (12+ hrs) = 100 RFW/hr</li>
                <li><strong>Minimum withdrawal:</strong> 500 RFW.</li>
                <li>Withdrawals are reviewed before processing.</li>
              </ul>
              <p><strong>Rules</strong></p>
              <ul>
                <li>No bots, automation, or fake activity. Violation = account ban + forfeited earnings.</li>
                <li>One account per person. Duplicate accounts will be suspended.</li>
                <li>RELAX MEDIA may update these terms at any time. Continued use means acceptance.</li>
                <li>All earning and withdrawal decisions are final.</li>
                <li><strong>Disclaimer:</strong> This site is not affiliated with, endorsed by, or sponsored by YouTube or Google. All video content belongs to their respective creators.</li>
              </ul>
            </div>
          )}
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
            setTimeout(() => window.location.reload(), 1500)
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
