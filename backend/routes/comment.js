import { Router } from 'express'
import Comment from '../models/Comment.js'

const router = Router()

/**
 * @openapi
 * /api/comments/{videoId}:
 *   get:
 *     tags: [Comment]
 *     summary: Get comments for a video
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/:videoId', async (req, res) => {
  try {
    const comments = await Comment.find({ videoId: req.params.videoId })
      .sort({ timestamp: -1 }).limit(50).lean()
    res.json(comments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @openapi
 * /api/comment:
 *   post:
 *     tags: [Comment]
 *     summary: Post a comment on a video
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
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment posted
 */
router.post('/', async (req, res) => {
  try {
    const { videoId, userId, text } = req.body
    const comment = await Comment.create({ videoId, userId, text })
    const comments = await Comment.find({ videoId }).sort({ timestamp: -1 }).limit(50).lean()
    res.json({ success: true, comments })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
