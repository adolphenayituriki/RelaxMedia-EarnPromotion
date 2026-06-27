import { Router } from 'express'

const router = Router()

/**
 * @openapi
 * /api/playlist/{id}:
 *   get:
 *     tags: [Playlist]
 *     summary: Fetch YouTube playlist videos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Playlist with videos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 playlistId:
 *                   type: string
 *                 total:
 *                   type: number
 *                 videos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 *                       duration:
 *                         type: number
 */
router.get('/:id', async (req, res) => {
  try {
    const r = await fetch(
      `https://www.youtube.com/playlist?list=${req.params.id}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }
    )
    if (!r.ok) return res.status(500).json({ error: 'Failed to fetch playlist page' })

    const html = await r.text()

    const videos = []
    const seen = new Set()

    let dataJson = null
    const ytIdx = html.indexOf('ytInitialData')
    if (ytIdx !== -1) {
      const braceIdx = html.indexOf('{', ytIdx)
      if (braceIdx !== -1) {
        let depth = 0
        let end = -1
        for (let i = braceIdx; i < html.length; i++) {
          if (html[i] === '{') depth++
          else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
        }
        if (end !== -1) dataJson = html.slice(braceIdx, end)
      }
    }
    if (dataJson) {
      try {
        const data = JSON.parse(dataJson)
        const items = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents
        if (items && Array.isArray(items)) {
          for (const item of items) {
            const vm = item?.lockupViewModel
            if (!vm) continue
            const id = vm?.contentId
            if (!id || seen.has(id)) continue
            seen.add(id)
            const title = vm?.metadata?.lockupMetadataViewModel?.title?.content || vm?.title || 'Unknown'
            let duration = 0
            try {
              const overlays = vm?.contentImage?.thumbnailViewModel?.overlays
              if (overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges) {
                for (const badge of overlays[0].thumbnailBottomOverlayViewModel.badges) {
                  const text = badge?.thumbnailBadgeViewModel?.text
                  if (text) {
                    const parts = text.split(':').map(Number)
                    if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2]
                    else if (parts.length === 2) duration = parts[0] * 60 + parts[1]
                    else if (parts.length === 1) duration = parts[0]
                    break
                  }
                }
              }
            } catch {}
            videos.push({
              id,
              title,
              thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
              duration,
            })
          }
        }
      } catch {
        // ytInitialData parse failed
      }
    }

    if (videos.length === 0) {
      const fallback = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${req.params.id}`)
      if (fallback.ok) {
        const xml = await fallback.text()
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
        let entryMatch
        while ((entryMatch = entryRegex.exec(xml)) !== null) {
          const block = entryMatch[1]
          const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
          const titleMatch = block.match(/<title>([^<]*)<\/title>/)
          const id = idMatch?.[1] || ''
          if (!id || seen.has(id)) continue
          seen.add(id)
          videos.push({
            id,
            title: titleMatch?.[1] || 'Unknown',
            thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            duration: 0,
          })
        }
      }
    }

    if (videos.length === 0) return res.status(404).json({ error: 'No videos found in playlist' })

    res.json({ playlistId: req.params.id, total: videos.length, videos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
