import { Router } from 'express'
import Withdraw from '../models/Withdraw.js'
import WatchedVideo from '../models/WatchedVideo.js'
import { getTier, calcWithdrawFee } from '../shared.js'

const router = Router()

/**
 * @openapi
 * /api/withdraw:
 *   post:
 *     tags: [Withdraw]
 *     summary: Submit a withdraw request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, email, amount, phone, fullName]
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 500
 *               phone:
 *                 type: string
 *                 description: Rwanda MTN phone number
 *               fullName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdraw request created
 */
router.post('/', async (req, res) => {
  try {
    const { userId, email, amount, phone, fullName } = req.body
    if (!userId || !email || !amount || !phone || !fullName) {
      return res.status(400).json({ error: 'All fields required' })
    }

    if (amount < 500) {
      return res.status(400).json({ error: 'Minimum withdraw is 500 RFW' })
    }

    const records = await WatchedVideo.find({ userId }).lean()
    const totalSeconds = records.reduce((sum, r) => sum + (r.totalWatched || 0), 0)
    const hours = totalSeconds / 3600
    const tier = getTier(hours)
    const earned = hours * tier.rate

    if (amount > earned) {
      return res.status(400).json({ error: 'Insufficient earnings' })
    }

    const fee = calcWithdrawFee(amount)
    if (fee === null) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const withdraw = await Withdraw.create({ userId, email, amount, fee, netAmount: amount - fee, phone, fullName })
    res.json({ success: true, withdraw })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/withdraw/{userId}:
 *   get:
 *     tags: [Withdraw]
 *     summary: Get withdraw history for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of withdraw requests
 */
router.get('/:userId', async (req, res) => {
  try {
    const records = await Withdraw.find({ userId: req.params.userId })
      .sort({ createdAt: -1 }).lean()
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
