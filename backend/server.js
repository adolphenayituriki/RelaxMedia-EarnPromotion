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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`)
})
