export default function VideoPlayer({ isPlaylist, currentVideo, playlistLength, onNext, onPrev }) {
  const ytUrl = currentVideo?.id ? `https://www.youtube.com/watch?v=${currentVideo.id}` : null

  return (
    <div className="player-section">
      <div id="youtube-player" className="player" />
      <a className="yt-watch-btn" href={ytUrl} target="_blank" rel="noopener noreferrer">
        <span className="yt-watch-btn-icon">▶</span>
        <span>Watch on YouTube</span>
        <span className="yt-watch-btn-sub">(helps our channel grow)</span>
      </a>

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
