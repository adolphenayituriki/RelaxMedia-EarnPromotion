import 'dotenv/config'
import dns from 'dns'
dns.setServers(['8.8.8.8', '8.8.4.4'])
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

import authRoutes from './routes/auth.js'
import watchRoutes from './routes/watch.js'
import playlistRoutes from './routes/playlist.js'
import rewardRoutes from './routes/reward.js'
import commentRoutes from './routes/comment.js'
import earningsRoutes from './routes/earnings.js'
import withdrawRoutes from './routes/withdraw.js'
import adminRoutes from './routes/admin.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/relaxmedia_earnpromotion'
const PORT = process.env.PORT || 3001

await mongoose.connect(MONGO_URI)
console.log('Connected to MongoDB')

const app = express()
app.use(cors())
app.use(express.json())

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'YouTube Watch Tracker API',
      version: '1.0.0',
      description: 'REST API for the YouTube Watch Time Tracker & Earning Platform',
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Development server' },
      { url: 'https://relaxmedia-earnpromotion.onrender.com', description: 'Production server' },
    ],
  },
  apis: ['./routes/*.js'],
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }))

app.get('/api/docs.json', (req, res) => res.json(swaggerSpec))

app.use('/api/auth', authRoutes)
app.use('/api/watched', watchRoutes)
app.use('/api/playlist', playlistRoutes)
app.use('/api/reward', rewardRoutes)
app.use('/api/comment', commentRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/withdraw', withdrawRoutes)
app.use('/api/admin', adminRoutes)

app.post('/api/watch', (req, res) => {
  const { videoId, userId, watched, skipped, skipCount } = req.body
  res.json({ key: `${videoId}:${userId || 'anonymous'}`, totalWatched: watched || 0, totalSkipped: skipped || 0, skipCount: skipCount || 0 })
})

app.get('/api/watch/:videoId/:userId?', (req, res) => {
  res.json({ totalWatched: 0, totalSkipped: 0, skipCount: 0 })
})

app.get('/api/watch', (req, res) => {
  res.json({})
})

app.get('/api/video/:id', async (req, res) => {
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${req.params.id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const html = await r.text()
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});\s*<\/script>/)
    if (!match) return res.status(500).json({ error: 'Could not parse video data' })

    const data = JSON.parse(match[1])
    const details = data?.videoDetails || {}
    const microformat = data?.microformat?.playerMicroformatRenderer || {}
    const title = details.title || microformat.title || 'Unknown'
    const duration = parseInt(details.lengthSeconds) || parseInt(microformat.lengthSeconds) || 0

    res.json({ id: req.params.id, title, duration, thumbnail: `https://img.youtube.com/vi/${req.params.id}/hqdefault.jpg` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`)
})
