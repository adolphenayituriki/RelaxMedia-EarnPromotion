import mongoose from 'mongoose'

const withdrawSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 500,
  },
  fee: {
    type: Number,
    required: true,
  },
  netAmount: {
    type: Number,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model('Withdraw', withdrawSchema)
