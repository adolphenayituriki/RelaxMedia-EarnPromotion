export default function PlaylistSidebar({ videos, currentIndex, onJumpTo, watchedMap, onMarkWatched, currentVideoId }) {
  if (!videos || videos.length === 0) {
    return (
      <div className="sidebar">
        <h3>Playlist</h3>
        <p className="sidebar-empty">Loading videos...</p>
      </div>
    )
  }

  const handleClick = (v, i) => {
    if (watchedMap[v.id]) return
    onJumpTo(i)
  }

  return (
    <div className="sidebar">
      <h3>Playlist ({videos.length} videos)</h3>
      <div className="sidebar-list">
        {videos.map((v, i) => {
          const isWatched = !!watchedMap[v.id]
          return (
            <div
              key={v.id}
              className={`sidebar-item ${i === currentIndex ? 'active' : ''} ${isWatched ? 'watched' : ''}`}
              onClick={() => handleClick(v, i)}
            >
              <img
                src={v.thumbnail || `https://img.youtube.com/vi/${v.id}/default.jpg`}
                alt={v.title}
                className="sidebar-thumb"
                loading="lazy"
              />
              <div className="sidebar-meta">
                <span className="sidebar-title">{v.title}</span>
                <span className="sidebar-index">
                  {isWatched ? '✓ Watched' : `#${i + 1}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
