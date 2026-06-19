const TIERS = [
  { minHours: 0, rate: 65, label: 'Starter' },
  { minHours: 5, rate: 80, label: 'Bronze' },
  { minHours: 12, rate: 100, label: 'Silver' },
]
const MAX_TIER = TIERS[TIERS.length - 1]

function getTier(hours) {
  let t = TIERS[0]
  for (const tier of TIERS) {
    if (hours >= tier.minHours) t = tier
  }
  return t
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtHours(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function StatsPanel({ duration, totalWatched, totalSkipped, skipCount, status, isPlaylist, currentVideo, playlistLength, onShowPromo, onWithdraw, user, earned }) {
  const dur = duration || 1
  const watchedHours = totalWatched / 3600
  const tier = getTier(watchedHours)
  const watchedPct = Math.min((totalWatched / dur) * 100, 100)
  const skippedPct = Math.min((totalSkipped / dur) * 100, 100)
  const nextTier = TIERS.find(t => t.minHours > tier.minHours)

  return (
    <div className="stats-section">
      <h2>Watch Statistics</h2>

      <div className="earnings-box">
        <span className="earnings-label">EARNED</span>
        <span className="earnings-amount">{earned.toFixed(2)}</span>
        <span className="earnings-unit">RFW</span>
        <div className="earnings-tier-row">
          <span className={`earnings-tier-badge ${tier.label.toLowerCase()}`}>{tier.label}</span>
          <span className="earnings-rate">{tier.rate} RFW/h</span>
        </div>
        {nextTier && (
          <span className="earnings-next">
            {fmtHours((nextTier.minHours - watchedHours) * 3600)} to reach {nextTier.label} ({nextTier.rate} RFW/h)
          </span>
        )}
      </div>

      {isPlaylist && (
        <>
          <div className="stat playlist-stat">
            <span className="label">Playlist progress:</span>
            <span>Video {currentVideo.index + 1} / {playlistLength}</span>
          </div>
          {currentVideo.title && (
            <div className="stat playlist-stat">
              <span className="label">Now playing:</span>
              <span className="video-title">{currentVideo.title}</span>
            </div>
          )}
        </>
      )}

      <div className="stat">
        <span className="label">Video Duration:</span>
        <span>{fmt(duration) + " /hrs"}</span>
      </div>
      <div className="stat">
        <span className="label">Watched (legit):</span>
        <span>{fmt(totalWatched)}</span>
      </div>
      <div className="stat">
        <span className="label">Skipped time:</span>
        <span>{fmt(totalSkipped)}</span>
      </div>
      <div className="stat">
        <span className="label">Player status:</span>
        <span>{status}</span>
      </div>
      <div className="stat">
        <span className="label">Skip count:</span>
        <span>{skipCount}</span>
      </div>
      <button className="promo-btn" onClick={onShowPromo}>View Promotions</button>
      <button className="withdraw-btn" onClick={() => {
        if (!user) { alert('Please sign in first to withdraw your earnings.') }
        else if (earned < 500) { alert(`Minimum withdraw is 500 RFW. You need ${(500 - earned).toFixed(2)} more RFW.`) }
        else { onWithdraw() }
      }}>
        Withdraw ({earned.toFixed(2)} RFW)
      </button>

      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill watched" style={{ width: watchedPct + '%' }} />
          <div className="progress-fill skipped" style={{ width: skippedPct + '%' }} />
        </div>
        <div className="progress-labels">
          <span>Watched ({fmt(totalWatched)})</span>
          <span>Skipped ({fmt(totalSkipped)})</span>
        </div>
      </div>
    </div>
  )
}
