import { useState, useRef, useCallback } from 'react'

const SKIP_THRESHOLD = 2
const SAMPLE_INTERVAL = 1000

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function useYouTubePlayer() {
  const [status, setStatus] = useState('Not loaded')
  const [duration, setDuration] = useState(0)
  const [totalWatched, setTotalWatched] = useState(0)
  const [totalSkipped, setTotalSkipped] = useState(0)
  const [skipCount, setSkipCount] = useState(0)
  const [logs, setLogs] = useState([])
  const [currentVideo, setCurrentVideo] = useState({ index: 0, title: '', id: '' })
  const [playlistLength, setPlaylistLength] = useState(0)
  const [isPlaylist, setIsPlaylist] = useState(false)
  const [playlistVideos, setPlaylistVideos] = useState([])
  const [lastEndedVideoId, setLastEndedVideoId] = useState('')

  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const timerRef = useRef(null)
  const lastTimeRef = useRef(0)
  const lastStateRef = useRef(-1)
  const baseWatchedRef = useRef(0)
  const watchedRef = useRef(0)
  const skippedRef = useRef(0)
  const skipsRef = useRef(0)
  const logsRef = useRef([])
  const watchedSecondsRef = useRef(new Map())
  const currentVideoIdRef = useRef('')
  const lastEndedRef = useRef('')

  const addLog = useCallback((msg) => {
    const t = `[${new Date().toLocaleTimeString()}] ${msg}`
    logsRef.current = [t, ...logsRef.current].slice(0, 100)
    setLogs([...logsRef.current])
  }, [])

  const updateVideoInfo = useCallback(() => {
    const p = playerRef.current
    if (!p || !p.getVideoData) return
    const data = p.getVideoData()
    const idx = p.getPlaylistIndex != null ? p.getPlaylistIndex() : 0
    const len = p.getPlaylist != null ? p.getPlaylist().length : 0
    const vid = data.video_id || ''
    currentVideoIdRef.current = vid
    setCurrentVideo({ index: idx >= 0 ? idx : 0, title: data.title || '', id: vid })
    setPlaylistLength(len)
  }, [])

  function countUniqueSeconds(videoId, from, to) {
    if (!watchedSecondsRef.current.has(videoId)) {
      watchedSecondsRef.current.set(videoId, new Set())
    }
    const set = watchedSecondsRef.current.get(videoId)
    const start = Math.max(0, Math.floor(from))
    const end = Math.floor(to)
    let newCount = 0
    for (let s = start; s < end; s++) {
      if (!set.has(s)) {
        set.add(s)
        newCount++
      }
    }
    return newCount
  }

  const sample = useCallback(() => {
    const p = playerRef.current
    if (!p || !readyRef.current) return

    const state = p.getPlayerState()
    const now = p.getCurrentTime()

    if (state === YT.PlayerState.PLAYING && lastStateRef.current === YT.PlayerState.PLAYING) {
      const delta = now - lastTimeRef.current
      const vid = currentVideoIdRef.current

      if (delta >= 0 && delta <= SKIP_THRESHOLD + 0.5) {
        const unique = countUniqueSeconds(vid, lastTimeRef.current, now)
        watchedRef.current += unique
      } else if (delta > SKIP_THRESHOLD + 0.5) {
        const end = lastTimeRef.current + SKIP_THRESHOLD + 0.5
        const unique = countUniqueSeconds(vid, lastTimeRef.current, end)
        const skip = delta - (SKIP_THRESHOLD + 0.5)
        watchedRef.current += unique
        skippedRef.current += skip
        skipsRef.current++
        addLog(`Skip detected! Jumped ~${delta.toFixed(1)}s (${unique} new unique seconds, ${skip.toFixed(1)}s skipped)`)
      }

      setTotalWatched(baseWatchedRef.current + watchedRef.current)
      setTotalSkipped(skippedRef.current)
      setSkipCount(skipsRef.current)
    }

    lastTimeRef.current = now
    lastStateRef.current = state
  }, [addLog])

  const stopSampling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const resetState = useCallback(() => {
    stopSampling()
    watchedRef.current = 0
    skippedRef.current = 0
    skipsRef.current = 0
    lastTimeRef.current = 0
    lastStateRef.current = -1
    logsRef.current = []
    readyRef.current = false
    setTotalWatched(baseWatchedRef.current)
    setTotalSkipped(0)
    setSkipCount(0)
    setLogs([])
    setDuration(0)
    setStatus('Not loaded')
    setCurrentVideo({ index: 0, title: '', id: '' })
    setPlaylistLength(0)
    setIsPlaylist(false)
    setPlaylistVideos([])
    setLastEndedVideoId('')
  }, [stopSampling])

  const loadVideo = useCallback((videoId) => {
    resetState()

    const existing = playerRef.current
    if (existing && existing.destroy) {
      existing.destroy()
      playerRef.current = null
    }

    setStatus('Loading...')

    const onReady = () => {
      const p = playerRef.current
      if (!p) return
      readyRef.current = true
      setDuration(p.getDuration())
      setStatus('Ready')
      updateVideoInfo()
      addLog(`Loaded: ${p.getVideoData().title} (${fmt(p.getDuration())})`)
    }

    const onStateChange = (e) => {
      const s = e.data
      const names = {
        [-1]: 'Unstarted',
        [YT.PlayerState.ENDED]: 'Ended',
        [YT.PlayerState.PLAYING]: 'Playing',
        [YT.PlayerState.PAUSED]: 'Paused',
        [YT.PlayerState.BUFFERING]: 'Buffering',
        [YT.PlayerState.CUED]: 'Cued',
      }
      setStatus(names[s] || String(s))

      if (s === YT.PlayerState.CUED || s === YT.PlayerState.PLAYING) {
        updateVideoInfo()
        if (s === YT.PlayerState.CUED) {
          setDuration(playerRef.current.getDuration())
          addLog(`Now playing: ${playerRef.current.getVideoData().title}`)
        }
      }

      if (s === YT.PlayerState.PLAYING) {
        lastTimeRef.current = playerRef.current.getCurrentTime()
        lastStateRef.current = YT.PlayerState.PLAYING
        if (!timerRef.current) {
          timerRef.current = setInterval(sample, SAMPLE_INTERVAL)
        }
      } else if (s === YT.PlayerState.PAUSED || s === YT.PlayerState.ENDED) {
        lastStateRef.current = s
        if (s === YT.PlayerState.ENDED) {
          stopSampling()
          const vid = currentVideoIdRef.current
          if (vid && vid !== lastEndedRef.current) {
            lastEndedRef.current = vid
            setLastEndedVideoId(vid)
            addLog(`Video finished: ${vid}`)
          }
        }
      }
    }

    playerRef.current = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: { rel: 0, modestbranding: 1 },
      events: { onReady, onStateChange },
    })
  }, [resetState, sample, addLog, updateVideoInfo])

  const loadPlaylist = useCallback((playlistId) => {
    resetState()

    const existing = playerRef.current
    if (existing && existing.destroy) {
      existing.destroy()
      playerRef.current = null
    }

    setIsPlaylist(true)
    setStatus('Loading playlist...')

    const onReady = () => {
      const p = playerRef.current
      if (!p) return
      readyRef.current = true
      setDuration(p.getDuration())
      setStatus('Ready')
      updateVideoInfo()
      addLog(`Playlist loaded: ${playlistId} (${p.getPlaylist().length} videos)`)
    }

    const onStateChange = (e) => {
      const s = e.data
      const names = {
        [-1]: 'Unstarted',
        [YT.PlayerState.ENDED]: 'Ended',
        [YT.PlayerState.PLAYING]: 'Playing',
        [YT.PlayerState.PAUSED]: 'Paused',
        [YT.PlayerState.BUFFERING]: 'Buffering',
        [YT.PlayerState.CUED]: 'Cued',
      }
      setStatus(names[s] || String(s))

      if (s === YT.PlayerState.CUED || s === YT.PlayerState.PLAYING) {
        updateVideoInfo()
        if (s === YT.PlayerState.CUED) {
          const p = playerRef.current
          setDuration(p.getDuration())
          addLog(`Now playing (${p.getPlaylistIndex() + 1}/${p.getPlaylist().length}): ${p.getVideoData().title}`)
        }
      }

      if (s === YT.PlayerState.PLAYING) {
        lastTimeRef.current = playerRef.current.getCurrentTime()
        lastStateRef.current = YT.PlayerState.PLAYING
        if (!timerRef.current) {
          timerRef.current = setInterval(sample, SAMPLE_INTERVAL)
        }
      } else if (s === YT.PlayerState.PAUSED || s === YT.PlayerState.ENDED) {
        lastStateRef.current = s
        if (s === YT.PlayerState.ENDED) {
          stopSampling()
          const vid = currentVideoIdRef.current
          if (vid && vid !== lastEndedRef.current) {
            lastEndedRef.current = vid
            setLastEndedVideoId(vid)
            addLog(`Video finished: ${vid}`)
          }
        }
      }
    }

    playerRef.current = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: '',
      playerVars: {
        rel: 0,
        modestbranding: 1,
        listType: 'playlist',
        list: playlistId,
      },
      events: { onReady, onStateChange },
    })
  }, [resetState, sample, addLog, updateVideoInfo])

  const nextVideo = useCallback(() => {
    const p = playerRef.current
    if (p && p.nextVideo) p.nextVideo()
  }, [])

  const prevVideo = useCallback(() => {
    const p = playerRef.current
    if (p && p.previousVideo) p.previousVideo()
  }, [])

  const jumpToVideo = useCallback((index) => {
    const p = playerRef.current
    if (p && p.playVideoAt) p.playVideoAt(index)
  }, [])

  const clearEndedFlag = useCallback(() => {
    setLastEndedVideoId('')
  }, [])

  const restoreWatched = useCallback((seconds) => {
    baseWatchedRef.current = seconds
    setTotalWatched(seconds + watchedRef.current)
    addLog(`Restored ${seconds}s from previous sessions`)
  }, [addLog])

  const getCumulativeTotal = useCallback(() => {
    return baseWatchedRef.current + watchedRef.current
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
    lastEndedVideoId,
  }
}
