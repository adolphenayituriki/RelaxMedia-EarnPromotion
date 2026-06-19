import { Router } from 'express'
import User from '../models/User.js'
import Withdraw from '../models/Withdraw.js'
import { getTier, calcWithdrawFee } from '../shared.js'

const router = Router()

function calcEarnings(totalSeconds) {
  return (totalSeconds / 3600) * getTier(totalSeconds / 3600).rate
}

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

    const user = await User.findOne({ userId }).lean()
    if (!user) return res.status(400).json({ error: 'User not found' })

    const totalSeconds = user.totalWatched || 0
    const earned = calcEarnings(totalSeconds)
    const totalWithdrawn = await Withdraw.aggregate([
      { $match: { userId, status: 'processed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const withdrawnSoFar = totalWithdrawn[0]?.total || 0
    const available = earned - withdrawnSoFar

    if (amount > available) {
      return res.status(400).json({ error: `Insufficient available earnings. You have ${available.toFixed(2)} RFW available.` })
    }

    const fee = calcWithdrawFee(amount)
    if (fee === null) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const withdraw = await Withdraw.create({ userId, email, amount, fee, netAmount: amount - fee, phone, fullName })
    res.json({ success: true, withdraw, available, earned, totalWithdrawn: withdrawnSoFar })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/withdraw/earnings-info/{userId}:
 *   get:
 *     tags: [Withdraw]
 *     summary: Get earnings info and withdraw history for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Earnings info with history
 */
router.get('/earnings-info/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).lean()
    if (!user) return res.json({ earned: 0, totalWithdrawn: 0, available: 0, history: [] })

    const totalSeconds = user.totalWatched || 0
    const earned = calcEarnings(totalSeconds)
    const totalWithdrawn = await Withdraw.aggregate([
      { $match: { userId: req.params.userId, status: 'processed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const withdrawnSoFar = totalWithdrawn[0]?.total || 0
    const history = await Withdraw.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean()

    res.json({ earned, totalWithdrawn: withdrawnSoFar, available: earned - withdrawnSoFar, history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
