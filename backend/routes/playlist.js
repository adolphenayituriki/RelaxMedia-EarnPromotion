import { Router } from 'express'

const router = Router()

/**
 * @openapi
 * /api/playlist/{id}:
 *   get:
 *     tags: [Playlist]
 *     summary: Scrape YouTube playlist by ID
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
 *                         type: string
 */
router.get('/:id', async (req, res) => {
  try {
    const r = await fetch(`https://www.youtube.com/playlist?list=${req.params.id}`)
    const html = await r.text()
    const match = html.match(/window\.ytInitialData\s*=\s*({.+?});\s*<\/script>/)
    if (!match) return res.status(500).json({ error: 'Could not parse playlist data' })

    const data = JSON.parse(match[1])
    const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents

    if (!contents) return res.status(500).json({ error: 'Unexpected playlist structure' })

    const videos = contents.map((c) => {
      const v = c.playlistVideoRenderer || {}
      return {
        id: v.videoId || '',
        title: v.title?.runs?.[0]?.text || 'Unknown',
        thumbnail: v.thumbnail?.thumbnails?.[0]?.url || '',
        duration: v.lengthSeconds || v.lengthText?.simpleText || '',
      }
    }).filter(v => v.id)

    res.json({ playlistId: req.params.id, total: videos.length, videos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
