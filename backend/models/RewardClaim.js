import mongoose from 'mongoose'

const rewardClaimSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  claimedAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model('RewardClaim', rewardClaimSchema)
