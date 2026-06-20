import { useState, useRef, useCallback } from 'react'

export default function useYouTubePlayer() {
  const [status, setStatus] = useState('YouTube')
  const [duration, setDuration] = useState(0)
  const [totalWatched, setTotalWatched] = useState(0)
  const [totalSkipped] = useState(0)
  const [skipCount] = useState(0)
  const [logs, setLogs] = useState([])
  const [currentVideo, setCurrentVideo] = useState({ index: 0, title: '', id: '', duration: 0 })
  const [playlistLength, setPlaylistLength] = useState(0)
  const [isPlaylist, setIsPlaylist] = useState(false)
  const [playlistVideos, setPlaylistVideos] = useState([])
  const [lastEndedVideoId] = useState('')

  const baseWatchedRef = useRef(0)
  const watchedRef = useRef(0)
  const logsRef = useRef([])

  const addLog = useCallback((msg) => {
    const t = `[${new Date().toLocaleTimeString()}] ${msg}`
    logsRef.current = [t, ...logsRef.current].slice(0, 100)
    setLogs([...logsRef.current])
  }, [])

  const loadVideo = useCallback((videoId, title, duration) => {
    setCurrentVideo(prev => ({ ...prev, id: videoId, title: title || prev.title, duration: duration || 0 }))
    if (duration) setDuration(duration)
    setIsPlaylist(false)
    setStatus('YouTube')
  }, [setDuration])

  const loadPlaylist = useCallback((playlistId, videos) => {
    setIsPlaylist(true)
    if (videos && videos.length > 0) {
      setPlaylistVideos(videos)
      setPlaylistLength(videos.length)
      setCurrentVideo({ index: 0, title: videos[0].title || '', id: videos[0].id || '' })
    }
    setStatus('YouTube')
    addLog(`Playlist loaded: ${playlistId} (${videos?.length || 0} videos)`)
  }, [addLog])

  const nextVideo = useCallback(() => {
    setCurrentVideo(prev => {
      const nextIdx = prev.index + 1
      if (nextIdx < playlistVideos.length) {
        const v = playlistVideos[nextIdx]
        return { index: nextIdx, title: v.title || '', id: v.id || '' }
      }
      return prev
    })
  }, [playlistVideos])

  const prevVideo = useCallback(() => {
    setCurrentVideo(prev => {
      const prevIdx = prev.index - 1
      if (prevIdx >= 0) {
        const v = playlistVideos[prevIdx]
        return { index: prevIdx, title: v.title || '', id: v.id || '' }
      }
      return prev
    })
  }, [playlistVideos])

  const jumpToVideo = useCallback((index) => {
    if (index >= 0 && index < playlistVideos.length) {
      const v = playlistVideos[index]
      setCurrentVideo({ index, title: v.title || '', id: v.id || '' })
    }
  }, [playlistVideos])

  const clearEndedFlag = useCallback(() => {}, [])

  const restoreWatched = useCallback((seconds) => {
    baseWatchedRef.current = seconds
    setTotalWatched(seconds + watchedRef.current)
    addLog(`Restored ${seconds}s from previous sessions`)
  }, [addLog])

  const getCumulativeTotal = useCallback(() => {
    return baseWatchedRef.current + watchedRef.current
  }, [])

  const addWatchTime = useCallback((seconds) => {
    if (seconds > 0) {
      watchedRef.current += seconds
      setTotalWatched(baseWatchedRef.current + watchedRef.current)
      addLog(`Credited ${seconds}s for YouTube watch`)
    }
  }, [addLog])

  const resetState = useCallback(() => {
    watchedRef.current = 0
    logsRef.current = []
    baseWatchedRef.current = 0
    setTotalWatched(0)
    setLogs([])
    setDuration(0)
    setStatus('YouTube')
    setCurrentVideo({ index: 0, title: '', id: '' })
    setPlaylistLength(0)
    setIsPlaylist(false)
    setPlaylistVideos([])
  }, [])

  return {
    loadVideo,
    loadPlaylist,
    nextVideo,
    prevVideo,
    jumpToVideo,
    clearEndedFlag,
    restoreWatched,
    getCumulativeTotal,
    addWatchTime,
    resetState,
    status,
    duration,
    totalWatched,
    totalSkipped,
    skipCount,
    logs,
    currentVideo,
    playlistLength,
    isPlaylist,
    playlistVideos,
    setPlaylistVideos,
    setDuration,
    lastEndedVideoId,
  }
}
