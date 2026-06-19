import { Router } from 'express'
import RewardClaim from '../models/RewardClaim.js'

const router = Router()

/**
 * @openapi
 * /api/reward/status/{videoId}:
 *   get:
 *     tags: [Reward]
 *     summary: Check if reward is already claimed for a video
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim status
 */
router.get('/status/:videoId', async (req, res) => {
  try {
    const claim = await RewardClaim.findOne({ videoId: req.params.videoId }).lean()
    res.json({ claimed: !!claim, claimedBy: claim?.userId || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/reward/claim:
 *   post:
 *     tags: [Reward]
 *     summary: Claim first-to-like reward for a video
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               videoId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim result
 */
router.post('/claim', async (req, res) => {
  try {
    const { videoId, userId } = req.body
    const existing = await RewardClaim.findOne({ videoId })
    if (existing) {
      return res.json({ success: false, message: 'Reward already claimed by someone else.' })
    }
    await RewardClaim.create({ videoId, userId })
    res.json({ success: true, reward: 2.5, message: 'First to like & subscribe! +2.5 RFW!' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
