import mongoose from 'mongoose'

const watchedVideoSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  videoId: {
    type: String,
    required: true,
  },
  totalWatched: {
    type: Number,
    default: 0,
  },
  fullyWatched: {
    type: Boolean,
    default: false,
  },
  watchedAt: {
    type: Date,
    default: Date.now,
  },
})

watchedVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true })

export default mongoose.model('WatchedVideo', watchedVideoSchema)
