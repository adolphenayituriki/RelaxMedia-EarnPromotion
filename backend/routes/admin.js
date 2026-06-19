import { Router } from 'express'
import User from '../models/User.js'
import WatchedVideo from '../models/WatchedVideo.js'
import Withdraw from '../models/Withdraw.js'
import { ADMIN_EMAIL, getTier } from '../shared.js'

const router = Router()

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get overall platform statistics
 *     responses:
 *       200:
 *         description: Platform stats
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ email: { $ne: ADMIN_EMAIL } })
    const totalWatched = await WatchedVideo.aggregate([
      { $group: { _id: null, total: { $sum: '$totalWatched' } } },
    ])
    const pendingWithdrawals = await Withdraw.countDocuments({ status: 'pending' })
    const processedWithdrawals = await Withdraw.find({ status: 'processed' }).lean()
    const totalPaid = processedWithdrawals.reduce((s, r) => s + r.amount, 0)
    res.json({ totalUsers, totalSeconds: totalWatched[0]?.total || 0, pendingWithdrawals, totalPaid })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users with earnings
 *     responses:
 *       200:
 *         description: User list
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ email: { $ne: ADMIN_EMAIL } }).sort({ createdAt: -1 }).lean()
    const result = []
    for (const u of users) {
      const watched = await WatchedVideo.find({ userId: u.userId }).lean()
      const totalSeconds = watched.reduce((s, r) => s + (r.totalWatched || 0), 0)
      const hours = totalSeconds / 3600
      const tier = getTier(hours)
      const earned = hours * tier.rate
      const withdrawn = await Withdraw.find({ userId: u.userId, status: 'processed' }).lean()
      const totalWithdrawn = withdrawn.reduce((s, r) => s + r.amount, 0)
      result.push({ email: u.email, userId: u.userId, totalWatched: totalSeconds, earned, totalWithdrawn, createdAt: u.createdAt })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/withdrawals:
 *   get:
 *     tags: [Admin]
 *     summary: Get all withdrawal requests
 *     responses:
 *       200:
 *         description: Withdrawal list
 */
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdraw.find().sort({ createdAt: -1 }).lean()
    res.json(withdrawals)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/withdraw/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Approve or reject a withdrawal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processed, failed]
 *     responses:
 *       200:
 *         description: Updated withdrawal
 */
router.put('/withdraw/:id', async (req, res) => {
  try {
    const { status } = req.body
    if (!['pending', 'processed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const w = await Withdraw.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean()
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' })
    res.json(w)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
