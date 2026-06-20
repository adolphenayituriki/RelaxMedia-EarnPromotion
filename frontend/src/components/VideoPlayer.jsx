import { useRef, useEffect } from 'react'

function parseDuration(v) {
  if (!v) return 0
  if (typeof v === 'number') return v
  const parts = v.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

function fmt(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function VideoPlayer({ isPlaylist, currentVideo, playlistLength, onNext, onPrev, onYtWatched }) {
  const focusRef = useRef(false)
  const videoId = currentVideo?.id
  const ytUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''

  useEffect(() => {
    focusRef.current = false
  }, [videoId])

  const handleYtClick = () => {
    if (!videoId) return
    focusRef.current = true
    window.open(ytUrl, '_blank')
    const start = Date.now()
    const onFocus = () => {
      if (focusRef.current) {
        const elapsed = (Date.now() - start) / 1000
        focusRef.current = false
        window.removeEventListener('focus', onFocus)
        const videoDuration = parseDuration(currentVideo.duration)
        const minRequired = videoDuration > 0 ? videoDuration * 0.3 : 30
        if (elapsed >= minRequired) {
          const credit = Math.min(elapsed, videoDuration || 60)
          onYtWatched?.(videoId, credit)
        }
      }
    }
    window.addEventListener('focus', onFocus)
  }

  return (
    <div className="player-section">
      <div className="yt-card">
        {videoId ? (
          <img className="yt-card-thumb" src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="" />
        ) : (
          <div className="yt-card-thumb yt-card-thumb-placeholder" />
        )}
        <div className="yt-card-body">
          <h3 className="yt-card-title">{currentVideo.title || 'No video loaded'}</h3>
          {parseDuration(currentVideo.duration) > 0 && (
            <span className="yt-card-duration">{fmt(parseDuration(currentVideo.duration))}</span>
          )}
          <button className="yt-card-btn" onClick={handleYtClick} disabled={!videoId}>
            <span className="yt-card-btn-icon">▶</span>
            <span>Watch on YouTube</span>
          </button>
          <p className="yt-card-hint">Stay on YouTube for a while, then come back to get credited</p>
        </div>
      </div>

      {isPlaylist && (
        <div className="playlist-info">
          <span className="playlist-counter">
            Video {currentVideo.index + 1} of {playlistLength}
          </span>
          <div className="playlist-nav">
            <button onClick={onPrev} disabled={currentVideo.index <= 0}>◀ Prev</button>
            <button onClick={onNext} disabled={currentVideo.index >= playlistLength - 1}>Next ▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
