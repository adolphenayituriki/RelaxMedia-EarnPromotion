export default function VideoPlayer({ isPlaylist, currentVideo, playlistLength, onNext, onPrev }) {
  return (
    <div className="player-section">
      <div id="youtube-player" className="player" />

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
