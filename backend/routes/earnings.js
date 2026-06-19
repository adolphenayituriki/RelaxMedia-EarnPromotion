import { Router } from 'express'
import User from '../models/User.js'
import { getTier } from '../shared.js'

const router = Router()

/**
 * @openapi
 * /api/earnings/{userId}:
 *   get:
 *     tags: [Earnings]
 *     summary: Get user's total earnings
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Earnings data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSeconds:
 *                   type: number
 *                 hours:
 *                   type: number
 *                 tier:
 *                   type: string
 *                 earned:
 *                   type: number
 */
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).lean()
    const totalSeconds = user?.totalWatched || 0
    const hours = totalSeconds / 3600
    const tier = getTier(hours)
    const earned = hours * tier.rate
    res.json({ totalSeconds, hours, tier: tier.label, earned })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/earnings:
 *   put:
 *     tags: [Earnings]
 *     summary: Update user's cumulative watch time
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               totalSeconds:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/', async (req, res) => {
  try {
    const { userId, totalSeconds } = req.body
    if (!userId || totalSeconds == null) return res.status(400).json({ error: 'userId and totalSeconds required' })
    await User.findOneAndUpdate({ userId }, { $max: { totalWatched: totalSeconds } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
