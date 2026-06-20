import { Router } from 'express'
import WatchedVideo from '../models/WatchedVideo.js'
import User from '../models/User.js'
import { calcEarnings } from '../shared.js'

const router = Router()

/**
 * @openapi
 * /api/watched/{userId}:
 *   get:
 *     tags: [Watch]
 *     summary: Get all watched videos for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Map of videoId -> watch data
 */
router.get('/:userId', async (req, res) => {
  try {
    const records = await WatchedVideo.find({ userId: req.params.userId }).lean()
    const watchedMap = {}
    for (const r of records) {
      watchedMap[r.videoId] = { totalWatched: r.totalWatched, fullyWatched: r.fullyWatched }
    }
    res.json(watchedMap)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/watched:
 *   post:
 *     tags: [Watch]
 *     summary: Save watched progress for a video
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               videoId:
 *                 type: string
 *               totalWatched:
 *                 type: number
 *               fullyWatched:
 *                 type: boolean
 *               cumulativeTotal:
 *                 type: number
 *     responses:
 *       200:
 *         description: Saved
 */
router.post('/', async (req, res) => {
  try {
    const { userId, videoId, totalWatched, fullyWatched, cumulativeTotal } = req.body
    if (!userId || !videoId) return res.status(400).json({ error: 'userId and videoId required' })

    await WatchedVideo.findOneAndUpdate(
      { userId, videoId },
      {
        $set: { fullyWatched: !!fullyWatched },
        $max: { totalWatched },
        $setOnInsert: { watchedAt: new Date() },
      },
      { upsert: true },
    )

    if (cumulativeTotal != null) {
      await User.findOneAndUpdate({ userId }, { $max: { totalWatched: cumulativeTotal } })
      const user = await User.findOne({ userId })
      if (user) {
        const earned = calcEarnings(user.totalWatched)
        await User.findOneAndUpdate({ userId }, { $set: { earned } })
      }
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
