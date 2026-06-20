import { Router } from 'express'
import User from '../models/User.js'
import WatchedVideo from '../models/WatchedVideo.js'
import Withdraw from '../models/Withdraw.js'
import RewardClaim from '../models/RewardClaim.js'
import Comment from '../models/Comment.js'
import { ADMIN_EMAIL, generateUserId, hashPassword } from '../shared.js'

const router = Router()

/* ───── Stats ───── */

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
    const totalWatchAgg = await User.aggregate([
      { $match: { email: { $ne: ADMIN_EMAIL } } },
      { $group: { _id: null, total: { $sum: '$totalWatched' } } },
    ])
    const pendingWithdrawals = await Withdraw.countDocuments({ status: 'pending' })
    const processedWithdrawals = await Withdraw.find({ status: 'processed' }).lean()
    const totalPaid = processedWithdrawals.reduce((s, r) => s + r.amount, 0)
    const totalVideosWatched = await WatchedVideo.countDocuments()
    const totalRewardClaims = await RewardClaim.countDocuments()
    const totalComments = await Comment.countDocuments()
    res.json({
      totalUsers,
      totalSeconds: totalWatchAgg[0]?.total || 0,
      pendingWithdrawals,
      totalPaid,
      totalVideosWatched,
      totalRewardClaims,
      totalComments,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ───── Users CRUD ───── */

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
      const withdrawn = await Withdraw.find({ userId: u.userId, status: 'processed' }).lean()
      const totalWithdrawn = withdrawn.reduce((s, r) => s + r.amount, 0)
      result.push({
        _id: u._id,
        email: u.email,
        userId: u.userId,
        totalWatched: u.totalWatched,
        earned: u.earned ?? 0,
        verified: u.verified,
        totalWithdrawn,
        createdAt: u.createdAt,
      })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a single user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })
    const withdrawn = await Withdraw.find({ userId: user.userId, status: 'processed' }).lean()
    const totalWithdrawn = withdrawn.reduce((s, r) => s + r.amount, 0)
    res.json({ ...user, earned: user.earned ?? 0, totalWithdrawn })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/users:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               totalWatched:
 *                 type: number
 *               verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Created user
 */
router.post('/users', async (req, res) => {
  try {
    const { email, password, totalWatched, verified } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(400).json({ error: 'Email already registered' })
    const user = await User.create({
      email: email.toLowerCase(),
      userId: generateUserId(),
      passwordHash: hashPassword(password),
      totalWatched: totalWatched || 0,
      verified: verified ?? true,
    })
    res.json({ _id: user._id, email: user.email, userId: user.userId, totalWatched: user.totalWatched, verified: user.verified, createdAt: user.createdAt })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a user
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
 *               email:
 *                 type: string
 *               totalWatched:
 *                 type: number
 *               verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated user
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { email, totalWatched, verified } = req.body
    const update = {}
    if (email !== undefined) update.email = email.toLowerCase()
    if (totalWatched !== undefined) update.totalWatched = totalWatched
    if (verified !== undefined) update.verified = verified
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ _id: user._id, email: user.email, userId: user.userId, totalWatched: user.totalWatched, verified: user.verified, createdAt: user.createdAt })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a user and all their data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.email === ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot delete admin' })
    const { userId } = user
    await User.findByIdAndDelete(req.params.id)
    await WatchedVideo.deleteMany({ userId })
    await Withdraw.deleteMany({ userId })
    await RewardClaim.deleteMany({ userId })
    await Comment.deleteMany({ userId })
    res.json({ success: true, userId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ───── Watched Videos CRUD ───── */

/**
 * @openapi
 * /api/admin/watched:
 *   get:
 *     tags: [Admin]
 *     summary: Get all watched video records
 *     responses:
 *       200:
 *         description: List of watched videos
 */
router.get('/watched', async (req, res) => {
  try {
    const records = await WatchedVideo.find().sort({ watchedAt: -1 }).lean()
    const userIds = [...new Set(records.map(r => r.userId))]
    const users = await User.find({ userId: { $in: userIds } }).lean()
    const userMap = {}
    for (const u of users) userMap[u.userId] = u.email
    const enriched = records.map(r => ({
      ...r,
      userEmail: userMap[r.userId] || 'unknown',
    }))
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/watched/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a watched video record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/watched/:id', async (req, res) => {
  try {
    const record = await WatchedVideo.findByIdAndDelete(req.params.id)
    if (!record) return res.status(404).json({ error: 'Record not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ───── Comments CRUD ───── */

/**
 * @openapi
 * /api/admin/comments:
 *   get:
 *     tags: [Admin]
 *     summary: Get all comments
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/comments', async (req, res) => {
  try {
    const comments = await Comment.find().sort({ timestamp: -1 }).lean()
    const userIds = [...new Set(comments.map(c => c.userId))]
    const users = await User.find({ userId: { $in: userIds } }).lean()
    const userMap = {}
    for (const u of users) userMap[u.userId] = u.email
    const enriched = comments.map(c => ({
      ...c,
      userEmail: userMap[c.userId] || 'unknown',
    }))
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/comments/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/comments/:id', async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ───── Reward Claims CRUD ───── */

/**
 * @openapi
 * /api/admin/rewards:
 *   get:
 *     tags: [Admin]
 *     summary: Get all reward claims
 *     responses:
 *       200:
 *         description: List of reward claims
 */
router.get('/rewards', async (req, res) => {
  try {
    const claims = await RewardClaim.find().sort({ claimedAt: -1 }).lean()
    const userIds = [...new Set(claims.map(c => c.userId))]
    const users = await User.find({ userId: { $in: userIds } }).lean()
    const userMap = {}
    for (const u of users) userMap[u.userId] = u.email
    const enriched = claims.map(c => ({
      ...c,
      userEmail: userMap[c.userId] || 'unknown',
    }))
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/admin/rewards/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a reward claim
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/rewards/:id', async (req, res) => {
  try {
    const claim = await RewardClaim.findByIdAndDelete(req.params.id)
    if (!claim) return res.status(404).json({ error: 'Reward claim not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* ───── Withdrawals CRUD ───── */

router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdraw.find().sort({ createdAt: -1 }).lean()
    const enriched = []
    for (const w of withdrawals) {
      const user = await User.findOne({ userId: w.userId }).lean()
      const earned = user?.earned ?? 0
      const processed = await Withdraw.find({ userId: w.userId, status: 'processed' }).lean()
      const totalWithdrawn = processed.reduce((s, r) => s + r.amount, 0)
      enriched.push({ ...w, userEarned: earned, userTotalWithdrawn: totalWithdrawn, userAvailable: earned - totalWithdrawn })
    }
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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

/**
 * @openapi
 * /api/admin/withdraw/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a withdrawal request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/withdraw/:id', async (req, res) => {
  try {
    const w = await Withdraw.findByIdAndDelete(req.params.id)
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
