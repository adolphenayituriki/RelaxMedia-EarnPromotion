import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model('Comment', commentSchema)
