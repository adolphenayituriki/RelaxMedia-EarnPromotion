import { Router } from 'express'
import { XMLParser } from 'fast-xml-parser'

const router = Router()
const parser = new XMLParser()

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
    const json = parser.parse(xml)
    const entries = json.feed?.entry

    if (!entries) return res.status(500).json({ error: 'No videos found in playlist' })

    const raw = Array.isArray(entries) ? entries : [entries]

    const videos = raw.map((entry) => ({
      id: entry['yt:videoId'] || '',
      title: entry.title || 'Unknown',
      thumbnail: entry['media:group']?.['media:thumbnail']?.['@_url'] || `https://img.youtube.com/vi/${entry['yt:videoId']}/hqdefault.jpg`,
      duration: 0,
    })).filter(v => v.id)

    res.json({ playlistId: req.params.id, total: videos.length, videos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
