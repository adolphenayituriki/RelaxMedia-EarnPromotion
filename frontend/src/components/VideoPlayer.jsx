import { useEffect, useRef } from 'react'

export default function VideoPlayer({ isPlaylist, currentVideo, playlistLength, onNext, onPrev, ytConfirmMap, onYtConfirm }) {
  const focusRef = useRef(false)
  const videoId = currentVideo?.id
  const confirmed = ytConfirmMap[videoId]

  useEffect(() => {
    focusRef.current = false
  }, [videoId])

  const handleYtClick = () => {
    if (!videoId) return
    focusRef.current = true
    const url = `https://www.youtube.com/watch?v=${videoId}`
    window.open(url, '_blank')
    const onFocus = () => {
      if (focusRef.current) {
        onYtConfirm(videoId)
        focusRef.current = false
        window.removeEventListener('focus', onFocus)
      }
    }
    window.addEventListener('focus', onFocus)
  }

  return (
    <div className="player-section">
      <div id="youtube-player" className="player" />
      {videoId && !confirmed && (
        <div className="yt-overlay">
          <div className="yt-overlay-card">
            <img className="yt-overlay-thumb" src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="" />
            <div className="yt-overlay-info">
              <h3 className="yt-overlay-title">{currentVideo.title}</h3>
              <p className="yt-overlay-note">Watch on YouTube first to help our channel, then come back to earn RFW</p>
              <button className="yt-overlay-btn" onClick={handleYtClick}>
                <span className="yt-overlay-btn-icon">▶</span>
                Watch on YouTube
              </button>
            </div>
          </div>
        </div>
      )}

      {isPlaylist && (
        <div className="playlist-info">
          <span className="playlist-counter">
            Video {currentVideo.index + 1} of {playlistLength}
          </span>
          <span className="playlist-title">{currentVideo.title}</span>
          <div className="playlist-nav">
            <button onClick={onPrev} disabled={currentVideo.index <= 0}>◀ Prev</button>
            <button onClick={onNext} disabled={currentVideo.index >= playlistLength - 1}>Next ▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
