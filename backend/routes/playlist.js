import { Router } from 'express'

const router = Router()

/**
 * @openapi
 * /api/playlist/{id}:
 *   get:
 *     tags: [Playlist]
 *     summary: Fetch YouTube playlist videos via RSS feed
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
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${req.params.id}`)
    if (!r.ok) return res.status(500).json({ error: 'Failed to fetch playlist feed' })

    const xml = await r.text()

    const videos = []
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
    let entryMatch

    while ((entryMatch = entryRegex.exec(xml)) !== null) {
      const block = entryMatch[1]
      const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
      const titleMatch = block.match(/<title>([^<]*)<\/title>/)
      const thumbMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/)
      const id = idMatch?.[1] || ''
      if (!id) continue
      videos.push({
        id,
        title: titleMatch?.[1] || 'Unknown',
        thumbnail: thumbMatch?.[1] || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        duration: 0,
      })
    }

    if (videos.length === 0) return res.status(500).json({ error: 'No videos found in playlist' })

    res.json({ playlistId: req.params.id, total: videos.length, videos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
